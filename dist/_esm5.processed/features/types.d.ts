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
import { ICustomSourceBuffer } from "../compat";
import MediaElementTrackChoiceManager from "../core/api/media_element_track_choice_manager";
import { IEMEManagerEvent, IKeySystemOption } from "../core/eme";
import { IDirectfileEvent, IDirectFileOptions } from "../core/init/initialize_directfile";
import { IHTMLTextTracksParserFn, INativeTextTracksParserFn } from "../parsers/texttracks";
import { ITransportFunction } from "../transports";
export declare type IDirectFileInit = (args: IDirectFileOptions) => Observable<IDirectfileEvent>;
interface IContentProtection {
    type: string;
    data: Uint8Array;
}
export declare type IEMEManager = (mediaElement: HTMLMediaElement, keySystems: IKeySystemOption[], contentProtections$: Observable<IContentProtection>) => Observable<IEMEManagerEvent>;
export declare type INativeTextTracksBuffer = new (mediaElement: HTMLMediaElement, hideNativeSubtitle: boolean) => ICustomSourceBuffer<unknown>;
export declare type IHTMLTextTracksBuffer = new (mediaElement: HTMLMediaElement, textTrackElement: HTMLElement) => ICustomSourceBuffer<unknown>;
export declare type IMediaElementTrackChoiceManager = typeof MediaElementTrackChoiceManager;
interface IBifThumbnail {
    index: number;
    duration: number;
    ts: number;
    data: Uint8Array;
}
interface IImageTrackSegmentData {
    data: IBifThumbnail[];
    end: number;
    start: number;
    timescale: number;
    type: string;
}
interface IBifObject {
    fileFormat: string;
    version: string;
    imageCount: number;
    timescale: number;
    format: string;
    width: number;
    height: number;
    aspectRatio: string;
    isVod: boolean;
    thumbs: IBifThumbnail[];
}
export declare type IImageBuffer = new () => ICustomSourceBuffer<IImageTrackSegmentData>;
export declare type IImageParser = ((buffer: Uint8Array) => IBifObject);
export interface IFeaturesObject {
    directfile: {
        initDirectFile: IDirectFileInit;
        mediaElementTrackChoiceManager: IMediaElementTrackChoiceManager;
    } | null;
    emeManager: IEMEManager | null;
    htmlTextTracksBuffer: IHTMLTextTracksBuffer | null;
    htmlTextTracksParsers: Partial<Record<string, IHTMLTextTracksParserFn>>;
    imageBuffer: IImageBuffer | null;
    imageParser: IImageParser | null;
    transports: Partial<Record<string, ITransportFunction>>;
    nativeTextTracksBuffer: INativeTextTracksBuffer | null;
    nativeTextTracksParsers: Partial<Record<string, INativeTextTracksParserFn>>;
}
export declare type IFeatureFunction = (features: IFeaturesObject) => void;
export {};
