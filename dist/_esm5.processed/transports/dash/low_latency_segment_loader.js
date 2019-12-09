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
import { of as observableOf } from "rxjs";
import { mergeMap, scan, } from "rxjs/operators";
import log from "../../log";
import { concat } from "../../utils/byte_parsing";
import fetchRequest from "../../utils/request/fetch";
import byteRange from "../utils/byte_range";
import extractCompleteChunks from "./extract_complete_chunks";
export default function lowLatencySegmentLoader(url, args) {
    var segment = args.segment;
    var headers = segment.range != null ? { Range: byteRange(segment.range) } :
        undefined;
    return fetchRequest({ url: url, headers: headers })
        .pipe(scan(function (acc, evt) {
        if (evt.type === "data-complete") {
            if (acc.partialChunk != null) {
                log.warn("DASH Pipelines: remaining chunk does not belong to any segment");
            }
            return { event: evt, completeChunks: [], partialChunk: null };
        }
        var data = new Uint8Array(evt.value.chunk);
        var concatenated = acc.partialChunk != null ? concat(acc.partialChunk, data) :
            data;
        var _a = extractCompleteChunks(concatenated), completeChunks = _a[0], partialChunk = _a[1];
        return { event: evt, completeChunks: completeChunks, partialChunk: partialChunk };
    }, { event: null, completeChunks: [], partialChunk: null }), mergeMap(function (evt) {
        var emitted = [];
        for (var i = 0; i < evt.completeChunks.length; i++) {
            emitted.push({ type: "data-chunk",
                value: { responseData: evt.completeChunks[i] } });
        }
        var event = evt.event;
        if (event != null && event.type === "data-chunk") {
            var value = event.value;
            emitted.push({ type: "progress",
                value: { duration: value.duration,
                    size: value.size,
                    totalSize: value.totalSize } });
        }
        else if (event != null && event.type === "data-complete") {
            var value = event.value;
            emitted.push({ type: "data-chunk-complete",
                value: { duration: value.duration,
                    receivedTime: value.receivedTime,
                    sendingTime: value.sendingTime,
                    size: value.size,
                    status: value.status,
                    url: value.url } });
        }
        return observableOf.apply(void 0, emitted);
    }));
}
