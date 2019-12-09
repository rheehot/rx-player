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
import { defer as observableDefer, interval as observableInterval, Observable, } from "rxjs";
import { distinctUntilChanged, map, startWith, } from "rxjs/operators";
import log from "../log";
var _ResizeObserver = window.ResizeObserver;
/* tslint:enable no-unsafe-any */
/**
 * Emit the current height and width of the given `element` on subscribtion
 * and each time it changes.
 *
 * On some browsers, we might not be able to rely on a native API to know when
 * it changes, the `interval` argument allow us to provide us an inverval in
 * milliseconds at which we should query that element's size.
 * @param {HTMLElement} element
 * @param {number} interval
 * @returns {Observable}
 */
export default function onHeightWidthChange(element, interval) {
    return observableDefer(function () {
        if (_ResizeObserver !== undefined) {
            var lastHeight_1 = -1;
            var lastWidth_1 = -1;
            return new Observable(function (obs) {
                var resizeObserver = new _ResizeObserver(function (entries) {
                    if (entries.length === 0) {
                        log.error("Compat: Resized but no observed element.");
                        return;
                    }
                    var entry = entries[0];
                    var _a = entry.contentRect, height = _a.height, width = _a.width;
                    if (height !== lastHeight_1 || width !== lastWidth_1) {
                        lastHeight_1 = height;
                        lastWidth_1 = width;
                        obs.next({ height: height, width: width });
                    }
                });
                resizeObserver.observe(element);
                return function () {
                    resizeObserver.disconnect();
                };
            });
        }
        return observableInterval(interval).pipe(startWith(null), map(function () {
            var _a = element.getBoundingClientRect(), height = _a.height, width = _a.width;
            return { height: height, width: width };
        }), distinctUntilChanged(function (o, n) {
            return o.height === n.height && o.width === n.width;
        }));
    });
}
