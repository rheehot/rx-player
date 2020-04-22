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
import { Subject } from "rxjs";
import { ICustomError } from "../../errors";
import { Adaptation, ISegment, Period, Representation } from "../../manifest";
import { IActivePeriodChangedEvent, IAdaptationChangeEvent, IBitrateEstimationChangeEvent, IBufferEventAddedSegment, IBufferManifestMightBeOutOfSync, IBufferNeedsDiscontinuitySeek, IBufferNeedsManifestRefresh, IBufferStateActive, IBufferStateFull, IBufferWarningEvent, ICompletedBufferEvent, IEndOfStreamEvent, INeedsDecipherabilityFlush, INeedsMediaSourceReload, IPeriodBufferClearedEvent, IPeriodBufferReadyEvent, IProtectedSegmentEvent, IRepresentationChangeEvent, IResumeStreamEvent } from "./types";
declare const EVENTS: {
    activeBuffer(bufferType: "audio" | "video" | "image" | "text"): IBufferStateActive;
    activePeriodChanged(period: Period): IActivePeriodChangedEvent;
    adaptationChange(bufferType: "audio" | "video" | "image" | "text", adaptation: Adaptation | null, period: Period): IAdaptationChangeEvent;
    addedSegment<T>(content: {
        adaptation: Adaptation;
        period: Period;
        representation: Representation;
    }, segment: ISegment, buffered: TimeRanges, segmentData: T): IBufferEventAddedSegment<T>;
    bitrateEstimationChange(type: "audio" | "video" | "image" | "text", bitrate: number | undefined): IBitrateEstimationChangeEvent;
    bufferComplete(bufferType: "audio" | "video" | "image" | "text"): ICompletedBufferEvent;
    discontinuityEncountered(gap: [number, number], bufferType: "audio" | "video" | "image" | "text"): IBufferNeedsDiscontinuitySeek;
    endOfStream(): IEndOfStreamEvent;
    fullBuffer(bufferType: "audio" | "video" | "image" | "text"): IBufferStateFull;
    needsManifestRefresh(): IBufferNeedsManifestRefresh;
    manifestMightBeOufOfSync(): IBufferManifestMightBeOutOfSync;
    needsMediaSourceReload(period: Period, { currentTime, isPaused }: {
        currentTime: number;
        isPaused: boolean;
    }): INeedsMediaSourceReload;
    needsDecipherabilityFlush({ currentTime, isPaused, duration }: {
        currentTime: number;
        isPaused: boolean;
        duration: number;
    }): INeedsDecipherabilityFlush;
    periodBufferReady(type: "audio" | "video" | "image" | "text", period: Period, adaptation$: Subject<Adaptation | null>): IPeriodBufferReadyEvent;
    periodBufferCleared(type: "audio" | "video" | "image" | "text", period: Period): IPeriodBufferClearedEvent;
    protectedSegment(initDataInfo: {
        type: string;
        data: Uint8Array;
    }): IProtectedSegmentEvent;
    representationChange(type: "audio" | "video" | "image" | "text", period: Period, representation: Representation): IRepresentationChangeEvent;
    resumeStream(): IResumeStreamEvent;
    warning(value: ICustomError): IBufferWarningEvent;
};
export default EVENTS;
