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
import { Observable, Observer } from "rxjs";
import Manifest, { Adaptation, IRepresentationFilter, ISegment, ISupplementaryImageTrack, ISupplementaryTextTrack, Period, Representation } from "../manifest";
import { IBifThumbnail } from "../parsers/images/bif";
import { IMetaPlaylist } from "../parsers/manifest/metaplaylist";
export interface IChunkTimingInfos {
    duration?: number;
    time: number;
    timescale: number;
}
export interface ISegmentProtection {
    type: string;
    data: Uint8Array;
}
export interface INextSegmentsInfos {
    duration: number;
    time: number;
    timescale: number;
}
export interface IManifestLoaderArguments {
    url?: string;
}
export interface ISegmentLoaderArguments {
    manifest: Manifest;
    period: Period;
    adaptation: Adaptation;
    representation: Representation;
    segment: ISegment;
}
export interface ILoaderDataLoadedValue<T> {
    responseData: T;
    duration?: number;
    size?: number;
    url?: string;
    sendingTime?: number;
    receivedTime?: number;
}
export interface ILoaderDataLoaded<T> {
    type: "data-loaded";
    value: ILoaderDataLoadedValue<T>;
}
export interface ILoaderDataCreated<T> {
    type: "data-created";
    value: {
        responseData: T;
    };
}
export interface ILoaderProgress {
    type: "progress";
    value: {
        duration: number;
        size: number;
        totalSize?: number;
    };
}
export interface ILoaderChunkedData {
    type: "data-chunk";
    value: {
        responseData: ArrayBuffer | Uint8Array;
    };
}
export interface ILoaderChunkedDataComplete {
    type: "data-chunk-complete";
    value: {
        duration: number;
        receivedTime: number;
        sendingTime: number;
        size: number;
        status: number;
        url: string;
    };
}
export declare type ILoaderChunkedDataEvent = ILoaderChunkedData | ILoaderProgress | ILoaderChunkedDataComplete;
export declare type ILoaderRegularDataEvent<T> = ILoaderProgress | ILoaderDataLoaded<T> | ILoaderDataCreated<T>;
export declare type ILoadedManifest = Document | string | IMetaPlaylist;
export declare type IManifestLoaderEvent = ILoaderDataLoaded<ILoadedManifest>;
export declare type IManifestLoaderObservable = Observable<IManifestLoaderEvent>;
export declare type IManifestLoaderObserver = Observer<IManifestLoaderEvent>;
export declare type ISegmentLoaderEvent<T> = ILoaderChunkedDataEvent | ILoaderRegularDataEvent<T>;
export declare type ISegmentLoaderObservable<T> = Observable<ILoaderChunkedDataEvent | ILoaderRegularDataEvent<T>>;
export interface IManifestParserArguments {
    response: ILoaderDataLoadedValue<unknown>;
    url?: string;
    externalClockOffset?: number;
    scheduleRequest: (request: () => Observable<ILoaderDataLoadedValue<Document | string>>) => Observable<ILoaderDataLoadedValue<Document | string>>;
}
export interface ISegmentParserArguments<T> {
    response: {
        data: T;
        isChunked: boolean;
    };
    init?: IChunkTimingInfos;
    content: {
        manifest: Manifest;
        period: Period;
        adaptation: Adaptation;
        representation: Representation;
        segment: ISegment;
    };
}
export interface IManifestParserResponse {
    manifest: Manifest;
    url?: string;
}
export declare type IManifestParserObservable = Observable<IManifestParserResponse>;
export interface ISegmentParserResponse<T> {
    chunkData: T | null;
    chunkInfos: IChunkTimingInfos | null;
    chunkOffset: number;
    segmentProtections: ISegmentProtection[];
    appendWindow: [number | undefined, // start window for the segment
    // start window for the segment
    number | undefined];
}
export declare type IVideoParserResponse = ISegmentParserResponse<Uint8Array | ArrayBuffer>;
export declare type IAudioParserResponse = ISegmentParserResponse<Uint8Array | ArrayBuffer>;
export interface ITextTrackSegmentData {
    data: string;
    type: string;
    language?: string;
    start?: number;
    end?: number;
    timescale: number;
}
export declare type ITextParserResponse = ISegmentParserResponse<ITextTrackSegmentData>;
export interface IImageTrackSegmentData {
    data: IBifThumbnail[];
    end: number;
    start: number;
    timescale: number;
    type: string;
}
export declare type IImageParserResponse = ISegmentParserResponse<IImageTrackSegmentData>;
export declare type ISegmentParserObservable<T> = Observable<ISegmentParserResponse<T>>;
export declare type IVideoParserObservable = Observable<IVideoParserResponse>;
export declare type IAudioParserObservable = Observable<IAudioParserResponse>;
export declare type ITextParserObservable = Observable<ITextParserResponse>;
export declare type IImageParserObservable = Observable<IImageParserResponse>;
export declare type IManifestResolverFunction = (x: IManifestLoaderArguments) => Observable<IManifestLoaderArguments>;
export declare type IManifestLoaderFunction = (x: IManifestLoaderArguments) => IManifestLoaderObservable;
export declare type IManifestParserFunction = (x: IManifestParserArguments) => IManifestParserObservable;
export interface ITransportManifestPipeline {
    resolver?: IManifestResolverFunction;
    loader: IManifestLoaderFunction;
    parser: IManifestParserFunction;
}
export declare type ITransportVideoSegmentLoader = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<Uint8Array | ArrayBuffer | null>;
export declare type ITransportVideoSegmentParser = (x: ISegmentParserArguments<Uint8Array | ArrayBuffer | null>) => IVideoParserObservable;
export interface ITransportVideoSegmentPipeline {
    loader: ITransportVideoSegmentLoader;
    parser: ITransportVideoSegmentParser;
}
export declare type ITransportAudioSegmentLoader = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<Uint8Array | ArrayBuffer | null>;
export declare type ITransportAudioSegmentParser = (x: ISegmentParserArguments<Uint8Array | ArrayBuffer | null>) => IAudioParserObservable;
export interface ITransportAudioSegmentPipeline {
    loader: ITransportAudioSegmentLoader;
    parser: ITransportAudioSegmentParser;
}
export declare type ITransportTextSegmentLoader = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<Uint8Array | ArrayBuffer | string | null>;
export declare type ITransportTextSegmentParser = (x: ISegmentParserArguments<Uint8Array | ArrayBuffer | string | null>) => ITextParserObservable;
export interface ITransportTextSegmentPipeline {
    loader: ITransportTextSegmentLoader;
    parser: ITransportTextSegmentParser;
}
export declare type ITransportImageSegmentLoader = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<Uint8Array | ArrayBuffer | null>;
export declare type ITransportImageSegmentParser = (x: ISegmentParserArguments<Uint8Array | ArrayBuffer | null>) => IImageParserObservable;
export interface ITransportImageSegmentPipeline {
    loader: ITransportImageSegmentLoader;
    parser: ITransportImageSegmentParser;
}
export declare type ITransportSegmentPipeline = ITransportAudioSegmentPipeline | ITransportVideoSegmentPipeline | ITransportTextSegmentPipeline | ITransportImageSegmentPipeline;
export declare type ITransportPipeline = ITransportManifestPipeline | ITransportSegmentPipeline;
export interface ITransportPipelines {
    manifest: ITransportManifestPipeline;
    audio: ITransportAudioSegmentPipeline;
    video: ITransportVideoSegmentPipeline;
    text: ITransportTextSegmentPipeline;
    image: ITransportImageSegmentPipeline;
}
interface IServerSyncInfos {
    serverTimestamp: number;
    clientTime: number;
}
export interface ITransportOptions {
    aggressiveMode?: boolean;
    checkMediaSegmentIntegrity?: boolean;
    lowLatencyMode: boolean;
    manifestLoader?: CustomManifestLoader;
    referenceDateTime?: number;
    representationFilter?: IRepresentationFilter;
    segmentLoader?: CustomSegmentLoader;
    serverSyncInfos?: IServerSyncInfos;
    supplementaryImageTracks?: ISupplementaryImageTrack[];
    supplementaryTextTracks?: ISupplementaryTextTrack[];
}
export declare type ITransportFunction = (options: ITransportOptions) => ITransportPipelines;
export declare type CustomSegmentLoader = (args: {
    adaptation: Adaptation;
    representation: Representation;
    segment: ISegment;
    transport: string;
    url: string;
    manifest: Manifest;
}, callbacks: {
    resolve: (args: {
        data: ArrayBuffer | Uint8Array;
        sendingTime?: number;
        receivingTime?: number;
        size?: number;
        duration?: number;
    }) => void;
    progress: (args: {
        duration: number;
        size: number;
        totalSize?: number;
    }) => void;
    reject: (err?: Error) => void;
    fallback?: () => void;
}) => (() => void) | void;
export declare type CustomManifestLoader = (url: string | undefined, callbacks: {
    resolve: (args: {
        data: ILoadedManifest;
        sendingTime?: number;
        receivingTime?: number;
        size?: number;
        duration?: number;
    }) => void;
    reject: (err?: Error) => void;
    fallback?: () => void;
}) => (() => void) | void;
export {};
