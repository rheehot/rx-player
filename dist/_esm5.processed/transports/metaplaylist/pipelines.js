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
import { combineLatest, of as observableOf, } from "rxjs";
import { filter, map, mergeMap, } from "rxjs/operators";
import features from "../../features";
import Manifest from "../../manifest";
import parseMetaPlaylist from "../../parsers/manifest/metaplaylist";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import generateManifestLoader from "./manifest_loader";
/**
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getContent(segment, offset) {
    var _a;
    if (((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: missing private infos");
    }
    var _b = segment.privateInfos.metaplaylistInfos.baseContent, manifest = _b.manifest, period = _b.period, adaptation = _b.adaptation, representation = _b.representation;
    var newTime = segment.time < 0 ? segment.time :
        segment.time - (offset * segment.timescale);
    var offsetedSegment = objectAssign({}, segment, { time: newTime });
    return { manifest: manifest,
        period: period,
        adaptation: adaptation,
        representation: representation,
        segment: offsetedSegment };
}
/**
 * Prepare any wrapped segment loader's arguments.
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getLoaderArguments(segment, url, offset) {
    var content = getContent(segment, offset);
    return objectAssign({ url: url }, content);
}
/**
 * Prepare any wrapped segment parser's arguments.
 * @param {Object} arguments
 * @param {Object} segment
 * @param {number} offset
 * @returns {Object}
 */
function getParserArguments(_a, segment, offset) {
    var initTimescale = _a.initTimescale, response = _a.response;
    return { initTimescale: initTimescale,
        response: response,
        content: getContent(segment, offset) };
}
/**
 * @param {Object} transports
 * @param {string} transportName
 * @param {Object} options
 * @returns {Object}
 */
function getTransportPipelines(transports, transportName, options) {
    var initialTransport = transports[transportName];
    if (initialTransport !== undefined) {
        return initialTransport;
    }
    var feature = features.transports[transportName];
    if (feature === undefined) {
        throw new Error("MetaPlaylist: Unknown transport " + transportName + ".");
    }
    var transport = feature(options);
    transports[transportName] = transport;
    return transport;
}
/**
 * @param {Object} segment
 * @returns {Object}
 */
