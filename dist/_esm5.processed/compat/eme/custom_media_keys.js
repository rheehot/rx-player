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
import { merge as observableMerge, of as observableOf, Subject, throwError as observableThrow, } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { bytesToStr, strToBytes, } from "../../utils/byte_parsing";
import castToObservable from "../../utils/cast_to_observable";
import EventEmitter from "../../utils/event_emitter";
import PPromise from "../../utils/promise";
import { MediaKeys_, } from "../browser_compatibility_types";
import { isIE11 } from "../browser_detection";
import * as events from "../event_listeners";
import isNode from "../is_node";
import shouldUseWebKitMediaKeys from "../should_use_webkit_media_keys";
import CustomMediaKeySystemAccess from "./custom_key_system_access";
var requestMediaKeySystemAccess = null;
function createMediaKeysSession(mediaKeys, sessionType) {
    return mediaKeys.createSession(sessionType);
}
var createSession = createMediaKeysSession;
// Default CustomMediaKeys implementation
var CustomMediaKeys = /** @class */ (function () {
    function class_1() {
    }
    class_1.prototype._setVideo = function () {
        throw new Error("MediaKeys is not implemented in your browser");
    };
    class_1.prototype.createSession = function () {
        throw new Error("MediaKeys is not implemented in your browser");
    };
    class_1.prototype.setServerCertificate = function () {
        throw new Error("MediaKeys is not implemented in your browser");
    };
    return class_1;
}());
/**
 * Since Safari 12.1, EME APIs are available without webkit prefix.
 * However, it seems that since fairplay CDM implementation within the browser is not
 * standard with EME w3c current spec, the requestMediaKeySystemAccess API doesn't resolve
 * positively, even if the drm (fairplay in most cases) is supported.
 *
 * Therefore, we prefer not to use requestMediaKeySystemAccess on Safari when webkit API
 * is available.
 */
