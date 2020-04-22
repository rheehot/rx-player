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
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import { BaseRepresentationIndex, ListRepresentationIndex, TemplateRepresentationIndex, TimelineRepresentationIndex } from "./indexes";
import resolveBaseURLs from "./resolve_base_urls";
/**
 * Find and parse RepresentationIndex located in an AdaptationSet node.
 * Returns a generic parsed SegmentTemplate with a single element if not found.
 * @param {Object} adaptation
 * @param {Object} context
 */
function findAdaptationIndex(adaptation, context) {
    var adaptationChildren = adaptation.children;
    var adaptationIndex;
    if (adaptationChildren.segmentBase != null) {
        var segmentBase = adaptationChildren.segmentBase;
        adaptationIndex = new BaseRepresentationIndex(segmentBase, context);
    }
    else if (adaptationChildren.segmentList != null) {
        var segmentList = adaptationChildren.segmentList;
        adaptationIndex = new ListRepresentationIndex(segmentList, context);
    }
    else if (adaptationChildren.segmentTemplate != null) {
        var segmentTemplate = adaptationChildren.segmentTemplate;
        adaptationIndex = segmentTemplate.indexType === "timeline" ?
            new TimelineRepresentationIndex(segmentTemplate, context) :
            new TemplateRepresentationIndex(segmentTemplate, context);
    }
    else {
        adaptationIndex = new TemplateRepresentationIndex({
            duration: Number.MAX_VALUE,
            timescale: 1,
            startNumber: 0,
            initialization: { media: "" },
            media: "",
        }, context);
    }
    return adaptationIndex;
}
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(representationsIR, adaptation, adaptationInfos) {
    var _a, _b, _c, _d;
    var parsedRepresentations = [];
    var _loop_1 = function (representationIdx) {
        var representation = representationsIR[representationIdx];
        var representationBaseURLs = resolveBaseURLs(adaptationInfos.baseURLs, representation.children.baseURLs);
        // 1. Get ID
        var representationID = representation.attributes.id != null ?
            representation.attributes.id :
            (String(representation.attributes.bitrate) +
                (representation.attributes.height != null ?
                    ("-" + representation.attributes.height) :
                    "") +
                (representation.attributes.width != null ?
                    ("-" + representation.attributes.width) :
                    "") +
                (representation.attributes.mimeType != null ?
                    ("-" + representation.attributes.mimeType) :
                    "") +
                (representation.attributes.codecs != null ?
                    ("-" + representation.attributes.codecs) :
                    ""));
        // Avoid duplicate IDs
        while (parsedRepresentations.some(function (r) { return r.id === representationID; })) {
            representationID += "-dup";
        }
        // 2. Retrieve previous version of the Representation, if one.
        var unsafelyBaseOnPreviousRepresentation = (_b = (_a = adaptationInfos
            .unsafelyBaseOnPreviousAdaptation) === null || _a === void 0 ? void 0 : _a.getRepresentation(representationID)) !== null && _b !== void 0 ? _b : null;
        // 3. Find Index
        var context = { aggressiveMode: adaptationInfos.aggressiveMode,
            availabilityTimeOffset: adaptationInfos.availabilityTimeOffset,
            unsafelyBaseOnPreviousRepresentation: unsafelyBaseOnPreviousRepresentation,
            manifestBoundsCalculator: adaptationInfos.manifestBoundsCalculator,
            isDynamic: adaptationInfos.isDynamic,
            periodEnd: adaptationInfos.end,
            periodStart: adaptationInfos.start,
            receivedTime: adaptationInfos.receivedTime,
            representationBaseURLs: representationBaseURLs,
            representationBitrate: representation.attributes.bitrate,
            representationId: representation.attributes.id,
            timeShiftBufferDepth: adaptationInfos.timeShiftBufferDepth };
        var representationIndex = void 0;
        if (representation.children.segmentBase != null) {
            var segmentBase = representation.children.segmentBase;
            context.availabilityTimeOffset =
                adaptationInfos.availabilityTimeOffset +
                    extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
                    ((_c = segmentBase.availabilityTimeOffset) !== null && _c !== void 0 ? _c : 0);
            representationIndex = new BaseRepresentationIndex(segmentBase, context);
        }
        else if (representation.children.segmentList != null) {
            var segmentList = representation.children.segmentList;
            representationIndex = new ListRepresentationIndex(segmentList, context);
        }
        else if (representation.children.segmentTemplate != null) {
            var segmentTemplate = representation.children.segmentTemplate;
            if (segmentTemplate.indexType === "timeline") {
                representationIndex = new TimelineRepresentationIndex(segmentTemplate, context);
            }
            else {
                context.availabilityTimeOffset =
                    adaptationInfos.availabilityTimeOffset +
                        extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
                        ((_d = segmentTemplate.availabilityTimeOffset) !== null && _d !== void 0 ? _d : 0);
                representationIndex = new TemplateRepresentationIndex(segmentTemplate, context);
            }
        }
        else {
            representationIndex = findAdaptationIndex(adaptation, context);
        }
        // 3. Find bitrate
        var representationBitrate = void 0;
        if (representation.attributes.bitrate == null) {
            log.warn("DASH: No usable bitrate found in the Representation.");
            representationBitrate = 0;
        }
        else {
            representationBitrate = representation.attributes.bitrate;
        }
        // 4. Construct Representation Base
        var parsedRepresentation = { bitrate: representationBitrate,
            index: representationIndex,
            id: representationID };
        // 5. Add optional attributes
        var codecs = void 0;
        if (representation.attributes.codecs != null) {
            codecs = representation.attributes.codecs;
        }
        else if (adaptation.attributes.codecs != null) {
            codecs = adaptation.attributes.codecs;
        }
        if (codecs != null) {
            codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
            parsedRepresentation.codecs = codecs;
        }
        if (representation.attributes.frameRate != null) {
            parsedRepresentation.frameRate =
                representation.attributes.frameRate;
        }
        else if (adaptation.attributes.frameRate != null) {
            parsedRepresentation.frameRate =
                adaptation.attributes.frameRate;
        }
        if (representation.attributes.height != null) {
            parsedRepresentation.height =
                representation.attributes.height;
        }
        else if (adaptation.attributes.height != null) {
            parsedRepresentation.height =
                adaptation.attributes.height;
        }
        if (representation.attributes.mimeType != null) {
            parsedRepresentation.mimeType =
                representation.attributes.mimeType;
        }
        else if (adaptation.attributes.mimeType != null) {
            parsedRepresentation.mimeType =
                adaptation.attributes.mimeType;
        }
        if (representation.attributes.width != null) {
            parsedRepresentation.width =
                representation.attributes.width;
        }
        else if (adaptation.attributes.width != null) {
            parsedRepresentation.width =
                adaptation.attributes.width;
        }
        if (adaptation.children.contentProtections != null) {
            var contentProtections = adaptation.children.contentProtections
                .reduce(function (acc, cp) {
                var systemId;
                if (cp.attributes.schemeIdUri !== undefined &&
                    cp.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
                    systemId = cp.attributes.schemeIdUri.substring(9)
                        .replace(/-/g, "")
                        .toLowerCase();
                }
                if (cp.attributes.keyId !== undefined && cp.attributes.keyId.length > 0) {
                    acc.keyIds.push({ keyId: cp.attributes.keyId, systemId: systemId });
                }
                if (systemId !== undefined) {
                    var cencPssh = cp.children.cencPssh;
                    for (var i = 0; i < cencPssh.length; i++) {
                        var data = cencPssh[i];
                        if (acc.initData.cenc === undefined) {
                            acc.initData.cenc = [];
                        }
                        acc.initData.cenc.push({ systemId: systemId, data: data });
                    }
                }
                return acc;
            }, { keyIds: [], initData: {} });
            if (Object.keys(contentProtections.initData).length > 0 ||
                contentProtections.keyIds.length > 0) {
                parsedRepresentation.contentProtections = contentProtections;
            }
        }
        parsedRepresentations.push(parsedRepresentation);
    };
    for (var representationIdx = 0; representationIdx < representationsIR.length; representationIdx++) {
        _loop_1(representationIdx);
    }
    return parsedRepresentations;
}
