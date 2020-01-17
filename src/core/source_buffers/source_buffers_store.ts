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

import { ICustomSourceBuffer } from "../../compat";
import { MediaError } from "../../errors";
import features from "../../features";
import log from "../../log";
import QueuedSourceBuffer, {
  IBufferType,
} from "./queued_source_buffer";
import SegmentInventory from "./segment_inventory";

type TypedArray = Int8Array |
                  Int16Array |
                  Int32Array |
                  Uint8Array |
                  Uint16Array |
                  Uint32Array |
                  Uint8ClampedArray |
                  Float32Array |
                  Float64Array;

const POSSIBLE_BUFFER_TYPES : IBufferType[] = [ "audio",
                                                "video",
                                                "text",
                                                "image" ];

/**
 * Get all currently available buffer types.
 * /!\ This list can evolve at runtime depending on feature switching.
 * @returns {Array.<string>}
 */
export function getBufferTypes() : IBufferType[] {
  const bufferTypes : IBufferType[] = ["audio", "video"];
  if (features.nativeTextTracksBuffer != null ||
      features.htmlTextTracksBuffer != null
  ) {
    bufferTypes.push("text");
  }
  if (features.imageBuffer != null) {
    bufferTypes.push("image");
  }
  return bufferTypes;
}

// Options available for a "text" SourceBuffer
export type ITextTrackSourceBufferOptions = { textTrackMode? : "native";
                                              hideNativeSubtitle? : boolean; } |
                                            { textTrackMode : "html";
                                              textTrackElement : HTMLElement; };

// General Options available for any SourceBuffer
export type ISourceBufferOptions = ITextTrackSourceBufferOptions;

// Types of "native" SourceBuffers
type INativeSourceBufferType = "audio" | "video";

interface ISourceBufferStoreElement<T> {
  queuedSourceBuffer : QueuedSourceBuffer<T>; // SourceBuffer Wrapper
  segmentInventory : SegmentInventory; // Keep track of segment information
                                       // about the segment pushed
}

/**
 * Allows to easily create and dispose SourceBuffers.
 *
 * Only one SourceBuffer per type is allowed at the same time:
 *
 *   - source buffers for native types (which depends on the native
 *     SourceBuffer implementation), are reused if one is re-created.
 *
 *   - source buffers for custom types are aborted each time a new one of the
 *     same type is created.
 *
 * The returned SourceBuffer is actually a QueuedSourceBuffer instance which
 * wrap a SourceBuffer implementation to queue all its actions.
 *
 * Each QueuedSourceBuffer is returned with a SegmentInventory, which allows you
 * to keep track of which segment has been pushed to it.
 *
 * @class SourceBuffersStore
 */
export default class SourceBuffersStore {
  /**
   * Returns true if the SourceBuffer is "native" (has to be attached to the
   * mediaSource before playback).
   * @static
   * @param {string} bufferType
   * @returns {Boolean}
   */
  static isNative(bufferType : string) : bufferType is INativeSourceBufferType {
    return shouldHaveNativeSourceBuffer(bufferType);
  }

  private readonly _mediaElement : HTMLMediaElement;
  private readonly _mediaSource : MediaSource;

  private _initializedSourceBuffers : {
    audio? : ISourceBufferStoreElement< ArrayBuffer |
                                        ArrayBufferView |
                                        TypedArray |
                                        DataView |
                                        null>;
    video? : ISourceBufferStoreElement< ArrayBuffer |
                                        ArrayBufferView |
                                        TypedArray |
                                        DataView |
                                        null>;
    text? : ISourceBufferStoreElement<unknown>;
    image? : ISourceBufferStoreElement<unknown>;
  };

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {MediaSource} mediaSource
   * @constructor
   */
  constructor(mediaElement : HTMLMediaElement, mediaSource : MediaSource) {
    this._mediaElement = mediaElement;
    this._mediaSource = mediaSource;
    this._initializedSourceBuffers = {};
  }

  /**
   * Returns the created QueuedSourceBuffer and its associated SegmentInventory
   * for the given type.
   * Returns null if no QueuedSourceBuffer were created for the given type.
   *
   * @param {string} bufferType
   * @returns {Object|null}
   */
  public get(bufferType : IBufferType) : ISourceBufferStoreElement<any>|null {
    const initializedBuffer = this._initializedSourceBuffers[bufferType];
    return initializedBuffer != null ? initializedBuffer :
                                       null;
  }

