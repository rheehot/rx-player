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
import { ICustomError } from "../errors";
import { IParsedAdaptation } from "../parsers/manifest";
import Representation from "./representation";
import { IAdaptationType } from "./types";
/** List in an array every possible value for the Adaptation's `type` property. */
export declare const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[];
/**
 * Information describing a single Representation from an Adaptation, to be used
 * in the `representationFilter` API.
 */
export interface IRepresentationInfos {
    bufferType: IAdaptationType;
    language?: string;
    isAudioDescription?: boolean;
    isClosedCaption?: boolean;
    isDub?: boolean;
    isSignInterpreted?: boolean;
    normalizedLanguage?: string;
}
/** Type for the `representationFilter` API. */
export declare type IRepresentationFilter = (representation: Representation, adaptationInfos: IRepresentationInfos) => boolean;
/**
 * Normalized Adaptation structure.
 * An Adaptation describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation {
    /** ID uniquely identifying the Adaptation in the Period. */
    readonly id: string;
    /**
     * Different `Representations` (e.g. qualities) this Adaptation is available
     * in.
     */
    readonly representations: Representation[];
    /** Type of this Adaptation. */
    readonly type: IAdaptationType;
    /** Whether this track contains an audio description for the visually impaired. */
    isAudioDescription?: boolean;
    /** Whether this Adaptation contains closed captions for the hard-of-hearing. */
    isClosedCaption?: boolean;
    /** If true this Adaptation contains sign interpretation. */
    isSignInterpreted?: boolean;
    /**
     * If `true`, this Adaptation is a "dub", meaning it was recorded in another
     * language than the original one.
     */
    isDub?: boolean;
    /** Language this Adaptation is in, as announced in the original Manifest. */
    language?: string;
    /** Language this Adaptation is in, when translated into an ISO639-3 code. */
    normalizedLanguage?: string;
    /**
     * `true` if this Adaptation was not present in the original Manifest, but was
     * manually added after through the corresponding APIs.
     */
    manuallyAdded?: boolean;
    /**
     * `false` if from all Representation from this Adaptation, none is decipherable.
     * `true` if at least one is known to be decipherable.
     * `undefined` if this is not known for at least a single Representation.
     */
    decipherable?: boolean;
    /** `true` if at least one Representation is in a supported codec. `false` otherwise. */
    isSupported: boolean;
    /**
     * Array containing every errors that happened when the Adaptation has been
     * created, in the order they have happened.
     */
    readonly parsingErrors: ICustomError[];
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    constructor(parsedAdaptation: IParsedAdaptation, options?: {
        representationFilter?: IRepresentationFilter;
        isManuallyAdded?: boolean;
    });
    /**
     * Returns unique bitrate for every Representation in this Adaptation.
     * @returns {Array.<Number>}
     */
    getAvailableBitrates(): number[];
    /**
     * Returns all Representation in this Adaptation that can be played (that is:
     * not undecipherable and with a supported codec).
     * @returns {Array.<Representation>}
     */
    getPlayableRepresentations(): Representation[];
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getRepresentation(wantedId: number | string): Representation | undefined;
}
