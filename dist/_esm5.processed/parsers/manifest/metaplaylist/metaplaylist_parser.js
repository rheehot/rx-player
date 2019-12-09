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
import { StaticRepresentationIndex, SUPPORTED_ADAPTATIONS_TYPE, } from "../../../manifest";
import idGenerator from "../../../utils/id_generator";
import MetaRepresentationIndex from "./representation_index";
var generateManifestID = idGenerator();
/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 * @param {string} url
 * @returns {Object}
 */
export default function parseMetaPlaylist(data, parserOptions) {
    var parsedData;
    if (typeof data === "object" && data != null) {
        parsedData = data;
    }
    else if (typeof data === "string") {
        try {
            parsedData = JSON.parse(data);
        }
        catch (error) {
            throw new Error("MPL Parser: Bad MetaPlaylist file. Expected JSON.");
        }
    }
    else {
        throw new Error("MPL Parser: Parser input must be either a string " +
            "or the MetaPlaylist data directly.");
    }
    var _a = parsedData, contents = _a.contents, version = _a.version, type = _a.type;
    if (type !== "MPL") {
        throw new Error("MPL Parser: Bad MetaPlaylist. " +
            "The `type` property is not set to `MPL`");
    }
    if (version !== "0.1") {
        throw new Error("MPL Parser: Bad MetaPlaylist version");
    }
    // quick checks
    if (contents == null || contents.length === 0) {
        throw new Error("MPL Parser: No content found.");
    }
    var ressources = [];
    for (var i = 0; i < contents.length; i++) {
        var content = contents[i];
        if (content.url == null ||
            content.startTime == null ||
            content.endTime == null ||
            content.transport == null) {
            throw new Error("MPL Parser: Malformed content.");
        }
        ressources.push({ url: content.url, transportType: content.transport });
    }
    var metaPlaylist = parsedData;
    return {
        type: "needs-manifest-loader",
        value: {
            ressources: ressources,
            continue: function parseWholeMPL(loadedRessources) {
                var parsedManifest = createManifest(metaPlaylist, loadedRessources, parserOptions);
                return { type: "done", value: parsedManifest };
            },
        },
    };
}
/**
 * From several parsed manifests, generate a single manifest
 * which fakes live content playback.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} mplData
 * @param {Array<Object>} manifest
 * @param {string} url
 * @returns {Object}
 */
