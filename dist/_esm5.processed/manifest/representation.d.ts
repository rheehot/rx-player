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
import { IAdaptationType } from "./types";
export interface IContentProtectionsInitDataObject {
    type: string;
    data: Uint8Array;
}
/**
 * Normalized Representation structure.
 * @class Representation
 */
declare class Representation {
    /** ID uniquely identifying the Representation in the Adaptation. */
    readonly id: string | number;
    /**
     * Interface allowing to get information about segments available for this
     * Representation.
     */
    index: IRepresentationIndex;
    /** Bitrate this Representation is in, in bits per seconds. */
    bitrate: number;
    /**
     * Frame-rate, when it can be applied, of this Representation, in any textual
     * indication possible (often under a ratio form).
     */
    frameRate?: string;
    /**
     * A string describing the codec used for this Representation.
     * undefined if we do not know.
     */
    codec?: string;
    /**
     * A string describing the mime-type for this Representation.
     * Examples: audio/mp4, video/webm, application/mp4, text/plain
     * undefined if we do not know.
     */
    mimeType?: string;
    /**
     * If this Representation is linked to video content, this value is the width
     * in pixel of the corresponding video data.
     */
    width?: number;
    /**
     * If this Representation is linked to video content, this value is the height
     * in pixel of the corresponding video data.
     */
    height?: number;
    /** Encryption information for this Representation. */
    contentProtections?: IContentProtections;
    /**
     * Whether we are able to decrypt this Representation / unable to decrypt it or
     * if we don't know yet:
     *   - if `true`, it means that we know we were able to decrypt this
     *     Representation in the current content.
     *   - if `false`, it means that we know we were unable to decrypt this
     *     Representation
     *   - if `undefined` there is no certainty on this matter
     */
    decipherable?: boolean;
    /** `true` if the Representation is in a supported codec, false otherwise. */
    isSupported: boolean;
    /**
     * @param {Object} args
     */
    constructor(args: IParsedRepresentation, opts: {
        type: IAdaptationType;
    });
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
