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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { addTextTrack, } from "../../../compat";
import removeCue from "../../../compat/remove_cue";
import log from "../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import parseTextTrackToCues from "./parsers";
/**
 * SourceBuffer to display TextTracks in a <track> element, in the given
 * video element.
 * @class NativeTextSourceBuffer
 * @extends AbstractSourceBuffer
 */
var NativeTextSourceBuffer = /** @class */ (function (_super) {
    __extends(NativeTextSourceBuffer, _super);
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {Boolean} hideNativeSubtitle
     */
    function NativeTextSourceBuffer(videoElement, hideNativeSubtitle) {
        var _this = this;
        log.debug("NTSB: Creating native text track SourceBuffer");
        _this = _super.call(this) || this;
        var _a = addTextTrack(videoElement, hideNativeSubtitle), track = _a.track, trackElement = _a.trackElement;
        _this._videoElement = videoElement;
        _this._track = track;
        _this._trackElement = trackElement;
        return _this;
    }
    /**
     * Append text tracks.
     * @param {Object} data
     */
    NativeTextSourceBuffer.prototype._append = function (data) {
        log.debug("NTSB: Appending new native text tracks", data);
        var timescale = data.timescale, timescaledStart = data.start, timescaledEnd = data.end, dataString = data.data, type = data.type, language = data.language;
        var startTime = timescaledStart != null ? timescaledStart / timescale :
            undefined;
        var endTime = timescaledEnd != null ? timescaledEnd / timescale :
            undefined;
        var cues = parseTextTrackToCues(type, dataString, this.timestampOffset, language);
        if (this.appendWindowStart !== 0 && this.appendWindowEnd !== Infinity) {
            // Removing before window start
            var i = 0;
            while (i < cues.length && cues[i].endTime <= this.appendWindowStart) {
                i++;
            }
            cues.splice(0, i);
            i = 0;
            while (i < cues.length && cues[i].startTime < this.appendWindowStart) {
                cues[i].startTime = this.appendWindowStart;
                i++;
            }
            // Removing after window end
            i = cues.length - 1;
            while (i >= 0 && cues[i].startTime >= this.appendWindowEnd) {
                i--;
            }
            cues.splice(i, cues.length);
            i = cues.length - 1;
            while (i >= 0 && cues[i].endTime > this.appendWindowEnd) {
                cues[i].endTime = this.appendWindowEnd;
                i--;
            }
        }
        var start;
        if (startTime != null) {
            start = Math.max(this.appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("NTSB: Current text tracks have no cues nor start time. Aborting");
                return;
            }
            log.warn("NTSB: No start time given. Guessing from cues.");
            start = cues[0].startTime;
        }
        var end;
        if (endTime != null) {
            end = Math.min(this.appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("NTSB: Current text tracks have no cues nor end time. Aborting");
                return;
            }
            log.warn("NTSB: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].endTime;
        }
        if (end <= start) {
            log.warn("NTSB: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return;
        }
        if (cues.length <= 0) {
            this.buffered.insert(start, end);
            return;
        }
        var firstCue = cues[0];
        // NOTE(compat): cleanup all current cues if the newly added
        // ones are in the past. this is supposed to fix an issue on
        // IE/Edge.
        // TODO Move to compat
        var currentCues = this._track.cues;
        if (currentCues.length > 0) {
            if (firstCue.startTime < currentCues[currentCues.length - 1].startTime) {
                this._remove(firstCue.startTime, +Infinity);
            }
        }
        for (var i = 0; i < cues.length; i++) {
            this._track.addCue(cues[i]);
        }
        this.buffered.insert(start, end);
    };
    /**
     * @param {Number} from
     * @param {Number} to
     */
    NativeTextSourceBuffer.prototype._remove = function (from, to) {
        log.debug("NTSB: Removing native text track data", from, to);
        var track = this._track;
        var cues = track.cues;
        if (cues != null) {
            for (var i = cues.length - 1; i >= 0; i--) {
                var cue = cues[i];
                var startTime = cue.startTime, endTime = cue.endTime;
                if (startTime >= from && startTime <= to && endTime <= to) {
                    removeCue(track, cue);
                }
            }
        }
        this.buffered.remove(from, to);
    };
    NativeTextSourceBuffer.prototype._abort = function () {
        log.debug("NTSB: Aborting native text track SourceBuffer");
        this._remove(0, Infinity);
        var _a = this, _trackElement = _a._trackElement, _videoElement = _a._videoElement;
        if (_trackElement !== undefined && _videoElement != null &&
            _videoElement.hasChildNodes()) {
            try {
                _videoElement.removeChild(_trackElement);
            }
            catch (e) {
                log.warn("NTSB: Can't remove track element from the video");
            }
        }
        if (this._track != null) {
            this._track.mode = "disabled";
        }
        if (this._trackElement != null) {
            this._trackElement.innerHTML = "";
        }
    };
    return NativeTextSourceBuffer;
}(AbstractSourceBuffer));
export default NativeTextSourceBuffer;
