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
import Manifest from "../../../manifest";
import { IParsedManifest } from "../types";
/** Possible options for `parseMPD`.  */
export interface IMPDParserArguments {
    /** Whether we should request new segments even if they are not yet finished. */
    aggressiveMode: boolean;
    /**
     * If set, offset to add to `performance.now()` to obtain the current server's
     * time.
     */
    externalClockOffset?: number;
    /** Time, in terms of `performance.now` at which this MPD was received. */
    manifestReceivedTime?: number;
    /** Default base time, in seconds. */
    referenceDateTime?: number;
    /**
     * The parser should take this Manifest - which is a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between the two, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousManifest: Manifest | null;
    /** URL of the manifest (post-redirection if one). */
    url?: string;
}
interface ILoadedResource {
    url?: string;
    sendingTime?: number;
    receivedTime?: number;
    responseData: string;
}
export declare type IParserResponse<T> = {
    type: "needs-ressources";
    value: {
        ressources: string[];
        continue: (loadedRessources: ILoadedResource[]) => IParserResponse<T>;
    };
} | {
    type: "done";
    value: T;
};
/**
 * @param {Element} root - The MPD root.
 * @param {Object} args
 * @returns {Object}
 */
export default function parseMPD(root: Element, args: IMPDParserArguments): IParserResponse<IParsedManifest>;
export {};
