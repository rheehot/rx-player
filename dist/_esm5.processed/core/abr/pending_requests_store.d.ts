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
export interface IProgressEventValue {
    duration: number;
    id: string | number;
    size: number;
    timestamp: number;
    totalSize: number;
}
export interface IBeginRequestValue {
    id: string | number;
    time: number;
    duration: number;
    requestTimestamp: number;
}
export interface IRequestInfo {
    duration: number;
    progress: IProgressEventValue[];
    requestTimestamp: number;
    time: number;
}
export interface IProgressEventValue {
    duration: number;
    id: string | number;
    size: number;
    timestamp: number;
    totalSize: number;
}
/**
 * Store information about pending requests, like information about:
 *   - for which segments they are
 *   - how the request's progress goes
 * @class PendingRequestsStore
 */
export default class PendingRequestsStore {
    private _currentRequests;
    constructor();
    /**
     * Add information about a new pending request.
     * @param {string} id
     * @param {Object} payload
     */
    add(payload: IBeginRequestValue): void;
    /**
     * Notify of the progress of a currently pending request.
     * @param {Object} progress
     */
    addProgress(progress: IProgressEventValue): void;
    /**
     * Remove a request previously set as pending.
     * @param {string} id
     */
    remove(id: string): void;
    /**
     * Returns information about all pending requests, in segment's chronological
     * order.
     * @returns {Array.<Object>}
     */
    getRequests(): IRequestInfo[];
}
