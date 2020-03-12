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
import { defer as observableDefer, EMPTY, } from "rxjs";
import { map } from "rxjs/operators";
import objectAssign from "../../../utils/object_assign";
import EVENTS from "../events_generators";
import appendSegmentToSourceBuffer from "./append_segment_to_source_buffer";
/**
 * Push a given media segment (non-init segment) to a QueuedSourceBuffer.
 * The Observable returned:
 *   - emit an event once the segment has been pushed.
 *   - throws on Error.
 * @param {Object} args
 * @returns {Observable}
 */
export default function pushMediaSegment(_a) {
    var clock$ = _a.clock$, content = _a.content, initSegmentData = _a.initSegmentData, parsedSegment = _a.parsedSegment, segment = _a.segment, queuedSourceBuffer = _a.queuedSourceBuffer;
    return observableDefer(function () {
        if (parsedSegment.chunkData === null) {
            return EMPTY;
        }
        var chunkData = parsedSegment.chunkData, chunkInfos = parsedSegment.chunkInfos, chunkOffset = parsedSegment.chunkOffset, appendWindow = parsedSegment.appendWindow;
        var codec = content.representation.getMimeTypeString();
        var data = { initSegment: initSegmentData,
            chunk: chunkData,
            timestampOffset: chunkOffset,
            appendWindow: appendWindow,
            codec: codec };
        var estimatedStart;
        var estimatedDuration;
        if (chunkInfos !== null) {
            estimatedStart = chunkInfos.time / chunkInfos.timescale;
            estimatedDuration = chunkInfos.duration !== undefined ?
                chunkInfos.duration / chunkInfos.timescale :
                undefined;
        }
        var inventoryInfos = objectAssign({ segment: segment,
            estimatedStart: estimatedStart,
            estimatedDuration: estimatedDuration }, content);
        return appendSegmentToSourceBuffer(clock$, queuedSourceBuffer, { data: data, inventoryInfos: inventoryInfos })
            .pipe(map(function () {
            var buffered = queuedSourceBuffer.getBufferedRanges();
            return EVENTS.addedSegment(content, segment, buffered, chunkData);
        }));
    });
}