  /**
   * Creates the created QueuedSourceBuffer and its associated SegmentInventory
   * for the given type.
   * Reuse an already created one if a QueuedSourceBuffer for the given type
   * already exists.
   * @param {string} bufferType
   * @param {string} codec
   * @param {Object|undefined} options
   * @returns {QueuedSourceBuffer}
   */
  public createSourceBuffer(
    bufferType : IBufferType,
    codec : string,
    options : ISourceBufferOptions = {}
  ) : ISourceBufferStoreElement<any> {
    const memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
    if (shouldHaveNativeSourceBuffer(bufferType)) {
      if (memorizedSourceBuffer != null) {
        if (memorizedSourceBuffer.queuedSourceBuffer.codec !== codec) {
          log.warn("SB: Reusing native SourceBuffer with codec",
                   memorizedSourceBuffer.queuedSourceBuffer.codec,
                   "for codec",
                   codec);
        } else {
          log.info("SB: Reusing native SourceBuffer with codec", codec);
        }
        return memorizedSourceBuffer;
      }
      log.info("SB: Adding native SourceBuffer with codec", codec);
      const queuedSourceBuffer = createNativeQueuedSourceBuffer(bufferType,
                                                                this._mediaSource,
                                                                codec);
      const element = { queuedSourceBuffer, segmentInventory: new SegmentInventory() };
      this._initializedSourceBuffers[bufferType] = element;
      return element;
    }

    if (memorizedSourceBuffer != null) {
      log.info("SB: Reusing a previous custom SourceBuffer for the type", bufferType);
      return memorizedSourceBuffer;
    }

    if (bufferType === "text") {
      log.info("SB: Creating a new text SourceBuffer with codec", codec);

      let sourceBuffer : ICustomSourceBuffer<unknown>;
      if (options.textTrackMode === "html") {
        if (features.htmlTextTracksBuffer == null) {
          throw new Error("HTML Text track feature not activated");
        }
        sourceBuffer = new features.htmlTextTracksBuffer(this._mediaElement,
                                                         options.textTrackElement);
      } else {
        if (features.nativeTextTracksBuffer == null) {
          throw new Error("Native Text track feature not activated");
        }
        sourceBuffer = new features
          .nativeTextTracksBuffer(this._mediaElement,
                                  options.hideNativeSubtitle === true);
      }

      const queuedSourceBuffer = new QueuedSourceBuffer<unknown>("text",
                                                                 codec,
                                                                 sourceBuffer);
      const element = { queuedSourceBuffer, segmentInventory: new SegmentInventory() };
      this._initializedSourceBuffers.text = element;
      return element;
    } else if (bufferType === "image") {
      if (features.imageBuffer == null) {
        throw new Error("Image buffer feature not activated");
      }
      log.info("SB: Creating a new image SourceBuffer with codec", codec);
      const sourceBuffer = new features.imageBuffer();
      const queuedSourceBuffer = new QueuedSourceBuffer<unknown>("image",
                                                                 codec,
                                                                 sourceBuffer);
      const element = { queuedSourceBuffer, segmentInventory: new SegmentInventory() };
      return element;
    }

    log.error("SB: Unknown buffer type:", bufferType);
    throw new MediaError("BUFFER_TYPE_UNKNOWN",
                         "The player wants to create a SourceBuffer of an unknown type.");
  }

  /**
   * Dispose of the active SourceBuffer for the given type.
   * @param {string} bufferType
   */
  public disposeSourceBuffer(bufferType : IBufferType) : void {
    const memorizedSourceBuffer = this._initializedSourceBuffers[bufferType];
    if (memorizedSourceBuffer == null) {
      log.warn("SB: Trying to dispose a SourceBuffer that does not exist");
      return;
    }

    log.info("SB: Aborting SourceBuffer", bufferType);
    memorizedSourceBuffer.queuedSourceBuffer.dispose();
    if (!shouldHaveNativeSourceBuffer(bufferType) ||
        this._mediaSource.readyState === "open"
    ) {
      try {
        memorizedSourceBuffer.queuedSourceBuffer.abort();
      } catch (e) {
        log.warn(`SB: Failed to abort a ${bufferType} SourceBuffer:`, e);
      }
    }
    memorizedSourceBuffer.segmentInventory.reset();
    delete this._initializedSourceBuffers[bufferType];
  }

  /**
   * Dispose of all QueuedSourceBuffer created on this SourceBuffersStore.
   */
  public disposeAll() {
    POSSIBLE_BUFFER_TYPES.forEach((bufferType : IBufferType) => {
      if (this.get(bufferType) != null) {
        this.disposeSourceBuffer(bufferType);
      }
    });
  }
}

/**
 * Adds a SourceBuffer to the MediaSource.
 * @param {MediaSource} mediaSource
 * @param {string} codec
 * @returns {SourceBuffer}
 */
function createNativeQueuedSourceBuffer(
  bufferType : IBufferType,
  mediaSource : MediaSource,
  codec : string
) : QueuedSourceBuffer<ArrayBuffer|ArrayBufferView|TypedArray|DataView|null> {
  const sourceBuffer = mediaSource.addSourceBuffer(codec);
  return new QueuedSourceBuffer(bufferType, codec, sourceBuffer);
}

/**
 * Returns true if the given buffeType is a native buffer, false otherwise.
 * "Native" SourceBuffers are directly added to the MediaSource.
 * @param {string} bufferType
 * @returns {Boolean}
 */
function shouldHaveNativeSourceBuffer(
  bufferType : string
) : bufferType is INativeSourceBufferType {
  return bufferType === "audio" || bufferType === "video";
}
