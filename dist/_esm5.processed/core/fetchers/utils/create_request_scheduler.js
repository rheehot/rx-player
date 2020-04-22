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
import { catchError, mergeMap, } from "rxjs/operators";
import tryCatch from "../../../utils/rx-try_catch";
import errorSelector from "./error_selector";
import { tryRequestObservableWithBackoff, } from "./try_urls_with_backoff";
export default function createRequestScheduler(backoffOptions, warning$) {
    /**
     * Allow the parser to schedule a new request.
     * @param {Function} request - Function performing the request.
     * @returns {Function}
     */
    return function scheduleRequest(request) {
        return tryRequestObservableWithBackoff(tryCatch(request, undefined), backoffOptions).pipe(mergeMap(function (evt) {
            if (evt.type === "retry") {
                warning$.next(errorSelector(evt.value));
                return EMPTY;
            }
            return observableOf(evt.value);
        }), catchError(function (error) {
            throw errorSelector(error);
        }));
    };
}
