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
import config from "../../config";
import log from "../../log";
import arrayFind from "../../utils/array_find";
import EWMA from "./ewma";
var ABR_REGULAR_FACTOR = config.ABR_REGULAR_FACTOR, ABR_STARVATION_DURATION_DELTA = config.ABR_STARVATION_DURATION_DELTA, ABR_STARVATION_FACTOR = config.ABR_STARVATION_FACTOR, ABR_STARVATION_GAP = config.ABR_STARVATION_GAP, OUT_OF_STARVATION_GAP = config.OUT_OF_STARVATION_GAP;
/**
 * Get the pending request starting with the asked segment position.
 * @param {Object} requests
 * @param {number} position
 * @returns {IRequestInfo|undefined}
 */
function getConcernedRequest(requests, neededPosition) {
    for (var i = 0; i < requests.length; i++) {
        var request = requests[i];
        if (request.duration > 0) {
            var segmentEnd = request.time + request.duration;
            if (segmentEnd > neededPosition && neededPosition - request.time > -0.3) {
                return request;
            }
        }
    }
}
/**
 * Estimate the __VERY__ recent bandwidth based on a single unfinished request.
 * Useful when the current bandwidth seemed to have fallen quickly.
 *
 * @param {Object} request
 * @returns {number|undefined}
 */
function estimateRequestBandwidth(request) {
    if (request.progress.length < 2) {
        return undefined;
    }
    // try to infer quickly the current bitrate based on the
    // progress events
    var ewma1 = new EWMA(2);
    var progress = request.progress;
    for (var i = 1; i < progress.length; i++) {
        var bytesDownloaded = progress[i].size - progress[i - 1].size;
        var timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
        var reqBitrate = (bytesDownloaded * 8) / (timeElapsed / 1000);
        ewma1.addSample(timeElapsed / 1000, reqBitrate);
    }
    return ewma1.getEstimate();
}
/**
 * Estimate remaining time for a pending request from a progress event.
 * @param {Object} lastProgressEvent
 * @param {number} bandwidthEstimate
 * @returns {number}
 */
function estimateRemainingTime(lastProgressEvent, bandwidthEstimate) {
    var remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
    return Math.max(remainingData / bandwidthEstimate, 0);
}
/**
 * Check if the request for the most needed segment is too slow.
 * If that's the case, re-calculate the bandwidth urgently based on
 * this single request.
 * @param {Object} pendingRequests - Current pending requests.
 * @param {Object} clock - Information on the current playback.
 * @param {Number} lastEstimatedBitrate - Last bitrate estimation emitted.
 * @returns {Number|undefined}
 */
function estimateStarvationModeBitrate(pendingRequests, clock, currentRepresentation, lastEstimatedBitrate) {
    var nextNeededPosition = clock.currentTime + clock.bufferGap;
    var concernedRequest = getConcernedRequest(pendingRequests, nextNeededPosition);
    if (concernedRequest === undefined) {
        return undefined;
    }
    var chunkDuration = concernedRequest.duration;
    var now = performance.now();
    var lastProgressEvent = concernedRequest.progress.length > 0 ?
        concernedRequest.progress[concernedRequest.progress.length - 1] :
        null;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
    if (lastProgressEvent != null && bandwidthEstimate != null) {
        var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate) * 1.2;
        // if this remaining time is reliable and is not enough to avoid buffering
        if ((now - lastProgressEvent.timestamp) / 1000 <= remainingTime &&
            remainingTime > (clock.bufferGap / clock.speed)) {
            return bandwidthEstimate;
        }
    }
    var requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1000;
    var reasonableElapsedTime = requestElapsedTime <=
        ((chunkDuration * 1.5 + 1) / clock.speed);
    if (currentRepresentation == null || reasonableElapsedTime) {
        return undefined;
    }
    // calculate a reduced bitrate from the current one
    var factor = chunkDuration / requestElapsedTime;
    var reducedBitrate = currentRepresentation.bitrate * Math.min(0.7, factor);
    if (lastEstimatedBitrate == null || reducedBitrate < lastEstimatedBitrate) {
        return reducedBitrate;
    }
}
/**
 * Returns true if, based on the current requests, it seems that the ABR should
 * switch immediately if a lower bitrate is more adapted.
 * Returns false if it estimates that you have time before switching to a lower
 * bitrate.
 * @param {Object} clock
 * @param {Object} requests - Every requests pending, in a chronological
 * order in terms of segment time.
 * @returns {boolean}
 */
