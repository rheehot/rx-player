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
import { isKnownError, MediaError, } from "../errors";
import arrayFind from "../utils/array_find";
import objectValues from "../utils/object_values";
import Adaptation from "./adaptation";
/**
 * Class representing the tracks and qualities available from a given time
 * period in the the Manifest.
 * @class Period
 */
var Period = /** @class */ (function () {
    /**
     * @constructor
     * @param {Object} args
     * @param {function|undefined} [representationFilter]
     */
    function Period(args, representationFilter) {
        var _this = this;
        this.parsingErrors = [];
        this.id = args.id;
        this.adaptations = Object.keys(args.adaptations)
            .reduce(function (acc, type) {
            var adaptationsForType = args.adaptations[type];
            if (adaptationsForType == null) {
                return acc;
            }
            var filteredAdaptations = adaptationsForType
                .map(function (adaptation) {
                var _a;
                var newAdaptation = null;
                try {
                    newAdaptation = new Adaptation(adaptation, { representationFilter: representationFilter });
                }
                catch (err) {
                    if (isKnownError(err) &&
                        err.code === "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE") {
                        _this.parsingErrors.push(err);
                        return null;
                    }
                    throw err;
                }
                (_a = _this.parsingErrors).push.apply(_a, newAdaptation.parsingErrors);
                return newAdaptation;
            })
                .filter(function (adaptation) {
                return adaptation != null && adaptation.representations.length > 0;
            });
            if (filteredAdaptations.length === 0 &&
                adaptationsForType.length > 0 &&
                (type === "video" || type === "audio")) {
                throw new MediaError("MANIFEST_PARSE_ERROR", "No supported " + type + " adaptations");
            }
            if (filteredAdaptations.length > 0) {
                acc[type] = filteredAdaptations;
            }
            return acc;
        }, {});
        if (!Array.isArray(this.adaptations.video) &&
            !Array.isArray(this.adaptations.audio)) {
            throw new MediaError("MANIFEST_PARSE_ERROR", "No supported audio and video tracks.");
        }
        this.duration = args.duration;
        this.start = args.start;
        if (this.duration != null && this.start != null) {
            this.end = this.start + this.duration;
        }
    }
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
     * Array.
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptations = function () {
        var adaptationsByType = this.adaptations;
        return objectValues(adaptationsByType)
            .reduce(function (acc, adaptations) {
            // Note: the second case cannot happen. TS is just being dumb here
            return adaptations != null ? acc.concat(adaptations) :
                acc;
        }, []);
    };
    /**
     * Returns every `Adaptations` (or `tracks`) linked to that Period for a
     * given type.
     * @param {string} adaptationType
     * @returns {Array.<Object>}
     */
    Period.prototype.getAdaptationsForType = function (adaptationType) {
        var adaptationsForType = this.adaptations[adaptationType];
        return adaptationsForType == null ? [] :
            adaptationsForType;
    };
    /**
     * Returns the Adaptation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    Period.prototype.getAdaptation = function (wantedId) {
        return arrayFind(this.getAdaptations(), function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
    };
    Period.prototype.getPlayableAdaptations = function (type) {
        if (type === undefined) {
            return this.getAdaptations().filter(function (ada) {
                return ada.isSupported && ada.decipherable !== false;
            });
        }
        var adaptationsForType = this.adaptations[type];
        if (adaptationsForType === undefined) {
            return [];
        }
        return adaptationsForType.filter(function (ada) {
            return ada.isSupported && ada.decipherable !== false;
        });
    };
    return Period;
}());
export default Period;
