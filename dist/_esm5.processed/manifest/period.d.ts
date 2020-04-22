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
import { IParsedPeriod } from "../parsers/manifest";
import Adaptation, { IRepresentationFilter } from "./adaptation";
import { IAdaptationType } from "./types";
/** Structure listing every `Adaptation` in a Period. */
export declare type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
export default class Period {
    /** ID uniquely identifying the Period in the Manifest. */
    readonly id: string;
    /** Every 'Adaptation' in that Period, per type of Adaptation. */
    adaptations: IManifestAdaptations;
    /** Absolute start time of the Period, in seconds. */
    start: number;
    /**
     * Duration of this Period, in seconds.
     * `undefined` for still-running Periods.
     */
    duration?: number;
    /**
     * Absolute end time of the Period, in seconds.
     * `undefined` for still-running Periods.
     */
    end?: number;
    /**
     * Array containing every errors that happened when the Period has been
     * created, in the order they have happened.
     */
    readonly parsingErrors: ICustomError[];
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    constructor(args: IParsedPeriod, representationFilter?: IRepresentationFilter);
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    getAdaptations(): Adaptation[];
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType: IAdaptationType): Adaptation[];
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getAdaptation(wantedId: string): Adaptation | undefined;
    getPlayableAdaptations(type?: IAdaptationType): Adaptation[];
}
