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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import log from "../log";
import updatePeriodInPlace from "./update_period_in_place";
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export default function updatePeriods(oldPeriods, newPeriods) {
    var firstUnhandledPeriodIdx = 0;
    // Example :
    //
    // old periods : [p0] [p2] [pX] [pF]
    // new periods : [p1] [p2] [pM] [pX] [pU]
    //
    // The `for` loop will remove old periods and replace new ones
    // between the common periods between the two, in the old periods array.
    //
    // - Step 1 : Handle common period p2
    //    - the p0 is removed the p2
    //    - the p1 is added before the p2
    //
    //                   First unhandled period index
    //                             |
    //                             v
    //    old periods : [p1] [p2] [pX] [pF]
    //    new periods : [p1] [p2] [pM] [pX] [pU]
    //
    // - Step 2 : Handle common period pX
    //    - the pM is added before the pX
    //
    //                              First unhandled period index
    //                                        |
    //                                        v
    // old periods : [p1]  [p2]  [pM]  [pX]  [pF]
    // new periods : [p1]  [p2]  [pM]  [pX]  [pU]
    for (var i = 0; i < newPeriods.length; i++) {
        var newPeriod = newPeriods[i];
        var j = firstUnhandledPeriodIdx;
        var oldPeriod = oldPeriods[j];
        while (oldPeriod != null && oldPeriod.id !== newPeriod.id) {
            j++;
            oldPeriod = oldPeriods[j];
        }
        if (oldPeriod != null) {
            updatePeriodInPlace(oldPeriod, newPeriod);
            var periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
            oldPeriods.splice.apply(oldPeriods, __spreadArrays([j, 0], periodsToInclude));
            firstUnhandledPeriodIdx = i + 1;
        }
    }
    if (firstUnhandledPeriodIdx > oldPeriods.length) {
        log.error("Manifest: error when updating Periods");
        return;
    }
    // At this point, the first unhandled period index refers to the first
    // position from which :
    // - there are only undesired periods in old periods array.
    // - there only new wanted periods in new periods array.
    //
    //                              First unhandled period index
    //                                        |
    //                                        v
    // old periods : [p1]  [p2]  [pM]  [pX]  [pF (undesired)]
    // new periods : [p1]  [p2]  [pM]  [pX]  [pU (wanted)]
    //
    // final array (old periods array) : [p1]  [p2]  [pM]  [pX]  [pU]
    if (firstUnhandledPeriodIdx < oldPeriods.length) {
        oldPeriods.splice(firstUnhandledPeriodIdx, oldPeriods.length - firstUnhandledPeriodIdx);
    }
    var remainingNewPeriods = newPeriods.slice(firstUnhandledPeriodIdx, newPeriods.length);
    if (remainingNewPeriods.length > 0) {
        oldPeriods.push.apply(oldPeriods, remainingNewPeriods);
    }
}
