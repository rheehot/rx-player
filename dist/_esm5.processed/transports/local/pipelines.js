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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import { of as observableOf } from "rxjs";
import Manifest from "../../manifest";
import parseLocalManifest from "../../parsers/manifest/local";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
import segmentLoader from "./segment_loader";
import segmentParser from "./segment_parser";
import textTrackParser from "./text_parser";
/**
 * Returns pipelines used for local Manifest streaming.
 * @param {Object} options
 * @returns {Object}
 */
export default function getLocalManifestPipelines(options) {
    var customManifestLoader = options.manifestLoader;
    var manifestPipeline = {
        loader: function (args) {
            if (isNullOrUndefined(customManifestLoader)) {
                throw new Error("A local Manifest is not loadable through regular HTTP(S) " +
                    " calls. You have to set a `manifestLoader` when calling " +
                    "`loadVideo`");
            }
            return callCustomManifestLoader(customManifestLoader, function () {
                throw new Error("Cannot fallback from the `manifestLoader` of a " +
                    "`local` transport");
            })(args);
        },
        parser: function (_a) {
            var response = _a.response;
            var manifestData = response.responseData;
            if (typeof manifestData !== "object") {
                throw new Error("Wrong format for the manifest data");
            }
            var parsed = parseLocalManifest(response.responseData);
            var manifest = new Manifest(parsed, options);
            return observableOf({ manifest: manifest, url: undefined });
        },
    };
    var segmentPipeline = { loader: segmentLoader,
        parser: segmentParser };
    var textTrackPipeline = { loader: segmentLoader,
        parser: textTrackParser };
    var imageTrackPipeline = {
        loader: function () {
            throw new Error("Images track not supported in local transport.");
        },
        parser: function () {
            throw new Error("Images track not supported in local transport.");
        },
    };
    return { manifest: manifestPipeline,
        audio: segmentPipeline,
        video: segmentPipeline,
        text: textTrackPipeline,
        image: imageTrackPipeline };
}
