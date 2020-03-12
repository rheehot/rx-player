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
import { IRepresentationIndex, ISegment } from "../../../manifest";
import { ILocalIndex } from "./types";
export default class LocalRepresentationIndex implements IRepresentationIndex {
    private _index;
    private _representationId;
    private _isFinished;
    constructor(index: ILocalIndex, representationId: string, isFinished: boolean);
    /**
     * @returns {Object}
     */
    getInitSegment(): ISegment | null;
    /**
     * @param {Number} up
     * @param {Number} duration
     * @returns {Array.<Object>}
     */
    getSegments(up: number, duration: number): ISegment[];
    /**
     * @returns {Number|undefined}
     */
    getFirstPosition(): number | undefined;
    /**
     * @returns {Number|undefined}
     */
    getLastPosition(): number | undefined;
    /**
     * @returns {Boolean}
     */
    shouldRefresh(): false;
    /**
     * @returns {Boolean}
     */
    isSegmentStillAvailable(): true;
    isFinished(): boolean;
    /**
     * @returns {Boolean}
     */
    canBeOutOfSyncError(): false;
    /**
     * @returns {Number}
     */
    checkDiscontinuity(): -1;
    _replace(newIndex: LocalRepresentationIndex): void;
    _update(newIndex: LocalRepresentationIndex): void;
    _addSegments(): void;
}
