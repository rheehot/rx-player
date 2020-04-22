/*
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
import log from "../../../../log";
import { getTimescaledRange } from "../../utils/index_helpers";
import getInitSegment from "./get_init_segment";
import { createIndexURLs } from "./tokens";
var ListRepresentationIndex = /** @class */ (function () {
    /**
     * @param {Object} index
     * @param {Object} context
     */
    function ListRepresentationIndex(index, context) {
        var periodStart = context.periodStart, representationBaseURLs = context.representationBaseURLs, representationId = context.representationId, representationBitrate = context.representationBitrate;
        this._periodStart = periodStart;
        var presentationTimeOffset = index.presentationTimeOffset != null ? index.presentationTimeOffset :
            0;
        var indexTimeOffset = presentationTimeOffset - periodStart * index.timescale;
        var list = index.list.map(function (lItem) { return ({
            mediaURLs: createIndexURLs(representationBaseURLs, lItem.media, representationId, representationBitrate),
            mediaRange: lItem.mediaRange
        }); });
        this._index = { list: list,
            timescale: index.timescale,
            duration: index.duration,
            indexTimeOffset: indexTimeOffset,
            indexRange: index.indexRange,
            initialization: index.initialization == null ?
                undefined :
                { mediaURLs: createIndexURLs(representationBaseURLs, index.initialization.media, representationId, representationBitrate),
                    range: index.initialization.range, }, };
    }
    /**
     * Construct init Segment.
     * @returns {Object}
     */
    ListRepresentationIndex.prototype.getInitSegment = function () {
        return getInitSegment(this._index);
    };
    /**
     * @param {Number} fromTime
     * @param {Number} duration
     * @returns {Array.<Object>}
     */
    ListRepresentationIndex.prototype.getSegments = function (fromTime, dur) {
        var index = this._index;
        var duration = index.duration, list = index.list, timescale = index.timescale;
        var fromTimeInPeriod = fromTime - this._periodStart;
        var _a = getTimescaledRange(fromTimeInPeriod, dur, timescale), up = _a[0], to = _a[1];
        var scaledStart = this._periodStart * timescale;
        var length = Math.min(list.length - 1, Math.floor(to / duration));
        var segments = [];
        var i = Math.floor(up / duration);
        while (i <= length) {
            var range = list[i].mediaRange;
            var mediaURLs = list[i].mediaURLs;
            var args = { id: String(i),
                time: i * duration + scaledStart,
                isInit: false,
                range: range,
                duration: duration,
                timescale: timescale,
                mediaURLs: mediaURLs,
                timestampOffset: -(index.indexTimeOffset / timescale) };
            segments.push(args);
            i++;
        }
        return segments;
    };
    /**
     * Returns true if, based on the arguments, the index should be refreshed.
     * (If we should re-fetch the manifest)
     * @param {Number} _fromTime
     * @param {Number} toTime
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.shouldRefresh = function (_fromTime, toTime) {
        var _a = this._index, timescale = _a.timescale, duration = _a.duration, list = _a.list;
        var scaledTo = toTime * timescale;
        var i = Math.floor(scaledTo / duration);
        return i < 0 || i >= list.length;
    };
    /**
     * Returns first position in this index, in seconds.
     * @returns {Number}
     */
    ListRepresentationIndex.prototype.getFirstPosition = function () {
        return this._periodStart;
    };
    /**
     * Returns last position in this index, in seconds.
     * @returns {Number}
     */
    ListRepresentationIndex.prototype.getLastPosition = function () {
        var index = this._index;
        var duration = index.duration, list = index.list;
        return ((list.length * duration) / index.timescale) + this._periodStart;
    };
    /**
     * Returns true if a Segment returned by this index is still considered
     * available.
     * @param {Object} segment
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        if (segment.isInit) {
            return true;
        }
        var index = this._index;
        var scaledStart = this._periodStart * index.timescale;
        var scaledSegmentStartInPeriod = segment.timescale !== index.timescale ?
            ((segment.time * index.timescale) / segment.timescale) + scaledStart :
            segment.time - scaledStart;
        var duration = index.duration;
        var segmentNb = scaledSegmentStartInPeriod / duration;
        return segmentNb > 0 && segmentNb % 1 === 0;
    };
    /**
     * We do not check for discontinuity in SegmentList-based indexes.
     * @returns {Number}
     */
    ListRepresentationIndex.prototype.checkDiscontinuity = function () {
        return -1;
    };
    /**
     * SegmentList should not be updated.
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.canBeOutOfSyncError = function () {
        return false;
    };
    /**
     * @returns {Boolean}
     */
    ListRepresentationIndex.prototype.isFinished = function () {
        return true;
    };
    /**
     * @param {Object} newIndex
     */
    ListRepresentationIndex.prototype._replace = function (newIndex) {
        this._index = newIndex._index;
    };
    /**
     * @param {Object} newIndex
     */
    ListRepresentationIndex.prototype._update = function () {
        log.error("List RepresentationIndex: Cannot update a SegmentList");
    };
    ListRepresentationIndex.prototype._addSegments = function () {
        if (false) {
            log.warn("List RepresentationIndex: Tried to add Segments to a list RepresentationIndex");
        }
    };
    return ListRepresentationIndex;
}());
export default ListRepresentationIndex;
