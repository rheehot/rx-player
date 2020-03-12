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
import Manifest, { Adaptation, ISegment, Period, Representation } from "../../../manifest";
import { ISegmentParserParsedSegment } from "../../../transports";
import { QueuedSourceBuffer } from "../../source_buffers";
import { IBufferEventAddedSegment } from "../types";
/**
 * Push a given media segment (non-init segment) to a QueuedSourceBuffer.
 * The Observable returned:
 *   - emit an event once the segment has been pushed.
 *   - throws on Error.
 * @param {Object} args
 * @returns {Observable}
 */
export default function pushMediaSegment<T>({ clock$, content, initSegmentData, parsedSegment, segment, queuedSourceBuffer }: {
    clock$: Observable<{
        currentTime: number;
    }>;
    content: {
        adaptation: Adaptation;
        manifest: Manifest;
        period: Period;
        representation: Representation;
    };
    initSegmentData: T | null;
    parsedSegment: ISegmentParserParsedSegment<T>;
    segment: ISegment;
    queuedSourceBuffer: QueuedSourceBuffer<T>;
}): Observable<IBufferEventAddedSegment<T>>;
