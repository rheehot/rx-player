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
import log from "../log";
import { areBytesEqual, concat, } from "../utils/byte_parsing";
/**
 * Normalized Representation structure.
 * @class Representation
 */
var Representation = /** @class */ (function () {
    /**
     * @param {Object} args
     */
    function Representation(args) {
        this.id = args.id;
        this.bitrate = args.bitrate;
        this.codec = args.codecs;
        if (args.height != null) {
            this.height = args.height;
        }
        if (args.width != null) {
            this.width = args.width;
        }
        if (args.mimeType != null) {
            this.mimeType = args.mimeType;
        }
        if (args.contentProtections !== undefined) {
            this.contentProtections = args.contentProtections;
        }
        if (args.frameRate != null) {
            this.frameRate = args.frameRate;
        }
        this.index = args.index;
    }
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    Representation.prototype.getMimeTypeString = function () {
        return this.mimeType + ";codecs=\"" + this.codec + "\"";
    };
    /**
     * Returns every protection initialization data concatenated.
     * This data can then be used through the usual EME APIs.
     * `null` if this Representation has no detected protection initialization
     * data.
     * @returns {Array.<Object>|null}
     */
    Representation.prototype.getProtectionsInitializationData = function () {
        var contentProtections = this.contentProtections;
        if (contentProtections === undefined) {
            return [];
        }
        return Object.keys(contentProtections.initData)
            .reduce(function (acc, initDataType) {
            var initDataArr = contentProtections.initData[initDataType];
            if (initDataArr === undefined || initDataArr.length === 0) {
                return acc;
            }
            var initData = concat.apply(void 0, initDataArr.map(function (_a) {
                var data = _a.data;
                return data;
            }));
            acc.push({ type: initDataType,
                data: initData });
            return acc;
        }, []);
    };
    /**
     * Add protection data to the Representation to be able to properly blacklist
     * it if that data is.
     * /!\ Mutates the current Representation
     * @param {string} initDataArr
     * @param {string} systemId
     * @param {Uint8Array} data
     */
    Representation.prototype._addProtectionData = function (initDataType, systemId, data) {
        var _a;
        var newElement = { systemId: systemId, data: data };
        if (this.contentProtections === undefined) {
            this.contentProtections = { keyIds: [],
                initData: (_a = {}, _a[initDataType] = [newElement], _a) };
            return;
        }
        var initDataArr = this.contentProtections.initData[initDataType];
        if (initDataArr === undefined) {
            this.contentProtections.initData[initDataType] = [newElement];
            return;
        }
        for (var i = initDataArr.length - 1; i >= 0; i--) {
            if (initDataArr[i].systemId === systemId) {
                if (areBytesEqual(initDataArr[i].data, data)) {
                    return;
                }
                log.warn("Manifest: Two PSSH for the same system ID");
            }
        }
        initDataArr.push(newElement);
    };
    return Representation;
}());
export default Representation;
