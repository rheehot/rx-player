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
import { IManifestFetcherParsedResult, IManifestFetcherParserOptions } from "../fetchers";
import { IWarningEvent } from "./types";
/** Arguments to give to the `manifestUpdateScheduler` */
export interface IManifestUpdateSchedulerArguments {
    /** Function used to refresh the manifest */
    fetchManifest: IManifestFetcher;
    /** Information about the initial load of the manifest */
    initialManifest: {
        manifest: Manifest;
        sendingTime?: number;
        receivedTime?: number;
        parsingTime: number;
    };
    /** URL at which a shorter version of the Manifest can be found. */
    manifestUpdateUrl: string | undefined;
    /** Minimum interval to keep between Manifest updates */
    minimumManifestUpdateInterval: number;
    /** Allows the rest of the code to ask for a Manifest refresh */
    scheduleRefresh$: IManifestRefreshScheduler;
}
/** Function defined to refresh the Manifest */
export declare type IManifestFetcher = (manifestURL: string | undefined, options: IManifestFetcherParserOptions) => Observable<IManifestFetcherParsedResult | IWarningEvent>;
/** Events sent by the `IManifestRefreshScheduler` Observable */
export interface IManifestRefreshSchedulerEvent {
    /**
     * if `true`, the Manifest should be fully updated.
     * if `false`, a shorter version with just the added information can be loaded
     * instead.
     */
    completeRefresh: boolean;
    /**
     * Optional wanted refresh delay, which is the minimum time you want to wait
     * before updating the Manifest
     */
    delay?: number;
    /**
     * Whether the parsing can be done in the more efficient "unsafeMode".
     * This mode is extremely fast but can lead to de-synchronisation with the
     * server.
     */
    canUseUnsafeMode: boolean;
}
/** Observable to send events related to refresh requests coming from the Player. */
export declare type IManifestRefreshScheduler = Observable<IManifestRefreshSchedulerEvent>;
/**
 * Refresh the Manifest at the right time.
 * @param {Object} manifestUpdateSchedulerArguments
 * @returns {Observable}
 */
export default function manifestUpdateScheduler({ fetchManifest, initialManifest, manifestUpdateUrl, minimumManifestUpdateInterval, scheduleRefresh$, }: IManifestUpdateSchedulerArguments): Observable<IWarningEvent>;
