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
/**
 * This file provides browser-agnostic event listeners under the form of
 * RxJS Observables
 */
import { combineLatest as observableCombineLatest, defer as observableDefer, fromEvent as observableFromEvent, interval as observableInterval, merge as observableMerge, NEVER, of as observableOf, } from "rxjs";
import { delay, distinctUntilChanged, map, mapTo, startWith, switchMap, throttleTime, } from "rxjs/operators";
import config from "../config";
import log from "../log";
import isNonEmptyString from "../utils/is_non_empty_string";
import { HTMLElement_, } from "./browser_compatibility_types";
import isNode from "./is_node";
var BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];
var INACTIVITY_DELAY = config.INACTIVITY_DELAY;
var pixelRatio = isNode ||
    window.devicePixelRatio == null ||
    window.devicePixelRatio === 0 ? 1 :
    window.devicePixelRatio;
/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {string} eventNameSuffix
 * @returns {Boolean}
 */
function isEventSupported(element, eventNameSuffix) {
    var clone = document.createElement(element.tagName);
    var eventName = "on" + eventNameSuffix;
    if (eventName in clone) {
        return true;
    }
    else {
        clone.setAttribute(eventName, "return;");
        return typeof clone[eventName] === "function";
    }
}
/**
 * Find the first supported event from the list given.
 * @param {HTMLElement} element
 * @param {Array.<string>} eventNames
 * @returns {string|undefined}
 */
function findSupportedEvent(element, eventNames) {
    return eventNames
        .filter(function (name) { return isEventSupported(element, name); })[0];
}
/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Array.<string>}
 */
function eventPrefixed(eventNames, prefixes) {
    return eventNames.reduce(function (parent, name) {
        return parent.concat((prefixes == null ? BROWSER_PREFIXES :
            prefixes)
            .map(function (p) { return p + name; }));
    }, []);
}
/**
 * @param {Array.<string>} eventNames
 * @param {Array.<string>|undefined} prefixes
 * @returns {Observable}
 */
function compatibleListener(eventNames, prefixes) {
    var mem;
    var prefixedEvents = eventPrefixed(eventNames, prefixes);
    return function (element) {
        // if the element is a HTMLElement we can detect
        // the supported event, and memoize it in `mem`
        if (element instanceof HTMLElement_) {
            if (typeof mem === "undefined") {
                mem = findSupportedEvent(element, prefixedEvents);
            }
            if (isNonEmptyString(mem)) {
                return observableFromEvent(element, mem);
            }
            else {
                if (false) {
                    log.warn("compat: element " + element.tagName +
                        " does not support any of these events: " +
                        prefixedEvents.join(", "));
                }
                return NEVER;
            }
        }
        // otherwise, we need to listen to all the events
        // and merge them into one observable sequence
        return observableMerge.apply(void 0, prefixedEvents.map(function (eventName) {
            return observableFromEvent(element, eventName);
        }));
    };
}
/**
 * Returns an observable:
 *   - emitting true when the document is visible
 *   - emitting false when the document is hidden
 * @returns {Observable}
 */
function visibilityChange() {
    var prefix;
    var doc = document;
    if (doc.hidden != null) {
        prefix = "";
    }
    else if (doc.mozHidden != null) {
        prefix = "moz";
    }
    else if (doc.msHidden != null) {
        prefix = "ms";
    }
    else if (doc.webkitHidden != null) {
        prefix = "webkit";
    }
    var hidden = isNonEmptyString(prefix) ? prefix + "Hidden" :
        "hidden";
    var visibilityChangeEvent = isNonEmptyString(prefix) ? prefix + "visibilitychange" :
        "visibilitychange";
    return observableDefer(function () {
        var isHidden = document[hidden];
        return observableFromEvent(document, visibilityChangeEvent)
            .pipe(map(function () { return !(document[hidden]); }), startWith(!isHidden), distinctUntilChanged());
    });
}
/**
 * @returns {Observable}
 */
function videoSizeChange() {
    return observableFromEvent(window, "resize");
}
/**
 * Emit `true` if the page is considered active.
 * `false` when considered inactive.
 * Emit the original value on subscription.
 * @returns {Observable}
 */
function isActive() {
    return visibilityChange().pipe(switchMap(function (x) {
        if (!x) {
            return observableOf(x).pipe(delay(INACTIVITY_DELAY));
        }
        return observableOf(x);
    }));
}
/**
 * Get video width from Picture-in-Picture window
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} pipWindow
 * @returns {number}
 */
