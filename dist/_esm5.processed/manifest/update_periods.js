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
import { MediaError } from "../errors";
import log from "../log";
import arrayFindIndex from "../utils/array_find_index";
import { MANIFEST_UPDATE_TYPE } from "./types";
import updatePeriodInPlace from "./update_period_in_place";
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export function replacePeriods(oldPeriods, newPeriods) {
    var firstUnhandledPeriodIdx = 0;
    for (var i = 0; i < newPeriods.length; i++) {
        var newPeriod = newPeriods[i];
        var j = firstUnhandledPeriodIdx;
        var oldPeriod = oldPeriods[j];
        while (oldPeriod != null && oldPeriod.id !== newPeriod.id) {
            j++;
            oldPeriod = oldPeriods[j];
        }
        if (oldPeriod != null) {
            updatePeriodInPlace(oldPeriod, newPeriod, MANIFEST_UPDATE_TYPE.Full);
            var periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
            var nbrOfPeriodsToRemove = j - firstUnhandledPeriodIdx;
            oldPeriods.splice.apply(oldPeriods, __spreadArrays([firstUnhandledPeriodIdx,
                nbrOfPeriodsToRemove], periodsToInclude));
            firstUnhandledPeriodIdx = i + 1;
        }
    }
    if (firstUnhandledPeriodIdx > oldPeriods.length) {
        log.error("Manifest: error when updating Periods");
        return;
    }
    if (firstUnhandledPeriodIdx < oldPeriods.length) {
        oldPeriods.splice(firstUnhandledPeriodIdx, oldPeriods.length - firstUnhandledPeriodIdx);
    }
    var remainingNewPeriods = newPeriods.slice(firstUnhandledPeriodIdx, newPeriods.length);
    if (remainingNewPeriods.length > 0) {
        oldPeriods.push.apply(oldPeriods, remainingNewPeriods);
    }
}
/**
 * Update old periods by adding new periods and removing
 * not available ones.
 * @param {Array.<Object>} oldPeriods
 * @param {Array.<Object>} newPeriods
 */
export function updatePeriods(oldPeriods, newPeriods) {
    if (oldPeriods.length === 0) {
        oldPeriods.splice.apply(oldPeriods, __spreadArrays([0, oldPeriods.length], newPeriods));
        return;
    }
    if (newPeriods.length === 0) {
        return;
    }
    var oldLastPeriod = oldPeriods[oldPeriods.length - 1];
    if (oldLastPeriod.start < newPeriods[0].start) {
        if (oldLastPeriod.end !== newPeriods[0].start) {
            throw new MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: not enough data");
        }
        oldPeriods.push.apply(oldPeriods, newPeriods);
        return;
    }
    var indexOfNewFirstPeriod = arrayFindIndex(oldPeriods, function (_a) {
        var id = _a.id;
        return id === newPeriods[0].id;
    });
    if (indexOfNewFirstPeriod < 0) {
        throw new MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: incoherent data");
    }
    // The first updated Period can only be a partial part
    updatePeriodInPlace(oldPeriods[indexOfNewFirstPeriod], newPeriods[0], MANIFEST_UPDATE_TYPE.Partial);
    var prevIndexOfNewPeriod = indexOfNewFirstPeriod + 1;
    for (var i = 1; i < newPeriods.length; i++) {
        var newPeriod = newPeriods[i];
        var indexOfNewPeriod = -1;
        for (var j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
            if (newPeriod.id === oldPeriods[j].id) {
                indexOfNewPeriod = j;
                break; // end the loop
            }
        }
        if (indexOfNewPeriod < 0) {
            oldPeriods.splice.apply(oldPeriods, __spreadArrays([prevIndexOfNewPeriod,
                oldPeriods.length - prevIndexOfNewPeriod], newPeriods.slice(i, newPeriods.length)));
            return;
        }
        if (indexOfNewPeriod > prevIndexOfNewPeriod) {
            oldPeriods.splice(prevIndexOfNewPeriod, indexOfNewPeriod - prevIndexOfNewPeriod);
            indexOfNewPeriod = prevIndexOfNewPeriod;
        }
        // Later Periods can be fully replaced
        updatePeriodInPlace(oldPeriods[indexOfNewPeriod], newPeriod, MANIFEST_UPDATE_TYPE.Full);
        prevIndexOfNewPeriod++;
    }
    if (prevIndexOfNewPeriod < oldPeriods.length) {
        oldPeriods.splice(prevIndexOfNewPeriod, oldPeriods.length - prevIndexOfNewPeriod);
    }
}
