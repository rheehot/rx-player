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
import isWEBMEmbeddedTrack from "./is_webm_embedded_track";
import getISOBMFFTimingInfos from "./isobmff_timing_infos";
export default function parser(_a) {
    var content = _a.content, response = _a.response, init = _a.init;
    var period = content.period, representation = content.representation, segment = content.segment;
    var data = response.data, isChunked = response.isChunked;
    if (data == null) {
        return observableOf({ chunkData: null,
            chunkInfos: null,
            chunkOffset: 0,
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
    var chunkData = data instanceof Uint8Array ? data :
        new Uint8Array(data);
    var indexRange = segment.indexRange;
    var isWEBM = isWEBMEmbeddedTrack(representation);
    var nextSegments = isWEBM ?
        getSegmentsFromCues(chunkData, 0) :
        getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ? indexRange[0] :
            0);
    if (!segment.isInit) {
        var chunkInfos = isWEBM ? null : // TODO extract from webm
            getISOBMFFTimingInfos(chunkData, isChunked, segment, init);
        return observableOf({ chunkData: chunkData,
            chunkInfos: chunkInfos,
            chunkOffset: takeFirstSet(segment.timestampOffset, 0),
            segmentProtections: [],
            appendWindow: [period.start, period.end] });
    }
    else { // it is an initialization segment
        if (nextSegments !== null && nextSegments.length > 0) {
            representation.index._addSegments(nextSegments);
        }
        var timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
            getMDHDTimescale(chunkData);
        var chunkInfos = timescale != null && timescale > 0 ? { time: 0,
            duration: 0,
            timescale: timescale } :
            null;
        if (!isWEBM) {
            var psshInfo = takePSSHOut(chunkData);
            if (psshInfo.length > 0) {
                for (var i = 0; i < psshInfo.length; i++) {
                    var _b = psshInfo[i], systemID = _b.systemID, psshData = _b.data;
                    representation._addProtectionData("cenc", systemID, psshData);
                }
            }
        }
        var segmentProtections = representation.getProtectionsInitializationData();
        return observableOf({ chunkData: chunkData,
            chunkInfos: chunkInfos,
            chunkOffset: takeFirstSet(segment.timestampOffset, 0),
            segmentProtections: segmentProtections,
            appendWindow: [period.start, period.end] });
    }
}
