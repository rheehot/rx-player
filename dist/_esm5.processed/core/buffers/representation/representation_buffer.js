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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
/**
 * This file allows to create RepresentationBuffers.
 *
 * A RepresentationBuffer downloads and push segment for a single
 * Representation (e.g. a single video stream of a given quality).
 * It chooses which segments should be downloaded according to the current
 * position and what is currently buffered.
 */
import nextTick from "next-tick";
import objectAssign from "object-assign";
import { combineLatest as observableCombineLatest, concat as observableConcat, defer as observableDefer, EMPTY, merge as observableMerge, of as observableOf, ReplaySubject, Subject, } from "rxjs";
import { finalize, ignoreElements, map, mapTo, mergeMap, share, startWith, switchMap, take, takeWhile, withLatestFrom, } from "rxjs/operators";
import log from "../../../log";
import SimpleSet from "../../../utils/simple_set";
import EVENTS from "../events_generators";
import getNeededSegments from "./get_needed_segments";
import getSegmentPriority from "./get_segment_priority";
import getWantedRange from "./get_wanted_range";
import pushDataToSourceBufferWithRetries from "./push_data";
/**
 * Build up buffer for a single Representation.
 *
 * Download and push segments linked to the given Representation according
 * to what is already in the SourceBuffer and where the playback currently is.
 *
 * Multiple RepresentationBuffer observables can run on the same SourceBuffer.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationBuffer(_a) {
    var bufferGoal$ = _a.bufferGoal$, // emit the buffer size we have to reach
    clock$ = _a.clock$, // emit current playback information regularly
    content = _a.content, // The content we want to play
    fastSwitchingStep$ = _a.fastSwitchingStep$, // Bitrate higher or equal to this value should not be
    // replaced by segments of better quality
    queuedSourceBuffer = _a.queuedSourceBuffer, // interface to the SourceBuffer
    segmentFetcher = _a.segmentFetcher, // allows to download new segments
    terminate$ = _a.terminate$;
    var manifest = content.manifest, period = content.period, adaptation = content.adaptation, representation = content.representation;
    var codec = representation.getMimeTypeString();
    var bufferType = adaptation.type;
    var initSegment = representation.index.getInitSegment();
    // Saved initSegment state for this representation.
    var initSegmentObject = initSegment == null ? { chunkData: null,
        chunkInfos: null,
        chunkOffset: 0,
        segmentProtections: [],
        appendWindow: [undefined, undefined] } :
        null;
    // Segments queued for download in the BufferQueue.
    var downloadQueue = [];
    // Subject to start/restart a downloading Queue.
    var startDownloadingQueue$ = new ReplaySubject(1);
    // Emit when the RepresentationBuffer asks to re-check which segments are needed.
    var reCheckNeededSegments$ = new Subject();
    // Keep track of the information about the pending Segment request.
    // null if no request is pending.
    var currentSegmentRequest = null;
    // Keep track of downloaded segments currently awaiting to be appended to the
    // QueuedSourceBuffer.
    var loadedSegmentPendingPush = new SimpleSet();
    var status$ = observableCombineLatest([
        clock$,
        bufferGoal$,
        terminate$.pipe(take(1), mapTo(true), startWith(false)),
        reCheckNeededSegments$.pipe(startWith(undefined))
    ]).pipe(withLatestFrom(fastSwitchingStep$), map(function getCurrentStatus(_a) {
        var _b = _a[0], timing = _b[0], bufferGoal = _b[1], terminate = _b[2], fastSwitchingStep = _a[1];
        queuedSourceBuffer.synchronizeInventory();
        var neededRange = getWantedRange(period, timing, bufferGoal);
        var discontinuity = timing.stalled != null ?
            representation.index.checkDiscontinuity(timing.currentTime) :
            -1;
        var shouldRefreshManifest = representation.index.shouldRefresh(neededRange.start, neededRange.end);
        var segmentInventory = queuedSourceBuffer.getInventory();
        var neededSegments = getNeededSegments({ content: content,
            fastSwitchingStep: fastSwitchingStep,
            loadedSegmentPendingPush: loadedSegmentPendingPush,
            neededRange: neededRange,
            segmentInventory: segmentInventory })
            .map(function (segment) { return ({ priority: getSegmentPriority(segment, timing),
            segment: segment }); });
        if (initSegment != null && initSegmentObject == null) {
            // prepend initialization segment
            var initSegmentPriority = getSegmentPriority(initSegment, timing);
            neededSegments = __spreadArrays([{ segment: initSegment,
                    priority: initSegmentPriority }], neededSegments);
        }
        var isFull; // True if the current buffer is full and the one
        // from the next Period can be created
        if (neededSegments.length > 0 || period.end == null) {
            // Either we still have segments to download or the current Period is
            // not yet ended: not full
            isFull = false;
        }
        else {
            var lastPosition = representation.index.getLastPosition();
            if (lastPosition === undefined) {
                // We do not know the end of this index.
                // If we reached the end of the period, check that all segments are
                // available.
                isFull = neededRange.end >= period.end &&
                    representation.index.isFinished();
            }
            else if (lastPosition === null) {
                // There is no available segment in the index currently. If the index
                // tells us it has finished generating new segments, we're done.
                isFull = representation.index.isFinished();
            }
            else {
                // We have a declared end. Check that our range went until the last
                // position available in the index. If that's the case and we're left
                // with no segments after filtering them, it means we already have
                // downloaded the last segments and have nothing left to do: full.
                var endOfRange = period.end != null ? Math.min(period.end, lastPosition) :
                    lastPosition;
                isFull = neededRange.end >= endOfRange &&
                    representation.index.isFinished();
            }
        }
        return { discontinuity: discontinuity,
            isFull: isFull,
            terminate: terminate,
            neededSegments: neededSegments,
            shouldRefreshManifest: shouldRefreshManifest };
    }), mergeMap(function handleStatus(status) {
        var neededSegments = status.neededSegments;
        var mostNeededSegment = neededSegments[0];
        if (status.terminate) {
            downloadQueue = [];
            if (currentSegmentRequest == null) {
                log.debug("Buffer: no request, terminate.", bufferType);
                startDownloadingQueue$.complete(); // complete the downloading queue
                return observableOf({ type: "terminated" });
            }
            else if (mostNeededSegment == null ||
                currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
                log.debug("Buffer: cancel request and terminate.", bufferType);
                startDownloadingQueue$.next(); // interrupt the current request
                startDownloadingQueue$.complete(); // complete the downloading queue
                return observableOf({ type: "terminated" });
            }
            else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
                var request$ = currentSegmentRequest.request$;
                segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
                currentSegmentRequest.priority = mostNeededSegment.priority;
            }
            log.debug("Buffer: terminate after request.", bufferType);
            return EMPTY;
        }
        var neededActions = [];
        if (status.discontinuity > 1) {
            var nextTime = status.discontinuity + 1;
            var gap = [status.discontinuity, nextTime];
            neededActions.push(EVENTS.discontinuityEncountered(gap, bufferType));
        }
        if (status.shouldRefreshManifest) {
            neededActions.push(EVENTS.needsManifestRefresh());
        }
        if (mostNeededSegment == null) {
            if (currentSegmentRequest != null) {
                log.debug("Buffer: interrupt segment request.", bufferType);
            }
            downloadQueue = [];
            startDownloadingQueue$.next(); // (re-)start with an empty queue
            return observableConcat(observableOf.apply(void 0, neededActions), status.isFull ? observableOf(EVENTS.fullBuffer(bufferType)) :
                EMPTY);
        }
        if (currentSegmentRequest == null) {
            log.debug("Buffer: start downloading queue.", bufferType);
            downloadQueue = neededSegments;
            startDownloadingQueue$.next(); // restart the queue
        }
        else if (currentSegmentRequest.segment.id !== mostNeededSegment.segment.id) {
            log.debug("Buffer: restart download queue.", bufferType);
            downloadQueue = neededSegments;
            startDownloadingQueue$.next(); // restart the queue
        }
        else if (currentSegmentRequest.priority !== mostNeededSegment.priority) {
            log.debug("Buffer: update request priority.", bufferType);
            var request$ = currentSegmentRequest.request$;
            segmentFetcher.updatePriority(request$, mostNeededSegment.priority);
            currentSegmentRequest.priority = mostNeededSegment.priority;
        }
        else {
            log.debug("Buffer: update downloading queue", bufferType);
            // Update the previous queue to be all needed segments but the first one,
            // for which a request is already pending
            downloadQueue = neededSegments.slice().splice(1, neededSegments.length);
        }
        return observableConcat(observableOf.apply(void 0, neededActions), observableOf(EVENTS.activeBuffer(bufferType)));
    }), takeWhile(function (e) {
        return e.type !== "terminated";
    }));
    // Buffer Queue:
    //   - download every segments queued sequentially
    //   - append them to the SourceBuffer
    var bufferQueue$ = startDownloadingQueue$.pipe(switchMap(function () { return downloadQueue.length > 0 ? loadSegmentsFromQueue() : EMPTY; }), mergeMap(onLoaderEvent));
    return observableMerge(status$, bufferQueue$).pipe(share());
    /**
     * Request every Segment in the ``downloadQueue`` on subscription.
     * Emit the data of a segment when a request succeeded.
     *
     * Important side-effects:
     *   - Mutates `currentSegmentRequest` when doing and finishing a request.
     *   - Will emit from reCheckNeededSegments$ Subject when it's done.
     *
     * Might emit warnings when a request is retried.
     *
     * Throws when the request will not be retried (configuration or un-retryable
     * error).
     * @returns {Observable}
     */
    function loadSegmentsFromQueue() {
        var requestNextSegment$ = observableDefer(function () {
            var currentNeededSegment = downloadQueue.shift();
            if (currentNeededSegment == null) {
                nextTick(function () { reCheckNeededSegments$.next(); });
                return EMPTY;
            }
            var segment = currentNeededSegment.segment, priority = currentNeededSegment.priority;
            var context = { manifest: manifest, period: period, adaptation: adaptation, representation: representation, segment: segment };
            var request$ = segmentFetcher.createRequest(context, priority);
            currentSegmentRequest = { segment: segment, priority: priority, request$: request$ };
            var response$ = request$
                .pipe(mergeMap(function (evt) {
                if (evt.type === "warning") {
                    return observableOf({ type: "retry",
                        value: { segment: segment,
                            error: evt.value } });
                }
                else if (evt.type === "chunk-complete") {
                    currentSegmentRequest = null;
                    return observableOf({ type: "end-of-segment",
                        value: { segment: segment } });
                }
                var initInfos;
                if (initSegmentObject != null && initSegmentObject.chunkInfos != null) {
                    initInfos = initSegmentObject.chunkInfos;
                }
                return evt.parse(initInfos).pipe(map(function (data) {
                    return { type: "parsed-segment",
                        value: { segment: segment, data: data } };
                }));
            }));
            return observableConcat(response$, requestNextSegment$);
        });
        return requestNextSegment$
            .pipe(finalize(function () { currentSegmentRequest = null; }));
    }
    /**
     * React to event from `loadSegmentsFromQueue`.
     * @param {Object} evt
     * @returns {Observable}
     */
    function onLoaderEvent(evt) {
        switch (evt.type) {
            case "retry":
                return observableConcat(observableOf({ type: "warning", value: evt.value.error }), observableDefer(function () {
                    var retriedSegment = evt.value.segment;
                    var index = representation.index;
                    if (index.isSegmentStillAvailable(retriedSegment) === false) {
                        reCheckNeededSegments$.next();
                    }
                    else if (index.canBeOutOfSyncError(evt.value.error)) {
                        return observableOf(EVENTS.manifestMightBeOufOfSync());
                    }
                    return EMPTY;
                }));
            case "parsed-segment": {
                var segment = evt.value.segment;
                if (segment.isInit) {
                    initSegmentObject = evt.value.data;
                }
                return pushSegment(segment, evt.value.data);
            }
            case "end-of-segment": {
                var segment_1 = evt.value.segment;
                loadedSegmentPendingPush.add(segment_1.id);
                return queuedSourceBuffer.endOfSegment(objectAssign({ segment: segment_1 }, content))
                    .pipe(ignoreElements(), finalize(function () {
                    loadedSegmentPendingPush.remove(segment_1.id);
                }));
            }
        }
    }
    /**
     * Push a given segment to a QueuedSourceBuffer.
     * @param {Object} segment
     * @param {Object} segmentObject
     * @returns {Observable}
     */
    function pushSegment(segment, _a) {
        var chunkInfos = _a.chunkInfos, chunkData = _a.chunkData, chunkOffset = _a.chunkOffset, segmentProtections = _a.segmentProtections, appendWindow = _a.appendWindow;
        return observableDefer(function () {
            var protectedEvents$ = observableOf.apply(void 0, segmentProtections.map(function (segmentProt) {
                return EVENTS.protectedSegment(segmentProt);
            }));
            if (chunkData == null) {
                // no segmentData to add here (for example, a text init segment)
                // just complete directly without appending anything
                return protectedEvents$;
            }
            var data = { initSegment: initSegmentObject != null ?
                    initSegmentObject.chunkData :
                    null,
                chunk: segment.isInit ? null :
                    chunkData,
                timestampOffset: chunkOffset,
                appendWindow: appendWindow,
                codec: codec };
            var estimatedStart;
            var estimatedDuration;
            if (chunkInfos !== null) {
                estimatedStart = chunkInfos.time / chunkInfos.timescale;
                estimatedDuration = chunkInfos.duration !== undefined ?
                    chunkInfos.duration / chunkInfos.timescale :
                    undefined;
            }
            var inventoryInfos = objectAssign({ segment: segment,
                estimatedStart: estimatedStart,
                estimatedDuration: estimatedDuration }, content);
            var append$ = pushDataToSourceBufferWithRetries(clock$, queuedSourceBuffer, { data: data, inventoryInfos: inventoryInfos })
                .pipe(map(function () {
                var buffered = queuedSourceBuffer.getBufferedRanges();
                return EVENTS.addedSegment(content, segment, buffered, chunkData);
            }));
            return observableMerge(append$, protectedEvents$);
        });
    }
}
