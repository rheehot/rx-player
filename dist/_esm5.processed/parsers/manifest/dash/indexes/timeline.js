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
import { NetworkError, } from "../../../../errors";
import log from "../../../../log";
import clearTimelineFromPosition from "../../utils/clear_timeline_from_position";
import { fromIndexTime, getIndexSegmentEnd, toIndexTime, } from "../../utils/index_helpers";
import isSegmentStillAvailable from "../../utils/is_segment_still_available";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { createIndexURL } from "./tokens";
/**
 * Translate parsed `S` node into Segment compatible with this index:
 * Find out the start, repeatCount and duration of each of these.
 *
 * @param {Object} item - parsed `S` node
 * @param {Object|null} previousItem - the previously parsed Segment (related
 * to the `S` node coming just before). If `null`, we're talking about the first
 * segment.
 * @param {Object|null} nextItem - the `S` node coming next. If `null`, we're
 * talking about the last segment.
 * @param {number} timelineStart - Absolute start for the timeline. In the same
 * timescale than the given `S` nodes.
 * @returns {Object|null}
 */
function fromParsedSToIndexSegment(item, previousItem, nextItem, timelineStart) {
    var start = item.start;
    var duration = item.duration;
    var repeatCount = item.repeatCount;
    if (start == null) {
        if (previousItem == null) {
            start = timelineStart;
        }
        else if (previousItem.duration != null) {
            start = previousItem.start +
                (previousItem.duration * (previousItem.repeatCount + 1));
        }
    }
    if ((duration == null || isNaN(duration)) &&
        nextItem != null && nextItem.start != null && !isNaN(nextItem.start) &&
        start != null && !isNaN(start)) {
        duration = nextItem.start - start;
    }
    if ((start != null && !isNaN(start)) &&
        (duration != null && !isNaN(duration)) &&
        (repeatCount == null || !isNaN(repeatCount))) {
        return { start: start,
            duration: duration,
            repeatCount: repeatCount === undefined ? 0 :
                repeatCount };
    }
    log.warn("DASH: A \"S\" Element could not have been parsed.");
    return null;
}
/**
 * Get index of the segment containing the given timescaled timestamp.
 * @param {Object} index
 * @param {Number} start
 * @returns {Number}
 */
