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
import isNonEmptyString from "../../../utils/is_non_empty_string";
var CELL_RESOLUTION_REGEXP = /(\d+) (\d+)/;
/**
 * Returns global parameters from a TTML Document
 * @param {Element} tt - <tt> node
 * @throws Error - Throws if the spacing style is invalid.
 * @returns {Object}
 */
export default function getParameters(tt) {
    var parsedFrameRate = tt.getAttribute("ttp:frameRate");
    var parsedSubFrameRate = tt.getAttribute("ttp:subFramRate");
    var parsedTickRate = tt.getAttribute("ttp:tickRate");
    var parsedFrameRateMultiplier = tt.getAttribute("ttp:frameRateMultiplier");
    var parsedSpaceStyle = tt.getAttribute("xml:space");
    var parsedCellResolution = tt.getAttribute("ttp:cellResolution");
    var cellResolution = { columns: 32,
        rows: 15 };
    if (parsedCellResolution !== null) {
        var extractedData = CELL_RESOLUTION_REGEXP.exec(parsedCellResolution);
        if (extractedData === null || extractedData.length < 3) {
            log.warn("TTML Parser: Invalid cellResolution");
        }
        else {
            var columns = parseInt(extractedData[1], 10);
            var rows = parseInt(extractedData[2], 10);
            if (isNaN(columns) || isNaN(rows)) {
                log.warn("TTML Parser: Invalid cellResolution");
            }
            else {
                cellResolution = { columns: columns, rows: rows };
            }
        }
    }
    if (isNonEmptyString(parsedSpaceStyle) &&
        parsedSpaceStyle !== "default" &&
        parsedSpaceStyle !== "preserve") {
        throw new Error("Invalid spacing style");
    }
    var nbFrameRate = Number(parsedFrameRate);
    if (isNaN(nbFrameRate) || nbFrameRate <= 0) {
        nbFrameRate = 30;
    }
    var nbSubFrameRate = Number(parsedSubFrameRate);
    if (isNaN(nbSubFrameRate) || nbSubFrameRate <= 0) {
        nbSubFrameRate = 1;
    }
    var nbTickRate = Number(parsedTickRate);
    if (isNaN(nbTickRate) || nbTickRate <= 0) {
        nbTickRate = undefined;
    }
    var frameRate = nbFrameRate;
    var subFrameRate = nbSubFrameRate != null ? nbSubFrameRate :
        1;
    var spaceStyle = parsedSpaceStyle !== null ? parsedSpaceStyle :
        "default";
    var tickRate = nbTickRate !== undefined ? nbTickRate :
        nbFrameRate * nbSubFrameRate;
    if (parsedFrameRateMultiplier !== null) {
        var multiplierResults = /^(\d+) (\d+)$/g.exec(parsedFrameRateMultiplier);
        if (multiplierResults !== null) {
            var numerator = Number(multiplierResults[1]);
            var denominator = Number(multiplierResults[2]);
            var multiplierNum = numerator / denominator;
            frameRate = nbFrameRate * multiplierNum;
        }
    }
    return { cellResolution: cellResolution,
        tickRate: tickRate,
        frameRate: frameRate,
        subFrameRate: subFrameRate,
        spaceStyle: spaceStyle };
}
