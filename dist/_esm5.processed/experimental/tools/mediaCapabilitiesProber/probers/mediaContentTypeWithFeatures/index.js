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
import PPromise from "../../../../../utils/promise";
import { ProberStatus, } from "../../types";
import formatConfig from "./format";
/**
 * @returns {Promise}
 */
function isTypeSupportedWithFeaturesAPIAvailable() {
    return new PPromise(function (resolve) {
        if (!("MSMediaKeys" in window)) {
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "MSMediaKeys API not available");
        }
        /* tslint:disable no-unsafe-any */
        if (!("isTypeSupportedWithFeatures" in window.MSMediaKeys)) {
            /* tslint:enable no-unsafe-any */
            throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                "isTypeSupportedWithFeatures not available");
        }
        resolve();
    });
}
/**
 * @param {Object} config
 * @returns {Promise}
 */
export default function probeTypeWithFeatures(config) {
    return isTypeSupportedWithFeaturesAPIAvailable().then(function () {
        var keySystem = config.keySystem;
        var type = (function () {
            if (keySystem === undefined ||
                keySystem.type === undefined ||
                keySystem.type.length === 0) {
                return "org.w3.clearkey";
            }
            return keySystem.type;
        })();
        var features = formatConfig(config);
        var result = 
        /* tslint:disable no-unsafe-any */
        window.MSMediaKeys.isTypeSupportedWithFeatures(type, features);
        /* tslint:enable no-unsafe-any */
        function formatSupport(support) {
            if (support === "") {
                throw new Error("MediaCapabilitiesProber >>> API_CALL: " +
                    "Bad arguments for calling isTypeSupportedWithFeatures");
            }
            else {
                switch (support) {
                    case "Not Supported":
                        return [ProberStatus.NotSupported];
                    case "Maybe":
                        return [ProberStatus.Unknown];
                    case "Probably":
                        return [ProberStatus.Supported];
                    default:
                        return [ProberStatus.Unknown];
                }
            }
        }
        return formatSupport(result);
    });
}
