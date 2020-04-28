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

import {
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  catchError,
  ignoreElements,
} from "rxjs/operators";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
} from "../../../compat";
import closeSession$ from "../../../compat/eme/close_session";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
import InitDataStorage from "../../../utils/init_data_storage";

// Cached data for a single MediaKeySession
interface IStoreSessionEntry { initData : Uint8Array;
                               initDataType: string|undefined;
                               session : MediaKeySession|ICustomMediaKeySession;
                               sessionType : MediaKeySessionType; }

// What is returned by the cache
export interface IStoreSessionData { session : MediaKeySession |
                                               ICustomMediaKeySession;
                                     sessionType : MediaKeySessionType; }

/**
 * Create and store MediaKeySessions linked to a single MediaKeys
 * instance.
 *
 * Keep track of sessionTypes and of the initialization data each
 * MediaKeySession is created for.
 * @class LoadedSessionsStore
 */
export default class LoadedSessionsStore {
  /** MediaKeys instance on which the MediaKeySessions are created. */
  private readonly _mediaKeys : MediaKeys|ICustomMediaKeys;

  /** Storage for MediaKeySessions with an `undefined` initDataType. */
  private _unknownInitDataTypeStorage : InitDataStorage<IStoreSessionEntry>;

  /**
   * Storages for MediaKeySessions with a known initDataType.
   * One storage per initDataType.
   */
  private _knownInitDataTypeStorage : Partial<
                                        Record<string,
                                               InitDataStorage<IStoreSessionEntry>>>;

  /**
   * Create a new LoadedSessionsStore, which will store information about
   * loaded MediaKeySessions on the given MediaKeys instance.
   * @param {MediaKeys} mediaKeys
   */
  constructor(mediaKeys : MediaKeys|ICustomMediaKeys) {
    this._mediaKeys = mediaKeys;
    this._knownInitDataTypeStorage = {};
    this._unknownInitDataTypeStorage = new InitDataStorage();
  }

  /**
   * Returns the stored MediaKeySession information related to the
   * given initDataType and initData if found.
   * Returns `null` if no such session is stored.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  public get(
    initData : Uint8Array,
    initDataType: string|undefined
  ) : IStoreSessionData | null {
    const entry = this._getEntry(initData, initDataType);
    if (entry === undefined) {
      return null;
    }
    return { session: entry.session,
             sessionType: entry.sessionType };
  }

  /**
   * Create a new MediaKeySession and store it in this store.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @param {string} sessionType
   * @returns {MediaKeySession}
   * @throws {EncryptedMediaError}
   */
  public createSession(
    initData : Uint8Array,
    initDataType : string|undefined,
    sessionType : MediaKeySessionType
  ) : MediaKeySession|ICustomMediaKeySession {
    if (this.get(initData, initDataType) !== null) {
      throw new EncryptedMediaError("MULTIPLE_SESSIONS_SAME_INIT_DATA",
                                    "This initialization data was already stored.");
    }

    const session = this._mediaKeys.createSession(sessionType);
    const entry = { session,
                    sessionType,
                    initData,
                    initDataType };
    if (session.closed !== null) {
      session.closed
        .then(() => {
          const currentEntry = this._getEntry(initData, initDataType);
          if (currentEntry !== undefined && currentEntry.session === session) {
            this._removeFromStorage(initData, initDataType);
          }
        })
        .catch((e : unknown) => {
          log.warn(`EME-LSS: session.closed rejected: ${e}`);
        });
    }

    log.debug("EME-LSS: Add session", entry);
    this._addEntry(entry);
    return session;
  }

