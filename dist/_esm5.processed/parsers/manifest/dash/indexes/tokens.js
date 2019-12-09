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
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import resolveURL from "../../../../utils/resolve_url";
/**
 * Pad with 0 in the left of the given n argument to reach l length
 * @param {Number|string} n
 * @param {Number} l
 * @returns {string}
 */
function padLeftWithZeros(n, l) {
    var nToString = n.toString();
    if (nToString.length >= l) {
        return nToString;
    }
    var arr = new Array(l + 1).join("0") + nToString;
    return arr.slice(-l);
}
function processFormatedToken(replacer) {
    return function (_match, _format, widthStr) {
        var width = isNonEmptyString(widthStr) ? parseInt(widthStr, 10) :
            1;
        return padLeftWithZeros(String(replacer), width);
    };
}
/**
 * @param {string} representationURL
 * @param {string|undefined} media
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export function createIndexURL(representationURL, media, id, bitrate) {
    return replaceRepresentationDASHTokens(resolveURL(representationURL, media), id, bitrate);
}
/**
 * Replace "tokens" written in a given path (e.g. $RepresentationID$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {string|undefined} id
 * @param {number|undefined} bitrate
 * @returns {string}
 */
export function replaceRepresentationDASHTokens(path, id, bitrate) {
    if (path.indexOf("$") === -1) {
        return path;
    }
    else {
        return path
            .replace(/\$\$/g, "$")
            .replace(/\$RepresentationID\$/g, String(id))
            .replace(/\$Bandwidth(|\%0(\d+)d)\$/g, processFormatedToken(bitrate === undefined ? 0 :
            bitrate));
    }
}
/**
 * Replace "tokens" written in a given path (e.g. $Time$) by the corresponding
 * infos, taken from the given segment.
 * @param {string} path
 * @param {number} time
 * @param {number} number
 * @returns {string}
 *
 * @throws Error - Throws if we do not have enough data to construct the URL
 */
export function replaceSegmentDASHTokens(path, time, nb) {
    if (path.indexOf("$") === -1) {
        return path;
    }
    else {
        return path
            .replace(/\$\$/g, "$")
            .replace(/\$Number(|\%0(\d+)d)\$/g, function (_x, _y, widthStr) {
            if (nb == null) {
                throw new Error("Segment number not defined in a $Number$ scheme");
            }
            return processFormatedToken(nb)(_x, _y, widthStr);
        })
            .replace(/\$Time(|\%0(\d+)d)\$/g, function (_x, _y, widthStr) {
            if (time == null) {
                throw new Error("Segment time not defined in a $Time$ scheme");
            }
            return processFormatedToken(time)(_x, _y, widthStr);
        });
    }
}
