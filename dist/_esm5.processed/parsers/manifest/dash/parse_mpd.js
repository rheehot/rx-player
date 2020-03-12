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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import config from "../../../config";
import arrayFind from "../../../utils/array_find";
import idGenerator from "../../../utils/id_generator";
import { normalizeBaseURL } from "../../../utils/resolve_url";
import checkManifestIDs from "../utils/check_manifest_ids";
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import getClockOffset from "./get_clock_offset";
import getHTTPUTCTimingURL from "./get_http_utc-timing_url";
import getMinimumAndMaximumPosition from "./get_minimum_and_maximum_positions";
import { createMPDIntermediateRepresentation, } from "./node_parsers/MPD";
import { createPeriodIntermediateRepresentation, } from "./node_parsers/Period";
import parseAvailabilityStartTime from "./parse_availability_start_time";
import parsePeriods from "./parse_periods";
import resolveBaseURLs from "./resolve_base_urls";
var DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 = config.DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0;
var generateManifestID = idGenerator();
/**
 * @param {Element} root - The MPD root.
 * @param {Object} args
 * @returns {Object}
 */
export default function parseMPD(root, args) {
    // Transform whole MPD into a parsed JS object representation
    var mpdIR = createMPDIntermediateRepresentation(root);
    return loadExternalRessourcesAndParse(mpdIR, args);
}
/**
 * Checks if xlinks needs to be loaded before actually parsing the manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @returns {Object}
 */
function loadExternalRessourcesAndParse(mpdIR, args, hasLoadedClock) {
    var rootChildren = mpdIR.children, rootAttributes = mpdIR.attributes;
    var xlinkInfos = new WeakMap();
    if (args.externalClockOffset == null) {
        var isDynamic = rootAttributes.type === "dynamic";
        var directTiming = arrayFind(rootChildren.utcTimings, function (utcTiming) {
            return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" &&
                utcTiming.value != null;
        });
        var clockOffsetFromDirectUTCTiming = directTiming != null &&
            directTiming.value != null ? getClockOffset(directTiming.value) :
            undefined;
        var clockOffset_1 = clockOffsetFromDirectUTCTiming != null &&
            !isNaN(clockOffsetFromDirectUTCTiming) ?
            clockOffsetFromDirectUTCTiming :
            undefined;
        if (clockOffset_1 != null) {
            args.externalClockOffset = clockOffset_1;
        }
        else if (isDynamic && hasLoadedClock !== true) {
            var UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
            if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
                // TODO fetch UTCTiming and XLinks at the same time
                return {
                    type: "needs-ressources",
                    value: {
                        ressources: [UTCTimingHTTPURL],
                        continue: function continueParsingMPD(loadedRessources) {
                            if (loadedRessources.length !== 1) {
                                throw new Error("DASH parser: wrong number of loaded ressources.");
                            }
                            clockOffset_1 = getClockOffset(loadedRessources[0].responseData);
                            args.externalClockOffset = clockOffset_1;
                            return loadExternalRessourcesAndParse(mpdIR, args, true);
                        },
                    },
                };
            }
        }
    }
    var xlinksToLoad = [];
    for (var i = 0; i < rootChildren.periods.length; i++) {
        var _a = rootChildren.periods[i].attributes, xlinkHref = _a.xlinkHref, xlinkActuate = _a.xlinkActuate;
        if (xlinkHref != null && xlinkActuate === "onLoad") {
            xlinksToLoad.push({ index: i, ressource: xlinkHref });
        }
    }
    if (xlinksToLoad.length === 0) {
        return parseCompleteIntermediateRepresentation(mpdIR, args, xlinkInfos);
    }
    return {
        type: "needs-ressources",
        value: {
            ressources: xlinksToLoad.map(function (_a) {
                var ressource = _a.ressource;
                return ressource;
            }),
            continue: function continueParsingMPD(loadedRessources) {
                var _a;
                if (loadedRessources.length !== xlinksToLoad.length) {
                    throw new Error("DASH parser: wrong number of loaded ressources.");
                }
                // Note: It is important to go from the last index to the first index in
                // the resulting array, as we will potentially add elements to the array
                for (var i = loadedRessources.length - 1; i >= 0; i--) {
                    var index = xlinksToLoad[i].index;
                    var _b = loadedRessources[i], xlinkData = _b.responseData, receivedTime = _b.receivedTime, sendingTime = _b.sendingTime, url = _b.url;
                    var wrappedData = "<root>" + xlinkData + "</root>";
                    var dataAsXML = new DOMParser().parseFromString(wrappedData, "text/xml");
                    if (dataAsXML == null || dataAsXML.children.length === 0) {
                        throw new Error("DASH parser: Invalid external ressources");
                    }
                    var periods = dataAsXML.children[0].children;
                    var periodsIR = [];
                    for (var j = 0; j < periods.length; j++) {
                        if (periods[j].nodeType === Node.ELEMENT_NODE) {
                            var periodIR = createPeriodIntermediateRepresentation(periods[j]);
                            xlinkInfos.set(periodIR, { receivedTime: receivedTime, sendingTime: sendingTime, url: url });
                            periodsIR.push(periodIR);
                        }
                    }
                    // replace original "xlinked" periods by the real deal
                    (_a = rootChildren.periods).splice.apply(_a, __spreadArrays([index, 1], periodsIR));
                }
                return loadExternalRessourcesAndParse(mpdIR, args);
            },
        },
    };
}
/**
 * Parse the MPD intermediate representation into a regular Manifest.
 * @param {Object} mpdIR
 * @param {Object} args
 * @returns {Object}
 */
