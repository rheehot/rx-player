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
import pinkie from "pinkie";
import { combineLatest as observableCombineLatest, of as observableOf, } from "rxjs";
import { map } from "rxjs/operators";
import getDurationFromManifest from "./get_duration_from_manifest";
var PPromise = typeof Promise !== undefined ? Promise :
    pinkie;
/**
 * From given information about wanted metaplaylist and contents,
 * get needed supplementary infos and build a standard metaplaylist.
 * @param {Array.<Object>} contentsInfos
 * @param {number|undefined} timeOffset
 * @returns {Promise<Object>} - metaplaylist
 */
function createMetaplaylist(contentsInfos, timeOffset) {
    var playlistStartTime = timeOffset !== null && timeOffset !== void 0 ? timeOffset : 0;
    var completeContentsInfos$ = contentsInfos.map(function (contentInfos) {
        var url = contentInfos.url, transport = contentInfos.transport, duration = contentInfos.duration;
        if (duration !== undefined) {
            return observableOf({ url: url,
                transport: transport,
                duration: duration });
        }
        return getDurationFromManifest(url, transport).pipe(map(function (manifestDuration) {
            return { url: url,
                duration: manifestDuration,
                transport: transport };
        }));
    });
    return observableCombineLatest(completeContentsInfos$).pipe(map(function (completeContentsInfos) {
        var contents = completeContentsInfos
            .reduce(function (acc, val) {
            var _a;
            var lastElement = acc[acc.length - 1];
            var startTime = (_a = lastElement === null || lastElement === void 0 ? void 0 : lastElement.endTime) !== null && _a !== void 0 ? _a : playlistStartTime;
            acc.push({ url: val.url,
                transport: val.transport,
                startTime: startTime,
                endTime: startTime + val.duration });
            return acc;
        }, []);
        return { type: "MPL",
            version: "0.1",
            dynamic: false,
            contents: contents };
    })).toPromise(PPromise);
}
export default createMetaplaylist;
