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
import log from "../../../../log";
import objectAssign from "../../../../utils/object_assign";
import parseInitialization from "./Initialization";
import { parseBoolean, parseByteRange, } from "./utils";
/**
 * @param {Element} root
 * @returns {Object}
 */
export default function parseSegmentBase(root) {
    var attributes = {};
    var segmentBaseChildren = root.childNodes;
    for (var i = 0; i < segmentBaseChildren.length; i++) {
        if (segmentBaseChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentNode = segmentBaseChildren[i];
            if (currentNode.nodeName === "Initialization") {
                attributes.initialization = parseInitialization(currentNode);
            }
        }
    }
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.name) {
            case "timescale":
                {
                    var _timescale = parseInt(attribute.value, 10);
                    if (isNaN(_timescale)) {
                        log.warn("DASH: invalid timescale (\"" + attribute.value + "\")");
                    }
                    else {
                        attributes.timescale = _timescale;
                    }
                }
                break;
            case "presentationTimeOffset":
                {
                    var _presentationTimeOffset = parseFloat(attribute.value);
                    if (isNaN(_presentationTimeOffset)) {
                        log.warn("DASH: invalid presentationTimeOffset (\"" + attribute.value + "\")");
                    }
                    else {
                        attributes.presentationTimeOffset = _presentationTimeOffset;
                    }
                }
                break;
            case "indexRange":
                var indexRange = parseByteRange(attribute.value);
                if (!Array.isArray(indexRange)) {
                    log.warn("DASH: invalid indexRange (\"" + attribute.value + "\")");
                }
                else {
                    attributes.indexRange = indexRange;
                }
                break;
            case "indexRangeExact":
                attributes.indexRangeExact = parseBoolean(attribute.value);
                break;
            case "availabilityTimeOffset":
                {
                    var availabilityTimeOffset = parseFloat(attribute.value);
                    if (isNaN(availabilityTimeOffset)) {
                        log.warn("DASH: invalid availabilityTimeOffset (\"" + attribute.value + "\")");
                    }
                    else {
                        attributes.availabilityTimeOffset = availabilityTimeOffset;
                    }
                }
                break;
            case "availabilityTimeComplete":
                attributes.availabilityTimeComplete = parseBoolean(attribute.value);
                break;
            case "duration":
                {
                    var duration = parseInt(attribute.value, 10);
                    if (isNaN(duration)) {
                        log.warn("DASH: invalid duration (\"" + attribute.value + "\")");
                    }
                    else {
                        attributes.duration = duration;
                    }
                }
                break;
            case "startNumber":
                {
                    var startNumber = parseInt(attribute.value, 10);
                    if (isNaN(startNumber)) {
                        log.warn("DASH: invalid startNumber (\"" + attribute.value + "\")");
                    }
                    else {
                        attributes.startNumber = startNumber;
                    }
                }
                break;
        }
    }
    var timescale = attributes.timescale == null ? 1 :
        attributes.timescale;
    var indexRangeExact = attributes.indexRangeExact === true;
    var availabilityTimeComplete = attributes.availabilityTimeComplete == null ?
        true :
        attributes.availabilityTimeComplete;
    return objectAssign(attributes, { availabilityTimeComplete: availabilityTimeComplete,
        indexRangeExact: indexRangeExact,
        timeline: [],
        timescale: timescale, });
}
