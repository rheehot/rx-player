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
import isNode from "../../is_node";
var MSMediaKeysConstructor;
if (!isNode) {
    /* tslint:disable no-unsafe-any */
    var MSMediaKeys_1 = window.MSMediaKeys;
    if (MSMediaKeys_1 !== undefined &&
        MSMediaKeys_1.prototype !== undefined &&
        typeof MSMediaKeys_1.isTypeSupported === "function" &&
        typeof MSMediaKeys_1.prototype.createSession === "function") {
        MSMediaKeysConstructor = MSMediaKeys_1;
    }
    /* tslint:enable no-unsafe-any */
}
export { MSMediaKeysConstructor };
