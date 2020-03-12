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
 * This file exports various helpers to parse options given to various APIs,
 * throw if something is wrong, and return a normalized option object.
 */
import config from "../../config";
import log from "../../log";
import { normalizeAudioTrack, normalizeTextTrack, } from "../../utils/languages";
import objectAssign from "../../utils/object_assign";
import warnOnce from "../../utils/warn_once";
var DEFAULT_AUTO_PLAY = config.DEFAULT_AUTO_PLAY, DEFAULT_INITIAL_BITRATES = config.DEFAULT_INITIAL_BITRATES, DEFAULT_LIMIT_VIDEO_WIDTH = config.DEFAULT_LIMIT_VIDEO_WIDTH, DEFAULT_MANUAL_BITRATE_SWITCHING_MODE = config.DEFAULT_MANUAL_BITRATE_SWITCHING_MODE, DEFAULT_MAX_BITRATES = config.DEFAULT_MAX_BITRATES, DEFAULT_MAX_BUFFER_AHEAD = config.DEFAULT_MAX_BUFFER_AHEAD, DEFAULT_MAX_BUFFER_BEHIND = config.DEFAULT_MAX_BUFFER_BEHIND, DEFAULT_SHOW_NATIVE_SUBTITLE = config.DEFAULT_SHOW_NATIVE_SUBTITLE, DEFAULT_STOP_AT_END = config.DEFAULT_STOP_AT_END, DEFAULT_TEXT_TRACK_MODE = config.DEFAULT_TEXT_TRACK_MODE, DEFAULT_THROTTLE_WHEN_HIDDEN = config.DEFAULT_THROTTLE_WHEN_HIDDEN, DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN = config.DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN, DEFAULT_WANTED_BUFFER_AHEAD = config.DEFAULT_WANTED_BUFFER_AHEAD;
/**
 * Parse options given to the API constructor and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 * @param {Object|undefined} options
 * @returns {Object}
 */
