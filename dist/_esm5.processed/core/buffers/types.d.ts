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
import { IBufferType } from "../source_buffers";
export interface IBufferEventAddedSegment<T> {
    type: "added-segment";
    value: {
        content: {
            period: Period;
            adaptation: Adaptation;
            representation: Representation;
        };
        segment: ISegment;
        buffered: TimeRanges;
        segmentData: T;
    };
}
export interface IBufferNeedsManifestRefresh {
    type: "needs-manifest-refresh";
    value: undefined;
}
export interface IBufferManifestMightBeOutOfSync {
    type: "manifest-might-be-out-of-sync";
    value: undefined;
}
export interface IBufferNeedsDiscontinuitySeek {
    type: "discontinuity-encountered";
    value: {
        bufferType: IBufferType;
        gap: [number, number];
    };
}
export declare type IBufferNeededActions = IBufferNeedsManifestRefresh | IBufferNeedsDiscontinuitySeek;
export interface IBufferStateActive {
    type: "active-buffer";
    value: {
        bufferType: IBufferType;
    };
}
export interface IBufferStateFull {
    type: "full-buffer";
    value: {
        bufferType: IBufferType;
    };
}
export interface IProtectedSegmentEvent {
    type: "protected-segment";
    value: {
        type: string;
        data: Uint8Array;
    };
}
export declare type IRepresentationBufferStateEvent = IBufferNeededActions | IBufferStateFull | IBufferStateActive | IBufferManifestMightBeOutOfSync;
export declare type IRepresentationBufferEvent<T> = IBufferEventAddedSegment<T> | IProtectedSegmentEvent | IRepresentationBufferStateEvent | IBufferWarningEvent;
export interface IBitrateEstimationChangeEvent {
    type: "bitrateEstimationChange";
    value: {
        type: IBufferType;
        bitrate: number | undefined;
    };
}
export interface IRepresentationChangeEvent {
    type: "representationChange";
    value: {
        type: IBufferType;
        period: Period;
        representation: Representation | null;
    };
}
export declare type IAdaptationBufferEvent<T> = IRepresentationBufferEvent<T> | IBitrateEstimationChangeEvent | INeedsMediaSourceReload | INeedsDecipherabilityFlush | IRepresentationChangeEvent;
export interface IAdaptationChangeEvent {
    type: "adaptationChange";
    value: {
        type: IBufferType;
        period: Period;
        adaptation: Adaptation | null;
    };
}
export interface IActivePeriodChangedEvent {
    type: "activePeriodChanged";
    value: {
        period: Period;
    };
}
export interface IPeriodBufferReadyEvent {
    type: "periodBufferReady";
    value: {
        type: IBufferType;
        period: Period;
        adaptation$: Subject<Adaptation | null>;
    };
}
export interface IPeriodBufferClearedEvent {
    type: "periodBufferCleared";
    value: {
        type: IBufferType;
        period: Period;
    };
}
export interface IEndOfStreamEvent {
    type: "end-of-stream";
    value: undefined;
}
export interface IResumeStreamEvent {
    type: "resume-stream";
    value: undefined;
}
export interface ICompletedBufferEvent {
    type: "complete-buffer";
    value: {
        type: IBufferType;
    };
}
export interface INeedsMediaSourceReload {
    type: "needs-media-source-reload";
    value: {
        currentTime: number;
        isPaused: boolean;
    };
}
export interface INeedsDecipherabilityFlush {
    type: "needs-decipherability-flush";
    value: {
        currentTime: number;
        isPaused: boolean;
        duration: number;
    };
}
export declare type IPeriodBufferEvent = IPeriodBufferReadyEvent | IAdaptationBufferEvent<unknown> | INeedsMediaSourceReload | IAdaptationChangeEvent;
export declare type IMultiplePeriodBuffersEvent = IPeriodBufferEvent | IPeriodBufferClearedEvent | ICompletedBufferEvent;
export declare type IBufferOrchestratorEvent = IActivePeriodChangedEvent | IMultiplePeriodBuffersEvent | IEndOfStreamEvent | IResumeStreamEvent;
export interface IBufferWarningEvent {
    type: "warning";
    value: ICustomError;
}
