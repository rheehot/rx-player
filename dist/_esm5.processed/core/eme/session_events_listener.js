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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import { concat as observableConcat, defer as observableDefer, EMPTY, identity, merge as observableMerge, of as observableOf, Subject, TimeoutError, } from "rxjs";
import { catchError, concatMap, map, mapTo, mergeMap, startWith, takeUntil, timeout, } from "rxjs/operators";
import { events, } from "../../compat";
import { EncryptedMediaError, } from "../../errors";
import log from "../../log";
import castToObservable from "../../utils/cast_to_observable";
import isNonEmptyString from "../../utils/is_non_empty_string";
import retryObsWithBackoff from "../../utils/rx-retry_with_backoff";
import tryCatch from "../../utils/rx-try_catch";
import checkKeyStatuses from "./check_key_statuses";
var onKeyError$ = events.onKeyError$, onKeyMessage$ = events.onKeyMessage$, onKeyStatusesChange$ = events.onKeyStatusesChange$;
/**
 * Error thrown when the MediaKeySession is blacklisted.
 * Such MediaKeySession should not be re-used but other MediaKeySession for the
 * same content can still be used.
 * @class BlacklistedSessionError
 * @extends Error
 */
var BlacklistedSessionError = /** @class */ (function (_super) {
    __extends(BlacklistedSessionError, _super);
    function BlacklistedSessionError(sessionError) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, BlacklistedSessionError.prototype);
        _this.sessionError = sessionError;
        return _this;
    }
    return BlacklistedSessionError;
}(Error));
export { BlacklistedSessionError };
/**
 * @param {Error|Object} error
 * @returns {Error|Object}
 */
function formatGetLicenseError(error) {
    if (error instanceof TimeoutError) {
        return new EncryptedMediaError("KEY_LOAD_TIMEOUT", "The license server took too much time to " +
            "respond.");
    }
    var err = new EncryptedMediaError("KEY_LOAD_ERROR", "An error occured when calling `getLicense`.");
    if (error != null &&
        isNonEmptyString(error.message)) {
        err.message = error.message;
    }
    return err;
}
/**
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystem - The key system configuration.
 * @returns {Observable}
 */
function getKeyStatusesEvents(session, keySystem) {
    var _a = checkKeyStatuses(session, keySystem), warnings = _a[0], blacklistedKeyIDs = _a[1];
    var warnings$ = warnings.length > 0 ? observableOf.apply(void 0, warnings) :
        EMPTY;
    var blackListUpdate$ = blacklistedKeyIDs.length > 0 ?
        observableOf({ type: "blacklist-keys",
            value: blacklistedKeyIDs }) :
        EMPTY;
    return observableConcat(warnings$, blackListUpdate$);
}
/**
 * listen to various events from a MediaKeySession and react accordingly
 * depending on the configuration given.
 * @param {MediaKeySession} session - The MediaKeySession concerned.
 * @param {Object} keySystem - The key system configuration.
 * @param {Object} initDataInfo - The initialization data linked to that
 * session.
 * @returns {Observable}
 */
export default function SessionEventsListener(session, keySystem, _a) {
    var initData = _a.initData, initDataType = _a.initDataType;
    var _b;
    log.debug("EME: Binding session events", session);
    var sessionWarningSubject$ = new Subject();
    var _c = keySystem.getLicenseConfig, getLicenseConfig = _c === void 0 ? {} : _c;
    var getLicenseRetryOptions = {
        totalRetry: (_b = getLicenseConfig.retry, (_b !== null && _b !== void 0 ? _b : 2)),
        baseDelay: 200,
        maxDelay: 3000,
        shouldRetry: function (error) {
            return error instanceof TimeoutError ||
                error === undefined || error === null ||
                error.noRetry !== true;
        },
        onRetry: function (error) {
            return sessionWarningSubject$.next({ type: "warning",
                value: formatGetLicenseError(error) });
        }
    };
    var keyErrors = onKeyError$(session)
        .pipe(map(function (error) {
        throw new EncryptedMediaError("KEY_ERROR", error.type);
    }));
    var keyStatusesChanges = onKeyStatusesChange$(session)
        .pipe(mergeMap(function (keyStatusesEvent) {
        log.debug("EME: keystatuseschange event", session, keyStatusesEvent);
        var keyStatusesEvents$ = getKeyStatusesEvents(session, keySystem);
        var handledKeyStatusesChange$ = tryCatch(function () {
            return typeof keySystem.onKeyStatusesChange === "function" ?
                castToObservable(keySystem.onKeyStatusesChange(keyStatusesEvent, session)) :
                EMPTY;
        }, undefined).pipe(map(function (licenseObject) { return ({ type: "key-status-change-handled",
            value: { session: session, license: licenseObject } }); }), catchError(function (error) {
            var err = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "Unknown `onKeyStatusesChange` error");
            if (error != null &&
                isNonEmptyString(error.message)) {
                err.message = error.message;
            }
            throw err;
        }));
        return observableConcat(keyStatusesEvents$, handledKeyStatusesChange$);
    }));
    var keyMessages$ = onKeyMessage$(session).pipe(mergeMap(function (messageEvent) {
        var message = new Uint8Array(messageEvent.message);
        var messageType = isNonEmptyString(messageEvent.messageType) ?
            messageEvent.messageType :
            "license-request";
        log.debug("EME: Event message type " + messageType, session, messageEvent);
        var getLicense$ = observableDefer(function () {
            var getLicense = keySystem.getLicense(message, messageType);
            var getLicenseTimeout = getLicenseConfig.timeout != null ?
                getLicenseConfig.timeout :
                10 * 1000;
            return castToObservable(getLicense)
                .pipe(getLicenseTimeout >= 0 ? timeout(getLicenseTimeout) :
                identity /* noop */);
        });
        return retryObsWithBackoff(getLicense$, getLicenseRetryOptions)
            .pipe(map(function (licenseObject) { return ({
            type: "key-message-handled",
            value: { session: session, license: licenseObject },
        }); }), catchError(function (err) {
            var formattedError = formatGetLicenseError(err);
            if (err != null) {
                var fallbackOnLastTry = err.fallbackOnLastTry;
                if (fallbackOnLastTry === true) {
                    log.warn("EME: Last `getLicense` attempt failed. " +
                        "Blacklisting the current session.");
                    throw new BlacklistedSessionError(formattedError);
                }
            }
            throw formattedError;
        }), startWith({ type: "session-message",
            value: { messageType: messageType, initData: initData, initDataType: initDataType } }));
    }));
    var sessionUpdates = observableMerge(keyMessages$, keyStatusesChanges)
        .pipe(concatMap(function (evt) {
        switch (evt.type) {
            case "warning":
            case "blacklist-keys":
            case "session-message":
                return observableOf(evt);
        }
        var license = evt.value.license;
        if (license == null) {
            log.info("EME: No license given, skipping session.update");
            return observableOf({ type: "no-update",
                value: { initData: initData, initDataType: initDataType } });
        }
        log.debug("EME: Update session", evt);
        return castToObservable(session.update(license)).pipe(catchError(function (error) {
            var reason = error instanceof Error ? error.toString() :
                "`session.update` failed";
            throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
        }), mapTo({ type: "session-updated",
            value: { session: session, license: license, initData: initData, initDataType: initDataType } }));
    }));
    var sessionEvents = observableMerge(getKeyStatusesEvents(session, keySystem), sessionUpdates, keyErrors, sessionWarningSubject$);
    return session.closed != null ?
        sessionEvents.pipe(takeUntil(castToObservable(session.closed))) :
        sessionEvents;
}
