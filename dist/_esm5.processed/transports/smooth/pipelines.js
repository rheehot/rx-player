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
import { of as observableOf, } from "rxjs";
import { map, tap, } from "rxjs/operators";
import features from "../../features";
import log from "../../log";
import Manifest from "../../manifest";
import { getMDAT, takePSSHOut, } from "../../parsers/containers/isobmff";
import createSmoothManifestParser from "../../parsers/manifest/smooth";
import { bytesToStr, strToBytes, } from "../../utils/byte_parsing";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import request from "../../utils/request";
import stringFromUTF8 from "../../utils/string_from_utf8";
import warnOnce from "../../utils/warn_once";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import generateManifestLoader from "../utils/document_manifest_loader";
import extractTimingsInfos from "./extract_timings_infos";
import { patchSegment } from "./isobmff";
import generateSegmentLoader from "./segment_loader";
import { extractISML, extractToken, replaceToken, resolveManifest, } from "./utils";
var WSX_REG = /\.wsx?(\?token=\S+)?/;
/**
 * @param {Object} adaptation
 * @param {Object} dlSegment
 * @param {Object} nextSegments
 */
function addNextSegments(adaptation, nextSegments, dlSegment) {
    log.debug("Smooth Parser: update segments information.");
    var representations = adaptation.representations;
    for (var i = 0; i < representations.length; i++) {
        var representation = representations[i];
        representation.index._addSegments(nextSegments, dlSegment);
    }
}
export default function (options) {
    var smoothManifestParser = createSmoothManifestParser(options);
    var segmentLoader = generateSegmentLoader(options.segmentLoader);
    var manifestLoaderOptions = { customManifestLoader: options.manifestLoader };
    var manifestLoader = generateManifestLoader(manifestLoaderOptions);
    var manifestPipeline = {
        resolver: function (_a) {
            var url = _a.url;
            if (url === undefined) {
                return observableOf({ url: undefined });
            }
            // TODO Remove WSX logic
            var resolving;
            if (WSX_REG.test(url)) {
                warnOnce("Giving WSX URL to loadVideo is deprecated." +
                    " You should only give Manifest URLs.");
                resolving = request({ url: replaceToken(url, ""),
                    responseType: "document" })
                    .pipe(map(function (_a) {
                    var value = _a.value;
                    var extractedURL = extractISML(value.responseData);
                    if (extractedURL === null || extractedURL.length === 0) {
                        throw new Error("Invalid ISML");
                    }
                    return extractedURL;
                }));
            }
            else {
                resolving = observableOf(url);
            }
            var token = extractToken(url);
            return resolving.pipe(map(function (_url) { return ({
                url: replaceToken(resolveManifest(_url), token),
            }); }));
        },
        loader: manifestLoader,
        parser: function (_a) {
            var response = _a.response, reqURL = _a.url;
            var url = response.url === undefined ? reqURL :
                response.url;
            var data = typeof response.responseData === "string" ?
                new DOMParser().parseFromString(response.responseData, "text/xml") :
                response.responseData; // TODO find a way to check if Document?
            var manifestReceivedTime = response.receivedTime;
            var parserResult = smoothManifestParser(data, url, manifestReceivedTime);
            var manifest = new Manifest(parserResult, {
                representationFilter: options.representationFilter,
                supplementaryImageTracks: options.supplementaryImageTracks,
                supplementaryTextTracks: options.supplementaryTextTracks,
            });
            return observableOf({ manifest: manifest, url: url });
        },
    };
    var segmentPipeline = {
        loader: function (content) {
            if (content.segment.isInit || options.checkMediaSegmentIntegrity !== true) {
                return segmentLoader(content);
            }
            return segmentLoader(content).pipe(tap(function (res) {
                if ((res.type === "data-loaded" || res.type === "data-chunk") &&
                    res.value.responseData !== null) {
                    checkISOBMFFIntegrity(new Uint8Array(res.value.responseData), content.segment.isInit);
                }
            }));
        },
        parser: function (_a) {
            var content = _a.content, response = _a.response;
            var segment = content.segment, representation = content.representation, adaptation = content.adaptation, manifest = content.manifest;
            var data = response.data, isChunked = response.isChunked;
            if (data === null) {
                if (segment.isInit) {
                    var segmentProtections = representation.getProtectionsInitializationData();
                    return observableOf({ type: "parsed-init-segment",
                        value: { initializationData: null,
                            segmentProtections: segmentProtections,
                            initTimescale: undefined } });
                }
                return observableOf({ type: "parsed-segment",
                    value: { chunkData: null,
                        chunkInfos: null,
                        chunkOffset: 0,
                        appendWindow: [undefined, undefined] } });
            }
            var responseBuffer = data instanceof Uint8Array ? data :
                new Uint8Array(data);
            if (segment.isInit) {
                var psshInfo = takePSSHOut(responseBuffer);
                if (psshInfo.length > 0) {
                    for (var i = 0; i < psshInfo.length; i++) {
                        var _b = psshInfo[i], systemID = _b.systemID, psshData = _b.data;
                        representation._addProtectionData("cenc", systemID, psshData);
                    }
                }
                var segmentProtections = representation.getProtectionsInitializationData();
                return observableOf({ type: "parsed-init-segment",
                    value: { initializationData: data,
                        segmentProtections: segmentProtections,
                        // smooth init segments are crafted by hand.
                        // Their timescale is the one from the manifest.
                        initTimescale: segment.timescale } });
            }
            var _c = extractTimingsInfos(responseBuffer, isChunked, segment, manifest.isLive), nextSegments = _c.nextSegments, chunkInfos = _c.chunkInfos;
            if (chunkInfos === null) {
                throw new Error("Smooth Segment without time information");
            }
            var chunkData = patchSegment(responseBuffer, chunkInfos.time);
            if (nextSegments.length > 0) {
                addNextSegments(adaptation, nextSegments, chunkInfos);
            }
            return observableOf({ type: "parsed-segment",
                value: { chunkData: chunkData,
                    chunkInfos: chunkInfos,
                    chunkOffset: 0,
                    appendWindow: [undefined, undefined] } });
        },
    };
    var textTrackPipeline = {
        loader: function (_a) {
            var segment = _a.segment, representation = _a.representation, url = _a.url;
            if (segment.isInit || url === null) {
                return observableOf({ type: "data-created",
                    value: { responseData: null } });
            }
            var isMP4 = isMP4EmbeddedTrack(representation);
            if (!isMP4 || options.checkMediaSegmentIntegrity !== true) {
                return request({ url: url,
                    responseType: isMP4 ? "arraybuffer" : "text",
                    sendProgressEvents: true });
            }
            return request({ url: url,
                responseType: "arraybuffer",
                sendProgressEvents: true })
                .pipe(tap(function (res) {
                if (res.type === "data-loaded") {
                    checkISOBMFFIntegrity(new Uint8Array(res.value.responseData), segment.isInit);
                }
            }));
        },
        parser: function (_a) {
            var content = _a.content, response = _a.response;
            var manifest = content.manifest, adaptation = content.adaptation, representation = content.representation, segment = content.segment;
            var language = adaptation.language;
            var _b = representation.mimeType, mimeType = _b === void 0 ? "" : _b, _c = representation.codec, codec = _c === void 0 ? "" : _c;
            var data = response.data, isChunked = response.isChunked;
            if (segment.isInit) { // text init segment has no use in HSS
                return observableOf({ type: "parsed-init-segment",
                    value: { initializationData: null,
                        segmentProtections: [],
                        initTimescale: undefined } });
            }
            if (data === null) {
                return observableOf({ type: "parsed-segment",
                    value: { chunkData: null,
                        chunkInfos: null,
                        chunkOffset: 0,
                        appendWindow: [undefined, undefined] } });
            }
            var nextSegments;
            var chunkInfos = null;
            var isMP4 = mimeType.indexOf("mp4") >= 0;
            var _sdStart;
            var _sdEnd;
            var _sdTimescale = 1;
            var _sdData;
            var _sdType;
            if (isMP4) {
                var chunkBytes = void 0;
                if (typeof data === "string") {
                    chunkBytes = strToBytes(data);
                }
                else {
                    chunkBytes = data instanceof Uint8Array ? data :
                        new Uint8Array(data);
                }
                var timings = extractTimingsInfos(chunkBytes, isChunked, segment, manifest.isLive);
                nextSegments = timings.nextSegments;
                chunkInfos = timings.chunkInfos;
                if (chunkInfos === null) {
                    if (isChunked) {
                        log.warn("Smooth: Unavailable time data for current text track.");
                    }
                    else {
                        _sdStart = segment.time;
                        _sdEnd = _sdStart + segment.duration;
                        _sdTimescale = segment.timescale;
                    }
                }
                else {
                    _sdStart = chunkInfos.time;
                    _sdEnd = !isNullOrUndefined(chunkInfos.duration) ?
                        chunkInfos.time + chunkInfos.duration :
                        undefined;
                    _sdTimescale = chunkInfos.timescale;
                }
                var lcCodec = codec.toLowerCase();
                if (mimeType === "application/ttml+xml+mp4" ||
                    lcCodec === "stpp" ||
                    lcCodec === "stpp.ttml.im1t") {
                    _sdType = "ttml";
                }
                else if (lcCodec === "wvtt") {
                    _sdType = "vtt";
                }
                else {
                    throw new Error("could not find a text-track parser for the type " + mimeType);
                }
                var mdat = getMDAT(chunkBytes);
                _sdData = stringFromUTF8(mdat);
            }
            else {
                var chunkString = void 0;
                if (typeof data !== "string") {
                    var bytesData = data instanceof Uint8Array ? data :
                        new Uint8Array(data);
                    chunkString = bytesToStr(bytesData);
                }
                else {
                    chunkString = data;
                }
                var segmentTime = segment.time;
                // vod is simple WebVTT or TTML text
                _sdStart = segmentTime;
                _sdEnd = segmentTime + segment.duration;
                _sdTimescale = segment.timescale;
                switch (mimeType) {
                    case "application/x-sami":
                    case "application/smil": // TODO SMIL should be its own format, no?
                        _sdType = "sami";
                        break;
                    case "application/ttml+xml":
                        _sdType = "ttml";
                        break;
                    case "text/vtt":
                        _sdType = "vtt";
                        break;
                }
                if (_sdType === undefined) {
                    var lcCodec = codec.toLowerCase();
                    if (lcCodec === "srt") {
                        _sdType = "srt";
                    }
                    else {
                        throw new Error("could not find a text-track parser for the type " + mimeType);
                    }
                }
                _sdData = chunkString;
            }
            if (chunkInfos !== null &&
                Array.isArray(nextSegments) && nextSegments.length > 0) {
                addNextSegments(adaptation, nextSegments, chunkInfos);
            }
            var chunkOffset = _sdStart === undefined ? 0 :
                _sdStart / _sdTimescale;
            return observableOf({ type: "parsed-segment",
                value: { chunkData: { type: _sdType,
                        data: _sdData,
                        language: language,
                        timescale: _sdTimescale,
                        start: _sdStart,
                        end: _sdEnd },
                    chunkInfos: chunkInfos,
                    chunkOffset: chunkOffset,
                    appendWindow: [undefined, undefined] } });
        },
    };
    var imageTrackPipeline = {
        loader: function (_a) {
            var segment = _a.segment, url = _a.url;
            if (segment.isInit || url === null) {
                // image do not need an init segment. Passthrough directly to the parser
                return observableOf({ type: "data-created",
                    value: { responseData: null } });
            }
            return request({ url: url,
                responseType: "arraybuffer",
                sendProgressEvents: true });
        },
        parser: function (_a) {
            var response = _a.response, content = _a.content;
            var data = response.data, isChunked = response.isChunked;
            if (content.segment.isInit) { // image init segment has no use
                return observableOf({ type: "parsed-init-segment",
                    value: { initializationData: null,
                        segmentProtections: [],
                        initTimescale: undefined } });
            }
            if (isChunked) {
                throw new Error("Image data should not be downloaded in chunks");
            }
            // TODO image Parsing should be more on the sourceBuffer side, no?
            if (data === null || features.imageParser === null) {
                return observableOf({ type: "parsed-segment",
                    value: { chunkData: null,
                        chunkInfos: null,
                        chunkOffset: 0,
                        appendWindow: [undefined, undefined] } });
            }
            var bifObject = features.imageParser(new Uint8Array(data));
            var thumbsData = bifObject.thumbs;
            return observableOf({ type: "parsed-segment",
                value: { chunkData: { data: thumbsData,
                        start: 0,
                        end: Number.MAX_VALUE,
                        timescale: 1,
                        type: "bif" },
                    chunkInfos: { time: 0,
                        duration: Number.MAX_VALUE,
                        timescale: bifObject.timescale },
                    chunkOffset: 0,
                    segmentProtections: [],
                    appendWindow: [undefined, undefined] } });
        },
    };
    return { manifest: manifestPipeline,
        audio: segmentPipeline,
        video: segmentPipeline,
        text: textTrackPipeline,
        image: imageTrackPipeline };
}
/**
 * Returns true if the given texttrack segment represents a textrack embedded
 * in a mp4 file.
 * @param {Representation} representation
 * @returns {Boolean}
 */
function isMP4EmbeddedTrack(representation) {
    return typeof representation.mimeType === "string" &&
        representation.mimeType.indexOf("mp4") >= 0;
}
