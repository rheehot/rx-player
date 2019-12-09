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
import { combineLatest as observableCombineLatest, defer as observableDefer, merge as observableMerge, of as observableOf, } from "rxjs";
import { filter, ignoreElements, map, startWith, switchMap, tap, withLatestFrom, } from "rxjs/operators";
import log from "../../log";
import { getLeftSizeOfRange } from "../../utils/ranges";
import BufferBasedChooser from "./buffer_based_chooser";
import filterByBitrate from "./filter_by_bitrate";
import filterByWidth from "./filter_by_width";
import fromBitrateCeil from "./from_bitrate_ceil";
import NetworkAnalyzer from "./network_analyzer";
import PendingRequestsStore from "./pending_requests_store";
import RepresentationScoreCalculator from "./representation_score_calculator";
/**
 * Filter representations given through filters options.
 * @param {Array.<Representation>} representations
 * @param {Object} filters - Filter Object.
 * _Can_ contain each of the following properties:
 *   - bitrate {Number} - max bitrate authorized (included).
 *   - width {Number} - max width authorized (included).
 * @returns {Array.<Representation>}
 */
function getFilteredRepresentations(representations, filters) {
    var _representations = representations;
    if (filters.bitrate != null) {
        _representations = filterByBitrate(_representations, filters.bitrate);
    }
    if (filters.width != null) {
        _representations = filterByWidth(_representations, filters.width);
    }
    return _representations;
}
/**
 * Emit the estimated bitrate and best Representation according to the current
 * network and buffer situation.
 * @param {Object} args
 * @returns {Observable}
 */
