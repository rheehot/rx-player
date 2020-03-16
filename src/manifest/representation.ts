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

import log from "../log";
import {
  IContentProtections,
  IParsedPartialRepresentation,
  IParsedRepresentation,
} from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import { concat } from "../utils/byte_parsing";
import IRepresentationIndex from "./representation_index";
import { MANIFEST_UPDATE_TYPE } from "./types";

export interface IContentProtectionsInitDataObject {
  type : string;
  data : Uint8Array;
}

// Representation that might not have been fetched yet
export interface IPartialRepresentation {
  // ID uniquely identifying the Representation in the Adaptation.
  readonly id : string;

  // Possible URL at which the Representation can be fetched and refreshed
  url? : string;

  // Interface allowing to request segments for specific times.
  index? : IRepresentationIndex;

  // Bitrate this Representation is in, in bits per seconds.
  bitrate? : number;

  // Frame-rate, when it can be applied, of this Representation, in any textual
  // indication possible (often under a ratio form).
  frameRate? : string;

  // A string describing the codec used for this Representation.
  // Examples: vp9, hvc, stpp
  // undefined if we do not know.
  codec? : string;

  // A string describing the mime-type for this Representation.
  // Examples: audio/mp4, video/webm, application/mp4, text/plain
  // undefined if we do not know.
  mimeType? : string;

  // If this Representation is linked to video content, this value is the width
  // in pixel of the corresponding video data.
  width? : number;

  // If this Representation is linked to video content, this value is the height
  // in pixel of the corresponding video data.
  height? : number;

  // DRM Information for this Representation.
  contentProtections? : IContentProtections;

  // Whether we are able to decrypt this Representation / unable to decrypt it or
  // if we don't know yet:
  //   - if `true`, it means that we know we were able to decrypt this
  //     Representation in the current content.
  //   - if `false`, it means that we know we were unable to decrypt this
  //     Representation
  //   - if `undefined` there is no certainty on this matter
  decipherable? : boolean;

  // If `true`, we have a fetched and exploitable IRepresentation
  isFetched() : boolean;

  update(newRepresentation : Representation, updateType : MANIFEST_UPDATE_TYPE) : void;
  getMimeTypeString() : string | undefined;
  getProtectionsInitializationData() : IContentProtectionsInitDataObject[];
  _addProtectionData(initDataType : string, systemId : string, data : Uint8Array) : void;
}

// Period that is known to be fetched
export interface IFetchedRepresentation extends IPartialRepresentation {
  index : IRepresentationIndex;
  bitrate : number;
  isFetched() : true;
}

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation implements IPartialRepresentation {
  public readonly id : string;
  public bitrate? : number;
  public codec? : string;
  public contentProtections? : IContentProtections;
  public decipherable? : boolean;
  public frameRate? : string;
  public height? : number;
  public index? : IRepresentationIndex;
  public mimeType? : string;
  public url? : string;
  public width? : number;

  private _isFetched : boolean;

  /**
   * @param {Object} args
   */
  constructor(args : IParsedRepresentation | IParsedPartialRepresentation) {
    this.id = args.id;
    this.bitrate = args.bitrate;
    this.codec = args.codecs;
    this.url = args.url;
    this._isFetched = args.isFetched;

    if (args.height != null) {
      this.height = args.height;
    }

    if (args.width != null) {
      this.width = args.width;
    }

    if (args.mimeType != null) {
      this.mimeType = args.mimeType;
    }

    if (args.contentProtections !== undefined) {
      this.contentProtections = args.contentProtections;
    }

    if (args.frameRate != null) {
      this.frameRate = args.frameRate;
    }

    this.index = args.index;
  }

  /**
   * @returns {Boolean}
   */
  isFetched() : this is IFetchedRepresentation {
    return this._isFetched;
  }

  /**
   * Returns "mime-type string" which includes both the mime-type and the codec,
   * which is often needed when interacting with the browser's APIs.
   * @returns {string}
   */
  getMimeTypeString() : string | undefined {
    if (this.mimeType === undefined || this.codec === undefined) {
      return undefined;
    }
    return `${this.mimeType};codecs="${this.codec}"`;
  }

  /**
   * Returns every protection initialization data concatenated.
   * This data can then be used through the usual EME APIs.
   * `null` if this Representation has no detected protection initialization
   * data.
   * @returns {Array.<Object>|null}
   */
  getProtectionsInitializationData() : IContentProtectionsInitDataObject[] {
    const contentProtections = this.contentProtections;
    if (contentProtections === undefined) {
      return [];
    }
    return Object.keys(contentProtections.initData)
      .reduce<IContentProtectionsInitDataObject[]>((acc, initDataType) => {
        const initDataArr = contentProtections.initData[initDataType];
        if (initDataArr === undefined || initDataArr.length === 0) {
          return acc;
        }
        const initData = concat(...initDataArr.map(({ data }) => data));
        acc.push({ type: initDataType,
                   data: initData });
        return acc;
      }, []);
  }

  /**
   * Update current Representation with a new one.
   * @param {Object} newRepresentation
   * @param {number} updateType
   */
  update(newRepresentation : Representation, updateType : MANIFEST_UPDATE_TYPE) {
    this._isFetched = newRepresentation._isFetched;
    this.url = newRepresentation.url;
    this.bitrate = newRepresentation.bitrate;
    this.frameRate = newRepresentation.frameRate;
    this.codec = newRepresentation.codec;
    this.mimeType = newRepresentation.mimeType;
    this.width = newRepresentation.width;
    this.height = newRepresentation.height;
    this.contentProtections = newRepresentation.contentProtections;
    this.decipherable = newRepresentation.decipherable;
    if (!newRepresentation.isFetched() || !this.isFetched()) {
      this.index = newRepresentation.index;
    } else if (updateType === MANIFEST_UPDATE_TYPE.Full) {
      this.index._replace(newRepresentation.index);
    } else {
      this.index._update(newRepresentation.index);
    }
  }

  /**
   * Add protection data to the Representation to be able to properly blacklist
   * it if that data is.
   * /!\ Mutates the current Representation
   * @param {string} initDataArr
   * @param {string} systemId
   * @param {Uint8Array} data
   */
  _addProtectionData(initDataType : string, systemId : string, data : Uint8Array) {
    const newElement = { systemId, data };
    if (this.contentProtections === undefined) {
      this.contentProtections = { keyIds: [],
                                  initData: { [initDataType] : [newElement] } };
      return;
    }

    const initDataArr = this.contentProtections.initData[initDataType];

    if (initDataArr === undefined) {
      this.contentProtections.initData[initDataType] = [newElement];
      return;
    }

    for (let i = initDataArr.length - 1; i >= 0; i--) {
      if (initDataArr[i].systemId === systemId) {
        if (areArraysOfNumbersEqual(initDataArr[i].data, data)) {
          return;
        }
        log.warn("Manifest: Two PSSH for the same system ID");
      }
    }
    initDataArr.push(newElement);
  }
}

export default Representation;
