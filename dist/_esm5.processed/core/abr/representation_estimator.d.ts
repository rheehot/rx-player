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
import { Adaptation, ISegment, Representation } from "../../manifest";
import BandwidthEstimator from "./bandwidth_estimator";
export interface IABREstimate {
    bitrate: undefined | number;
    manual: boolean;
    representation: Representation;
    urgent: boolean;
    knownStableBitrate?: number;
}
export interface IRepresentationEstimatorClockTick {
    bufferGap: number;
    currentTime: number;
    speed: number;
    duration: number;
}
interface IABRMetricValue {
    duration: number;
    size: number;
    content: {
        representation: Representation;
        adaptation: Adaptation;
        segment: ISegment;
    };
}
export interface IABRMetric {
    type: "metrics";
    value: IABRMetricValue;
}
export interface IABRRepresentationChange {
    type: "representationChange";
    value: {
        representation: Representation | null;
    };
}
interface IProgressEventValue {
    duration: number;
    id: string;
    size: number;
    timestamp: number;
    totalSize: number;
}
export declare type IABRRequest = IProgressRequest | IBeginRequest | IEndRequest;
interface IProgressRequest {
    type: "progress";
    value: IProgressEventValue;
}
interface IBeginRequest {
    type: "requestBegin";
    value: {
        id: string;
        time: number;
        duration: number;
        requestTimestamp: number;
    };
}
interface IEndRequest {
    type: "requestEnd";
    value: {
        id: string;
    };
}
export interface IABRFilters {
    bitrate?: number;
    width?: number;
}
interface IBufferEventAddedSegment {
    type: "added-segment";
    value: {
        buffered: TimeRanges;
        content: {
            representation: Representation;
        };
    };
}
export declare type IABRBufferEvents = IBufferEventAddedSegment | IABRMetric | IABRRepresentationChange | IBeginRequest | IProgressRequest | IEndRequest;
export interface IRepresentationEstimatorThrottlers {
    limitWidth$?: Observable<number>;
    throttle$?: Observable<number>;
    throttleBitrate$?: Observable<number>;
}
export interface IRepresentationEstimatorArguments {
    bandwidthEstimator: BandwidthEstimator;
    bufferEvents$: Observable<IABRBufferEvents>;
    clock$: Observable<IRepresentationEstimatorClockTick>;
    filters$: Observable<IABRFilters>;
    initialBitrate?: number;
    lowLatencyMode: boolean;
    manualBitrate$: Observable<number>;
    maxAutoBitrate$: Observable<number>;
    representations: Representation[];
}
/**
 * Emit the estimated bitrate and best Representation according to the current
 * network and buffer situation.
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationEstimator({ bandwidthEstimator, bufferEvents$, clock$, filters$, initialBitrate, lowLatencyMode, manualBitrate$, maxAutoBitrate$, representations, }: IRepresentationEstimatorArguments): Observable<IABREstimate>;
export {};
