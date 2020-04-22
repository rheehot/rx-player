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
import log from "../../../log";
/**
 * Returns the buffered ranges which hold the given content.
 * Returns the whole buffered ranges if some of it is unknown.
 * @param {Object} queuedSourceBuffer
 * @param {Array.<Object>} contents
 * @returns {Array.<Object>}
 */
export default function getBlacklistedRanges(queuedSourceBuffer, contents) {
    queuedSourceBuffer.synchronizeInventory();
    var accumulator = [];
    var inventory = queuedSourceBuffer.getInventory();
    var _loop_1 = function (i) {
        var chunk = inventory[i];
        var hasContent = contents.some(function (content) {
            return chunk.infos.period.id === content.period.id &&
                chunk.infos.adaptation.id === content.adaptation.id &&
                chunk.infos.representation.id === content.representation.id;
        });
        if (hasContent) {
            var bufferedStart = chunk.bufferedStart, bufferedEnd = chunk.bufferedEnd;
            if (bufferedStart === undefined || bufferedEnd === undefined) {
                log.warn("BO: No buffered start or end found from a segment.");
                var buffered = queuedSourceBuffer.getBufferedRanges();
                var len = buffered.length;
                if (len === 0) {
                    return { value: [] };
                }
                return { value: [{ start: buffered.start(0), end: buffered.end(len - 1) }] };
            }
            var previousLastElement = accumulator[accumulator.length - 1];
            if (previousLastElement !== undefined &&
                previousLastElement.end === bufferedStart) {
                previousLastElement.end = bufferedEnd;
            }
            else {
                accumulator.push({ start: bufferedStart, end: bufferedEnd });
            }
        }
    };
    for (var i = 0; i < inventory.length; i++) {
        var state_1 = _loop_1(i);
        if (typeof state_1 === "object")
            return state_1.value;
    }
    return accumulator;
}
