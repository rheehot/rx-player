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
import { concat as observableConcat, EMPTY, merge as observableMerge, of as observableOf, Subject, } from "rxjs";
import { catchError, finalize, map, mergeMap, } from "rxjs/operators";
import { formatError, } from "../../../errors";
import createRequestScheduler from "../utils/create_request_scheduler";
import createManifestLoader from "./create_manifest_loader";
import getManifestBackoffOptions from "./get_manifest_backoff_options";
/**
 * Create function allowing to easily fetch and parse a Manifest from its URL.
 * @example
 * ```js
 * const manifestFetcher = createManifestFetcher(pipelines, options);
 * manifestFetcher.fetch(manifestURL).pipe(
 *   // Filter only responses (might also receive warning events)
 *   filter((evt) => evt.type === "response");
 *   // Parse the Manifest
 *   mergeMap(res => res.parse({ externalClockOffset }))
 *   // (again)
 *   filter((evt) => evt.type === "parsed");
 * ).subscribe(({ value }) => {
 *   console.log("Manifest:", value.manifest);
 * });
 * ```
 * @param {Object} pipelines
 * @param {Subject} backoffOptions
 * @returns {Object}
 */
export default function createManifestFetcher(pipelines, options) {
    var backoffOptions = getManifestBackoffOptions(options);
    var loader = createManifestLoader(pipelines.manifest, backoffOptions);
    var parser = pipelines.manifest.parser;
    return {
        /**
         * Fetch the manifest corresponding to the URL given.
         * @param {string} url - URL of the manifest
         * @returns {Observable}
         */
        fetch: function (url) {
            return loader({ url: url }).pipe(map(function (evt) {
                if (evt.type === "warning") {
                    return evt;
                }
                var _a = evt.value, sendingTime = _a.sendingTime, receivedTime = _a.receivedTime;
                var parsingTimeStart = performance.now();
                var schedulerWarnings$ = new Subject();
                var scheduleRequest = createRequestScheduler(backoffOptions, schedulerWarnings$);
                return {
                    type: "response",
                    parse: function (parserOptions) {
                        return observableMerge(schedulerWarnings$
                            .pipe(map(function (err) { return ({ type: "warning", value: err }); })), parser({ response: evt.value,
                            url: url,
                            externalClockOffset: parserOptions.externalClockOffset,
                            previousManifest: parserOptions.previousManifest,
                            scheduleRequest: scheduleRequest,
                            unsafeMode: parserOptions.unsafeMode,
                        }).pipe(catchError(function (error) {
                            throw formatError(error, {
                                defaultCode: "PIPELINE_PARSE_ERROR",
                                defaultReason: "Unknown error when parsing the Manifest",
                            });
                        }), mergeMap(function (_a) {
                            var manifest = _a.manifest;
                            // 1 - send warnings first
                            var warnings = manifest.parsingErrors;
                            var warningEvts$ = EMPTY;
                            for (var i = 0; i < warnings.length; i++) {
                                var warning = warnings[i];
                                warningEvts$ =
                                    observableConcat(warningEvts$, observableOf({ type: "warning",
                                        value: warning }));
                            }
                            // 2 - send response
                            var parsingTime = performance.now() - parsingTimeStart;
                            return observableConcat(warningEvts$, observableOf({ type: "parsed",
                                manifest: manifest,
                                sendingTime: sendingTime,
                                receivedTime: receivedTime,
                                parsingTime: parsingTime }));
                        }), finalize(function () { schedulerWarnings$.complete(); })));
                    },
                };
            }));
        },
    };
}
