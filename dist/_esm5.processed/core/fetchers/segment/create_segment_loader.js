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
import { concat as observableConcat, EMPTY, of as observableOf, } from "rxjs";
import { catchError, map, mergeMap, } from "rxjs/operators";
import assertUnreachable from "../../../utils/assert_unreachable";
import castToObservable from "../../../utils/cast_to_observable";
import objectAssign from "../../../utils/object_assign";
import tryCatch from "../../../utils/rx-try_catch";
import errorSelector from "../utils/error_selector";
import tryURLsWithBackoff from "../utils/try_urls_with_backoff";
/**
 * Returns function allowing to download the wanted data through the loader.
 *
 * (The data can be for example: audio and video segments, text,
 * images...)
 *
 * The function returned takes the initial data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a request begins (type "request").
 *     This is not emitted if the value is retrieved from a local js cache.
 *     This event emits the payload as a value.
 *
 *   - as the request progresses (type "progress").
 *
 *   - each time a request ends (type "metrics").
 *     This event contains information about the metrics of the request.
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - Lastly, with the fetched data (type "response").
 *
 *
 * Each of these but "warning" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * Type parameters:
 *   - T: type of the data emitted
 *
 * @param {Function} loader
 * @param {Object | undefined} cache
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentLoader(loader, cache, backoffOptions) {
    /**
     * Load wanted data:
     *   - get it from cache if present
     *   - call the transport loader - with an exponential backoff - if not
     *
     * @param {Object} loaderArgument - Input given to the loader
     * @returns {Observable}
     */
    function loadData(wantedContent) {
        /**
         * Call the Pipeline's loader with an exponential Backoff.
         * @returns {Observable}
         */
        function startLoaderWithBackoff() {
            var _a;
            var request$ = function (url) {
                var loaderArgument = objectAssign({ url: url }, wantedContent);
                return observableConcat(observableOf({ type: "request", value: loaderArgument }), tryCatch(loader, loaderArgument));
            };
            return tryURLsWithBackoff((_a = wantedContent.segment.mediaURLs) !== null && _a !== void 0 ? _a : [null], request$, backoffOptions).pipe(catchError(function (error) {
                throw errorSelector(error);
            }), map(function (evt) {
                if (evt.type === "retry") {
                    return { type: "warning",
                        value: errorSelector(evt.value) };
                }
                else if (evt.value.type === "request") {
                    return evt.value;
                }
                var response = evt.value;
                if (response.type === "data-loaded" && cache != null) {
                    cache.add(wantedContent, response.value);
                }
                return evt.value;
            }));
        }
        var dataFromCache = cache != null ? cache.get(wantedContent) :
            null;
        if (dataFromCache != null) {
            return castToObservable(dataFromCache).pipe(map(function (response) {
                return { type: "cache",
                    value: response };
            }), catchError(startLoaderWithBackoff));
        }
        return startLoaderWithBackoff();
    }
    /**
     * Load the corresponding data.
     * @param {Object} content
     * @returns {Observable}
     */
    return function loadSegment(content) {
        return loadData(content).pipe(mergeMap(function (arg) {
            var metrics$ = arg.type === "data-chunk-complete" ||
                arg.type === "data-loaded" ? observableOf({
                type: "metrics",
                value: { size: arg.value.size,
                    duration: arg.value.duration }
            }) :
                EMPTY;
            // "cache": data taken from the SegmentLoader's cache.
            // "data-created": the data is available but no request has been done
            // "data-loaded": data received through a request
            switch (arg.type) {
                case "warning":
                    return observableOf(arg);
                case "cache":
                case "data-created":
                case "data-loaded":
                    var chunck$ = observableOf({
                        type: "data",
                        value: objectAssign({}, content, { responseData: arg.value.responseData }),
                    });
                    return observableConcat(chunck$, metrics$);
                case "request":
                case "progress":
                    return observableOf(arg);
                case "data-chunk":
                    return observableOf({ type: "chunk",
                        value: objectAssign({}, content, {
                            responseData: arg.value.responseData
                        }),
                    });
                case "data-chunk-complete":
                    var _complete$ = observableOf({ type: "chunk-complete",
                        value: null });
                    return observableConcat(_complete$, metrics$);
            }
            return assertUnreachable(arg);
        }));
    };
}