function createManifest(mplData, manifests, parserOptions) {
    var url = parserOptions.url, serverSyncInfos = parserOptions.serverSyncInfos;
    var clockOffset = serverSyncInfos !== undefined ?
        serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime :
        undefined;
    var generateAdaptationID = idGenerator();
    var generateRepresentationID = idGenerator();
    var contents = mplData.contents;
    var minimumTime = contents.length > 0 ? contents[0].startTime :
        0;
    var maximumTime = contents.length > 0 ? contents[contents.length - 1].endTime :
        0;
    var isLive = mplData.dynamic === true;
    var firstStart = null;
    var lastEnd = null;
    var periods = [];
    var _loop_1 = function (iMan) {
        var content = contents[iMan];
        firstStart = firstStart !== null ? Math.min(firstStart, content.startTime) :
            content.startTime;
        lastEnd = lastEnd !== null ? Math.max(lastEnd, content.endTime) :
            content.endTime;
        var currentManifest = manifests[iMan];
        if (currentManifest.periods.length <= 0) {
            return "continue";
        }
        var contentOffset = content.startTime - currentManifest.periods[0].start;
        var contentEnd = content.endTime;
        var manifestPeriods = [];
        var _loop_2 = function (iPer) {
            var _a;
            var currentPeriod = currentManifest.periods[iPer];
            var adaptations = SUPPORTED_ADAPTATIONS_TYPE
                .reduce(function (acc, type) {
                var currentAdaptations = currentPeriod.adaptations[type];
                if (currentAdaptations == null) {
                    return acc;
                }
                var adaptationsForCurrentType = [];
                for (var iAda = 0; iAda < currentAdaptations.length; iAda++) {
                    var currentAdaptation = currentAdaptations[iAda];
                    var representations = [];
                    for (var iRep = 0; iRep < currentAdaptation.representations.length; iRep++) {
                        var currentRepresentation = currentAdaptation.representations[iRep];
                        var contentInfos = {
                            manifest: currentManifest,
                            period: currentPeriod,
                            adaptation: currentAdaptation,
                            representation: currentRepresentation,
                        };
                        var newIndex = new MetaRepresentationIndex(currentRepresentation.index, [contentOffset, contentEnd], content.transport, contentInfos);
                        representations.push({
                            bitrate: currentRepresentation.bitrate,
                            index: newIndex,
                            id: currentRepresentation.id,
                            height: currentRepresentation.height,
                            width: currentRepresentation.width,
                            mimeType: currentRepresentation.mimeType,
                            frameRate: currentRepresentation.frameRate,
                            codecs: currentRepresentation.codec,
                            contentProtections: currentRepresentation.contentProtections,
                        });
                    }
                    adaptationsForCurrentType.push({
                        id: currentAdaptation.id,
                        representations: representations,
                        type: currentAdaptation.type,
                        audioDescription: currentAdaptation.isAudioDescription,
                        closedCaption: currentAdaptation.isClosedCaption,
                        isDub: currentAdaptation.isDub,
                        language: currentAdaptation.language,
                    });
                    acc[type] = adaptationsForCurrentType;
                }
                return acc;
            }, {});
            // TODO only first period?
            var textTracks = content.textTracks === undefined ? [] :
                content.textTracks;
            var newTextAdaptations = textTracks.map(function (track) {
                var adaptationID = "gen-text-ada-" + generateAdaptationID();
                var representationID = "gen-text-rep-" + generateRepresentationID();
                return {
                    id: adaptationID,
                    type: "text",
                    language: track.language,
                    closedCaption: track.closedCaption,
                    manuallyAdded: true,
                    representations: [
                        { bitrate: 0,
                            id: representationID,
                            mimeType: track.mimeType,
                            codecs: track.codecs,
                            index: new StaticRepresentationIndex({ media: track.url }),
                        },
                    ],
                };
            }, []);
            if (newTextAdaptations.length > 0) {
                if (adaptations.text == null) {
                    adaptations.text = newTextAdaptations;
                }
                else {
                    (_a = adaptations.text).push.apply(_a, newTextAdaptations);
                }
            }
            var newPeriod = {
                id: formatId(currentManifest.id) + "_" + formatId(currentPeriod.id),
                adaptations: adaptations,
                duration: currentPeriod.duration,
                start: contentOffset + currentPeriod.start,
            };
            manifestPeriods.push(newPeriod);
        };
        for (var iPer = 0; iPer < currentManifest.periods.length; iPer++) {
            _loop_2(iPer);
        }
        for (var i = manifestPeriods.length - 1; i >= 0; i--) {
            var period = manifestPeriods[i];
            if (period.start >= content.endTime) {
                manifestPeriods.splice(i, 1);
            }
            else if (period.duration != null) {
                if (period.start + period.duration > content.endTime) {
                    period.duration = content.endTime - period.start;
                }
            }
            else if (i === manifestPeriods.length - 1) {
                period.duration = content.endTime - period.start;
            }
        }
        periods.push.apply(periods, manifestPeriods);
    };
    for (var iMan = 0; iMan < contents.length; iMan++) {
        _loop_1(iMan);
    }
    var duration;
    if (!isLive) {
        if (lastEnd === null || firstStart === null) {
            throw new Error("MPL Parser: can't define duration of manifest.");
        }
        duration = lastEnd - firstStart;
    }
    var time = performance.now();
    var manifest = {
        availabilityStartTime: 0,
        clockOffset: clockOffset,
        suggestedPresentationDelay: 10,
        duration: duration,
        id: "gen-metaplaylist-man-" + generateManifestID(),
        periods: periods,
        transportType: "metaplaylist",
        isLive: isLive,
        uris: url == null ? [] :
            [url],
        maximumTime: { isContinuous: false, value: maximumTime, time: time },
        minimumTime: { isContinuous: false, value: minimumTime, time: time },
        lifetime: mplData.pollInterval,
    };
    return manifest;
}
function formatId(str) {
    return str.replace(/_/g, "\_");
}
