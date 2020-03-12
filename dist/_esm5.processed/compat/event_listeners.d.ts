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
import { Observable } from "rxjs";
import { IEventEmitter } from "../utils/event_emitter";
import { ICompatPictureInPictureWindow } from "./browser_compatibility_types";
export interface IEventEmitterLike {
    addEventListener: (eventName: string, handler: () => void) => void;
    removeEventListener: (eventName: string, handler: () => void) => void;
}
export declare type IEventTargetLike = HTMLElement | IEventEmitterLike | IEventEmitter<any>;
/**
 * Emit `true` if the page is considered active.
 * `false` when considered inactive.
 * Emit the original value on subscription.
 * @returns {Observable}
 */
declare function isActive(): Observable<boolean>;
export interface IPictureInPictureEvent {
    isEnabled: boolean;
    pipWindow: ICompatPictureInPictureWindow | null;
}
/**
 * Emit when video enters and leaves Picture-In-Picture mode.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export declare function onPictureInPictureEvent$(mediaElement: HTMLMediaElement): Observable<IPictureInPictureEvent>;
/**
 * Returns `true` when video is considered as visible (the page is visible and/or
 * the Picture-In-Picture is activated). Returns `false` otherwise.
 * @param {Observable} pip$
 * @returns {Observable}
 */
declare function isVideoVisible(pip$: Observable<IPictureInPictureEvent>): Observable<boolean>;
/**
 * Get video width from HTML video element, or video estimated dimensions
 * when Picture-in-Picture is activated.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare function videoWidth$(mediaElement: HTMLMediaElement, pip$: Observable<IPictureInPictureEvent>): Observable<number>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onLoadedMetadata$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onSeeking$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onSeeked$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onEnded$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onTimeUpdate$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLElement} element
 * @returns {Observable}
 */
declare const onFullscreenChange$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onPlayPause$: (mediaElement: HTMLMediaElement) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onTextTrackChanges$: (textTrackList: TextTrackList) => Observable<TrackEvent>;
/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
declare const onSourceOpen$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {SourceBuffer} sourceBuffer
 * @returns {Observable}
 */
declare const onUpdate$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {MediaSource} mediaSource
 * @returns {Observable}
 */
declare const onRemoveSourceBuffers$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
declare const onEncrypted$: (element: IEventTargetLike) => Observable<MediaEncryptedEvent>;
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
declare const onKeyMessage$: (element: IEventTargetLike) => Observable<MediaKeyMessageEvent>;
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
declare const onKeyAdded$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
declare const onKeyError$: (element: IEventTargetLike) => Observable<Event>;
/**
 * @param {MediaKeySession} mediaKeySession
 * @returns {Observable}
 */
declare const onKeyStatusesChange$: (element: IEventTargetLike) => Observable<Event>;
export { isActive, isVideoVisible, videoWidth$, onPlayPause$, onTextTrackChanges$, onLoadedMetadata$, onSeeking$, onSeeked$, onEnded$, onTimeUpdate$, onFullscreenChange$, onSourceOpen$, onUpdate$, onRemoveSourceBuffers$, onEncrypted$, onKeyMessage$, onKeyAdded$, onKeyError$, onKeyStatusesChange$, };
