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
import { BehaviorSubject } from "rxjs";
import EventEmitter from "../../utils/event_emitter";
import { IAudioTrackPreference, ITextTrackPreference, ITMAudioTrack, ITMAudioTrackListItem, ITMTextTrack, ITMTextTrackListItem, ITMVideoTrack, ITMVideoTrackListItem } from "./track_choice_manager";
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
    private _preferredAudioTracks;
    private _preferredTextTracks;
    private _audioTracks;
    private _textTracks;
    private _videoTracks;
    private _lastEmittedNativeAudioTrack;
    private _lastEmittedNativeVideoTrack;
    private _lastEmittedNativeTextTrack;
    private _nativeAudioTracks;
    private _nativeVideoTracks;
    private _nativeTextTracks;
    constructor(defaults: {
        preferredAudioTracks: BehaviorSubject<IAudioTrackPreference[]>;
        preferredTextTracks: BehaviorSubject<ITextTrackPreference[]>;
    }, mediaElement: HTMLMediaElement);
    setAudioTrackById(id?: string | number): void;
    disableTextTrack(): void;
    setTextTrackById(id?: string | number): void;
    setVideoTrackById(id?: string): void;
    getChosenAudioTrack(): ITMAudioTrack | null | undefined;
    getChosenTextTrack(): ITMTextTrack | null | undefined;
    getChosenVideoTrack(): ITMVideoTrack | null | undefined;
    getAvailableAudioTracks(): ITMAudioTrackListItem[];
    getAvailableTextTracks(): ITMTextTrackListItem[];
    getAvailableVideoTracks(): ITMVideoTrackListItem[];
    dispose(): void;
    private _getPrivateChosenAudioTrack;
    private _getPrivateChosenVideoTrack;
    private _getPrivateChosenTextTrack;
    private _setPreferredAudioTrack;
    private _setPreferredTextTrack;
    private _handleNativeTracksCallbacks;
}
export {};
