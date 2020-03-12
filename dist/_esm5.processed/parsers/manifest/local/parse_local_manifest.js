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
import idGenerator from "../../../utils/id_generator";
import getMaximumPosition from "../utils/get_maximum_position";
import getMinimumPosition from "../utils/get_minimum_position";
import LocalRepresentationIndex from "./representation_index";
var generateManifestID = idGenerator();
/**
 * @param {Object} localManifest
 * @returns {Object}
 */
export default function parseLocalManifest(localManifest) {
    if (localManifest.type !== "local") {
        throw new Error("Invalid local manifest given. It misses the `type` property.");
    }
    if (localManifest.version !== "0.1") {
        throw new Error("The current Local Manifest version (" + localManifest.version + ")" +
            " is not compatible with the current version of the RxPlayer");
    }
    var periodIdGenerator = idGenerator();
    var isFinished = localManifest.isFinished;
    var manifest = {
        availabilityStartTime: 0,
        baseURLs: null,
        expired: localManifest.expired,
        id: "local-manifest_" + generateManifestID(),
        transportType: "local",
        isDynamic: !localManifest.isFinished,
        isLive: false,
        uris: [],
        periods: localManifest.periods
            .map(function (period) { return parsePeriod(period, periodIdGenerator, isFinished); }),
    };
    var maximumPosition = getMaximumPosition(manifest);
    if (maximumPosition !== undefined) {
        manifest.maximumTime = {
            isContinuous: false,
            value: maximumPosition,
            time: performance.now(),
        };
    }
    var minimumPosition = getMinimumPosition(manifest);
    manifest.minimumTime = {
        isContinuous: false,
        value: minimumPosition !== undefined ? minimumPosition : 0,
        time: performance.now(),
    };
    return manifest;
}
/**
 * @param {Object} period
 * @returns {Object}
 */
function parsePeriod(period, periodIdGenerator, isFinished) {
    var adaptationIdGenerator = idGenerator();
    return {
        id: "period-" + periodIdGenerator(),
        start: period.start,
        end: period.duration - period.start,
        duration: period.duration,
        adaptations: period.adaptations
            .reduce(function (acc, ada) {
            var type = ada.type;
            var adaps = acc[type];
            if (adaps === undefined) {
                adaps = [];
                acc[type] = adaps;
            }
            adaps.push(parseAdaptation(ada, adaptationIdGenerator, isFinished));
            return acc;
        }, {}),
    };
}
/**
 * @param {Object} adaptation
 * @returns {Object}
 */
function parseAdaptation(adaptation, adaptationIdGenerator, isFinished) {
    var representationIdGenerator = idGenerator();
    return {
        id: "adaptation-" + adaptationIdGenerator(),
        type: adaptation.type,
        audioDescription: adaptation.audioDescription,
        closedCaption: adaptation.closedCaption,
        representations: adaptation.representations.map(function (representation) {
            return parseRepresentation(representation, representationIdGenerator, isFinished);
        }),
    };
}
/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(representation, representationIdGenerator, isFinished) {
    var id = "representation-" + representationIdGenerator();
    return { id: id,
        bitrate: representation.bitrate,
        height: representation.height,
        width: representation.width,
        codecs: representation.codecs,
        mimeType: representation.mimeType,
        index: new LocalRepresentationIndex(representation.index, id, isFinished),
        contentProtections: representation.contentProtections };
}
