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
 * Get addition of period availability time offset and representation
 * availability time offset
 * @param {number} adaptationAvailabilityTimeOffset
 * @param {Object}
 * @returns {number}
 */
function getRepAvailabilityTimeOffset(adaptationAvailabilityTimeOffset, baseURL, availabilityTimeOffset) {
    var _a, _b;
    var fromRepBaseURL = (_b = (_a = baseURL) === null || _a === void 0 ? void 0 : _a.attributes.availabilityTimeOffset, (_b !== null && _b !== void 0 ? _b : 0));
    var fromRepIndex = (availabilityTimeOffset !== null && availabilityTimeOffset !== void 0 ? availabilityTimeOffset : 0);
    return adaptationAvailabilityTimeOffset +
        fromRepBaseURL +
        fromRepIndex;
}
export default getRepAvailabilityTimeOffset;
