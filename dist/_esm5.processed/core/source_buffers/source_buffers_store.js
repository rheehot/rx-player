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
import { Observable, of as observableOf, } from "rxjs";
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import QueuedSourceBuffer from "./queued_source_buffer";
var POSSIBLE_BUFFER_TYPES = ["audio",
    "video",
    "text",
    "image"];
/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export function getBufferTypes() {
    var bufferTypes = ["audio", "video"];
    if (features.nativeTextTracksBuffer != null ||
        features.htmlTextTracksBuffer != null) {
        bufferTypes.push("text");
    }
    if (features.imageBuffer != null) {
        bufferTypes.push("image");
    }
    return bufferTypes;
}
/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one SourceBuffer per type is allowed at the same time:
 *
 *   - source buffers for native types (which are "audio" and "video" and which
 *     depend on the native SourceBuffer implementation) are reused if one is
 *     re-created.
 *
 *   - source buffers for custom types are aborted each time a new one of the
 *     same type is created.
 *
 * The returned SourceBuffer is actually a QueuedSourceBuffer instance which
 * wrap a SourceBuffer implementation and queue all its actions.
 *
 * To be able to use a native SourceBuffer, you will first need to create it,
 * but also wait until the other one is either created or explicitely
 * disabled through the `disableSourceBuffer` method.
 * The Observable returned by `waitForUsableSourceBuffers` will emit when
 * that is the case.
 *
 * @class SourceBuffersStore
 */
