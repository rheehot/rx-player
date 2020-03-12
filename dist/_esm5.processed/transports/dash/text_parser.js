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
import { getMDHDTimescale, getSegmentsFromSidx, } from "../../parsers/containers/isobmff";
import { bytesToStr, strToBytes, } from "../../utils/byte_parsing";
import takeFirstSet from "../../utils/take_first_set";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isMP4EmbeddedTextTrack from "../utils/is_mp4_embedded_text_track";
import { getISOBMFFEmbeddedTextTrackData, getPlainTextTrackData, } from "../utils/parse_text_track";
/**
 * Parse TextTrack data when it is embedded in an ISOBMFF file.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parseISOBMFFEmbeddedTextTrack(_a) {
    var response = _a.response, content = _a.content, initTimescale = _a.initTimescale;
    var period = content.period, representation = content.representation, segment = content.segment;
    var isInit = segment.isInit, indexRange = segment.indexRange;
    var data = response.data, isChunked = response.isChunked;
    var chunkBytes = typeof data === "string" ? strToBytes(data) :
        data instanceof Uint8Array ? data :
            new Uint8Array(data);
    if (isInit) {
        var sidxSegments = getSegmentsFromSidx(chunkBytes, Array.isArray(indexRange) ? indexRange[0] :
            0);
        var mdhdTimescale = getMDHDTimescale(chunkBytes);
        if (sidxSegments !== null && sidxSegments.length > 0) {
            representation.index._addSegments(sidxSegments);
        }
        return observableOf({ type: "parsed-init-segment",
            value: { initializationData: null,
                segmentProtections: [],
                initTimescale: mdhdTimescale > 0 ? mdhdTimescale :
                    undefined } });
    }
    var chunkInfos = getISOBMFFTimingInfos(chunkBytes, isChunked, segment, initTimescale);
    var chunkData = getISOBMFFEmbeddedTextTrackData(content, chunkBytes, chunkInfos, isChunked);
    var chunkOffset = takeFirstSet(segment.timestampOffset, 0);
    return observableOf({ type: "parsed-segment",
        value: { chunkData: chunkData,
            chunkInfos: chunkInfos,
            chunkOffset: chunkOffset,
            appendWindow: [period.start, period.end] } });
}
/**
 * Parse TextTrack data in plain text form.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
function parsePlainTextTrack(_a) {
    var response = _a.response, content = _a.content;
    var period = content.period, segment = content.segment;
    var _b = segment.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
    if (segment.isInit) {
        return observableOf({ type: "parsed-init-segment",
            value: { initializationData: null,
                segmentProtections: [],
                initTimescale: undefined } });
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
    var chunkData = getPlainTextTrackData(content, textTrackData, isChunked);
    return observableOf({ type: "parsed-segment",
        value: { chunkData: chunkData,
            chunkInfos: null,
            chunkOffset: timestampOffset,
            appendWindow: [period.start, period.end] } });
}
/**
 * Parse TextTrack data.
 * @param {Object} infos
 * @returns {Observable.<Object>}
 */
export default function textTrackParser(_a) {
    var response = _a.response, content = _a.content, initTimescale = _a.initTimescale;
    var period = content.period, representation = content.representation, segment = content.segment;
    var _b = segment.timestampOffset, timestampOffset = _b === void 0 ? 0 : _b;
    var data = response.data, isChunked = response.isChunked;
    if (data === null) { // No data, just return empty infos
        if (segment.isInit) {
            return observableOf({ type: "parsed-init-segment",
                value: { initializationData: null,
                    segmentProtections: [],
                    initTimescale: undefined } });
        }
        return observableOf({ type: "parsed-segment",
            value: { chunkData: null,
                chunkInfos: null,
                chunkOffset: timestampOffset,
                appendWindow: [period.start, period.end] } });
    }
    var isMP4 = isMP4EmbeddedTextTrack(representation);
    if (isMP4) {
        return parseISOBMFFEmbeddedTextTrack({ response: { data: data, isChunked: isChunked },
            content: content,
            initTimescale: initTimescale });
    }
    else {
        return parsePlainTextTrack({ response: { data: data, isChunked: isChunked }, content: content });
    }
}
