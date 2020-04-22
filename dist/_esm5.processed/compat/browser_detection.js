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
var _a;
import isNode from "./is_node";
// true on IE11
// false on Edge and other IEs/browsers.
var isIE11 = !isNode &&
    !!window.MSInputMethodContext &&
    !!document.documentMode;
// true for IE / Edge
var isIEOrEdge = isNode ?
    false :
    navigator.appName === "Microsoft Internet Explorer" ||
        navigator.appName === "Netscape" &&
            /(Trident|Edge)\//.test(navigator.userAgent);
var isFirefox = !isNode &&
    navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;
var isSamsungBrowser = !isNode &&
    /SamsungBrowser/.test(navigator.userAgent);
var isSafari = !isNode && (
/* tslint:disable ban */
Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") >= 0 ||
    /* tslint:enable ban */
    /* tslint:disable no-unsafe-any */
    ((_a = window.safari) === null || _a === void 0 ? void 0 : _a.pushNotification.toString()) ===
        "[object SafariRemoteNotification]"
/* tslint:enable no-unsafe-any */
);
var isSafariMobile = !isNode &&
    typeof navigator.platform === "string" &&
    /iPad|iPhone|iPod/.test(navigator.platform);
export { isIE11, isIEOrEdge, isFirefox, isSafari, isSafariMobile, isSamsungBrowser, };