function getVideoWidthFromPIPWindow(mediaElement, pipWindow) {
    var width = pipWindow.width, height = pipWindow.height;
    var videoRatio = mediaElement.clientHeight / mediaElement.clientWidth;
    var calcWidth = height / videoRatio;
    return Math.min(width, calcWidth);
}
/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export function onPictureInPictureEvent$(mediaElement) {
    return observableDefer(function () {
        if (mediaElement.webkitSupportsPresentationMode &&
            typeof mediaElement.webkitSetPresentationMode === "function") {
            var isWebKitPIPEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
            return observableFromEvent(mediaElement, "webkitpresentationmodechanged")
                .pipe(map(function () { return ({ isEnabled: mediaElement
                    .webkitPresentationMode === "picture-in-picture",
                pipWindow: null }); }), startWith({ isEnabled: isWebKitPIPEnabled, pipWindow: null }));
        }
        var isPIPEnabled = (document.pictureInPictureElement &&
            document.pictureInPictureElement === mediaElement);
        var initialState = { isEnabled: isPIPEnabled, pipWindow: null };
        return observableMerge(observableFromEvent(mediaElement, "enterpictureinpicture")
            .pipe(map(function (evt) { return ({ isEnabled: true,
            /* tslint:disable no-unsafe-any */
            pipWindow: evt.pictureInPictureWindow }); })), 
        /* tslint:enable no-unsafe-any */
        observableFromEvent(mediaElement, "leavepictureinpicture")
            .pipe(mapTo({ isEnabled: false, pipWindow: null }))).pipe(startWith(initialState));
    });
}
/**
 * Returns `true` when video is considered as visible (the page is visible and/or
 * the Picture-In-Picture is activated). Returns `false` otherwise.
 * @param {Observable} pip$
 * @returns {Observable}
 */
function isVideoVisible(pip$) {
    return observableCombineLatest([visibilityChange(), pip$]).pipe(switchMap(function (_a) {
        var isVisible = _a[0], pip = _a[1];
        if (pip.isEnabled || isVisible) {
            return observableOf(true);
        }
        return observableOf(false)
            .pipe(delay(INACTIVITY_DELAY));
    }), distinctUntilChanged());
}
/**
 * Get video width from HTML video element, or video estimated dimensions
 * when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function videoWidth$(mediaElement, pip$) {
    return observableCombineLatest([
        pip$,
        observableInterval(20000).pipe(startWith(null)),
        videoSizeChange().pipe(throttleTime(500), startWith(null)),
    ]).pipe(switchMap(function (_a) {
        var pip = _a[0];
        if (!pip.isEnabled) {
            return observableOf(mediaElement.clientWidth * pixelRatio);
        }
        else if (pip.pipWindow != null) {
            var pipWindow_1 = pip.pipWindow;
            var firstWidth = getVideoWidthFromPIPWindow(mediaElement, pipWindow_1);
            // RxJS typing issue (for the "as any")
            return observableFromEvent(pipWindow_1, "resize").pipe(startWith(firstWidth * pixelRatio), map(function () { return getVideoWidthFromPIPWindow(mediaElement, pipWindow_1) * pixelRatio; }));
        }
        else {
            return observableOf(Infinity);
        }
    }), distinctUntilChanged());
}
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onSeeking$ = compatibleListener(["seeking"]);
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onSeeked$ = compatibleListener(["seeked"]);
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onEnded$ = compatibleListener(["ended"]);
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onTimeUpdate$ = compatibleListener(["timeupdate"]);
/**
 * @param {HTMLElement} element
 * @returns {Observable}
 */
var onFullscreenChange$ = compatibleListener(["fullscreenchange", "FullscreenChange"], 
// On IE11, fullscreen change events is called MSFullscreenChange
BROWSER_PREFIXES.concat("MS"));
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onPlayPause$ = function (mediaElement) {
    return observableMerge(compatibleListener(["play"])(mediaElement), compatibleListener(["pause"])(mediaElement));
};
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onTextTrackChanges$ = function (textTrackList) {
    return observableMerge(compatibleListener(["addtrack"])(textTrackList), compatibleListener(["removetrack"])(textTrackList));
};
/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
var onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);
/**
 * @param {SourceBuffer} sourceBuffer
 * @returns {Observable}
 */
var onUpdate$ = compatibleListener(["update"]);
/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
var onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
var onEncrypted$ = compatibleListener(["encrypted", "needkey"]);
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
var onKeyMessage$ = compatibleListener(["keymessage", "message"]);
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
var onKeyAdded$ = compatibleListener(["keyadded", "ready"]);
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
var onKeyError$ = compatibleListener(["keyerror", "error"]);
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
var onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);
export { isActive, isVideoVisible, videoWidth$, onPlayPause$, onTextTrackChanges$, onLoadedMetadata$, onSeeking$, onSeeked$, onEnded$, onTimeUpdate$, onFullscreenChange$, onSourceOpen$, onUpdate$, onRemoveSourceBuffers$, onEncrypted$, onKeyMessage$, onKeyAdded$, onKeyError$, onKeyStatusesChange$, };
