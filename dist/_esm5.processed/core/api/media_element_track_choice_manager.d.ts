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
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */
import { BehaviorSubject } from "rxjs";
import EventEmitter from "../../utils/event_emitter";
import { IAudioTrackPreference, ITextTrackPreference, ITMAudioTrack, ITMAudioTrackListItem, ITMTextTrack, ITMTextTrackListItem, ITMVideoTrack, ITMVideoTrackListItem, IVideoTrackPreference } from "./track_choice_manager";
/** Events emitted by the MediaElementTrackChoiceManager. */
interface IMediaElementTrackChoiceManagerEvents {
    availableVideoTracksChange: ITMVideoTrackListItem[];
    availableAudioTracksChange: ITMAudioTrackListItem[];
    availableTextTracksChange: ITMTextTrackListItem[];
    videoTrackChange: ITMVideoTrack | null;
    audioTrackChange: ITMAudioTrack | null;
    textTrackChange: ITMTextTrack | null;
}
/**
 * Manage video, audio and text tracks for current direct file content.
 * @class MediaElementTrackChoiceManager
 */
export default class MediaElementTrackChoiceManager extends EventEmitter<IMediaElementTrackChoiceManagerEvents> {
    /**
     * Array of preferred settings for audio tracks.
     * Sorted by order of preference descending.
     */
    private _preferredAudioTracks;
    /**
     * Array of preferred languages for text tracks.
     * Sorted by order of preference descending.
     */
    private _preferredTextTracks;
    /**
     * Array of preferred settings for video tracks.
     * Sorted by order of preference descending.
     */
    private _preferredVideoTracks;
    /** List every available audio tracks available on the media element. */
    private _audioTracks;
    /** List every available text tracks available on the media element. */
    private _textTracks;
    /** List every available video tracks available on the media element. */
    private _videoTracks;
    /** Last audio track emitted as active. */
    private _lastEmittedNativeAudioTrack;
    /** Last video track emitted as active. */
    private _lastEmittedNativeVideoTrack;
    /** Last text track emitted as active. */
    private _lastEmittedNativeTextTrack;
    /** Native `AudioTrackList` implemented on the media element. */
    private _nativeAudioTracks;
    /** Native `VideoTrackList` implemented on the media element. */
    private _nativeVideoTracks;
    /** Native `TextTrackList` implemented on the media element. */
    private _nativeTextTracks;
    constructor(defaults: {
        preferredAudioTracks: BehaviorSubject<IAudioTrackPreference[]>;
        preferredTextTracks: BehaviorSubject<ITextTrackPreference[]>;
        preferredVideoTracks: BehaviorSubject<IVideoTrackPreference[]>;
    }, mediaElement: HTMLMediaElement);
    /**
     * Update the currently active audio track by setting the wanted audio track's
     * ID property.
     * Throws if the wanted audio track is not found.
     * @param {string|number|undefined} id
     */
    setAudioTrackById(id?: string | number): void;
    /**
     * Disable the currently-active text track, if one.
     */
    disableTextTrack(): void;
    /**
     * Update the currently active text track by setting the wanted text track's
     * ID property.
     * Throws if the wanted text track is not found.
     * @param {string|number|undefined} id
     */
    setTextTrackById(id?: string | number): void;
    /**
     * Disable the currently-active video track, if one.
     */
    disableVideoTrack(): void;
    /**
     * Update the currently active video track by setting the wanted video track's
     * ID property.
     * Throws if the wanted video track is not found.
     * @param {string|number|undefined} id
     */
    setVideoTrackById(id?: string | number): void;
    /**
     * Returns the currently active audio track.
     * Returns `null` if no audio track is active.
     * Returns `undefined` if we cannot know which audio track is active.
     * @returns {Object|null|undefined}
     */
    getChosenAudioTrack(): ITMAudioTrack | null | undefined;
    /**
     * Returns the currently active text track.
     * Returns `null` if no text track is active.
     * Returns `undefined` if we cannot know which text track is active.
     * @returns {Object|null|undefined}
     */
    getChosenTextTrack(): ITMTextTrack | null | undefined;
    /**
     * Returns the currently active video track.
     * Returns `null` if no video track is active.
     * Returns `undefined` if we cannot know which video track is active.
     * @returns {Object|null|undefined}
     */
    getChosenVideoTrack(): ITMVideoTrack | null | undefined;
    /**
     * Returns a description of every available audio tracks.
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(): ITMAudioTrackListItem[];
    /**
     * Returns a description of every available text tracks.
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(): ITMTextTrackListItem[];
    /**
     * Returns a description of every available video tracks.
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(): ITMVideoTrackListItem[];
    /**
     * Free the resources used by the MediaElementTrackChoiceManager.
     */
    dispose(): void;
    /**
     * Get information about the currently chosen audio track.
     * `undefined` if we cannot know it.
     * `null` if no audio track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getPrivateChosenAudioTrack;
    /**
     * Get information about the currently chosen video track.
     * `undefined` if we cannot know it.
     * `null` if no video track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getPrivateChosenVideoTrack;
    /**
     * Get information about the currently chosen text track.
     * `undefined` if we cannot know it.
     * `null` if no text track is chosen.
     * @returns {Object|undefined|null}
     */
    private _getPrivateChosenTextTrack;
    /**
     * Iterate over every available audio tracks on the media element and over
     * every set audio track preferences to activate the preferred audio track
     * on the media element.
     */
    private _setPreferredAudioTrack;
    /**
     * Iterate over every available text tracks on the media element and over
     * every set text track preferences to activate the preferred text track
     * on the media element.
     */
    private _setPreferredTextTrack;
    /**
     * Iterate over every available video tracks on the media element and over
     * every set video track preferences to activate the preferred video track
     * on the media element.
     */
    private _setPreferredVideoTrack;
    /**
     * Monitor native tracks add, remove and change callback and trigger the
     * change events.
     */
    private _handleNativeTracksCallbacks;
}
export {};