var SourceBuffersStore = /** @class */ (function () {
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {MediaSource} mediaSource
     * @constructor
     */
    function SourceBuffersStore(mediaElement, mediaSource) {
        this._mediaElement = mediaElement;
        this._mediaSource = mediaSource;
        this._initializedSourceBuffers = {};
        this._onNativeSourceBufferAddedOrDisabled = [];
    }
    /**
     * Returns true if the SourceBuffer is "native".
     * Native SourceBuffers needed for the current content must all be created
     * before the content begins to be played and cannot be disposed during
     * playback.
     * @param {string} bufferType
     * @returns {Boolean}
     */
    SourceBuffersStore.isNative = function (bufferType) {
        return shouldHaveNativeSourceBuffer(bufferType);
    };
    /**
     * Returns the current "status" of the buffer in the SourceBuffer.
     *
     * This function will return  an object containing a key named `type` which
     * can be equal to either one of those three value:
     *
     *   - "initialized": A SourceBuffer has been created. You will in this case
     *     also have a second key, `value`, which will contain the related
     *     QueuedSourceBuffer instance.
     *     Please note that you will need to wait until
     *     `this.waitForUsableSourceBuffers()` has emitted before pushing segment
     *     data to a native QueuedSourceBuffer.
     *
     *   - "disabled": The SourceBuffer has been explicitely disabled for this
     *     type.
     *
     *   - "uninitialized": No action has yet been yet for that SourceBuffer.
     *
     * @param {string} bufferType
     * @returns {QueuedSourceBuffer|null}
     */
    SourceBuffersStore.prototype.getStatus = function (bufferType) {
        var initializedBuffer = this._initializedSourceBuffers[bufferType];
        return initializedBuffer === undefined ? { type: "uninitialized" } :
            initializedBuffer === null ? { type: "disabled" } :
                { type: "initialized",
                    value: initializedBuffer };
    };
    /**
     * Native SourceBuffers (audio and video) needed for playing the current
     * content need to all be created before any one can be used.
     *
     * This function will return an Observable emitting when any and all native
     * Source Buffers through this store can be used.
     *
     * From https://w3c.github.io/media-source/#methods
     *   For example, a user agent may throw a QuotaExceededError
     *   exception if the media element has reached the HAVE_METADATA
     *   readyState. This can occur if the user agent's media engine
     *   does not support adding more tracks during playback.
     * @return {Observable}
     */
    SourceBuffersStore.prototype.waitForUsableSourceBuffers = function () {
        var _this = this;
        if (this._areNativeSourceBuffersUsable()) {
            return observableOf(undefined);
        }
        return new Observable(function (obs) {
            _this._onNativeSourceBufferAddedOrDisabled.push(function () {
                if (_this._areNativeSourceBuffersUsable()) {
                    obs.next(undefined);
                    obs.complete();
                }
            });
        });
    };
    /**
     * Explicitely disable the SourceBuffer for a given buffer type.
     * A call to this function is needed at least for unused native buffer types
     * ("audio" and "video"), to be able to emit through
     * `waitForUsableSourceBuffers` when conditions are met.
     * @param {string}
     */
    SourceBuffersStore.prototype.disableSourceBuffer = function (bufferType) {
        var currentValue = this._initializedSourceBuffers[bufferType];
        if (currentValue === null) {
            log.warn("SBS: The " + bufferType + " SourceBuffer was already disabled.");
            return;
        }
        if (currentValue !== undefined) {
            throw new Error("Cannot disable an active SourceBuffer.");
        }
        this._initializedSourceBuffers[bufferType] = null;
        if (SourceBuffersStore.isNative(bufferType)) {
            this._onNativeSourceBufferAddedOrDisabled.forEach(function (cb) { return cb(); });
        }
    };
    /**
     * Creates a new QueuedSourceBuffer for the SourceBuffer type.
     * Reuse an already created one if a QueuedSourceBuffer for the given type
     * already exists.
     *
     * Please note that you will need to wait until `this.waitForUsableSourceBuffers()`
     * has emitted before pushing segment data to a native QueuedSourceBuffer.
     * @param {string} bufferType
     * @param {string} codec
     * @param {Object|undefined} options
     * @returns {QueuedSourceBuffer}
     */
    SourceBuffersStore.prototype.createSourceBuffer = function (bufferType, codec, options) {
        if (options === void 0) { options = {}; }
        var memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
        if (shouldHaveNativeSourceBuffer(bufferType)) {
            if (memorizedSourceBuffer != null) {
                if (memorizedSourceBuffer.codec !== codec) {
                    log.warn("SB: Reusing native SourceBuffer with codec", memorizedSourceBuffer.codec, "for codec", codec);
                }
                else {
                    log.info("SB: Reusing native SourceBuffer with codec", codec);
                }
                return memorizedSourceBuffer;
            }
            log.info("SB: Adding native SourceBuffer with codec", codec);
            var nativeSourceBuffer = createNativeQueuedSourceBuffer(bufferType, this._mediaSource, codec);
            this._initializedSourceBuffers[bufferType] = nativeSourceBuffer;
            this._onNativeSourceBufferAddedOrDisabled.forEach(function (cb) { return cb(); });
            return nativeSourceBuffer;
        }
        if (memorizedSourceBuffer != null) {
            log.info("SB: Reusing a previous custom SourceBuffer for the type", bufferType);
            return memorizedSourceBuffer;
        }
        if (bufferType === "text") {
            log.info("SB: Creating a new text SourceBuffer with codec", codec);
            var sourceBuffer = void 0;
            if (options.textTrackMode === "html") {
                if (features.htmlTextTracksBuffer == null) {
                    throw new Error("HTML Text track feature not activated");
                }
                sourceBuffer = new features.htmlTextTracksBuffer(this._mediaElement, options.textTrackElement);
            }
            else {
                if (features.nativeTextTracksBuffer == null) {
                    throw new Error("Native Text track feature not activated");
                }
                sourceBuffer = new features
                    .nativeTextTracksBuffer(this._mediaElement, options.hideNativeSubtitle === true);
            }
            var queuedSourceBuffer = new QueuedSourceBuffer("text", codec, sourceBuffer);
            this._initializedSourceBuffers.text = queuedSourceBuffer;
            return queuedSourceBuffer;
        }
        else if (bufferType === "image") {
            if (features.imageBuffer == null) {
                throw new Error("Image buffer feature not activated");
            }
            log.info("SB: Creating a new image SourceBuffer with codec", codec);
            var sourceBuffer = new features.imageBuffer();
            var queuedSourceBuffer = new QueuedSourceBuffer("image", codec, sourceBuffer);
            this._initializedSourceBuffers.image = queuedSourceBuffer;
            return queuedSourceBuffer;
        }
        log.error("SB: Unknown buffer type:", bufferType);
        throw new MediaError("BUFFER_TYPE_UNKNOWN", "The player wants to create a SourceBuffer of an unknown type.");
    };
    /**
     * Dispose of the active SourceBuffer for the given type.
     * @param {string} bufferType
     */
    SourceBuffersStore.prototype.disposeSourceBuffer = function (bufferType) {
        var memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
        if (memorizedSourceBuffer == null) {
            log.warn("SB: Trying to dispose a SourceBuffer that does not exist");
            return;
        }
        log.info("SB: Aborting SourceBuffer", bufferType);
        memorizedSourceBuffer.dispose();
        if (!shouldHaveNativeSourceBuffer(bufferType) ||
            this._mediaSource.readyState === "open") {
            try {
                memorizedSourceBuffer.abort();
            }
            catch (e) {
                log.warn("SB: Failed to abort a " + bufferType + " SourceBuffer:", e);
            }
        }
        delete this._initializedSourceBuffers[bufferType];
    };
    /**
     * Dispose of all QueuedSourceBuffer created on this SourceBuffersStore.
     */
    SourceBuffersStore.prototype.disposeAll = function () {
        var _this = this;
        POSSIBLE_BUFFER_TYPES.forEach(function (bufferType) {
            if (_this.getStatus(bufferType).type === "initialized") {
                _this.disposeSourceBuffer(bufferType);
            }
        });
    };
    /**
     * Returns `true` when we're ready to push and decode contents through our
     * created native SourceBuffers.
     */
    SourceBuffersStore.prototype._areNativeSourceBuffersUsable = function () {
        if (this._initializedSourceBuffers.audio === undefined ||
            this._initializedSourceBuffers.video === undefined) {
            return false;
        }
        if (this._initializedSourceBuffers.video === null) {
            return this._initializedSourceBuffers.audio !== null;
        }
        return true;
    };
    return SourceBuffersStore;
}());
export default SourceBuffersStore;
/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} codec
 * @returns {SourceBuffer}
 */
function createNativeQueuedSourceBuffer(bufferType, mediaSource, codec) {
    var sourceBuffer = mediaSource.addSourceBuffer(codec);
    return new QueuedSourceBuffer(bufferType, codec, sourceBuffer);
}
/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" SourceBuffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(bufferType) {
    return bufferType === "audio" || bufferType === "video";
}
