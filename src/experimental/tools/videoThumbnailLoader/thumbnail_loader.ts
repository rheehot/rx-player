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

import pinkie from "pinkie";
import {
  EMPTY,
  merge as observableMerge,
  race as observableRace,
  Subject,
} from "rxjs";
import {
  catchError,
  filter,
  ignoreElements,
  map,
  mergeMap,
  take,
} from "rxjs/operators";
import createSegmentLoader from "../../../core/pipelines/segment/create_segment_loader";
import Player from "../../../index";
import log from "../../../log";
import { ISegment } from "../../../manifest";
import getContentInfos from "./get_content_infos";
import {
  disposeSourceBuffer,
  initSourceBuffer$,
} from "./init_source_buffer";
import removeBuffer$ from "./remove_buffer";
import { IContentInfos, IFetchers } from "./types";
import VideoThumbnailLoaderError from "./video_thumbnail_loader_error";

const PPromise = typeof Promise === "function" ? Promise :
                                                 pinkie;

interface IJob { contentInfos: IContentInfos;
                 segment: ISegment;
                 stop: () => void;
                 jobPromise: Promise<unknown>; }

/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * The tools will extract a "thumbnail track" either from a video track (whose light
 * chunks are adapted from such use case) or direclty from the media content.
 */
export default class VideoThumbnailLoader {
  private readonly _videoElement: HTMLVideoElement;

  private _player: Player;
  private _currentJob?: IJob;
  private _fetcher: IFetchers = {};

  constructor(videoElement: HTMLVideoElement,
              player: Player) {
    this._videoElement = videoElement;
    this._player = player;
  }

  /**
   * Add imported fetcher to thumbnail loader fetcher object.
   * It allows to use it when setting time.
   * @param {function} fetcherFunc
   */
  addFetcher(fetcherFunc: (features: IFetchers) => void) {
    fetcherFunc(this._fetcher);
  }

