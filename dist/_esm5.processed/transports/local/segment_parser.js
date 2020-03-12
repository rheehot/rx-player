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
import { getMDHDTimescale, takePSSHOut, } from "../../parsers/containers/isobmff";
import { getTimeCodeScale } from "../../parsers/containers/matroska";
import takeFirstSet from "../../utils/take_first_set";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import isWEBMEmbeddedTrack from "../utils/is_webm_embedded_track";
export default function segmentParser(_a) {
    var content = _a.content, response = _a.response, initTimescale = _a.initTimescale;
    var period = content.period, segment = content.segment, representation = content.representation;
    var data = response.data;
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
    var chunkData = new Uint8Array(data);
    var isWEBM = isWEBMEmbeddedTrack(representation);
    if (!isWEBM) {
        var psshInfo = takePSSHOut(chunkData);
        if (psshInfo.length > 0) {
            for (var i = 0; i < psshInfo.length; i++) {
                var _b = psshInfo[i], systemID = _b.systemID, psshData = _b.data;
                representation._addProtectionData("cenc", systemID, psshData);
            }
        }
    }
    if (segment.isInit) {
        var timescale = isWEBM ? getTimeCodeScale(chunkData, 0) :
            getMDHDTimescale(chunkData);
        var segmentProtections = representation.getProtectionsInitializationData();
        return observableOf({ type: "parsed-init-segment",
            value: { initializationData: chunkData,
                initTimescale: timescale !== null && timescale > 0 ?
                    timescale :
                    undefined,
                segmentProtections: segmentProtections } });
    }
    var chunkInfos = isWEBM ? null : // TODO extract from webm
        getISOBMFFTimingInfos(chunkData, false, segment, initTimescale);
    var chunkOffset = takeFirstSet(segment.timestampOffset, 0);
    return observableOf({ type: "parsed-segment",
        value: { chunkData: chunkData,
            chunkInfos: chunkInfos,
            chunkOffset: chunkOffset,
            appendWindow: appendWindow } });
}
