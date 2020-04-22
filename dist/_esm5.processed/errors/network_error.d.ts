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
import { INetworkErrorCode, INetworkErrorType } from "./error_codes";
export interface INetworkErrorOptions {
    xhr?: XMLHttpRequest;
    url: string;
    status: number;
    type: INetworkErrorType;
    message: string;
}
/**
 * Error linked to network interactions (requests).
 *
 * @class NetworkError
 * @extends Error
 */
export default class NetworkError extends Error {
    readonly name: "NetworkError";
    readonly type: string;
    readonly message: string;
    readonly code: INetworkErrorCode;
    readonly xhr: XMLHttpRequest | null;
    readonly url: string;
    readonly status: number;
    readonly errorType: INetworkErrorType;
    fatal: boolean;
    /**
     * @param {string} code
     * @param {Error} options
     * @param {Boolean} fatal
     */
    constructor(code: INetworkErrorCode, options: INetworkErrorOptions);
    /**
     * Returns true if the NetworkError is due to the given http error code
     * @param {number} httpErrorCode
     * @returns {Boolean}
     */
    isHttpError(httpErrorCode: number): boolean;
}
