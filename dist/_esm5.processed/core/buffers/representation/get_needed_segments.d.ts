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
import Manifest, { Adaptation, ISegment, Period, Representation } from "../../../manifest";
import SimpleSet from "../../../utils/simple_set";
import { IBufferedChunk } from "../../source_buffers";
export interface ISegmentFilterArgument {
    content: {
        adaptation: Adaptation;
        manifest: Manifest;
        period: Period;
        representation: Representation;
    };
    fastSwitchingStep: number | undefined;
    loadedSegmentPendingPush: SimpleSet;
    neededRange: {
        start: number;
        end: number;
    };
    segmentInventory: IBufferedChunk[];
}
/**
 * @param {Object} segmentFilterArgument
 * @returns {Array.<Object>}
 */
export default function getNeededSegments({ content, fastSwitchingStep, loadedSegmentPendingPush, neededRange, segmentInventory, }: ISegmentFilterArgument): ISegment[];
