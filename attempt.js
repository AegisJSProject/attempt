/**
 * Unique symbol used internally to mark an attempt result with its status.
 *
 * @private
 * @type {unique symbol}
 */
const ATTEMPT_STATUS = Symbol('attempt:status');

const VALUE_INDEX = 0;

const ERROR_INDEX = 1;

export const SUCCEEDED = Symbol('attempt:status:succeeded');
export const FAILED = Symbol('attempt:status:failed');


/**
 * Returns the status of an attempt result.
 * @enum {unique symbol}
 * @property {unique symbol} succeeded - Represents a successful attempt result.
 * @property {unique symbol} failed - Represents a failed attempt result.
 */
export const ATTEMPT_STATUSES = Object.freeze({
	succeeded: SUCCEEDED,
	failed: FAILED,
});

/**
 * Gets the status of an attempt result.
 *
 * @param {AttemptResult} result The result to check.
 * @returns {ATTEMPT_STATUSES.succeeded|ATTEMPT_STATUSES.failed}
 * @throws {TypeError} If the result is not an `AttemptResult`.
 */
export function getAttemptStatus(result) {
	if (isAttemptResult(result)) {
		return result[ATTEMPT_STATUS];
	} else {
		throw new TypeError('Result must be an `AttemptResult` tuple.');
	}
}

/**
 * Union of all error types.
 * @typedef {Error|DOMException|TypeError|RangeError|AggregateError|ReferenceError|EvalError|URIError|SyntaxError} AnyError
 */

/**
 * @template T
 * @typedef {readonly [T, null] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.succeeded }} AttemptSuccess
 * Represents a successful outcome tuple with hidden metadata.
 */

/**
 * @template E
 * @typedef {readonly [null, E] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.failed }} AttemptFailure
 * Represents a failed outcome tuple with hidden metadata.
 */

/**
 * @template T
 * @template E
 * @typedef {AttemptSuccess<T> | AttemptFailure<E>} AttemptResult<T, E>
 * Union type for both possible attempt outcomes.
 */

/**
 * Attach a hidden status symbol and freeze the result.
 *
 * @template T
 * @param {T} value A tuple to tag with metadata.
 * @param {symbol} status Internal status symbol.
 * @returns {readonly T & { [ATTEMPT_STATUS]: symbol }} The frozen and tagged tuple.
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
 * @param {AttemptSuccess<T>} result
 * @returns {T}
 */
function _extractValue(result) {
	return result[VALUE_INDEX];
}

/**
 * @template E
 * @param {AttemptFailure<E>} result
 * @returns {E}
 */
function _extractError(result) {
	return result[ERROR_INDEX];
}

/**
 * @template T
 * @param {T} input
 * @returns {T}
 */
const _successHandler = input => input;

/**
 * @template E
 * @param {E} err
 * @throws {E}
 */
const _failHandler = err => {
	throw err;
};

/**
 * Returns `true` if the given value is an AttemptResult (a frozen tuple with hidden metadata).
 *
 * @param {unknown} result The value to check.
 * @returns {result is AttemptResult}
 */
export const isAttemptResult = result => Array.isArray(result) && Object.hasOwn(result, ATTEMPT_STATUS);

/**
 * Returns `true` if the given result is a successful AttemptResult.
 *
 * @param {unknown} result
 * @returns {result is AttemptSuccess}
 */
export const succeeded = result => isAttemptResult(result) && result[ATTEMPT_STATUS] === ATTEMPT_STATUSES.succeeded;

/**
 * Returns `true` if the given result is a failed AttemptResult.
 *
 * @param {unknown} result
 * @returns {result is AttemptFailure<AnyError>}
 */
export const failed = result => isAttemptResult(result) && result[ATTEMPT_STATUS] === ATTEMPT_STATUSES.failed;

/**
 * Creates an `AttemptSuccess`
 *
 * @template T
 * @param {T} value
 * @returns {AttemptSuccess<T>}
 */
export const succeed = value => isAttemptResult(value) ? value : _createResult([value, null], ATTEMPT_STATUSES.succeeded);

/**
 * @overload
 * @param {string} err
 * @returns {AttemptFailure<Error>}
 */
/**
 * @overload
 * @template E
 * @param {AttemptFailure<E>} err
 * @returns {AttemptFailure<E>}
 */
/**
 * @overload
 * @param {AnyError} err
 * @returns {AttemptFailure<AnyError>}
 */
/**
 * Creates an `AttemptFailure`
 *
 * @param {AnyError|AttemptFailure<AnyError>|string} err
 * @returns {AttemptFailure<AnyError>}
 */
export function fail(err) {
	if (isAttemptResult(err)) {
		return err;
	} else if (Error.isError(err)) {
		return _createResult([null, err], ATTEMPT_STATUSES.failed);
	} else if (typeof err === 'string') {
		return _createResult([null, new Error(err)], ATTEMPT_STATUSES.failed);
	} else {
		return _createResult([null, new TypeError('Invalid error type provided.')], ATTEMPT_STATUSES.failed);
	}
}

/**
 * Extracts the value from a successful `AttemptResult`.
 *
 * @template T
 * @param {AttemptSuccess<T>} result The result to extract from.
 * @returns {T} The successful result value.
 * @throws {TypeError} If the result is not a successful `AttemptSuccess`.
 */
export function getResultValue(result) {
	if (succeeded(result)) {
		return _extractValue(result);
	} else {
		throw new TypeError('Result must be an `AttemptSuccess` tuple.');
	}
}