function parseCompleteIntermediateRepresentation(mpdIR, args, xlinkInfos) {
    var _a, _b;
    var rootChildren = mpdIR.children, rootAttributes = mpdIR.attributes;
    var isDynamic = rootAttributes.type === "dynamic";
    var baseURLs = resolveBaseURLs(args.url === undefined ?
        [] :
        [normalizeBaseURL(args.url)], rootChildren.baseURLs);
    var availabilityStartTime = parseAvailabilityStartTime(rootAttributes, args.referenceDateTime);
    var timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    var clockOffset = args.externalClockOffset;
    var availabilityTimeOffset = extractMinimumAvailabilityTimeOffset(rootChildren.baseURLs);
    var manifestInfos = { aggressiveMode: args.aggressiveMode,
        availabilityStartTime: availabilityStartTime,
        availabilityTimeOffset: availabilityTimeOffset,
        baseURLs: baseURLs,
        clockOffset: clockOffset,
        duration: rootAttributes.duration,
        isDynamic: isDynamic,
        receivedTime: args.manifestReceivedTime,
        timeShiftBufferDepth: timeShiftBufferDepth,
        xlinkInfos: xlinkInfos };
    var parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
    var mediaPresentationDuration = rootAttributes.duration;
    var parsedMPD = {
        availabilityStartTime: availabilityStartTime,
        baseURLs: baseURLs,
        clockOffset: args.externalClockOffset,
        id: rootAttributes.id != null ? rootAttributes.id :
            "gen-dash-manifest-" + generateManifestID(),
        isDynamic: isDynamic,
        isLive: isDynamic,
        periods: parsedPeriods,
        suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
        transportType: "dash",
        uris: args.url == null ?
            rootChildren.locations : __spreadArrays([args.url], rootChildren.locations),
    };
    // -- add optional fields --
    if (rootAttributes.minimumUpdatePeriod !== undefined &&
        rootAttributes.minimumUpdatePeriod >= 0) {
        parsedMPD.lifetime = rootAttributes.minimumUpdatePeriod === 0 ?
            DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 :
            rootAttributes.minimumUpdatePeriod;
    }
    checkManifestIDs(parsedMPD);
    var _c = getMinimumAndMaximumPosition(parsedMPD), minTime = _c[0], maxTime = _c[1];
    var now = performance.now();
    if (!isDynamic) {
        if (minTime !== undefined) {
            parsedMPD.minimumTime = { isContinuous: false,
                value: minTime,
                time: now };
        }
        else if (((_a = parsedPeriods[0]) === null || _a === void 0 ? void 0 : _a.start) !== undefined) {
            parsedMPD.minimumTime = { isContinuous: false,
                value: parsedPeriods[0].start,
                time: now };
        }
        if (maxTime !== undefined) {
            parsedMPD.maximumTime = { isContinuous: false,
                value: maxTime,
                time: now };
        }
        else if (mediaPresentationDuration !== undefined) {
            parsedMPD.maximumTime = { isContinuous: false,
                value: mediaPresentationDuration,
                time: now };
        }
        else if (parsedPeriods[parsedPeriods.length - 1] !== undefined) {
            var lastPeriod = parsedPeriods[parsedPeriods.length - 1];
            var end = (_b = lastPeriod.end) !== null && _b !== void 0 ? _b : (lastPeriod.duration !== undefined ?
                lastPeriod.start + lastPeriod.duration :
                undefined);
            if (end !== undefined) {
                parsedMPD.maximumTime = { isContinuous: false,
                    value: end,
                    time: now };
            }
        }
    }
    else {
        if (minTime != null) {
            parsedMPD.minimumTime = { isContinuous: timeShiftBufferDepth != null,
                value: minTime,
                time: now };
        }
        if (maxTime != null) {
            parsedMPD.maximumTime = { isContinuous: true,
                value: maxTime,
                time: now };
            if (minTime == null) {
                parsedMPD.minimumTime = { isContinuous: true,
                    value: maxTime,
                    time: now };
            }
        }
    }
    return { type: "done", value: parsedMPD };
}
