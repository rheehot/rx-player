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
import { ICustomError } from "../../../../errors";
import { IRepresentationIndex, ISegment } from "../../../../manifest";
import { IIndexSegment } from "../../utils/index_helpers";
import ManifestBoundsCalculator from "../manifest_bounds_calculator";
export interface ITimelineIndex {
    indexRange?: [number, number];
    indexTimeOffset: number;
    initialization?: {
        mediaURL: string;
        range?: [number, number];
    };
    mediaURL: string;
    startNumber?: number;
    timeline: IIndexSegment[];
    timescale: number;
}
export interface ITimelineIndexIndexArgument {
    indexRange?: [number, number];
    initialization?: {
        media?: string;
        range?: [number, number];
    };
    media?: string;
    startNumber?: number;
    timeline: Array<{
        start?: number;
        repeatCount?: number;
        duration?: number;
    }>;
    timescale: number;
    presentationTimeOffset?: number;
}
export interface ITimelineIndexContextArgument {
    manifestBoundsCalculator: ManifestBoundsCalculator;
    periodStart: number;
    periodEnd: number | undefined;
    isDynamic: boolean;
    receivedTime?: number;
    representationBaseURL: string;
    representationId?: string;
    representationBitrate?: number;
}
export interface ILastSegmentInformation {
    lastPosition?: number;
    time: number;
}
export default class TimelineRepresentationIndex implements IRepresentationIndex {
    protected _index: ITimelineIndex;
    private _lastUpdate;
    private _scaledPeriodStart;
    private _scaledPeriodEnd;
    private _isDynamic;
    private _manifestBoundsCalculator;
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index: ITimelineIndexIndexArgument, context: ITimelineIndexContextArgument);
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment(): ISegment;
    /**
     * Asks for segments to download for a given time range.
     * @param {Number} from - Beginning of the time wanted, in seconds
     * @param {Number} duration - duration wanted, in seconds
     * @returns {Array.<Object>}
     */
    getSegments(from: number, duration: number): ISegment[];
    /**
     * Returns true if the index should be refreshed.
     * @param {Number} _up
     * @param {Number} to
     * @returns {Boolean}
     */
    shouldRefresh(_up: number, to: number): boolean;
    /**
     * Returns the starting time, in seconds, of the earliest segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    getFirstPosition(): number | null;
    /**
     * Returns the ending time, in seconds, of the last segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    getLastPosition(): number | null;
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * Returns false if it is not available anymore.
     * Returns undefined if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     * @param {Number} _time
     * @returns {Number} - If a discontinuity is present, this is the Starting
     * time for the next (discontinuited) range. If not this is equal to -1.
     */
    checkDiscontinuity(_time: number): number;
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error: ICustomError): boolean;
    /**
     * @param {Object} newIndex
     */
    _update(newIndex: TimelineRepresentationIndex): void;
    /**
     * We do not have to add new segments to SegmentList-based indexes.
     * @param {Array.<Object>} nextSegments
     * @param {Object|undefined} currentSegmentInfos
     * @returns {Array}
     */
    _addSegments(): void;
    /**
     * @returns {Boolean}
     */
    isFinished(): boolean;
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to timeshifting.
     */
    private _refreshTimeline;
    /**
     * Returns last position if new segments have the same duration than the
     * current last one.
     * @returns {number}
     */
    private _getTheoriticalLastPosition;
}
