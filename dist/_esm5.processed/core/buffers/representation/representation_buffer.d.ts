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
import Manifest, { Adaptation, Period, Representation } from "../../../manifest";
import { IPrioritizedSegmentFetcher } from "../../pipelines";
import { QueuedSourceBuffer } from "../../source_buffers";
import { IRepresentationBufferEvent } from "../types";
export interface IRepresentationBufferClockTick {
    currentTime: number;
    liveGap?: number;
    stalled: object | null;
    wantedTimeOffset: number;
}
export interface IRepresentationBufferArguments<T> {
    clock$: Observable<IRepresentationBufferClockTick>;
    content: {
        adaptation: Adaptation;
        manifest: Manifest;
        period: Period;
        representation: Representation;
    };
    queuedSourceBuffer: QueuedSourceBuffer<T>;
    segmentFetcher: IPrioritizedSegmentFetcher<T>;
    terminate$: Observable<void>;
    bufferGoal$: Observable<number>;
    fastSwitchingStep$: Observable<undefined | number>;
}
export interface ISegmentProtection {
    type: string;
    data: Uint8Array;
}
/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationBuffer observables can run on the same SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationBuffer<T>({ bufferGoal$, // emit the buffer size we have to reach
clock$, // emit current playback information regularly
content, // The content we want to play
fastSwitchingStep$, // Bitrate higher or equal to this value should not be
queuedSourceBuffer, // interface to the SourceBuffer
segmentFetcher, // allows to download new segments
terminate$, }: IRepresentationBufferArguments<T>): Observable<IRepresentationBufferEvent<T>>;
