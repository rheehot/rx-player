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
import { fromIndexTime, getIndexSegmentEnd, toIndexTime, } from "../../utils/index_helpers";
import getInitSegment from "./get_init_segment";
import getSegmentsFromTimeline from "./get_segments_from_timeline";
import { createIndexURL } from "./tokens";
/**
 * Add a new segment to the index.
 *
 * /!\ Mutate the given index
 * @param {Object} index
 * @param {Object} segmentInfos
 * @returns {Boolean} - true if the segment has been added
 */
function _addSegmentInfos(index, segmentInfos) {
    if (segmentInfos.timescale !== index.timescale) {
        var timescale = index.timescale;
        index.timeline.push({ start: (segmentInfos.time / segmentInfos.timescale)
                * timescale,
            duration: (segmentInfos.duration / segmentInfos.timescale)
                * timescale,
            repeatCount: segmentInfos.count === undefined ?
                0 :
                segmentInfos.count,
            range: segmentInfos.range });
    }
    else {
        index.timeline.push({ start: segmentInfos.time,
            duration: segmentInfos.duration,
            repeatCount: segmentInfos.count === undefined ?
                0 :
                segmentInfos.count,
            range: segmentInfos.range });
    }
    return true;
}
/**
 * Provide helpers for SegmentBase-based indexes.
 * @type {Object}
 */
var BaseRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function BaseRepresentationIndex(index, context) {
        var periodStart = context.periodStart, periodEnd = context.periodEnd, representationBaseURL = context.representationBaseURL, representationId = context.representationId, representationBitrate = context.representationBitrate;
        var timescale = index.timescale;
        var presentationTimeOffset = index.presentationTimeOffset != null ?
            index.presentationTimeOffset : 0;
        var indexTimeOffset = presentationTimeOffset - periodStart * timescale;
        var mediaURL = createIndexURL(representationBaseURL, index.initialization !== undefined ?
            index.initialization.media :
            undefined, representationId, representationBitrate);
        // TODO If indexRange is either undefined or behind the initialization segment
        // the following logic will not work.
        // However taking the nth first bytes like `dash.js` does (where n = 1500) is
        // not straightforward as we would need to clean-up the segment after that.
        // The following logic corresponds to 100% of tested cases, so good enough for
        // now.
        var range = index.initialization !== undefined ? index.initialization.range :
            index.indexRange !== undefined ? [0, index.indexRange[0] - 1] :
                undefined;
        this._index = { indexRange: index.indexRange,
            indexTimeOffset: indexTimeOffset,
            initialization: { mediaURL: mediaURL, range: range },
            mediaURL: createIndexURL(representationBaseURL, index.media, representationId, representationBitrate),
            startNumber: index.startNumber,
            timeline: index.timeline,
            timescale: timescale };
        this._scaledPeriodEnd = periodEnd == null ? undefined :
            toIndexTime(periodEnd, this._index);
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    BaseRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * @param {Number} _up
     * @param {Number} _to
     * @returns {Array.<Object>}
     */
    BaseRepresentationIndex.prototype.getSegments = function (_up, _to) {
        return getSegmentsFromTimeline(this._index, _up, _to, this._scaledPeriodEnd);
    };
    /**
     * Returns false as no Segment-Base based index should need to be refreshed.
     * @returns {Boolean}
     */
    BaseRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    /**
     * Returns first position in index.
     * @returns {Number|null}
     */
    BaseRepresentationIndex.prototype.getFirstPosition = function () {
        var index = this._index;
        if (index.timeline.length === 0) {
            return null;
        }
        return fromIndexTime(index.timeline[0].start, index);
    };
    /**
     * Returns last position in index.
     * @returns {Number|null}
     */
    BaseRepresentationIndex.prototype.getLastPosition = function () {
        var timeline = this._index.timeline;
        if (timeline.length === 0) {
            return null;
        }
        var lastTimelineElement = timeline[timeline.length - 1];
        var lastTime = getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd);
        return fromIndexTime(lastTime, this._index);
    };
    /**
     * Segments in a segmentBase scheme should stay available.
     * @returns {Boolean|undefined}
     */
    BaseRepresentationIndex.prototype.isSegmentStillAvailable = function () {
        return true;
    };
    /**
     * We do not check for discontinuity in SegmentBase-based indexes.
     * @returns {Number}
     */
    BaseRepresentationIndex.prototype.checkDiscontinuity = function () {
        return -1;
    };
    /**
     * @param {Array.<Object>} nextSegments
     * @returns {Array.<Object>}
     */
    BaseRepresentationIndex.prototype._addSegments = function (nextSegments) {
        for (var i = 0; i < nextSegments.length; i++) {
            _addSegmentInfos(this._index, nextSegments[i]);
        }
    };
    /**
     * SegmentBase should not be updated.
     * @returns {Boolean}
     */
    BaseRepresentationIndex.prototype.canBeOutOfSyncError = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    BaseRepresentationIndex.prototype.isFinished = function () {
        return true;
    };
    /**
     * @param {Object} newIndex
     */
    BaseRepresentationIndex.prototype._update = function (newIndex) {
        this._index = newIndex._index;
    };
    return BaseRepresentationIndex;
}());
export default BaseRepresentationIndex;
