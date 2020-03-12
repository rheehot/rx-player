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
export interface IIndexSegment {
    start: number;
    duration: number;
    repeatCount: number;
    range?: [number, number];
}
/**
 * Calculate the number of times a timeline element repeats based on the next
 * element.
 * @param {Object} element
 * @param {Object} nextElement
 * @param {number} maxPosition
 * @returns {Number}
 */
export declare function calculateRepeat(element: IIndexSegment, nextElement?: IIndexSegment | null, maxPosition?: number): number;
/**
 * Returns end of the segment given, in index time.
 * @param {Object} segment
 * @param {Object|null} [nextSegment]
 * @param {number} maxPosition
 * @returns {Number}
 */
export declare function getIndexSegmentEnd(segment: IIndexSegment, nextSegment: IIndexSegment | null, maxPosition?: number): number;
/**
 * Convert from `presentationTime`, the time of the segment at the moment it
 * is decoded to `mediaTime`, the original time the segments point at.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
export declare function toIndexTime(time: number, indexOptions: {
    timescale: number;
    indexTimeOffset: number;
}): number;
/**
 * Convert from `mediaTime`, the original time the segments point at to
 * `presentationTime`, the time of the segment at the moment it is decoded.
 * @param {number} time
 * @param {Object} indexOptions
 * @returns {number}
 */
export declare function fromIndexTime(time: number, indexOptions: {
    timescale: number;
    indexTimeOffset: number;
}): number;
/**
 * @param {Number} start
 * @param {Number} duration
 * @param {Number} timescale
 * @returns {Object} - Object with two properties:
 *   - up {Number}: timescaled timestamp of the beginning time
 *   - to {Number}: timescaled timestamp of the end time (start time + duration)
 */
export declare function getTimescaledRange(start: number, duration: number, timescale: number): [number, number];