function getMetaPlaylistPrivateInfos(segment) {
    var privateInfos = segment.privateInfos;
    if ((privateInfos === null || privateInfos === void 0 ? void 0 : privateInfos.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
    }
    return privateInfos.metaplaylistInfos;
}
export default function (options) {
    var transports = {};
    var manifestLoader = generateManifestLoader({
        customManifestLoader: options.manifestLoader,
    });
    // remove some options that we might not want to apply to the
    // other streaming protocols used here
    var otherTransportOptions = objectAssign({}, options, { manifestLoader: undefined,
        supplementaryTextTracks: [],
        supplementaryImageTracks: [] });
    var manifestPipeline = {
        loader: manifestLoader,
        parser: function (_a) {
            var response = _a.response, loaderURL = _a.url, scheduleRequest = _a.scheduleRequest, externalClockOffset = _a.externalClockOffset;
            var url = response.url === undefined ? loaderURL :
                response.url;
            var responseData = response.responseData;
            var parserOptions = {
                url: url,
                serverSyncInfos: options.serverSyncInfos,
            };
            return handleParsedResult(parseMetaPlaylist(responseData, parserOptions));
            function handleParsedResult(parsedResult) {
                if (parsedResult.type === "done") {
                    var manifest = new Manifest(parsedResult.value, options);
                    return observableOf({ manifest: manifest });
                }
                var loaders$ = parsedResult.value.ressources.map(function (ressource) {
                    var transport = getTransportPipelines(transports, ressource.transportType, otherTransportOptions);
                    var request$ = scheduleRequest(function () {
                        return transport.manifest.loader({ url: ressource.url }).pipe(filter(function (e) {
                            return e.type === "data-loaded";
                        }), map(function (e) { return e.value; }));
                    });
                    return request$.pipe(mergeMap(function (responseValue) {
                        return transport.manifest.parser({ response: responseValue,
                            url: ressource.url,
                            scheduleRequest: scheduleRequest,
                            externalClockOffset: externalClockOffset })
                            .pipe(map(function (parserData) { return parserData.manifest; }));
                    }));
                });
                return combineLatest(loaders$).pipe(mergeMap(function (loadedRessources) {
                    return handleParsedResult(parsedResult.value.continue(loadedRessources));
                }));
            }
        },
    };
    /**
     * @param {Object} segment
     * @param {Object} transports
     * @returns {Object}
     */
    function getTransportPipelinesFromSegment(segment) {
        var transportType = getMetaPlaylistPrivateInfos(segment).transportType;
        return getTransportPipelines(transports, transportType, otherTransportOptions);
    }
    /**
     * @param {number} contentOffset
     * @param {number} scaledContentOffset
     * @param {number|undefined} contentEnd
     * @param {Object} segmentResponse
     * @returns {Object}
     */
    function offsetTimeInfos(contentOffset, scaledContentOffset, contentEnd, segmentResponse) {
        var offsetedSegmentOffset = segmentResponse.chunkOffset + contentOffset;
        if (isNullOrUndefined(segmentResponse.chunkData)) {
            return { chunkInfos: segmentResponse.chunkInfos,
                chunkOffset: offsetedSegmentOffset,
                appendWindow: [undefined, undefined] };
        }
        // clone chunkInfos
        var chunkInfos = segmentResponse.chunkInfos, appendWindow = segmentResponse.appendWindow;
        var offsetedChunkInfos = chunkInfos === null ? null :
            objectAssign({}, chunkInfos);
        if (offsetedChunkInfos !== null && offsetedChunkInfos.time > -1) {
            offsetedChunkInfos.time += scaledContentOffset;
        }
        var offsetedWindowStart = appendWindow[0] !== undefined ?
            Math.max(appendWindow[0] + contentOffset, contentOffset) :
            contentOffset;
        var offsetedWindowEnd;
        if (appendWindow[1] !== undefined) {
            offsetedWindowEnd = contentEnd !== undefined ?
                Math.min(appendWindow[1] + contentOffset, contentEnd) :
                appendWindow[1] + contentOffset;
        }
        else if (contentEnd !== undefined) {
            offsetedWindowEnd = contentEnd;
        }
        return { chunkInfos: offsetedChunkInfos,
            chunkOffset: offsetedSegmentOffset,
            appendWindow: [offsetedWindowStart, offsetedWindowEnd] };
    }
    var audioPipeline = {
        loader: function (_a) {
            var segment = _a.segment, period = _a.period, url = _a.url;
            var audio = getTransportPipelinesFromSegment(segment).audio;
            return audio.loader(getLoaderArguments(segment, url, period.start));
        },
        parser: function (args) {
            var initTimescale = args.initTimescale, content = args.content;
            var segment = content.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var scaledOffset = contentStart * (initTimescale !== null && initTimescale !== void 0 ? initTimescale : segment.timescale);
            var audio = getTransportPipelinesFromSegment(segment).audio;
            return audio.parser(getParserArguments(args, segment, contentStart))
                .pipe(map(function (res) {
                if (res.type === "parsed-init-segment") {
                    return res;
                }
                var timeInfos = offsetTimeInfos(contentStart, scaledOffset, contentEnd, res.value);
                return objectAssign({ type: "parsed-segment",
                    value: objectAssign({}, res.value, timeInfos) });
            }));
        },
    };
    var videoPipeline = {
        loader: function (_a) {
            var segment = _a.segment, period = _a.period, url = _a.url;
            var video = getTransportPipelinesFromSegment(segment).video;
            return video.loader(getLoaderArguments(segment, url, period.start));
        },
        parser: function (args) {
            var initTimescale = args.initTimescale, content = args.content;
            var segment = content.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var scaledOffset = contentStart * (initTimescale !== null && initTimescale !== void 0 ? initTimescale : segment.timescale);
            var video = getTransportPipelinesFromSegment(segment).video;
            return video.parser(getParserArguments(args, segment, contentStart))
                .pipe(map(function (res) {
                if (res.type === "parsed-init-segment") {
                    return res;
                }
                var timeInfos = offsetTimeInfos(contentStart, scaledOffset, contentEnd, res.value);
                return objectAssign({ type: "parsed-segment",
                    value: objectAssign({}, res.value, timeInfos) });
            }));
        },
    };
    var textTrackPipeline = {
        loader: function (_a) {
            var segment = _a.segment, period = _a.period, url = _a.url;
            var text = getTransportPipelinesFromSegment(segment).text;
            return text.loader(getLoaderArguments(segment, url, period.start));
        },
        parser: function (args) {
            var initTimescale = args.initTimescale, content = args.content;
            var segment = content.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var scaledOffset = contentStart * (initTimescale !== null && initTimescale !== void 0 ? initTimescale : segment.timescale);
            var text = getTransportPipelinesFromSegment(segment).text;
            return text.parser(getParserArguments(args, segment, contentStart))
                .pipe(map(function (res) {
                if (res.type === "parsed-init-segment") {
                    return res;
                }
                var timeInfos = offsetTimeInfos(contentStart, scaledOffset, contentEnd, res.value);
                return objectAssign({ type: "parsed-segment",
                    value: objectAssign({}, res.value, timeInfos) });
            }));
        },
    };
    var imageTrackPipeline = {
        loader: function (_a) {
            var segment = _a.segment, period = _a.period, url = _a.url;
            var image = getTransportPipelinesFromSegment(segment).image;
            return image.loader(getLoaderArguments(segment, url, period.start));
        },
        parser: function (args) {
            var initTimescale = args.initTimescale, content = args.content;
            var segment = content.segment;
            var _a = getMetaPlaylistPrivateInfos(segment), contentStart = _a.contentStart, contentEnd = _a.contentEnd;
            var scaledOffset = contentStart * (initTimescale !== null && initTimescale !== void 0 ? initTimescale : segment.timescale);
            var image = getTransportPipelinesFromSegment(segment).image;
            return image.parser(getParserArguments(args, segment, contentStart))
                .pipe(map(function (res) {
                if (res.type === "parsed-init-segment") {
                    return res;
                }
                var timeInfos = offsetTimeInfos(contentStart, scaledOffset, contentEnd, res.value);
                return objectAssign({ type: "parsed-segment",
                    value: objectAssign({}, res.value, timeInfos) });
            }));
        },
    };
    return { manifest: manifestPipeline,
        audio: audioPipeline,
        video: videoPipeline,
        text: textTrackPipeline,
        image: imageTrackPipeline };
}
