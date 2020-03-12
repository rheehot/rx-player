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
import { Adaptation, ISegment, Period, Representation } from "../../manifest";
interface IBufferedChunkInfos {
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
    segment: ISegment;
}
export interface IBufferedChunk {
    bufferedEnd: number | undefined;
    bufferedStart: number | undefined;
    end: number;
    precizeEnd: boolean;
    precizeStart: boolean;
    infos: IBufferedChunkInfos;
    partiallyPushed: boolean;
    start: number;
}
export interface IInsertedChunkInfos {
    adaptation: Adaptation;
    period: Period;
    representation: Representation;
    segment: ISegment;
    start: number;
    end: number;
}
/**
 * Keep track of every chunk downloaded and currently in the browser's memory.
 *
 * The main point of this class is to know which CDN chunks are already
 * pushed to the SourceBuffer, at which bitrate, and which have been
 * garbage-collected since by the browser (and thus should be re-downloaded).
 * @class SegmentInventory
 */
export default class SegmentInventory {
    private inventory;
    constructor();
    /**
     * Reset the whole inventory.
     */
    reset(): void;
    /**
     * Infer each segment's bufferedStart and bufferedEnd from the TimeRanges
     * given (coming from the SourceBuffer).
     * @param {TimeRanges}
     */
    synchronizeBuffered(buffered: TimeRanges): void;
    /**
     * Add a new segment in the inventory.
     *
     * Note: As new segments can "replace" partially or completely old ones, we
     * have to perform a complex logic and might update previously added segments.
     *
     * @param {Object} chunkInformation
     */
    insertChunk({ period, adaptation, representation, segment, start, end }: IInsertedChunkInfos): void;
    /**
     * Indicate that inserted chunks can now be considered as a complete segment.
     * Take in argument the same content than what was given to `insertChunk` for
     * the corresponding chunks.
     * @param {Object} content
     */
    completeSegment(content: {
        period: Period;
        adaptation: Adaptation;
        representation: Representation;
        segment: ISegment;
    }): void;
    /**
     * @returns {Array.<Object>}
     */
    getInventory(): IBufferedChunk[];
}
export {};
