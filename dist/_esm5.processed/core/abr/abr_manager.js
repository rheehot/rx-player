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
import { of as observableOf, } from "rxjs";
import log from "../../log";
import takeFirstSet from "../../utils/take_first_set";
import BandwidthEstimator from "./bandwidth_estimator";
import createFilters from "./create_filters";
import RepresentationEstimator from "./representation_estimator";
/**
 * Adaptive BitRate Manager.
 *
 * Select the right Representation from the network and buffer infos it
 * receives.
 * @class ABRManager
 */
var ABRManager = /** @class */ (function () {
    /**
     * @param {Object} options
     */
    function ABRManager(options) {
        this._manualBitrates = options.manualBitrates;
        this._maxAutoBitrates = options.maxAutoBitrates;
        this._initialBitrates = options.initialBitrates;
        this._throttlers = options.throttlers;
        this._bandwidthEstimators = {};
        this._lowLatencyMode = options.lowLatencyMode;
    }
    /**
     * Take type and an array of the available representations, spit out an
     * observable emitting the best representation (given the network/buffer
     * state).
     * @param {string} type
     * @param {Array.<Representation>|undefined} representations
     * @param {Observable<Object>} clock$
     * @param {Observable<Object>} bufferEvents$
     * @returns {Observable}
     */
    ABRManager.prototype.get$ = function (type, representations, clock$, bufferEvents$) {
        if (representations === void 0) { representations = []; }
        var bandwidthEstimator = this._getBandwidthEstimator(type);
        var manualBitrate$ = takeFirstSet(this._manualBitrates[type], observableOf(-1));
        var maxAutoBitrate$ = takeFirstSet(this._maxAutoBitrates[type], observableOf(Infinity));
        var initialBitrate = takeFirstSet(this._initialBitrates[type], 0);
        var filters$ = createFilters(this._throttlers.limitWidth[type], this._throttlers.throttleBitrate[type], this._throttlers.throttle[type]);
        return RepresentationEstimator({ bandwidthEstimator: bandwidthEstimator,
            bufferEvents$: bufferEvents$,
            clock$: clock$,
            filters$: filters$,
            initialBitrate: initialBitrate,
            manualBitrate$: manualBitrate$,
            maxAutoBitrate$: maxAutoBitrate$,
            representations: representations,
            lowLatencyMode: this._lowLatencyMode });
    };
    /**
     * @param {string} bufferType
     * @returns {Object}
     */
    ABRManager.prototype._getBandwidthEstimator = function (bufferType) {
        var originalBandwidthEstimator = this._bandwidthEstimators[bufferType];
        if (originalBandwidthEstimator == null) {
            log.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
            var bandwidthEstimator = new BandwidthEstimator();
            this._bandwidthEstimators[bufferType] = bandwidthEstimator;
            return bandwidthEstimator;
        }
        return originalBandwidthEstimator;
    };
    return ABRManager;
}());
export default ABRManager;
