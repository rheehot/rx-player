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
  concat,
  defer as observableDefer,
  Observable,
  of as observableOf,
} from "rxjs";
import { shareReplay } from "rxjs/operators";
import {
  ICompatMediaKeySystemAccess,
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
  setMediaKeys,
} from "../../compat";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import { IKeySystemOption } from "./types";
import SessionsStore from "./utils/open_sessions_store";

export interface IMediaElementMediaKeysInfos {
  keySystemOptions : IKeySystemOption;
  mediaKeySystemAccess : ICustomMediaKeySystemAccess |
                         ICompatMediaKeySystemAccess;
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
  sessionsStore : SessionsStore;
}

type IStoredMediaKeysInfos = IMediaElementMediaKeysInfos &
                             { mediaKeysAttachmentQueue$ : Observable<unknown> };

// Store the MediaKeys infos attached to a media element.
const currentMediaState = new WeakMap<HTMLMediaElement,
                                      IStoredMediaKeysInfos | null>();

const MediaKeysSetter = {
  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} mediaKeysInfos
   */
  setMediaKeys(
    mediaElement : HTMLMediaElement,
    mediaKeysInfos: IMediaElementMediaKeysInfos
  ) : Observable<unknown> {
    return observableDefer(() => {
      const currentState = currentMediaState.get(mediaElement);

      let mediaKeysAttachmentQueue$ : Observable<unknown>;

      if (isNullOrUndefined(currentState)) {
        mediaKeysAttachmentQueue$ =
          setMediaKeys(mediaElement, mediaKeysInfos.mediaKeys).pipe(
            shareReplay({ refCount: true })
          );
      } else {
        mediaKeysAttachmentQueue$ = currentState.mediaKeysAttachmentQueue$;
        if (currentState.sessionsStore !== mediaKeysInfos.sessionsStore) {
          mediaKeysAttachmentQueue$ = concat(
            mediaKeysAttachmentQueue$,
            currentState.sessionsStore.closeAllSessions());
        }
        if (mediaKeysInfos.mediaKeys !== currentState.mediaKeys) {
          mediaKeysAttachmentQueue$ =
            concat(mediaKeysAttachmentQueue$,
                   setMediaKeys(mediaElement, mediaKeysInfos.mediaKeys).pipe(
                     shareReplay({ refCount: true })
                   ));
        }
      }

      const newState = objectAssign({ mediaKeysAttachmentQueue$ }, mediaKeysInfos);
      currentMediaState.set(mediaElement, newState);
      return mediaKeysAttachmentQueue$;
    });
  },

  /**
   * Get the last MediaKeys infos set through the MediaKeysSetter.
   * /!\ Those information might still not be set right now on the
   * HTMLMediaElement (this operation might be still pending).
   * @param {HTMLMediaElement} mediaElement
   * @returns {Object}
   */
  getLastSetInfos(
    mediaElement : HTMLMediaElement
  ) : IMediaElementMediaKeysInfos | null {
    const currentState = currentMediaState.get(mediaElement);
    return isNullOrUndefined(currentState) ? null :
                                             currentState;
  },

  /**
   * Remove MediaKeys infos currently set on a HMTLMediaElement
   * @param {HTMLMediaElement} mediaElement
   */
  detachMediaKeys(mediaElement : HTMLMediaElement) : Observable<unknown> {
    return observableDefer(() => {
      const currentState = currentMediaState.get(mediaElement);
      if (isNullOrUndefined(currentState)) {
        return observableOf(null);
      }
      currentMediaState.set(mediaElement, null);
      return concat(currentState.mediaKeysAttachmentQueue$,
                    currentState.sessionsStore.closeAllSessions(),
                    setMediaKeys(mediaElement, null));
    });
  },
};

export default MediaKeysSetter;
