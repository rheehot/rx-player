import { IRepresentationIndex, ISegment } from "../../../../manifest";
export interface IListIndex {
    timescale: number;
    duration: number;
    list: Array<{
        mediaURLs: string[] | null;
        mediaRange?: [number, number];
    }>;
    indexTimeOffset: number;
    initialization?: {
        mediaURLs: string[] | null;
        range?: [number, number];
    };
    indexRange?: [number, number];
}
export interface IListIndexIndexArgument {
    duration: number;
    indexRange?: [number, number];
    initialization?: {
        media?: string;
        range?: [number, number];
    };
    list: Array<{
        media?: string;
        mediaRange?: [number, number];
    }>;
    presentationTimeOffset?: number;
    timescale: number;
}
export interface IListIndexContextArgument {
    periodStart: number;
    representationBaseURLs: string[];
    representationId?: string;
    representationBitrate?: number;
}
/**
 * Provide helpers for SegmentList-based DASH indexes.
 * @type {Object}
 */
export default class ListRepresentationIndex implements IRepresentationIndex {
    protected _periodStart: number;
    private _index;
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index: IListIndexIndexArgument, context: IListIndexContextArgument);
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment(): ISegment;
    /**
     * @param {Number} fromTime
     * @param {Number} duration
     * @returns {Array.<Object>}
     */
    getSegments(fromTime: number, dur: number): ISegment[];
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * (If we should re-fetch the manifest)
     * @param {Number} _fromTime
     * @param {Number} toTime
     * @returns {Boolean}
     */
    shouldRefresh(_fromTime: number, toTime: number): boolean;
    /**
     * Returns first position in index.
     * @returns {Number}
     */
    getFirstPosition(): number;
    /**
     * Returns last position in index.
     * @returns {Number}
     */
    getLastPosition(): number;
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable(segment: ISegment): boolean;
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {Number}
     */
    checkDiscontinuity(): -1;
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {Boolean}
     */
    isFinished(): true;
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex: ListRepresentationIndex): void;
    /**
     * @param {Object} newIndex
     */
    _update(): void;
    _addSegments(): void;
}
