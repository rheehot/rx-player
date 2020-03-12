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
/**
 * This file allows to create RepresentationBuffers.
 *
 * A RepresentationBuffer downloads and push segment for a single
 * Representation (e.g. a single video stream of a given quality).
 * It chooses which segments should be downloaded according to the current
 * position and what is currently buffered.
 */
// import objectAssign from "object-assign";
import shouldAppendBufferAfterPadding from "../../../compat/should_append_buffer_after_padding";
import config from "../../../config";
import log from "../../../log";
var CONTENT_REPLACEMENT_PADDING = config.CONTENT_REPLACEMENT_PADDING, BITRATE_REBUFFERING_RATIO = config.BITRATE_REBUFFERING_RATIO, MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT = config.MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT, MINIMUM_SEGMENT_SIZE = config.MINIMUM_SEGMENT_SIZE;
/**
 * @param {Object} segmentFilterArgument
 * @returns {Array.<Object>}
 */
export default function getNeededSegments(_a) {
    var content = _a.content, currentPlaybackTime = _a.currentPlaybackTime, knownStableBitrate = _a.knownStableBitrate, loadedSegmentPendingPush = _a.loadedSegmentPendingPush, neededRange = _a.neededRange, segmentInventory = _a.segmentInventory;
    // 1 - construct lists of segments possible and actually pushed
    var possibleSegments = content.representation.index
        .getSegments(neededRange.start, neededRange.end - neededRange.start);
    var currentSegments = getCorrespondingBufferedSegments({
        start: Math.max(neededRange.start - 0.5, 0),
        end: neededRange.end + 0.5,
    }, segmentInventory);
    // 2 - remove from pushed list of current segments the contents we want to replace
    var consideredSegments = currentSegments
        .filter(function (bufferedSegment) { return !shouldContentBeReplaced(bufferedSegment.infos, content, currentPlaybackTime, knownStableBitrate); });
    // 3 - remove from that list the segments who appeared to have been GCed
    var completeSegments = filterGarbageCollectedSegments(consideredSegments, neededRange);
    // 4 - now filter the list of segments we can download
    var roundingError = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    return possibleSegments.filter(function (segment) {
        if (loadedSegmentPendingPush.test(segment.id)) {
            return false; // we're already pushing it
        }
        var duration = segment.duration, time = segment.time, timescale = segment.timescale;
        if (segment.isInit || duration === undefined) {
            return true; // never skip those
        }
        if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
            return false; // too small
        }
        var scaledTime = time / timescale;
        var scaledDuration = duration / timescale;
        var scaledEnd = scaledTime + scaledDuration;
        // check if the segment is already downloaded
        for (var i = 0; i < completeSegments.length; i++) {
            var completeSeg = completeSegments[i];
            var areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
            // Check if content are from same period, as there can't be overlapping
            // periods, we should consider a segment as already downloaded if
            // it is from same period (but can be from different adaptation or
            // representation)
            if (areFromSamePeriod) {
                var segTime = completeSeg.infos.segment.time;
                var segDuration = completeSeg.infos.segment.duration;
                var segTimeScale = completeSeg.infos.segment.timescale;
                var scaledSegTime = segTime / segTimeScale;
                var scaledSegEnd = scaledSegTime + segDuration / segTimeScale;
                if (scaledTime - scaledSegTime > -roundingError &&
                    scaledSegEnd - scaledEnd > -roundingError) {
                    return false; // already downloaded
                }
            }
        }
        // check if there is an hole in place of the segment currently
        for (var i = 0; i < completeSegments.length; i++) {
            var completeSeg = completeSegments[i];
            if (completeSeg.end > scaledTime) {
                if (completeSeg.start > scaledTime + roundingError) {
                    return true;
                }
                var j = i + 1;
                // go through all contiguous segments and take the last one
                while (j < completeSegments.length - 1 &&
                    (completeSegments[j - 1].end + roundingError) >
                        completeSegments[j].start) {
                    j++;
                }
                j--; // index of last contiguous segment
                return completeSegments[j].end < scaledEnd + roundingError;
            }
        }
        return true;
    });
}
/**
 * Returns `true` if segments linked to the given `oldContent` currently present
 * in the buffer should be replaced by segments coming from `currentContent`.
 * @param {Object} oldContent
 * @param {Object} currentContent
 * @param {number} currentPlaybackTime
 * @param {number} [knownStableBitrate]
 * @returns {boolean}
 */