  /**
   * Set time of thumbnail video media element :
   * - Remove buffer when too much buffered data
   * - Search for thumbnail track element to display
   * - Load data
   * - Append data
   * Resolves when time is set.
   * @param {number} time
   * @returns {Promise}
   */
  setTime(time: number): Promise<unknown> {
    for (let i = 0; i < this._videoElement.buffered.length; i++) {
      if (this._videoElement.buffered.start(i) <= time &&
          this._videoElement.buffered.end(i) >= time) {
        this._videoElement.currentTime = time;
        log.debug("VTL: Thumbnail already loaded.", time);
        return PPromise.resolve(time);
      }
    }

    const manifest = this._player.getManifest();
    if (manifest === null) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_MANIFEST",
                                      "No manifest available."));
    }
    const contentInfos = getContentInfos(time, manifest);
    if (contentInfos === null) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_TRACK",
                                      "Couldn't find track for this time."));
    }
    const initURL = contentInfos.representation.index
      .getInitSegment()?.mediaURLs?.[0] ?? "";
    if (initURL === "") {
      return PPromise.reject(
        new VideoThumbnailLoaderError("MISSING_INIT_DATA",
                                      "Missing mandatory initialization data " +
                                      "needed to display the thumbnails"));
    }
    const segment = contentInfos.representation.index.getSegments(time, 10)[0];
    if (segment === undefined) {
      return PPromise.reject(
        new VideoThumbnailLoaderError("NO_THUMBNAIL",
                                      "Couldn't find thumbnail."));
    }

    log.debug("VTL: Found thumbnail for time", time, segment);

    if (this._currentJob !== undefined &&
        this._currentJob.contentInfos.representation.id ===
          contentInfos.representation.id &&
        this._currentJob.contentInfos.adaptation.id ===
          contentInfos.adaptation.id &&
        this._currentJob.contentInfos.period.id ===
          contentInfos.period.id &&
        this._currentJob.contentInfos.manifest.id ===
          contentInfos.manifest.id &&
        this._currentJob.segment.id === segment.id) {
      // The current job is already handling the loading for the wanted time
      // (same thumbnail).
      return this._currentJob.jobPromise;
    }
    this._currentJob?.stop();
    return this.startJob(contentInfos, time, segment);
  }

  /**
   * Dispose thumbnail loader.
   * @returns {void}
   */
  dispose(): void {
    this._currentJob?.stop();
    disposeSourceBuffer(this._videoElement);
  }

  private startJob(contentInfos: IContentInfos,
                   time: number,
                   segment: ISegment
  ): Promise<unknown> {
    const fetcher = this._fetcher[contentInfos.manifest.transport];
    if (fetcher === undefined) {
      const error = new VideoThumbnailLoaderError("NO_FETCHER",
                                                  "VideoThumbnailLoaderError: No " +
                                                  "imported fetcher for this transport type: " +
                                                  contentInfos.manifest.transport);
      return PPromise.reject(error);
    }
    const { loader, parser } = fetcher.video;
    const killJob$ = new Subject();

    const abortError$ = killJob$.pipe(
      map(() => {
        throw new VideoThumbnailLoaderError("ABORTED",
                                            "VideoThumbnailLoaderError: Aborted job.");
      })
    );

    const jobPromise = observableRace(
      initSourceBuffer$(contentInfos,
                        this._videoElement).pipe(
        mergeMap((videoSourceBuffer) => {
          const bufferCleaning$ =
            removeBuffer$(this._videoElement, videoSourceBuffer, time);
          log.debug("VTL: Removed buffer before appending segments.", time);

          const segmentLoader = createSegmentLoader(
            loader,
            { maxRetry: 0,
              maxRetryOffline: 0,
              initialBackoffDelay: 0,
              maximumBackoffDelay: 0, }
          );

          const segmentLoading$ = segmentLoader({
            manifest: contentInfos.manifest,
            period: contentInfos.manifest.periods[0],
            adaptation: contentInfos.adaptation,
            representation: contentInfos.representation,
            segment,
          });

          return observableMerge(
            bufferCleaning$.pipe(ignoreElements()),
            segmentLoading$
          ).pipe(
            filter((evt): evt is { type: "data";
                                   value: { responseData: Uint8Array }; } =>
              evt.type === "data"),
            mergeMap((evt) => {
              const inventoryInfos = { manifest: contentInfos.manifest,
                                       period: contentInfos.period,
                                       adaptation: contentInfos.adaptation,
                                       representation: contentInfos.representation,
                                       segment };
              return parser({
                response: {
                  data: evt.value.responseData,
                  isChunked: false,
                },
                content: inventoryInfos,
              }).pipe(
                mergeMap((parserEvt) => {
                  if (parserEvt.type !== "parsed-segment") {
                    return EMPTY;
                  }
                  const { chunkData, appendWindow } = parserEvt.value;
                  const segmentData = chunkData instanceof ArrayBuffer ?
                    new Uint8Array(chunkData) : chunkData;
                  return videoSourceBuffer
                    .pushChunk({ data: { chunk: segmentData,
                                         timestampOffset: 0,
                                         appendWindow,
                                         initSegment: null,
                                         codec: contentInfos
                                           .representation.getMimeTypeString() },
                                 inventoryInfos })
                      .pipe(map(() => {
                        log.debug("VTL: Appended segment.", evt.value.responseData);
                        this._videoElement.currentTime = time;
                        return time;
                      })
                    );
                })
              );
            })
          );
        }),
        catchError((err: Error | { message?: string; toString(): string }) => {
          const newError =
            new VideoThumbnailLoaderError("LOADING_ERROR",
                                          (err.message ?? err.toString()));
          throw newError;
        })
      ),
      abortError$
    ).pipe(take(1)).toPromise(PPromise)
      .finally(() => {
        this._currentJob = undefined;
        killJob$.complete();
      });

    this._currentJob = {
      contentInfos,
      segment,
      stop: () => {
        killJob$.next();
        killJob$.complete();
      },
      jobPromise,
    };

    return jobPromise;
  }
}

export { default as DASH_FETCHER } from "./features/dash";
export { default as SMOOTH_FETCHER } from "./features/smooth";
export { default as MPL_FETCHER } from "./features/metaplaylist";
