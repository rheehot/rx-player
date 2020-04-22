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
import { ICompatMediaKeySystemAccess, ICustomMediaKeys, ICustomMediaKeySession, ICustomMediaKeySystemAccess } from "../../compat";
import { ICustomError } from "../../errors";
import SessionsStore from "./utils/open_sessions_store";
import PersistedSessionsStore from "./utils/persisted_session_store";
export interface IEMEWarningEvent {
    type: "warning";
    value: ICustomError;
}
export interface IEncryptedEvent {
    type: "encrypted-event-received";
    value: {
        type?: string;
        data: ArrayBuffer | Uint8Array;
    };
}
export interface ICreatedMediaKeysEvent {
    type: "created-media-keys";
    value: IMediaKeysInfos;
}
export interface IAttachedMediaKeysEvent {
    type: "attached-media-keys";
    value: IMediaKeysInfos;
}
export interface IInitDataIgnoredEvent {
    type: "init-data-ignored";
    value: {
        type?: string;
        data: ArrayBuffer | Uint8Array;
    };
}
export interface ISessionMessageEvent {
    type: "session-message";
    value: {
        messageType: string;
        initData: Uint8Array;
        initDataType?: string;
    };
}
export interface INoUpdateEvent {
    type: "no-update";
    value: {
        initData: Uint8Array;
        initDataType?: string;
    };
}
export interface ISessionUpdatedEvent {
    type: "session-updated";
    value: {
        session: MediaKeySession | ICustomMediaKeySession;
        license: ILicense | null;
        initData: Uint8Array;
        initDataType?: string;
    };
}
export interface IBlacklistKeysEvent {
    type: "blacklist-keys";
    value: ArrayBuffer[];
}
export interface IBlacklistProtectionDataEvent {
    type: "blacklist-protection-data";
    value: {
        type: string;
        data: Uint8Array;
    };
}
export declare type IEMEManagerEvent = IEMEWarningEvent | // minor error
IEncryptedEvent | // browser's "encrypted" event
ICreatedMediaKeysEvent | IAttachedMediaKeysEvent | IInitDataIgnoredEvent | // initData already handled
ISessionMessageEvent | // MediaKeySession event
INoUpdateEvent | // `getLicense` returned `null`
ISessionUpdatedEvent | // `update` call resolved
IBlacklistKeysEvent | // keyIDs undecipherable
IBlacklistProtectionDataEvent;
export declare type ILicense = TypedArray | ArrayBuffer;
export interface IContentProtection {
    type: string;
    data: Uint8Array;
}
export interface IKeyStatusChangeHandledEvent {
    type: "key-status-change-handled";
    value: {
        session: MediaKeySession | ICustomMediaKeySession;
        license: ILicense | null;
    };
}
export interface IKeyMessageHandledEvent {
    type: "key-message-handled";
    value: {
        session: MediaKeySession | ICustomMediaKeySession;
        license: ILicense | null;
    };
}
export interface IKeySystemAccessInfos {
    keySystemAccess: ICompatMediaKeySystemAccess | ICustomMediaKeySystemAccess;
    keySystemOptions: IKeySystemOption;
}
export interface IMediaKeysInfos {
    mediaKeySystemAccess: ICompatMediaKeySystemAccess | ICustomMediaKeySystemAccess;
    keySystemOptions: IKeySystemOption;
    mediaKeys: MediaKeys | ICustomMediaKeys;
    sessionsStore: SessionsStore;
    sessionStorage: PersistedSessionsStore | null;
}
export interface IPersistedSessionData {
    sessionId: string;
    initData: number;
    initDataType?: string | undefined;
}
export interface IPersistedSessionStorage {
    load(): IPersistedSessionData[];
    save(x: IPersistedSessionData[]): void;
}
export declare type TypedArray = Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;
export interface IKeySystemOption {
    type: string;
    getLicense: (message: Uint8Array, messageType: string) => Promise<TypedArray | ArrayBuffer | null> | TypedArray | ArrayBuffer | null;
    getLicenseConfig?: {
        retry?: number;
        timeout?: number;
    };
    serverCertificate?: ArrayBuffer | TypedArray;
    persistentLicense?: boolean;
    licenseStorage?: IPersistedSessionStorage;
    persistentStateRequired?: boolean;
    distinctiveIdentifierRequired?: boolean;
    closeSessionsOnStop?: boolean;
    onKeyStatusesChange?: (evt: Event, session: MediaKeySession | ICustomMediaKeySession) => Promise<TypedArray | ArrayBuffer | null> | TypedArray | ArrayBuffer | null;
    videoRobustnesses?: Array<string | undefined>;
    audioRobustnesses?: Array<string | undefined>;
    throwOnLicenseExpiration?: boolean;
    disableMediaKeysAttachmentLock?: boolean;
    fallbackOn?: {
        keyInternalError?: boolean;
        keyOutputRestricted?: boolean;
    };
}
