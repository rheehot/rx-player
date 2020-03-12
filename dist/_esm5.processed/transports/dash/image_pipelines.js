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
import features from "../../features";
import request from "../../utils/request";
import takeFirstSet from "../../utils/take_first_set";
/**
 * @param {Object} args
 * @returns {Observable}
 */
export function imageLoader(_a) {
    var segment = _a.segment, url = _a.url;
    if (segment.isInit || url === null) {
        return observableOf({ type: "data-created",
            value: { responseData: null } });
    }
    return request({ url: url,
        responseType: "arraybuffer",
        sendProgressEvents: true });
}
/**
 * @param {Object} args
 * @returns {Observable}
 */
export function imageParser(_a) {
    var response = _a.response, content = _a.content;
    var segment = content.segment, period = content.period;
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
    var chunkOffset = takeFirstSet(segment.timestampOffset, 0);
    // TODO image Parsing should be more on the sourceBuffer side, no?
    if (data === null || features.imageParser === null) {
        return observableOf({ type: "parsed-segment",
            value: { chunkData: null,
                chunkInfos: segment.timescale > 0 ?
                    { duration: segment.isInit ? 0 :
                            segment.duration,
                        time: segment.isInit ? -1 :
                            segment.time,
                        timescale: segment.timescale } :
                    null,
                chunkOffset: chunkOffset,
                appendWindow: [period.start, period.end] } });
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
            chunkOffset: chunkOffset,
            appendWindow: [period.start, period.end] } });
}
