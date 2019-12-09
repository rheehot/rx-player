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
import flatMap from "../../../utils/flat_map";
import idGenerator from "../../../utils/id_generator";
import objectValues from "../../../utils/object_values";
import resolveURL from "../../../utils/resolve_url";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformation from "./get_periods_time_infos";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import parseAdaptationSets from "./parse_adaptation_sets";
var generatePeriodID = idGenerator();
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(periodsIR, manifestInfos) {
    var _a, _b;
    var parsedPeriods = [];
    var periodsTimeInformation = getPeriodsTimeInformation(periodsIR, manifestInfos);
    if (periodsTimeInformation.length !== periodsIR.length) {
        throw new Error("MPD parsing error: the time information are incoherent.");
    }
    // We might to communicate the depth of the Buffer while parsing
    var isDynamic = manifestInfos.isDynamic, timeShiftBufferDepth = manifestInfos.timeShiftBufferDepth;
    var manifestBoundsCalculator = new ManifestBoundsCalculator({ isDynamic: isDynamic,
        timeShiftBufferDepth: timeShiftBufferDepth });
    if (!isDynamic && manifestInfos.duration != null) {
        manifestBoundsCalculator.setLastPosition(manifestInfos.duration);
    }
    // We parse it in reverse because we might need to deduce the buffer depth from
    // the last Periods' indexes
    for (var i = periodsIR.length - 1; i >= 0; i--) {
        var periodIR = periodsIR[i];
        var xlinkInfos = manifestInfos.xlinkInfos.get(periodIR);
        var periodBaseURL = resolveURL(manifestInfos.baseURL, periodIR.children.baseURL !== undefined ?
            periodIR.children.baseURL.value : "");
        var _c = periodsTimeInformation[i], periodStart = _c.periodStart, periodDuration = _c.periodDuration, periodEnd = _c.periodEnd;
        var periodID = void 0;
        if (periodIR.attributes.id == null) {
            log.warn("DASH: No usable id found in the Period. Generating one.");
            periodID = "gen-dash-period-" + generatePeriodID();
        }
        else {
            periodID = periodIR.attributes.id;
        }
        var receivedTime = xlinkInfos !== undefined ? xlinkInfos.receivedTime :
            manifestInfos.receivedTime;
        var availabilityTimeOffset = (_b = (_a = periodIR.children.baseURL) === null || _a === void 0 ? void 0 : _a.attributes.availabilityTimeOffset, (_b !== null && _b !== void 0 ? _b : 0)) +
            manifestInfos.availabilityTimeOffset;
        var periodInfos = { aggressiveMode: manifestInfos.aggressiveMode,
            availabilityTimeOffset: availabilityTimeOffset,
            baseURL: periodBaseURL,
            manifestBoundsCalculator: manifestBoundsCalculator,
            end: periodEnd,
            isDynamic: isDynamic,
            receivedTime: receivedTime,
            start: periodStart,
            timeShiftBufferDepth: timeShiftBufferDepth };
        var adaptations = parseAdaptationSets(periodIR.children.adaptations, periodInfos);
        var parsedPeriod = { id: periodID,
            start: periodStart,
            end: periodEnd,
            duration: periodDuration,
            adaptations: adaptations };
        parsedPeriods.unshift(parsedPeriod);
        if (!manifestBoundsCalculator.lastPositionIsKnown()) {
            var lastPosition = getMaximumLastPosition(adaptations);
            if (!isDynamic) {
                if (typeof lastPosition === "number") {
                    manifestBoundsCalculator.setLastPosition(lastPosition);
                }
            }
            else {
                if (typeof lastPosition === "number") {
                    var positionTime = performance.now() / 1000;
                    manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
                }
                else {
                    var guessedLastPositionFromClock = guessLastPositionFromClock(manifestInfos, periodStart);
                    if (guessedLastPositionFromClock !== undefined) {
                        var guessedLastPosition = guessedLastPositionFromClock[0], guessedPositionTime = guessedLastPositionFromClock[1];
                        manifestBoundsCalculator.setLastPosition(guessedLastPosition, guessedPositionTime);
                    }
                }
            }
        }
    }
    if (manifestInfos.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
        // Guess a last time the last position
        var guessedLastPositionFromClock = guessLastPositionFromClock(manifestInfos, 0);
        if (guessedLastPositionFromClock !== undefined) {
            var lastPosition = guessedLastPositionFromClock[0], positionTime = guessedLastPositionFromClock[1];
            manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
        }
    }
    return flattenOverlappingPeriods(parsedPeriods);
}
/**
 * Try to guess the "last position", which is the last position
 * available in the manifest in seconds, and the "position time", the time
 * (`performance.now()`) in which the last position was collected.
 *
 * These values allows to retrieve at any time in the future the new last
 * position, by substracting the position time to the last position, and
 * adding to it the new value returned by `performance.now`.
 *
 * The last position and position time are returned by this function if and only if
 * it would indicate a last position superior to the `minimumTime` given.
 *
 * This last part allows for example to detect which Period is likely to be the
 * "live" one in multi-periods contents. By giving the Period's start as a
 * `minimumTime`, you ensure that you will get a value only if the live time is
 * in that period.
 *
 * This is useful as guessing the live time from the clock can be seen as a last
 * resort. By detecting that the live time is before the currently considered
 * Period, we can just parse and look at the previous Period. If we can guess
 * the live time more directly from that previous one, we might be better off
 * than just using the clock.
 *
 * @param {Object} manifestInfos
 * @param {number} minimumTime
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(manifestInfos, minimumTime) {
    if (manifestInfos.clockOffset != null) {
        var lastPosition = manifestInfos.clockOffset / 1000 -
            manifestInfos.availabilityStartTime;
        var positionTime = performance.now() / 1000;
        var timeInSec = positionTime + lastPosition;
        if (timeInSec >= minimumTime) {
            return [timeInSec, positionTime];
        }
    }
    else {
        var now = Date.now() / 1000;
        if (now >= minimumTime) {
            log.warn("DASH Parser: no clock synchronization mechanism found." +
                " Using the system clock instead.");
            var lastPosition = now - manifestInfos.availabilityStartTime;
            var positionTime = performance.now() / 1000;
            return [lastPosition, positionTime];
        }
    }
    return undefined;
}
/**
 * Try to extract the last position declared for any segments in a Period:
 *   - If at least a single index' last position is defined, take the maximum
 *     among them.
 *   - If segments are available but we cannot define the last position
 *     return undefined.
 *   - If no segment are available in that period, return null
 * @param {Object} adaptationsPerType
 * @returns {number|null|undefined}
 */
function getMaximumLastPosition(adaptationsPerType) {
    var maxEncounteredPosition = null;
    var allIndexAreEmpty = true;
    var adaptationsVal = objectValues(adaptationsPerType)
        .filter(function (ada) { return ada != null; });
    var allAdaptations = flatMap(adaptationsVal, function (adaptationsForType) { return adaptationsForType; });
    for (var adapIndex = 0; adapIndex < allAdaptations.length; adapIndex++) {
        var representations = allAdaptations[adapIndex].representations;
        for (var repIndex = 0; repIndex < representations.length; repIndex++) {
            var representation = representations[repIndex];
            var position = representation.index.getLastPosition();
            if (position !== null) {
                allIndexAreEmpty = false;
                if (typeof position === "number") {
                    maxEncounteredPosition =
                        maxEncounteredPosition == null ? position :
                            Math.max(maxEncounteredPosition, position);
                }
            }
        }
    }
    if (maxEncounteredPosition != null) {
        return maxEncounteredPosition;
    }
    else if (allIndexAreEmpty) {
        return null;
    }
    return undefined;
}
