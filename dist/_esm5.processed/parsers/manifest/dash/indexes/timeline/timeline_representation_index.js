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
import config from "../../../../../config";
import { NetworkError, } from "../../../../../errors";
import log from "../../../../../log";
import clearTimelineFromPosition from "../../../utils/clear_timeline_from_position";
import { fromIndexTime, getIndexSegmentEnd, toIndexTime, } from "../../../utils/index_helpers";
import isSegmentStillAvailable from "../../../utils/is_segment_still_available";
import updateSegmentTimeline from "../../../utils/update_segment_timeline";
import getInitSegment from "../get_init_segment";
import getSegmentsFromTimeline from "../get_segments_from_timeline";
import { createIndexURLs } from "../tokens";
import constructTimelineFromElements from "./construct_timeline_from_elements";
import constructTimelineFromPreviousTimeline from "./construct_timeline_from_previous_timeline";
var MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY = config.MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY;
/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(timeline, start) {
    var low = 0;
    var high = timeline.length;
    while (low < high) {
        var mid = (low + high) >>> 1;
        if (timeline[mid].start < start) {
            low = mid + 1;
        }
        else {
            high = mid;
        }
    }
    return (low > 0) ? low - 1 :
        low;
}
var TimelineRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function TimelineRepresentationIndex(index, context) {
        var manifestBoundsCalculator = context.manifestBoundsCalculator, isDynamic = context.isDynamic, representationBaseURLs = context.representationBaseURLs, representationId = context.representationId, representationBitrate = context.representationBitrate, periodStart = context.periodStart, periodEnd = context.periodEnd;
        var timescale = index.timescale;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset :
            0;
        var scaledStart = periodStart * timescale;
        var indexTimeOffset = presentationTimeOffset - scaledStart;
        this._manifestBoundsCalculator = manifestBoundsCalculator;
        this._lastUpdate = context.receivedTime == null ?
            performance.now() :
            context.receivedTime;
        this._unsafelyBaseOnPreviousIndex = null;
        if (context.unsafelyBaseOnPreviousRepresentation !== null &&
            context.unsafelyBaseOnPreviousRepresentation.index
                instanceof TimelineRepresentationIndex) {
            // avoid too much nested references, to keep memory down
            context.unsafelyBaseOnPreviousRepresentation
                .index._unsafelyBaseOnPreviousIndex = null;
            this._unsafelyBaseOnPreviousIndex = context
                .unsafelyBaseOnPreviousRepresentation.index;
        }
        this._isDynamic = isDynamic;
        this._parseTimeline = index.parseTimeline;
        this._index = { indexRange: index.indexRange,
            indexTimeOffset: indexTimeOffset,
            initialization: index.initialization == null ?
                undefined :
                {
                    mediaURLs: createIndexURLs(representationBaseURLs, index.initialization.media, representationId, representationBitrate),
                    range: index.initialization.range,
                },
            mediaURLs: createIndexURLs(representationBaseURLs, index.media, representationId, representationBitrate),
            startNumber: index.startNumber,
            timeline: null,
            timescale: timescale };
        this._scaledPeriodStart = toIndexTime(periodStart, this._index);
        this._scaledPeriodEnd = periodEnd == null ? undefined :
            toIndexTime(periodEnd, this._index);
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    TimelineRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * Asks for segments to download for a given time range.
     * @param {Number} from - Beginning of the time wanted, in seconds
     * @param {Number} duration - duration wanted, in seconds
     * @returns {Array.<Object>}
     */
    TimelineRepresentationIndex.prototype.getSegments = function (from, duration) {
        this._refreshTimeline(); // clear timeline if needed
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        // destructuring to please TypeScript
        var _a = this._index, mediaURLs = _a.mediaURLs, startNumber = _a.startNumber, timeline = _a.timeline, timescale = _a.timescale, indexTimeOffset = _a.indexTimeOffset;
        return getSegmentsFromTimeline({ mediaURLs: mediaURLs,
            startNumber: startNumber,
            timeline: timeline,
            timescale: timescale,
            indexTimeOffset: indexTimeOffset }, from, duration, this._scaledPeriodEnd);
    };
    /**
     * Returns true if the index should be refreshed.
     * @param {Number} _up
     * @param {Number} to
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.shouldRefresh = function () {
        // DASH Manifest based on a SegmentTimeline should have minimumUpdatePeriod
        // attribute which should be sufficient to know when to refresh it.
        return false;
    };
    /**
     * Returns the starting time, in seconds, of the earliest segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getFirstPosition = function () {
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var timeline = this._index.timeline;
        return timeline.length === 0 ? null :
            fromIndexTime(timeline[0].start, this._index);
    };
    /**
     * Returns the ending time, in seconds, of the last segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getLastPosition = function () {
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var lastTime = TimelineRepresentationIndex.getIndexEnd(this._index.timeline, this._scaledPeriodStart);
        return lastTime === null ? null :
            fromIndexTime(lastTime, this._index);
    };
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * Returns false if it is not available anymore.
     * Returns undefined if we cannot know whether it is still available or not.
     * @param {Object} segment
     * @returns {Boolean|undefined}
     */
    TimelineRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        if (segment.isInit) {
            return true;
        }
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var _a = this._index, timeline = _a.timeline, timescale = _a.timescale, indexTimeOffset = _a.indexTimeOffset;
        return isSegmentStillAvailable(segment, timeline, timescale, indexTimeOffset);
    };
    /**
     * Checks if the time given is in a discontinuity. That is:
     *   - We're on the upper bound of the current range (end of the range - time
     *     is inferior to the timescale)
     *   - The next range starts after the end of the current range.
     * @param {Number} _time
     * @returns {Number} - If a discontinuity is present, this is the Starting
     * time for the next (discontinuited) range. If not this is equal to -1.
     */
    TimelineRepresentationIndex.prototype.checkDiscontinuity = function (_time) {
        this._refreshTimeline();
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var _a = this._index, timeline = _a.timeline, timescale = _a.timescale;
        var scaledTime = toIndexTime(_time, this._index);
        if (scaledTime <= 0) {
            return -1;
        }
        var segmentIndex = getSegmentIndex(this._index.timeline, scaledTime);
        if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
            return -1;
        }
        var timelineItem = timeline[segmentIndex];
        if (timelineItem.duration === -1) {
            return -1;
        }
        var nextTimelineItem = timeline[segmentIndex + 1];
        if (nextTimelineItem == null) {
            return -1;
        }
        var rangeUp = timelineItem.start;
        var rangeTo = getIndexSegmentEnd(timelineItem, nextTimelineItem, this._scaledPeriodEnd);
        // Every segments defined in range (from rangeUp to rangeTo) are
        // explicitely contiguous.
        // We want to check that the range end is before the next timeline item
        // start, and that scaled time is in this discontinuity.
        if (rangeTo < nextTimelineItem.start &&
            scaledTime >= rangeUp &&
            (rangeTo - scaledTime) < timescale) {
            return fromIndexTime(nextTimelineItem.start, this._index);
        }
        return -1;
    };
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.canBeOutOfSyncError = function (error) {
        if (!this._isDynamic) {
            return false;
        }
        return error instanceof NetworkError &&
            error.isHttpError(404);
    };
    /**
     * Replace this RepresentationIndex with one from a new version of the
     * Manifest.
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._replace = function (newIndex) {
        this._parseTimeline = newIndex._parseTimeline;
        this._index = newIndex._index;
        this._isDynamic = newIndex._isDynamic;
        this._scaledPeriodStart = newIndex._scaledPeriodStart;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._lastUpdate = newIndex._lastUpdate;
        this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    };
    /**
     * Update this RepresentationIndex with a shorter version of it coming from a
     * new version of the MPD.
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._update = function (newIndex) {
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        if (newIndex._index.timeline === null) {
            newIndex._index.timeline = newIndex._getTimeline();
        }
        updateSegmentTimeline(this._index.timeline, newIndex._index.timeline);
        this._isDynamic = newIndex._isDynamic;
        this._scaledPeriodStart = newIndex._scaledPeriodStart;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._lastUpdate = newIndex._lastUpdate;
        this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    };
    TimelineRepresentationIndex.prototype._addSegments = function () {
        if (false) {
            log.warn("Tried to add Segments to a SegmentTimeline RepresentationIndex");
        }
    };
    /**
     * Returns `true` if this RepresentationIndex currently contains its last
     * segment.
     * Returns `false` if it's still pending.
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.isFinished = function () {
        if (!this._isDynamic) {
            return true;
        }
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var timeline = this._index.timeline;
        if (this._scaledPeriodEnd == null || timeline.length === 0) {
            return false;
        }
        var lastTimelineElement = timeline[timeline.length - 1];
        var lastTime = getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd);
        // We can never be truly sure if a SegmentTimeline-based index is finished
        // or not (1 / 60 for possible rounding errors)
        return (lastTime + 1 / 60) >= this._scaledPeriodEnd;
    };
    /**
     * Clean-up timeline to remove segment information which should not be
     * available due to timeshifting.
     */
    TimelineRepresentationIndex.prototype._refreshTimeline = function () {
        if (this._index.timeline === null) {
            this._index.timeline = this._getTimeline();
        }
        var firstPosition = this._manifestBoundsCalculator.getMinimumBound();
        if (firstPosition == null) {
            return; // we don't know yet
        }
        var scaledFirstPosition = toIndexTime(firstPosition, this._index);
        clearTimelineFromPosition(this._index.timeline, scaledFirstPosition);
    };
    TimelineRepresentationIndex.getIndexEnd = function (timeline, scaledPeriodEnd) {
        if (timeline.length <= 0) {
            return null;
        }
        return getIndexSegmentEnd(timeline[timeline.length - 1], null, scaledPeriodEnd);
    };
    /**
     * Allows to generate the "timeline" for this RepresentationIndex.
     * Call this function when the timeline is unknown.
     * This function was added to only perform that task lazily, i.e. only when
     * first needed.
     * After calling it, every now unneeded variable will be freed from memory.
     * This means that calling _getTimeline more than once will just return an
     * empty array.
     *
     * /!\ Please note that this structure should follow the exact same structure
     * than a SegmentTimeline element in the corresponding MPD.
     * This means:
     *   - It should have the same amount of elements in its array than there was
     *     `<S>` elements in the SegmentTimeline.
     *   - Each of those same elements should have the same start time, the same
     *     duration and the same repeat counter than what could be deduced from
     *     the SegmentTimeline.
     * This is needed to be able to run parsing optimization when refreshing the
     * MPD. Not doing so could lead to the RxPlayer not being able to play the
     * stream anymore.
     * @returns {Array.<Object>}
     */
    TimelineRepresentationIndex.prototype._getTimeline = function () {
        if (this._parseTimeline === null) {
            if (this._index.timeline !== null) {
                return this._index.timeline;
            }
            log.error("DASH: Timeline already lazily parsed.");
            return [];
        }
        var newElements = this._parseTimeline();
        this._parseTimeline = null; // Free memory
        if (this._unsafelyBaseOnPreviousIndex === null ||
            newElements.length < MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY) {
            // Just completely parse the current timeline
            return constructTimelineFromElements(newElements, this._scaledPeriodStart);
        }
        // Construct previously parsed timeline if not already done
        var prevTimeline;
        if (this._unsafelyBaseOnPreviousIndex._index.timeline === null) {
            prevTimeline = this._unsafelyBaseOnPreviousIndex._getTimeline();
            this._unsafelyBaseOnPreviousIndex._index.timeline = prevTimeline;
        }
        else {
            prevTimeline = this._unsafelyBaseOnPreviousIndex._index.timeline;
        }
        this._unsafelyBaseOnPreviousIndex = null; // Free memory
        return constructTimelineFromPreviousTimeline(newElements, prevTimeline, this._scaledPeriodStart);
    };
    return TimelineRepresentationIndex;
}());
export default TimelineRepresentationIndex;
