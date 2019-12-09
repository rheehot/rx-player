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
import { IContentProtections, IParsedRepresentation } from "../parsers/manifest";
import IRepresentationIndex from "./representation_index";
export interface IContentProtectionsInitDataObject {
    type: string;
    data: Uint8Array;
}
/**
 * Normalized Representation structure.
 * @class Representation
 */
declare class Representation {
    readonly id: string | number;
    index: IRepresentationIndex;
    bitrate: number;
    frameRate?: string;
    codec?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    contentProtections?: IContentProtections;
    decipherable?: boolean;
    /**
     * @param {Object} args
     */
    constructor(args: IParsedRepresentation);
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    getMimeTypeString(): string;
    /**
     * Returns every protection initialization data concatenated.
     * This data can then be used through the usual EME APIs.
     * `null` if this Representation has no detected protection initialization
     * data.
     * @returns {Array.<Object>|null}
     */
    getProtectionsInitializationData(): IContentProtectionsInitDataObject[];
    /**
     * Add protection data to the Representation to be able to properly blacklist
     * it if that data is.
     * /!\ Mutates the current Representation
     * @param {string} initDataArr
     * @param {string} systemId
     * @param {Uint8Array} data
     */
    _addProtectionData(initDataType: string, systemId: string, data: Uint8Array): void;
}
export default Representation;
