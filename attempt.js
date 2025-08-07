/**
 * Unique symbol used internally to mark an attempt result with its status.
 *
 * @private
 * @type {unique symbol}
 */
const ATTEMPT_STATUS = Symbol('attempt:status');

const VALUE_INDEX = 0;

const ERROR_INDEX = 1;

export const NONE = null;

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
 * Union of all error types.
 * @typedef {Error|DOMException|TypeError|RangeError|AggregateError|ReferenceError|EvalError|URIError|SyntaxError} AnyError
 */

/**
 * @template T
 * @template E
 * @typedef {AttemptSuccess<T> | AttemptFailure<E>} AttemptResult<T, E>
 * Union type for both possible attempt outcomes.
 */
class ResultTuple extends Array {
	/**
	 * @param {T} value
	 * @param {E} error
	 * @param {SUCCEEDED|FAILED} status
	 */
	constructor(value, error, status) {
		super(value, error);
		Object.defineProperty(this, ATTEMPT_STATUS, {
			value: status,
			writable: false,
			enumerable: false,
			configurable: false,
		});

		Object.freeze(this);
	}

	/**
	 * @returns {Error|NONE}
	 */
	get error() {
		return this[ERROR_INDEX];
	}

	/**
	 * @returns {SUCCEEDED|FAILED}
	 */
	get status() {
		return this[ATTEMPT_STATUS];
	}

	/**
	 * @returns {T}
	 */
	get value() {
		return this[VALUE_INDEX];
	}

	/**
	 * @returns {typeof SUCCEEDED}
	 */
	static get SUCCEEDED() {
		return SUCCEEDED;
	}

	/**
	 * @returns {typeof FAILED}
	 */
	static get FAILED() {
		return FAILED;
	}
}

/**
 * @template T
 * @typedef {readonly [T, NONE] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.succeeded, value: T, error: NONE, status: typeof ATTEMPT_STATUSES.succeeded }} AttemptSuccess
 * Represents a successful outcome tuple with hidden metadata. Named differently in class to avoid JSDocs confusion.
 */
class SuccessTuple extends ResultTuple {
	/**
	 *
	 * @param {T} value
	 */
	constructor(value) {
		super(value, NONE, ResultTuple.SUCCEEDED);
	}
}

/**
 * @template E
 * * @typedef {readonly [NONE, E] & { [ATTEMPT_STATUS]: typeof ATTEMPT_STATUSES.failed, value: NONE, error: E, status: typeof ATTEMPT_STATUSES.failed }} AttemptFailure
 * Represents a failed outcome tuple with hidden metadata. Named differently in class to avoid JSDocs confusion.
 */
class FailureTuple extends ResultTuple {
	/**
	 *
	 * @param {E} error
	 */
	constructor(error) {
		if (typeof error === 'string') {
			super(NONE, new Error(error), ResultTuple.FAILED);
		} else if (Error.isError(error)) {
			super(NONE, error, ResultTuple.FAILED);
		} else if (! (error instanceof AbortSignal)) {
			super(NONE, new TypeError('Invalid error type provided.'), ResultTuple.FAILED);
		} else if (! error.aborted) {
			super(NONE, new TypeError('Failed with a non-aborted `AbortSignal`.'), ResultTuple.FAILED);
		} else if (typeof error.reason === 'string') {
			super(NONE, new Error(error.reason), ResultTuple.FAILED);
		} else {
			super(NONE, error.reason, ResultTuple.FAILED);
		}
	}
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
export const isAttemptResult = result => result instanceof ResultTuple;

/**
 * Returns `true` if the given result is a successful AttemptResult.
 *
 * @param {unknown} result
 * @returns {result is AttemptSuccess}
 */
export const succeeded = result => result instanceof SuccessTuple;

/**
 * Returns `true` if the given result is a failed AttemptResult.
 *
 * @param {unknown} result
 * @returns {result is AttemptFailure<AnyError>}
 */
export const failed = result => result instanceof FailureTuple;

/**
 * Creates an `AttemptSuccess`
 *
 * @template T
 * @param {T} value
 * @returns {AttemptSuccess<T>}
 */
export const succeed = value => isAttemptResult(value) ? value : new SuccessTuple(value);

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
	if (err instanceof ResultTuple) {
		return err;
	} else {
		return new FailureTuple(err);
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
	if (result instanceof SuccessTuple) {
		return result.value;
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
	if (result instanceof FailureTuple){
		return result.error;
	} else {
		throw new TypeError('Result must be an `AttemptFailure` tuple.');
	}
}

/**
 * Gets the status of an attempt result.
 *
 * @param {AttemptResult} result The result to check.
 * @returns {ATTEMPT_STATUSES.succeeded|ATTEMPT_STATUSES.failed}
 * @throws {TypeError} If the result is not an `AttemptResult`.
 */
export function getAttemptStatus(result) {
	if (result instanceof ResultTuple) {
		return result.status;
	} else {
		throw new TypeError('Result must be an `AttemptResult` tuple.');
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
 * @returns {Promise<AttemptResult<Awaited<T>|NONE, AnyError|NONE>>} A Promise that resolves to a tuple:
 * - `[result, NONE]` on success, where `result` is the resolved value of `T`.
 * - `[NONE, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
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
 * @returns {AttemptResult<T, AnyError|NONE>} A tuple:
 * - `[result, NONE]` on success, where `result` is the value of `T`.
 * - `[NONE, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
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
 * @returns {(...any) => Promise<AttemptSuccess<Awaited<T>>|AttemptFailure<Error>>} A wrapped function that returns a tuple:
 * - `[result, NONE]` on success, where `result` is the value of `T`.
 * - `[NONE, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
 * @throws {TypeError} If `callback` is not a function.
 */
export const createSafeAsyncCallback = callback => async (...args) => await attemptAsync(callback, ...args);

/**
 * Return a new function that forwards its arguments to `attemptSync`.
 *
 * @template T
 * @param {(...any) => T} callback The function to execute.
 * @returns {(...any) => AttemptSuccess<T>|AttemptFailure<Error>} A wrapped function that returns a tuple:
 * - `[result, NONE]` on success, where `result` is the value of `T`.
 * - `[NONE, Error]` on failure, where `Error` is the caught error (normalized to an Error object).
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
 * @returns {Promise<AttemptSuccess<Awaited<U>|Awaited<V>, E>|AttemptFailure<R>} A Promise resolving to a new `AttemptResult` from the callback execution,
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
		return fail(signal.reason);
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
		let result = succeed(NONE);

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
	if (result instanceof FailureTuple) {
		throw result.error;
	}
}

export const createSafeCallback = createSafeAsyncCallback;
export const attempt = attemptAsync;

// Aliased to avoid confusion with types
export { SuccessTuple as AttemptSuccess, FailureTuple as AttemptFailure };
