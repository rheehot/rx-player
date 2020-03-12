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
/**
 * This file allows to create AdaptationBuffers.
 *
 * An AdaptationBuffer downloads and push segment for a single Adaptation (e.g.
 * a single audio or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */
import { BehaviorSubject, Observable } from "rxjs";
import Manifest, { Adaptation, Period } from "../../../manifest";
import ABRManager from "../../abr";
import { SegmentPipelineCreator } from "../../pipelines";
import { QueuedSourceBuffer } from "../../source_buffers";
import { IRepresentationBufferClockTick } from "../representation";
import { IAdaptationBufferEvent, IBufferEventAddedSegment, IBufferNeedsDiscontinuitySeek, IBufferNeedsManifestRefresh, IBufferStateActive, IBufferStateFull } from "../types";
export interface IAdaptationBufferClockTick extends IRepresentationBufferClockTick {
    bufferGap: number;
    duration: number;
    isPaused: boolean;
    speed: number;
}
export interface IAdaptationBufferArguments<T> {
    abrManager: ABRManager;
    clock$: Observable<IAdaptationBufferClockTick>;
    content: {
        manifest: Manifest;
        period: Period;
        adaptation: Adaptation;
    };
    options: {
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
    queuedSourceBuffer: QueuedSourceBuffer<T>;
    segmentPipelineCreator: SegmentPipelineCreator<any>;
    wantedBufferAhead$: BehaviorSubject<number>;
}
/**
 * Create new Buffer Observable linked to the given Adaptation.
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * It will emit various events to report its status to the caller.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationBuffer<T>({ abrManager, clock$, content, options, queuedSourceBuffer, segmentPipelineCreator, wantedBufferAhead$, }: IAdaptationBufferArguments<T>): Observable<IAdaptationBufferEvent<T>>;
export { IBufferEventAddedSegment, IBufferNeedsDiscontinuitySeek, IBufferNeedsManifestRefresh, IBufferStateActive, IBufferStateFull, };
