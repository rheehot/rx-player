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
import { MediaError, } from "../errors";
import log from "../log";
import arrayFind from "../utils/array_find";
import arrayIncludes from "../utils/array_includes";
import normalizeLanguage from "../utils/languages";
import uniq from "../utils/uniq";
import filterSupportedRepresentations from "./filter_supported_representations";
import Representation from "./representation";
export var SUPPORTED_ADAPTATIONS_TYPE = ["audio",
    "video",
    "text",
    "image"];
function isSupportedAdaptationType(adaptationType) {
    return arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptationType);
}
/**
 * Normalized Adaptation structure.
 * An Adaptation describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
var Adaptation = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    function Adaptation(parsedAdaptation, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        var representationFilter = options.representationFilter, isManuallyAdded = options.isManuallyAdded;
        this.parsingErrors = [];
        this.id = parsedAdaptation.id;
        if (!isSupportedAdaptationType(parsedAdaptation.type)) {
            log.info("Manifest: Not supported adaptation type", parsedAdaptation.type);
            throw new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", "\"" + parsedAdaptation.type + "\" is not a valid " +
                "Adaptation type.");
        }
        this.type = parsedAdaptation.type;
        var hadRepresentations = parsedAdaptation.representations.length !== 0;
        var argsRepresentations = filterSupportedRepresentations(parsedAdaptation.type, parsedAdaptation.representations);
        if (hadRepresentations && argsRepresentations.length === 0) {
            log.warn("Incompatible codecs for adaptation", parsedAdaptation);
            var error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.");
            this.parsingErrors.push(error);
        }
        if (parsedAdaptation.language !== undefined) {
            this.language = parsedAdaptation.language;
            this.normalizedLanguage = normalizeLanguage(parsedAdaptation.language);
        }
        if (parsedAdaptation.closedCaption !== undefined) {
            this.isClosedCaption = parsedAdaptation.closedCaption;
        }
        if (parsedAdaptation.audioDescription !== undefined) {
            this.isAudioDescription = parsedAdaptation.audioDescription;
        }
        if (parsedAdaptation.isDub !== undefined) {
            this.isDub = parsedAdaptation.isDub;
        }
        this.representations = argsRepresentations
            .map(function (representation) { return new Representation(representation); })
            .sort(function (a, b) { return a.bitrate - b.bitrate; })
            .filter(function (representation) {
            if (representationFilter == null) {
                return true;
            }
            return representationFilter(representation, { bufferType: _this.type,
                language: _this.language,
                normalizedLanguage: _this.normalizedLanguage,
                isClosedCaption: _this.isClosedCaption,
                isDub: _this.isDub,
                isAudioDescription: _this.isAudioDescription });
        });
        // for manuallyAdded adaptations (not in the manifest)
        this.manuallyAdded = isManuallyAdded === true;
    }
    /**
     * Returns unique bitrate for every Representation in this Adaptation.
     * @returns {Array.<Number>}
     */
    Adaptation.prototype.getAvailableBitrates = function () {
        var bitrates = [];
        for (var i = 0; i < this.representations.length; i++) {
            var representation = this.representations[i];
            if (representation.decipherable !== false) {
                bitrates.push(representation.bitrate);
            }
        }
        return uniq(bitrates);
    };
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    Adaptation.prototype.getRepresentation = function (wantedId) {
        return arrayFind(this.representations, function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    return Adaptation;
}());
export default Adaptation;
