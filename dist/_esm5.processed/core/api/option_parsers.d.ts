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
import { IRepresentationFilter } from "../../manifest";
import { CustomManifestLoader, CustomSegmentLoader, ITransportOptions as IParsedTransportOptions } from "../../transports";
import { IKeySystemOption } from "../eme";
import { IAudioTrackPreference, ITextTrackPreference, IVideoTrackPreference } from "./track_choice_manager";
export { IKeySystemOption };
/** Value of the `serverSyncInfos` transport option. */
interface IServerSyncInfos {
    /** The server timestamp at a given time. */
    serverTimestamp: number;
    /**
     * The client monotonic clock (performance.now) at which `serverTimestamp`
     * was valid.
     */
    clientTime: number;
}
/** Value of the `transportOptions` option of the `loadVideo` method. */
export interface ITransportOptions {
    /** Whether we can perform request for segments in advance. */
    aggressiveMode?: boolean;
    /**
     * Whether we should check that an obtain segment is truncated and retry the
     * request if that's the case.
     */
    checkMediaSegmentIntegrity?: boolean;
    /** Custom implementation for performing Manifest requests. */
    manifestLoader?: CustomManifestLoader;
    /** Possible custom URL pointing to a shorter form of the Manifest. */
    manifestUpdateUrl?: string;
    /** Minimum bound for Manifest updates, in milliseconds. */
    minimumManifestUpdateInterval?: number;
    /** Custom implementation for performing segment requests. */
    segmentLoader?: CustomSegmentLoader;
    /** Custom logic to filter out unwanted qualities. */
    representationFilter?: IRepresentationFilter;
    /** Base time for the segments in case it is not found in the Manifest. */
    referenceDateTime?: number;
    /** Allows to synchronize the server's time with the client's. */
    serverSyncInfos?: IServerSyncInfos;
}
/**
 * External text track we have to add to the Manifest once downloaded.
 * @deprecated
 */
export interface ISupplementaryTextTrackOption {
    /** URL the external text track can be found at. */
    url: string;
    /** Language the text track is in. */
    language: string;
    /** If `true` the text track contains closed captions. */
    closedCaption: boolean;
    /** Mime-type used to know the container and/or format of the text track. */
    mimeType: string;
    /** Codec used to know the format of the text track. */
    codecs?: string;
}
/**
 * External image (".bif") track we have to add to the Manifest once downloaded.
 * @deprecated
 */
export interface ISupplementaryImageTrackOption {
    /** URL the external image track can be found at. */
    url: string;
    /** Mime-type used to know the format of the image track. */
    mimeType: string;
}
/**
 * Value for the `defaultAudioTrack` option of the `loadVideo` method.
 * @deprecated
 */
export interface IDefaultAudioTrackOption {
    /** The language wanted for the audio track. */
    language: string;
    /** The language normalized into ISO639-3 */
    normalized: string;
    /** If `true`, this is an audio description for the visually impaired. */
    audioDescription: boolean;
}
/**
 * Value for the `defaultTextTrack` option of the `loadVideo` method.
 * @deprecated
 */
