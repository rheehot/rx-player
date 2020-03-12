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
import { Adaptation, Period, Representation } from "../../manifest";
import { IRange } from "../../utils/ranges";
import { QueuedSourceBuffer } from "../source_buffers";
/**
 * Returns the buffered ranges which hold the given content.
 * Returns the whole buffered ranges if some of it is unknown.
 * @param {Object} queuedSourceBuffer
 * @param {Array.<Object>} contents
 * @returns {Array.<Object>}
 */
export default function getBlacklistedRanges(queuedSourceBuffer: QueuedSourceBuffer<unknown>, contents: Array<{
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
}>): IRange[];
