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
import { EMPTY, of as observableOf, } from "rxjs";
import { catchError, filter, map, mergeMap, tap, } from "rxjs/operators";
import { formatError, } from "../../../errors";
import tryCatch from "../../../utils/rx-try_catch";
import backoff from "../utils/backoff";
import errorSelector from "../utils/error_selector";
import createManifestLoader from "./create_manifest_loader";
import parseManifestPipelineOptions from "./parse_manifest_pipeline_options";
/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(pipelines, options, warning$);
 * manifestPipeline.fetch(manifestURL)
 *  .mergeMap((evt) => {
 *    if (evt.type !== "response") { // Might also receive warning events
 *      return EMPTY;
 *    }
 *    return manifestPipeline.parse(evt.value);
 *  }).subscribe(({ manifest }) => console.log("Manifest:", manifest));
 * ```
 *
 * @param {Object} pipelines
 * @param {Subject} pipelineOptions
 * @param {Subject} warning$
 * @returns {Function}
 */
export default function createManifestPipeline(pipelines, pipelineOptions, warning$) {
    var parsedOptions = parseManifestPipelineOptions(pipelineOptions);
    var loader = createManifestLoader(pipelines.manifest, parsedOptions);
    var parser = pipelines.manifest.parser;
    /**
     * Allow the parser to schedule a new request.
     * @param {Object} transportPipeline
     * @param {Object} options
     * @returns {Function}
     */
    function scheduleRequest(request) {
        var backoffOptions = { baseDelay: parsedOptions.baseDelay,
            maxDelay: parsedOptions.maxDelay,
            maxRetryRegular: parsedOptions.maxRetry,
            maxRetryOffline: parsedOptions.maxRetryOffline };
        return backoff(tryCatch(request, undefined), backoffOptions).pipe(mergeMap(function (evt) {
            if (evt.type === "retry") {
                warning$.next(errorSelector(evt.value));
                return EMPTY;
            }
            return observableOf(evt.value);
        }), catchError(function (error) {
            throw errorSelector(error);
        }));
    }
    return {
        /**
         * Fetch the manifest corresponding to the URL given.
         * @param {string} url - URL of the manifest
         * @returns {Observable}
         */
        fetch: function (url) {
            return loader({ url: url }).pipe(tap(function (arg) {
                if (arg.type === "warning") {
                    warning$.next(arg.value); // TODO not through warning$
                }
            }), filter(function (arg) {
                return arg.type === "response";
            }));
        },
        /**
         * Fetch the manifest corresponding to the URL given.
         * @param {Object} value - The Manifest document to parse.
         * @param {string} [url] - URL of the manifest
         * @param {number} [externalClockOffset]
         * @returns {Observable}
         */
        parse: function (value, fetchedURL, externalClockOffset) {
            var sendingTime = value.sendingTime;
            return parser({ response: value,
                url: fetchedURL,
                externalClockOffset: externalClockOffset,
                scheduleRequest: scheduleRequest,
            }).pipe(catchError(function (error) {
                throw formatError(error, {
                    defaultCode: "PIPELINE_PARSE_ERROR",
                    defaultReason: "Unknown error when parsing the Manifest",
                });
            }), map(function (_a) {
                var manifest = _a.manifest;
                var warnings = manifest.parsingErrors;
                for (var i = 0; i < warnings.length; i++) {
                    warning$.next(warnings[i]); // TODO not through warning$
                }
                return { manifest: manifest, sendingTime: sendingTime };
            }));
        },
    };
}
