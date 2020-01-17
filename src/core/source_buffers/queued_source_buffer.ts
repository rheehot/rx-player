/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import objectAssign from "object-assign";
import {
  fromEvent,
  interval,
  Observable,
  Observer,
  Subject,
} from "rxjs";
import {
  takeUntil,
  tap,
} from "rxjs/operators";
import {
  ICustomSourceBuffer,
  tryToChangeSourceBufferType,
} from "../../compat";
import config from "../../config";
import { ManualTimeRanges } from "../../custom_source_buffers";
import log from "../../log";

const { SOURCE_BUFFER_FLUSHING_INTERVAL } = config;

// Every QueuedSourceBuffer types
export type IBufferType = "audio" |
                          "video" |
                          "text" |
                          "image";

enum SourceBufferAction { Push,
                          Remove }

// Content of the `data` property when pushing a new chunk
// This will be the real data used with the underlying SourceBuffer.
export interface IPushedChunkData<T> {
  initSegment: T|null;  // initialization segment related to the
                        // chunk. `null` if none.
  chunk : T | null; // Chunk you want to push. `null` if you just
                    // want to push the initialization segment.
  codec : string; // string corresponding to the mime-type + codec to set the
                  // underlying SourceBuffer to.
  timestampOffset : number; // time offset in seconds to apply to this segment.
  appendWindow: [ number | undefined, // start appendWindow for the segment
                                      // (part of the segment before that time
                                      // will be ignored)
                  number | undefined ]; // end appendWindow for the segment
                                        // (part of the segment after that time
                                        // will be ignored)
}

// Action created by the QueuedSourceBuffer to push a chunk.
// Will be converted into an `IPushQueueItem` once in the queue
interface IPushAction<T> { type : SourceBufferAction.Push;
                           value : IPushedChunkData<T>; }

// Action created by the QueuedSourceBuffer to remove Segment(s).
// Will be converted into an `IRemoveQueueItem` once in the queue
interface IRemoveAction { type : SourceBufferAction.Remove;
                          value : { start : number;
                                    end : number; }; }

// Actions understood by the QueuedSourceBuffer
type IQSBNewAction<T> = IPushAction<T> |
                        IRemoveAction;

// Item waiting in the queue to push a new chunk to the SourceBuffer.
// T is the type of the segment pushed.
interface IPushQueueItem<T> extends IPushAction<T> { subject : Subject<unknown>; }

// Item waiting in the queue to remove segment(s) from the SourceBuffer.
interface IRemoveQueueItem extends IRemoveAction { subject : Subject<unknown>; }

// Action waiting in the queue.
// T is the type of the segments pushed.
type IQSBQueueItem<T> = IPushQueueItem<T> |
                         IRemoveQueueItem;

interface IPushData<T> { isInit : boolean;
                         segmentData : T;
                         codec : string;
                         timestampOffset : number;
                         appendWindow : [ number | undefined,
                                          number | undefined ]; }

// Once processed, Push queue items are separated into one or multiple tasks
interface IPushTask<T> { type : SourceBufferAction.Push;
                         steps : Array<IPushData<T>>;
                         subject : Subject<unknown>; }

// Type of task currently processed by the QueuedSourceBuffer
type IPendingTask<T> = IPushTask<T> |
                       IRemoveQueueItem;

/**
 * Allows to push and remove new Segments to a SourceBuffer in a FIFO queue (not
 * doing so can lead to browser Errors) while keeping an inventory of what has
 * been pushed.
 *
 * To work correctly, only a single QueuedSourceBuffer per SourceBuffer should
 * be created.
 *
 * @class QueuedSourceBuffer
 */
export default class QueuedSourceBuffer<T> {
  // "Type" of the buffer (e.g. "audio", "video", "text", "image")
  public readonly bufferType : IBufferType;

  // SourceBuffer implementation.
  private readonly _sourceBuffer : ICustomSourceBuffer<T>;

  // Subject triggered when this QueuedSourceBuffer is disposed.
  // Helps to clean-up Observables created at its creation.
  private _destroy$ : Subject<void>;

  // Queue of awaited buffer orders.
  // The first element in this array will be the first performed.
  private _queue : Array<IQSBQueueItem<T>>;

  // Information about the current action processed by the QueuedSourceBuffer.
  // If equal to null, it means that no action from the queue is currently
  // being processed.
  private _pendingTask : IPendingTask<T> | null;

  // Keep track of the latest init segment pushed in the linked SourceBuffer.
  private _lastInitSegment : T | null;

  // Current `type` of the underlying SourceBuffer.
  // Might be changed for codec-switching purposes.
  private _currentCodec : string;

  /**
   * Public access to the SourceBuffer's current codec.
   * @returns {string}
   */
  public get codec() : string {
    return this._currentCodec;
  }

