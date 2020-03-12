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
import arrayFind from "../../utils/array_find";
import takeFirstSet from "../../utils/take_first_set";
/**
 * Filter representations based on their width:
 *   - the highest width considered will be the one linked to the first
 *     representation which has a superior width to the one given.
 * @param {Array.<Object>} representations - The representations array
 * @param {Number} width
 * @returns {Array.<Object>}
 */
export default function filterByWidth(representations, width) {
    var sortedRepsByWidth = representations
        .slice() // clone
        .sort(function (a, b) { return takeFirstSet(a.width, 0) -
        takeFirstSet(b.width, 0); });
    var repWithMaxWidth = arrayFind(sortedRepsByWidth, function (representation) {
        return typeof representation.width === "number" &&
            representation.width >= width;
    });
    if (repWithMaxWidth !== undefined) {
        var maxWidth_1 = typeof repWithMaxWidth.width === "number" ? repWithMaxWidth.width :
            0;
        return representations.filter(function (representation) {
            return typeof representation.width === "number" ? representation.width <= maxWidth_1 :
                true;
        });
    }
    return representations;
}