export interface IDefaultTextTrackOption {
    /** The language wanted for the text track. */
    language: string;
    /** The language normalized into ISO639-3 */
    normalized: string;
    /** If `true`, this is closed captions for the hard of hearing. */
    closedCaption: boolean;
}
/** Value for the `networkConfig` option of the `loadVideo` method. */
export interface INetworkConfigOption {
    /**
     * The amount of time maximum we should retry a Manifest or Manifest-related
     * request before failing on Error.
     * Set to `Infinity` for an infinite number of requests.
     */
    manifestRetry?: number;
    /**
     * The amount of time maximum we should retry a request in general when the
     * user is offline.
     * Set to `Infinity` for an infinite number of requests.
     */
    offlineRetry?: number;
    /**
     * The amount of time maximum we should retry a segment or segment-related
     * request before failing on Error.
     * Set to `Infinity` for an infinite number of requests.
     */
    segmentRetry?: number;
}
/** Possible values for the `startAt` option of the `loadVideo` method. */
export declare type IStartAtOption = {
    position: number;
} | {
    wallClockTime: Date | number;
} | {
    percentage: number;
} | {
    fromLastPosition: number;
} | {
    fromFirstPosition: number;
};
/** Value once parsed for the `startAt` option of the `loadVideo` method. */
declare type IParsedStartAtOption = {
    position: number;
} | {
    wallClockTime: number;
} | {
    percentage: number;
} | {
    fromLastPosition: number;
} | {
    fromFirstPosition: number;
};
/** Every options that can be given to the RxPlayer's constructor. */
export interface IConstructorOptions {
    maxBufferAhead?: number;
    maxBufferBehind?: number;
    wantedBufferAhead?: number;
    limitVideoWidth?: boolean;
    throttleWhenHidden?: boolean;
    throttleVideoBitrateWhenHidden?: boolean;
    preferredAudioTracks?: IAudioTrackPreference[];
    preferredTextTracks?: ITextTrackPreference[];
    preferredVideoTracks?: IVideoTrackPreference[];
    videoElement?: HTMLMediaElement;
    initialVideoBitrate?: number;
    initialAudioBitrate?: number;
    maxAudioBitrate?: number;
    maxVideoBitrate?: number;
    stopAtEnd?: boolean;
}
/** Options of the RxPlayer's constructor once parsed. */
export interface IParsedConstructorOptions {
    maxBufferAhead: number;
    maxBufferBehind: number;
    wantedBufferAhead: number;
    limitVideoWidth: boolean;
    throttleWhenHidden: boolean;
    throttleVideoBitrateWhenHidden: boolean;
    preferredAudioTracks: IAudioTrackPreference[];
    preferredTextTracks: ITextTrackPreference[];
    preferredVideoTracks: IVideoTrackPreference[];
    videoElement: HTMLMediaElement;
    initialVideoBitrate: number;
    initialAudioBitrate: number;
    maxAudioBitrate: number;
    maxVideoBitrate: number;
    stopAtEnd: boolean;
}
/** Every options that can be given to the RxPlayer's `loadVideo` method. */
export interface ILoadVideoOptions {
    transport: string;
    url?: string;
    autoPlay?: boolean;
    keySystems?: IKeySystemOption[];
    transportOptions?: ITransportOptions | undefined;
    lowLatencyMode?: boolean;
    networkConfig?: INetworkConfigOption;
    startAt?: IStartAtOption;
    textTrackMode?: "native" | "html";
    hideNativeSubtitle?: boolean;
    textTrackElement?: HTMLElement;
    manualBitrateSwitchingMode?: "seamless" | "direct";
    supplementaryTextTracks?: ISupplementaryTextTrackOption[];
    supplementaryImageTracks?: ISupplementaryImageTrackOption[];
    defaultAudioTrack?: IDefaultAudioTrackOption | null | undefined;
    defaultTextTrack?: IDefaultTextTrackOption | null | undefined;
}
/**
 * Base type which the types for the parsed options of the RxPlayer's
 * `loadVideo` method exend.
 */
interface IParsedLoadVideoOptionsBase {
    url?: string;
    transport: string;
    autoPlay: boolean;
    keySystems: IKeySystemOption[];
    lowLatencyMode: boolean;
    manifestUpdateUrl: string | undefined;
    minimumManifestUpdateInterval: number;
    networkConfig: INetworkConfigOption;
    transportOptions: IParsedTransportOptions;
    defaultAudioTrack: IAudioTrackPreference | null | undefined;
    defaultTextTrack: ITextTrackPreference | null | undefined;
    startAt: IParsedStartAtOption | undefined;
    manualBitrateSwitchingMode: "seamless" | "direct";
}
/**
 * Options of the RxPlayer's `loadVideo` method once parsed when a "native"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsNative extends IParsedLoadVideoOptionsBase {
    textTrackMode: "native";
    hideNativeSubtitle: boolean;
}
/**
 * Options of the RxPlayer's `loadVideo` method once parsed when an "html"
 * `textTrackMode` is asked.
 */
interface IParsedLoadVideoOptionsHTML extends IParsedLoadVideoOptionsBase {
    textTrackMode: "html";
    textTrackElement: HTMLElement;
}
/**
 * Type enumerating all possible forms for the parsed options of the RxPlayer's
 * `loadVideo` method.
 */
export declare type IParsedLoadVideoOptions = IParsedLoadVideoOptionsNative | IParsedLoadVideoOptionsHTML;
/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object|undefined} options
 * @returns {Object}
 */
declare function parseConstructorOptions(options: IConstructorOptions): IParsedConstructorOptions;
/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 *
 * Throws if any mandatory option is not set.
 * @param {Object|undefined} options
 * @param {Object} ctx - The player context, needed for some default values.
 * @returns {Object}
 */
declare function parseLoadVideoOptions(options: ILoadVideoOptions): IParsedLoadVideoOptions;
export { parseConstructorOptions, parseLoadVideoOptions, };
