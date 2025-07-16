/**
 * Unique symbol used internally to mark an attempt result with its status.
 *
 * @private
 * @type {unique symbol}
 */
const ATTEMPT_STATUS = Symbol('attempt:status');

/**
 * Enum-like object holding internal status symbols for succeeded/failed results.
 *
 * @private
 * @readonly
 * @enum {unique symbol}
 */
const ATTEMPT_STATUSES = Object.freeze({
	succeeded: Symbol('attempt:succeeded'),
	failed: Symbol('attempt:failed'),
});

/**
 * Attach a hidden status symbol and freeze the result.
 *
 * @template {readonly [any, Error|null]} T
 * @param {T} value A tuple to tag with metadata.
 * @param {symbol} status Internal status symbol.
 * @returns {T & { [ATTEMPT_STATUS]: symbol }} The frozen and tagged tuple.
 * @private
 */
function _createResult(value, status) {
	Object.defineProperty(value, ATTEMPT_STATUS, {
		value: status,
		writable: false,
		enumerable: false,
		configurable: false,
	});

	return Object.freeze(value);
}

/**
 * @template T
 * @param {T} input
 * @returns {T}
 */
const _successHandler = input => input;

/**
 *
 * @param {Error} err
 * @throws {Error}
 */
const _failHandler = err => {
	throw new Error('Unhandled error in result.', { cause: err });
};

/**
 * Returns `true` if the given value is an AttemptResult (a frozen tuple with hidden metadata).
 * @param {unknown} result The value to check.
 * @returns {result is AttemptResult<any>}
 */
export const isAttemptResult = result => Array.isArray(result) && Object.hasOwn(result, ATTEMPT_STATUS);

/**
 * Returns `true` if the given result is a successful AttemptResult.
 * @param {unknown} result
 * @returns {result is AttemptSuccess<any>}
 */
export const succeeded = result => isAttemptResult(result) && result[ATTEMPT_STATUS] === ATTEMPT_STATUSES.succeeded;

/**
 * Returns `true` if the given result is a failed AttemptResult.
 * @param {unknown} result
 * @returns {result is AttemptFailure}
 */
export const failed = result => isAttemptResult(result) && result[ATTEMPT_STATUS] === ATTEMPT_STATUSES.failed;

/**
 * @template T
 * @typedef {readonly [T, null] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.succeeded }} AttemptSuccess
 * Represents a successful outcome tuple with hidden metadata.
 */

/**
 * @typedef {readonly [null, Error] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.failed }} AttemptFailure
 * Represents a failed outcome tuple with hidden metadata.
 */

/**
 * @template T
 * @typedef {AttemptSuccess<T> | AttemptFailure} AttemptResult
 * Union type for both possible attempt outcomes.
 */

/**
 * Creates an `AttemptSuccess`
 *
 * @template T The type of the successful result.
 * @param {T} value
 * @returns {AttemptSuccess<T>}
 */
export const succeed = value => isAttemptResult(value) ? value : _createResult([value, null], ATTEMPT_STATUSES.succeeded);

/**
 * Creates an `AttemptFailure`
 * @param {Error|string|AttemptFailure} err
 * @returns {AttemptFailure}
 */

export function fail(err) {
	if (isAttemptResult(err)) {
		return err;
	} else if (Error.isError(err)) {
		return _createResult([null, err], ATTEMPT_STATUSES.failed);
	} else {
		return _createResult([null, new Error(err)], ATTEMPT_STATUSES.failed);
	}
}

/**
 * Extracts the value from a successful `AttemptResult`, or `null` if it failed or is invalid.
 *
 * @template T
 * @param {AttemptResult<T>} result The result to extract from.
 * @returns {T | null} The successful result value, or `null` if not a success.
 */
export const getResultValue = result => succeeded(result) ? result[0] : null;

/**
 * Extracts the error from a failed `AttemptResult`, or `null` if it succeeded or is invalid.
 *
 * @param {AttemptResult} result The result to extract from.
 * @returns {Error | null} The error object if the result is a failure, otherwise `null`.
 */
export const getResultError = result => failed(result) ? result[1] : null;

/**
 * Attempts to execute a given callback function, catching any synchronous errors or Promise rejections,
 * and returning the result in a consistent [value, error] tuple format.
 * All returned arrays are Object.frozen() for immutability.
 * Non-Error rejections are normalized into standard Error objects for consistency.
 *
 * @template T
 * @param {(...any) => T | PromiseLike<T>} callback The function to execute. It can be synchronous or return a Promise.
 * @param {(...any)} args Arguments to pass to the callback function.
 * @returns {Promise<AttemptResult<Awaited<T>>>} A Promise that resolves to a tuple:
 * - `[result, null]` on success, where `result` is the resolved value of `T`.
 * - `[null, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function.
 */
