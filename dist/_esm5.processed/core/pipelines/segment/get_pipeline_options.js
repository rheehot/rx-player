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
import arrayIncludes from "../../../utils/array_includes";
import InitializationSegmentCache from "../../../utils/initialization_segment_cache";
var DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR = config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR, DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE = config.DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE, INITIAL_BACKOFF_DELAY_BASE = config.INITIAL_BACKOFF_DELAY_BASE, MAX_BACKOFF_DELAY_BASE = config.MAX_BACKOFF_DELAY_BASE;
/**
 * Return pipeline options for a given type.
 * @param {string} bufferType
 * @param {Object}
 * @returns {Object}
 */
export default function getSegmentPipelineOptions(bufferType, _a) {
    var segmentRetry = _a.segmentRetry, offlineRetry = _a.offlineRetry, lowLatencyMode = _a.lowLatencyMode;
    var cache = arrayIncludes(["audio", "video"], bufferType) ?
        new InitializationSegmentCache() :
        undefined;
    var maxRetry;
    if (bufferType === "image") {
        maxRetry = 0; // Deactivate BIF fetching if it fails
    }
    else {
        maxRetry = segmentRetry != null ? segmentRetry :
            DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR;
    }
    var maxRetryOffline = offlineRetry != null ? offlineRetry :
        DEFAULT_MAX_PIPELINES_RETRY_ON_OFFLINE;
    var initialBackoffDelay = lowLatencyMode ?
        INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY :
        INITIAL_BACKOFF_DELAY_BASE.REGULAR;
    var maximumBackoffDelay = lowLatencyMode ?
        MAX_BACKOFF_DELAY_BASE.LOW_LATENCY :
        MAX_BACKOFF_DELAY_BASE.REGULAR;
    return { cache: cache,
        maxRetry: maxRetry,
        maxRetryOffline: maxRetryOffline,
        initialBackoffDelay: initialBackoffDelay,
        maximumBackoffDelay: maximumBackoffDelay };
}