function shouldDirectlySwitchToLowBitrate(clock, requests, abrStarvationGap) {
    var nextNeededPosition = clock.currentTime + clock.bufferGap;
    var nextNeededRequest = arrayFind(requests, function (r) {
        return (r.time + r.duration) > nextNeededPosition;
    });
    if (nextNeededRequest === undefined) {
        return true;
    }
    var now = performance.now();
    var lastProgressEvent = nextNeededRequest.progress.length > 0 ?
        nextNeededRequest.progress[nextNeededRequest.progress.length - 1] :
        null;
    // first, try to do a quick estimate from progress events
    var bandwidthEstimate = estimateRequestBandwidth(nextNeededRequest);
    if (lastProgressEvent == null || bandwidthEstimate == null) {
        return true;
    }
    var remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
    if ((now - lastProgressEvent.timestamp) / 1000 <= (remainingTime * 1.2) &&
        remainingTime < ((clock.bufferGap / clock.speed) + abrStarvationGap)) {
        return false;
    }
    return true;
}
/**
 * Analyze the current network conditions and give a bandwidth estimate as well
 * as a maximum bitrate a Representation should be.
 * @class NetworkAnalyzer
 */
var NetworkAnalyzer = /** @class */ (function () {
    function NetworkAnalyzer(initialBitrate, lowLatencyMode) {
        this._initialBitrate = initialBitrate;
        this._inStarvationMode = false;
        if (lowLatencyMode) {
            this._config = { starvationGap: ABR_STARVATION_GAP.LOW_LATENCY,
                outOfStarvationGap: OUT_OF_STARVATION_GAP.LOW_LATENCY,
                starvationBitrateFactor: ABR_STARVATION_FACTOR.LOW_LATENCY,
                regularBitrateFactor: ABR_REGULAR_FACTOR.LOW_LATENCY };
        }
        else {
            this._config = { starvationGap: ABR_STARVATION_GAP.DEFAULT,
                outOfStarvationGap: OUT_OF_STARVATION_GAP.DEFAULT,
                starvationBitrateFactor: ABR_STARVATION_FACTOR.DEFAULT,
                regularBitrateFactor: ABR_REGULAR_FACTOR.DEFAULT };
        }
    }
    NetworkAnalyzer.prototype.getBandwidthEstimate = function (clockTick, bandwidthEstimator, currentRepresentation, currentRequests, lastEstimatedBitrate) {
        var newBitrateCeil; // bitrate ceil for the chosen Representation
        var bandwidthEstimate;
        var localConf = this._config;
        var bufferGap = clockTick.bufferGap, currentTime = clockTick.currentTime, duration = clockTick.duration;
        // check if should get in/out of starvation mode
        if (isNaN(duration) ||
            bufferGap + currentTime < duration - ABR_STARVATION_DURATION_DELTA) {
            if (!this._inStarvationMode && bufferGap <= localConf.starvationGap) {
                log.info("ABR: enter starvation mode.");
                this._inStarvationMode = true;
            }
            else if (this._inStarvationMode && bufferGap >= localConf.outOfStarvationGap) {
                log.info("ABR: exit starvation mode.");
                this._inStarvationMode = false;
            }
        }
        else if (this._inStarvationMode) {
            log.info("ABR: exit starvation mode.");
            this._inStarvationMode = false;
        }
        // If in starvation mode, check if a quick new estimate can be done
        // from the last requests.
        // If so, cancel previous estimations and replace it by the new one
        if (this._inStarvationMode) {
            bandwidthEstimate = estimateStarvationModeBitrate(currentRequests, clockTick, currentRepresentation, lastEstimatedBitrate);
            if (bandwidthEstimate != null) {
                log.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
                bandwidthEstimator.reset();
                newBitrateCeil = currentRepresentation == null ?
                    bandwidthEstimate :
                    Math.min(bandwidthEstimate, currentRepresentation.bitrate);
            }
        }
        // if newBitrateCeil is not yet defined, do the normal estimation
        if (newBitrateCeil == null) {
            bandwidthEstimate = bandwidthEstimator.getEstimate();
            if (bandwidthEstimate != null) {
                newBitrateCeil = bandwidthEstimate *
                    (this._inStarvationMode ? localConf.starvationBitrateFactor :
                        localConf.regularBitrateFactor);
            }
            else if (lastEstimatedBitrate != null) {
                newBitrateCeil = lastEstimatedBitrate *
                    (this._inStarvationMode ? localConf.starvationBitrateFactor :
                        localConf.regularBitrateFactor);
            }
            else {
                newBitrateCeil = this._initialBitrate;
            }
        }
        if (clockTick.speed > 1) {
            newBitrateCeil /= clockTick.speed;
        }
        return { bandwidthEstimate: bandwidthEstimate, bitrateChosen: newBitrateCeil };
    };
    /**
     * For a given wanted bitrate, tells if should switch urgently.
     * @param {number} bitrate
     * @param {Object} clockTick
     * @returns {boolean}
     */
    NetworkAnalyzer.prototype.isUrgent = function (bitrate, currentRepresentation, currentRequests, clockTick) {
        if (currentRepresentation == null) {
            return true;
        }
        else if (bitrate === currentRepresentation.bitrate) {
            return false;
        }
        else if (bitrate > currentRepresentation.bitrate) {
            return !this._inStarvationMode;
        }
        return shouldDirectlySwitchToLowBitrate(clockTick, currentRequests, this._config.starvationGap);
    };
    return NetworkAnalyzer;
}());
export default NetworkAnalyzer;
