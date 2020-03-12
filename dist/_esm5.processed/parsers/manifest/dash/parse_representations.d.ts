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
import { IParsedRepresentation } from "../types";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import { IAdaptationSetIntermediateRepresentation } from "./node_parsers/AdaptationSet";
import { IRepresentationIntermediateRepresentation } from "./node_parsers/Representation";
export interface IAdaptationInfos {
    aggressiveMode: boolean;
    availabilityTimeOffset: number;
    baseURLs: string[];
    manifestBoundsCalculator: ManifestBoundsCalculator;
    end?: number;
    isDynamic: boolean;
    receivedTime?: number;
    start: number;
    timeShiftBufferDepth?: number;
}
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(representationsIR: IRepresentationIntermediateRepresentation[], adaptation: IAdaptationSetIntermediateRepresentation, adaptationInfos: IAdaptationInfos): IParsedRepresentation[];
