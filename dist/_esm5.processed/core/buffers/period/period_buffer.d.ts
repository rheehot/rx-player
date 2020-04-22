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
import { BehaviorSubject, Observable } from "rxjs";
import Manifest, { Period } from "../../../manifest";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import SourceBuffersStore, { IBufferType, ITextTrackSourceBufferOptions, QueuedSourceBuffer } from "../../source_buffers";
import { IPeriodBufferEvent } from "../types";
export interface IPeriodBufferClockTick {
    currentTime: number;
    duration: number;
    isPaused: boolean;
    liveGap?: number;
    readyState: number;
    speed: number;
    stalled: object | null;
    wantedTimeOffset: number;
}
export interface IPeriodBufferArguments {
    abrManager: ABRManager;
    bufferType: IBufferType;
    clock$: Observable<IPeriodBufferClockTick>;
    content: {
        manifest: Manifest;
        period: Period;
    };
    garbageCollectors: WeakMapMemory<QueuedSourceBuffer<unknown>, Observable<never>>;
    segmentFetcherCreator: SegmentFetcherCreator<any>;
    sourceBuffersStore: SourceBuffersStore;
    options: {
        manualBitrateSwitchingMode: "seamless" | "direct";
        textTrackOptions?: ITextTrackSourceBufferOptions;
    };
    wantedBufferAhead$: BehaviorSubject<number>;
}
/**
 * Create single PeriodBuffer Observable:
 *   - Lazily create (or reuse) a SourceBuffer for the given type.
 *   - Create a Buffer linked to an Adaptation each time it changes, to
 *     download and append the corresponding Segments in the SourceBuffer.
 *   - Announce when the Buffer is full or is awaiting new Segments through
 *     events
 * @param {Object} args
 * @returns {Observable}
 */
export default function PeriodBuffer({ abrManager, bufferType, clock$, content, garbageCollectors, segmentFetcherCreator, sourceBuffersStore, options, wantedBufferAhead$, }: IPeriodBufferArguments): Observable<IPeriodBufferEvent>;
