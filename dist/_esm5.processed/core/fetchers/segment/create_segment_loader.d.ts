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
import { ICustomError } from "../../../errors";
import Manifest, { Adaptation, ISegment, Period, Representation } from "../../../manifest";
import { ILoaderDataLoadedValue, ILoaderProgress, ISegmentLoaderArguments, ISegmentLoaderObservable } from "../../../transports";
import { IBackoffOptions } from "../utils/try_urls_with_backoff";
export declare type ISegmentLoaderProgress = ILoaderProgress;
export interface ISegmentLoaderWarning {
    type: "warning";
    value: ICustomError;
}
export interface ISegmentLoaderMetrics {
    type: "metrics";
    value: {
        size?: number;
        duration?: number;
    };
}
export interface ISegmentLoaderRequest {
    type: "request";
    value: ISegmentLoaderArguments;
}
export interface ISegmentLoaderData<T> {
    type: "data";
    value: {
        responseData: T;
    };
}
export interface ISegmentLoaderChunk {
    type: "chunk";
    value: {
        responseData: null | ArrayBuffer | Uint8Array;
    };
}
export interface ISegmentLoaderChunkComplete {
    type: "chunk-complete";
    value: null;
}
export declare type ISegmentLoaderEvent<T> = ISegmentLoaderData<T> | ISegmentLoaderRequest | ISegmentLoaderProgress | ISegmentLoaderWarning | ISegmentLoaderChunk | ISegmentLoaderChunkComplete | ISegmentLoaderMetrics;
/** Cache implementation to avoid re-requesting segment */
export interface ISegmentLoaderCache<T> {
    /** Add a segment to the cache. */
    add: (obj: ISegmentLoaderContent, arg: ILoaderDataLoadedValue<T>) => void;
    /** Retrieve a segment from the cache */
    get: (obj: ISegmentLoaderContent) => ILoaderDataLoadedValue<T> | null;
}
export declare type ISegmentPipelineLoader<T> = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<T>;
/** Content used by the segment loader as a context to load a new segment. */
export interface ISegmentLoaderContent {
    manifest: Manifest;
    period: Period;
    adaptation: Adaptation;
    representation: Representation;
    segment: ISegment;
}
/**
 * Returns function allowing to download the wanted data through the loader.
 *
 * (The data can be for example: audio and video segments, text,
 * images...)
 *
 * The function returned takes the initial data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a request begins (type "request").
 *     This is not emitted if the value is retrieved from a local js cache.
 *     This event emits the payload as a value.
 *
 *   - as the request progresses (type "progress").
 *
 *   - each time a request ends (type "metrics").
 *     This event contains information about the metrics of the request.
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - Lastly, with the fetched data (type "response").
 *
 *
 * Each of these but "warning" can be emitted at most one time.
 *
 * This observable will throw if, following the options given, the request and
 * possible retry all failed.
 *
 * This observable will complete after emitting the data.
 *
 * Type parameters:
 *   - T: type of the data emitted
 *
 * @param {Function} loader
 * @param {Object | undefined} cache
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentLoader<T>(loader: ISegmentPipelineLoader<T>, cache: ISegmentLoaderCache<T> | undefined, backoffOptions: IBackoffOptions): (x: ISegmentLoaderContent) => Observable<ISegmentLoaderEvent<T>>;
