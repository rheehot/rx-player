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
import { combineLatest as observableCombineLatest, merge as observableMerge, } from "rxjs";
import { ignoreElements, map, tap, } from "rxjs/operators";
/**
 * Create clock Observable for the Buffers part of the code.
 * @param {Observable} initClock$
 * @param {Object} bufferClockArgument
 * @returns {Observable}
 */
export default function createBufferClock(initClock$, _a) {
    var autoPlay = _a.autoPlay, initialPlay$ = _a.initialPlay$, initialSeek$ = _a.initialSeek$, manifest = _a.manifest, speed$ = _a.speed$, startTime = _a.startTime;
    var initialPlayPerformed = false;
    var initialSeekPerformed = false;
    var updateIsPaused$ = initialPlay$.pipe(tap(function () { initialPlayPerformed = true; }), ignoreElements());
    var updateTimeOffset$ = initialSeek$.pipe(tap(function () { initialSeekPerformed = true; }), ignoreElements());
    var clock$ = observableCombineLatest([initClock$, speed$])
        .pipe(map(function (_a) {
        var tick = _a[0], speed = _a[1];
        var isLive = manifest.isLive;
        return {
            currentTime: tick.currentTime,
            duration: tick.duration,
            isPaused: initialPlayPerformed ? tick.paused :
                !autoPlay,
            liveGap: isLive ? manifest.getMaximumPosition() - tick.currentTime :
                Infinity,
            readyState: tick.readyState,
            speed: speed,
            stalled: tick.stalled,
            // wantedTimeOffset is an offset to add to the timing's current time to have
            // the "real" wanted position.
            // For now, this is seen when the media element has not yet seeked to its
            // initial position, the currentTime will most probably be 0 where the
            // effective starting position will be _startTime_.
            // Thus we initially set a wantedTimeOffset equal to startTime.
            wantedTimeOffset: initialSeekPerformed ? 0 :
                startTime - tick.currentTime,
        };
    }));
    return observableMerge(updateIsPaused$, updateTimeOffset$, clock$);
}
