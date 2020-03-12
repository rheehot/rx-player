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
import { ICustomMediaKeySession } from "../../compat";
import { IMediaKeysInfos } from "./types";
export interface IEncryptedEvent {
    type: string | undefined;
    data: Uint8Array;
}
export interface ISessionData {
    mediaKeySession: MediaKeySession | ICustomMediaKeySession;
    sessionType: MediaKeySessionType;
    initData: Uint8Array;
    initDataType: string | // type of the associated initialization data
    undefined;
}
export interface ICreatedSession {
    type: "created-session";
    value: ISessionData;
}
export interface ILoadedOpenSession {
    type: "loaded-open-session";
    value: ISessionData;
}
export interface ILoadedPersistentSessionEvent {
    type: "loaded-persistent-session";
    value: ISessionData;
}
export declare type IHandledEncryptedEvent = ICreatedSession | ILoadedOpenSession | ILoadedPersistentSessionEvent;
/**
 * Handle MediaEncryptedEvents sent by a HTMLMediaElement:
 * Either create a session, recuperate a previous session and returns it or load
 * a persistent session.
 * @param {Event} encryptedEvent
 * @param {Object} handledInitData
 * @param {Object} mediaKeysInfos
 * @returns {Observable}
 */
export default function getSession(encryptedEvent: IEncryptedEvent, mediaKeysInfos: IMediaKeysInfos): Observable<IHandledEncryptedEvent>;