  /**
   * @constructor
   * @param {string} bufferType
   * @param {string} codec
   * @param {SourceBuffer} sourceBuffer
   */
  constructor(
    bufferType : IBufferType,
    codec : string,
    sourceBuffer : ICustomSourceBuffer<T>
  ) {
    this._destroy$ = new Subject<void>();
    this.bufferType = bufferType;
    this._sourceBuffer = sourceBuffer;
    this._queue = [];
    this._pendingTask = null;
    this._lastInitSegment = null;
    this._currentCodec = codec;

    // Some browsers (happened with firefox 66) sometimes "forget" to send us
    // `update` or `updateend` events.
    // In that case, we're completely unable to continue the queue here and
    // stay locked in a waiting state.
    // This interval is here to check at regular intervals if the underlying
    // SourceBuffer is currently updating.
    interval(SOURCE_BUFFER_FLUSHING_INTERVAL).pipe(
      tap(() => this._flush()),
      takeUntil(this._destroy$)
    ).subscribe();

    fromEvent(this._sourceBuffer, "error").pipe(
      tap((err) => this._onError(err)),
      takeUntil(this._destroy$)
    ).subscribe();
    fromEvent(this._sourceBuffer, "updateend").pipe(
      tap(() => this._flush()),
      takeUntil(this._destroy$)
    ).subscribe();
  }

  /**
   * Push a chunk of the media segment given to the attached SourceBuffer, in a
   * FIFO queue.
   *
   * Depending on the type of data appended, this might need an associated
   * initialization segment.
   *
   * Such initialization segment will be pushed in the SourceBuffer if the
   * last segment pushed was associated to another initialization segment.
   * This detection is entirely reference-based so make sure that the same
   * initSegment argument given share the same reference.
   *
   * You can disable the usage of initialization segment by setting the
   * `infos.data.initSegment` argument to null.
   *
   * You can also only push an initialization segment by setting the
   * `infos.data.chunk` argument to null.
   *
   * @param {Object} infos
   * @returns {Observable}
   */
  public pushChunk(infos : IPushedChunkData<T>) : Observable<unknown> {
    log.debug("QSB: receiving order to push data to the SourceBuffer",
              this.bufferType,
              infos);
    return this._addToQueue({ type: SourceBufferAction.Push,
                              value: infos });
  }

  /**
   * Remove buffered data (added to the same FIFO queue than `pushChunk`).
   * @param {number} start - start position, in seconds
   * @param {number} end - end position, in seconds
   * @returns {Observable}
   */
  public removeBuffer(start : number, end : number) : Observable<unknown> {
    log.debug("QSB: receiving order to remove data from the SourceBuffer",
              this.bufferType,
              start,
              end);
    return this._addToQueue({ type: SourceBufferAction.Remove,
                              value: { start, end } });
  }

  /**
   * Returns the currently buffered data, in a TimeRanges object.
   * @returns {TimeRanges}
   */
  public getBufferedRanges() : TimeRanges | ManualTimeRanges {
    return this._sourceBuffer.buffered;
  }

  /**
   * Dispose of the resources used by this QueuedSourceBuffer.
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public dispose() : void {
    this._destroy$.next();
    this._destroy$.complete();

    if (this._pendingTask != null) {
      this._pendingTask.subject.complete();
      this._pendingTask = null;
    }

    while (this._queue.length > 0) {
      const nextElement = this._queue.shift();
      if (nextElement != null) {
        nextElement.subject.complete();
      }
    }
  }

  /**
   * Abort the linked SourceBuffer.
   * You should call this only if the linked MediaSource is still "open".
   *
   * /!\ You won't be able to use the QueuedSourceBuffer after calling this
   * function.
   * @private
   */
  public abort() {
    this._sourceBuffer.abort();
  }

  /**
   * @private
   * @param {Event} error
   */
  private _onError(err : unknown) : void {
    const error = err instanceof Error ?
                    err :
                    new Error("An unknown error occured when appending buffer");
    this._lastInitSegment = null; // initialize init segment as a security
    if (this._pendingTask != null) {
      this._pendingTask.subject.error(error);
    }
  }

  /**
   * When the returned observable is subscribed:
   *   1. Add your action to the queue.
   *   2. Begin the queue if not pending.
   *
   * Cancel queued action on unsubscription.
   * @private
   * @param {Object} action
   * @returns {Observable}
   */
  private _addToQueue(action : IQSBNewAction<T>) : Observable<unknown> {
    return new Observable((obs : Observer<unknown>) => {
      const shouldRestartQueue = this._queue.length === 0 &&
                                 this._pendingTask == null;
      const subject = new Subject<unknown>();
      const queueItem = objectAssign({ subject }, action);
      this._queue.push(queueItem);

      const subscription = subject.subscribe(obs);
      if (shouldRestartQueue) {
        this._flush();
      }

      return () => {
        subscription.unsubscribe();
        const index = this._queue.indexOf(queueItem);
        if (index >= 0) {
          this._queue.splice(index, 1);
        }
      };
    });
  }

