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
import { of as observableOf, } from "rxjs";
import { catchError, map, mergeMap, } from "rxjs/operators";
import { EncryptedMediaError, } from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import tryCatch from "../../utils/rx-try_catch";
import getMediaKeySystemAccess from "./find_key_system";
import MediaKeysInfosStore from "./media_keys_infos_store";
import SessionsStore from "./utils/open_sessions_store";
import PersistedSessionsStore from "./utils/persisted_session_store";
/**
 * @throws {EncryptedMediaError}
 * @param {Object} keySystemOptions
 * @returns {Object|null}
 */
function createSessionStorage(keySystemOptions) {
    if (keySystemOptions.persistentLicense !== true) {
        return null;
    }
    var licenseStorage = keySystemOptions.licenseStorage;
    if (licenseStorage == null) {
        throw new EncryptedMediaError("INVALID_KEY_SYSTEM", "No license storage found for persistent license.");
    }
    log.info("EME: Set the given license storage");
    return new PersistedSessionsStore(licenseStorage);
}
/**
 * @param {HTMLMediaElement} mediaElement
 * @param {Array.<Object>} keySystemsConfigs
 * @returns {Observable}
 */
export default function getMediaKeysInfos(mediaElement, keySystemsConfigs) {
    return getMediaKeySystemAccess(mediaElement, keySystemsConfigs).pipe(mergeMap(function (evt) {
        var _a = evt.value, options = _a.options, mediaKeySystemAccess = _a.mediaKeySystemAccess;
        var currentState = MediaKeysInfosStore.getState(mediaElement);
        var sessionStorage = createSessionStorage(options);
        if (currentState != null && evt.type === "reuse-media-key-system-access") {
            var mediaKeys = currentState.mediaKeys, sessionsStore = currentState.sessionsStore;
            return observableOf({ mediaKeys: mediaKeys,
                sessionsStore: sessionsStore,
                mediaKeySystemAccess: mediaKeySystemAccess,
                keySystemOptions: options,
                sessionStorage: sessionStorage });
        }
        log.debug("EME: Calling createMediaKeys on the MediaKeySystemAccess");
        return tryCatch(function () { return castToObservable(mediaKeySystemAccess.createMediaKeys()); }, undefined).pipe(catchError(function (error) {
            var message = error instanceof Error ?
                error.message :
                "Unknown error when creating MediaKeys.";
            throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
        }), map(function (mediaKeys) { return ({ mediaKeys: mediaKeys,
            sessionsStore: new SessionsStore(mediaKeys),
            mediaKeySystemAccess: mediaKeySystemAccess,
            keySystemOptions: options,
            sessionStorage: sessionStorage }); }));
    }));
}