/**
 * Extracts the error from a failed `AttemptResult`.
 *
 * @template E
 * @param {AttemptFailure<E>} result The result to extract from.
 * @returns {E} The error object if the result is a failure.
 * @throws {TypeError} If the result is not a failed `AttemptFailure`.
 */
export function getResultError(result) {
	if (failed(result)){
		return _extractError(result);
	} else {
		throw new TypeError('Result must be an `AttemptFailure` tuple.');
	}
}

/**
 * Attempts to execute a given callback function, catching any synchronous errors or Promise rejections,
 * and returning the result in a consistent [value, error] tuple format.
 * All returned arrays are Object.frozen() for immutability.
 * Non-Error rejections are normalized into standard Error objects for consistency.
 *
 * @template T
 * @param {(...any) => T | PromiseLike<T>} callback The function to execute. It can be synchronous or return a Promise.
 * @param {(...any)} args Arguments to pass to the callback function.
 * @returns {Promise<AttemptResult<Awaited<T>|null, AnyError|null>>} A Promise that resolves to a tuple:
 * - `[result, null]` on success, where `result` is the resolved value of `T`.
 * - `[null, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function.
 */
export async function attemptAsync(callback, ...args) {
	if (typeof callback !== 'function') {
		throw new TypeError('callback must be a function.');
	} else {
		return await Promise.try(callback, ...args).then(succeed).catch(fail);
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
 * @returns {AttemptResult<T, AnyError|null>} A tuple:
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
 * @returns {(...any) => Promise<AttemptResult<Awaited<T>|null, AnyError|null>>>} An async wrapped function that returns to a tuple:
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
 * @returns {(...any) => AttemptResult<T, AnyError|null>} A wrapped function that returns a tuple:
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
 * @template T
 * @template E
 * @template U
 * @template V
 * @template R
 * @param {AttemptResult<T, E>} result The result to handle.
 * @param {{
 *   success?: (value: T) => U | PromiseLike<U>,
 *   failure?: (err: E) => V | PromiseLike<V>
 * 	 signal?: AbortSignal<R>
 * }} callbacks Handlers for success or failure cases.
 * @returns {Promise<AttemptResult<Awaited<U>|Awaited<V>, E>|AttemptFailure<R>} A Promise resolving to a new `AttemptResult` from the callback execution,
 * or a failure if the input is invalid.
 */
export async function handleResultAsync(result, {
	success = _successHandler,
	failure = _failHandler,
	signal,
}) {
	if (! isAttemptResult(result)) {
		throw new TypeError('Result must be an `AttemptResult` tuple.');
	} else if (typeof success !== 'function' || typeof failure !== 'function') {
		throw new TypeError('Both success and failure handlers must be functions.');
	} else if (signal instanceof AbortSignal && signal.aborted) {
		return fail(signal.reason instanceof Error ? signal.reason : new Error(signal.reason));
	} else {
		switch (getAttemptStatus(result)) {
			case ATTEMPT_STATUSES.succeeded:
				return await attemptAsync(success, getResultValue(result));
			case ATTEMPT_STATUSES.failed:
				return await attemptAsync(failure, getResultError(result));
		}
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
 * @template T
 * @template E
 * @template U
 * @template V
 * @param {AttemptResult<T, E>} result The result to handle.
 * @param {{
 *   success?: (value: T) => U,
 *   failure?: (err: E) => V
 * }} callbacks Handlers for success or failure cases.
 * @returns {AttemptSuccess<U>|AttemptSuccess<V>|AttemptFailure<E>>} A Promise resolving to a new `AttemptResult` from the callback execution,
 * or a failure if the input is invalid.
 */
export function handleResultSync(result, {
	success = _successHandler,
	failure = _failHandler,
}) {
	if (!isAttemptResult(result)) {
		throw new TypeError('Result must be an `AttemptResult` tuple.');
	} else if (typeof success !== 'function' || typeof failure !== 'function') {
		throw new TypeError('Both success and failure handlers must be functions.');
	} else {
		switch (getAttemptStatus(result)) {
			case ATTEMPT_STATUSES.succeeded:
				return attemptSync(success, getResultValue(result));
			case ATTEMPT_STATUSES.failed:
				return attemptSync(failure, getResultError(result));
		}
	}
}

/**
 * Attempts to execute multiple callbacks sequentially, passing the result of each callback to the next.
 *
 * @param  {...Function} callbacks
 * @returns {Promise<AttemptSuccess<any>|AttemptFailure<AnyError>>}
 */
export async function attemptAll(...callbacks) {
	if (callbacks.some(cb => typeof cb !== 'function')) {
		throw new TypeError('All callbacks must be functions.');
	} else {
		let result = succeed(null);

		for (const cb of callbacks) {
			if (result[ATTEMPT_STATUS] === ATTEMPT_STATUSES.failed) {
				break;
			} else {
				result = await attemptAsync(cb, result[VALUE_INDEX]);
			}
		}

		return result;
	}
}

/**
 * Throws the error if `result` is an `AttemptFailure`.
 *
 * @param {AttemptResult<any, AnyError>} result The result tuple
 * @throws {AnyError} The error if result is an `AttemptFailure`
 */
export function throwIfFailed(result) {
	if (failed(result)) {
		throw getResultError(result);
	}
}

export const createSafeCallback = createSafeAsyncCallback;
export const attempt = attemptAsync;
