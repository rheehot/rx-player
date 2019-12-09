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
import { ILoaderDataLoadedValue, ILoaderProgress, ISegmentLoaderArguments, ISegmentLoaderObservable } from "../../../transports";
export declare type IPipelineLoaderProgress = ILoaderProgress;
export interface IPipelineLoaderWarning {
    type: "warning";
    value: ICustomError;
}
export interface IPipelineLoaderMetrics {
    type: "metrics";
    value: {
        size?: number;
        duration?: number;
    };
}
export interface IPipelineLoaderRequest {
    type: "request";
    value: ISegmentLoaderArguments;
}
export interface IPipelineLoaderData<T> {
    type: "data";
    value: {
        responseData: T;
    };
}
export interface IPipelineLoaderChunk {
    type: "chunk";
    value: {
        responseData: null | ArrayBuffer | Uint8Array;
    };
}
export interface IPipelineLoaderChunkComplete {
    type: "chunk-complete";
    value: null;
}
export declare type IPipelineLoaderEvent<T> = IPipelineLoaderData<T> | IPipelineLoaderRequest | IPipelineLoaderProgress | IPipelineLoaderWarning | IPipelineLoaderChunk | IPipelineLoaderChunkComplete | IPipelineLoaderMetrics;
export interface ISegmentPipelineLoaderOptions<T> {
    cache?: {
        add: (obj: ISegmentLoaderArguments, arg: ILoaderDataLoadedValue<T>) => void;
        get: (obj: ISegmentLoaderArguments) => ILoaderDataLoadedValue<T>;
    };
    maxRetry: number;
    maxRetryOffline: number;
    initialBackoffDelay: number;
    maximumBackoffDelay: number;
}
export declare type ISegmentPipelineLoader<T> = (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<T>;
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
 * @param {Object} segmentPipeline
 * @param {Object} options
 * @returns {Function}
 */
export default function createSegmentLoader<T>(loader: ISegmentPipelineLoader<T>, options: ISegmentPipelineLoaderOptions<T>): (x: ISegmentLoaderArguments) => Observable<IPipelineLoaderEvent<T>>;
