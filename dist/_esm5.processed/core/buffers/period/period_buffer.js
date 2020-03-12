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
import { concat as observableConcat, EMPTY, merge as observableMerge, of as observableOf, ReplaySubject, } from "rxjs";
import { catchError, ignoreElements, map, mapTo, mergeMap, startWith, switchMap, take, } from "rxjs/operators";
import { formatError } from "../../../errors";
import log from "../../../log";
import objectAssign from "../../../utils/object_assign";
import { getLeftSizeOfRange } from "../../../utils/ranges";
import SourceBuffersStore from "../../source_buffers";
import AdaptationBuffer from "../adaptation";
import EVENTS from "../events_generators";
import createEmptyBuffer from "./create_empty_adaptation_buffer";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";
/**
 * Create single PeriodBuffer Observable:
 *   - Lazily create (or reuse) a SourceBuffer for the given type.
 *   - Create a Buffer linked to an Adaptation each time it changes, to
 *     download and append the corresponding Segments in the SourceBuffer.
 *   - Announce when the Buffer is full or is awaiting new Segments through
 *     events
 * @param {Object} args
 * @returns {Observable}
 */
export default function PeriodBuffer(_a) {
    var abrManager = _a.abrManager, bufferType = _a.bufferType, clock$ = _a.clock$, content = _a.content, garbageCollectors = _a.garbageCollectors, segmentPipelineCreator = _a.segmentPipelineCreator, sourceBuffersStore = _a.sourceBuffersStore, options = _a.options, wantedBufferAhead$ = _a.wantedBufferAhead$;
    var period = content.period;
    // Emits the chosen Adaptation for the current type.
    // `null` when no Adaptation is chosen (e.g. no subtitles)
    var adaptation$ = new ReplaySubject(1);
    return adaptation$.pipe(switchMap(function (adaptation) {
        if (adaptation == null) {
            log.info("Buffer: Set no " + bufferType + " Adaptation", period);
            var previousQSourceBuffer = sourceBuffersStore.get(bufferType);
            var cleanBuffer$ = void 0;
            if (previousQSourceBuffer != null) {
                log.info("Buffer: Clearing previous " + bufferType + " SourceBuffer");
                cleanBuffer$ = previousQSourceBuffer
                    .removeBuffer(period.start, period.end == null ? Infinity :
                    period.end);
            }
            else {
                cleanBuffer$ = observableOf(null);
            }
            return observableConcat(cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))), createEmptyBuffer(clock$, wantedBufferAhead$, bufferType, { period: period }));
        }
        log.info("Buffer: Updating " + bufferType + " adaptation", adaptation, period);
        var newBuffer$ = clock$.pipe(take(1), mergeMap(function (tick) {
            var qSourceBuffer = createOrReuseQueuedSourceBuffer(sourceBuffersStore, bufferType, adaptation, options);
            var strategy = getAdaptationSwitchStrategy(qSourceBuffer, period, adaptation, tick);
            if (strategy.type === "needs-reload") {
                return observableOf(EVENTS.needsMediaSourceReload(tick));
            }
            var cleanBuffer$ = strategy.type === "clean-buffer" ?
                observableConcat.apply(void 0, strategy.value.map(function (_a) {
                    var start = _a.start, end = _a.end;
                    return qSourceBuffer.removeBuffer(start, end);
                })).pipe(ignoreElements()) :
                EMPTY;
            var bufferGarbageCollector$ = garbageCollectors.get(qSourceBuffer);
            var adaptationBuffer$ = createAdaptationBuffer(adaptation, qSourceBuffer);
            return observableConcat(cleanBuffer$, observableMerge(adaptationBuffer$, bufferGarbageCollector$));
        }));
        return observableConcat(observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)), newBuffer$);
    }), startWith(EVENTS.periodBufferReady(bufferType, period, adaptation$)));
    /**
     * @param {Object} adaptation
     * @param {Object} qSourceBuffer
     * @returns {Observable}
     */
    function createAdaptationBuffer(adaptation, qSourceBuffer) {
        var manifest = content.manifest;
        var adaptationBufferClock$ = clock$.pipe(map(function (tick) {
            var buffered = qSourceBuffer.getBufferedRanges();
            return objectAssign({}, tick, { bufferGap: getLeftSizeOfRange(buffered, tick.currentTime) });
        }));
        return AdaptationBuffer({ abrManager: abrManager,
            clock$: adaptationBufferClock$,
            content: { manifest: manifest, period: period, adaptation: adaptation },
            options: options,
            queuedSourceBuffer: qSourceBuffer,
            segmentPipelineCreator: segmentPipelineCreator,
            wantedBufferAhead$: wantedBufferAhead$ })
            .pipe(catchError(function (error) {
            // non native buffer should not impact the stability of the
            // player. ie: if a text buffer sends an error, we want to
            // continue playing without any subtitles
            if (!SourceBuffersStore.isNative(bufferType)) {
                log.error("Buffer: Custom " + bufferType + " buffer crashed. Aborting it.", error);
                sourceBuffersStore.disposeSourceBuffer(bufferType);
                var formattedError = formatError(error, {
                    defaultCode: "NONE",
                    defaultReason: "Unknown `AdaptationBuffer` error",
                });
                return observableConcat(observableOf(EVENTS.warning(formattedError)), createEmptyBuffer(clock$, wantedBufferAhead$, bufferType, { period: period }));
            }
            log.error("Buffer: Native " + bufferType + " buffer crashed. Stopping playback.", error);
            throw error;
        }));
    }
}
/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseQueuedSourceBuffer(sourceBuffersStore, bufferType, adaptation, options) {
    var currentQSourceBuffer = sourceBuffersStore.get(bufferType);
    if (currentQSourceBuffer != null) {
        log.info("Buffer: Reusing a previous SourceBuffer for the type", bufferType);
        return currentQSourceBuffer;
    }
    var codec = getFirstDeclaredMimeType(adaptation);
    var sbOptions = bufferType === "text" ? options.textTrackOptions : undefined;
    return sourceBuffersStore.createSourceBuffer(bufferType, codec, sbOptions);
}
/**
 * Get mimetype string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation) {
    var representations = adaptation.representations;
    if (representations[0] == null) {
        return "";
    }
    return representations[0].getMimeTypeString();
}
