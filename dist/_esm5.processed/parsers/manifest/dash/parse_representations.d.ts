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
import { Adaptation } from "../../../manifest";
import { IParsedRepresentation } from "../types";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import { IAdaptationSetIntermediateRepresentation } from "./node_parsers/AdaptationSet";
import { IRepresentationIntermediateRepresentation } from "./node_parsers/Representation";
/** Supplementary context needed to parse a Representation. */
export interface IAdaptationInfos {
    /** Whether we should request new segments even if they are not yet finished. */
    aggressiveMode: boolean;
    /** availability time offset of the concerned Adaptation. */
    availabilityTimeOffset: number;
    /** Eventual URLs from which every relative URL will be based on. */
    baseURLs: string[];
    /** Allows to obtain the first available position of a dynamic content. */
    manifestBoundsCalculator: ManifestBoundsCalculator;
    /** End time of the current period, in seconds. */
    end?: number;
    /** Whether the Manifest can evolve with time. */
    isDynamic: boolean;
    /**
     * Time (in terms of `performance.now`) at which the XML file containing this
     * Representation was received.
     */
    receivedTime?: number;
    /** Start time of the current period, in seconds. */
    start: number;
    /** Depth of the buffer for the whole content, in seconds. */
    timeShiftBufferDepth?: number;
    /**
     * The parser should take this Adaptation - which is from a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between both, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousAdaptation: Adaptation | null;
}
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(representationsIR: IRepresentationIntermediateRepresentation[], adaptation: IAdaptationSetIntermediateRepresentation, adaptationInfos: IAdaptationInfos): IParsedRepresentation[];
