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
  ICustomError,
  isKnownError,
  MediaError,
} from "../errors";
import {
  IParsedPartialPeriod,
  IParsedPeriod,
} from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import objectValues from "../utils/object_values";
import Adaptation, {
  IAdaptationType,
  IRepresentationFilter,
} from "./adaptation";

// Structure listing every `Adaptation` in a Period.
export type IManifestAdaptations = Partial<Record<IAdaptationType, Adaptation[]>>;

// Period that might not have been fetched yet
// Such Periods do not have a track list ready yet.
export interface IPartialPeriod {
  id : string;
  parsingErrors : ICustomError[];
  start : number;
  duration? : number;
  end? : number;
  getAdaptation(wantedId : number|string) : Adaptation|undefined;
  getAdaptations() : Adaptation[];
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[];
  isFetched() : boolean;
}

// Period that is known to be fetched
export interface IFetchedPeriod extends IPartialPeriod {
  adaptations : IManifestAdaptations;
  isFetched() : true;
}

/**
 * Class representing a single `Period` of the Manifest.
 * A Period contains every information about the content available for a
 * specific period in time.
 * @class Period
 */
export default class Period implements IPartialPeriod {
  // ID uniquely identifying the Period in the Manifest.
  public readonly id : string;

  // Every 'Adaptation' in that Period, per type of Adaptation.
  public adaptations? : IManifestAdaptations;

  // Duration of this Period, in seconds.
  // `undefined` for still-running Periods.
  public duration? : number;

  // Absolute start time of the Period, in seconds.
  public start : number;

  // Absolute end time of the Period, in seconds.
  // `undefined` for still-running Periods.
  public end? : number;

  // Array containing every errors that happened when the Period has been
  // created, in the order they have happened.
  public readonly parsingErrors : ICustomError[];

  /**
   * @constructor
   * @param {Object} args
   * @param {function|undefined} [representationFilter]
   */
  constructor(
    args : IParsedPeriod | IParsedPartialPeriod,
    representationFilter? : IRepresentationFilter
  ) {
    this.parsingErrors = [];
    this.id = args.id;
    const { adaptations } = args;
    if (adaptations != null) {
      this.adaptations = (Object.keys(adaptations) as IAdaptationType[])
        .reduce<IManifestAdaptations>((acc, type) => {
          const adaptationsForType = adaptations[type];
          if (adaptationsForType === undefined) {
            return acc;
          }
          const filteredAdaptations = adaptationsForType
            .map((adaptation) : Adaptation | null => {
              let newAdaptation : Adaptation | null = null;
              try {
                newAdaptation = new Adaptation(adaptation, { representationFilter });
              } catch (err) {
                if (isKnownError(err) &&
                    err.code === "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE") {
                  this.parsingErrors.push(err);
                  return null;
                }
                throw err;
              }
              this.parsingErrors.push(...newAdaptation.parsingErrors);
              return newAdaptation;
            })
            .filter((adaptation) : adaptation is Adaptation => {
              return adaptation != null && adaptation.representations.length > 0;
            });
          if (filteredAdaptations.length === 0 &&
              adaptationsForType.length > 0 &&
              (type === "video" || type === "audio")
          ) {
            throw new MediaError("MANIFEST_PARSE_ERROR",
                                 "No supported " + type + " adaptations");
          }

          if (filteredAdaptations.length > 0) {
            acc[type] = filteredAdaptations;
          }
          return acc;
        }, {});

        if (this.adaptations.video === undefined &&
            this.adaptations.audio === undefined)
        {
          throw new MediaError("MANIFEST_PARSE_ERROR",
                               "No supported audio and video tracks.");
        }

      if (!Array.isArray(this.adaptations.video) &&
          !Array.isArray(this.adaptations.audio))
      {
        throw new MediaError("MANIFEST_PARSE_ERROR",
                             "No supported audio and video tracks.");
      }
    }

    this.duration = args.duration;
    this.start = args.start;

    if (this.duration != null && this.start != null) {
      this.end = this.start + this.duration;
    }
  }

  /**
   * @returns {Boolean}
   */
  isFetched() : this is IFetchedPeriod {
    return this.adaptations != null;
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period, in an
   * Array.
   * @returns {Array.<Object>}
   */
  getAdaptations() : Adaptation[] {
    if (!this.isFetched()) {
      return [];
    }
    const adaptationsByType = this.adaptations;
    return objectValues(adaptationsByType)
      .reduce<Adaptation[]>((acc, adaptations) =>
        // Note: the second case cannot happen. TS is just being dumb here
        adaptations != null ? acc.concat(adaptations) :
                              acc,
        []
    );
  }

  /**
   * Returns every `Adaptations` (or `tracks`) linked to that Period for a
   * given type.
   * @param {string} adaptationType
   * @returns {Array.<Object>}
   */
  getAdaptationsForType(adaptationType : IAdaptationType) : Adaptation[] {
    if (!this.isFetched()) {
      return [];
    }
    const adaptationsForType = this.adaptations[adaptationType];
    return adaptationsForType == null ? [] :
                                        adaptationsForType;
  }

  /**
   * Returns the Adaptation linked to the given ID.
   * @param {number|string} wantedId
   * @returns {Object|undefined}
   */
  getAdaptation(wantedId : string) : Adaptation|undefined {
    return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
  }
}
