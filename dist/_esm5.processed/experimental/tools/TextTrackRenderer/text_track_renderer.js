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
import HTMLTextSourceBuffer from "../../../custom_source_buffers/text/html";
import { addFeatures, } from "../../../features";
/**
 * Display custom text tracks in the given `textTrackElement`, synchronized
 * with the given `videoElement`.
 * @class TextTrackRenderer
 */
var TextTrackRenderer = /** @class */ (function () {
    /**
     * @param {HTMLMediaElement} videoElement - The media element the text track
     * has to be synchronized to.
     * @param {HTMLElement} textTrackElement - The HTML element which will contain
     * the text tracks.
     */
    function TextTrackRenderer(_a) {
        var videoElement = _a.videoElement, textTrackElement = _a.textTrackElement;
        this._sourceBuffer = new HTMLTextSourceBuffer(videoElement, textTrackElement);
    }
    /**
     * Add a given parser from the list of features.
     * @param {Array.<Function>} parsersList
     */
    TextTrackRenderer.addParsers = function (parsersList) {
        addFeatures(parsersList);
    };
    /**
     * Set the currently displayed text track.
     * Replace previous one if one was already set.
     * @param {Object} args
     */
    TextTrackRenderer.prototype.setTextTrack = function (args) {
        this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
        this._sourceBuffer.timestampOffset = typeof args.timeOffset === "number" ?
            args.timeOffset :
            0;
        this._sourceBuffer.appendBufferSync({ timescale: 1,
            start: 0,
            end: Number.MAX_VALUE,
            data: args.data,
            language: args.language,
            type: args.type });
    };
    /**
     * Completely remove the current text track.
     */
    TextTrackRenderer.prototype.removeTextTrack = function () {
        this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
    };
    /**
     * Dispose of most ressources taken by the TextTrackRenderer.
     * /!\ The TextTrackRenderer will be unusable after this method has been
     * called.
     */
    TextTrackRenderer.prototype.dispose = function () {
        this._sourceBuffer.removeSync(0, Number.MAX_VALUE);
        this._sourceBuffer.abort();
    };
    return TextTrackRenderer;
}());
export default TextTrackRenderer;
