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
import { Observable } from "rxjs";
import QueuedSourceBuffer, { IBufferType } from "./queued_source_buffer";
/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export declare function getBufferTypes(): IBufferType[];
export declare type ITextTrackSourceBufferOptions = {
    textTrackMode?: "native";
    hideNativeSubtitle?: boolean;
} | {
    textTrackMode: "html";
    textTrackElement: HTMLElement;
};
export declare type ISourceBufferOptions = ITextTrackSourceBufferOptions;
declare type INativeSourceBufferType = "audio" | "video";
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
export default class SourceBuffersStore {
    /**
     * Returns true if the SourceBuffer is "native".
     * Native SourceBuffers needed for the current content must all be created
     * before the content begins to be played and cannot be disposed during
     * playback.
     * @param {string} bufferType
     * @returns {Boolean}
     */
    static isNative(bufferType: string): bufferType is INativeSourceBufferType;
    /**
     * HTMLMediaElement on which the MediaSource (on which wanted SourceBuffers
     * will be created) is attached.
     */
    private readonly _mediaElement;
    /** MediaSource on which the SourceBuffers will be created. */
    private readonly _mediaSource;
    /**
     * List of initialized and explicitely disabled SourceBuffers.
     * SourceBuffers are actually wrapped in QueuedSourceBuffer objects for easier
     * exploitation.
     * A `null` value indicates that this SourceBuffers has been explicitely
     * disabled. This means that the corresponding type (e.g. audio, video etc.)
     * won't be needed when playing the current content.
     */
    private _initializedSourceBuffers;
    /**
     * Callbacks called when a native SourceBuffers is either created or disabled.
     * Used for example to trigger the `this.waitForUsableSourceBuffers`
     * Observable.
     */
    private _onNativeSourceBufferAddedOrDisabled;
    /**
     * @param {HTMLMediaElement} mediaElement
     * @param {MediaSource} mediaSource
     * @constructor
     */
    constructor(mediaElement: HTMLMediaElement, mediaSource: MediaSource);
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
    getStatus(bufferType: IBufferType): {
        type: "initialized";
        value: QueuedSourceBuffer<any>;
    } | {
        type: "uninitialized";
    } | {
        type: "disabled";
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
    waitForUsableSourceBuffers(): Observable<void>;
    /**
     * Explicitely disable the SourceBuffer for a given buffer type.
     * A call to this function is needed at least for unused native buffer types
     * ("audio" and "video"), to be able to emit through
     * `waitForUsableSourceBuffers` when conditions are met.
     * @param {string}
     */
    disableSourceBuffer(bufferType: IBufferType): void;
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
    createSourceBuffer(bufferType: IBufferType, codec: string, options?: ISourceBufferOptions): QueuedSourceBuffer<any>;
    /**
     * Dispose of the active SourceBuffer for the given type.
     * @param {string} bufferType
     */
    disposeSourceBuffer(bufferType: IBufferType): void;
    /**
     * Dispose of all QueuedSourceBuffer created on this SourceBuffersStore.
     */
    disposeAll(): void;
    /**
     * Returns `true` when we're ready to push and decode contents through our
     * created native SourceBuffers.
     */
    private _areNativeSourceBuffersUsable;
}
export {};
