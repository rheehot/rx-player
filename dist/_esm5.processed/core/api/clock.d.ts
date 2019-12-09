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
export declare type IMediaInfosState = "init" | // set once on first emit
"canplay" | // HTML5 Event
"play" | // HTML5 Event
"progress" | // HTML5 Event
"seeking" | // HTML5 Event
"seeked" | // HTML5 Event
"loadedmetadata" | // HTML5 Event
"ratechange" | // HTML5 Event
"timeupdate";
interface IMediaInfos {
    bufferGap: number;
    buffered: TimeRanges;
    currentRange: {
        start: number;
        end: number;
    } | null;
    currentTime: number;
    duration: number;
    ended: boolean;
    paused: boolean;
    playbackRate: number;
    readyState: number;
    seeking: boolean;
    state: IMediaInfosState;
}
declare type IStalledStatus = {
    reason: "seeking" | // Building buffer after seeking
    "not-ready" | // Building buffer after low readyState
    "buffering";
    timestamp: number;
} | null;
export interface IClockTick extends IMediaInfos {
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
