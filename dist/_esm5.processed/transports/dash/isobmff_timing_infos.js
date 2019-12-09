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
import { getDurationFromTrun, getTrackFragmentDecodeTime, } from "../../parsers/containers/isobmff";
/**
 * Get precize start and duration of a chunk.
 * @param {UInt8Array} buffer - An ISOBMFF container (at least a `moof` + a
 * `mdat` box.
 * @param {Boolean} isChunked - If true, the whole segment was chunked into
 * multiple parts and buffer is one of them. If false, buffer is the whole
 * segment.
 * @param {Object} segment
 * @param {Array.<Object>|undefined} sidxSegments - Segments from sidx. Here
 * pre-parsed for performance reasons as it is usually available when
 * this function is called.
 * @param {Object|undefined} initInfos
 * @returns {Object}
 */
function getISOBMFFTimingInfos(buffer, isChunked, segment, initInfos) {
    var startTime;
    var duration;
    var trunDuration = getDurationFromTrun(buffer);
    var timescale = initInfos !== undefined ? initInfos.timescale :
        segment.timescale;
    var baseDecodeTime = getTrackFragmentDecodeTime(buffer);
    if (isChunked) { // when chunked, no mean to know the duration for now
        if (initInfos == null) {
            return null;
        }
        if (baseDecodeTime < 0) {
            return null;
        }
        return { time: baseDecodeTime,
            duration: trunDuration >= 0 ? trunDuration :
                undefined,
            timescale: initInfos.timescale };
    }
    // we could always make a mistake when reading a container.
    // If the estimate is too far from what the segment seems to imply, take
    // the segment infos instead.
    var maxDecodeTimeDelta;
    // Scaled start time and duration as announced in the segment data
    var segmentDuration;
    if (timescale === segment.timescale) {
        maxDecodeTimeDelta = Math.min(timescale * 0.9, segment.duration != null ? segment.duration / 4 :
            0.25);
        segmentDuration = segment.duration;
    }
    else {
        maxDecodeTimeDelta =
            Math.min(timescale * 0.9, segment.duration != null ?
                ((segment.duration / segment.timescale) * timescale) / 4 :
                0.25);
        segmentDuration = segment.duration != null ?
            (segment.duration / segment.timescale) * timescale :
            undefined;
    }
    if (baseDecodeTime >= 0) {
        startTime = segment.timestampOffset != null ?
            baseDecodeTime + (segment.timestampOffset * timescale) :
            baseDecodeTime;
    }
    else {
        return null;
    }
    if (trunDuration >= 0 &&
        (segmentDuration == null ||
            Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta)) {
        duration = trunDuration;
    }
    return { timescale: timescale, time: startTime, duration: duration };
}
export default getISOBMFFTimingInfos;
