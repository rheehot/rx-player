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
/**
 * Map initialization data to another property.
 * @class InitDataStore
 */
export default class InitDataStore<T> {
    private _namedTypeData;
    private _unnamedTypeData;
    constructor();
    /**
     * Returns true if this instance has the given initData stored.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     * @returns {boolean}
     */
    get(initDataType: string | undefined, initData: Uint8Array): T | undefined;
    /**
     * Add initialization data to this memory.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     */
    set(initDataType: string | undefined, initData: Uint8Array, data: T): void;
    /**
     * Remove the initialization data from this memory.
     * Returns true if this instance had the given initData stored.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     * @returns {boolean}
     */
    remove(initDataType: string | undefined, initData: Uint8Array): boolean;
}
