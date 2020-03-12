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
import { asapScheduler, concat as observableConcat, defer as observableDefer, EMPTY, merge as observableMerge, of as observableOf, Subject, } from "rxjs";
import { exhaustMap, filter, ignoreElements, map, mergeMap, share, subscribeOn, take, takeUntil, tap, } from "rxjs/operators";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import { fromEvent } from "../../utils/event_emitter";
import SortedList from "../../utils/sorted_list";
import WeakMapMemory from "../../utils/weak_map_memory";
import { BufferGarbageCollector, getBufferTypes, } from "../source_buffers";
import ActivePeriodEmitter from "./active_period_emitter";
import areBuffersComplete from "./are_buffers_complete";
import EVENTS from "./events_generators";
import getBlacklistedRanges from "./get_blacklisted_ranges";
import PeriodBuffer from "./period";
var MAXIMUM_MAX_BUFFER_AHEAD = config.MAXIMUM_MAX_BUFFER_AHEAD, MAXIMUM_MAX_BUFFER_BEHIND = config.MAXIMUM_MAX_BUFFER_BEHIND;
/**
 * Create and manage the various Buffer Observables needed for the content to
 * play:
 *
 *   - Create or dispose SourceBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SourceBuffers depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Buffers for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Emit various events to notify of its health and issues
 *
 * Here multiple buffers can be created at the same time to allow smooth
 * transitions between periods.
 * To do this, we dynamically create or destroy buffers as they are needed.
 * @param {Object} content
 * @param {Observable} clock$ - Emit position information
 * @param {Object} abrManager - Emit bitrate estimation and best Representation
 * to play.
 * @param {Object} sourceBuffersStore - Will be used to lazily create
 * SourceBuffer instances associated with the current content.
 * @param {Object} segmentPipelineCreator - Download segments
 * @param {Object} options
 * @returns {Observable}
 *
 * TODO Special case for image Buffer, where we want data for EVERY active
 * periods.
 */
