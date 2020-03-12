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
import { IRepresentationIndex, ISegment } from "../../../../manifest";
import ManifestBoundsCalculator from "../manifest_bounds_calculator";
export interface ITemplateIndex {
    duration: number;
    timescale: number;
    indexRange?: [number, number];
    initialization?: {
        mediaURLs: string[] | null;
        range?: [number, number];
    };
    mediaURLs: string[] | null;
    indexTimeOffset: number;
    presentationTimeOffset: number;
    startNumber?: number;
}
export interface ITemplateIndexIndexArgument {
    duration: number;
    timescale: number;
    indexRange?: [number, number];
    initialization?: {
        media?: string;
        range?: [number, number];
    };
    media?: string;
    presentationTimeOffset?: number;
    startNumber?: number;
}
export interface ITemplateIndexContextArgument {
    aggressiveMode: boolean;
    availabilityTimeOffset: number;
    manifestBoundsCalculator: ManifestBoundsCalculator;
    isDynamic: boolean;
    periodEnd: number | undefined;
    periodStart: number;
    representationBaseURLs: string[];
    representationBitrate?: number;
    representationId?: string;
}
/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
export default class TemplateRepresentationIndex implements IRepresentationIndex {
    private _aggressiveMode;
    private _index;
    private _manifestBoundsCalculator;
    private _periodStart;
    private _relativePeriodEnd?;
    private _availabilityTimeOffset?;
    private _isDynamic;
    /**
     * @param {Object} index
     * @param {Object} context
     */
    constructor(index: ITemplateIndexIndexArgument, context: ITemplateIndexContextArgument);
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    getInitSegment(): ISegment;
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    getSegments(fromTime: number, dur: number): ISegment[];
    /**
     * Returns first possible position in the index.
     * @returns {number|null|undefined}
     */
    getFirstPosition(): number | null | undefined;
    /**
     * Returns last possible position in the index.
     * @returns {number|null}
     */
    getLastPosition(): number | null | undefined;
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * We never have to refresh a SegmentTemplate-based manifest.
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * We cannot check for discontinuity in SegmentTemplate-based indexes.
     * @returns {Number}
     */
    checkDiscontinuity(): -1;
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * SegmentTemplate without a SegmentTimeline should not be updated.
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {Boolean}
     */
    isFinished(): boolean;
    /**
     * We do not have to add new segments to SegmentList-based indexes.
     * @returns {Array}
     */
    _addSegments(): void;
    /**
     * @param {Object} newIndex
     */
    _replace(newIndex: TemplateRepresentationIndex): void;
    /**
     * @param {Object} newIndex
     */
    _update(newIndex: TemplateRepresentationIndex): void;
    /**
     * Returns the timescaled start of the first segment that should be available,
     * relatively to the start of the Period.
     * @returns {number | null | undefined}
     */
    private _getFirstSegmentStart;
    /**
     * Returns the timescaled start of the last segment that should be available,
     * relatively to the start of the Period.
     * Returns null if live time is before current period.
     * @returns {number|null|undefined}
     */
    private _getLastSegmentStart;
}
