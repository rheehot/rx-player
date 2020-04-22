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
/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
    /** Options concerning the ABR logic. */
    adaptiveOptions: IABRManagerArguments;
    /** `true` if we should play when loaded. */
    autoPlay: boolean;
    /** Options concerning the media buffers. */
    bufferOptions: {
        /** Buffer "goal" at which we stop downloading new segments. */
        wantedBufferAhead$: BehaviorSubject<number>;
        /** Max buffer size after the current position, in seconds (we GC further up). */
        maxBufferAhead$: Observable<number>;
        /** Max buffer size before the current position, in seconds (we GC further down). */
        maxBufferBehind$: Observable<number>;
        /** Strategy when switching the current bitrate manually (smooth vs reload). */
        manualBitrateSwitchingMode: "seamless" | "direct";
    };
    /** Regularly emit current playback conditions. */
    clock$: Observable<IInitClockTick>;
    /** Every encryption configuration set. */
    keySystems: IKeySystemOption[];
    /** `true` to play low-latency contents optimally. */
    lowLatencyMode: boolean;
    /** Optional shorter version of the Manifest used for updates only. */
    manifestUpdateUrl?: string;
    /** The HTMLMediaElement on which we will play. */
    mediaElement: HTMLMediaElement;
    /** Limit the frequency of Manifest updates. */
    minimumManifestUpdateInterval: number;
    /** Requests configuration. */
    networkConfig: {
        /** Maximum number of Manifest retry. */
        manifestRetry?: number;
        /** Maximum number of offline segment retry. */
        offlineRetry?: number;
        /** Maximum number of non-offline segment retry. */
        segmentRetry?: number;
    };
    /** Emit the playback rate (speed) set by the user. */
    speed$: Observable<number>;
    /** The configured starting position. */
    startAt?: IInitialTimeOptions;
    /** Configuration specific to the text track. */
    textTrackOptions: ITextTrackSourceBufferOptions;
    /**
     * "Transport pipelines": logic specific to the current transport
     * (e.g. DASH, Smooth...)
     */
    transportPipelines: ITransportPipelines;
    /** URL of the Manifest. */
    url?: string;
}
/** Every events emitted by `InitializeOnMediaSource`. */
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
export default function InitializeOnMediaSource({ adaptiveOptions, autoPlay, bufferOptions, clock$, keySystems, lowLatencyMode, manifestUpdateUrl, mediaElement, minimumManifestUpdateInterval, networkConfig, speed$, startAt, textTrackOptions, transportPipelines, url }: IInitializeArguments): Observable<IInitEvent>;
