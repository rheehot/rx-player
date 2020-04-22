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
var EVENTS = {
    activeBuffer: function (bufferType) {
        return { type: "active-buffer",
            value: { bufferType: bufferType } };
    },
    activePeriodChanged: function (period) {
        return { type: "activePeriodChanged",
            value: { period: period } };
    },
    adaptationChange: function (bufferType, adaptation, period) {
        return { type: "adaptationChange",
            value: { type: bufferType,
                adaptation: adaptation,
                period: period } };
    },
    addedSegment: function (content, segment, buffered, segmentData) {
        return { type: "added-segment",
            value: { content: content,
                segment: segment,
                segmentData: segmentData,
                buffered: buffered } };
    },
    bitrateEstimationChange: function (type, bitrate) {
        return { type: "bitrateEstimationChange",
            value: { type: type, bitrate: bitrate } };
    },
    bufferComplete: function (bufferType) {
        return { type: "complete-buffer",
            value: { type: bufferType } };
    },
    discontinuityEncountered: function (gap, bufferType) {
        return { type: "discontinuity-encountered",
            value: { bufferType: bufferType, gap: gap } };
    },
    endOfStream: function () {
        return { type: "end-of-stream",
            value: undefined };
    },
    fullBuffer: function (bufferType) {
        return { type: "full-buffer",
            value: { bufferType: bufferType } };
    },
    needsManifestRefresh: function () {
        return { type: "needs-manifest-refresh",
            value: undefined };
    },
    manifestMightBeOufOfSync: function () {
        return { type: "manifest-might-be-out-of-sync",
            value: undefined };
    },
    needsMediaSourceReload: function (period, _a) {
        var currentTime = _a.currentTime, isPaused = _a.isPaused;
        return { type: "needs-media-source-reload",
            value: { currentTime: currentTime, isPaused: isPaused, period: period } };
    },
    needsDecipherabilityFlush: function (_a) {
        var currentTime = _a.currentTime, isPaused = _a.isPaused, duration = _a.duration;
        return { type: "needs-decipherability-flush",
            value: { currentTime: currentTime, isPaused: isPaused, duration: duration } };
    },
    periodBufferReady: function (type, period, adaptation$) {
        return { type: "periodBufferReady",
            value: { type: type, period: period, adaptation$: adaptation$ } };
    },
    periodBufferCleared: function (type, period) {
        return { type: "periodBufferCleared",
            value: { type: type, period: period } };
    },
    protectedSegment: function (initDataInfo) {
        return { type: "protected-segment",
            value: initDataInfo };
    },
    representationChange: function (type, period, representation) {
        return { type: "representationChange",
            value: { type: type, period: period, representation: representation } };
    },
    resumeStream: function () {
        return { type: "resume-stream",
            value: undefined };
    },
    warning: function (value) {
        return { type: "warning", value: value };
    },
};
export default EVENTS;
