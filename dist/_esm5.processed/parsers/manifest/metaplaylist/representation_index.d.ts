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
import { ICustomError } from "../../../errors";
import { IBaseContentInfos, IRepresentationIndex, ISegment } from "../../../manifest";
/**
 * The MetaRepresentationIndex is wrapper for all kind of RepresentationIndex (from
 * dash, smooth, etc)
 *
 * It wraps methods from original RepresentationIndex, while taking into account
 * the time offset introduced by the MetaPlaylist content.
 *
 * It makes a bridge between the MetaPlaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 * @class MetaRepresentationIndex
 */
export default class MetaRepresentationIndex implements IRepresentationIndex {
    /** Real underlying RepresentationIndex implementation. */
    protected _wrappedIndex: IRepresentationIndex;
    /** Offset time to add to the start of the Representation, in seconds. */
    private _timeOffset;
    /** Absolute end of the Representation, in the seconds. */
    private _contentEnd;
    /** Underlying transport for the Representation (e.g. "dash" or "smooth"). */
    private _transport;
    /** Various information about the real underlying Representation. */
    private _baseContentInfos;
    /**
     * Create a new `MetaRepresentationIndex`.
     * @param {Object} wrappedIndex - "Real" RepresentationIndex implementation of
     * the concerned Representation.
     * @param {Array.<number|undefined>} contentBounds - Start time and end time
     * the Representation will be played between, in seconds.
     * @param {string} transport - Transport for the "real" RepresentationIndex
     * (e.g. "dash" or "smooth").
     * @param {Object} baseContentInfos - Various information about the "real"
     * Representation.
     */
    constructor(wrappedIndex: IRepresentationIndex, contentBounds: [number, number | undefined], transport: string, baseContentInfos: IBaseContentInfos);
    /**
     * Returns information about the initialization segment.
     */
    getInitSegment(): ISegment | null;
    /**
     * Returns information about the segments asked.
     * @param {number} up - Starting time wanted, in seconds.
     * @param {Number} duration - Amount of time wanted, in seconds
     * @returns {Array.<Object>}
     */
    getSegments(up: number, duration: number): ISegment[];
    /**
     * Whether this RepresentationIndex should be refreshed now.
     * Returns `false` as MetaPlaylist contents do not support underlying live
     * contents yet.
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * Returns first possible position the first segment plays at, in seconds.
     * `undefined` if we do not know this value.
     * @return {Number|undefined}
     */
    getFirstPosition(): number | undefined;
    /**
     * Returns last possible position the last segment plays at, in seconds.
     * `undefined` if we do not know this value.
     * @return {Number|undefined}
     */
    getLastPosition(): number | undefined;
    /**
     * Returns `false` if that segment is not currently available in the Manifest
     * (e.g. it corresponds to a segment which is before the current buffer
     * depth).
     * @param {Object} segment
     * @returns {boolean|undefined}
     */
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * @param {Error} error
     * @param {Object} segment
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error: ICustomError, segment: ISegment): boolean;
    /**
     *
     * @param {Number} time
     * @returns {Number}
     */
    checkDiscontinuity(time: number): number;
    /**
     * @returns {Boolean}
     */
    isFinished(): boolean;
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex: IRepresentationIndex): void;
    /**
     * @param {Object} newIndex
     */
    _update(newIndex: IRepresentationIndex): void;
    /**
     * @param {Array.<Object>} nextSegments
     * @param {Object} currentSegment
     */
    _addSegments(nextSegments: Array<{
        time: number;
        duration: number;
        timescale: number;
        count?: number;
        range?: [number, number];
    }>, currentSegment?: {
        duration?: number;
        time: number;
        timescale?: number;
    }): void;
}
