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
/**
 * This file allows to create AdaptationBuffers.
 *
 * An AdaptationBuffer downloads and push segment for a single Adaptation (e.g.
 * a single audio or text track).
 * It chooses which Representation to download mainly thanks to the
 * ABRManager, and orchestrates the various RepresentationBuffer, which will
 * download and push segments for a single Representation.
 */
import { asapScheduler, concat as observableConcat, defer as observableDefer, merge as observableMerge, of as observableOf, ReplaySubject, Subject, throwError, } from "rxjs";
import { catchError, distinctUntilChanged, filter, ignoreElements, map, multicast, share, startWith, subscribeOn, take, takeUntil, tap, } from "rxjs/operators";
import { formatError, MediaError, } from "../../../errors";
import log from "../../../log";
import concatMapLatest from "../../../utils/concat_map_latest";
import EVENTS from "../events_generators";
import RepresentationBuffer from "../representation";
/**
 * Create new Buffer Observable linked to the given Adaptation.
 *
 * It will rely on the ABRManager to choose at any time the best Representation
 * for this Adaptation and then run the logic to download and push the
 * corresponding segments in the SourceBuffer.
 *
 * It will emit various events to report its status to the caller.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function AdaptationBuffer(_a) {
    var abrManager = _a.abrManager, clock$ = _a.clock$, content = _a.content, options = _a.options, queuedSourceBuffer = _a.queuedSourceBuffer, segmentPipelineCreator = _a.segmentPipelineCreator, wantedBufferAhead$ = _a.wantedBufferAhead$;
    var directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
    var manifest = content.manifest, period = content.period, adaptation = content.adaptation;
    // The buffer goal ratio limits the wanted buffer ahead to determine the
    // buffer goal.
    //
    // It can help in cases such as : the current browser has issues with
    // buffering and tells us that we should try to bufferize less data :
    // https://developers.google.com/web/updates/2017/10/quotaexceedederror
    var bufferGoalRatioMap = {};
    // emit when the current RepresentationBuffer should be stopped right now
    var killCurrentBuffer$ = new Subject();
    // emit when the current RepresentationBuffer should stop making new downloads
    var terminateCurrentBuffer$ = new Subject();
    // use ABRManager for choosing the Representation
    var bufferEvents$ = new Subject();
    var requestsEvents$ = new Subject();
    var abrEvents$ = observableMerge(bufferEvents$, requestsEvents$);
    var decipherableRepresentations = adaptation.representations
        .filter(function (representation) { return representation.decipherable !== false; });
    if (decipherableRepresentations.length <= 0) {
        var noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION", "No Representation in the chosen " +
            "Adaptation can be played");
        return throwError(noRepErr);
    }
    var abr$ = abrManager.get$(adaptation.type, decipherableRepresentations, clock$, abrEvents$)
        .pipe(subscribeOn(asapScheduler), share());
    var segmentFetcher = segmentPipelineCreator.createPipeline(adaptation.type, requestsEvents$);
    // Bitrate higher or equal to this value should not be replaced by segments of
    // better quality.
    // undefined means everything can potentially be replaced
    var knownStableBitrate$ = abr$.pipe(map(function (_a) {
        var knownStableBitrate = _a.knownStableBitrate;
        return knownStableBitrate;
    }), 
    // always emit the last on subscribe
    multicast(function () { return new ReplaySubject(1); }), startWith(undefined), distinctUntilChanged());
    // Emit at each bitrate estimate done by the ABRManager
    var bitrateEstimates$ = abr$.pipe(filter(function (_a) {
        var bitrate = _a.bitrate;
        return bitrate != null;
    }), distinctUntilChanged(function (old, current) { return old.bitrate === current.bitrate; }), map(function (_a) {
        var bitrate = _a.bitrate;
        log.debug("Buffer: new " + adaptation.type + " bitrate estimation", bitrate);
        return EVENTS.bitrateEstimationChange(adaptation.type, bitrate);
    }));
    var newRepresentation$ = abr$
        .pipe(distinctUntilChanged(function (a, b) { return a.manual === b.manual &&
        a.representation.id === b.representation.id; }));
    var adaptationBuffer$ = observableMerge(newRepresentation$
        .pipe(concatMapLatest(function (estimate, i) {
        var representation = estimate.representation;
        // A manual bitrate switch might need an immediate feedback.
        // To do that properly, we need to reload the MediaSource
        if (directManualBitrateSwitching && estimate.manual && i !== 0) {
            return clock$.pipe(take(1), map(function (t) { return EVENTS.needsMediaSourceReload(t); }));
        }
        var representationChange$ = observableOf(EVENTS.representationChange(adaptation.type, period, representation));
        var representationBuffer$ = createRepresentationBuffer(representation)
            .pipe(takeUntil(killCurrentBuffer$));
        return observableConcat(representationChange$, representationBuffer$)
            .pipe(tap(function (evt) {
            if (evt.type === "representationChange" ||
                evt.type === "added-segment") {
                return bufferEvents$.next(evt);
            }
        }));
    })), 
    // NOTE: This operator was put in a merge on purpose. It's a "clever"
    // hack to allow it to be called just *AFTER* the concatMapLatest one.
    newRepresentation$.pipe(map(function (estimation, i) {
        if (i === 0) { // Initial run == no Buffer pending. We have nothing to do:
            return; // The one just created will be launched right away.
        }
        if (estimation.urgent) {
            log.info("Buffer: urgent Representation switch", adaptation.type);
            // Kill current Buffer immediately. The one just chosen take its place.
            killCurrentBuffer$.next();
        }
        else {
            log.info("Buffer: slow Representation switch", adaptation.type);
            // terminate current Buffer. The last chosen Representation at the time
            // it will be finished will take its place.
            terminateCurrentBuffer$.next();
        }
    }), ignoreElements()));
    return observableMerge(adaptationBuffer$, bitrateEstimates$);
    /**
     * Create and returns a new RepresentationBuffer Observable, linked to the
     * given Representation.
     * @param {Representation} representation
     * @returns {Observable}
     */
    function createRepresentationBuffer(representation) {
        return observableDefer(function () {
            var oldBufferGoalRatio = bufferGoalRatioMap[representation.id];
            var bufferGoalRatio = oldBufferGoalRatio != null ? oldBufferGoalRatio :
                1;
            bufferGoalRatioMap[representation.id] = bufferGoalRatio;
            var bufferGoal$ = wantedBufferAhead$.pipe(map(function (wba) { return wba * bufferGoalRatio; }));
            log.info("Buffer: changing representation", adaptation.type, representation);
            return RepresentationBuffer({ clock$: clock$,
                content: { representation: representation,
                    adaptation: adaptation,
                    period: period,
                    manifest: manifest },
                queuedSourceBuffer: queuedSourceBuffer,
                segmentFetcher: segmentFetcher,
                terminate$: terminateCurrentBuffer$,
                bufferGoal$: bufferGoal$,
                knownStableBitrate$: knownStableBitrate$ })
                .pipe(catchError(function (err) {
                var formattedError = formatError(err, {
                    defaultCode: "NONE",
                    defaultReason: "Unknown `RepresentationBuffer` error",
                });
                if (formattedError.code === "BUFFER_FULL_ERROR") {
                    var wantedBufferAhead = wantedBufferAhead$.getValue();
                    var lastBufferGoalRatio = bufferGoalRatio;
                    if (lastBufferGoalRatio <= 0.25 ||
                        wantedBufferAhead * lastBufferGoalRatio <= 2) {
                        throw formattedError;
                    }
                    bufferGoalRatioMap[representation.id] = lastBufferGoalRatio - 0.25;
                    return createRepresentationBuffer(representation);
                }
                throw formattedError;
            }));
        });
    }
}
