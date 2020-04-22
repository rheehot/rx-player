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
import { concat as observableConcat, interval as observableInterval, merge as observableMerge, of as observableOf, Subject, } from "rxjs";
import { mapTo, startWith, switchMapTo, takeUntil, } from "rxjs/operators";
import { events, onHeightWidthChange, } from "../../../compat";
import config from "../../../config";
import log from "../../../log";
import AbstractSourceBuffer from "../../abstract_source_buffer";
import parseTextTrackToElements from "./parsers";
import TextTrackCuesStore from "./text_track_cues_store";
import updateProportionalElements from "./update_proportional_elements";
var onEnded$ = events.onEnded$, onSeeked$ = events.onSeeked$, onSeeking$ = events.onSeeking$;
var MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL = config.MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL, TEXT_TRACK_SIZE_CHECKS_INTERVAL = config.TEXT_TRACK_SIZE_CHECKS_INTERVAL;
/**
 * Generate the clock at which TextTrack HTML Cues should be refreshed.
 * @param {HTMLMediaElement} videoElement
 * @returns {Observable}
 */
function generateClock(videoElement) {
    var seeking$ = onSeeking$(videoElement);
    var seeked$ = onSeeked$(videoElement);
    var ended$ = onEnded$(videoElement);
    var manualRefresh$ = observableMerge(seeked$, ended$);
    var autoRefresh$ = observableInterval(MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL)
        .pipe(startWith(null));
    return manualRefresh$.pipe(startWith(null), switchMapTo(observableConcat(autoRefresh$
        .pipe(mapTo(true), takeUntil(seeking$)), observableOf(false))));
}
/**
 * @param {Element} element
 * @param {Element} child
 */
function safelyRemoveChild(element, child) {
    try {
        element.removeChild(child);
    }
    catch (_error) {
        log.warn("HTSB: Can't remove text track: not in the element.");
    }
}
/**
 * @param {HTMLElement} element
 * @returns {Object|null}
 */
function getElementResolution(element) {
    var strRows = element.getAttribute("data-resolution-rows");
    var strColumns = element.getAttribute("data-resolution-columns");
    if (strRows === null || strColumns === null) {
        return null;
    }
    var rows = parseInt(strRows, 10);
    var columns = parseInt(strColumns, 10);
    if (rows === null || columns === null) {
        return null;
    }
    return { rows: rows, columns: columns };
}
/**
 * SourceBuffer to display TextTracks in the given HTML element.
 * @class HTMLTextSourceBuffer
 */
