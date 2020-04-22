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
import log from "../../../log";
import arrayIncludes from "../../../utils/array_includes";
import assert from "../../../utils/assert";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import objectAssign from "../../../utils/object_assign";
import resolveURL, { normalizeBaseURL, } from "../../../utils/resolve_url";
import takeFirstSet from "../../../utils/take_first_set";
import checkManifestIDs from "../utils/check_manifest_ids";
import { getAudioCodecs, getVideoCodecs, } from "./get_codecs";
import parseCNodes from "./parse_C_nodes";
import parseProtectionNode from "./parse_protection_node";
import RepresentationIndex from "./representation_index";
import parseBoolean from "./utils/parseBoolean";
import reduceChildren from "./utils/reduceChildren";
import { replaceRepresentationSmoothTokens } from "./utils/tokens";
/**
 * Default value for the aggressive `mode`.
 * In this mode, segments will be returned even if we're not sure those had time
 * to be generated.
 */
var DEFAULT_AGGRESSIVE_MODE = false;
var KNOWN_ADAPTATION_TYPES = ["audio", "video", "text", "image"];
var DEFAULT_MIME_TYPES = {
    audio: "audio/mp4",
    video: "video/mp4",
    text: "application/ttml+xml",
};
var MIME_TYPES = {
    AACL: "audio/mp4",
    AVC1: "video/mp4",
    H264: "video/mp4",
    TTML: "application/ttml+xml+mp4",
};
/**
 * @param {Object|undefined} parserOptions
 * @returns {Function}
 */
