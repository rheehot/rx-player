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
import { MediaError } from "../errors";
import shouldUseWebKitMediaKeys from "./should_use_webkit_media_keys";
var win = window;
/* tslint:disable no-unsafe-any */
var HTMLElement_ = win.HTMLElement;
var VTTCue_ = win.VTTCue != null ? win.VTTCue :
    win.TextTrackCue;
/* tslint:enable no-unsafe-any */
/* tslint:disable no-unsafe-any */
var MediaSource_ = win.MediaSource != null ? win.MediaSource :
    win.MozMediaSource != null ? win.MozMediaSource :
        win.WebKitMediaSource != null ? win.WebKitMediaSource :
            win.MSMediaSource;
/* tslint:enable no-unsafe-any */
var MediaKeys_ = (function () {
    /* tslint:disable no-unsafe-any */
    if (shouldUseWebKitMediaKeys()) {
        return win.WebKitMediaKeys;
    }
    return win.MediaKeys != null ? win.MediaKeys :
        win.MSMediaKeys != null ? win.MSMediaKeys :
            win.MozMediaKeys != null ? win.MozMediaKeys :
                win.WebKitMediaKeys != null ? win.WebKitMediaKeys : /** @class */ (function () {
                    function class_1() {
                        var noMediaKeys = function () {
                            throw new MediaError("MEDIA_KEYS_NOT_SUPPORTED", "No `MediaKeys` implementation found " +
                                "in the current browser.");
                        };
                        this.create = noMediaKeys;
                        this.createSession = noMediaKeys;
                        this.isTypeSupported = noMediaKeys;
                        this.setServerCertificate = noMediaKeys;
                    }
                    return class_1;
                }());
    /* tslint:enable no-unsafe-any */
})();
var READY_STATES = { HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4 };
export { HTMLElement_, MediaKeys_, MediaSource_, READY_STATES, VTTCue_, };
