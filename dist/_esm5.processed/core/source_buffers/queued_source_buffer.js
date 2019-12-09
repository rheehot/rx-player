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
import { fromEvent, interval, Observable, Subject, } from "rxjs";
import { takeUntil, tap, } from "rxjs/operators";
import { tryToChangeSourceBufferType, } from "../../compat";
import config from "../../config";
import log from "../../log";
import SegmentInventory from "./segment_inventory";
var APPEND_WINDOW_SECURITIES = config.APPEND_WINDOW_SECURITIES, SOURCE_BUFFER_FLUSHING_INTERVAL = config.SOURCE_BUFFER_FLUSHING_INTERVAL;
var SourceBufferAction;
(function (SourceBufferAction) {
    SourceBufferAction[SourceBufferAction["Push"] = 0] = "Push";
    SourceBufferAction[SourceBufferAction["Remove"] = 1] = "Remove";
    SourceBufferAction[SourceBufferAction["EndOfSegment"] = 2] = "EndOfSegment";
})(SourceBufferAction || (SourceBufferAction = {}));
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
var QueuedSourceBuffer = /** @class */ (function () {
    /**
     * @constructor
     * @param {string} bufferType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    function QueuedSourceBuffer(bufferType, codec, sourceBuffer) {
        var _this = this;
        this._destroy$ = new Subject();
        this.bufferType = bufferType;
        this._sourceBuffer = sourceBuffer;
        this._queue = [];
        this._pendingTask = null;
        this._lastInitSegment = null;
        this._currentCodec = codec;
        this._segmentInventory = new SegmentInventory();
        // Some browsers (happened with firefox 66) sometimes "forget" to send us
        // `update` or `updateend` events.
        // In that case, we're completely unable to continue the queue here and
        // stay locked in a waiting state.
        // This interval is here to check at regular intervals if the underlying
        // SourceBuffer is currently updating.
        interval(SOURCE_BUFFER_FLUSHING_INTERVAL).pipe(tap(function () { return _this._flush(); }), takeUntil(this._destroy$)).subscribe();
        fromEvent(this._sourceBuffer, "error").pipe(tap(function (err) { return _this._onError(err); }), takeUntil(this._destroy$)).subscribe();
        fromEvent(this._sourceBuffer, "updateend").pipe(tap(function () { return _this._flush(); }), takeUntil(this._destroy$)).subscribe();
    }
    Object.defineProperty(QueuedSourceBuffer.prototype, "codec", {
        /**
         * Public access to the SourceBuffer's current codec.
         * @returns {string}
         */
        get: function () {
            return this._currentCodec;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Push a chunk of the media segment given to the attached SourceBuffer, in a
     * FIFO queue.
     *
     * Once all chunks of a single Segment have been given to `pushChunk`, you
     * should call `endOfSegment` to indicate that the whole Segment has been
     * pushed.
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
    QueuedSourceBuffer.prototype.pushChunk = function (infos) {
        log.debug("QSB: receiving order to push data to the SourceBuffer", this.bufferType, infos);
        return this._addToQueue({ type: SourceBufferAction.Push,
            value: infos });
    };
    /**
     * Remove buffered data (added to the same FIFO queue than `pushChunk`).
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Observable}
     */
    QueuedSourceBuffer.prototype.removeBuffer = function (start, end) {
        log.debug("QSB: receiving order to remove data from the SourceBuffer", this.bufferType, start, end);
        return this._addToQueue({ type: SourceBufferAction.Remove,
            value: { start: start, end: end } });
    };
    /**
     * Indicate that every chunks from a Segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Observable will emit and complete successively once the whole
     * segment has been pushed and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Observable}
     */
    QueuedSourceBuffer.prototype.endOfSegment = function (infos) {
        log.debug("QSB: receiving order for validating end of segment", this.bufferType, infos.segment);
        return this._addToQueue({ type: SourceBufferAction.EndOfSegment,
            value: infos });
    };
    /**
     * The maintained inventory can fall out of sync from garbage collection or
     * other events.
     *
     * This methods allow to manually trigger a synchronization. It should be
     * called before retrieving Segment information from it (e.g. with
     * `getInventory`).
     */
    QueuedSourceBuffer.prototype.synchronizeInventory = function () {
        this._segmentInventory.synchronizeBuffered(this.getBufferedRanges());
    };
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    QueuedSourceBuffer.prototype.getBufferedRanges = function () {
        return this._sourceBuffer.buffered;
    };
    /**
     * Returns the currently buffered data for which the content is known with
     * the corresponding content information.
     * /!\ This data can fall out of sync with the real buffered ranges. Please
     * call `synchronizeInventory` before to make sure it is correctly
     * synchronized.
     * @returns {Array.<Object>}
     */
    QueuedSourceBuffer.prototype.getInventory = function () {
        return this._segmentInventory.getInventory();
    };
    /**
     * Dispose of the resources used by this QueuedSourceBuffer.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    QueuedSourceBuffer.prototype.dispose = function () {
        this._destroy$.next();
        this._destroy$.complete();
        if (this._pendingTask != null) {
            this._pendingTask.subject.complete();
            this._pendingTask = null;
        }
        while (this._queue.length > 0) {
            var nextElement = this._queue.shift();
            if (nextElement != null) {
                nextElement.subject.complete();
            }
        }
    };
    /**
     * Abort the linked SourceBuffer.
     * You should call this only if the linked MediaSource is still "open".
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    QueuedSourceBuffer.prototype.abort = function () {
        this._sourceBuffer.abort();
    };
    /**
     * @private
     * @param {Event} error
     */
    QueuedSourceBuffer.prototype._onError = function (err) {
        var error = err instanceof Error ?
            err :
            new Error("An unknown error occured when appending buffer");
        this._lastInitSegment = null; // initialize init segment as a security
        if (this._pendingTask != null) {
            this._pendingTask.subject.error(error);
        }
    };
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
    QueuedSourceBuffer.prototype._addToQueue = function (action) {
        var _this = this;
        return new Observable(function (obs) {
            var shouldRestartQueue = _this._queue.length === 0 &&
                _this._pendingTask == null;
            var subject = new Subject();
            var queueItem = objectAssign({ subject: subject }, action);
            _this._queue.push(queueItem);
            var subscription = subject.subscribe(obs);
            if (shouldRestartQueue) {
                _this._flush();
            }
            return function () {
                subscription.unsubscribe();
                var index = _this._queue.indexOf(queueItem);
                if (index >= 0) {
                    _this._queue.splice(index, 1);
                }
            };
        });
    };
    /**
     * Perform next task if one.
     * @private
     */
    QueuedSourceBuffer.prototype._flush = function () {
        if (this._sourceBuffer.updating) {
            return; // still processing `this._pendingTask`
        }
        // handle end of previous task if needed
        if (this._pendingTask != null) {
            if (this._pendingTask.type !== SourceBufferAction.Push ||
                this._pendingTask.steps.length === 0) {
                switch (this._pendingTask.type) {
                    case SourceBufferAction.Push:
                        this._segmentInventory.insertChunk(this._pendingTask.inventoryData);
                        break;
                    case SourceBufferAction.EndOfSegment:
                        this._segmentInventory.completeSegment(this._pendingTask.value);
                        break;
                    case SourceBufferAction.Remove:
                        this.synchronizeInventory();
                        break;
                }
                var subject = this._pendingTask.subject;
                this._pendingTask = null;
                subject.next();
                subject.complete();
                if (this._queue.length > 0) {
                    this._flush();
                }
                return;
            }
        }
        else if (this._queue.length === 0) {
            return; // we have nothing left to do
        }
        else {
            var newQueueItem = this._queue.shift();
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
        var task = this._pendingTask;
        try {
            switch (task.type) {
                case SourceBufferAction.EndOfSegment:
                    // nothing to do, we will just acknowledge the segment.
                    log.debug("QSB: Acknowledging complete segment", task.value);
                    this._flush();
                    return;
                case SourceBufferAction.Push:
                    var nextStep = task.steps.shift();
                    if (nextStep == null ||
                        (nextStep.isInit && this._lastInitSegment === nextStep.segmentData)) {
                        this._flush();
                        return;
                    }
                    this._pushSegmentData(nextStep);
                    break;
                case SourceBufferAction.Remove:
                    var _a = task.value, start = _a.start, end = _a.end;
                    log.debug("QSB: removing data from SourceBuffer", this.bufferType, start, end);
                    this._sourceBuffer.remove(start, end);
                    break;
            }
        }
        catch (e) {
            this._onError(e);
        }
    };
    /**
     * Push given data to the underlying SourceBuffer.
     * /!\ Heavily mutates the private state.
     * @param {Object} task
     */
    QueuedSourceBuffer.prototype._pushSegmentData = function (data) {
        var isInit = data.isInit, segmentData = data.segmentData, timestampOffset = data.timestampOffset, appendWindow = data.appendWindow, codec = data.codec;
        if (this._currentCodec !== codec) {
            log.debug("QSB: updating codec");
            var couldUpdateType = tryToChangeSourceBufferType(this._sourceBuffer, codec);
            if (couldUpdateType) {
                this._currentCodec = codec;
            }
            else {
                log.warn("QSB: could not update codec", codec, this._currentCodec);
            }
        }
        if (this._sourceBuffer.timestampOffset !== timestampOffset) {
            var newTimestampOffset = timestampOffset;
            log.debug("QSB: updating timestampOffset", this.bufferType, this._sourceBuffer.timestampOffset, newTimestampOffset);
            this._sourceBuffer.timestampOffset = newTimestampOffset;
        }
        if (appendWindow[0] == null) {
            if (this._sourceBuffer.appendWindowStart > 0) {
                this._sourceBuffer.appendWindowStart = 0;
            }
        }
        else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
            if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
                this._sourceBuffer.appendWindowEnd = appendWindow[0] + 1;
            }
            this._sourceBuffer.appendWindowStart = appendWindow[0];
        }
        if (appendWindow[1] == null) {
            if (this._sourceBuffer.appendWindowEnd !== Infinity) {
                this._sourceBuffer.appendWindowEnd = Infinity;
            }
        }
        else if (appendWindow[1] !== this._sourceBuffer.appendWindowEnd) {
            this._sourceBuffer.appendWindowEnd = appendWindow[1];
        }
        log.debug("QSB: pushing new data to SourceBuffer", this.bufferType);
        if (isInit) {
            this._lastInitSegment = segmentData;
        }
        this._sourceBuffer.appendBuffer(segmentData);
    };
    return QueuedSourceBuffer;
}());
export default QueuedSourceBuffer;
/**
 * @param {Object} item
 * @returns {Object|null}
 */