function createSmoothStreamingParser(parserOptions) {
    if (parserOptions === void 0) { parserOptions = {}; }
    var referenceDateTime = parserOptions.referenceDateTime === undefined ?
        Date.UTC(1970, 0, 1, 0, 0, 0, 0) / 1000 :
        parserOptions.referenceDateTime;
    var minRepresentationBitrate = parserOptions.minRepresentationBitrate === undefined ?
        0 :
        parserOptions.minRepresentationBitrate;
    var serverSyncInfos = parserOptions.serverSyncInfos;
    var serverTimeOffset = serverSyncInfos !== undefined ?
        serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime :
        undefined;
    /**
     * @param {Element} q
     * @param {string} streamType
     * @return {Object}
     */
    function parseQualityLevel(q, streamType) {
        var customAttributes = reduceChildren(q, function (acc, qName, qNode) {
            if (qName === "CustomAttributes") {
                acc.push.apply(acc, reduceChildren(qNode, function (cAttrs, cName, cNode) {
                    if (cName === "Attribute") {
                        var name_1 = cNode.getAttribute("Name");
                        var value = cNode.getAttribute("Value");
                        if (name_1 !== null && value !== null) {
                            cAttrs.push(name_1 + "=" + value);
                        }
                    }
                    return cAttrs;
                }, []));
            }
            return acc;
        }, []);
        /**
         * @param {string} name
         * @returns {string|undefined}
         */
        function getAttribute(name) {
            var attr = q.getAttribute(name);
            return attr == null ? undefined : attr;
        }
        switch (streamType) {
            case "audio": {
                var audiotag = getAttribute("AudioTag");
                var bitsPerSample = getAttribute("BitsPerSample");
                var channels = getAttribute("Channels");
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var packetSize = getAttribute("PacketSize");
                var samplingRate = getAttribute("SamplingRate");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 :
                    isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                        parseInt(bitrateAttr, 10);
                if ((fourCC !== undefined &&
                    MIME_TYPES[fourCC] === undefined) ||
                    codecPrivateData === undefined) {
                    log.warn("Smooth parser: Unsupported audio codec. Ignoring quality level.");
                    return null;
                }
                var codecs = getAudioCodecs(codecPrivateData, fourCC);
                return {
                    audiotag: audiotag !== undefined ? parseInt(audiotag, 10) : audiotag,
                    bitrate: bitrate,
                    bitsPerSample: bitsPerSample !== undefined ?
                        parseInt(bitsPerSample, 10) : bitsPerSample,
                    channels: channels !== undefined ? parseInt(channels, 10) : channels,
                    codecPrivateData: codecPrivateData,
                    codecs: codecs,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
                    packetSize: packetSize !== undefined ?
                        parseInt(packetSize, 10) :
                        packetSize,
                    samplingRate: samplingRate !== undefined ?
                        parseInt(samplingRate, 10) :
                        samplingRate,
                };
            }
            case "video": {
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var width = getAttribute("MaxWidth");
                var height = getAttribute("MaxHeight");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 :
                    isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                        parseInt(bitrateAttr, 10);
                if ((fourCC !== undefined &&
                    MIME_TYPES[fourCC] === undefined) ||
                    codecPrivateData === undefined) {
                    log.warn("Smooth parser: Unsupported video codec. Ignoring quality level.");
                    return null;
                }
                var codecs = getVideoCodecs(codecPrivateData);
                return {
                    bitrate: bitrate,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] : fourCC,
                    codecPrivateData: codecPrivateData,
                    codecs: codecs,
                    width: width !== undefined ? parseInt(width, 10) : undefined,
                    height: height !== undefined ? parseInt(height, 10) : undefined,
                };
            }
            case "text": {
                var codecPrivateData = getAttribute("CodecPrivateData");
                var fourCC = getAttribute("FourCC");
                var bitrateAttr = getAttribute("Bitrate");
                var bitrate = bitrateAttr === undefined ? 0 :
                    isNaN(parseInt(bitrateAttr, 10)) ? 0 :
                        parseInt(bitrateAttr, 10);
                return { bitrate: bitrate,
                    customAttributes: customAttributes,
                    mimeType: fourCC !== undefined ? MIME_TYPES[fourCC] :
                        fourCC,
                    codecPrivateData: takeFirstSet(codecPrivateData, "") };
            }
            default:
                log.error("Smooth Parser: Unrecognized StreamIndex type: " + streamType);
                return null;
        }
    }
    /**
     * Parse the adaptations (<StreamIndex>) tree containing
     * representations (<QualityLevels>) and timestamp indexes (<c>).
     * Indexes can be quite huge, and this function needs to
     * to be optimized.
     * @param {Object} args
     * @returns {Object}
     */
    function parseAdaptation(args) {
        var root = args.root, timescale = args.timescale, rootURL = args.rootURL, protections = args.protections, timeShiftBufferDepth = args.timeShiftBufferDepth, manifestReceivedTime = args.manifestReceivedTime, isLive = args.isLive;
        var timescaleAttr = root.getAttribute("Timescale");
        var _timescale = timescaleAttr === null ? timescale :
            isNaN(+timescaleAttr) ? timescale :
                +timescaleAttr;
        var typeAttribute = root.getAttribute("Type");
        if (typeAttribute === null) {
            throw new Error("StreamIndex without type.");
        }
        if (!arrayIncludes(KNOWN_ADAPTATION_TYPES, typeAttribute)) {
            log.warn("Smooth Parser: Unrecognized adaptation type:", typeAttribute);
        }
        var adaptationType = typeAttribute;
        var subType = root.getAttribute("Subtype");
        var language = root.getAttribute("Language");
        var baseURLAttr = root.getAttribute("Url");
        var baseURL = baseURLAttr === null ? "" :
            baseURLAttr;
        if (false) {
            assert(baseURL !== "");
        }
        var _a = reduceChildren(root, function (res, _name, node) {
            switch (_name) {
                case "QualityLevel":
                    var qualityLevel = parseQualityLevel(node, adaptationType);
                    if (qualityLevel === null) {
                        return res;
                    }
                    // filter out video qualityLevels with small bitrates
                    if (adaptationType !== "video" ||
                        qualityLevel.bitrate > minRepresentationBitrate) {
                        res.qualityLevels.push(qualityLevel);
                    }
                    break;
                case "c":
                    res.cNodes.push(node);
                    break;
            }
            return res;
        }, { qualityLevels: [], cNodes: [] }), qualityLevels = _a.qualityLevels, cNodes = _a.cNodes;
        var index = { timeline: parseCNodes(cNodes),
            timescale: _timescale };
        // we assume that all qualityLevels have the same
        // codec and mimeType
        assert(qualityLevels.length !== 0, "Adaptation should have at least one playable representation.");
        var adaptationID = adaptationType +
            (isNonEmptyString(language) ? ("_" + language) :
                "");
        var representations = qualityLevels.map(function (qualityLevel) {
            var path = resolveURL(rootURL, baseURL);
            var repIndex = {
                timeline: index.timeline,
                timescale: index.timescale,
                media: replaceRepresentationSmoothTokens(path, qualityLevel.bitrate, qualityLevel.customAttributes),
                isLive: isLive,
                timeShiftBufferDepth: timeShiftBufferDepth,
                manifestReceivedTime: manifestReceivedTime,
            };
            var mimeType = isNonEmptyString(qualityLevel.mimeType) ?
                qualityLevel.mimeType :
                DEFAULT_MIME_TYPES[adaptationType];
            var codecs = qualityLevel.codecs;
            var id = adaptationID + "_" +
                (adaptationType != null ? adaptationType + "-" :
                    "") +
                (mimeType != null ? mimeType + "-" :
                    "") +
                (codecs != null ? codecs + "-" :
                    "") +
                String(qualityLevel.bitrate);
            var keyIDs = [];
            var firstProtection;
            if (protections.length > 0) {
                firstProtection = protections[0];
                protections.forEach(function (protection) {
                    var keyId = protection.keyId;
                    protection.keySystems.forEach(function (keySystem) {
                        keyIDs.push({ keyId: keyId,
                            systemId: keySystem.systemId });
                    });
                });
            }
            var segmentPrivateInfos = { bitsPerSample: qualityLevel.bitsPerSample,
                channels: qualityLevel.channels,
                codecPrivateData: qualityLevel.codecPrivateData,
                packetSize: qualityLevel.packetSize,
                samplingRate: qualityLevel.samplingRate,
                // TODO set multiple protections here
                // instead of the first one
                protection: firstProtection != null ? {
                    keyId: firstProtection.keyId,
                    keySystems: firstProtection.keySystems,
                } : undefined, };
            var aggressiveMode = parserOptions.aggressiveMode == null ?
                DEFAULT_AGGRESSIVE_MODE :
                parserOptions.aggressiveMode;
            var reprIndex = new RepresentationIndex(repIndex, { aggressiveMode: aggressiveMode,
                isLive: isLive,
                segmentPrivateInfos: segmentPrivateInfos });
            var representation = objectAssign({}, qualityLevel, { index: reprIndex,
                mimeType: mimeType,
                codecs: codecs,
                id: id });
            if (keyIDs.length > 0) {
                representation.contentProtections = { keyIds: keyIDs,
                    initData: {} };
            }
            return representation;
        });
        // TODO(pierre): real ad-insert support
        if (subType === "ADVT") {
            return null;
        }
        var parsedAdaptation = { id: adaptationID,
            type: adaptationType,
            representations: representations,
            language: language == null ?
                undefined :
                language };
        if (adaptationType === "text" && subType === "DESC") {
            parsedAdaptation.closedCaption = true;
        }
        return parsedAdaptation;
    }
    function parseFromDocument(doc, url, manifestReceivedTime) {
        var rootURL = normalizeBaseURL(url == null ? "" : url);
        var root = doc.documentElement;
        if (root == null || root.nodeName !== "SmoothStreamingMedia") {
            throw new Error("document root should be SmoothStreamingMedia");
        }
        var majorVersionAttr = root.getAttribute("MajorVersion");
        var minorVersionAttr = root.getAttribute("MinorVersion");
        if (majorVersionAttr === null || minorVersionAttr === null ||
            !/^[2]-[0-2]$/.test(majorVersionAttr + "-" + minorVersionAttr)) {
            throw new Error("Version should be 2.0, 2.1 or 2.2");
        }
        var timescaleAttr = root.getAttribute("Timescale");
        var timescale = !isNonEmptyString(timescaleAttr) ? 10000000 :
            isNaN(+timescaleAttr) ? 10000000 :
                +timescaleAttr;
        var _a = reduceChildren(root, function (res, name, node) {
            switch (name) {
                case "Protection": {
                    res.protections.push(parseProtectionNode(node, parserOptions.keySystems));
                    break;
                }
                case "StreamIndex":
                    res.adaptationNodes.push(node);
                    break;
            }
            return res;
        }, {
            adaptationNodes: [],
            protections: [],
        }), protections = _a.protections, adaptationNodes = _a.adaptationNodes;
        var initialAdaptations = {};
        var isLive = parseBoolean(root.getAttribute("IsLive"));
        var timeShiftBufferDepth;
        if (isLive) {
            var dvrWindowLength = root.getAttribute("DVRWindowLength");
            if (dvrWindowLength != null &&
                !isNaN(+dvrWindowLength) &&
                +dvrWindowLength !== 0) {
                timeShiftBufferDepth = +dvrWindowLength / timescale;
            }
        }
        var adaptations = adaptationNodes
            .reduce(function (acc, node) {
            var adaptation = parseAdaptation({ root: node,
                rootURL: rootURL,
                timescale: timescale,
                protections: protections,
                isLive: isLive,
                timeShiftBufferDepth: timeShiftBufferDepth,
                manifestReceivedTime: manifestReceivedTime });
            if (adaptation === null) {
                return acc;
            }
            var type = adaptation.type;
            var adaps = acc[type];
            if (adaps === undefined) {
                acc[type] = [adaptation];
            }
            else {
                adaps.push(adaptation);
            }
            return acc;
        }, initialAdaptations);
        var suggestedPresentationDelay;
        var availabilityStartTime;
        var minimumTime;
        var maximumTime;
        var firstVideoAdaptation = adaptations.video !== undefined ?
            adaptations.video[0] :
            undefined;
        var firstAudioAdaptation = adaptations.audio !== undefined ?
            adaptations.audio[0] :
            undefined;
        var firstTimeReference;
        var lastTimeReference;
        if (firstVideoAdaptation !== undefined || firstAudioAdaptation !== undefined) {
            var firstTimeReferences = [];
            var lastTimeReferences = [];
            if (firstVideoAdaptation !== undefined) {
                var firstVideoRepresentation = firstVideoAdaptation.representations[0];
                if (firstVideoRepresentation !== undefined) {
                    var firstVideoTimeReference = firstVideoRepresentation.index.getFirstPosition();
                    var lastVideoTimeReference = firstVideoRepresentation.index.getLastPosition();
                    if (firstVideoTimeReference != null) {
                        firstTimeReferences.push(firstVideoTimeReference);
                    }
                    if (lastVideoTimeReference != null) {
                        lastTimeReferences.push(lastVideoTimeReference);
                    }
                }
            }
            if (firstAudioAdaptation !== undefined) {
                var firstAudioRepresentation = firstAudioAdaptation.representations[0];
                if (firstAudioRepresentation !== undefined) {
                    var firstAudioTimeReference = firstAudioRepresentation.index.getFirstPosition();
                    var lastAudioTimeReference = firstAudioRepresentation.index.getLastPosition();
                    if (firstAudioTimeReference != null) {
                        firstTimeReferences.push(firstAudioTimeReference);
                    }
                    if (lastAudioTimeReference != null) {
                        lastTimeReferences.push(lastAudioTimeReference);
                    }
                }
            }
            if (firstTimeReferences.length > 0) {
                firstTimeReference = Math.max.apply(Math, firstTimeReferences);
            }
            if (lastTimeReferences.length > 0) {
                lastTimeReference = Math.min.apply(Math, lastTimeReferences);
            }
        }
        var manifestDuration = root.getAttribute("Duration");
        var duration = (manifestDuration != null && +manifestDuration !== 0) ?
            (+manifestDuration / timescale) : undefined;
        if (isLive) {
            suggestedPresentationDelay = parserOptions.suggestedPresentationDelay;
            availabilityStartTime = referenceDateTime;
            var time = performance.now();
            maximumTime = { isContinuous: true,
                value: lastTimeReference != null ?
                    lastTimeReference :
                    (Date.now() / 1000 - availabilityStartTime),
                time: time };
            if (timeShiftBufferDepth == null) {
                // infinite buffer
                minimumTime = { isContinuous: false,
                    value: firstTimeReference != null ? firstTimeReference :
                        availabilityStartTime,
                    time: time };
            }
            else {
                minimumTime = { isContinuous: true,
                    value: Math.min(maximumTime.value - timeShiftBufferDepth + 5, maximumTime.value),
                    time: time };
            }
        }
        else {
            minimumTime = { isContinuous: false,
                value: firstTimeReference != null ? firstTimeReference :
                    0,
                time: performance.now() };
            if (lastTimeReference !== undefined) {
                maximumTime = { isContinuous: false,
                    value: lastTimeReference,
                    time: performance.now() };
            }
            else if (duration !== undefined) {
                maximumTime = { isContinuous: false,
                    value: minimumTime.value + duration,
                    time: performance.now() };
            }
        }
        var periodStart = isLive ? 0 :
            minimumTime.value;
        var periodEnd = isLive ? undefined : maximumTime === null || maximumTime === void 0 ? void 0 : maximumTime.value;
        var manifest = {
            availabilityStartTime: availabilityStartTime === undefined ?
                0 :
                availabilityStartTime,
            clockOffset: serverTimeOffset,
            isLive: isLive,
            isDynamic: isLive,
            maximumTime: maximumTime,
            minimumTime: minimumTime,
            periods: [{ adaptations: adaptations,
                    duration: periodEnd !== undefined ?
                        periodEnd - periodStart : duration,
                    end: periodEnd,
                    id: "gen-smooth-period-0",
                    start: periodStart }],
            suggestedPresentationDelay: suggestedPresentationDelay,
            transportType: "smooth",
            uris: url == null ? [] : [url],
        };
        checkManifestIDs(manifest);
        return manifest;
    }
    return parseFromDocument;
}
export default createSmoothStreamingParser;
