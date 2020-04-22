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
 * This file defines a global clock for the RxPlayer.
 *
 * Each clock tick also pass information about the current state of the
 * media element to sub-parts of the player.
 */
import { Observable } from "rxjs";
/** "State" that triggered the clock tick. */
export declare type IMediaInfosState = "init" | // set once on first emit
"canplay" | // HTML5 Event
"play" | // HTML5 Event
"progress" | // HTML5 Event
"seeking" | // HTML5 Event
"seeked" | // HTML5 Event
"loadedmetadata" | // HTML5 Event
"ratechange" | // HTML5 Event
"timeupdate";
/** Information recuperated on the media element on each clock tick. */
interface IMediaInfos {
    /** Gap between `currentTime` and the next position with un-buffered data. */
    bufferGap: number;
    /** Value of `buffered` (buffered ranges) for the media element. */
    buffered: TimeRanges;
    /** The buffered range we are currently playing. */
    currentRange: {
        start: number;
        end: number;
    } | null;
    /** Current `currentTime` (position) set on the media element. */
    currentTime: number;
    /** Current `duration` set on the media element. */
    duration: number;
    /** Current `ended` set on the media element. */
    ended: boolean;
    /** Current `paused` set on the media element. */
    paused: boolean;
    /** Current `playbackRate` set on the media element. */
    playbackRate: number;
    /** Current `readyState` value on the media element. */
    readyState: number;
    /** Current `seeking` value on the mediaElement. */
    seeking: boolean;
    /** "State" that triggered this clock tick. */
    state: IMediaInfosState;
}
/** Describes when the player is "stalled" and what event started that status. */
declare type IStalledStatus = 
/** Set if the player is stalled. */
{
    /** What started the player to stall. */
    reason: "seeking" | // Building buffer after seeking
    "not-ready" | // Building buffer after low readyState
    "buffering";
    /** `performance.now` at the time the stalling happened. */
    timestamp: number;
} | 
/** The player is not stalled. */
null;
/** Information emitted on each clock tick. */
export interface IClockTick extends IMediaInfos {
    /** Set if the player is stalled. */
    stalled: IStalledStatus;
}
export interface IClockOptions {
    withMediaSource: boolean;
    lowLatencyMode: boolean;
}
/**
 * Timings observable.
 *
 * This Observable samples snapshots of player's current state:
 *   * time position
 *   * playback rate
 *   * current buffered range
 *   * gap with current buffered range ending
 *   * media duration
 *
 * In addition to sampling, this Observable also reacts to "seeking" and "play"
 * events.
 *
 * Observable is shared for performance reason: reduces the number of event
 * listeners and intervals/timeouts but also limit access to the media element
 * properties and gap calculations.
 *
 * The sampling is manual instead of based on "timeupdate" to reduce the
 * number of events.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} options
 * @returns {Observable}
 */
declare function createClock(mediaElement: HTMLMediaElement, options: IClockOptions): Observable<IClockTick>;
export default createClock;
