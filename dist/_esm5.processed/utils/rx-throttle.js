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
import { Observable, } from "rxjs";
export default function throttle(func) {
    var isPending = false;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return new Observable(function (obs) {
            if (isPending) {
                obs.complete();
                return undefined;
            }
            isPending = true;
            var funcSubscription = func.apply(void 0, args).subscribe(function (i) { obs.next(i); }, function (e) {
                isPending = false;
                obs.error(e);
            }, function () {
                isPending = false;
                obs.complete();
            });
            return function () {
                funcSubscription.unsubscribe();
                isPending = false;
            };
        });
    };
}
