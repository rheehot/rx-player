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
import { concat as observableConcat, of as observableOf, } from "rxjs";
import { catchError, filter, finalize, mergeMap, share, tap, } from "rxjs/operators";
import { formatError } from "../../../errors";
import idGenerator from "../../../utils/id_generator";
import createSegmentLoader from "./create_segment_loader";
var generateRequestID = idGenerator();
/**
 * Create a function which will fetch segments.
 *
 * @param {string} bufferType
 * @param {Object} transport
 * @param {Subject} requests$
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentFetcher(bufferType, transport, requests$, options) {
    var segmentLoader = createSegmentLoader(transport[bufferType].loader, options);
    var segmentParser = transport[bufferType].parser; // deal with it
    /**
     * Process a pipeline observable to adapt it to the the rest of the code:
     *   - use the requests subject for network requests and their progress
     *   - use the warning$ subject for retries' error messages
     *   - only emit the data
     * @param {string} pipelineType
     * @param {Observable} pipeline$
     * @returns {Observable}
     */
    return function fetchSegment(content) {
        var id = generateRequestID();
        var requestBeginSent = false;
        return segmentLoader(content).pipe(tap(function (arg) {
            switch (arg.type) {
                case "metrics": {
                    var value = arg.value;
                    var size = value.size, duration = value.duration; // unwrapping for TS
                    // format it for ABR Handling
                    if (size != null && duration != null) {
                        requests$.next({ type: "metrics",
                            value: { size: size, duration: duration, content: content } });
                    }
                    break;
                }
                case "request": {
                    var value = arg.value;
                    // format it for ABR Handling
                    var segment = value.segment;
                    if (segment == null || segment.duration == null) {
                        return;
                    }
                    requestBeginSent = true;
                    var duration = segment.duration / segment.timescale;
                    var time = segment.time / segment.timescale;
                    requests$.next({ type: "requestBegin",
                        value: { duration: duration,
                            time: time,
                            requestTimestamp: performance.now(),
                            id: id } });
                    break;
                }
                case "progress": {
                    var value = arg.value;
                    if (value.totalSize != null && value.size < value.totalSize) {
                        requests$.next({ type: "progress",
                            value: { duration: value.duration,
                                size: value.size,
                                totalSize: value.totalSize,
                                timestamp: performance.now(),
                                id: id } });
                    }
                    break;
                }
            }
        }), finalize(function () {
            if (requestBeginSent) {
                requests$.next({ type: "requestEnd", value: { id: id } });
            }
        }), filter(function (e) { return e.type === "warning" ||
            e.type === "chunk" ||
            e.type === "chunk-complete" ||
            e.type === "data"; }), mergeMap(function (evt) {
            if (evt.type === "warning") {
                return observableOf(evt);
            }
            if (evt.type === "chunk-complete") {
                return observableOf({ type: "chunk-complete" });
            }
            var isChunked = evt.type === "chunk";
            var data = {
                type: "chunk",
                /**
                 * Parse the loaded data.
                 * @param {Object} [init]
                 * @returns {Observable}
                 */
                parse: function (init) {
                    var response = { data: evt.value.responseData, isChunked: isChunked };
                    /* tslint:disable no-unsafe-any */
                    return segmentParser({ response: response, init: init, content: content })
                        /* tslint:enable no-unsafe-any */
                        .pipe(catchError(function (error) {
                        throw formatError(error, { defaultCode: "PIPELINE_PARSE_ERROR",
                            defaultReason: "Unknown parsing error" });
                    }));
                },
            };
            if (isChunked) {
                return observableOf(data);
            }
            return observableConcat(observableOf(data), observableOf({ type: "chunk-complete" }));
        }), share() // avoid multiple side effects if multiple subs
        );
    };
}
