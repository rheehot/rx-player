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
import { IInitClockTick } from "./types";
export declare type ILoadEvents = "not-loaded-metadata" | // metadata are not loaded. Manual action required
"autoplay-blocked" | // loaded but autoplay is blocked by the browser
"autoplay" | // loaded and autoplayed succesfully
"loaded";
/**
 * Returns two Observables:
 *
 *   - seek$: when subscribed, will seek to the wanted started time as soon as
 *     it can. Emit and complete when done.
 *
 *   - load$: when subscribed, will play if and only if the `mustAutoPlay`
 *     option is set as soon as it can. Emit and complete when done.
 *     When this observable emits, it also means that the content is `loaded`
 *     and can begin to play the current content.
 *
 * @param {Object} args
 * @returns {Object}
 */
export default function seekAndLoadOnMediaEvents({ clock$, mediaElement, startTime, mustAutoPlay, isDirectfile }: {
    clock$: Observable<IInitClockTick>;
    isDirectfile: boolean;
    mediaElement: HTMLMediaElement;
    mustAutoPlay: boolean;
    startTime: number | (() => number);
}): {
    seek$: Observable<unknown>;
    load$: Observable<ILoadEvents>;
};