function getSegmentIndex(index, start) {
    var timeline = index.timeline;
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
        var manifestBoundsCalculator = context.manifestBoundsCalculator, isDynamic = context.isDynamic, representationBaseURL = context.representationBaseURL, representationId = context.representationId, representationBitrate = context.representationBitrate, periodStart = context.periodStart, periodEnd = context.periodEnd;
        var timescale = index.timescale;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset :
            0;
        var scaledStart = periodStart * timescale;
        var indexTimeOffset = presentationTimeOffset - scaledStart;
        var initialTimeline = index.timeline;
        var timeline = [];
        for (var i = 0; i < initialTimeline.length; i++) {
            var item = initialTimeline[i];
            var nextItem = timeline[timeline.length - 1] === undefined ?
                null :
                timeline[timeline.length - 1];
            var prevItem = initialTimeline[i + 1] === undefined ?
                null :
                initialTimeline[i + 1];
            var timelineElement = fromParsedSToIndexSegment(item, nextItem, prevItem, scaledStart);
            if (timelineElement != null) {
                timeline.push(timelineElement);
            }
        }
        this._manifestBoundsCalculator = manifestBoundsCalculator;
        this._lastUpdate = context.receivedTime == null ?
            performance.now() :
            context.receivedTime;
        this._isDynamic = isDynamic;
        this._index = { indexRange: index.indexRange,
            indexTimeOffset: indexTimeOffset,
            initialization: index.initialization == null ?
                undefined :
                {
                    mediaURL: createIndexURL(representationBaseURL, index.initialization.media, representationId, representationBitrate),
                    range: index.initialization.range,
                },
            mediaURL: createIndexURL(representationBaseURL, index.media, representationId, representationBitrate),
            startNumber: index.startNumber,
            timeline: timeline,
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
        this._refreshTimeline(); // first clear timeline if needed
        return getSegmentsFromTimeline(this._index, from, duration, this._scaledPeriodEnd);
    };
    /**
     * Returns true if the index should be refreshed.
     * @param {Number} _up
     * @param {Number} to
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.shouldRefresh = function (_up, to) {
        this._refreshTimeline();
        if (!this._isDynamic) {
            return false;
        }
        if (this._index.timeline.length === 0) {
            return true;
        }
        var lastTimelineElt = this._index.timeline[this._index.timeline.length - 1];
        var lastTime = getIndexSegmentEnd(lastTimelineElt, null, this._scaledPeriodEnd);
        if (to * this._index.timescale < lastTime) {
            return false;
        }
        var lastTheoriticalPosition = this._getTheoriticalLastPosition();
        if (lastTheoriticalPosition == null) {
            return true;
        }
        return lastTheoriticalPosition > lastTime;
    };
    /**
     * Returns the starting time, in seconds, of the earliest segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getFirstPosition = function () {
        this._refreshTimeline();
        var index = this._index;
        return index.timeline.length === 0 ? null :
            fromIndexTime(index.timeline[0].start, index);
    };
    /**
     * Returns the ending time, in seconds, of the last segment currently
     * available.
     * Returns null if nothing is in the index
     * @returns {Number|null}
     */
    TimelineRepresentationIndex.prototype.getLastPosition = function () {
        this._refreshTimeline();
        var timeline = this._index.timeline;
        if (timeline.length === 0) {
            return null;
        }
        var lastTimelineElement = timeline[timeline.length - 1];
        var lastTime = getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd);
        return fromIndexTime(lastTime, this._index);
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
        var _a = this._index, timeline = _a.timeline, timescale = _a.timescale;
        var scaledTime = toIndexTime(_time, this._index);
        if (scaledTime <= 0) {
            return -1;
        }
        var segmentIndex = getSegmentIndex(this._index, scaledTime);
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
     * @param {Object} newIndex
     */
    TimelineRepresentationIndex.prototype._update = function (newIndex) {
        this._index = newIndex._index;
        this._isDynamic = newIndex._isDynamic;
        this._scaledPeriodStart = newIndex._scaledPeriodStart;
        this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
        this._lastUpdate = newIndex._lastUpdate;
        this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    };
    /**
     * We do not have to add new segments to SegmentList-based indexes.
     * @param {Array.<Object>} nextSegments
     * @param {Object|undefined} currentSegmentInfos
     * @returns {Array}
     */
    TimelineRepresentationIndex.prototype._addSegments = function () {
        if (false) {
            log.warn("Tried to add Segments to a SegmentTimeline RepresentationIndex");
        }
    };
    /**
     * @returns {Boolean}
     */
    TimelineRepresentationIndex.prototype.isFinished = function () {
        if (!this._isDynamic) {
            return true;
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
        var firstPosition = this._manifestBoundsCalculator.getMinimumBound();
        if (firstPosition == null) {
            return; // we don't know yet
        }
        var scaledFirstPosition = toIndexTime(firstPosition, this._index);
        clearTimelineFromPosition(this._index.timeline, scaledFirstPosition);
    };
    /**
     * Returns last position if new segments have the same duration than the
     * current last one.
     * @returns {number}
     */
    TimelineRepresentationIndex.prototype._getTheoriticalLastPosition = function () {
        var index = this._index;
        if (index.timeline.length <= 0) {
            return undefined;
        }
        var lastTimelineElement = index.timeline[index.timeline.length - 1];
        var lastPosition = getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd);
        if (!this._isDynamic) {
            return lastPosition;
        }
        var lastSegmentDuration = lastTimelineElement.duration;
        var timeDiffInSeconds = (performance.now() - this._lastUpdate) / 1000;
        var timeDiffTS = timeDiffInSeconds * index.timescale;
        if (timeDiffTS < lastSegmentDuration) {
            return lastPosition;
        }
        var numberOfNewSegments = Math.floor(timeDiffTS / lastSegmentDuration);
        return numberOfNewSegments * lastSegmentDuration + lastPosition;
    };
    return TimelineRepresentationIndex;
}());
export default TimelineRepresentationIndex;
