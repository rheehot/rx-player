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

import isNullOrUndefined from "../../utils/is_null_or_undefined";
import request from "../../utils/request";
import generateSegmentLoader from "../dash/segment_loader";
import segmentParser from "../dash/segment_parser";
import generateTextTrackLoader from "../dash/text_loader";
import textTrackParser from "../dash/text_parser";
import {
  CustomManifestLoader,
  IManifestLoaderArguments,
  IManifestLoaderObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
import generateManifestParser from "./manifest_parser";

/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @returns {Observable}
 */
function regularManifestLoader(
  { url } : IManifestLoaderArguments
) : IManifestLoaderObservable {
  if (url === undefined) {
    throw new Error("Cannot perform HTTP(s) request. URL not known");
  }
  return request({ url, responseType: "text" });
}

function generateManifestLoader(
  { customManifestLoader } : { customManifestLoader? : CustomManifestLoader }
) : (x : IManifestLoaderArguments) => IManifestLoaderObservable {
  if (isNullOrUndefined(customManifestLoader)) {
    return regularManifestLoader;
  }
  return callCustomManifestLoader(customManifestLoader,
                                  regularManifestLoader);
}

/**
 * Returns pipelines used for HLS streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
export default function(options : ITransportOptions) : ITransportPipelines {
  const manifestParser = generateManifestParser(options);
  const segmentLoader = generateSegmentLoader(options);
  const textTrackLoader = generateTextTrackLoader(options);

  const customManifestLoader = options.manifestLoader;
  const manifestPipeline = {
    loader: generateManifestLoader({ customManifestLoader }),
    parser: manifestParser,
  };

  const imageTrackPipeline = {
    loader:  () : never => {
      throw new Error("Images track not supported in HLS transport.");
    },
    parser: () : never => {
      throw new Error("Images track not supported in HLS transport.");
    },
  };

  return { manifest: manifestPipeline,
           audio: { loader: segmentLoader,
                    parser: segmentParser },
           video: { loader: segmentLoader,
                    parser: segmentParser },
           text: { loader: textTrackLoader,
                   parser: textTrackParser },
           image: imageTrackPipeline };
}
