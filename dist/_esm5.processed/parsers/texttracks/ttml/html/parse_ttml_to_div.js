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
import arrayFind from "../../../../utils/array_find";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import objectAssign from "../../../../utils/object_assign";
import getParameters from "../get_parameters";
import getParentElementsByTagName from "../get_parent_elements_by_tag_name";
import { getStylingAttributes, getStylingFromElement, } from "../get_styling";
import { getBodyNode, getRegionNodes, getStyleNodes, getTextNodes, } from "../nodes";
import resolveStylesInheritance from "../resolve_styles_inheritance";
import parseCue from "./parse_cue";
var STYLE_ATTRIBUTES = ["backgroundColor",
    "color",
    "direction",
    "display",
    "displayAlign",
    "extent",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "lineHeight",
    "opacity",
    "origin",
    "overflow",
    "padding",
    "textAlign",
    "textDecoration",
    "textOutline",
    "unicodeBidi",
    "visibility",
    "wrapOption",
    "writingMode",
];
/**
 * Create array of objects which should represent the given TTML text track.
 * These objects have the following structure
 *   - start {Number}: start time, in seconds, at which the cue should
 *     be displayed
 *   - end {Number}: end time, in seconds, at which the cue should
 *     be displayed
 *   - element {HTMLElement}: <div> element representing the cue, with the
 *     right style. This div should then be appended to an element having
 *     the exact size of the wanted region the text track provide cues for.
 *
 * TODO TTML parsing is still pretty heavy on the CPU.
 * Optimizations have been done, principally to avoid using too much XML APIs,
 * but we can still do better.
 * @param {string} str
 * @param {Number} timeOffset
 * @returns {Array.<Object>}
 */
export default function parseTTMLStringToDIV(str, timeOffset) {
    var ret = [];
    var xml = new DOMParser().parseFromString(str, "text/xml");
    if (xml !== null && xml !== undefined) {
        var tts = xml.getElementsByTagName("tt");
        var tt = tts[0];
        if (tt === undefined) {
            throw new Error("invalid XML");
        }
        var body = getBodyNode(tt);
        var styleNodes = getStyleNodes(tt);
        var regionNodes = getRegionNodes(tt);
        var paragraphNodes = getTextNodes(tt);
        var ttParams = getParameters(tt);
        // construct idStyles array based on the xml as an optimization
        var idStyles = [];
        for (var i = 0; i <= styleNodes.length - 1; i++) {
            var styleNode = styleNodes[i];
            if (styleNode instanceof Element) {
                var styleID = styleNode.getAttribute("xml:id");
                if (styleID !== null) {
                    var subStyles = styleNode.getAttribute("style");
                    var extendsStyles = subStyles === null ? [] :
                        subStyles.split(" ");
                    idStyles.push({ id: styleID,
                        style: getStylingFromElement(styleNode),
                        extendsStyles: extendsStyles });
                }
            }
        }
        resolveStylesInheritance(idStyles);
        // construct regionStyles array based on the xml as an optimization
        var regionStyles = [];
        var _loop_1 = function (i) {
            var regionNode = regionNodes[i];
            if (regionNode instanceof Element) {
                var regionID = regionNode.getAttribute("xml:id");
                if (regionID !== null) {
                    var regionStyle = getStylingFromElement(regionNode);
                    var associatedStyleID_1 = regionNode.getAttribute("style");
                    if (isNonEmptyString(associatedStyleID_1)) {
                        var style = arrayFind(idStyles, function (x) { return x.id === associatedStyleID_1; });
                        if (style !== undefined) {
                            regionStyle = objectAssign({}, style.style, regionStyle);
                        }
                    }
                    regionStyles.push({ id: regionID,
                        style: regionStyle,
                        // already handled
                        extendsStyles: [] });
                }
            }
        };
        for (var i = 0; i <= regionNodes.length - 1; i++) {
            _loop_1(i);
        }
        // Computing the style takes a lot of ressources.
        // To avoid too much re-computation, let's compute the body style right
        // now and do the rest progressively.
        // TODO Compute corresponding CSS style here (as soon as we now the TTML
        // style) to speed up the process even
        // more.
        var bodyStyle = body !== null ?
            getStylingAttributes(STYLE_ATTRIBUTES, [body], idStyles, regionStyles) :
            getStylingAttributes(STYLE_ATTRIBUTES, [], idStyles, regionStyles);
        var bodySpaceAttribute = body !== null ? body.getAttribute("xml:space") :
            undefined;
        var shouldTrimWhiteSpaceOnBody = bodySpaceAttribute === "default" ||
            ttParams.spaceStyle === "default";
        for (var i = 0; i < paragraphNodes.length; i++) {
            var paragraph = paragraphNodes[i];
            if (paragraph instanceof Element) {
                var divs = getParentElementsByTagName(paragraph, "div");
                var paragraphStyle = objectAssign({}, bodyStyle, getStylingAttributes(STYLE_ATTRIBUTES, __spreadArrays([paragraph], divs), idStyles, regionStyles));
                var paragraphSpaceAttribute = paragraph.getAttribute("xml:space");
                var shouldTrimWhiteSpaceOnParagraph = isNonEmptyString(paragraphSpaceAttribute) ?
                    paragraphSpaceAttribute === "default" :
                    shouldTrimWhiteSpaceOnBody;
                var cue = parseCue(paragraph, timeOffset, idStyles, regionStyles, body, paragraphStyle, ttParams, shouldTrimWhiteSpaceOnParagraph);
                if (cue !== null) {
                    ret.push(cue);
                }
            }
        }
    }
    return ret;
}
