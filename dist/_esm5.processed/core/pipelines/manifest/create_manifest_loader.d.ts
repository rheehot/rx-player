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
import { ILoadedManifest, IManifestLoaderArguments, ITransportManifestPipeline } from "../../../transports";
export interface IPipelineLoaderWarning {
    type: "warning";
    value: ICustomError;
}
export interface IPipelineLoaderResponseValue<T> {
    responseData: T;
    url?: string;
    sendingTime?: number;
    receivedTime?: number;
}
export interface IPipelineLoaderResponse<T> {
    type: "response";
    value: IPipelineLoaderResponseValue<T>;
}
export declare type IManifestPipelineLoaderResponse = IPipelineLoaderResponse<ILoadedManifest>;
export declare type IManifestPipelineLoaderEvent = IManifestPipelineLoaderResponse | IPipelineLoaderWarning;
export interface IManifestPipelineLoaderOptions {
    maxRetry: number;
    maxRetryOffline: number;
    baseDelay: number;
    maxDelay: number;
}
/**
 * Returns function allowing to download the Manifest through a resolver ->
 * loader -> parser pipeline.
 *
 * The function returned takes the loader's data in arguments and returns an
 * Observable which will emit:
 *
 *   - each time a minor request error is encountered (type "warning").
 *     With the error as a value.
 *
 *   - The fetched data (type "response").
 *
 * This observable will throw if, following the options given, the request and
 * possible retries all failed.
 *
 * @param {Object} manifestPipeline
 * @param {Object} options
 * @returns {Function}
 */
export default function createManifestLoader(manifestPipeline: ITransportManifestPipeline, options: IManifestPipelineLoaderOptions): (x: IManifestLoaderArguments) => Observable<IManifestPipelineLoaderEvent>;
