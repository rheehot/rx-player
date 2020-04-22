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
import { of as observableOf, throwError as observableThrow, } from "rxjs";
import castToObservable from "../../../utils/cast_to_observable";
import { MediaKeys_, } from "../../browser_compatibility_types";
import { isIE11 } from "../../browser_detection";
import isNode from "../../is_node";
import shouldFavourCustomSafariEME from "../../should_favour_custom_safari_EME";
import CustomMediaKeySystemAccess from "./../custom_key_system_access";
import getIE11MediaKeysCallbacks, { MSMediaKeysConstructor } from "./ie11_media_keys";
import getOldKitWebKitMediaKeyCallbacks, { isOldWebkitMediaElement } from "./old_webkit_media_keys";
import getWebKitMediaKeysCallbacks from "./webkit_media_keys";
import { WebKitMediaKeysConstructor } from "./webkit_media_keys_constructor";
var requestMediaKeySystemAccess = null;
/**
 * Since Safari 12.1, EME APIs are available without webkit prefix.
 * However, it seems that since fairplay CDM implementation within the browser is not
 * standard with EME w3c current spec, the requestMediaKeySystemAccess API doesn't resolve
 * positively, even if the drm (fairplay in most cases) is supported.
 *
 * Therefore, we prefer not to use requestMediaKeySystemAccess on Safari when webkit API
 * is available.
 */
if (isNode ||
    (navigator.requestMediaKeySystemAccess != null && !shouldFavourCustomSafariEME())) {
    requestMediaKeySystemAccess = function (a, b) {
        return castToObservable(navigator.requestMediaKeySystemAccess(a, b));
    };
}
else {
    var isTypeSupported_1 = function (keyType) {
        if (MediaKeys_.isTypeSupported === undefined) {
            throw new Error("No isTypeSupported on MediaKeys.");
        }
        /* tslint:disable no-unsafe-any */
        return MediaKeys_.isTypeSupported(keyType);
        /* tslint:enable no-unsafe-any */
    };
    var createCustomMediaKeys_1 = function (keyType) {
        return new MediaKeys_(keyType);
    };
    // This is for Chrome with unprefixed EME api
    if (isOldWebkitMediaElement(HTMLVideoElement.prototype)) {
        var callbacks = getOldKitWebKitMediaKeyCallbacks();
        isTypeSupported_1 = callbacks.isTypeSupported;
        createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
        // This is for WebKit with prefixed EME api
    }
    else if (WebKitMediaKeysConstructor !== undefined) {
        var callbacks = getWebKitMediaKeysCallbacks();
        /* tslint:disable no-unsafe-any */
        isTypeSupported_1 = callbacks.isTypeSupported;
        /* tslint:enable no-unsafe-any */
        createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
    }
    else if (isIE11 && MSMediaKeysConstructor !== undefined) {
        var callbacks = getIE11MediaKeysCallbacks();
        /* tslint:disable no-unsafe-any */
        isTypeSupported_1 = callbacks.isTypeSupported;
        /* tslint:enable no-unsafe-any */
        createCustomMediaKeys_1 = callbacks.createCustomMediaKeys;
    }
    requestMediaKeySystemAccess = function (keyType, keySystemConfigurations) {
        // TODO Why TS Do not understand that isTypeSupported exists here?
        /* tslint:disable no-unsafe-any */
        if (!isTypeSupported_1(keyType)) {
            /* tslint:enable no-unsafe-any */
            return observableThrow(undefined);
        }
        for (var i = 0; i < keySystemConfigurations.length; i++) {
            var keySystemConfiguration = keySystemConfigurations[i];
            var videoCapabilities = keySystemConfiguration.videoCapabilities, audioCapabilities = keySystemConfiguration.audioCapabilities, initDataTypes = keySystemConfiguration.initDataTypes, distinctiveIdentifier = keySystemConfiguration.distinctiveIdentifier;
            var supported = true;
            supported = supported &&
                (initDataTypes == null ||
                    initDataTypes.some(function (idt) { return idt === "cenc"; }));
            supported = supported && (distinctiveIdentifier !== "required");
            if (supported) {
                var keySystemConfigurationResponse = {
                    videoCapabilities: videoCapabilities,
                    audioCapabilities: audioCapabilities,
                    initDataTypes: ["cenc"],
                    distinctiveIdentifier: "not-allowed",
                    persistentState: "required",
                    sessionTypes: ["temporary", "persistent-license"],
                };
                var customMediaKeys = createCustomMediaKeys_1(keyType);
                return observableOf(new CustomMediaKeySystemAccess(keyType, 
                /* tslint:disable no-unsafe-any */
                customMediaKeys, 
                /* tslint:enable no-unsafe-any */
                keySystemConfigurationResponse));
            }
        }
        return observableThrow(undefined);
    };
}
export { requestMediaKeySystemAccess, };