export default function RepresentationEstimator(_a) {
    var bandwidthEstimator = _a.bandwidthEstimator, bufferEvents$ = _a.bufferEvents$, clock$ = _a.clock$, filters$ = _a.filters$, initialBitrate = _a.initialBitrate, lowLatencyMode = _a.lowLatencyMode, manualBitrate$ = _a.manualBitrate$, maxAutoBitrate$ = _a.maxAutoBitrate$, representations = _a.representations;
    var scoreCalculator = new RepresentationScoreCalculator();
    var networkAnalyzer = new NetworkAnalyzer(initialBitrate == null ? 0 :
        initialBitrate, lowLatencyMode);
    var requestsStore = new PendingRequestsStore();
    /**
     * Callback to call when new metrics arrive.
     * @param {Object} value
     */
    function onMetric(value) {
        var duration = value.duration, size = value.size, content = value.content;
        // calculate bandwidth
        bandwidthEstimator.addSample(duration, size);
        // calculate "maintainability score"
        var segment = content.segment;
        if (segment.duration == null) {
            return;
        }
        var requestDuration = duration / 1000;
        var segmentDuration = segment.duration / segment.timescale;
        var representation = content.representation;
        scoreCalculator.addSample(representation, requestDuration, segmentDuration);
    }
    var metrics$ = bufferEvents$.pipe(filter(function (e) { return e.type === "metrics"; }), tap(function (_a) {
        var value = _a.value;
        return onMetric(value);
    }), ignoreElements());
    var requests$ = bufferEvents$.pipe(tap(function (evt) {
        switch (evt.type) {
            case "requestBegin":
                requestsStore.add(evt.value);
                break;
            case "requestEnd":
                requestsStore.remove(evt.value.id);
                break;
            case "progress":
                requestsStore.addProgress(evt.value);
                break;
        }
    }), ignoreElements());
    var currentRepresentation$ = bufferEvents$.pipe(filter(function (e) { return e.type === "representationChange"; }), map(function (e) { return e.value.representation; }), startWith(null));
    var estimate$ = observableDefer(function () {
        if (representations.length === 0) {
            throw new Error("ABRManager: no representation choice given");
        }
        if (representations.length === 1) {
            return observableOf({ bitrate: undefined,
                representation: representations[0],
                manual: false,
                urgent: true,
                knownStableBitrate: undefined });
        }
        return manualBitrate$.pipe(switchMap(function (manualBitrate) {
            if (manualBitrate >= 0) {
                // -- MANUAL mode --
                var manualRepresentation = (function () {
                    var fromBitrate = fromBitrateCeil(representations, manualBitrate);
                    if (fromBitrate !== undefined) {
                        return fromBitrate;
                    }
                    return representations[0];
                })();
                return observableOf({
                    representation: manualRepresentation,
                    bitrate: undefined,
                    knownStableBitrate: undefined,
                    manual: true,
                    urgent: true,
                });
            }
            // -- AUTO mode --
            var lastEstimatedBitrate;
            var forceBandwidthMode = true;
            // Emit each time a buffer-based estimation should be actualized (each
            // time a segment is added).
            var bufferBasedClock$ = bufferEvents$.pipe(filter(function (e) { return e.type === "added-segment"; }), withLatestFrom(clock$), map(function (_a) {
                var evtValue = _a[0].value, _b = _a[1], speed = _b.speed, currentTime = _b.currentTime;
                var timeRanges = evtValue.buffered;
                var bufferGap = getLeftSizeOfRange(timeRanges, currentTime);
                var representation = evtValue.content.representation;
                var currentScore = scoreCalculator.getEstimate(representation);
                var currentBitrate = representation.bitrate;
                return { bufferGap: bufferGap, currentBitrate: currentBitrate, currentScore: currentScore, speed: speed };
            }));
            var bitrates = representations.map(function (r) { return r.bitrate; });
            var bufferBasedEstimation$ = BufferBasedChooser(bufferBasedClock$, bitrates)
                .pipe(startWith(undefined));
            return observableCombineLatest([clock$,
                maxAutoBitrate$,
                filters$,
                bufferBasedEstimation$]).pipe(withLatestFrom(currentRepresentation$), map(function (_a) {
                var _b = _a[0], clock = _b[0], maxAutoBitrate = _b[1], filters = _b[2], bufferBasedBitrate = _b[3], currentRepresentation = _a[1];
                var _representations = getFilteredRepresentations(representations, filters);
                var requests = requestsStore.getRequests();
                var _c = networkAnalyzer
                    .getBandwidthEstimate(clock, bandwidthEstimator, currentRepresentation, requests, lastEstimatedBitrate), bandwidthEstimate = _c.bandwidthEstimate, bitrateChosen = _c.bitrateChosen;
                lastEstimatedBitrate = bandwidthEstimate;
                var stableRepresentation = scoreCalculator.getLastStableRepresentation();
                var knownStableBitrate = stableRepresentation == null ?
                    undefined :
                    stableRepresentation.bitrate / (clock.speed > 0 ? clock.speed : 1);
                var bufferGap = clock.bufferGap;
                if (!forceBandwidthMode && bufferGap <= 5) {
                    forceBandwidthMode = true;
                }
                else if (forceBandwidthMode &&
                    Number.isFinite(bufferGap) && bufferGap > 10) {
                    forceBandwidthMode = false;
                }
                var chosenRepFromBandwidth = (function () {
                    var fromBitrate = fromBitrateCeil(_representations, Math.min(bitrateChosen, maxAutoBitrate));
                    if (fromBitrate !== undefined) {
                        return fromBitrate;
                    }
                    if (_representations.length > 0) {
                        return _representations[0];
                    }
                    return representations[0];
                })();
                if (forceBandwidthMode) {
                    log.debug("ABR: Choosing representation with bandwith estimation.", chosenRepFromBandwidth);
                    return { bitrate: bandwidthEstimate,
                        representation: chosenRepFromBandwidth,
                        urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate, currentRepresentation, requests, clock),
                        manual: false,
                        knownStableBitrate: knownStableBitrate };
                }
                if (bufferBasedBitrate == null ||
                    chosenRepFromBandwidth.bitrate >= bufferBasedBitrate) {
                    log.debug("ABR: Choosing representation with bandwith estimation.", chosenRepFromBandwidth);
                    return { bitrate: bandwidthEstimate,
                        representation: chosenRepFromBandwidth,
                        urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate, currentRepresentation, requests, clock),
                        manual: false,
                        knownStableBitrate: knownStableBitrate, };
                }
                var limitedBitrate = Math.min(bufferBasedBitrate, maxAutoBitrate);
                var chosenRepresentation = (function () {
                    var fromBitrate = fromBitrateCeil(_representations, limitedBitrate);
                    if (fromBitrate !== undefined) {
                        return fromBitrate;
                    }
                    if (_representations.length > 0) {
                        return _representations[0];
                    }
                    return representations[0];
                })();
                if (bufferBasedBitrate <= maxAutoBitrate) {
                    log.debug("ABR: Choosing representation with buffer based bitrate ceiling.", chosenRepresentation);
                }
                return { bitrate: bandwidthEstimate,
                    representation: chosenRepresentation,
                    urgent: networkAnalyzer.isUrgent(bufferBasedBitrate, currentRepresentation, requests, clock),
                    manual: false,
                    knownStableBitrate: knownStableBitrate, };
            }));
        }));
    });
    return observableMerge(metrics$, requests$, estimate$);
}
