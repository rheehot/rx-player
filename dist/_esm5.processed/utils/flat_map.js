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
/**
 * Map each element using a mapping function, then flat the result into
 * a new array.
 * @param {Array.<*>} originalArray
 * @param {Function} fn
 */
export default function flatMap(originalArray, fn) {
    /* tslint:disable no-unbound-method */
    if (typeof Array.prototype.flatMap === "function") {
        /* tslint:enable no-unbound-method */
        /* tslint:disable no-unsafe-any */
        return originalArray.flatMap(fn);
        /* tslint:enable no-unsafe-any */
    }
    return originalArray.reduce(function (acc, arg) {
        var r = fn(arg);
        if (Array.isArray(r)) {
            return __spreadArrays(acc, r);
        }
        return __spreadArrays(acc, [r]);
    }, []);
}