export default function BufferOrchestrator(content, clock$, abrManager, sourceBuffersStore, segmentPipelineCreator, options) {
    var manifest = content.manifest, initialPeriod = content.initialPeriod;
    var maxBufferAhead$ = options.maxBufferAhead$, maxBufferBehind$ = options.maxBufferBehind$, wantedBufferAhead$ = options.wantedBufferAhead$;
    // Keep track of a unique BufferGarbageCollector created per
    // QueuedSourceBuffer.
    var garbageCollectors = new WeakMapMemory(function (qSourceBuffer) {
        var bufferType = qSourceBuffer.bufferType;
        var defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
            MAXIMUM_MAX_BUFFER_BEHIND[bufferType] :
            Infinity;
        var defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
            MAXIMUM_MAX_BUFFER_AHEAD[bufferType] :
            Infinity;
        return BufferGarbageCollector({
            queuedSourceBuffer: qSourceBuffer,
            clock$: clock$.pipe(map(function (tick) { return tick.currentTime; })),
            maxBufferBehind$: maxBufferBehind$
                .pipe(map(function (val) { return Math.min(val, defaultMaxBehind); })),
            maxBufferAhead$: maxBufferAhead$
                .pipe(map(function (val) { return Math.min(val, defaultMaxAhead); })),
        });
    });
    // trigger warnings when the wanted time is before or after the manifest's
    // segments
    var outOfManifest$ = clock$.pipe(mergeMap(function (_a) {
        var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
        var position = wantedTimeOffset + currentTime;
        if (position < manifest.getMinimumPosition()) {
            var warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", "The current position is behind the " +
                "earliest time announced in the Manifest.");
            return observableOf(EVENTS.warning(warning));
        }
        else if (position > manifest.getMaximumPosition()) {
            var warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST", "The current position is after the latest " +
                "time announced in the Manifest.");
            return observableOf(EVENTS.warning(warning));
        }
        return EMPTY;
    }));
    var bufferTypes = getBufferTypes();
    // Every PeriodBuffers for every possible types
    var buffersArray = bufferTypes.map(function (bufferType) {
        return manageEveryBuffers(bufferType, initialPeriod)
            .pipe(subscribeOn(asapScheduler), share());
    });
    // Emits the activePeriodChanged events every time the active Period changes.
    var activePeriodChanged$ = ActivePeriodEmitter(buffersArray).pipe(filter(function (period) { return period != null; }), map(function (period) {
        log.info("Buffer: New active period", period);
        return EVENTS.activePeriodChanged(period);
    }));
    // Emits an "end-of-stream" event once every PeriodBuffer are complete.
    // Emits a 'resume-stream" when it's not
    var endOfStream$ = areBuffersComplete.apply(void 0, buffersArray).pipe(map(function (areComplete) {
        return areComplete ? EVENTS.endOfStream() : EVENTS.resumeStream();
    }));
    return observableMerge.apply(void 0, __spreadArrays(buffersArray, [activePeriodChanged$,
        endOfStream$,
        outOfManifest$]));
    /**
     * Manage creation and removal of Buffers for every Periods for a given type.
     *
     * Works by creating consecutive buffers through the
     * `manageConsecutivePeriodBuffers` function, and restarting it when the clock
     * goes out of the bounds of these buffers.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @returns {Observable}
     */
    function manageEveryBuffers(bufferType, basePeriod) {
        // Each Period for which there is currently a Buffer, chronologically
        var periodList = new SortedList(function (a, b) { return a.start - b.start; });
        var destroyBuffers$ = new Subject();
        // When set to `true`, all the currently active PeriodBuffer will be destroyed
        // and re-created from the new current position if we detect it to be out of
        // their bounds.
        // This is set to false when we're in the process of creating the first
        // PeriodBuffer, to avoid interferences while no PeriodBuffer is available.
        var enableOutOfBoundsCheck = false;
        /**
         * @param {Object} period
         * @returns {Observable}
         */
        function launchConsecutiveBuffersForPeriod(period) {
            return manageConsecutivePeriodBuffers(bufferType, period, destroyBuffers$).pipe(tap(function (message) {
                if (message.type === "periodBufferReady") {
                    enableOutOfBoundsCheck = true;
                    periodList.add(message.value.period);
                }
                else if (message.type === "periodBufferCleared") {
                    periodList.removeElement(message.value.period);
                }
            }), share());
        }
        /**
         * Returns true if the given time is either:
         *   - less than the start of the chronologically first Period
         *   - more than the end of the chronologically last Period
         * @param {number} time
         * @returns {boolean}
         */
        function isOutOfPeriodList(time) {
            var head = periodList.head();
            var last = periodList.last();
            if (head == null || last == null) { // if no period
                return true;
            }
            return head.start > time ||
                (last.end == null ? Infinity :
                    last.end) < time;
        }
        // Restart the current buffer when the wanted time is in another period
        // than the ones already considered
        var restartBuffersWhenOutOfBounds$ = clock$.pipe(filter(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            return enableOutOfBoundsCheck &&
                manifest.getPeriodForTime(wantedTimeOffset +
                    currentTime) !== undefined &&
                isOutOfPeriodList(wantedTimeOffset + currentTime);
        }), tap(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            log.info("BO: Current position out of the bounds of the active periods," +
                "re-creating buffers.", bufferType, currentTime + wantedTimeOffset);
            enableOutOfBoundsCheck = false;
            destroyBuffers$.next();
        }), mergeMap(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            var newInitialPeriod = manifest
                .getPeriodForTime(currentTime + wantedTimeOffset);
            if (newInitialPeriod == null) {
                throw new MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest.");
            }
            return launchConsecutiveBuffersForPeriod(newInitialPeriod);
        }));
        var handleDecipherabilityUpdate$ = fromEvent(manifest, "decipherabilityUpdate")
            .pipe(mergeMap(function (updates) {
            var queuedSourceBuffer = sourceBuffersStore.get(bufferType);
            var hasType = updates.some(function (update) { return update.adaptation.type === bufferType; });
            if (!hasType || queuedSourceBuffer == null) {
                return EMPTY; // no need to stop the current buffers
            }
            var rangesToClean = getBlacklistedRanges(queuedSourceBuffer, updates);
            enableOutOfBoundsCheck = false;
            destroyBuffers$.next();
            return observableConcat.apply(void 0, __spreadArrays(rangesToClean.map(function (_a) {
                var start = _a.start, end = _a.end;
                return queuedSourceBuffer.removeBuffer(start, end).pipe(ignoreElements());
            }), [clock$.pipe(take(1), mergeMap(function (lastTick) {
                    return observableConcat(observableOf(EVENTS.needsDecipherabilityFlush(lastTick)), observableDefer(function () {
                        var lastPosition = lastTick.currentTime + lastTick.wantedTimeOffset;
                        var newInitialPeriod = manifest.getPeriodForTime(lastPosition);
                        if (newInitialPeriod == null) {
                            throw new MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest.");
                        }
                        return launchConsecutiveBuffersForPeriod(newInitialPeriod);
                    }));
                }))]));
        }));
        return observableMerge(restartBuffersWhenOutOfBounds$, handleDecipherabilityUpdate$, launchConsecutiveBuffersForPeriod(basePeriod));
    }
    /**
     * Create lazily consecutive PeriodBuffers:
     *
     * It first creates the PeriodBuffer for `basePeriod` and - once it becomes
     * full - automatically creates the next chronological one.
     * This process repeats until the PeriodBuffer linked to the last Period is
     * full.
     *
     * If an "old" PeriodBuffer becomes active again, it destroys all PeriodBuffer
     * coming after it (from the last chronological one to the first).
     *
     * To clean-up PeriodBuffers, each one of them are also automatically
     * destroyed once the clock anounce a time superior or equal to the end of
     * the concerned Period.
     *
     * A "periodBufferReady" event is sent each times a new PeriodBuffer is
     * created. The first one (for `basePeriod`) should be sent synchronously on
     * subscription.
     *
     * A "periodBufferCleared" event is sent each times a PeriodBuffer is
     * destroyed.
     * @param {string} bufferType - e.g. "audio" or "video"
     * @param {Period} basePeriod - Initial Period downloaded.
     * @param {Observable} destroy$ - Emit when/if all created Buffers from this
     * point should be destroyed.
     * @returns {Observable}
     */
    function manageConsecutivePeriodBuffers(bufferType, basePeriod, destroy$) {
        log.info("BO: Creating new Buffer for", bufferType, basePeriod);
        // Emits the Period of the next Period Buffer when it can be created.
        var createNextPeriodBuffer$ = new Subject();
        // Emits when the Buffers for the next Periods should be destroyed, if
        // created.
        var destroyNextBuffers$ = new Subject();
        // Emits when the current position goes over the end of the current buffer.
        var endOfCurrentBuffer$ = clock$
            .pipe(filter(function (_a) {
            var currentTime = _a.currentTime, wantedTimeOffset = _a.wantedTimeOffset;
            return basePeriod.end != null &&
                (currentTime + wantedTimeOffset) >= basePeriod.end;
        }));
        // Create Period Buffer for the next Period.
        var nextPeriodBuffer$ = createNextPeriodBuffer$
            .pipe(exhaustMap(function (nextPeriod) {
            return manageConsecutivePeriodBuffers(bufferType, nextPeriod, destroyNextBuffers$);
        }));
        // Allows to destroy each created Buffer, from the newest to the oldest,
        // once destroy$ emits.
        var destroyAll$ = destroy$.pipe(take(1), tap(function () {
            // first complete createNextBuffer$ to allow completion of the
            // nextPeriodBuffer$ observable once every further Buffers have been
            // cleared.
            createNextPeriodBuffer$.complete();
            // emit destruction signal to the next Buffer first
            destroyNextBuffers$.next();
            destroyNextBuffers$.complete(); // we do not need it anymore
        }), share() // share side-effects
        );
        // Will emit when the current buffer should be destroyed.
        var killCurrentBuffer$ = observableMerge(endOfCurrentBuffer$, destroyAll$);
        var periodBuffer$ = PeriodBuffer({ abrManager: abrManager,
            bufferType: bufferType,
            clock$: clock$,
            content: { manifest: manifest, period: basePeriod },
            garbageCollectors: garbageCollectors,
            segmentPipelineCreator: segmentPipelineCreator,
            sourceBuffersStore: sourceBuffersStore,
            options: options,
            wantedBufferAhead$: wantedBufferAhead$, }).pipe(mergeMap(function (evt) {
            var type = evt.type;
            if (type === "full-buffer") {
                var nextPeriod = manifest.getPeriodAfter(basePeriod);
                if (nextPeriod == null) {
                    return observableOf(EVENTS.bufferComplete(bufferType));
                }
                else {
                    // current buffer is full, create the next one if not
                    createNextPeriodBuffer$.next(nextPeriod);
                }
            }
            else if (type === "active-buffer") {
                // current buffer is active, destroy next buffer if created
                destroyNextBuffers$.next();
            }
            return observableOf(evt);
        }), share());
        // Buffer for the current Period.
        var currentBuffer$ = observableConcat(periodBuffer$.pipe(takeUntil(killCurrentBuffer$)), observableOf(EVENTS.periodBufferCleared(bufferType, basePeriod))
            .pipe(tap(function () {
            log.info("BO: Destroying buffer for", bufferType, basePeriod);
        })));
        return observableMerge(currentBuffer$, nextPeriodBuffer$, destroyAll$.pipe(ignoreElements()));
    }
}
