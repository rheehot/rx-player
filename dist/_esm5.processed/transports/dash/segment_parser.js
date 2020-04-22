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
import { getMDHDTimescale, getSegmentsFromSidx, takePSSHOut, } from "../../parsers/containers/isobmff";
import { getSegmentsFromCues, getTimeCodeScale, } from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";
export default function parser(_a) {
    var content = _a.content, response = _a.response, initTimescale = _a.initTimescale;
    var period = content.period, representation = content.representation, segment = content.segment;
    var data = response.data, isChunked = response.isChunked;
    var appendWindow = [period.start, period.end];
    if (data === null) {
        if (segment.isInit) {
            var _segmentProtections = representation.getProtectionsInitializationData();
            return observableOf({ type: "parsed-init-segment",
                value: { initializationData: null,
                    segmentProtections: _segmentProtections,
                    initTimescale: undefined } });
        }
        return observableOf({ type: "parsed-segment",
            value: { chunkData: null,
                chunkInfos: null,
                chunkOffset: 0,
                appendWindow: appendWindow } });
    }
    var chunkData = data instanceof Uint8Array ? data :
        new Uint8Array(data);
    var isWEBM = isWEBMEmbeddedTrack(representation);
    if (!segment.isInit) {
        var chunkInfos = isWEBM ? null : // TODO extract time info from webm
            getISOBMFFTimingInfos(chunkData, isChunked, segment, initTimescale);
        var chunkOffset = takeFirstSet(segment.timestampOffset, 0);
        return observableOf({ type: "parsed-segment",
            value: { chunkData: chunkData,
                chunkInfos: chunkInfos,
                chunkOffset: chunkOffset,
                appendWindow: appendWindow } });
    }
    // we're handling an initialization segment
    var indexRange = segment.indexRange;
    var nextSegments = isWEBM ? getSegmentsFromCues(chunkData, 0) :
        getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ?
            indexRange[0] :
            0);
    if (nextSegments !== null && nextSegments.length > 0) {
        representation.index._addSegments(nextSegments);
    }
    var timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
        getMDHDTimescale(chunkData);
    var parsedTimescale = timescale !== null && timescale > 0 ? timescale :
        undefined;
    if (!isWEBM) { // TODO extract webm protection information
        var psshInfo = takePSSHOut(chunkData);
        for (var i = 0; i < psshInfo.length; i++) {
            var _b = psshInfo[i], systemID = _b.systemID, psshData = _b.data;
            representation._addProtectionData("cenc", systemID, psshData);
        }
    }
    var segmentProtections = representation.getProtectionsInitializationData();
    return observableOf({ type: "parsed-init-segment",
        value: { initializationData: chunkData,
            segmentProtections: segmentProtections,
            initTimescale: parsedTimescale } });
}
