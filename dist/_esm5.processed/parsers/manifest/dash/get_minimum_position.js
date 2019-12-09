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
import getFirstPositionFromAdaptation from "./get_first_time_from_adaptation";
/**
 * @param {Object} manifest
 * @returns {number | undefined}
 */
export default function getMinimumPosition(manifest) {
    for (var i = 0; i <= manifest.periods.length - 1; i++) {
        var periodAdaptations = manifest.periods[i].adaptations;
        var firstAudioAdaptationFromPeriod = periodAdaptations.audio == null ?
            undefined :
            periodAdaptations.audio[0];
        var firstVideoAdaptationFromPeriod = periodAdaptations.video == null ?
            undefined :
            periodAdaptations.video[0];
        if (firstAudioAdaptationFromPeriod != null ||
            firstVideoAdaptationFromPeriod != null) {
            // null == no segment
            var minimumAudioPosition = null;
            var minimumVideoPosition = null;
            if (firstAudioAdaptationFromPeriod != null) {
                var firstPosition = getFirstPositionFromAdaptation(firstAudioAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumAudioPosition = firstPosition;
            }
            if (firstVideoAdaptationFromPeriod != null) {
                var firstPosition = getFirstPositionFromAdaptation(firstVideoAdaptationFromPeriod);
                if (firstPosition === undefined) {
                    return undefined;
                }
                minimumVideoPosition = firstPosition;
            }
            if ((firstAudioAdaptationFromPeriod != null && minimumAudioPosition === null) ||
                (firstVideoAdaptationFromPeriod != null && minimumVideoPosition === null)) {
                log.info("DASH Parser: found Period with no segment. ", "Going to next one to calculate first position");
                return undefined;
            }
            if (minimumVideoPosition != null) {
                if (minimumAudioPosition != null) {
                    return Math.max(minimumAudioPosition, minimumVideoPosition);
                }
                return minimumVideoPosition;
            }
            if (minimumAudioPosition != null) {
                return minimumAudioPosition;
            }
        }
    }
}
