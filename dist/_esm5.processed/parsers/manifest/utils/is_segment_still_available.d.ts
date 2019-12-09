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
import { ISegment } from "../../../manifest";
import { IIndexSegment } from "./index_helpers";
/**
 * Returns true if a Segment returned by the corresponding index is still
 * considered available.
 * Returns false if it is not available anymore.
 * Returns undefined if we cannot know whether it is still available or not.
 * /!\ We do not check the mediaURL of the segment.
 * @param {Object} segment
 * @param {Array.<Object>} timescale
 * @param {number} timeline
 * @returns {Boolean|undefined}
 */
export default function isSegmentStillAvailable(segment: ISegment, timeline: IIndexSegment[], timescale: number, indexTimeOffset: number): boolean | undefined;
