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
import { Representation } from "../../manifest";
import { IBufferType } from "../source_buffers";
import { IABRBufferEvents, IABREstimate, IRepresentationEstimatorClockTick } from "./representation_estimator";
export declare type IABRManagerClockTick = IRepresentationEstimatorClockTick;
interface IRepresentationEstimatorsThrottlers {
    limitWidth: Partial<Record<IBufferType, Observable<number>>>;
    throttle: Partial<Record<IBufferType, Observable<number>>>;
    throttleBitrate: Partial<Record<IBufferType, Observable<number>>>;
}
export interface IABRManagerArguments {
    initialBitrates: Partial<Record<IBufferType, // Initial bitrate chosen, per
    number>>;
    lowLatencyMode: boolean;
    maxAutoBitrates: Partial<Record<IBufferType, // Maximum bitrate chosen
    Observable<number>>>;
    manualBitrates: Partial<Record<IBufferType, // Manual bitrate set for
    Observable<number>>>;
    throttlers: IRepresentationEstimatorsThrottlers;
}
/**
 * Adaptive BitRate Manager.
 *
 * Select the right Representation from the network and buffer infos it
 * receives.
 * @class ABRManager
 */
export default class ABRManager {
    private _bandwidthEstimators;
    private _initialBitrates;
    private _manualBitrates;
    private _maxAutoBitrates;
    private _throttlers;
    private _lowLatencyMode;
    /**
     * @param {Object} options
     */
    constructor(options: IABRManagerArguments);
    /**
     * Take type and an array of the available representations, spit out an
     * observable emitting the best representation (given the network/buffer
     * state).
     * @param {string} type
     * @param {Array.<Representation>|undefined} representations
     * @param {Observable<Object>} clock$
     * @param {Observable<Object>} bufferEvents$
     * @returns {Observable}
     */
    get$(type: IBufferType, representations: Representation[] | undefined, clock$: Observable<IABRManagerClockTick>, bufferEvents$: Observable<IABRBufferEvents>): Observable<IABREstimate>;
    /**
     * @param {string} bufferType
     * @returns {Object}
     */
    private _getBandwidthEstimator;
}
export {};
