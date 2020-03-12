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
 * This file helps to keep track of the currently active Periods.
 * That is, Periods for which at least a single Buffer is currently active.
 *
 * It also keep track of the currently active period:
 * The first chronological period for which all types of buffers are active.
 */
import { merge as observableMerge } from "rxjs";
import { distinctUntilChanged, filter, map, scan, } from "rxjs/operators";
/**
 * Emit the active Period each times it changes.
 *
 * The active Period is the first Period (in chronological order) which has
 * a RepresentationBuffer associated for every defined BUFFER_TYPES.
 *
 * Emit null if no Period can be considered active currently.
 *
 * @example
 * For 4 BUFFER_TYPES: "AUDIO", "VIDEO", "TEXT" and "IMAGE":
 * ```
 *                     +-------------+
 *         Period 1    | Period 2    | Period 3
 * AUDIO   |=========| | |===      | |
 * VIDEO               | |=====    | |
 * TEXT    |(NO TEXT)| | |(NO TEXT)| | |====    |
 * IMAGE   |=========| | |=        | |
 *                     +-------------+
 *
 * The active Period here is Period 2 as Period 1 has no video
 * RepresentationBuffer.
 *
 * If we are missing a or multiple PeriodBuffers in the first chronological
 * Period, like that is the case here, it generally means that we are
 * currently switching between Periods.
 *
 * For here we are surely switching from Period 1 to Period 2 beginning by the
 * video PeriodBuffer. As every PeriodBuffer is ready for Period 2, we can
 * already inform that it is the current Period.
 * ```
 *
 * @param {Array.<string>} bufferTypes - Every buffer types in the content.
 * @param {Observable} addPeriodBuffer$ - Emit PeriodBuffer information when
 * one is added.
 * @param {Observable} removePeriodBuffer$ - Emit PeriodBuffer information when
 * one is removed.
 * @returns {Observable}
 */
export default function ActivePeriodEmitter(buffers$) {
    var numberOfBuffers = buffers$.length;
    return observableMerge.apply(void 0, buffers$).pipe(
    // not needed to filter, this is an optim
    filter(function (_a) {
        var type = _a.type;
        return type === "periodBufferCleared" ||
            type === "adaptationChange" ||
            type === "representationChange";
    }), scan(function (acc, evt) {
        switch (evt.type) {
            case "periodBufferCleared":
                {
                    var _a = evt.value, period = _a.period, type = _a.type;
                    var currentInfos = acc[period.id];
                    if (currentInfos != null && currentInfos.buffers.has(type)) {
                        currentInfos.buffers.delete(type);
                        if (currentInfos.buffers.size === 0) {
                            delete acc[period.id];
                        }
                    }
                }
                break;
            case "adaptationChange": {
                // `adaptationChange` with a null Adaptation will not lead to a
                // `representationChange` event
                if (evt.value.adaptation != null) {
                    return acc;
                }
            }
            case "representationChange":
                {
                    var _b = evt.value, period = _b.period, type = _b.type;
                    var currentInfos = acc[period.id];
                    if (currentInfos != null && !currentInfos.buffers.has(type)) {
                        currentInfos.buffers.add(type);
                    }
                    else {
                        var bufferSet = new Set();
                        bufferSet.add(type);
                        acc[period.id] = { period: period, buffers: bufferSet };
                    }
                }
                break;
        }
        return acc;
    }, {}), map(function (list) {
        var activePeriodIDs = Object.keys(list);
        var completePeriods = [];
        for (var i = 0; i < activePeriodIDs.length; i++) {
            var periodInfos = list[activePeriodIDs[i]];
            if (periodInfos != null && periodInfos.buffers.size === numberOfBuffers) {
                completePeriods.push(periodInfos.period);
            }
        }
        return completePeriods.reduce(function (acc, period) {
            if (acc == null) {
                return period;
            }
            return period.start < acc.start ? period :
                acc;
        }, null);
    }), distinctUntilChanged(function (a, b) {
        return a == null && b == null ||
            a != null && b != null && a.id === b.id;
    }));
}
