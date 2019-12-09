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
import { ISegment } from "../../../../manifest";
import { IIndexSegment } from "../../utils/index_helpers";
/**
 * Get a list of Segments for the time range wanted.
 * @param {Object} index - index object, constructed by parsing the manifest.
 * @param {number} from - starting timestamp wanted, in seconds
 * @param {number} durationWanted - duration wanted, in seconds
 * @returns {Array.<Object>}
 */
export default function getSegmentsFromTimeline(index: {
    mediaURL: string;
    startNumber?: number;
    timeline: IIndexSegment[];
    timescale: number;
    indexTimeOffset: number;
}, from: number, durationWanted: number, maximumTime?: number): ISegment[];
