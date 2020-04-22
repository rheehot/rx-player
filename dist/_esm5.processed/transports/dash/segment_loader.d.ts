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
import { CustomSegmentLoader, ISegmentLoaderArguments, ISegmentLoaderObservable } from "../types";
/**
 * Generate a segment loader:
 *   - call a custom SegmentLoader if defined
 *   - call the regular loader if not
 * @param {boolean} lowLatencyMode
 * @param {Function} [customSegmentLoader]
 * @returns {Function}
 */
export default function generateSegmentLoader({ lowLatencyMode, segmentLoader: customSegmentLoader, checkMediaSegmentIntegrity }: {
    lowLatencyMode: boolean;
    segmentLoader?: CustomSegmentLoader;
    checkMediaSegmentIntegrity?: boolean;
}): (x: ISegmentLoaderArguments) => ISegmentLoaderObservable<Uint8Array | ArrayBuffer | null>;