  /**
   * Close a MediaKeySession corresponding to an initialization data and remove
   * its entry if it's found in the store.
   * @param {MediaKeySession} session
   * @returns {Observable}
   */
  public closeSession(
    initData : Uint8Array,
    initDataType : string | undefined
  ) : Observable<unknown> {
    return observableDefer(() => {
      const entry = this._removeFromStorage(initData, initDataType);
      if (entry === undefined) {
        log.warn("EME-LSS: No session found with the given initData and initDataType");
        return EMPTY;
      }
      const { session } = entry;
      log.debug("EME-LSS: Close session", session);
      return closeSession$(session)
        .pipe(catchError((err) => {
          log.error(err);
          return observableOf(null);
        }));
    });
  }

  /**
   * Get information about all MediaKeySessions currently stored.
   * @returns {Array.<Object>}
   */
  public getAll() : IStoreSessionEntry[] {
    const initDataTypes = Object.keys(this._knownInitDataTypeStorage);
    const res = [];
    for (let i = 0; i < initDataTypes.length; i++) {
      const initDataType = initDataTypes[i];
      const storage = this._knownInitDataTypeStorage[initDataType];
      if (storage !== undefined) {
        const entries = storage.getEntries();
        for (let j = 0; j < entries.length; j++) {
          res.push(entries[j][1]);
        }
      }
    }
    const unknownInitDataTypeEntries = this._unknownInitDataTypeStorage.getEntries();
    for (let i = 0; i < unknownInitDataTypeEntries.length; i++) {
      const entry = unknownInitDataTypeEntries[i];
      res.push(entry[1]);
    }
    return res;
  }

  /**
   * Close all sessions in this store.
   * Emit null when done
   * @returns {Observable}
   */
  public closeAllSessions() : Observable<null> {
    return observableDefer(() => {
      const previousEntries = this.getAll();
      const disposed = previousEntries
        .map((entry) => this.closeSession(entry.initData, entry.initDataType));
      this._unknownInitDataTypeStorage = new InitDataStorage();
      this._knownInitDataTypeStorage = {};
      return observableConcat(observableMerge(...disposed).pipe(ignoreElements()),
                              observableOf(null));
    });
  }

  /**
   * Returns if found the stored entry related to the given initDataType and
   * initData.
   * Returns `undefined` if no such session is stored.
   * @param {Uint8Array} initData
   * @param {string|undefined} initDataType
   * @returns {Object|null}
   */
  private _getEntry(
    initData : Uint8Array,
    initDataType : string|undefined
  ) : IStoreSessionEntry | undefined {
    if (initDataType === undefined) {
      return this._unknownInitDataTypeStorage.get(initData);
    } else {
      const storage = this._knownInitDataTypeStorage[initDataType];
      return storage?.get(initData);
    }
  }

  /**
   * Add a new entry in the right storage.
   * @param {Object} entry
   */
  private _addEntry(entry : IStoreSessionEntry) : void {
    const { initData, initDataType } = entry;
    if (initDataType === undefined) {
      this._unknownInitDataTypeStorage.set(initData, entry);
    } else {
      let storage = this._knownInitDataTypeStorage[initDataType];
      if (storage === undefined) {
        const newStorage = new InitDataStorage<IStoreSessionEntry>();
        this._knownInitDataTypeStorage[initDataType] = newStorage;
        storage = newStorage;
      }
      storage.set(initData, entry);
    }
  }

  /**
   * Remove a given entry from the corresponding storage.
   * Returns the removed entry if it has been found and removed, `undefined`
   * otherwise.
   * @param {Object} entry
   * @returns {boolean}
   */
  private _removeFromStorage(
    initData : Uint8Array,
    initDataType : string | undefined
  ) : IStoreSessionEntry | undefined {
    log.debug("EME-LSS: deleting session");
    if (initDataType === undefined) {
      const removed = this._unknownInitDataTypeStorage.remove(initData);
      if (removed === undefined) {
        log.warn("EME-LSS: asked to remove an inexistent session");
      }
      return removed;
    } else {
      const storage = this._knownInitDataTypeStorage[initDataType];
      const removed = storage?.remove(initData);
      if (removed === undefined) {
        log.warn("EME-LSS: asked to remove an inexistent session");
      }
      return removed;
    }
  }
}
