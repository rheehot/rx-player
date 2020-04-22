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
 * By comparing two timelines for the same content at different points in time,
 * retrieve the index in both timelines of the first segment having the same
 * starting time.
 * Returns `null` if not found.
 * @param {Array.<Object>} prevTimeline
 * @param {HTMLCollection} newElements
 * @returns {Object|null}
 */
export default function findFirstCommonStartTime(prevTimeline, newElements) {
    if (prevTimeline.length === 0 || newElements.length === 0) {
        return null;
    }
    var prevInitialStart = prevTimeline[0].start;
    var newFirstTAttr = newElements[0].getAttribute("t");
    var newInitialStart = newFirstTAttr === null ? null :
        parseInt(newFirstTAttr, 10);
    if (newInitialStart === null || Number.isNaN(newInitialStart)) {
        return null;
    }
    if (prevInitialStart === newInitialStart) {
        return { prevSegmentsIdx: 0,
            newElementsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0 };
    }
    else if (prevInitialStart < newInitialStart) {
        var prevElt = prevTimeline[0];
        var prevElementIndex = 0;
        while (true) {
            if (prevElt.repeatCount > 0) {
                var diff = newInitialStart - prevElt.start;
                if (diff % prevElt.duration === 0 &&
                    diff / prevElt.duration <= prevElt.repeatCount) {
                    var repeatNumberInPrevSegments = diff / prevElt.duration;
                    return { repeatNumberInPrevSegments: repeatNumberInPrevSegments,
                        prevSegmentsIdx: prevElementIndex,
                        newElementsIdx: 0,
                        repeatNumberInNewElements: 0 };
                }
            }
            prevElementIndex++;
            if (prevElementIndex >= prevTimeline.length) {
                return null;
            }
            prevElt = prevTimeline[prevElementIndex];
            if (prevElt.start === newInitialStart) {
                return { prevSegmentsIdx: prevElementIndex,
                    newElementsIdx: 0,
                    repeatNumberInPrevSegments: 0,
                    repeatNumberInNewElements: 0 };
            }
            else if (prevElt.start > newInitialStart) {
                return null;
            }
        }
    }
    else {
        var newElementsIdx = 0;
        var newElt = newElements[0];
        var currentTimeOffset = newInitialStart;
        while (true) {
            var dAttr = newElt.getAttribute("d");
            var duration = dAttr === null ? null :
                parseInt(dAttr, 10);
            if (duration === null || Number.isNaN(duration)) {
                return null;
            }
            var rAttr = newElt.getAttribute("r");
            var repeatCount = rAttr === null ? null :
                parseInt(rAttr, 10);
            if (repeatCount !== null) {
                if (Number.isNaN(repeatCount) || repeatCount < 0) {
                    return null;
                }
                if (repeatCount > 0) {
                    var diff = prevInitialStart - currentTimeOffset;
                    if (diff % duration === 0 &&
                        diff / duration <= repeatCount) {
                        var repeatNumberInNewElements = diff / duration;
                        return { repeatNumberInPrevSegments: 0,
                            repeatNumberInNewElements: repeatNumberInNewElements,
                            prevSegmentsIdx: 0,
                            newElementsIdx: newElementsIdx };
                    }
                }
                currentTimeOffset += duration * (repeatCount + 1);
            }
            else {
                currentTimeOffset += duration;
            }
            newElementsIdx++;
            if (newElementsIdx >= newElements.length) {
                return null;
            }
            newElt = newElements[newElementsIdx];
            var tAttr = newElt.getAttribute("t");
            var time = tAttr === null ? null :
                parseInt(tAttr, 10);
            if (time !== null) {
                if (Number.isNaN(time)) {
                    return null;
                }
                currentTimeOffset = time;
            }
            if (currentTimeOffset === prevInitialStart) {
                return { newElementsIdx: newElementsIdx,
                    prevSegmentsIdx: 0,
                    repeatNumberInPrevSegments: 0,
                    repeatNumberInNewElements: 0 };
            }
            else if (currentTimeOffset > newInitialStart) {
                return null;
            }
        }
    }
}