export async function attemptAsync(callback, ...args) {
	if (typeof callback !== 'function') {
		throw new TypeError('callback must be a function.');
	} else {
		return await Promise.try(callback, ...args).then(succeed, fail);
	}
}

/**
 * Attempts to execute a given callback function synchronously, catching any errors,
 * and returning the result in a consistent [value, error] tuple format.
 * All returned arrays are Object.frozen() for immutability.
 * Non-Errors thrown are normalized into standard Error objects for consistency.
 *
 * @template T
 * @param {(...any) => T} callback The function to execute.
 * @param {(...any)} args Arguments to pass to the callback function.
 * @returns {AttemptResult<T>} A tuple:
 * - `[result, null]` on success, where `result` is the value of `T`.
 * - `[null, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function or is an async function.
 */
export function attemptSync(callback, ...args) {
	if (typeof callback !== 'function') {
		throw new TypeError('callback must be a function.');
	} else if (callback.constructor.name === 'AsyncFunction') {
		throw new TypeError('callback cannot be an async function.');
	} else {
		try {
			const result = callback(...args);

			return succeed(result);
		} catch(err) {
			return fail(err);
		}
	}
}

/**
 * Return a new function that forwards its arguments to `attemptAsync`.
 *
 * @template T
 * @param {(...any) => T | PromiseLike<T>} callback The function to execute.
 * @returns {(...any) => Promise<AttemptResult<Awaited<T>>>} An async wrapped function that returns to a tuple:
 * - `[result, null]` on success, where `result` is the value of `T`.
 * - `[null, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function.
 */
export const createSafeAsyncCallback = callback => async (...args) => await attemptAsync(callback, ...args);

/**
 * Return a new function that forwards its arguments to `attemptSync`.
 *
 * @template T
 * @param {(...any) => T} callback The function to execute.
 * @returns {(...any) => AttemptResult<T>} A wrapped function that returns a tuple:
 * - `[result, null]` on success, where `result` is the value of `T`.
 * - `[null, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function or is an async function.
 */
export const createSafeSyncCallback = callback => (...args) => attemptSync(callback, ...args);

/**
 * Handles an `AttemptResult` asynchronously by invoking the appropriate callback.
 *
 * - If the result is successful, `success` is called with the result value.
 * - If the result is a failure, `failure` is called with the error.
 * - If the result is not a valid `AttemptResult`, a failed result is returned with a `TypeError`.
 *
 * All callbacks are wrapped in `attemptAsync()` to preserve consistent result formatting and error handling.
 *
 * @template T,U
 * @param {AttemptResult<T>} result The result to handle.
 * @param {{
 *   success?: (value: T) => U | PromiseLike<U>,
 *   failure?: (err: Error) => U | PromiseLike<U>
 * }} callbacks Handlers for success or failure cases.
 * @returns {Promise<AttemptResult<Awaited<U>>>} A Promise resolving to a new `AttemptResult` from the callback execution,
 * or a failure if the input is invalid.
 */
export async function handleResultAsync(result, {
	success = _successHandler,
	failure = _failHandler,
}) {
	if (succeeded(result)) {
		return await attemptAsync(success, getResultValue(result));
	} else if (failed(result)) {
		return await attemptAsync(failure, getResultError(result));
	} else {
		return fail(new TypeError('Result must be an `AttemptResult` tuple.'));
	}
}

/**
 * Handles an `AttemptResult` synchronously by invoking the appropriate callback.
 *
 * - If the result is successful, `success` is called with the result value.
 * - If the result is a failure, `failure` is called with the error.
 * - If the result is not a valid `AttemptResult`, a failed result is returned with a `TypeError`.
 *
 * All callbacks are wrapped in `attemptSync()` to preserve consistent result formatting and error handling.
 *
 * @template T,U
 * @param {AttemptResult<T>} result The result to handle.
 * @param {{
 *   success?: (value: T) => U,
 *   failure?: (err: Error) => U
 * }} callbacks Handlers for success or failure cases.
 * @returns {AttemptResult<U>} A Promise resolving to a new `AttemptResult` from the callback execution,
 * or a failure if the input is invalid.
 */
export function handleResultSync(result, {
	success = _successHandler,
	failure = _failHandler,
}) {
	if (succeeded(result)) {
		return attemptSync(success, getResultValue(result));
	} else if (failed(result)) {
		return attemptSync(failure, getResultError(result));
	} else {
		return fail(new TypeError('Result must be an `AttemptResult` tuple.'));
	}
}

/**
 * Throws the error if `result` is an `AttemptFailure`.
 *
 * @param {AttemptResult} result The result tuple
 * @throws {Error} The error if result is an `AttemptFailure`
 */
export function throwIfFailed(result) {
	if (failed(result)) {
		throw getResultError(result);
	}
}

export const createSafeCallback = createSafeAsyncCallback;
export const attempt = attemptAsync;