function parseConstructorOptions(options) {
    var maxBufferAhead;
    var maxBufferBehind;
    var wantedBufferAhead;
    var limitVideoWidth;
    var throttleWhenHidden;
    var throttleVideoBitrateWhenHidden;
    var preferredAudioTracks;
    var preferredTextTracks;
    var videoElement;
    var initialVideoBitrate;
    var initialAudioBitrate;
    var maxAudioBitrate;
    var maxVideoBitrate;
    var stopAtEnd;
    if (options.maxBufferAhead == null) {
        maxBufferAhead = DEFAULT_MAX_BUFFER_AHEAD;
    }
    else {
        maxBufferAhead = Number(options.maxBufferAhead);
        if (isNaN(maxBufferAhead)) {
            throw new Error("Invalid maxBufferAhead parameter. Should be a number.");
        }
    }
    if (options.maxBufferBehind == null) {
        maxBufferBehind = DEFAULT_MAX_BUFFER_BEHIND;
    }
    else {
        maxBufferBehind = Number(options.maxBufferBehind);
        if (isNaN(maxBufferBehind)) {
            throw new Error("Invalid maxBufferBehind parameter. Should be a number.");
        }
    }
    if (options.wantedBufferAhead == null) {
        wantedBufferAhead = DEFAULT_WANTED_BUFFER_AHEAD;
    }
    else {
        wantedBufferAhead = Number(options.wantedBufferAhead);
        if (isNaN(wantedBufferAhead)) {
            /* tslint:disable:max-line-length */
            throw new Error("Invalid wantedBufferAhead parameter. Should be a number.");
            /* tslint:enable:max-line-length */
        }
    }
    limitVideoWidth = options.limitVideoWidth == null ? DEFAULT_LIMIT_VIDEO_WIDTH :
        !!options.limitVideoWidth;
    if (options.throttleWhenHidden != null) {
        warnOnce("`throttleWhenHidden` API is deprecated. Consider using " +
            "`throttleVideoBitrateWhenHidden` instead.");
        throttleWhenHidden = !!options.throttleWhenHidden;
    }
    else {
        throttleWhenHidden = DEFAULT_THROTTLE_WHEN_HIDDEN;
    }
    // `throttleWhenHidden` and `throttleVideoBitrateWhenHidden` can be in conflict
    // Do not activate the latter if the former is
    if (throttleWhenHidden) {
        throttleVideoBitrateWhenHidden = false;
    }
    else {
        throttleVideoBitrateWhenHidden = options.throttleVideoBitrateWhenHidden == null ?
            DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN :
            !!options.throttleVideoBitrateWhenHidden;
    }
    if (options.preferredTextTracks !== undefined) {
        if (!Array.isArray(options.preferredTextTracks)) {
            warnOnce("Invalid `preferredTextTracks` option, it should be an Array");
            preferredTextTracks = [];
        }
        else {
            preferredTextTracks = options.preferredTextTracks;
        }
    }
    else {
        preferredTextTracks = [];
    }
    if (options.preferredAudioTracks !== undefined) {
        if (!Array.isArray(options.preferredAudioTracks)) {
            warnOnce("Invalid `preferredAudioTracks` option, it should be an Array");
            preferredAudioTracks = [];
        }
        else {
            preferredAudioTracks = options.preferredAudioTracks;
        }
    }
    else {
        preferredAudioTracks = [];
    }
    if (options.videoElement == null) {
        videoElement = document.createElement("video");
    }
    else if (options.videoElement instanceof HTMLMediaElement) {
        videoElement = options.videoElement;
    }
    else {
        /* tslint:disable:max-line-length */
        throw new Error("Invalid videoElement parameter. Should be a HTMLMediaElement.");
        /* tslint:enable:max-line-length */
    }
    if (options.initialVideoBitrate == null) {
        initialVideoBitrate = DEFAULT_INITIAL_BITRATES.video;
    }
    else {
        initialVideoBitrate = Number(options.initialVideoBitrate);
        if (isNaN(initialVideoBitrate)) {
            /* tslint:disable:max-line-length */
            throw new Error("Invalid initialVideoBitrate parameter. Should be a number.");
            /* tslint:enable:max-line-length */
        }
    }
    if (options.initialAudioBitrate == null) {
        initialAudioBitrate = DEFAULT_INITIAL_BITRATES.audio;
    }
    else {
        initialAudioBitrate = Number(options.initialAudioBitrate);
        if (isNaN(initialAudioBitrate)) {
            /* tslint:disable:max-line-length */
            throw new Error("Invalid initialAudioBitrate parameter. Should be a number.");
            /* tslint:enable:max-line-length */
        }
    }
    if (options.maxVideoBitrate == null) {
        maxVideoBitrate = DEFAULT_MAX_BITRATES.video;
    }
    else {
        maxVideoBitrate = Number(options.maxVideoBitrate);
        if (isNaN(maxVideoBitrate)) {
            throw new Error("Invalid maxVideoBitrate parameter. Should be a number.");
        }
    }
    if (options.maxAudioBitrate == null) {
        maxAudioBitrate = DEFAULT_MAX_BITRATES.audio;
    }
    else {
        maxAudioBitrate = Number(options.maxAudioBitrate);
        if (isNaN(maxAudioBitrate)) {
            throw new Error("Invalid maxAudioBitrate parameter. Should be a number.");
        }
    }
    stopAtEnd = options.stopAtEnd == null ? DEFAULT_STOP_AT_END :
        !!options.stopAtEnd;
    return { maxBufferAhead: maxBufferAhead,
        maxBufferBehind: maxBufferBehind,
        limitVideoWidth: limitVideoWidth,
        videoElement: videoElement,
        wantedBufferAhead: wantedBufferAhead,
        throttleWhenHidden: throttleWhenHidden,
        throttleVideoBitrateWhenHidden: throttleVideoBitrateWhenHidden,
        preferredAudioTracks: preferredAudioTracks,
        preferredTextTracks: preferredTextTracks,
        initialAudioBitrate: initialAudioBitrate,
        initialVideoBitrate: initialVideoBitrate,
        maxAudioBitrate: maxAudioBitrate,
        maxVideoBitrate: maxVideoBitrate,
        stopAtEnd: stopAtEnd };
}
/**
 * Parse options given to loadVideo and set default options as found
 * in the config.
 *
 * Do not mutate anything, only cross the given options and sane default options
 * (most coming from the config).
 *
 * Throws if any mandatory option is not set.
 * @param {Object|undefined} options
 * @param {Object} ctx - The player context, needed for some default values.
 * @returns {Object}
 */
