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
import Manifest from "../../manifest";
import { IFetchManifestResult } from "../pipelines";
export declare type IManifestFetcher = (manifestURL?: string, externalClockOffset?: number) => Observable<IFetchManifestResult>;
export interface IManifestUpdateSchedulerArguments {
    fetchManifest: IManifestFetcher;
    initialManifest: {
        manifest: Manifest;
        sendingTime?: number;
        receivedTime?: number;
        parsingTime: number;
    };
    manifestUpdateUrl: string | undefined;
    minimumManifestUpdateInterval: number;
    scheduleRefresh$: IManifestRefreshScheduler;
}
export interface IManifestRefreshSchedulerEvent {
    completeRefresh: boolean;
    delay?: number;
}
export declare type IManifestRefreshScheduler = Observable<IManifestRefreshSchedulerEvent>;
/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler({ fetchManifest, initialManifest, manifestUpdateUrl, minimumManifestUpdateInterval, scheduleRefresh$, }: IManifestUpdateSchedulerArguments): Observable<never>;
