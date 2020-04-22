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
 * This file allows to create `AdaptationBuffer`s.
 *
 * An `AdaptationBuffer` downloads and push segment for a single Adaptation
 * (e.g.  a single audio, video or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates a RepresentationBuffer, which will download and
 * push segments corresponding to a chosen Representation.
 */
import { BehaviorSubject, Observable } from "rxjs";
import Manifest, { Adaptation, Period } from "../../../manifest";
import ABRManager from "../../abr";
import { SegmentFetcherCreator } from "../../fetchers";
import { QueuedSourceBuffer } from "../../source_buffers";
import { IRepresentationBufferClockTick } from "../representation";
import { IAdaptationBufferEvent, IBufferEventAddedSegment, IBufferNeedsDiscontinuitySeek, IBufferNeedsManifestRefresh, IBufferStateActive, IBufferStateFull } from "../types";
/** `Clock tick` information needed by the AdaptationBuffer. */
export interface IAdaptationBufferClockTick extends IRepresentationBufferClockTick {
    /**
     * For the current SourceBuffer, difference in seconds between the next position
     * where no segment data is available and the current position.
     */
    bufferGap: number;
    /** `duration` property of the HTMLMediaElement on which the content plays. */
    duration: number;
    /** If true, the player has been put on pause. */
    isPaused: boolean;
    /** Last "playback rate" asked by the user. */
    speed: number;
}
/** Arguments given when creating a new `AdaptationBuffer`. */
export interface IAdaptationBufferArguments<T> {
    /**
     * Module allowing to find the best Representation depending on the current
     * conditions like the current network bandwidth.
     */
    abrManager: ABRManager;
    /**
     * Regularly emit playback conditions.
     * The main AdaptationBuffer logic will be triggered on each `tick`.
     */
    clock$: Observable<IAdaptationBufferClockTick>;
    /** Content you want to create this buffer for. */
    content: {
        manifest: Manifest;
        period: Period;
        adaptation: Adaptation;
    };
    /**
     * Strategy taken when the user switch manually the current Representation:
     *   - "seamless": the switch will happen smoothly, with the Representation
     *     with the new bitrate progressively being pushed alongside the old
     *     Representation.
     *   - "direct": hard switch. The Representation switch will be directly
     *     visible but may necessitate the current MediaSource to be reloaded.
     */
    options: {
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
    /** SourceBuffer wrapper - needed to push media segments. */
    queuedSourceBuffer: QueuedSourceBuffer<T>;
    /** Module used to fetch the wanted media segments. */
    segmentFetcherCreator: SegmentFetcherCreator<any>;
    /**
     * "Buffer goal" wanted, or the ideal amount of time ahead of the current
     * position in the current SourceBuffer. When this amount has been reached
     * this AdaptationBuffer won't try to download new segments.
     */
    wantedBufferAhead$: BehaviorSubject<number>;
}
/**
 * Create new AdaptationBuffer Observable, which task will be to download the
 * media data for a given Adaptation (i.e. "track").
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * After being subscribed to, it will start running and will emit various events
 * to report its current status.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationBuffer<T>({ abrManager, clock$, content, options, queuedSourceBuffer, segmentFetcherCreator, wantedBufferAhead$, }: IAdaptationBufferArguments<T>): Observable<IAdaptationBufferEvent<T>>;
export { IBufferEventAddedSegment, IBufferNeedsDiscontinuitySeek, IBufferNeedsManifestRefresh, IBufferStateActive, IBufferStateFull, };
