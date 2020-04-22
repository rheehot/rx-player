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
import { IParsedPeriod } from "../types";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";
/** Information about each linked Xlink. */
export declare type IXLinkInfos = WeakMap<IPeriodIntermediateRepresentation, {
    /** Real URL (post-redirection) used to download this xlink. */
    url?: string;
    /** Time at which the request was sent (since the time origin), in ms. */
    sendingTime?: number;
    /** Time at which the request was received (since the time origin), in ms. */
    receivedTime?: number;
}>;
/** Context needed when calling `parsePeriods`. */
export interface IPeriodsContextInfos {
    /** Whether we should request new segments even if they are not yet finished. */
    aggressiveMode: boolean;
    availabilityTimeOffset: number;
    availabilityStartTime: number;
    baseURLs: string[];
    clockOffset?: number;
    duration?: number;
    isDynamic: boolean;
    /**
     * Time (in terms of `performance.now`) at which the XML file containing this
     * Period was received.
     */
    receivedTime?: number;
    /** Depth of the buffer for the whole content, in seconds. */
    timeShiftBufferDepth?: number;
    /**
     * The parser should take this Manifest - which is a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between the two, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousManifest: Manifest | null;
    xlinkInfos: IXLinkInfos;
}
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} contextInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(periodsIR: IPeriodIntermediateRepresentation[], contextInfos: IPeriodsContextInfos): IParsedPeriod[];
