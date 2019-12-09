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
import { ICustomMediaKeySession } from "../../compat";
import { IEMEWarningEvent, IKeySystemOption } from "./types";
/**
 * Look at the current key statuses in the sessions and construct the
 * appropriate warnings and blacklisted key ids.
 *
 * Throws if one of the keyID is on an error.
 * @param {MediaKeySession} session - The MediaKeySession from which the keys
 * will be checked.
 * @param {Object} keySystem - Configuration. Used to known on which situations
 * we can fallback.
 * @returns {Array} - Warnings to send and blacklisted key ids.
 */
export default function checkKeyStatuses(session: MediaKeySession | ICustomMediaKeySession, keySystem: IKeySystemOption): [IEMEWarningEvent[], ArrayBuffer[]];
