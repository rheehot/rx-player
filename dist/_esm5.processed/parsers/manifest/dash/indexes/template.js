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
import config from "../../../../config";
import log from "../../../../log";
import getInitSegment from "./get_init_segment";
import { createIndexURLs, replaceSegmentDASHTokens, } from "./tokens";
var MINIMUM_SEGMENT_SIZE = config.MINIMUM_SEGMENT_SIZE;
/**
 * IRepresentationIndex implementation for DASH' SegmentTemplate without a
 * SegmentTimeline.
 * @class TemplateRepresentationIndex
 */
var TemplateRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function TemplateRepresentationIndex(index, context) {
        var timescale = index.timescale;
        var aggressiveMode = context.aggressiveMode, availabilityTimeOffset = context.availabilityTimeOffset, manifestBoundsCalculator = context.manifestBoundsCalculator, isDynamic = context.isDynamic, periodEnd = context.periodEnd, periodStart = context.periodStart, representationBaseURLs = context.representationBaseURLs, representationId = context.representationId, representationBitrate = context.representationBitrate;
        this._availabilityTimeOffset = availabilityTimeOffset;
        this._manifestBoundsCalculator = manifestBoundsCalculator;
        this._aggressiveMode = aggressiveMode;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset :
            0;
        var scaledStart = periodStart * timescale;
        var indexTimeOffset = presentationTimeOffset - scaledStart;
        this._index = { duration: index.duration,
            timescale: timescale,
            indexRange: index.indexRange,
            indexTimeOffset: indexTimeOffset,
            initialization: index.initialization == null ?
                undefined :
                { mediaURLs: createIndexURLs(representationBaseURLs, index.initialization.media, representationId, representationBitrate),
                    range: index.initialization.range },
            mediaURLs: createIndexURLs(representationBaseURLs, index.media, representationId, representationBitrate),
            presentationTimeOffset: presentationTimeOffset,
            startNumber: index.startNumber };
        this._isDynamic = isDynamic;
        this._periodStart = periodStart;
        this._relativePeriodEnd = periodEnd == null ? undefined :
            periodEnd - periodStart;
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    TemplateRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * @param {Number} fromTime
     * @param {Number} dur
     * @returns {Array.<Object>}
     */
    TemplateRepresentationIndex.prototype.getSegments = function (fromTime, dur) {
        var _a;
        var index = this._index;
        var duration = index.duration, startNumber = index.startNumber, timescale = index.timescale, mediaURLs = index.mediaURLs;
        var scaledStart = this._periodStart * timescale;
        var scaledEnd = this._relativePeriodEnd == null ?
            undefined :
            this._relativePeriodEnd * timescale;
        // Convert the asked position to the right timescales, and consider them
        // relatively to the Period's start.
        var upFromPeriodStart = fromTime * timescale - scaledStart;
        var toFromPeriodStart = (fromTime + dur) * timescale - scaledStart;
        var firstSegmentStart = this._getFirstSegmentStart();
        var lastSegmentStart = this._getLastSegmentStart();
        if (firstSegmentStart == null || lastSegmentStart == null) {
            return [];
        }
        var startPosition = Math.max(firstSegmentStart, upFromPeriodStart);
        var lastWantedStartPosition = Math.min(lastSegmentStart, toFromPeriodStart);
        if ((lastWantedStartPosition + duration) <= startPosition) {
            return [];
        }
        var segments = [];
        // number corresponding to the Period's start
        var numberOffset = startNumber == null ? 1 :
            startNumber;
        // calcul initial time from Period start, where the first segment would have
        // the `0` number
        var numberIndexedToZero = Math.floor(startPosition / duration);
        var _loop_1 = function (timeFromPeriodStart) {
            // To obtain the real number, adds the real number from the Period's start
            var realNumber = numberIndexedToZero + numberOffset;
            var realDuration = scaledEnd != null &&
                timeFromPeriodStart + duration > scaledEnd ?
                scaledEnd - timeFromPeriodStart :
                duration;
            var realTime = timeFromPeriodStart + scaledStart;
            var manifestTime = timeFromPeriodStart + this_1._index.presentationTimeOffset;
            var detokenizedURLs = (_a = mediaURLs === null || mediaURLs === void 0 ? void 0 : mediaURLs.map(function (url) {
                return replaceSegmentDASHTokens(url, manifestTime, realNumber);
            })) !== null && _a !== void 0 ? _a : null;
            var args = { id: String(realNumber),
                number: realNumber,
                time: realTime,
                isInit: false,
                duration: realDuration,
                timescale: timescale,
                mediaURLs: detokenizedURLs,
                timestampOffset: -(index.indexTimeOffset / timescale) };
            segments.push(args);
            numberIndexedToZero++;
        };
        var this_1 = this;
        for (var timeFromPeriodStart = numberIndexedToZero * duration; timeFromPeriodStart <= lastWantedStartPosition; timeFromPeriodStart += duration) {
            _loop_1(timeFromPeriodStart);
        }
        return segments;
    };
    /**
     * Returns first possible position in the index.
     * @returns {number|null|undefined}
     */
    TemplateRepresentationIndex.prototype.getFirstPosition = function () {
        var firstSegmentStart = this._getFirstSegmentStart();
        if (firstSegmentStart == null) {
            return firstSegmentStart; // return undefined or null
        }
        return (firstSegmentStart / this._index.timescale) + this._periodStart;
    };
    /**
     * Returns last possible position in the index.
     * @returns {number|null}
     */
    TemplateRepresentationIndex.prototype.getLastPosition = function () {
        var lastSegmentStart = this._getLastSegmentStart();
        if (lastSegmentStart == null) {
            // In that case (null or undefined), getLastPosition should reflect
            // the result of getLastSegmentStart, as the meaning is the same for
            // the two functions. So, we return the result of the latter.
            return lastSegmentStart;
        }
        var lastSegmentEnd = lastSegmentStart + this._index.duration;
        return (lastSegmentEnd / this._index.timescale) + this._periodStart;
    };
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * We never have to refresh a SegmentTemplate-based manifest.
     * @returns {Boolean}
     */
    TemplateRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    /**
     * We cannot check for discontinuity in SegmentTemplate-based indexes.
     * @returns {Number}
     */
    TemplateRepresentationIndex.prototype.checkDiscontinuity = function () {
        return -1;
    };
    TemplateRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        if (segment.isInit) {
            return true;
        }
        if (segment.timescale !== this._index.timescale) {
            return undefined;
        }
        var timescale = segment.timescale;
        var timeRelativeToPeriodStart = segment.time - (this._periodStart * timescale);
        var firstSegmentStart = this._getFirstSegmentStart();
        var lastSegmentStart = this._getLastSegmentStart();
        if (firstSegmentStart === undefined || lastSegmentStart === undefined) {
            return undefined;
        }
        if (firstSegmentStart === null || lastSegmentStart === null) {
            return false;
        }
        if (timeRelativeToPeriodStart < firstSegmentStart) {
            return false;
        }
        if (timeRelativeToPeriodStart > lastSegmentStart ||
            segment.duration !== this._index.duration) {
            return false;
        }
        return (timeRelativeToPeriodStart / this._index.duration) % 1 === 0;
    };
    /**
     * SegmentTemplate without a SegmentTimeline should not be updated.
     * @returns {Boolean}
     */
    TemplateRepresentationIndex.prototype.canBeOutOfSyncError = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    TemplateRepresentationIndex.prototype.isFinished = function () {
        if (!this._isDynamic) {
            return true;
        }
        if (this._relativePeriodEnd == null) {
            return false;
        }
        var timescale = this._index.timescale;
        var lastSegmentStart = this._getLastSegmentStart();
        // As last segment start is null if live time is before
        // current period, consider the index not to be finished.
        if (lastSegmentStart == null) {
            return false;
        }
        var lastSegmentEnd = lastSegmentStart + this._index.duration;
        // (1 / 60 for possible rounding errors)
        var roundingError = (1 / 60) * timescale;
        return (lastSegmentEnd + roundingError) >=
            (this._relativePeriodEnd * timescale);
    };
    /**
     * We do not have to add new segments to SegmentList-based indexes.
     * @returns {Array}
     */
    TemplateRepresentationIndex.prototype._addSegments = function () {
        log.warn("Tried to add Segments to a template RepresentationIndex");
    };
    /**
     * @param {Object} newIndex
     */
    TemplateRepresentationIndex.prototype._replace = function (newIndex) {
        this._index = newIndex._index;
        this._aggressiveMode = newIndex._aggressiveMode;
        this._isDynamic = newIndex._isDynamic;
        this._periodStart = newIndex._periodStart;
        this._relativePeriodEnd = newIndex._relativePeriodEnd;
        this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    };
    /**
     * @param {Object} newIndex
     */
    TemplateRepresentationIndex.prototype._update = function (newIndex) {
        // As segments are not declared individually, as long as this Representation
        // is present, we have every information we need
        this._replace(newIndex);
    };
    /**
     * Returns the timescaled start of the first segment that should be available,
     * relatively to the start of the Period.
     * @returns {number | null | undefined}
     */
    TemplateRepresentationIndex.prototype._getFirstSegmentStart = function () {
        if (!this._isDynamic) {
            return 0; // it is the start of the Period
        }
        // 1 - check that this index is already available
        if (this._relativePeriodEnd === 0 || this._relativePeriodEnd == null) {
            // /!\ The scaled max position augments continuously and might not
            // reflect exactly the real server-side value. As segments are
            // generated discretely.
            var maximumBound = this._manifestBoundsCalculator.getMaximumBound();
            if (maximumBound !== undefined && maximumBound < this._periodStart) {
                // Maximum position is before this period.
                // No segment is yet available here
                return null;
            }
        }
        var _a = this._index, duration = _a.duration, timescale = _a.timescale;
        var firstPosition = this._manifestBoundsCalculator.getMinimumBound();
        if (firstPosition === undefined) {
            return undefined;
        }
        var segmentTime = firstPosition > this._periodStart ?
            (firstPosition - this._periodStart) * timescale :
            0;
        var numberIndexedToZero = Math.floor(segmentTime / duration);
        return numberIndexedToZero * duration;
    };
    /**
     * Returns the timescaled start of the last segment that should be available,
     * relatively to the start of the Period.
     * Returns null if live time is before current period.
     * @returns {number|null|undefined}
     */
    TemplateRepresentationIndex.prototype._getLastSegmentStart = function () {
        var _a = this._index, duration = _a.duration, timescale = _a.timescale;
        if (this._isDynamic) {
            var lastPos = this._manifestBoundsCalculator.getMaximumBound();
            if (lastPos === undefined) {
                return undefined;
            }
            var agressiveModeOffset = this._aggressiveMode ? (duration / timescale) :
                0;
            if (this._relativePeriodEnd != null &&
                this._relativePeriodEnd < (lastPos + agressiveModeOffset - this._periodStart)) {
                var scaledRelativePeriodEnd = this._relativePeriodEnd * timescale;
                if (scaledRelativePeriodEnd < duration) {
                    return null;
                }
                return (Math.floor(scaledRelativePeriodEnd / duration) - 1) * duration;
            }
            // /!\ The scaled last position augments continuously and might not
            // reflect exactly the real server-side value. As segments are
            // generated discretely.
            var scaledLastPosition = (lastPos - this._periodStart) * timescale;
            // Maximum position is before this period.
            // No segment is yet available here
            if (scaledLastPosition < 0) {
                return null;
            }
            var availabilityTimeOffset = ((this._availabilityTimeOffset !== undefined ? this._availabilityTimeOffset : 0) +
                agressiveModeOffset) * timescale;
            var numberOfSegmentsAvailable = Math.floor((scaledLastPosition + availabilityTimeOffset) / duration);
            return numberOfSegmentsAvailable <= 0 ?
                null :
                (numberOfSegmentsAvailable - 1) * duration;
        }
        else {
            var maximumTime = (this._relativePeriodEnd === undefined ?
                0 :
                this._relativePeriodEnd) * timescale;
            var numberIndexedToZero = Math.ceil(maximumTime / duration) - 1;
            var regularLastSegmentStart = numberIndexedToZero * duration;
            // In some SegmentTemplate, we could think that there is one more
            // segment that there actually is due to a very little difference between
            // the period's duration and a multiple of a segment's duration.
            // Check that we're within a good margin
            var minimumDuration = MINIMUM_SEGMENT_SIZE * timescale;
            if (maximumTime - regularLastSegmentStart > minimumDuration ||
                numberIndexedToZero === 0) {
                return regularLastSegmentStart;
            }
            return (numberIndexedToZero - 1) * duration;
        }
    };
    return TemplateRepresentationIndex;
}());
export default TemplateRepresentationIndex;
