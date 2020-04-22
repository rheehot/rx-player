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
import { defer as observableDefer, EMPTY, from as observableFrom, merge as observableMerge, of as observableOf, timer as observableTimer, } from "rxjs";
import { mapTo, mergeMap, mergeMapTo, take, } from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import isNonEmptyString from "../../utils/is_non_empty_string";
var FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY = config.FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY, MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE = config.MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE, MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE = config.MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler(_a) {
    var fetchManifest = _a.fetchManifest, initialManifest = _a.initialManifest, manifestUpdateUrl = _a.manifestUpdateUrl, minimumManifestUpdateInterval = _a.minimumManifestUpdateInterval, scheduleRefresh$ = _a.scheduleRefresh$;
    // The Manifest always keeps the same Manifest
    var manifest = initialManifest.manifest;
    /** Number of consecutive times the parsing has been done in `unsafeMode`. */
    var consecutiveUnsafeMode = 0;
    function handleManifestRefresh$(manifestInfos) {
        var sendingTime = manifestInfos.sendingTime, parsingTime = manifestInfos.parsingTime, updatingTime = manifestInfos.updatingTime;
        /**
         * Total time taken to fully update the last Manifest.
         * Note: this time also includes possible requests done by the parsers.
         */
        var totalUpdateTime = parsingTime + (updatingTime !== null && updatingTime !== void 0 ? updatingTime : 0);
        // Only perform parsing in `unsafeMode` when the last full parsing took a
        // lot of time and do not go higher than the maximum consecutive time.
        var unsafeModeEnabled = consecutiveUnsafeMode > 0 ?
            consecutiveUnsafeMode < MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE :
            totalUpdateTime >= MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE;
        var internalRefresh$ = scheduleRefresh$
            .pipe(mergeMap(function (_a) {
            var completeRefresh = _a.completeRefresh, delay = _a.delay, canUseUnsafeMode = _a.canUseUnsafeMode;
            var unsafeMode = canUseUnsafeMode && unsafeModeEnabled;
            return startManualRefreshTimer(delay !== null && delay !== void 0 ? delay : 0, minimumManifestUpdateInterval, sendingTime)
                .pipe(mapTo({ completeRefresh: completeRefresh, unsafeMode: unsafeMode }));
        }));
        var timeSinceRequest = sendingTime == null ? 0 :
            performance.now() - sendingTime;
        var minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);
        var autoRefresh$;
        if (manifest.lifetime === undefined || manifest.lifetime < 0) {
            autoRefresh$ = EMPTY;
        }
        else {
            var autoRefreshInterval = manifest.lifetime * 1000 - timeSinceRequest;
            if (manifest.lifetime < 3 && totalUpdateTime >= 100) {
                var defaultDelay = (3 - manifest.lifetime) * 1000 + autoRefreshInterval;
                var newInterval = Math.max(defaultDelay, Math.max(autoRefreshInterval, 0) + totalUpdateTime);
                log.info("MUS: Manifest update rythm is too frequent. Postponing next request.", autoRefreshInterval, newInterval);
                autoRefreshInterval = newInterval;
            }
            else if (totalUpdateTime >= (manifest.lifetime * 1000) / 10) {
                var newInterval = Math.max(autoRefreshInterval, 0) + totalUpdateTime;
                log.info("MUS: Manifest took too long to parse. Postponing next request", autoRefreshInterval, newInterval);
                autoRefreshInterval = newInterval;
            }
            autoRefresh$ = observableTimer(Math.max(autoRefreshInterval, minInterval))
                .pipe(mapTo({ completeRefresh: false, unsafeMode: unsafeModeEnabled }));
        }
        var expired$ = manifest.expired === null ?
            EMPTY :
            observableTimer(minInterval)
                .pipe(mergeMapTo(observableFrom(manifest.expired)), mapTo({ completeRefresh: true, unsafeMode: unsafeModeEnabled }));
        // Emit when the manifest should be refreshed. Either when:
        //   - A buffer asks for it to be refreshed
        //   - its lifetime expired.
        return observableMerge(autoRefresh$, internalRefresh$, expired$).pipe(take(1), mergeMap(function (_a) {
            var completeRefresh = _a.completeRefresh, unsafeMode = _a.unsafeMode;
            return refreshManifest({ completeRefresh: completeRefresh,
                unsafeMode: unsafeMode });
        }), mergeMap(function (evt) {
            if (evt.type === "warning") {
                return observableOf(evt);
            }
            return handleManifestRefresh$(evt);
        }));
    }
    return observableDefer(function () { return handleManifestRefresh$(initialManifest); });
    /**
     * Refresh the Manifest.
     * Perform a full update if a partial update failed.
     * @param {boolean} completeRefresh
     * @returns {Observable}
     */
    function refreshManifest(_a) {
        var completeRefresh = _a.completeRefresh, unsafeMode = _a.unsafeMode;
        var fullRefresh = completeRefresh || manifestUpdateUrl === undefined;
        var refreshURL = fullRefresh ? manifest.getUrl() :
            manifestUpdateUrl;
        if (!isNonEmptyString(refreshURL)) {
            log.warn("Init: Cannot refresh the manifest: no url");
            return EMPTY;
        }
        var externalClockOffset = manifest.clockOffset;
        if (unsafeMode) {
            consecutiveUnsafeMode += 1;
            log.info("Init: Refreshing the Manifest in \"unsafeMode\" for the " +
                String(consecutiveUnsafeMode) + " consecutive time.");
        }
        else if (consecutiveUnsafeMode > 0) {
            log.info("Init: Not parsing the Manifest in \"unsafeMode\" anymore after " +
                String(consecutiveUnsafeMode) + " consecutive times.");
            consecutiveUnsafeMode = 0;
        }
        return fetchManifest(refreshURL, { externalClockOffset: externalClockOffset,
            previousManifest: manifest,
            unsafeMode: unsafeMode })
            .pipe(mergeMap(function (value) {
            if (value.type === "warning") {
                return observableOf(value);
            }
            var newManifest = value.manifest, newSendingTime = value.sendingTime, receivedTime = value.receivedTime, parsingTime = value.parsingTime;
            var updateTimeStart = performance.now();
            if (fullRefresh) {
                manifest.replace(newManifest);
            }
            else {
                try {
                    manifest.update(newManifest);
                }
                catch (e) {
                    var message = e instanceof Error ? e.message :
                        "unknown error";
                    log.warn("MUS: Attempt to update Manifest failed: " + message, "Re-downloading the Manifest fully");
                    return startManualRefreshTimer(FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY, minimumManifestUpdateInterval, newSendingTime)
                        .pipe(mergeMap(function () {
                        return refreshManifest({ completeRefresh: true, unsafeMode: false });
                    }));
                }
            }
            return observableOf({ type: "parsed",
                manifest: manifest,
                sendingTime: newSendingTime,
                receivedTime: receivedTime,
                parsingTime: parsingTime,
                updatingTime: performance.now() - updateTimeStart });
        }));
    }
}
/**
 * Launch a timer Observable which will emit when it is time to refresh the
 * Manifest.
 * The timer's delay is calculated from:
 *   - a target delay (`wantedDelay`), which is the minimum time we want to wait
 *     in the best scenario
 *   - the minimum set possible interval between manifest updates
 *     (`minimumManifestUpdateInterval`)
 *   - the time at which was done the last Manifest refresh
 *     (`lastManifestRequestTime`)
 * @param {number} wantedDelay
 * @param {number} minimumManifestUpdateInterval
 * @param {number|undefined} lastManifestRequestTime
 * @returns {Observable}
 */
function startManualRefreshTimer(wantedDelay, minimumManifestUpdateInterval, lastManifestRequestTime) {
    return observableDefer(function () {
        // The value allows to set a delay relatively to the last Manifest refresh
        // (to avoid asking for it too often).
        var timeSinceLastRefresh = lastManifestRequestTime == null ?
            0 :
            performance.now() - lastManifestRequestTime;
        var _minInterval = Math.max(minimumManifestUpdateInterval - timeSinceLastRefresh, 0);
        return observableTimer(Math.max(wantedDelay - timeSinceLastRefresh, _minInterval));
    });
}
