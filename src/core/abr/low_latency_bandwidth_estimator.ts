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

export default class LowLatencyBandwidthCalculator {
  private _bandwidthBuffer: number[];
  constructor() {
    this._bandwidthBuffer = [];
  }

  addSample(duration: number, size: number): void {
    const sampleBandwidth = size * 8000 / duration;
    const bandwidth = this.getBandwidth();
    if (bandwidth !== undefined &&
        sampleBandwidth > (bandwidth * 0.8) &&
        sampleBandwidth <= bandwidth) {
      return;
    }
    this._bandwidthBuffer.push(sampleBandwidth);
    if (this._bandwidthBuffer.length > 3) {
      this._bandwidthBuffer.shift();
    }
  }

  getBandwidth(): number | undefined {
    if (this._bandwidthBuffer.length < 3) {
      return undefined;
    }
    return this._bandwidthBuffer.reduce((acc, val) => acc + val, 0) /
           this._bandwidthBuffer.length;
  }
}
