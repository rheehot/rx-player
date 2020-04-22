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
 * This file is used to abstract the notion of text, audio and video tracks
 * switching for an easier API management.
 */
import { BehaviorSubject, Subject } from "rxjs";
import { Adaptation, Period } from "../../manifest";
/** Single preference for an audio track Adaptation. */
export declare type IAudioTrackPreference = null | {
    language?: string;
    audioDescription?: boolean;
    codec?: {
        all: boolean;
        test: RegExp;
    };
};
/** Single preference for a text track Adaptation. */
export declare type ITextTrackPreference = null | {
    language: string;
    closedCaption: boolean;
};
/** Single preference for a video track Adaptation. */
export declare type IVideoTrackPreference = null | {
    codec?: {
        all: boolean;
        test: RegExp;
    };
    signInterpreted?: boolean;
};
/** Audio track returned by the TrackChoiceManager. */
export interface ITMAudioTrack {
    language: string;
    normalized: string;
    audioDescription: boolean;
    dub?: boolean;
    id: number | string;
}
/** Text track returned by the TrackChoiceManager. */
export interface ITMTextTrack {
    language: string;
    normalized: string;
    closedCaption: boolean;
    id: number | string;
}
/**
 * Definition of a single Video Representation as represented by the
 * TrackChoiceManager.
 */
interface ITMVideoRepresentation {
    id: string | number;
    bitrate: number;
    width?: number;
    height?: number;
    codec?: string;
    frameRate?: string;
}
/** Video track returned by the TrackChoiceManager. */
export interface ITMVideoTrack {
    id: number | string;
    signInterpreted?: boolean;
    representations: ITMVideoRepresentation[];
}
/** Audio track from a list of audio tracks returned by the TrackChoiceManager. */
export interface ITMAudioTrackListItem extends ITMAudioTrack {
    active: boolean;
}
/** Text track from a list of text tracks returned by the TrackChoiceManager. */
export interface ITMTextTrackListItem extends ITMTextTrack {
    active: boolean;
}
/** Video track from a list of video tracks returned by the TrackChoiceManager. */
export interface ITMVideoTrackListItem extends ITMVideoTrack {
    active: boolean;
}
/**
 * Manage audio and text tracks for all active periods.
 * Chose the audio and text tracks for each period and record this choice.
 * @class TrackChoiceManager
 */
export default class TrackChoiceManager {
    /**
     * Current Periods considered by the TrackChoiceManager.
     * Sorted by start time ascending
     */
    private _periods;
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
    /** Memoization of the previously-chosen audio Adaptation for each Period. */
    private _audioChoiceMemory;
    /** Memoization of the previously-chosen text Adaptation for each Period. */
    private _textChoiceMemory;
    /** Memoization of the previously-chosen video Adaptation for each Period. */
    private _videoChoiceMemory;
    /**
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of audio track preferences
     * @param {BehaviorSubject<Array.<Object|null>>} preferredAudioTracks - Array
     * of text track preferences
     */
    constructor(defaults: {
        preferredAudioTracks: BehaviorSubject<IAudioTrackPreference[]>;
        preferredTextTracks: BehaviorSubject<ITextTrackPreference[]>;
        preferredVideoTracks: BehaviorSubject<IVideoTrackPreference[]>;
    });
    /**
     * Add Subject to choose Adaptation for new "audio" or "text" Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     * @param {Subject.<Object|null>} adaptation$ - A subject through which the
     * choice will be given
     */
    addPeriod(bufferType: "audio" | "text" | "video", period: Period, adaptation$: Subject<Adaptation | null>): void;
    /**
     * Remove Subject to choose an "audio", "video" or "text" Adaptation for a
     * Period.
     * @param {string} bufferType - The concerned buffer type
     * @param {Period} period - The concerned Period.
     */
    removePeriod(bufferType: "audio" | "text" | "video", period: Period): void;
    resetPeriods(): void;
    /**
     * Update the choice of all added Periods based on:
     *   1. What was the last chosen adaptation
     *   2. If not found, the preferences
     */
    update(): void;
    /**
     * Emit initial audio Adaptation through the given Subject based on:
     *   - the preferred audio tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialAudioTrack(period: Period): void;
    /**
     * Emit initial text Adaptation through the given Subject based on:
     *   - the preferred text tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialTextTrack(period: Period): void;
    /**
     * Emit initial video Adaptation through the given Subject based on:
     *   - the preferred video tracks
     *   - the last choice for this period, if one
     * @param {Period} period - The concerned Period.
     */
    setInitialVideoTrack(period: Period): void;
    /**
     * Set audio track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    setAudioTrackByID(period: Period, wantedId: string): void;
    /**
     * Set text track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     */
    setTextTrackByID(period: Period, wantedId: string): void;
    /**
     * Set video track based on the ID of its adaptation for a given added Period.
     * @param {Period} period - The concerned Period.
     * @param {string} wantedId - adaptation id of the wanted track
     *
     * @throws Error - Throws if the period given has not been added
     * @throws Error - Throws if the given id is not found in any video adaptation
     * of the given Period.
     */
    setVideoTrackByID(period: Period, wantedId: string): void;
    /**
     * Disable the current text track for a given period.
     *
     * @param {Period} period - The concerned Period.
     *
     * @throws Error - Throws if the period given has not been added
     */
    disableTextTrack(period: Period): void;
    /**
     * Disable the current video track for a given period.
     * @param {Object} period
     * @throws Error - Throws if the period given has not been added
     */
    disableVideoTrack(period: Period): void;
    /**
     * Returns an object describing the chosen audio track for the given audio
     * Period.
     *
     * Returns null is the the current audio track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The audio track chosen for this Period
     */
    getChosenAudioTrack(period: Period): ITMAudioTrack | null;
    /**
     * Returns an object describing the chosen text track for the given text
     * Period.
     *
     * Returns null is the the current text track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The text track chosen for this Period
     */
    getChosenTextTrack(period: Period): ITMTextTrack | null;
    /**
     * Returns an object describing the chosen video track for the given video
     * Period.
     *
     * Returns null is the the current video track is disabled or not
     * set yet.
     *
     * @param {Period} period - The concerned Period.
     * @returns {Object|null} - The video track chosen for this Period
     */
    getChosenVideoTrack(period: Period): ITMVideoTrack | null;
    /**
     * Returns all available audio tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(period: Period): ITMAudioTrackListItem[];
    /**
     * Returns all available text tracks for a given Period, as an array of
     * objects.
     *
     * @param {Period} period
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(period: Period): ITMTextTrackListItem[];
    /**
     * Returns all available video tracks for a given Period, as an array of
     * objects.
     *
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(period: Period): ITMVideoTrackListItem[];
    private _updateAudioTrackChoices;
    private _updateTextTrackChoices;
    private _updateVideoTrackChoices;
}
export {};
