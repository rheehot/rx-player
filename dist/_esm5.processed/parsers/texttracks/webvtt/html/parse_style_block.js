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
import createDefaultStyleElements from "./create_default_style_elements";
/**
 * Parse style element from WebVTT.
 * @param {Array.<Array.<string>>} styleBlocks
 * @return {Object}
 */
export default function parseStyleBlocks(styleBlocks) {
    var classes = createDefaultStyleElements();
    var global = "";
    styleBlocks.forEach(function (styleBlock) {
        if (styleBlock.length >= 2) {
            var _loop_1 = function (index) {
                var line = styleBlock[index];
                if (Array.isArray(line.match(/::cue {/))) {
                    line = styleBlock[++index];
                    while (isNonEmptyString(line) && (!(Array.isArray(line.match(/}/)) ||
                        line.length === 0))) {
                        global += line;
                        line = styleBlock[++index];
                    }
                }
                else {
                    var classNames = [];
                    var cueClassLine = line.match(/::cue\(\.?(.*?)\)(?:,| {)/);
                    while (isNonEmptyString(line) && Array.isArray(cueClassLine)) {
                        classNames.push(cueClassLine[1]);
                        line = styleBlock[++index];
                        cueClassLine = line.match(/::cue\(\.?(.*?)\)(?:,| {)/);
                    }
                    var styleContent_1 = "";
                    while (isNonEmptyString(line) && (!(Array.isArray(line.match(/}/)) ||
                        line.length === 0))) {
                        styleContent_1 += line;
                        line = styleBlock[++index];
                    }
                    classNames.forEach(function (className) {
                        var styleElement = classes[className];
                        if (styleElement === undefined) {
                            classes[className] = styleContent_1;
                        }
                        else {
                            classes[className] += styleContent_1;
                        }
                    });
                }
                out_index_1 = index;
            };
            var out_index_1;
            for (var index = 1; index < styleBlock.length; index++) {
                _loop_1(index);
                index = out_index_1;
            }
        }
    });
    return { classes: classes, global: global };
}
