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
import { Observable } from "rxjs";
import { ICustomSourceBuffer } from "../../compat";
import { ManualTimeRanges } from "../../custom_source_buffers";
import { Adaptation, ISegment, Period, Representation } from "../../manifest";
import { IBufferedChunk } from "./segment_inventory";
export declare type IBufferType = "audio" | "video" | "text" | "image";
interface IPushedChunkData<T> {
    initSegment: T | null;
    chunk: T | null;
    codec: string;
    timestampOffset: number;
    appendWindow: [number | undefined, // start appendWindow for the segment
    // start appendWindow for the segment
    number | undefined];
}
interface IPushedChunkInventoryInfos {
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
    segment: ISegment;
    estimatedStart?: number;
    estimatedDuration?: number;
}
export interface IPushChunkInfos<T> {
    data: IPushedChunkData<T>;
    inventoryInfos: IPushedChunkInventoryInfos;
}
export interface IEndOfSegmentInfos {
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
    segment: ISegment;
}
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
    readonly bufferType: IBufferType;
    private readonly _sourceBuffer;
    private readonly _segmentInventory;
    private _destroy$;
    private _queue;
    private _pendingTask;
    private _lastInitSegment;
    private _currentCodec;
    /**
     * Public access to the SourceBuffer's current codec.
     * @returns {string}
     */
    get codec(): string;
    /**
     * @constructor
     * @param {string} bufferType
     * @param {string} codec
     * @param {SourceBuffer} sourceBuffer
     */
    constructor(bufferType: IBufferType, codec: string, sourceBuffer: ICustomSourceBuffer<T>);
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
    pushChunk(infos: IPushChunkInfos<T>): Observable<unknown>;
    /**
     * Remove buffered data (added to the same FIFO queue than `pushChunk`).
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Observable}
     */
    removeBuffer(start: number, end: number): Observable<unknown>;
    /**
     * Indicate that every chunks from a Segment has been given to pushChunk so
     * far.
     * This will update our internal Segment inventory accordingly.
     * The returned Observable will emit and complete successively once the whole
     * segment has been pushed and this indication is acknowledged.
     * @param {Object} infos
     * @returns {Observable}
     */
    endOfSegment(infos: IEndOfSegmentInfos): Observable<unknown>;
    /**
     * The maintained inventory can fall out of sync from garbage collection or
     * other events.
     *
     * This methods allow to manually trigger a synchronization. It should be
     * called before retrieving Segment information from it (e.g. with
     * `getInventory`).
     */
    synchronizeInventory(): void;
    /**
     * Returns the currently buffered data, in a TimeRanges object.
     * @returns {TimeRanges}
     */
    getBufferedRanges(): TimeRanges | ManualTimeRanges;
    /**
     * Returns the currently buffered data for which the content is known with
     * the corresponding content information.
     * /!\ This data can fall out of sync with the real buffered ranges. Please
     * call `synchronizeInventory` before to make sure it is correctly
     * synchronized.
     * @returns {Array.<Object>}
     */
    getInventory(): IBufferedChunk[];
    /**
     * Dispose of the resources used by this QueuedSourceBuffer.
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    dispose(): void;
    /**
     * Abort the linked SourceBuffer.
     * You should call this only if the linked MediaSource is still "open".
     *
     * /!\ You won't be able to use the QueuedSourceBuffer after calling this
     * function.
     * @private
     */
    abort(): void;
    /**
     * @private
     * @param {Event} error
     */
    private _onError;
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
    private _addToQueue;
    /**
     * Perform next task if one.
     * @private
     */
    private _flush;
    /**
     * Push given data to the underlying SourceBuffer.
     * /!\ Heavily mutates the private state.
     * @param {Object} task
     */
    private _pushSegmentData;
}
export { IBufferedChunk };
