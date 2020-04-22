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
import config from "../../../config";
var DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR = config.DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR, DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE = config.DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE, INITIAL_BACKOFF_DELAY_BASE = config.INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE = config.MAX_BACKOFF_DELAY_BASE;
/**
 * @param {string} bufferType
 * @param {Object}
 * @returns {Object}
 */
export default function getSegmentBackoffOptions(bufferType, _a) {
    var maxRetryRegular = _a.maxRetryRegular, maxRetryOffline = _a.maxRetryOffline, lowLatencyMode = _a.lowLatencyMode;
    return { maxRetryRegular: bufferType === "image" ? 0 : maxRetryRegular !== null && maxRetryRegular !== void 0 ? maxRetryRegular : DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
        maxRetryOffline: maxRetryOffline !== null && maxRetryOffline !== void 0 ? maxRetryOffline : DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
        baseDelay: lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
            INITIAL_BACKOFF_DELAY_BASE.REGULAR,
        maxDelay: lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
            MAX_BACKOFF_DELAY_BASE.REGULAR };
}
