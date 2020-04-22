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
import { Observable } from "rxjs";
export interface IBackoffOptions {
    baseDelay: number;
    maxDelay: number;
    maxRetryRegular: number;
    maxRetryOffline: number;
}
export interface IBackoffRetry {
    type: "retry";
    value: unknown;
}
export interface IBackoffResponse<T> {
    type: "response";
    value: T;
}
export declare type IBackoffEvent<T> = IBackoffRetry | IBackoffResponse<T>;
/**
 * Specific algorithm used to perform segment and manifest requests.
 *
 * Here how it works:
 *
 *   1. we give it one or multiple URLs available for the element we want to
 *      request, the request callback and some options
 *
 *   2. it tries to call the request callback with the first URL:
 *        - if it works as expected, it wrap the response in a `response` event.
 *        - if it fails, it emits a `retry` event and try with the next one.
 *
 *   3. When all URLs have been tested (and failed), it decides - according to
 *      the error counters, configuration and errors received - if it can retry
 *      at least one of them, in the same order:
 *        - If it can, it increments the corresponding error counter, wait a
 *          delay (based on an exponential backoff) and restart the same logic
 *          for all retry-able URL.
 *        - If it can't it just throws the error.
 *
 * Note that there are in fact two separate counters:
 *   - one for "offline" errors
 *   - one for other xhr errors
 * Both counters are resetted if the error type changes from an error to the
 * next.
 * @param {Array.<string} obs$
 * @param {Function} request$
 * @param {Object} options - Configuration options.
 * @returns {Observable}
 */
export default function tryURLsWithBackoff<T>(urls: Array<string | null>, request$: (url: string | null) => Observable<T>, options: IBackoffOptions): Observable<IBackoffEvent<T>>;
/**
 * Lightweight version of the request algorithm, this time with only a simple
 * Observable given.
 * @param {Function} request$
 * @param {Object} options
 * @returns {Observable}
 */
export declare function tryRequestObservableWithBackoff<T>(request$: Observable<T>, options: IBackoffOptions): Observable<IBackoffEvent<T>>;
