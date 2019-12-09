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
import { IParsedManifest } from "../types";
export interface IMPDParserArguments {
    aggressiveMode: boolean;
    externalClockOffset?: number;
    manifestReceivedTime?: number;
    referenceDateTime?: number;
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
