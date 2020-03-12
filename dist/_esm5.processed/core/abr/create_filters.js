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
import { combineLatest as observableCombineLatest, of as observableOf, } from "rxjs";
import { map } from "rxjs/operators";
import objectAssign from "../../utils/object_assign";
/**
 * Create Observable that merge several throttling Observables into one.
 * @param {Observable} limitWidth$ - Emit the width at which the chosen
 * Representation should be limited.
 * @param {Observable} throttleBitrate$ - Emit the maximum bitrate authorized.
 * @param {Observable} throttle$ - Also emit the maximum bitrate authorized.
 * Here for legacy reasons.
 * @returns {Observable}
 */
export default function createFilters(limitWidth$, throttleBitrate$, throttle$) {
    var deviceEventsArray = [];
    if (limitWidth$ != null) {
        deviceEventsArray.push(limitWidth$.pipe(map(function (width) { return ({ width: width }); })));
    }
    if (throttle$ != null) {
        deviceEventsArray.push(throttle$.pipe(map(function (bitrate) { return ({ bitrate: bitrate }); })));
    }
    if (throttleBitrate$ != null) {
        deviceEventsArray.push(throttleBitrate$.pipe(map(function (bitrate) { return ({ bitrate: bitrate }); })));
    }
    // Emit restrictions on the pools of available representations to choose
    // from.
    return deviceEventsArray.length > 0 ?
        observableCombineLatest(deviceEventsArray)
            .pipe(map(function (args) {
            return objectAssign.apply(void 0, __spreadArrays([{}], args));
        })) :
        observableOf({});
}
