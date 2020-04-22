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
import { IParsedManifest } from "../parsers/manifest";
import EventEmitter from "../utils/event_emitter";
import Adaptation, { IRepresentationFilter } from "./adaptation";
import Period, { IManifestAdaptations } from "./period";
import Representation from "./representation";
import { IAdaptationType } from "./types";
/**
 * Interface a manually-added supplementary image track should respect.
 * @deprecated
 */
interface ISupplementaryImageTrack {
    /** mime-type identifying the type of container for the track. */
    mimeType: string;
    /** URL to the thumbnails file */
    url: string;
}
/**
 * Interface a manually-added supplementary text track should respect.
 * @deprecated
 */
interface ISupplementaryTextTrack {
    /** mime-type identifying the type of container for the track. */
    mimeType: string;
    /** codecs in the container (mimeType can be enough) */
    codecs?: string;
    /** URL to the text track file */
    url: string;
    /** ISO639-{1,2,3} code for the language of the track */
    language?: string;
    /**
     * Same as `language`, but in an Array.
     * Kept for compatibility with old API.
     * @deprecated
     */
    languages?: string[];
    /** If true, the track are closed captions. */
    closedCaption: boolean;
}
/** Options given to the `Manifest` constructor. */
interface IManifestParsingOptions {
    /** Text tracks to add manually to the Manifest instance. */
    supplementaryTextTracks?: ISupplementaryTextTrack[];
    /** Image tracks to add manually to the Manifest instance. */
    supplementaryImageTracks?: ISupplementaryImageTrack[];
    /** External callback peforming an automatic filtering of wanted Representations. */
    representationFilter?: IRepresentationFilter;
}
/** Representation affected by a `decipherabilityUpdate` event. */
export interface IDecipherabilityUpdateElement {
    manifest: Manifest;
    period: Period;
    adaptation: Adaptation;
    representation: Representation;
}
/** Events emitted by a `Manifest` instance */
export interface IManifestEvents {
    /** The Manifest has been updated */
    manifestUpdate: null;
    /** Some Representation's decipherability status has been updated */
    decipherabilityUpdate: IDecipherabilityUpdateElement[];
}
/**
 * Normalized Manifest structure.
 *
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth, DASH etc.).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a dynamic manifest or when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 *
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
    /** ID uniquely identifying this Manifest. */
    readonly id: string;
    /** Type of transport used by this Manifest (e.g. `"dash"` or `"smooth"`). */
    transport: string;
    /**
     * List every Period in that Manifest chronologically (from start to end).
     * A Period contains information about the content available for a specific
     * period of time.
     */
    readonly periods: Period[];
    /** When that promise resolves, the whole Manifest needs to be updated */
    expired: Promise<void> | null;
    /**
     * Deprecated. Equivalent to manifest.periods[0].adaptations.
     * @deprecated
     */
    adaptations: IManifestAdaptations;
    /**
     * If true, the Manifest can evolve over time. New content can be downloaded,
     * properties of the manifest can be changed.
     */
    isDynamic: boolean;
    /**
     * If true, this Manifest describes a live content.
     * A live content is a specific kind of dynamic content where you want to play
     * as close as possible to the maximum position.
     * E.g., a TV channel is a live content.
     */
    isLive: boolean;
    uris: string[];
    /**
     * Suggested delay from the "live edge" the content is suggested to start
     * from.
     * This only applies to live contents.
     */
    suggestedPresentationDelay?: number;
    /**
     * Amount of time, in seconds, this Manifest is valid from its fetching time.
     * If not valid, you will need to refresh and update this Manifest (the latter
     * can be done through the `update` method).
     * If no lifetime is set, this Manifest does not become invalid after an
     * amount of time.
     */
    lifetime?: number;
    /**
     * Minimum time, in seconds, at which a segment defined in the Manifest
     * can begin.
     * This is also used as an offset for live content to apply to a segment's
     * time.
     */
    availabilityStartTime?: number;
    /** Information about the first seekable position. */
    minimumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    /** Information about the last seekable position. */
    maximumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    /**
     * Array containing every minor errors that happened when the Manifest has
     * been created, in the order they have happened.
     */
    parsingErrors: ICustomError[];
    clockOffset: number | undefined;
    /**
     * Construct a Manifest instance from a parsed Manifest object (as returned by
     * Manifest parsers) and options.
     *
     * Some minor errors can arise during that construction. `this.parsingErrors`
     * will contain all such errors, in the order they have been encountered.
     * @param {Object} parsedManifest
     * @param {Object} options
     */
    constructor(parsedManifest: IParsedManifest, options: IManifestParsingOptions);
    /**
     * Returns the Period corresponding to the given `id`.
     * Returns `undefined` if there is none.
     * @param {string} id
     * @returns {Object|undefined}
     */
    getPeriod(id: string): Period | undefined;
    /**
     * Returns the Period encountered at the given time.
     * Returns `undefined` if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getPeriodForTime(time: number): Period | undefined;
    /**
     * Returns the Period coming chronologically just after another given Period.
     * Returns `undefined` if not found.
     * @param {Object} period
     * @returns {Object|null}
     */
    getPeriodAfter(period: Period): Period | null;
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * `undefined` if no URL is found.
     * @returns {string|undefined}
     */
    getUrl(): string | undefined;
    /**
     * Update the current Manifest properties by giving a new updated version.
     * This instance will be updated with the new information coming from it.
     * @param {Object} newManifest
     */
    replace(newManifest: Manifest): void;
    /**
     * Update the current Manifest properties by giving a new but shorter version
     * of it.
     * This instance will add the new information coming from it and will
     * automatically clean old Periods that shouldn't be available anymore.
     *
     * /!\ Throws if the given Manifest cannot be used or is not sufficient to
     * update the Manifest.
     * @param {Object} newManifest
     */
    update(newManifest: Manifest): void;
    /**
     * Get the minimum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMinimumPosition(): number;
    /**
     * Get the maximum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMaximumPosition(): number;
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "blacklist-update" event to notify everyone of the changes
     * performed.
     * @param {Array.<ArrayBuffer>} keyIDs
     */
    addUndecipherableKIDs(keyIDs: ArrayBuffer[]): void;
    /**
     * Look in the Manifest for Representations linked to the given content
     * protection initialization data and mark them as being impossible to
     * decrypt.
     * Then trigger a "blacklist-update" event to notify everyone of the changes
     * performed.
     * @param {Array.<ArrayBuffer>} keyIDs
     */
    addUndecipherableProtectionData(initDataType: string, initData: Uint8Array): void;
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: IAdaptationType): Adaptation[];
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptation(wantedId: number | string): Adaptation | undefined;
    /**
     * Add supplementary image Adaptation(s) to the manifest.
     * @private
     * @param {Object|Array.<Object>} imageTracks
     */
    private addSupplementaryImageAdaptations;
    /**
     * Add supplementary text Adaptation(s) to the manifest.
     * @private
     * @param {Object|Array.<Object>} textTracks
     */
    private addSupplementaryTextAdaptations;
    /**
     * @param {Object} newManifest
     * @param {number} type
     */
    private _performUpdate;
}
export { IManifestParsingOptions, ISupplementaryImageTrack, ISupplementaryTextTrack, };
