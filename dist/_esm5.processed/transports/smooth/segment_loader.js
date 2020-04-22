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
import { Observable, of as observableOf, } from "rxjs";
import assert from "../../utils/assert";
import request from "../../utils/request";
import byteRange from "../utils/byte_range";
import { createAudioInitSegment, createVideoInitSegment, } from "./isobmff";
/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(_a) {
    var url = _a.url, segment = _a.segment;
    var headers;
    var range = segment.range;
    if (Array.isArray(range)) {
        headers = { Range: byteRange(range) };
    }
    return request({ url: url,
        responseType: "arraybuffer",
        headers: headers,
        sendProgressEvents: true });
}
/**
 * Defines the url for the request, load the right loader (custom/default
 * one).
 */
var generateSegmentLoader = function (customSegmentLoader) { return function (_a) {
    var segment = _a.segment, representation = _a.representation, adaptation = _a.adaptation, period = _a.period, manifest = _a.manifest, url = _a.url;
    if (segment.isInit) {
        if (segment.privateInfos === undefined ||
            segment.privateInfos.smoothInit === undefined) {
            throw new Error("Smooth: Invalid segment format");
        }
        var smoothInitPrivateInfos = segment.privateInfos.smoothInit;
        var responseData = void 0;
        var codecPrivateData = smoothInitPrivateInfos.codecPrivateData, _b = smoothInitPrivateInfos.protection, protection = _b === void 0 ? { keyId: undefined,
            keySystems: undefined } : _b;
        if (codecPrivateData === undefined) {
            throw new Error("Smooth: no codec private data.");
        }
        switch (adaptation.type) {
            case "video": {
                var _c = representation.width, width = _c === void 0 ? 0 : _c, _d = representation.height, height = _d === void 0 ? 0 : _d;
                responseData = createVideoInitSegment(segment.timescale, width, height, 72, 72, 4, // vRes, hRes, nal
                codecPrivateData, protection.keyId, protection.keySystems);
                break;
            }
            case "audio": {
                var _e = smoothInitPrivateInfos.channels, channels = _e === void 0 ? 0 : _e, _f = smoothInitPrivateInfos.bitsPerSample, bitsPerSample = _f === void 0 ? 0 : _f, _g = smoothInitPrivateInfos.packetSize, packetSize = _g === void 0 ? 0 : _g, _h = smoothInitPrivateInfos.samplingRate, samplingRate = _h === void 0 ? 0 : _h;
                responseData = createAudioInitSegment(segment.timescale, channels, bitsPerSample, packetSize, samplingRate, codecPrivateData, protection.keyId, protection.keySystems);
                break;
            }
            default:
                if (false) {
                    assert(false, "responseData should have been set");
                }
                responseData = new Uint8Array(0);
        }
        return observableOf({ type: "data-created",
            value: { responseData: responseData } });
    }
    else if (url === null) {
        return observableOf({ type: "data-created",
            value: { responseData: null } });
    }
    else {
        var args_1 = { adaptation: adaptation,
            manifest: manifest,
            period: period,
            representation: representation,
            segment: segment,
            transport: "smooth",
            url: url };
        if (typeof customSegmentLoader !== "function") {
            return regularSegmentLoader(args_1);
        }
        return new Observable(function (obs) {
            var hasFinished = false;
            var hasFallbacked = false;
            /**
             * Callback triggered when the custom segment loader has a response.
             * @param {Object} args
             */
            var resolve = function (_args) {
                if (!hasFallbacked) {
                    hasFinished = true;
                    obs.next({ type: "data-loaded",
                        value: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration } });
                    obs.complete();
                }
            };
            /**
             * Callback triggered when the custom segment loader fails
             * @param {*} err - The corresponding error encountered
             */
            var reject = function (err) {
                if (err === void 0) { err = {}; }
                if (!hasFallbacked) {
                    hasFinished = true;
                    obs.error(err);
                }
            };
            var progress = function (_args) {
                if (!hasFallbacked) {
                    obs.next({ type: "progress", value: { duration: _args.duration,
                            size: _args.size,
                            totalSize: _args.totalSize } });
                }
            };
            var fallback = function () {
                hasFallbacked = true;
                // HACK What is TypeScript/RxJS doing here??????
                /* tslint:disable deprecation */
                // @ts-ignore
                regularSegmentLoader(args_1).subscribe(obs);
                /* tslint:enable deprecation */
            };
            var callbacks = { reject: reject, resolve: resolve, fallback: fallback, progress: progress };
            var abort = customSegmentLoader(args_1, callbacks);
            return function () {
                if (!hasFinished && !hasFallbacked && typeof abort === "function") {
                    abort();
                }
            };
        });
    }
}; };
export default generateSegmentLoader;
