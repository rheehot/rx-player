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
import EventEmitter from "../../utils/event_emitter";
import normalizeLanguage from "../../utils/languages";
/**
 * Check if track array is different from an other one
 * @param {Array.<Object>} oldTrackArray
 * @param {Array.<Object>} newTrackArray
 * @returns {boolean}
 */
function areTrackArraysDifferent(oldTrackArray, newTrackArray) {
    var _a;
    if (newTrackArray.length !== oldTrackArray.length) {
        return true;
    }
    for (var i = 0; i < newTrackArray.length; i++) {
        if (newTrackArray[i].nativeTrack !== ((_a = oldTrackArray[i]) === null || _a === void 0 ? void 0 : _a.nativeTrack)) {
            return true;
        }
    }
    return false;
}
/**
 * Create audio tracks from native audio tracks.
 * @param {AudioTrackList} audioTracks
 * @returns {Array.<Object>}
 */
function createAudioTracks(audioTracks) {
    var _a;
    var newAudioTracks = [];
    var languagesOccurences = {};
    for (var i = 0; i < audioTracks.length; i++) {
        var audioTrack = audioTracks[i];
        var language = audioTrack.language === "" ? "nolang" :
            audioTrack.language;
        var occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        var id = "gen_audio_" +
            language +
            "_" +
            occurences.toString();
        languagesOccurences[language] = occurences + 1;
        var track = { language: audioTrack.language,
            id: id,
            normalized: normalizeLanguage(audioTrack.language),
            audioDescription: false };
        newAudioTracks.push({ track: track,
            nativeTrack: audioTrack });
    }
    return newAudioTracks;
}
/**
 * Create text tracks from native text tracks.
 * @param {TextTrackList} textTracks
 * @returns {Array.<Object>}
 */
function createTextTracks(textTracks) {
    var _a;
    var newTextTracks = [];
    var languagesOccurences = {};
    for (var i = 0; i < textTracks.length; i++) {
        var textTrack = textTracks[i];
        var language = textTrack.language === "" ? "nolang" :
            textTrack.language;
        var occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        var id = "gen_text_" +
            language +
            "_" +
            occurences.toString();
        languagesOccurences[language] = occurences + 1;
        var track = { language: textTrack.language,
            id: id,
            normalized: normalizeLanguage(textTrack.language),
            closedCaption: textTrack.kind === "captions" };
        newTextTracks.push({ track: track,
            nativeTrack: textTrack });
    }
    return newTextTracks;
}
/**
 * Create video tracks from native video tracks.
 * @param {VideoTrackList} videoTracks
 * @returns {Array.<Object>}
 */
function createVideoTracks(videoTracks) {
    var _a;
    var newVideoTracks = [];
    var languagesOccurences = {};
    for (var i = 0; i < videoTracks.length; i++) {
        var videoTrack = videoTracks[i];
        var language = videoTrack.language === "" ? "nolang" :
            videoTrack.language;
        var occurences = (_a = languagesOccurences[language]) !== null && _a !== void 0 ? _a : 1;
        var id = "gen_video_" +
            language +
            "_" +
            occurences.toString();
        languagesOccurences[language] = occurences + 1;
        newVideoTracks.push({ track: { id: id,
                representations: [] },
            nativeTrack: videoTrack });
    }
    return newVideoTracks;
}
/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTrackChoiceManager
 */
