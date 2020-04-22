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
import { defer as observableDefer } from "rxjs";
import castToObservable from "../../utils/cast_to_observable";
function isCustomMediaKeys(mediaKeys) {
    return mediaKeys._setVideo !== undefined;
}
/**
 * Set the MediaKeys given on the media element.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {*}
 */
function _setMediaKeys(elt, mediaKeys) {
    if (mediaKeys === null) {
        return;
    }
    if (isCustomMediaKeys(mediaKeys)) {
        return mediaKeys._setVideo(elt);
    }
    /* tslint:disable no-unbound-method */
    if (typeof elt.setMediaKeys === "function") {
        /* tslint:enable no-unbound-method */
        return elt.setMediaKeys(mediaKeys);
    }
    if (elt.WebkitSetMediaKeys) {
        /* tslint:disable no-unsafe-any */
        return elt.WebkitSetMediaKeys(mediaKeys);
        /* tslint:enable no-unsafe-any */
    }
    if (elt.mozSetMediaKeys) {
        /* tslint:disable no-unsafe-any */
        return elt.mozSetMediaKeys(mediaKeys);
        /* tslint:enable no-unsafe-any */
    }
    if (elt.msSetMediaKeys) {
        /* tslint:disable no-unsafe-any */
        return elt.msSetMediaKeys(mediaKeys);
        /* tslint:enable no-unsafe-any */
    }
}
/**
 * Set the given MediaKeys on the given HTMLMediaElement.
 * Emits null when done then complete.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Observable}
 */
export default function setMediaKeys$(elt, mediaKeys) {
    return observableDefer(function () { return castToObservable(_setMediaKeys(elt, mediaKeys)); });
}
