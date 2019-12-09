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
import Adaptation, { IAdaptationType, IRepresentationFilter } from "./adaptation";
import Period from "./period";
import Representation from "./representation";
declare type ManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;
interface ISupplementaryImageTrack {
    mimeType: string;
    url: string;
}
interface ISupplementaryTextTrack {
    mimeType: string;
    codecs?: string;
    url: string;
    language?: string;
    languages?: string[];
    closedCaption: boolean;
}
interface IManifestParsingOptions {
    supplementaryTextTracks?: ISupplementaryTextTrack[];
    supplementaryImageTracks?: ISupplementaryImageTrack[];
    representationFilter?: IRepresentationFilter;
}
export interface IDecipherabilityUpdateElement {
    manifest: Manifest;
    period: Period;
    adaptation: Adaptation;
    representation: Representation;
}
export interface IManifestEvents {
    manifestUpdate: null;
    decipherabilityUpdate: IDecipherabilityUpdateElement[];
}
/**
 * Normalized Manifest structure.
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth or DASH).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a live manifest of when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 * @class Manifest
 */
export default class Manifest extends EventEmitter<IManifestEvents> {
    id: string;
    transport: string;
    adaptations: ManifestAdaptations;
    readonly periods: Period[];
    isLive: boolean;
    uris: string[];
    suggestedPresentationDelay?: number;
    baseURL?: string;
    lifetime?: number;
    availabilityStartTime?: number;
    minimumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    maximumTime?: {
        isContinuous: boolean;
        value: number;
        time: number;
    };
    parsingErrors: ICustomError[];
    private _clockOffset;
    /**
     * @param {Object} args
     */
    constructor(args: IParsedManifest, options: IManifestParsingOptions);
    /**
     * Returns Period corresponding to the given ID.
     * Returns undefined if there is none.
     * @param {string} id
     * @returns {Period|undefined}
     */
    getPeriod(id: string): Period | undefined;
    /**
     * Returns Period encountered at the given time.
     * Returns undefined if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Period|undefined}
     */
    getPeriodForTime(time: number): Period | undefined;
    /**
     * Returns period coming just after a given period.
     * Returns undefined if not found.
     * @param {Period} period
     * @returns {Period|null}
     */
    getPeriodAfter(period: Period): Period | null;
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * @returns {string|undefined}
     */
    getUrl(): string | undefined;
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
     * Update the current manifest properties
     * @param {Object} Manifest
     */
    update(newManifest: Manifest): void;
    /**
     * Get minimum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMinimumPosition(): number;
    /**
     * Get maximum position currently defined by the Manifest, in seconds.
     * @returns {number}
     */
    getMaximumPosition(): number;
    /**
     * If true, this Manifest is currently synchronized with the server's clock.
     * @returns {Boolean}
     */
    getClockOffset(): number | undefined;
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "blacklist-update" event to notify everyone of the changes
     * performed.
     * @param {Array.<ArrayBuffer>} keyIDs
     */
    addUndecipherableKIDs(keyIDs: ArrayBuffer[]): void;
    /**
     * Look in the Manifest for Representations linked to the given init data
     * and mark them as being impossible to decrypt.
     * Then trigger a "blacklist-update" event to notify everyone of the changes
     * performed.
     * @param {Array.<ArrayBuffer>} keyIDs
     */
    addUndecipherableProtectionData(initDataType: string, initData: Uint8Array): void;
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
}
export { IManifestParsingOptions, ISupplementaryImageTrack, ISupplementaryTextTrack, };
