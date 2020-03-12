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
import { defer as observableDefer, of as observableOf, } from "rxjs";
import { distinctUntilChanged, map, startWith, switchMap, tap, } from "rxjs/operators";
import log from "../../log";
/**
 * Manage playback speed.
 * Set playback rate set by the user, pause playback when the player appear to
 * stall and restore the speed once it appears to un-stall.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {Observable} speed$ - emit speed set by the user
 * @param {Observable} clock$ - Current playback conditions
 * @param {Object} options - Contains the following properties:
 *   - pauseWhenStalled {Boolean|undefined} - true if the player
 *     stalling should lead to a pause until it un-stalls. True by default.
 * @returns {Observable}
 */
export default function updatePlaybackRate(mediaElement, speed$, clock$, _a) {
    var _b = _a.pauseWhenStalled, pauseWhenStalled = _b === void 0 ? true : _b;
    var forcePause$;
    if (!pauseWhenStalled) {
        forcePause$ = observableOf(false);
    }
    else {
        forcePause$ = clock$
            .pipe(map(function (timing) { return timing.stalled !== null; }), startWith(false), distinctUntilChanged());
    }
    return forcePause$
        .pipe(switchMap(function (shouldForcePause) {
        if (shouldForcePause) {
            return observableDefer(function () {
                log.info("Init: Pause playback to build buffer");
                mediaElement.playbackRate = 0;
                return observableOf(0);
            });
        }
        return speed$
            .pipe(tap(function (speed) {
            log.info("Init: Resume playback speed", speed);
            mediaElement.playbackRate = speed;
        }));
    }));
}