function shouldContentBeReplaced(oldContent, currentContent, currentPlaybackTime, knownStableBitrate) {
    if (oldContent.period.id !== currentContent.period.id) {
        return false; // keep segments from another Period by default.
    }
    var segment = oldContent.segment;
    if (shouldAppendBufferAfterPadding &&
        (segment.time / segment.timescale) <
            (currentPlaybackTime + CONTENT_REPLACEMENT_PADDING)) {
        return false;
    }
    if (oldContent.adaptation.id !== currentContent.adaptation.id) {
        return true; // replace segments from another Adaptation
    }
    var oldContentBitrate = oldContent.representation.bitrate;
    if (knownStableBitrate === undefined) {
        // only re-load comparatively-poor bitrates for the same Adaptation.
        var bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
        return currentContent.representation.bitrate > bitrateCeil;
    }
    return oldContentBitrate < knownStableBitrate &&
        currentContent.representation.bitrate > oldContentBitrate;
}
/**
 * Returns an Array which removed the segments from `consideredSegments` which
 * appeared to have been garbage collected.
 * @param {Array.<Object>} consideredSegments
 * @param {Object} neededRange
 * @returns {Array.<Object>}
 */
function filterGarbageCollectedSegments(consideredSegments, neededRange) {
    var completeSegments = [];
    for (var i = 0; i < consideredSegments.length; i++) {
        var segmentStartIsComplete = true;
        var segmentEndIsComplete = true;
        var currentSeg = consideredSegments[i];
        var prevSeg = i === 0 ? null :
            consideredSegments[i - 1];
        var nextSeg = i >= consideredSegments.length - 1 ? null :
            consideredSegments[i + 1];
        if (currentSeg.bufferedStart === undefined) {
            segmentStartIsComplete = false;
        }
        else if ((prevSeg === null ||
            prevSeg.bufferedEnd === undefined ||
            prevSeg.bufferedEnd !== currentSeg.bufferedStart) &&
            neededRange.start < currentSeg.bufferedStart &&
            currentSeg.bufferedStart - currentSeg.start >
                MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.info("Buffer: The start of the wanted segment has been garbage collected", currentSeg);
            segmentStartIsComplete = false;
        }
        if (currentSeg.bufferedEnd === undefined) {
            segmentEndIsComplete = false;
        }
        else if ((nextSeg === null ||
            nextSeg.bufferedEnd === undefined ||
            nextSeg.bufferedEnd !== currentSeg.bufferedStart) &&
            neededRange.end > currentSeg.bufferedEnd &&
            currentSeg.end - currentSeg.bufferedEnd >
                MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
            log.info("Buffer: The end of the wanted segment has been garbage collected", currentSeg);
            segmentEndIsComplete = false;
        }
        if (segmentStartIsComplete && segmentEndIsComplete) {
            completeSegments.push(currentSeg);
        }
    }
    return completeSegments;
}
/**
 * From the given SegmentInventory, filters the buffered Segment Object which
 * overlap with the given range.
 * @param {Object} neededRange
 * @param {Array.<Object>} segmentInventory
 * @returns {Array.<Object>}
 */
function getCorrespondingBufferedSegments(neededRange, segmentInventory) {
    var segmentRoundingError = Math.max(1 / 60, MINIMUM_SEGMENT_SIZE);
    var minEnd = neededRange.start + segmentRoundingError;
    var maxStart = neededRange.end - segmentRoundingError;
    var overlappingChunks = [];
    for (var i = segmentInventory.length - 1; i >= 0; i--) {
        var eltInventory = segmentInventory[i];
        if (!eltInventory.partiallyPushed &&
            eltInventory.infos.representation.decipherable !== false) {
            var inventorySegment = eltInventory.infos.segment;
            var eltInventoryStart = inventorySegment.time /
                inventorySegment.timescale;
            var eltInventoryEnd = inventorySegment.duration == null ?
                eltInventory.end :
                eltInventoryStart + inventorySegment.duration /
                    inventorySegment.timescale;
            if ((eltInventoryEnd > minEnd && eltInventoryStart < maxStart) ||
                (eltInventory.end > minEnd && eltInventory.start < maxStart)) {
                overlappingChunks.unshift(eltInventory);
            }
        }
    }
    return overlappingChunks;
}
