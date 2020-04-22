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
import { Subject } from "rxjs";
import { ITransportPipelines } from "../../../transports";
import { IABRMetric, IABRRequest } from "../../abr";
import { IBufferType } from "../../source_buffers";
import { IPrioritizedSegmentFetcher } from "./prioritized_segment_fetcher";
/** Options used by the `SegmentFetcherCreator`. */
export interface ISegmentFetcherCreatorBackoffOptions {
    /**
     * Whether the content is played in a low-latency mode.
     * This has an impact on default backoff delays.
     */
    lowLatencyMode: boolean;
    /** Maximum number of time a request on error will be retried. */
    maxRetryRegular: number | undefined;
    /** Maximum number of time a request be retried when the user is offline. */
    maxRetryOffline: number | undefined;
}
/**
 * Interact with the transport pipelines to download segments with the right
 * priority.
 *
 * @class SegmentFetcherCreator
 *
 * @example
 * ```js
 * const creator = new SegmentFetcherCreator(transport);
 *
 * // 2 - create a new fetcher with its backoff options
 * const fetcher = creator.createSegmentFetcher("audio", {
 *   maxRetryRegular: Infinity,
 *   maxRetryOffline: Infinity,
 * });
 *
 * // 3 - load a segment with a given priority
 * fetcher.createRequest(myContent, 1)
 *   // 4 - parse it
 *   .pipe(
 *     filter(evt => evt.type === "chunk"),
 *     mergeMap(response => response.parse());
 *   )
 *   // 5 - use it
 *   .subscribe((res) => console.log("audio chunk downloaded:", res));
 * ```
 */
export default class SegmentFetcherCreator<T> {
    private readonly _transport;
    private readonly _prioritizer;
    private readonly _backoffOptions;
    /**
     * @param {Object} transport
     */
    constructor(transport: ITransportPipelines, options: ISegmentFetcherCreatorBackoffOptions);
    /**
     * Create a segment fetcher, allowing to easily perform segment requests.
     * @param {string} bufferType
     * @param {Object} options
     * @returns {Object}
     */
    createSegmentFetcher(bufferType: IBufferType, requests$: Subject<IABRRequest | IABRMetric>): IPrioritizedSegmentFetcher<T>;
}
