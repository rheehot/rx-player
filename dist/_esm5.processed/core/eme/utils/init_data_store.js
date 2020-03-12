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
import hashBuffer from "../../../utils/hash_buffer";
import isNonEmptyString from "../../../utils/is_non_empty_string";
/**
 * Map initialization data to another property.
 * @class InitDataStore
 */
var InitDataStore = /** @class */ (function () {
    function InitDataStore() {
        this._namedTypeData = {};
        this._unnamedTypeData = {};
    }
    /**
     * Returns true if this instance has the given initData stored.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     * @returns {boolean}
     */
    InitDataStore.prototype.get = function (initDataType, initData) {
        if (!isNonEmptyString(initDataType)) {
            return this._unnamedTypeData[hashBuffer(initData)];
        }
        var forDataType = this._namedTypeData[initDataType];
        if (forDataType == null) {
            return undefined;
        }
        return forDataType[hashBuffer(initData)];
    };
    /**
     * Add initialization data to this memory.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     */
    InitDataStore.prototype.set = function (initDataType, initData, data) {
        var _a;
        var hashed = hashBuffer(initData);
        if (!isNonEmptyString(initDataType)) {
            this._unnamedTypeData[hashed] = data;
            return;
        }
        var forDataType = this._namedTypeData[initDataType];
        if (forDataType == null) {
            this._namedTypeData[initDataType] = (_a = {}, _a[hashed] = data, _a);
        }
        else {
            forDataType[hashed] = data;
        }
    };
    /**
     * Remove the initialization data from this memory.
     * Returns true if this instance had the given initData stored.
     * @param {Uint8Array} initData
     * @param {string|undefined} initDataType
     * @returns {boolean}
     */
    InitDataStore.prototype.remove = function (initDataType, initData) {
        if (!isNonEmptyString(initDataType)) {
            var hashed = hashBuffer(initData);
            if (this._unnamedTypeData.hasOwnProperty(hashed)) {
                delete this._unnamedTypeData[hashed];
                return true;
            }
            return false;
        }
        else {
            if (!this._namedTypeData.hasOwnProperty(initDataType)) {
                return false;
            }
            var dataForType = this._namedTypeData[initDataType];
            var hashed = hashBuffer(initData);
            if (dataForType.hasOwnProperty(hashed)) {
                delete dataForType[hashed];
                return true;
            }
            return false;
        }
    };
    return InitDataStore;
}());
export default InitDataStore;