var MediaElementTrackChoiceManager = /** @class */ (function (_super) {
    __extends(MediaElementTrackChoiceManager, _super);
    function MediaElementTrackChoiceManager(defaults, mediaElement) {
        var _a, _b, _c;
        var _this = _super.call(this) || this;
        var preferredAudioTracks = defaults.preferredAudioTracks, preferredTextTracks = defaults.preferredTextTracks;
        _this._preferredAudioTracks = preferredAudioTracks;
        _this._preferredTextTracks = preferredTextTracks;
        // TODO In practice, the audio/video/text tracks API are not always implemented on
        // the media element, although Typescript HTMLMediaElement types tend to mean
        // that can't be undefined.
        _this._nativeAudioTracks = mediaElement.audioTracks;
        _this._nativeVideoTracks = mediaElement.videoTracks;
        _this._nativeTextTracks = mediaElement.textTracks;
        _this._audioTracks =
            _this._nativeAudioTracks !== undefined ? createAudioTracks(_this._nativeAudioTracks) :
                [];
        _this._videoTracks =
            _this._nativeVideoTracks !== undefined ? createVideoTracks(_this._nativeVideoTracks) :
                [];
        _this._textTracks =
            _this._nativeTextTracks !== undefined ? createTextTracks(_this._nativeTextTracks) :
                [];
        _this._lastEmittedNativeAudioTrack = (_a = _this._getPrivateChosenAudioTrack()) === null || _a === void 0 ? void 0 : _a.nativeTrack;
        _this._lastEmittedNativeVideoTrack = (_b = _this._getPrivateChosenVideoTrack()) === null || _b === void 0 ? void 0 : _b.nativeTrack;
        _this._lastEmittedNativeTextTrack = (_c = _this._getPrivateChosenTextTrack()) === null || _c === void 0 ? void 0 : _c.nativeTrack;
        _this._handleNativeTracksCallbacks();
        return _this;
    }
    MediaElementTrackChoiceManager.prototype.setAudioTrackById = function (id) {
        for (var i = 0; i < this._audioTracks.length; i++) {
            var _a = this._audioTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
            if (track.id === id) {
                nativeTrack.enabled = true;
                return;
            }
        }
        throw new Error("Audio track not found.");
    };
    MediaElementTrackChoiceManager.prototype.disableTextTrack = function () {
        for (var i = 0; i < this._textTracks.length; i++) {
            var nativeTrack = this._textTracks[i].nativeTrack;
            nativeTrack.mode = "disabled";
        }
    };
    MediaElementTrackChoiceManager.prototype.setTextTrackById = function (id) {
        var hasSetTrack = false;
        for (var i = 0; i < this._textTracks.length; i++) {
            var _a = this._textTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
            if (track.id === id) {
                nativeTrack.mode = "showing";
                hasSetTrack = true;
            }
            else if (nativeTrack.mode === "showing" || nativeTrack.mode === "hidden") {
                nativeTrack.mode = "disabled";
            }
        }
        if (!hasSetTrack) {
            throw new Error("Text track not found.");
        }
    };
    MediaElementTrackChoiceManager.prototype.setVideoTrackById = function (id) {
        for (var i = 0; i < this._videoTracks.length; i++) {
            var _a = this._videoTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
            if (track.id === id) {
                nativeTrack.selected = true;
                return;
            }
        }
        throw new Error("Video track not found.");
    };
    MediaElementTrackChoiceManager.prototype.getChosenAudioTrack = function () {
        var chosenPrivateAudioTrack = this._getPrivateChosenAudioTrack();
        if (chosenPrivateAudioTrack != null) {
            return chosenPrivateAudioTrack.track;
        }
        return chosenPrivateAudioTrack;
    };
    MediaElementTrackChoiceManager.prototype.getChosenTextTrack = function () {
        var chosenPrivateTextTrack = this._getPrivateChosenTextTrack();
        if (chosenPrivateTextTrack != null) {
            return chosenPrivateTextTrack.track;
        }
        return chosenPrivateTextTrack;
    };
    MediaElementTrackChoiceManager.prototype.getChosenVideoTrack = function () {
        var chosenPrivateVideoTrack = this._getPrivateChosenVideoTrack();
        if (chosenPrivateVideoTrack != null) {
            return chosenPrivateVideoTrack.track;
        }
        return chosenPrivateVideoTrack;
    };
    MediaElementTrackChoiceManager.prototype.getAvailableAudioTracks = function () {
        return this._audioTracks.map(function (_a) {
            var track = _a.track, nativeTrack = _a.nativeTrack;
            return { id: track.id,
                language: track.language,
                normalized: track.normalized,
                audioDescription: track.audioDescription,
                active: nativeTrack.enabled };
        });
    };
    MediaElementTrackChoiceManager.prototype.getAvailableTextTracks = function () {
        return this._textTracks.map(function (_a) {
            var track = _a.track, nativeTrack = _a.nativeTrack;
            return { id: track.id,
                language: track.language,
                normalized: track.normalized,
                closedCaption: track.closedCaption,
                active: nativeTrack.mode === "showing" };
        });
    };
    MediaElementTrackChoiceManager.prototype.getAvailableVideoTracks = function () {
        return this._videoTracks.map(function (_a) {
            var track = _a.track, nativeTrack = _a.nativeTrack;
            return { id: track.id,
                representations: track.representations,
                active: nativeTrack.selected };
        });
    };
    MediaElementTrackChoiceManager.prototype.dispose = function () {
        if (this._nativeVideoTracks !== undefined) {
            this._nativeVideoTracks.onchange = null;
            this._nativeVideoTracks.onaddtrack = null;
            this._nativeVideoTracks.onremovetrack = null;
        }
        if (this._nativeAudioTracks !== undefined) {
            this._nativeAudioTracks.onchange = null;
            this._nativeAudioTracks.onaddtrack = null;
            this._nativeAudioTracks.onremovetrack = null;
        }
        if (this._nativeTextTracks !== undefined) {
            this._nativeTextTracks.onchange = null;
            this._nativeTextTracks.onaddtrack = null;
            this._nativeTextTracks.onremovetrack = null;
        }
        this.removeEventListener();
    };
    MediaElementTrackChoiceManager.prototype._getPrivateChosenAudioTrack = function () {
        if (this._nativeAudioTracks === undefined) {
            return undefined;
        }
        for (var i = 0; i < this._audioTracks.length; i++) {
            var audioTrack = this._audioTracks[i];
            if (audioTrack.nativeTrack.enabled) {
                return audioTrack;
            }
        }
        return null;
    };
    MediaElementTrackChoiceManager.prototype._getPrivateChosenVideoTrack = function () {
        if (this._nativeVideoTracks === undefined) {
            return undefined;
        }
        for (var i = 0; i < this._videoTracks.length; i++) {
            var videoTrack = this._videoTracks[i];
            if (videoTrack.nativeTrack.selected) {
                return videoTrack;
            }
        }
        return null;
    };
    MediaElementTrackChoiceManager.prototype._getPrivateChosenTextTrack = function () {
        if (this._nativeTextTracks === undefined) {
            return undefined;
        }
        for (var i = 0; i < this._textTracks.length; i++) {
            var textTrack = this._textTracks[i];
            if (textTrack.nativeTrack.mode === "showing") {
                return textTrack;
            }
        }
        return null;
    };
    MediaElementTrackChoiceManager.prototype._setPreferredAudioTrack = function () {
        var preferredAudioTracks = this._preferredAudioTracks.getValue();
        var normalizedTracks = preferredAudioTracks
            .filter(function (audioTrack) { return audioTrack !== null; })
            .map(function (_a) {
            var language = _a.language, audioDescription = _a.audioDescription;
            var normalized = normalizeLanguage(language);
            return {
                normalized: normalized,
                audioDescription: audioDescription,
            };
        });
        for (var i = 0; i < normalizedTracks.length; i++) {
            var track = normalizedTracks[i];
            for (var j = 0; j < this._audioTracks.length; j++) {
                var audioTrack = this._audioTracks[j];
                if (audioTrack.track.normalized === track.normalized &&
                    audioTrack.track.audioDescription === track.audioDescription) {
                    this.setAudioTrackById(audioTrack.track.id);
                    return;
                }
            }
        }
    };
    MediaElementTrackChoiceManager.prototype._setPreferredTextTrack = function () {
        var preferredTextTracks = this._preferredTextTracks.getValue();
        var normalizedTracks = preferredTextTracks
            .filter(function (textTrack) { return textTrack !== null; })
            .map(function (_a) {
            var language = _a.language, closedCaption = _a.closedCaption;
            var normalized = normalizeLanguage(language);
            return {
                normalized: normalized,
                closedCaption: closedCaption,
            };
        });
        for (var i = 0; i < normalizedTracks.length; i++) {
            var track = normalizedTracks[i];
            for (var j = 0; j < this._textTracks.length; j++) {
                var textTrack = this._textTracks[j];
                if (textTrack.track.normalized === track.normalized &&
                    textTrack.track.closedCaption === track.closedCaption) {
                    this.setTextTrackById(textTrack.track.id);
                    return;
                }
            }
        }
    };
    // Monitor native tracks add, remove and change callback and trigger the
    // change events.
    MediaElementTrackChoiceManager.prototype._handleNativeTracksCallbacks = function () {
        var _this = this;
        if (this._nativeAudioTracks !== undefined) {
            this._nativeAudioTracks.onaddtrack = function () {
                var _a, _b;
                if (_this._nativeAudioTracks !== undefined) {
                    var newAudioTracks = createAudioTracks(_this._nativeAudioTracks);
                    if (areTrackArraysDifferent(_this._audioTracks, newAudioTracks)) {
                        _this._audioTracks = newAudioTracks;
                        _this._setPreferredAudioTrack();
                        _this.trigger("availableAudioTracksChange", _this.getAvailableAudioTracks());
                        var chosenAudioTrack = _this._getPrivateChosenAudioTrack();
                        if ((chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== _this._lastEmittedNativeAudioTrack) {
                            _this.trigger("audioTrackChange", (_a = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeAudioTrack = (_b = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeAudioTracks.onremovetrack = function () {
                var _a, _b;
                if (_this._nativeAudioTracks !== undefined) {
                    var newAudioTracks = createAudioTracks(_this._nativeAudioTracks);
                    if (areTrackArraysDifferent(_this._audioTracks, newAudioTracks)) {
                        _this._audioTracks = newAudioTracks;
                        _this._setPreferredAudioTrack();
                        _this.trigger("availableAudioTracksChange", _this.getAvailableAudioTracks());
                        var chosenAudioTrack = _this._getPrivateChosenAudioTrack();
                        if ((chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== _this._lastEmittedNativeAudioTrack) {
                            _this.trigger("audioTrackChange", (_a = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeAudioTrack = (_b = chosenAudioTrack === null || chosenAudioTrack === void 0 ? void 0 : chosenAudioTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeAudioTracks.onchange = function () {
                if (_this._audioTracks !== undefined) {
                    for (var i = 0; i < _this._audioTracks.length; i++) {
                        var _a = _this._audioTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
                        if (nativeTrack.enabled) {
                            if (nativeTrack !== _this._lastEmittedNativeAudioTrack) {
                                _this.trigger("audioTrackChange", track);
                                _this._lastEmittedNativeAudioTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (_this._lastEmittedNativeAudioTrack !== null) {
                    _this.trigger("audioTrackChange", null);
                    _this._lastEmittedNativeAudioTrack = null;
                }
                return;
            };
        }
        if (this._nativeTextTracks !== undefined) {
            this._nativeTextTracks.onaddtrack = function () {
                var _a, _b;
                if (_this._nativeTextTracks !== undefined) {
                    var newTextTracks = createTextTracks(_this._nativeTextTracks);
                    if (areTrackArraysDifferent(_this._textTracks, newTextTracks)) {
                        _this._textTracks = newTextTracks;
                        _this._setPreferredTextTrack();
                        _this.trigger("availableTextTracksChange", _this.getAvailableTextTracks());
                        var chosenTextTrack = _this._getPrivateChosenTextTrack();
                        if ((chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== _this._lastEmittedNativeTextTrack) {
                            _this.trigger("textTrackChange", (_a = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeTextTrack = (_b = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeTextTracks.onremovetrack = function () {
                var _a, _b;
                if (_this._nativeTextTracks !== undefined) {
                    var newTextTracks = createTextTracks(_this._nativeTextTracks);
                    if (areTrackArraysDifferent(_this._textTracks, newTextTracks)) {
                        _this._textTracks = newTextTracks;
                        _this._setPreferredTextTrack();
                        _this.trigger("availableTextTracksChange", _this.getAvailableTextTracks());
                        var chosenTextTrack = _this._getPrivateChosenTextTrack();
                        if ((chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== _this._lastEmittedNativeTextTrack) {
                            _this.trigger("textTrackChange", (_a = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeTextTrack = (_b = chosenTextTrack === null || chosenTextTrack === void 0 ? void 0 : chosenTextTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeTextTracks.onchange = function () {
                if (_this._textTracks !== undefined) {
                    for (var i = 0; i < _this._textTracks.length; i++) {
                        var _a = _this._textTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
                        if (nativeTrack.mode === "showing") {
                            if (nativeTrack !== _this._lastEmittedNativeTextTrack) {
                                _this.trigger("textTrackChange", track);
                                _this._lastEmittedNativeTextTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (_this._lastEmittedNativeTextTrack !== null) {
                    _this.trigger("textTrackChange", null);
                    _this._lastEmittedNativeTextTrack = null;
                }
                return;
            };
        }
        if (this._nativeVideoTracks !== undefined) {
            this._nativeVideoTracks.onaddtrack = function () {
                var _a, _b;
                if (_this._nativeVideoTracks !== undefined) {
                    var newVideoTracks = createVideoTracks(_this._nativeVideoTracks);
                    if (areTrackArraysDifferent(_this._videoTracks, newVideoTracks)) {
                        _this._videoTracks = newVideoTracks;
                        _this.trigger("availableVideoTracksChange", _this.getAvailableVideoTracks());
                        var chosenVideoTrack = _this._getPrivateChosenVideoTrack();
                        if ((chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== _this._lastEmittedNativeVideoTrack) {
                            _this.trigger("videoTrackChange", (_a = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeVideoTrack = (_b = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeVideoTracks.onremovetrack = function () {
                var _a, _b;
                if (_this._nativeVideoTracks !== undefined) {
                    var newVideoTracks = createVideoTracks(_this._nativeVideoTracks);
                    if (areTrackArraysDifferent(_this._videoTracks, newVideoTracks)) {
                        _this._videoTracks = newVideoTracks;
                        _this.trigger("availableVideoTracksChange", _this.getAvailableVideoTracks());
                        var chosenVideoTrack = _this._getPrivateChosenVideoTrack();
                        if ((chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== _this._lastEmittedNativeVideoTrack) {
                            _this.trigger("videoTrackChange", (_a = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.track) !== null && _a !== void 0 ? _a : null);
                            _this._lastEmittedNativeVideoTrack = (_b = chosenVideoTrack === null || chosenVideoTrack === void 0 ? void 0 : chosenVideoTrack.nativeTrack) !== null && _b !== void 0 ? _b : null;
                        }
                    }
                }
            };
            this._nativeVideoTracks.onchange = function () {
                if (_this._videoTracks !== undefined) {
                    for (var i = 0; i < _this._videoTracks.length; i++) {
                        var _a = _this._videoTracks[i], track = _a.track, nativeTrack = _a.nativeTrack;
                        if (nativeTrack.selected) {
                            if (nativeTrack !== _this._lastEmittedNativeVideoTrack) {
                                _this.trigger("videoTrackChange", track);
                                _this._lastEmittedNativeVideoTrack = nativeTrack;
                            }
                            return;
                        }
                    }
                }
                if (_this._lastEmittedNativeVideoTrack !== null) {
                    _this.trigger("videoTrackChange", null);
                    _this._lastEmittedNativeVideoTrack = null;
                }
                return;
            };
        }
    };
    return MediaElementTrackChoiceManager;
}(EventEmitter));
export default MediaElementTrackChoiceManager;