var HTMLTextSourceBuffer = /** @class */ (function (_super) {
    __extends(HTMLTextSourceBuffer, _super);
    /**
     * @param {HTMLMediaElement} videoElement
     * @param {HTMLElement} textTrackElement
     */
    function HTMLTextSourceBuffer(videoElement, textTrackElement) {
        var _this = this;
        log.debug("HTSB: Creating html text track SourceBuffer");
        _this = _super.call(this) || this;
        _this._videoElement = videoElement;
        _this._textTrackElement = textTrackElement;
        _this._clearSizeUpdates$ = new Subject();
        _this._destroy$ = new Subject();
        _this._buffer = new TextTrackCuesStore();
        _this._currentCue = null;
        // update text tracks
        generateClock(_this._videoElement)
            .pipe(takeUntil(_this._destroy$))
            .subscribe(function (shouldDisplay) {
            if (!shouldDisplay) {
                _this._hideCurrentCue();
                return;
            }
            // to spread the time error, we divide the regular chosen interval.
            var time = Math.max(_this._videoElement.currentTime +
                (MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL / 1000) / 2, 0);
            var cue = _this._buffer.get(time);
            if (cue === undefined) {
                _this._hideCurrentCue();
            }
            else {
                _this._displayCue(cue.element);
            }
        });
        return _this;
    }
    /**
     * Append text tracks.
     * @param {Object} data
     */
    HTMLTextSourceBuffer.prototype._append = function (data) {
        log.debug("HTSB: Appending new html text tracks", data);
        var timescale = data.timescale, timescaledStart = data.start, timescaledEnd = data.end, dataString = data.data, type = data.type, language = data.language;
        var startTime = timescaledStart != null ? timescaledStart / timescale :
            undefined;
        var endTime = timescaledEnd != null ? timescaledEnd / timescale :
            undefined;
        var cues = parseTextTrackToElements(type, dataString, this.timestampOffset, language);
        if (this.appendWindowStart !== 0 && this.appendWindowEnd !== Infinity) {
            // Removing before window start
            var i = 0;
            while (i < cues.length && cues[i].end <= this.appendWindowStart) {
                i++;
            }
            cues.splice(0, i);
            i = 0;
            while (i < cues.length && cues[i].start < this.appendWindowStart) {
                cues[i].start = this.appendWindowStart;
                i++;
            }
            // Removing after window end
            i = cues.length - 1;
            while (i >= 0 && cues[i].start >= this.appendWindowEnd) {
                i--;
            }
            cues.splice(i, cues.length);
            i = cues.length - 1;
            while (i >= 0 && cues[i].end > this.appendWindowEnd) {
                cues[i].end = this.appendWindowEnd;
                i--;
            }
        }
        var start;
        if (startTime != null) {
            start = Math.max(this.appendWindowStart, startTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("HTSB: Current text tracks have no cues nor start time. Aborting");
                return;
            }
            log.warn("HTSB: No start time given. Guessing from cues.");
            start = cues[0].start;
        }
        var end;
        if (endTime != null) {
            end = Math.min(this.appendWindowEnd, endTime);
        }
        else {
            if (cues.length <= 0) {
                log.warn("HTSB: Current text tracks have no cues nor end time. Aborting");
                return;
            }
            log.warn("HTSB: No end time given. Guessing from cues.");
            end = cues[cues.length - 1].end;
        }
        if (end <= start) {
            log.warn("HTSB: Invalid text track appended: ", "the start time is inferior or equal to the end time.");
            return;
        }
        this._buffer.insert(cues, start, end);
        this.buffered.insert(start, end);
    };
    /**
     * @param {Number} from
     * @param {Number} to
     */
    HTMLTextSourceBuffer.prototype._remove = function (from, to) {
        log.debug("HTSB: Removing html text track data", from, to);
        this._buffer.remove(from, to);
        this.buffered.remove(from, to);
    };
    /**
     * Free up ressources from this sourceBuffer
     */
    HTMLTextSourceBuffer.prototype._abort = function () {
        log.debug("HTSB: Aborting html text track SourceBuffer");
        this._hideCurrentCue();
        this._remove(0, Infinity);
        this._destroy$.next();
        this._destroy$.complete();
    };
    /**
     * Remove the current cue from being displayed.
     */
    HTMLTextSourceBuffer.prototype._hideCurrentCue = function () {
        this._clearSizeUpdates$.next();
        if (this._currentCue !== null) {
            safelyRemoveChild(this._textTrackElement, this._currentCue.element);
            this._currentCue = null;
        }
    };
    /**
     * Display a new Cue. If one was already present, it will be replaced.
     * @param {HTMLElement} element
     */
    HTMLTextSourceBuffer.prototype._displayCue = function (element) {
        var _this = this;
        if (this._currentCue !== null && this._currentCue.element === element) {
            return; // we're already good
        }
        this._clearSizeUpdates$.next();
        if (this._currentCue !== null) {
            safelyRemoveChild(this._textTrackElement, this._currentCue.element);
        }
        var resolution = getElementResolution(element);
        this._currentCue = { element: element, resolution: resolution };
        if (resolution !== null) {
            // update propertionally-sized elements periodically
            onHeightWidthChange(this._textTrackElement, TEXT_TRACK_SIZE_CHECKS_INTERVAL)
                .pipe(takeUntil(this._clearSizeUpdates$), takeUntil(this._destroy$))
                .subscribe(function (_a) {
                var height = _a.height, width = _a.width;
                if (_this._currentCue !== null && _this._currentCue.resolution !== null) {
                    var hasProport = updateProportionalElements(height, width, _this._currentCue.resolution, _this._currentCue.element);
                    if (!hasProport) {
                        _this._clearSizeUpdates$.next();
                    }
                }
            });
        }
        this._textTrackElement.appendChild(element);
    };
    return HTMLTextSourceBuffer;
}(AbstractSourceBuffer));
export default HTMLTextSourceBuffer;