if (isNode ||
    (navigator.requestMediaKeySystemAccess != null && !shouldUseWebKitMediaKeys())) {
    requestMediaKeySystemAccess = function (a, b) {
        return castToObservable(navigator.requestMediaKeySystemAccess(a, b));
    };
}
else {
    // Wrap "MediaKeys.prototype.update" form an event based system to a
    // Promise based function.
    var wrapUpdate_1 = function (memUpdate) {
        return function (license, sessionId) {
            var _this = this;
            return new PPromise(function (resolve, reject) {
                try {
                    memUpdate.call(_this, license, sessionId == null ? "" :
                        sessionId);
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            });
        };
    };
    /**
     * Returns true if the given media element has old webkit methods
     * corresponding to the IOldWebkitHTMLMediaElement interface.
     * @param {HTMLMediaElement} element
     * @returns {Boolean}
     */
    var isOldWebkitMediaElement_1 = function (element) {
        return typeof element
            .webkitGenerateKeyRequest === "function";
    };
    // This is for Chrome with unprefixed EME api
    if (isOldWebkitMediaElement_1(HTMLVideoElement.prototype)) {
        var WebkitMediaKeySession_1 = /** @class */ (function (_super) {
            __extends(WebkitMediaKeySession, _super);
            function WebkitMediaKeySession(mediaElement, keySystem) {
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
                _this.update = wrapUpdate_1(function (license, sessionId) {
                    if (!isOldWebkitMediaElement_1(_this._vid)) {
                        throw new Error("impossible to add a new key");
                    }
                    if (_this._key.indexOf("clearkey") >= 0) {
                        var licenseTypedArray = license instanceof ArrayBuffer ? new Uint8Array(license) :
                            license;
                        /* tslint:disable no-unsafe-any */
                        var json = JSON.parse(bytesToStr(licenseTypedArray));
                        var key = strToBytes(atob(json.keys[0].k));
                        var kid = strToBytes(atob(json.keys[0].kid));
                        /* tslint:enable no-unsafe-any */
                        _this._vid.webkitAddKey(_this._key, key, kid, sessionId);
                    }
                    else {
                        _this._vid.webkitAddKey(_this._key, license, null, sessionId);
                    }
                    _this.sessionId = sessionId;
                });
                return _this;
            }
            WebkitMediaKeySession.prototype.generateRequest = function (_initDataType, initData) {
                var _this = this;
                return new PPromise(function (resolve) {
                    if (!isOldWebkitMediaElement_1(_this._vid)) {
                        throw new Error("impossible to generate a key request");
                    }
                    _this._vid.webkitGenerateKeyRequest(_this._key, initData);
                    resolve();
                });
            };
            WebkitMediaKeySession.prototype.close = function () {
                var _this = this;
                return new PPromise(function (resolve) {
                    _this._closeSession$.next();
                    _this._closeSession$.complete();
                    resolve();
                });
            };
            WebkitMediaKeySession.prototype.load = function () {
                return PPromise.resolve(false);
            };
            WebkitMediaKeySession.prototype.remove = function () {
                return PPromise.resolve();
            };
            return WebkitMediaKeySession;
        }(EventEmitter));
        CustomMediaKeys = /** @class */ (function () {
            function class_2(keySystem) {
                this.ks_ = keySystem;
            }
            class_2.prototype._setVideo = function (vid) {
                this._vid = vid;
            };
            class_2.prototype.createSession = function ( /* sessionType */) {
                if (this._vid == null) {
                    throw new Error("Video not attached to the MediaKeys");
                }
                return new WebkitMediaKeySession_1(this._vid, this.ks_);
            };
            class_2.prototype.setServerCertificate = function () {
                throw new Error("Server certificate is not implemented in your browser");
            };
            return class_2;
        }());
        var isTypeSupported_1 = function (keyType) {
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
        requestMediaKeySystemAccess = function (keyType, keySystemConfigurations) {
            if (!isTypeSupported_1(keyType)) {
                return observableThrow(undefined);
            }
            for (var i = 0; i < keySystemConfigurations.length; i++) {
                var keySystemConfiguration = keySystemConfigurations[i];
                var videoCapabilities = keySystemConfiguration.videoCapabilities, audioCapabilities = keySystemConfiguration.audioCapabilities, initDataTypes = keySystemConfiguration.initDataTypes, sessionTypes = keySystemConfiguration.sessionTypes, distinctiveIdentifier = keySystemConfiguration.distinctiveIdentifier, persistentState = keySystemConfiguration.persistentState;
                var supported = true;
                supported = supported &&
                    (initDataTypes == null ||
                        initDataTypes.some(function (initDataType) { return initDataType === "cenc"; }));
                supported = supported &&
                    (sessionTypes == null ||
                        sessionTypes.filter(function (sessionType) { return sessionType === "temporary"; })
                            .length === sessionTypes.length);
                supported = supported && (distinctiveIdentifier !== "required");
                supported = supported && (persistentState !== "required");
                if (supported) {
                    var keySystemConfigurationResponse = {
                        videoCapabilities: videoCapabilities,
                        audioCapabilities: audioCapabilities,
                        initDataTypes: ["cenc"],
                        sessionTypes: ["temporary"],
                        distinctiveIdentifier: "not-allowed",
                        persistentState: "not-allowed",
                    };
                    return observableOf(new CustomMediaKeySystemAccess(keyType, new CustomMediaKeys(keyType), keySystemConfigurationResponse));
                }
            }
            return observableThrow(undefined);
        };
    }
    else if (MediaKeys_ != null &&
        MediaKeys_.prototype != null &&
        /* tslint:disable no-unsafe-any */
        typeof MediaKeys_.isTypeSupported === "function"
    /* tslint:enable no-unsafe-any */
    ) {
        requestMediaKeySystemAccess = function (keyType, keySystemConfigurations) {
            // TODO Why TS Do not understand that isTypeSupported exists here?
            /* tslint:disable no-unsafe-any */
            if (!MediaKeys_.isTypeSupported(keyType)) {
                /* tslint:enable no-unsafe-any */
                return observableThrow(undefined);
            }
            for (var i = 0; i < keySystemConfigurations.length; i++) {
                var keySystemConfiguration = keySystemConfigurations[i];
                var videoCapabilities = keySystemConfiguration.videoCapabilities, audioCapabilities = keySystemConfiguration.audioCapabilities, initDataTypes = keySystemConfiguration.initDataTypes, distinctiveIdentifier = keySystemConfiguration.distinctiveIdentifier;
                var supported = true;
                supported = supported &&
                    (initDataTypes == null ||
                        initDataTypes.some(function (idt) { return idt === "cenc"; }));
                supported = supported && (distinctiveIdentifier !== "required");
                if (supported) {
                    var keySystemConfigurationResponse = {
                        videoCapabilities: videoCapabilities,
                        audioCapabilities: audioCapabilities,
                        initDataTypes: ["cenc"],
                        distinctiveIdentifier: "not-allowed",
                        persistentState: "required",
                        sessionTypes: ["temporary", "persistent-license"],
                    };
                    return observableOf(new CustomMediaKeySystemAccess(keyType, 
                    /* tslint:disable no-unsafe-any */
                    new MediaKeys_(keyType), 
                    /* tslint:enable no-unsafe-any */
                    keySystemConfigurationResponse));
                }
            }
            return observableThrow(undefined);
        };
        if (isIE11 &&
            /* tslint:disable no-unsafe-any */
            typeof MediaKeys_.prototype.createSession === "function") 
        /* tslint:enable no-unsafe-any */
        {
            var IE11MediaKeySession_1 = /** @class */ (function (_super) {
                __extends(IE11MediaKeySession, _super);
                function IE11MediaKeySession(mk) {
                    var _this = _super.call(this) || this;
                    _this.sessionId = "";
                    _this.expiration = NaN;
                    _this.keyStatuses = new Map();
                    _this._mk = mk;
                    _this._closeSession$ = new Subject();
                    _this.closed = new PPromise(function (resolve) {
                        _this._closeSession$.subscribe(resolve);
                    });
                    _this.update = wrapUpdate_1(function (license, sessionId) {
                        if (_this._ss == null) {
                            throw new Error("MediaKeySession not set");
                        }
                        /* tslint:disable no-unsafe-any */
                        _this._ss.update(license, sessionId);
                        /* tslint:enable no-unsafe-any */
                        _this.sessionId = sessionId;
                    });
                    return _this;
                }
                IE11MediaKeySession.prototype.generateRequest = function (_initDataType, initData) {
                    var _this = this;
                    return new PPromise(function (resolve) {
                        /* tslint:disable no-unsafe-any */
                        _this._ss = _this._mk.createSession("video/mp4", initData);
                        /* tslint:enable no-unsafe-any */
                        observableMerge(events.onKeyMessage$(_this._ss), events.onKeyAdded$(_this._ss), events.onKeyError$(_this._ss)).pipe(takeUntil(_this._closeSession$))
                            .subscribe(function (evt) { return _this.trigger(evt.type, evt); });
                        resolve();
                    });
                };
                IE11MediaKeySession.prototype.close = function () {
                    var _this = this;
                    return new PPromise(function (resolve) {
                        if (_this._ss != null) {
                            /* tslint:disable no-floating-promises */
                            _this._ss.close();
                            /* tslint:enable no-floating-promises */
                            _this._ss = undefined;
                        }
                        _this._closeSession$.next();
                        _this._closeSession$.complete();
                        resolve();
                    });
                };
                IE11MediaKeySession.prototype.load = function () {
                    return PPromise.resolve(false);
                };
                IE11MediaKeySession.prototype.remove = function () {
                    return PPromise.resolve();
                };
                return IE11MediaKeySession;
            }(EventEmitter));
            createSession = function createIE11MediaKeySession(mediaKeys) {
                return new IE11MediaKeySession_1(mediaKeys);
            };
        }
    }
}
export default CustomMediaKeys;
export { createSession, requestMediaKeySystemAccess, };