function parseLoadVideoOptions(options) {
    var _a, _b, _c;
    var url;
    var transport;
    var keySystems;
    var textTrackMode;
    var textTrackElement;
    var startAt;
    if (options == null) {
        throw new Error("No option set on loadVideo");
    }
    if (options.url != null) {
        url = String(options.url);
    }
    else if (options.transportOptions == null ||
        options.transportOptions.manifestLoader == null) {
        throw new Error("No url set on loadVideo");
    }
    if (options.transport == null) {
        throw new Error("No transport set on loadVideo");
    }
    else {
        transport = String(options.transport);
    }
    var autoPlay = options.autoPlay == null ? DEFAULT_AUTO_PLAY :
        !!options.autoPlay;
    if (options.keySystems == null) {
        keySystems = [];
    }
    else {
        keySystems = Array.isArray(options.keySystems) ? options.keySystems :
            [options.keySystems];
        for (var _i = 0, keySystems_1 = keySystems; _i < keySystems_1.length; _i++) {
            var keySystem = keySystems_1[_i];
            if (typeof keySystem.type !== "string" ||
                typeof keySystem.getLicense !== "function") {
                throw new Error("Invalid key system given: Missing type string or " +
                    "getLicense callback");
            }
        }
    }
    var lowLatencyMode = options.lowLatencyMode === undefined ?
        false :
        !!options.lowLatencyMode;
    var transportOptsArg = typeof options.transportOptions === "object" &&
        options.transportOptions !== null ?
        options.transportOptions :
        {};
    var transportOptions = {
        aggressiveMode: transportOptsArg.aggressiveMode,
        checkMediaSegmentIntegrity: transportOptsArg.checkMediaSegmentIntegrity,
        lowLatencyMode: lowLatencyMode,
        manifestLoader: transportOptsArg.manifestLoader,
        referenceDateTime: transportOptsArg.referenceDateTime,
        representationFilter: transportOptsArg.representationFilter,
        segmentLoader: transportOptsArg.segmentLoader,
        serverSyncInfos: transportOptsArg.serverSyncInfos,
        supplementaryImageTracks: [],
        supplementaryTextTracks: [],
    };
    if (options.supplementaryTextTracks !== undefined) {
        warnOnce("The `supplementaryTextTracks` loadVideo option is deprecated.\n" +
            "Please use the `TextTrackRenderer` tool instead.");
        var supplementaryTextTracks = Array.isArray(options.supplementaryTextTracks) ?
            options.supplementaryTextTracks : [options.supplementaryTextTracks];
        for (var _d = 0, supplementaryTextTracks_1 = supplementaryTextTracks; _d < supplementaryTextTracks_1.length; _d++) {
            var supplementaryTextTrack = supplementaryTextTracks_1[_d];
            if (typeof supplementaryTextTrack.language !== "string" ||
                typeof supplementaryTextTrack.mimeType !== "string" ||
                typeof supplementaryTextTrack.url !== "string") {
                throw new Error("Invalid supplementary text track given. " +
                    "Missing either language, mimetype or url");
            }
        }
        transportOptions.supplementaryTextTracks = supplementaryTextTracks;
    }
    if (options.supplementaryImageTracks !== undefined) {
        warnOnce("The `supplementaryImageTracks` loadVideo option is deprecated.\n" +
            "Please use the `parseBifThumbnails` tool instead.");
        var supplementaryImageTracks = Array.isArray(options.supplementaryImageTracks) ?
            options.supplementaryImageTracks : [options.supplementaryImageTracks];
        for (var _e = 0, supplementaryImageTracks_1 = supplementaryImageTracks; _e < supplementaryImageTracks_1.length; _e++) {
            var supplementaryImageTrack = supplementaryImageTracks_1[_e];
            if (typeof supplementaryImageTrack.mimeType !== "string" ||
                typeof supplementaryImageTrack.url !== "string") {
                throw new Error("Invalid supplementary image track given. " +
                    "Missing either mimetype or url");
            }
        }
        transportOptions.supplementaryImageTracks = supplementaryImageTracks;
    }
    if (options.textTrackMode == null) {
        textTrackMode = DEFAULT_TEXT_TRACK_MODE;
    }
    else {
        if (options.textTrackMode !== "native" && options.textTrackMode !== "html") {
            throw new Error("Invalid textTrackMode.");
        }
        textTrackMode = options.textTrackMode;
    }
    if (options.defaultAudioTrack != null) {
        warnOnce("The `defaultAudioTrack` loadVideo option is deprecated.\n" +
            "Please use the `preferredAudioTracks` constructor option or the" +
            "`setPreferredAudioTracks` method instead");
    }
    var defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);
    if (options.defaultTextTrack != null) {
        warnOnce("The `defaultTextTrack` loadVideo option is deprecated.\n" +
            "Please use the `preferredTextTracks` constructor option or the" +
            "`setPreferredTextTracks` method instead");
    }
    var defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);
    var hideNativeSubtitle = !DEFAULT_SHOW_NATIVE_SUBTITLE;
    if (options.hideNativeSubtitle != null) {
        warnOnce("The `hideNativeSubtitle` loadVideo option is deprecated");
        hideNativeSubtitle = !!options.hideNativeSubtitle;
    }
    var manualBitrateSwitchingMode = options.manualBitrateSwitchingMode == null ?
        DEFAULT_MANUAL_BITRATE_SWITCHING_MODE :
        options.manualBitrateSwitchingMode;
    if (textTrackMode === "html") {
        // TODO Better way to express that in TypeScript?
        if (options.textTrackElement == null) {
            throw new Error("You have to provide a textTrackElement " +
                "in \"html\" textTrackMode.");
        }
        else if (!(options.textTrackElement instanceof HTMLElement)) {
            throw new Error("textTrackElement should be an HTMLElement.");
        }
        else {
            textTrackElement = options.textTrackElement;
        }
    }
    else if (options.textTrackElement != null) {
        log.warn("API: You have set a textTrackElement without being in " +
            "an \"html\" textTrackMode. It will be ignored.");
    }
    if (options.startAt != null) {
        // TODO Better way to express that in TypeScript?
        if (options.startAt.wallClockTime
            instanceof Date) {
            var wallClockTime = options.startAt
                .wallClockTime.getTime() / 1000;
            startAt = objectAssign({}, options.startAt, { wallClockTime: wallClockTime });
        }
        else {
            startAt = options.startAt;
        }
    }
    var manifestUpdateUrl = (_a = options.transportOptions) === null || _a === void 0 ? void 0 : _a.manifestUpdateUrl;
    var minimumManifestUpdateInterval = (_c = (_b = options.transportOptions) === null || _b === void 0 ? void 0 : _b.minimumManifestUpdateInterval) !== null && _c !== void 0 ? _c : 0;
    var networkConfig = options.networkConfig == null ?
        {} :
        { manifestRetry: options.networkConfig.manifestRetry,
            offlineRetry: options.networkConfig.offlineRetry,
            segmentRetry: options.networkConfig.segmentRetry };
    // TODO without cast
    /* tslint:disable no-object-literal-type-assertion */
    return { autoPlay: autoPlay,
        defaultAudioTrack: defaultAudioTrack,
        defaultTextTrack: defaultTextTrack,
        hideNativeSubtitle: hideNativeSubtitle,
        keySystems: keySystems,
        lowLatencyMode: lowLatencyMode,
        manualBitrateSwitchingMode: manualBitrateSwitchingMode,
        manifestUpdateUrl: manifestUpdateUrl,
        minimumManifestUpdateInterval: minimumManifestUpdateInterval,
        networkConfig: networkConfig,
        startAt: startAt,
        textTrackElement: textTrackElement,
        textTrackMode: textTrackMode,
        transport: transport,
        transportOptions: transportOptions,
        url: url };
    /* tslint:enable no-object-literal-type-assertion */
}
export { parseConstructorOptions, parseLoadVideoOptions, };