function convertQueueItemToTask(item) {
    switch (item.type) {
        case SourceBufferAction.Push:
            // Push actions with both an init segment and a regular segment need
            // to be separated into two steps
            var steps = [];
            var itemValue = item.value;
            var data = itemValue.data, inventoryInfos = itemValue.inventoryInfos;
            var estimatedDuration = inventoryInfos.estimatedDuration, estimatedStart = inventoryInfos.estimatedStart, segment = inventoryInfos.segment;
            // Cutting exactly at the start or end of the appendWindow can lead to
            // cases of infinite rebuffering due to how browser handle such windows.
            // To work-around that, we add a small offset before and after those.
            var safeAppendWindow = [
                data.appendWindow[0] !== undefined ?
                    Math.max(0, data.appendWindow[0] - APPEND_WINDOW_SECURITIES.START) :
                    undefined,
                data.appendWindow[1] !== undefined ?
                    data.appendWindow[1] + APPEND_WINDOW_SECURITIES.END :
                    undefined,
            ];
            if (data.initSegment !== null) {
                steps.push({ isInit: true,
                    segmentData: data.initSegment,
                    codec: data.codec,
                    timestampOffset: data.timestampOffset,
                    appendWindow: safeAppendWindow });
            }
            if (data.chunk !== null) {
                steps.push({ isInit: false,
                    segmentData: data.chunk,
                    codec: data.codec,
                    timestampOffset: data.timestampOffset,
                    appendWindow: safeAppendWindow });
            }
            if (steps.length === 0) {
                return null;
            }
            var start = estimatedStart === undefined ? segment.time / segment.timescale :
                estimatedStart;
            var duration = estimatedDuration === undefined ?
                segment.duration / segment.timescale :
                estimatedDuration;
            var end = start + duration;
            if (safeAppendWindow[0] !== undefined) {
                start = Math.max(start, safeAppendWindow[0]);
            }
            if (safeAppendWindow[1] !== undefined) {
                end = Math.min(end, safeAppendWindow[1]);
            }
            var inventoryData = { period: inventoryInfos.period,
                adaptation: inventoryInfos.adaptation,
                representation: inventoryInfos.representation,
                segment: inventoryInfos.segment,
                start: start,
                end: end };
            return { type: SourceBufferAction.Push,
                steps: steps,
                inventoryData: inventoryData,
                subject: item.subject };
        case SourceBufferAction.Remove:
        case SourceBufferAction.EndOfSegment:
            return item;
    }
    return null;
}
