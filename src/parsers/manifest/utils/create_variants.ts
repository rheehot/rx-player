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
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedRepresentation,
  IParsedVariant
} from "../types";

/**
 * @param {Object} adaptations
 * @param {Object} videoVariant
 * @returns {Array.<Object>}
 */
function getVariantWithVideo(
  adaptations : IParsedAdaptations,
  videoVariant : { adaptation : IParsedAdaptation;
                   representation : IParsedRepresentation; } |
                 null
) : IParsedVariant[] {
  if (adaptations.audio === undefined || adaptations.audio.length === 0) {
    return getVariantWithVideoAndAudio(adaptations,
                                       videoVariant,
                                       null);
  }
  const variants : IParsedVariant[] = [];
  for (let i = 0; i < adaptations.audio.length; i++) {
    const audioAdaptation = adaptations.audio[i];
    for (let j = 0; j < audioAdaptation.representations.length; j++) {
      const audioRep = audioAdaptation.representations[j];
      const variant = getVariantWithVideoAndAudio(adaptations,
                                                  videoVariant,
                                                  { adaptation: audioAdaptation,
                                                    representation: audioRep });
      variants.push(...variant);
    }
  }
  return variants;
}

/**
 * @param {Object} adaptations
 * @param {Object} videoVariant
 * @param {Object} audioVariant
 * @returns {Array.<Object>}
 */
function getVariantWithVideoAndAudio(
  adaptations : IParsedAdaptations,
  videoVariant : { adaptation : IParsedAdaptation;
                   representation : IParsedRepresentation; } |
                 null,
  audioVariant : { adaptation : IParsedAdaptation;
                   representation : IParsedRepresentation; } |
                 null
) : IParsedVariant[] {
  if (adaptations.text === undefined || adaptations.text.length === 0) {
    const bitrate = (videoVariant?.representation.bitrate ?? 0) +
                    (audioVariant?.representation.bitrate ?? 0);
    return [{ video: videoVariant,
              audio: audioVariant,
              text: null,
              bitrate }];
  }

  const variants : IParsedVariant[] = [];
  for (let textTrackI = 0; textTrackI < adaptations.text.length; textTrackI++) {
    const textAdap = adaptations.text[textTrackI];
    for (let textQualI = 0;
      textQualI < textAdap.representations.length;
      textQualI++)
    {
      const textRep = textAdap.representations[textQualI];
      const bitrate = (videoVariant?.representation.bitrate ?? 0) +
                      (audioVariant?.representation.bitrate ?? 0) +
                      (textRep.bitrate ?? 0);
      variants.push({ video: videoVariant,
                      audio: audioVariant,
                      text: { adaptation: textAdap,
                              representation: textRep },
                      bitrate });
    }
  }
  return variants;
}

/**
 * @param {Object} adaptations
 * @returns {Array.<Object>}
 */
export default function createVariants(
  adaptations : IParsedAdaptations
) : IParsedVariant[] {
  if (adaptations.video === undefined || adaptations.video.length === 0) {
    return getVariantWithVideo(adaptations, null);
  }
  const variants : IParsedVariant[] = [];
  for (let i = 0; i < adaptations.video.length; i++) {
    const videoAdaptation = adaptations.video[i];
    for (let j = 0; j < videoAdaptation.representations.length; j++) {
      const videoRep = videoAdaptation.representations[j];
      const variant = getVariantWithVideo(adaptations,
                                          { adaptation: videoAdaptation,
                                            representation: videoRep });
      variants.push(...variant);
    }
  }
  return variants;
}
