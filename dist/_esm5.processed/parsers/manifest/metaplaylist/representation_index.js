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
import objectAssign from "object-assign";
/**
 * The MetaRepresentationIndex is wrapper for all kind of indexes (dash, smooth, etc)
 *
 * It wraps methods from origin indexes, while taking into account of the offset induced
 * by metaplaylist. It makes a bridge between the metaplaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 */
var MetaRepresentationIndex = /** @class */ (function () {
    function MetaRepresentationIndex(wrappedIndex, contentBounds, transport, baseContentInfos) {
        this._wrappedIndex = wrappedIndex;
        this._timeOffset = contentBounds[0];
        this._contentEnd = contentBounds[1];
        this._transport = transport;
        this._baseContentInfos = baseContentInfos;
    }
    MetaRepresentationIndex.prototype.getInitSegment = function () {
        var segment = this._wrappedIndex.getInitSegment();
        if (segment === null) {
            return null;
        }
        if (segment.privateInfos === undefined) {
            segment.privateInfos = {};
        }
        segment.privateInfos.metaplaylistInfos = { transportType: this._transport,
            baseContent: this._baseContentInfos,
            contentStart: this._timeOffset,
            contentEnd: this._contentEnd };
        return segment;
    };
    MetaRepresentationIndex.prototype.getSegments = function (up, duration) {
        var _this = this;
        return this._wrappedIndex.getSegments(up - this._timeOffset, duration)
            .map(function (segment) {
            if (segment.privateInfos === undefined) {
                segment.privateInfos = {};
            }
            segment.privateInfos.metaplaylistInfos = { transportType: _this._transport,
                baseContent: _this._baseContentInfos,
                contentStart: _this._timeOffset,
                contentEnd: _this._contentEnd };
            segment.time += _this._timeOffset * segment.timescale;
            return segment;
        });
    };
    MetaRepresentationIndex.prototype.shouldRefresh = function () {
        return false;
    };
    MetaRepresentationIndex.prototype.getFirstPosition = function () {
        var wrappedFirstPosition = this._wrappedIndex.getFirstPosition();
        return wrappedFirstPosition != null ? wrappedFirstPosition + this._timeOffset :
            undefined;
    };
    MetaRepresentationIndex.prototype.getLastPosition = function () {
        var wrappedLastPosition = this._wrappedIndex.getLastPosition();
        return wrappedLastPosition != null ? wrappedLastPosition + this._timeOffset :
            undefined;
    };
    MetaRepresentationIndex.prototype.isSegmentStillAvailable = function (segment) {
        var offset = this._timeOffset * segment.timescale;
        var updatedSegment = objectAssign({}, segment, { time: segment.time - offset });
        return this._wrappedIndex.isSegmentStillAvailable(updatedSegment);
    };
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    MetaRepresentationIndex.prototype.canBeOutOfSyncError = function (error) {
        return this._wrappedIndex.canBeOutOfSyncError(error);
    };
    MetaRepresentationIndex.prototype.checkDiscontinuity = function (time) {
        return this._wrappedIndex.checkDiscontinuity(time - this._timeOffset);
    };
    MetaRepresentationIndex.prototype.isFinished = function () {
        return this._wrappedIndex.isFinished();
    };
    MetaRepresentationIndex.prototype._update = function (newIndex) {
        if (!(newIndex instanceof MetaRepresentationIndex)) {
            throw new Error("A MetaPlaylist can only be updated with another MetaPlaylist");
        }
        this._wrappedIndex._update(newIndex._wrappedIndex);
    };
    MetaRepresentationIndex.prototype._addSegments = function (nextSegments, currentSegment) {
        return this._wrappedIndex._addSegments(nextSegments, currentSegment);
    };
    return MetaRepresentationIndex;
}());
export default MetaRepresentationIndex;
