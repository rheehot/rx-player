import { Observable } from "rxjs";
export interface IDataChunk {
    type: "data-chunk";
    value: {
        currentTime: number;
        duration: number;
        chunkSize: number;
        size: number;
        sendingTime: number;
        url: string;
        totalSize?: number;
        chunk: ArrayBuffer;
    };
}
export interface IDataComplete {
    type: "data-complete";
    value: {
        duration: number;
        receivedTime: number;
        sendingTime: number;
        size: number;
        status: number;
        url: string;
    };
}
export interface IFetchOptions {
    url: string;
    headers?: {
        [header: string]: string;
    } | null;
    timeout?: number;
}
declare function fetchRequest(options: IFetchOptions): Observable<IDataChunk | IDataComplete>;
/**
 * Returns true if fetch should be supported in the current browser.
 * @return {boolean}
 */
export declare function fetchIsSupported(): boolean;
export default fetchRequest;
