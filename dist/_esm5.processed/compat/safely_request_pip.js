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
import { catchError } from "rxjs/operators";
import log from "../log";
import castToObservable from "../utils/cast_to_observable";
/**
 * Request PictureInPicture from the current mediaElement.
 * Emit the corresponding window on success.
 * If it fails, returns an Observable emitting null.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function safelyRequestPIP(mediaElement) {
    /* tslint:disable no-unsafe-any */
    if (typeof mediaElement.requestPictureInPicture !== "function") {
        /* tslint:enable no-unsafe-any */
        return observableOf(null);
    }
    return observableDefer(function () {
        /* tslint:disable no-unsafe-any */
        return castToObservable(mediaElement.requestPictureInPicture());
        /* tslint:enable no-unsafe-any */
    }).pipe(catchError(function () {
        log.warn("Compat: Couldn't request a Picture-in-Picture window.");
        return observableOf(null);
    }));
}
