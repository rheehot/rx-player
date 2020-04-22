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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { merge as observableMerge, Subject, } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { bytesToStr, strToBytes, } from "../../../utils/byte_parsing";
import EventEmitter from "../../../utils/event_emitter";
import PPromise from "../../../utils/promise";
import * as events from "../../event_listeners";
/**
 * Returns true if the given media element has old webkit methods
 * corresponding to the IOldWebkitHTMLMediaElement interface.
 * @param {HTMLMediaElement} element
 * @returns {Boolean}
 */
export function isOldWebkitMediaElement(element) {
    return typeof element
        .webkitGenerateKeyRequest === "function";
}
var OldWebkitMediaKeySession = /** @class */ (function (_super) {
    __extends(OldWebkitMediaKeySession, _super);
    function OldWebkitMediaKeySession(mediaElement, keySystem) {
        var _this = _super.call(this) || this;
        _this._closeSession$ = new Subject();
        _this._vid = mediaElement;
        _this._key = keySystem;
        _this.sessionId = "";
        _this.closed = new PPromise(function (resolve) {
            _this._closeSession$.subscribe(resolve);
        });
        _this.keyStatuses = new Map();
        _this.expiration = NaN;
        observableMerge(events.onKeyMessage$(mediaElement), events.onKeyAdded$(mediaElement), events.onKeyError$(mediaElement))
            .pipe(takeUntil(_this._closeSession$))
            .subscribe(function (evt) { return _this.trigger(evt.type, evt); });
        _this.update = function (license) {
            return new PPromise(function (resolve, reject) {
                try {
                    if (_this._key.indexOf("clearkey") >= 0) {
                        var licenseTypedArray = license instanceof ArrayBuffer ? new Uint8Array(license) :
                            license;
                        /* tslint:disable no-unsafe-any */
                        var json = JSON.parse(bytesToStr(licenseTypedArray));
                        var key = strToBytes(atob(json.keys[0].k));
                        var kid = strToBytes(atob(json.keys[0].kid));
                        /* tslint:enable no-unsafe-any */
                        resolve(_this._vid.webkitAddKey(_this._key, key, kid, /* sessionId */ ""));
                    }
                    else {
                        resolve(_this._vid.webkitAddKey(_this._key, license, null, /* sessionId */ ""));
                    }
                }
                catch (err) {
                    reject(err);
                }
            });
        };
        return _this;
    }
    OldWebkitMediaKeySession.prototype.generateRequest = function (_initDataType, initData) {
        var _this = this;
        return new PPromise(function (resolve) {
            _this._vid.webkitGenerateKeyRequest(_this._key, initData);
            resolve();
        });
    };
    OldWebkitMediaKeySession.prototype.close = function () {
        var _this = this;
        return new PPromise(function (resolve) {
            _this._closeSession$.next();
            _this._closeSession$.complete();
            resolve();
        });
    };
    OldWebkitMediaKeySession.prototype.load = function () {
        return PPromise.resolve(false);
    };
    OldWebkitMediaKeySession.prototype.remove = function () {
        return PPromise.resolve();
    };
    return OldWebkitMediaKeySession;
}(EventEmitter));
var OldWebKitCustomMediaKeys = /** @class */ (function () {
    function OldWebKitCustomMediaKeys(keySystem) {
        this.ks_ = keySystem;
    }
    OldWebKitCustomMediaKeys.prototype._setVideo = function (videoElement) {
        if (!isOldWebkitMediaElement(videoElement)) {
            throw new Error("Video not attached to the MediaKeys");
        }
        this._videoElement = videoElement;
    };
    OldWebKitCustomMediaKeys.prototype.createSession = function ( /* sessionType */) {
        if (this._videoElement == null) {
            throw new Error("Video not attached to the MediaKeys");
        }
        return new OldWebkitMediaKeySession(this._videoElement, this.ks_);
    };
    OldWebKitCustomMediaKeys.prototype.setServerCertificate = function () {
        throw new Error("Server certificate is not implemented in your browser");
    };
    return OldWebKitCustomMediaKeys;
}());
export default function getOldWebKitMediaKeysCallbacks() {
    var isTypeSupported = function (keyType) {
        // get any <video> element from the DOM or create one
        // and try the `canPlayType` method
        var videoElement = document.querySelector("video");
        if (videoElement == null) {
            videoElement = document.createElement("video");
        }
        /* tslint:disable no-unsafe-any */
        /* tslint:disable no-unbound-method */
        if (videoElement != null && typeof videoElement.canPlayType === "function") {
            /* tslint:enable no-unbound-method */
            return !!videoElement.canPlayType("video/mp4", keyType);
            /* tslint:enable no-unsafe-any */
        }
        else {
            return false;
        }
    };
    var createCustomMediaKeys = function (keyType) { return new OldWebKitCustomMediaKeys(keyType); };
    return {
        isTypeSupported: isTypeSupported,
        createCustomMediaKeys: createCustomMediaKeys,
    };
}
