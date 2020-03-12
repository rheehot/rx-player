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
import { ignoreElements, mapTo, mergeMap, mergeMapTo, take, } from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import isNonEmptyString from "../../utils/is_non_empty_string";
var FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY = config.FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY;
/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler(_a) {
    var fetchManifest = _a.fetchManifest, initialManifest = _a.initialManifest, manifestUpdateUrl = _a.manifestUpdateUrl, minimumManifestUpdateInterval = _a.minimumManifestUpdateInterval, scheduleRefresh$ = _a.scheduleRefresh$;
    // The Manifest always keeps the same Manifest
    var manifest = initialManifest.manifest;
    function handleManifestRefresh$(manifestInfos) {
        var sendingTime = manifestInfos.sendingTime;
        var internalRefresh$ = scheduleRefresh$
            .pipe(mergeMap(function (_a) {
            var completeRefresh = _a.completeRefresh, delay = _a.delay;
            return startManualRefreshTimer(delay !== null && delay !== void 0 ? delay : 0, minimumManifestUpdateInterval, sendingTime)
                .pipe(mapTo({ completeRefresh: completeRefresh }));
        }));
        var timeSinceRequest = sendingTime == null ? 0 :
            performance.now() - sendingTime;
        var minInterval = Math.max(minimumManifestUpdateInterval - timeSinceRequest, 0);
        var autoRefresh$;
        if (manifest.lifetime === undefined || manifest.lifetime < 0) {
            autoRefresh$ = EMPTY;
        }
        else {
            var parsingTime = manifestInfos.parsingTime, updatingTime = manifestInfos.updatingTime;
            var autoRefreshInterval = manifest.lifetime * 1000 - timeSinceRequest;
            if (parsingTime + (updatingTime !== null && updatingTime !== void 0 ? updatingTime : 0) >= (manifest.lifetime * 1000) / 4) {
                var newInterval = Math.max(autoRefreshInterval, 0)
                    + parsingTime + (updatingTime !== null && updatingTime !== void 0 ? updatingTime : 0);
                log.info("MUS: Manifest took too long to parse. Postponing next request", autoRefreshInterval, newInterval);
                autoRefreshInterval = newInterval;
            }
            autoRefresh$ = observableTimer(Math.max(autoRefreshInterval, minInterval))
                .pipe(mapTo({ completeRefresh: false }));
        }
        var expired$ = manifest.expired === null ?
            EMPTY :
            observableTimer(minInterval)
                .pipe(mergeMapTo(observableFrom(manifest.expired)), mapTo({ completeRefresh: true }));
        // Emit when the manifest should be refreshed. Either when:
        //   - A buffer asks for it to be refreshed
        //   - its lifetime expired.
        return observableMerge(autoRefresh$, internalRefresh$, expired$).pipe(take(1), mergeMap(function (_a) {
            var completeRefresh = _a.completeRefresh;
            return refreshManifest(completeRefresh);
        }), mergeMap(handleManifestRefresh$), ignoreElements());
    }
    return observableDefer(function () { return handleManifestRefresh$(initialManifest); });
    /**
     * Refresh the Manifest.
     * Perform a full update if a partial update failed.
     * @param {boolean} completeRefresh
     * @returns {Observable}
     */
    function refreshManifest(completeRefresh) {
        var fullRefresh = completeRefresh || manifestUpdateUrl === undefined;
        var refreshURL = fullRefresh ? manifest.getUrl() :
            manifestUpdateUrl;
        if (!isNonEmptyString(refreshURL)) {
            log.warn("Init: Cannot refresh the manifest: no url");
            return EMPTY;
        }
        var externalClockOffset = manifest.getClockOffset();
        return fetchManifest(refreshURL, externalClockOffset)
            .pipe(mergeMap(function (value) {
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
                        .pipe(mergeMap(function () { return refreshManifest(true); }));
                }
            }
            return observableOf({ manifest: manifest,
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
