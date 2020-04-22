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
export declare type ILocalManifestInitSegmentLoader = (callbacks: {
    resolve: (args: {
        data: ArrayBuffer | null;
    }) => void;
    reject: (err?: Error) => void;
}) => (() => void) | void;
export declare type ILocalManifestSegmentLoader = (segment: ILocalIndexSegment, // Same than the segment from `segments`
callbacks: {
    resolve: (args: {
        data: ArrayBuffer;
    }) => void;
    reject: (err?: Error) => void;
}) => (() => void) | void;
export interface IContentProtectionKID {
    keyId: Uint8Array;
    systemId?: string;
}
export interface IContentProtectionInitData {
    systemId: string;
    data: Uint8Array;
}
export interface IContentProtections {
    keyIds: IContentProtectionKID[];
    initData: Partial<Record<string, IContentProtectionInitData[]>>;
}
export interface ILocalIndexSegment {
    time: number;
    duration: number;
    timestampOffset?: number;
}
export interface ILocalIndex {
    loadInitSegment: ILocalManifestInitSegmentLoader;
    loadSegment: ILocalManifestSegmentLoader;
    segments: ILocalIndexSegment[];
}
export interface ILocalRepresentation {
    bitrate: number;
    contentProtections?: IContentProtections;
    mimeType: string;
    codecs: string;
    width?: number;
    height?: number;
    index: ILocalIndex;
}
export interface ILocalAdaptation {
    type: "audio" | "video" | "text";
    audioDescription?: boolean;
    closedCaption?: boolean;
    language?: string;
    representations: ILocalRepresentation[];
}
export interface ILocalPeriod {
    start: number;
    duration: number;
    adaptations: ILocalAdaptation[];
}
export interface ILocalManifest {
    type: "local";
    version: string;
    duration: number;
    expired?: Promise<void>;
    periods: ILocalPeriod[];
    isFinished: boolean;
}