  /**
   * Perform next task if one.
   * @private
   */
  private _flush() : void {
    if (this._sourceBuffer.updating) {
      return; // still processing `this._pendingTask`
    }

    // handle end of previous task if needed
    if (this._pendingTask != null) {
      if (this._pendingTask.type !== SourceBufferAction.Push ||
          this._pendingTask.steps.length === 0)
      {
        const { subject } = this._pendingTask;
        this._pendingTask = null;
        subject.next();
        subject.complete();
        if (this._queue.length > 0) {
          this._flush();
        }
        return;
      }
    } else if (this._queue.length === 0) {
      return; // we have nothing left to do
    } else {
      const newQueueItem = this._queue.shift();
      if (newQueueItem == null) {
        // TODO TypeScrypt do not get the previous length check. Find solution /
        // open issue
        throw new Error("An item from the QueuedSourceBuffer queue was not defined");
      }
      this._pendingTask = convertQueueItemToTask(newQueueItem);
      if (this._pendingTask == null) { // nothing to do, complete and go to next item
        newQueueItem.subject.next();
        newQueueItem.subject.complete();
        this._flush();
        return;
      }
    }

    // now handle current task
    const task = this._pendingTask;
    try {
      switch (task.type) {
        case SourceBufferAction.Push:
          const nextStep = task.steps.shift();
          if (nextStep == null ||
              (nextStep.isInit && this._lastInitSegment === nextStep.segmentData))
          {
            this._flush();
            return;
          }
          this._pushSegmentData(nextStep);
          break;

        case SourceBufferAction.Remove:
          const { start, end } = task.value;
          log.debug("QSB: removing data from SourceBuffer",
                    this.bufferType,
                    start,
                    end);
          this._sourceBuffer.remove(start, end);
          break;
      }
    } catch (e) {
      this._onError(e);
    }
  }

  /**
   * Push given data to the underlying SourceBuffer.
   * /!\ Heavily mutates the private state.
   * @param {Object} task
   */
  private _pushSegmentData(data : IPushData<T>) : void {
    const { isInit,
            segmentData,
            timestampOffset,
            appendWindow,
            codec } = data;
    if (this._currentCodec !== codec) {
      log.debug("QSB: updating codec");
      const couldUpdateType = tryToChangeSourceBufferType(this._sourceBuffer,
                                                          codec);
      if (couldUpdateType) {
        this._currentCodec = codec;
      } else {
        log.warn("QSB: could not update codec", codec, this._currentCodec);
      }
    }

    if (this._sourceBuffer.timestampOffset !== timestampOffset) {
      const newTimestampOffset = timestampOffset;
      log.debug("QSB: updating timestampOffset",
                this.bufferType,
                this._sourceBuffer.timestampOffset,
                newTimestampOffset);
      this._sourceBuffer.timestampOffset = newTimestampOffset;
    }

    if (appendWindow[0] == null) {
      if (this._sourceBuffer.appendWindowStart > 0) {
        this._sourceBuffer.appendWindowStart = 0;
      }
    } else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
      if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
        this._sourceBuffer.appendWindowEnd = appendWindow[0] + 1;
      }
      this._sourceBuffer.appendWindowStart = appendWindow[0];
    }

    if (appendWindow[1] == null) {
      if (this._sourceBuffer.appendWindowEnd !== Infinity) {
        this._sourceBuffer.appendWindowEnd = Infinity;
      }
    } else if (appendWindow[1] !== this._sourceBuffer.appendWindowEnd) {
      this._sourceBuffer.appendWindowEnd = appendWindow[1];
    }

    log.debug("QSB: pushing new data to SourceBuffer", this.bufferType);
    if (isInit) {
      this._lastInitSegment = segmentData;
    }
    this._sourceBuffer.appendBuffer(segmentData);
  }
}

/**
 * @param {Object} item
 * @returns {Object|null}
 */
function convertQueueItemToTask<T>(
  item : IQSBQueueItem<T>
) : IPendingTask<T> | null {
  switch (item.type) {
    case SourceBufferAction.Push:
      // Push actions with both an init segment and a regular segment need
      // to be separated into two steps
      const steps = [];
      const data = item.value;

      if (data.initSegment !== null) {
        steps.push({ isInit: true,
                     segmentData: data.initSegment,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: data.appendWindow });
      }
      if (data.chunk !== null) {
        steps.push({ isInit: false,
                     segmentData: data.chunk,
                     codec: data.codec,
                     timestampOffset: data.timestampOffset,
                     appendWindow: data.appendWindow });
      }
      if (steps.length === 0) {
        return null;
      }
      return { type: SourceBufferAction.Push,
               steps,
               subject: item.subject };

    case SourceBufferAction.Remove:
      return item;
  }
}
