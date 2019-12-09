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
import { of as observableOf } from "rxjs";
import log from "../../log";
import { getMDAT, getMDHDTimescale, getSegmentsFromSidx, } from "../../parsers/containers/isobmff";
import { bytesToStr, strToBytes, } from "../../utils/byte_parsing";
import stringFromUTF8 from "../../utils/string_from_utf8";
import isMP4EmbeddedTextTrack from "./is_mp4_embedded_text_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parseMP4EmbeddedTrack(_a) {
    var response = _a.response, content = _a.content, init = _a.init;
    var period = content.period, representation = content.representation, segment = content.segment;
    var isInit = segment.isInit, indexRange = segment.indexRange, _b = segment.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
    var language = content.adaptation.language;
    var data = response.data, isChunked = response.isChunked;
    var chunkBytes;
    if (typeof data === "string") {
        chunkBytes = strToBytes(data);
    }
    else {
        chunkBytes = data instanceof Uint8Array ? data :
            new Uint8Array(data);
    }
    var sidxSegments = getSegmentsFromSidx(chunkBytes, Array.isArray(indexRange) ? indexRange[0] :
        0);
    if (isInit) {
        var mdhdTimescale = getMDHDTimescale(chunkBytes);
        var chunkInfos = mdhdTimescale > 0 ? { time: 0,
            duration: 0,
            timescale: mdhdTimescale } :
            null;
        if (Array.isArray(sidxSegments) && sidxSegments.length > 0) {
            representation.index._addSegments(sidxSegments);
        }
        return observableOf({ chunkData: null,
            chunkInfos: chunkInfos,
            chunkOffset: timestampOffset,
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
    else { // not init
        var chunkInfos = getISOBMFFTimingInfos(chunkBytes, isChunked, segment, init);
        var startTime = void 0;
        var endTime = void 0;
        var timescale = 1;
        if (chunkInfos == null) {
            if (isChunked) {
                log.warn("DASH: Unavailable time data for current text track.");
            }
            else {
                startTime = segment.time;
                endTime = startTime + segment.duration;
                timescale = segment.timescale;
            }
        }
        else {
            startTime = chunkInfos.time;
            if (chunkInfos.duration != null) {
                endTime = startTime + chunkInfos.duration;
            }
            else if (!isChunked) {
                endTime = startTime + segment.duration;
            }
            timescale = chunkInfos.timescale;
        }
        var codec = representation.codec == null ? "" :
            representation.codec;
        var type = void 0;
        switch (codec.toLowerCase()) {
            case "stpp": // stpp === TTML in MP4
            case "stpp.ttml.im1t":
                type = "ttml";
                break;
            case "wvtt": // wvtt === WebVTT in MP4
                type = "vtt";
        }
        if (type === undefined) {
            throw new Error("The codec used for the subtitles " +
                ("\"" + codec + "\" is not managed yet."));
        }
        var textData = stringFromUTF8(getMDAT(chunkBytes));
        var chunkData = { data: textData,
            type: type,
            language: language,
            start: startTime,
            end: endTime,
            timescale: timescale };
        return observableOf({ chunkData: chunkData,
            chunkInfos: chunkInfos,
            chunkOffset: timestampOffset,
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
}
function parsePlainTextTrack(_a) {
    var response = _a.response, content = _a.content;
    var adaptation = content.adaptation, period = content.period, representation = content.representation, segment = content.segment;
    var language = adaptation.language;
    var _b = segment.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
    if (segment.isInit) {
        return observableOf({ chunkData: null,
            chunkInfos: null,
            chunkOffset: timestampOffset,
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
    var data = response.data, isChunked = response.isChunked;
    var textTrackData;
    if (typeof data !== "string") {
        var bytesData = data instanceof Uint8Array ? data :
            new Uint8Array(data);
        textTrackData = bytesToStr(bytesData);
    }
    else {
        textTrackData = data;
    }
    var start;
    var end;
    var timescale = 1;
    if (!isChunked) {
        start = segment.time;
        end = start + segment.duration;
        timescale = segment.timescale;
    }
    else {
        log.warn("DASH: Unavailable time data for current text track.");
    }
    var type;
    var _c = representation.mimeType, mimeType = _c === void 0 ? "" : _c;
    switch (representation.mimeType) {
        case "application/ttml+xml":
            type = "ttml";
            break;
        case "application/x-sami":
        case "application/smil":
            type = "sami";
            break;
        case "text/vtt":
            type = "vtt";
    }
    if (type === undefined) {
        var _d = representation.codec, codec = _d === void 0 ? "" : _d;
        var codeLC = codec.toLowerCase();
        if (codeLC === "srt") {
            type = "srt";
        }
        else {
            throw new Error("could not find a text-track parser for the type " + mimeType);
        }
    }
    var chunkData = { data: textTrackData,
        type: type,
        language: language,
        start: start,
        end: end,
        timescale: timescale };
    return observableOf({ chunkData: chunkData,
        chunkInfos: null,
        chunkOffset: timestampOffset,
        segmentProtections: [],
        appendWindow: [period.start, period.end] });
}
/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
export default function textTrackParser(_a) {
    var response = _a.response, content = _a.content, init = _a.init;
    var period = content.period, representation = content.representation, segment = content.segment;
    var _b = segment.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
    var data = response.data, isChunked = response.isChunked;
    if (data == null) { // No data, just return empty infos
        return observableOf({ chunkData: null,
            chunkInfos: null,
            chunkOffset: timestampOffset,
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
    var isMP4 = isMP4EmbeddedTextTrack(representation);
    if (isMP4) {
        return parseMP4EmbeddedTrack({ response: { data: data, isChunked: isChunked }, content: content, init: init });
    }
    else {
        return parsePlainTextTrack({ response: { data: data, isChunked: isChunked }, content: content });
    }
}
