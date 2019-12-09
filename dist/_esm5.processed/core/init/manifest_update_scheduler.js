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
import { defer as observableDefer, EMPTY, merge as observableMerge, timer as observableTimer, } from "rxjs";
import { ignoreElements, mergeMap, take, tap, } from "rxjs/operators";
import log from "../../log";
import isNonEmptyString from "../../utils/is_non_empty_string";
/**
 * Refresh the Manifest at the right time.
 * @param {Object} initialManifest
 * @param {Observable} scheduleRefresh$
 * @param {Function} fetchManifest
 * @param {number} minimumManifestUpdateInterval
 * @returns {Observable}
 */
export default function manifestUpdateScheduler(initialManifest, scheduleRefresh$, fetchManifest, minimumManifestUpdateInterval) {
    function handleManifestRefresh$(manifestInfos) {
        var manifest = manifestInfos.manifest, sendingTime = manifestInfos.sendingTime;
        // schedule a Manifest refresh to avoid sending too much request.
        var manualRefresh$ = scheduleRefresh$.pipe(mergeMap(function (delay) {
            var timeSinceLastRefresh = sendingTime == null ?
                0 :
                performance.now() - sendingTime;
            var minInterval = Math.max(minimumManifestUpdateInterval
                - timeSinceLastRefresh, 0);
            return observableTimer(Math.max(delay - timeSinceLastRefresh, minInterval));
        }));
        var autoRefresh$ = (function () {
            if (manifest.lifetime == null || manifest.lifetime <= 0) {
                return EMPTY;
            }
            var timeSinceRequest = sendingTime == null ?
                0 :
                performance.now() - sendingTime;
            var minInterval = Math.max(minimumManifestUpdateInterval
                - timeSinceRequest, 0);
            var updateTimeout = manifest.lifetime * 1000 - timeSinceRequest;
            return observableTimer(Math.max(updateTimeout, minInterval));
        })();
        // Emit when the manifest should be refreshed. Either when:
        //   - A buffer asks for it to be refreshed
        //   - its lifetime expired.
        return observableMerge(autoRefresh$, manualRefresh$)
            .pipe(take(1), mergeMap(function () { return refreshManifest(initialManifest.manifest, fetchManifest); }), mergeMap(handleManifestRefresh$), ignoreElements());
    }
    return observableDefer(function () { return handleManifestRefresh$(initialManifest); });
}
/**
 * Refresh the manifest on subscription.
 * @returns {Observable}
 */
function refreshManifest(manifest, fetchManifest) {
    var refreshURL = manifest.getUrl();
    if (!isNonEmptyString(refreshURL)) {
        log.warn("Init: Cannot refresh the manifest: no url");
        return EMPTY;
    }
    var externalClockOffset = manifest.getClockOffset();
    return fetchManifest(refreshURL, externalClockOffset)
        .pipe(tap(function (_a) {
        var newManifest = _a.manifest;
        manifest.update(newManifest);
    }));
}
