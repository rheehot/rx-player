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
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import flattenOverlappingPeriods from "./flatten_overlapping_periods";
import getPeriodsTimeInformation from "./get_periods_time_infos";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import parseAdaptationSets from "./parse_adaptation_sets";
import resolveBaseURLs from "./resolve_base_urls";
var generatePeriodID = idGenerator();
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} contextInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(periodsIR, contextInfos) {
    var _a, _b;
    var parsedPeriods = [];
    var periodsTimeInformation = getPeriodsTimeInformation(periodsIR, contextInfos);
    if (periodsTimeInformation.length !== periodsIR.length) {
        throw new Error("MPD parsing error: the time information are incoherent.");
    }
    var isDynamic = contextInfos.isDynamic, timeShiftBufferDepth = contextInfos.timeShiftBufferDepth;
    var manifestBoundsCalculator = new ManifestBoundsCalculator({ isDynamic: isDynamic,
        timeShiftBufferDepth: timeShiftBufferDepth });
    if (!isDynamic && contextInfos.duration != null) {
        manifestBoundsCalculator.setLastPosition(contextInfos.duration);
    }
    var _loop_1 = function (i) {
        var periodIR = periodsIR[i];
        var xlinkInfos = contextInfos.xlinkInfos.get(periodIR);
        var periodBaseURLs = resolveBaseURLs(contextInfos.baseURLs, periodIR.children.baseURLs);
        var _a = periodsTimeInformation[i], periodStart = _a.periodStart, periodDuration = _a.periodDuration, periodEnd = _a.periodEnd;
        var periodID;
        if (periodIR.attributes.id == null) {
            log.warn("DASH: No usable id found in the Period. Generating one.");
            periodID = "gen-dash-period-" + generatePeriodID();
        }
        else {
            periodID = periodIR.attributes.id;
        }
        // Avoid duplicate IDs
        while (parsedPeriods.some(function (p) { return p.id === periodID; })) {
            periodID += "-dup";
        }
        var receivedTime = xlinkInfos !== undefined ? xlinkInfos.receivedTime :
            contextInfos.receivedTime;
        var availabilityTimeOffset = extractMinimumAvailabilityTimeOffset(periodIR.children.baseURLs) +
            contextInfos.availabilityTimeOffset;
        var unsafelyBaseOnPreviousPeriod = (_b = (_a = contextInfos
            .unsafelyBaseOnPreviousManifest) === null || _a === void 0 ? void 0 : _a.getPeriod(periodID)) !== null && _b !== void 0 ? _b : null;
        var periodInfos = { aggressiveMode: contextInfos.aggressiveMode,
            availabilityTimeOffset: availabilityTimeOffset,
            baseURLs: periodBaseURLs,
            manifestBoundsCalculator: manifestBoundsCalculator,
            end: periodEnd,
            isDynamic: isDynamic,
            receivedTime: receivedTime,
            start: periodStart,
            timeShiftBufferDepth: timeShiftBufferDepth,
            unsafelyBaseOnPreviousPeriod: unsafelyBaseOnPreviousPeriod };
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
                    var guessedLastPositionFromClock = guessLastPositionFromClock(contextInfos, periodStart);
                    if (guessedLastPositionFromClock !== undefined) {
                        var guessedLastPosition = guessedLastPositionFromClock[0], guessedPositionTime = guessedLastPositionFromClock[1];
                        manifestBoundsCalculator.setLastPosition(guessedLastPosition, guessedPositionTime);
                    }
                }
            }
        }
    };
    // We parse it in reverse because we might need to deduce the buffer depth from
    // the last Periods' indexes
    for (var i = periodsIR.length - 1; i >= 0; i--) {
        _loop_1(i);
    }
    if (contextInfos.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
        // Guess a last time the last position
        var guessedLastPositionFromClock = guessLastPositionFromClock(contextInfos, 0);
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
 * "current" one in multi-periods contents. By giving the Period's start as a
 * `minimumTime`, you ensure that you will get a value only if the current time
 * is in that period.
 *
 * This is useful as guessing the live time from the clock can be seen as a last
 * resort. By detecting that the current time is before the currently considered
 * Period, we can just parse and look at the previous Period. If we can guess
 * the live time more directly from that previous one, we might be better off
 * than just using the clock.
 *
 * @param {Object} contextInfos
 * @param {number} minimumTime
 * @returns {Array.<number|undefined>}
 */
function guessLastPositionFromClock(contextInfos, minimumTime) {
    if (contextInfos.clockOffset != null) {
        var lastPosition = contextInfos.clockOffset / 1000 -
            contextInfos.availabilityStartTime;
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
            var lastPosition = now - contextInfos.availabilityStartTime;
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
