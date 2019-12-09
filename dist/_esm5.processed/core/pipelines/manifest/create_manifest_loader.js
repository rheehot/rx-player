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
import tryCatch$ from "../../../utils/rx-try_catch";
import backoff from "../utils/backoff";
import errorSelector from "../utils/error_selector";
/**
 * Returns function allowing to download the Manifest through a resolver ->
 * loader -> parser pipeline.
 *
 * The function returned takes the loader's data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - The fetched data (type "response").
 *
 * This observable will throw if, following the options given, the request and
 * possible retries all failed.
 *
 * @param {Object} manifestPipeline
 * @param {Object} options
 * @returns {Function}
 */
export default function createManifestLoader(manifestPipeline, options) {
    var maxRetry = options.maxRetry, maxRetryOffline = options.maxRetryOffline;
    var loader = manifestPipeline.loader;
    // TODO Remove the resolver completely in the next major version
    var resolver = manifestPipeline.resolver != null ? manifestPipeline.resolver :
        /* tslint:disable deprecation */
        observableOf;
    /* tslint:enable deprecation */
    // Backoff options given to the backoff retry done with the loader function.
    var backoffOptions = { baseDelay: options.baseDelay,
        maxDelay: options.maxDelay,
        maxRetryRegular: maxRetry,
        maxRetryOffline: maxRetryOffline };
    /**
     * Call the transport's resolver - if it exists - with the given data.
     * Throws with the right error if it fails.
     * @param {Object} resolverArgument
     * @returns {Observable}
     */
    function callResolver(resolverArgument) {
        return tryCatch$(resolver, resolverArgument)
            .pipe(catchError(function (error) {
            throw errorSelector(error);
        }));
    }
    /**
     * Load wanted data:
     *   - get it from cache if present
     *   - call the transport loader - with an exponential backoff - if not
     * @param {Object} loaderArgument - Input given to the loader
     * @returns {Observable}
     */
    function loadData(loaderArgument) {
        var loader$ = tryCatch$(loader, loaderArgument);
        return backoff(loader$, backoffOptions).pipe(catchError(function (error) {
            throw errorSelector(error);
        }), map(function (evt) {
            return evt.type === "retry" ? ({ type: "warning",
                value: errorSelector(evt.value) }) :
                evt.value;
        }));
    }
    /**
     * Load the corresponding data.
     * @param {Object} pipelineInputData
     * @returns {Observable}
     */
    return function startPipeline(loaderArgs) {
        return callResolver(loaderArgs).pipe(mergeMap(function (resolverResponse) {
            return loadData(resolverResponse).pipe(mergeMap(function (arg) {
                if (arg.type === "warning") {
                    return observableOf(arg);
                }
                var value = arg.value;
                return observableOf({ type: "response",
                    value: { responseData: value.responseData,
                        url: value.url,
                        sendingTime: value.sendingTime,
                        receivedTime: value.receivedTime } });
            }));
        }));
    };
}
