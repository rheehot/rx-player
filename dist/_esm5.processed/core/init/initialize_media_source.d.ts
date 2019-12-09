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
import { ITransportPipelines } from "../../transports";
import { IABRManagerArguments } from "../abr";
import { IEMEManagerEvent, IKeySystemOption } from "../eme";
import { ITextTrackSourceBufferOptions } from "../source_buffers";
import { IEMEDisabledEvent } from "./create_eme_manager";
import { IInitialTimeOptions } from "./get_initial_time";
import { IMediaSourceLoaderEvent } from "./load_on_media_source";
import { IDecipherabilityUpdateEvent, IInitClockTick, IManifestReadyEvent, IManifestUpdateEvent, IReloadingMediaSourceEvent, IWarningEvent } from "./types";
export interface IInitializeOptions {
    adaptiveOptions: IABRManagerArguments;
    autoPlay: boolean;
    bufferOptions: {
        wantedBufferAhead$: BehaviorSubject<number>;
        maxBufferAhead$: Observable<number>;
        maxBufferBehind$: Observable<number>;
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
    clock$: Observable<IInitClockTick>;
    keySystems: IKeySystemOption[];
    lowLatencyMode: boolean;
    mediaElement: HTMLMediaElement;
    minimumManifestUpdateInterval: number;
    networkConfig: {
        manifestRetry?: number;
        offlineRetry?: number;
        segmentRetry?: number;
    };
    pipelines: ITransportPipelines;
    speed$: Observable<number>;
    startAt?: IInitialTimeOptions;
    textTrackOptions: ITextTrackSourceBufferOptions;
    url?: string;
}
export declare type IInitEvent = IManifestReadyEvent | IManifestUpdateEvent | IMediaSourceLoaderEvent | IEMEManagerEvent | IEMEDisabledEvent | IReloadingMediaSourceEvent | IDecipherabilityUpdateEvent | IWarningEvent;
/**
 * Play a content described by the given Manifest.
 *
 * On subscription:
 *   - Creates the MediaSource and attached sourceBuffers instances.
 *   - download the content's Manifest and handle its refresh logic
 *   - Perform EME management if needed
 *   - get Buffers for each active adaptations.
 *   - give choice of the adaptation to the caller (e.g. to choose a language)
 *   - returns Observable emitting notifications about the content lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function InitializeOnMediaSource({ adaptiveOptions, autoPlay, bufferOptions, clock$, keySystems, lowLatencyMode, mediaElement, minimumManifestUpdateInterval, networkConfig, pipelines, speed$, startAt, textTrackOptions, url }: IInitializeOptions): Observable<IInitEvent>;
