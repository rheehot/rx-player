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
import config from "../../../config";
import { convertToRanges, excludeFromRanges, isTimeInRange, isTimeInRanges, keepRangeIntersection, } from "../../../utils/ranges";
var ADAPTATION_SWITCH_BUFFER_PADDINGS = config.ADAPTATION_SWITCH_BUFFER_PADDINGS;
/**
 * Find out what to do when switching adaptation, based on the current
 * situation.
 * @param {Object} queuedSourceBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @param {Object} clockTick
 * @returns {Object}
 */
export default function getAdaptationSwitchStrategy(queuedSourceBuffer, period, adaptation, clockTick) {
    var buffered = queuedSourceBuffer.getBufferedRanges();
    if (buffered.length === 0) {
        return { type: "continue", value: undefined };
    }
    var bufferedRanges = convertToRanges(buffered);
    var start = period.start;
    var end = period.end == null ? Infinity :
        period.end;
    var intersection = keepRangeIntersection(bufferedRanges, [{ start: start, end: end }]);
    if (intersection.length === 0) {
        return { type: "continue", value: undefined };
    }
    // remove from that intersection what we know to be the right Adaptation
    var adaptationInBuffer = getBufferedRangesFromAdaptation(queuedSourceBuffer, period, adaptation);
    var currentTime = clockTick.currentTime;
    if (adaptation.type === "video" &&
        clockTick.readyState > 1 &&
        isTimeInRange({ start: start, end: end }, currentTime) &&
        (isTimeInRanges(bufferedRanges, currentTime) &&
            !isTimeInRanges(adaptationInBuffer, currentTime))) {
        return { type: "needs-reload", value: undefined };
    }
    var unwantedData = excludeFromRanges(intersection, adaptationInBuffer);
    var bufferType = adaptation.type;
    var paddingBefore = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].before;
    if (paddingBefore == null) {
        paddingBefore = 0;
    }
    var paddingAfter = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].after;
    if (paddingAfter == null) {
        paddingAfter = 0;
    }
    var toRemove = excludeFromRanges(unwantedData, [{
            start: Math.max(currentTime - paddingBefore, start),
            end: Math.min(currentTime + paddingAfter, end),
        }]);
    return toRemove.length > 0 ? { type: "clean-buffer", value: toRemove } :
        { type: "continue", value: undefined };
}
/**
 * Returns buffered ranges of what we know correspond to the given `adaptation`
 * in the SourceBuffer.
 * @param {Object} queuedSourceBuffer
 * @param {Object} period
 * @param {Object} adaptation
 * @returns {Array.<Object>}
 */
function getBufferedRangesFromAdaptation(queuedSourceBuffer, period, adaptation) {
    queuedSourceBuffer.synchronizeInventory();
    return queuedSourceBuffer.getInventory()
        .reduce(function (acc, chunk) {
        if (chunk.infos.period.id !== period.id ||
            chunk.infos.adaptation.id !== adaptation.id) {
            return acc;
        }
        var bufferedStart = chunk.bufferedStart, bufferedEnd = chunk.bufferedEnd;
        if (bufferedStart === undefined || bufferedEnd === undefined) {
            return acc;
        }
        acc.push({ start: bufferedStart, end: bufferedEnd });
        return acc;
    }, []);
}
