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

import objectAssign from "object-assign";
import {
  defer as observableDefer,
  EMPTY,
  Observable,
} from "rxjs";
import { map } from "rxjs/operators";
import config from "../../../config";
import Manifest, {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { ISegmentParserParsedSegment } from "../../../transports";
import {
  QueuedSourceBuffer,
  SegmentInventory,
} from "../../source_buffers";
import EVENTS from "../events_generators";
import { IBufferEventAddedSegment } from "../types";
import appendSegmentToSourceBuffer from "./append_segment_to_source_buffer";

const { APPEND_WINDOW_SECURITIES } = config;

/**
 * Push a given media segment (non-init segment) to a QueuedSourceBuffer.
 * The Observable returned:
 *   - emit an event once the segment has been pushed.
 *   - throws on Error.
 * @param {Object} args
 * @returns {Observable}
 */
export default function pushMediaSegment<T>(
  { clock$,
    content,
    initSegmentData,
    parsedSegment,
    segment,
    queuedSourceBuffer,
    segmentInventory } : { clock$ : Observable<{ currentTime : number }>;
                           content: { adaptation : Adaptation;
                                      manifest : Manifest;
                                      period : Period;
                                      representation : Representation; };
                           initSegmentData : T | null;
                           parsedSegment : ISegmentParserParsedSegment<T>;
                           segment : ISegment;
                           queuedSourceBuffer : QueuedSourceBuffer<T>;
                           segmentInventory: SegmentInventory; }
) : Observable< IBufferEventAddedSegment<T> > {
  return observableDefer(() => {
    if (parsedSegment.chunkData === null) {
      return EMPTY;
    }
    const { chunkData,
            chunkInfos,
            chunkOffset,
            appendWindow } = parsedSegment;

    // Cutting exactly at the start or end of the appendWindow can lead to
    // cases of infinite rebuffering due to how browser handle such windows.
    // To work-around that, we add a small offset before and after those.
    const safeAppendWindow : [ number | undefined, number | undefined ] = [
      appendWindow[0] !== undefined ?
        Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START) :
        undefined,
      appendWindow[1] !== undefined ?
        appendWindow[1] + APPEND_WINDOW_SECURITIES.END :
        undefined,
    ];
    const codec = content.representation.getMimeTypeString();
    const data = { initSegment: initSegmentData,
                   chunk: chunkData,
                   timestampOffset: chunkOffset,
                   appendWindow: safeAppendWindow,
                   codec };

    let estimatedStart : number|undefined;
    let estimatedDuration : number|undefined;
    if (chunkInfos !== null) {
      estimatedStart = chunkInfos.time / chunkInfos.timescale;
      estimatedDuration = chunkInfos.duration !== undefined ?
        chunkInfos.duration / chunkInfos.timescale :
        undefined;
    }
    const inventoryInfos = objectAssign({ segment,
                                          estimatedStart,
                                          estimatedDuration },
                                        content);
    return appendSegmentToSourceBuffer(clock$,
                                       queuedSourceBuffer,
                                       data)
      .pipe(map(() => {
        let start = estimatedStart === undefined ? segment.time / segment.timescale :
                                                   estimatedStart;
        const duration = estimatedDuration === undefined ?
          segment.duration / segment.timescale :
          estimatedDuration;
        let end = start + duration;

        if (safeAppendWindow[0] !== undefined) {
          start = Math.max(start, safeAppendWindow[0]);
        }
        if (safeAppendWindow[1] !== undefined) {
          end = Math.min(end, safeAppendWindow[1]);
        }

        const inventoryData = { period: inventoryInfos.period,
                                adaptation: inventoryInfos.adaptation,
                                representation: inventoryInfos.representation,
                                segment: inventoryInfos.segment,
                                start,
                                end };
        segmentInventory.insertChunk(inventoryData);
        const buffered = queuedSourceBuffer.getBufferedRanges();
        return EVENTS.addedSegment(content, segment, buffered, chunkData);
      }));
  });
}
