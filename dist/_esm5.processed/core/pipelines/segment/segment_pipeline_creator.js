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
import getSegmentPipelineOptions from "./get_segment_pipeline_options";
import applyPrioritizerToSegmentFetcher from "./prioritized_segment_fetcher";
import ObservablePrioritizer from "./prioritizer";
import createSegmentFetcher from "./segment_fetcher";
/**
 * Interact with the networking pipelines to download segments with the right
 * priority.
 *
 * @class SegmentPipelineCreator
 *
 * @example
 * ```js
 * const creator = new SegmentPipelineCreator(transport);
 *
 * // 2 - create a new pipeline with its own options
 * const pipeline = creator.createPipeline("audio", {
 *   maxRetry: Infinity,
 *   maxRetryOffline: Infinity,
 * });
 *
 * // 3 - load a segment with a given priority
 * pipeline.createRequest(myContent, 1)
 *   // 4 - parse it
 *   .pipe(
 *     filter(evt => evt.type === "response"),
 *     mergeMap(response => response.parse());
 *   )
 *   // 5 - use it
 *   .subscribe((res) => console.log("audio segment downloaded:", res));
 * ```
 */
var SegmentPipelineCreator = /** @class */ (function () {
    /**
     * @param {Object} transport
     */
    function SegmentPipelineCreator(transport, options) {
        this._transport = transport;
        this._prioritizer = new ObservablePrioritizer();
        this._pipelineOptions = options;
    }
    /**
     * Create a segment pipeline, allowing to easily perform segment requests.
     * @param {string} bufferType
     * @param {Object} options
     * @returns {Object}
     */
    SegmentPipelineCreator.prototype.createPipeline = function (bufferType, requests$) {
        var options = getSegmentPipelineOptions(bufferType, this._pipelineOptions);
        var segmentFetcher = createSegmentFetcher(bufferType, this._transport, requests$, options);
        return applyPrioritizerToSegmentFetcher(this._prioritizer, segmentFetcher);
    };
    return SegmentPipelineCreator;
}());
export default SegmentPipelineCreator;
