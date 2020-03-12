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
import { ICustomError } from "../../../errors";
import { IBaseContentInfos, IRepresentationIndex, ISegment } from "../../../manifest";
/**
 * The MetaRepresentationIndex is wrapper for all kind of indexes (dash, smooth, etc)
 *
 * It wraps methods from origin indexes, while taking into account of the offset induced
 * by metaplaylist. It makes a bridge between the metaplaylist timeline, and the original
 * timeline of content. (e.g. the segment whose "meta" time is 1500, is actually a
 * segment whose original time is 200, played with an offset of 1300)
 */
export default class MetaRepresentationIndex implements IRepresentationIndex {
    protected _wrappedIndex: IRepresentationIndex;
    private _timeOffset;
    private _contentEnd;
    private _transport;
    private _baseContentInfos;
    constructor(wrappedIndex: IRepresentationIndex, contentBounds: [number, number | undefined], transport: string, baseContentInfos: IBaseContentInfos);
    getInitSegment(): ISegment | null;
    getSegments(up: number, duration: number): ISegment[];
    shouldRefresh(): boolean;
    getFirstPosition(): number | undefined;
    getLastPosition(): number | undefined;
    isSegmentStillAvailable(segment: ISegment): boolean | undefined;
    /**
     * @param {Error} error
     * @returns {Boolean}
     */
    canBeOutOfSyncError(error: ICustomError): boolean;
    checkDiscontinuity(time: number): number;
    isFinished(): boolean;
    _replace(newIndex: IRepresentationIndex): void;
    _update(newIndex: IRepresentationIndex): void;
    _addSegments(nextSegments: Array<{
        time: number;
        duration: number;
        timescale: number;
        count?: number;
        range?: [number, number];
    }>, currentSegment?: {
        duration?: number;
        time: number;
        timescale?: number;
    }): void;
}
