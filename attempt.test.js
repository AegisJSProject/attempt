import '@shgysk8zer0/polyfills';
import { describe, test } from 'node:test';
import { ok, strictEqual, doesNotReject, rejects, throws, deepStrictEqual, fail as failTest } from 'node:assert';
import {
	attemptAsync, attemptSync, createSafeSyncCallback, createSafeAsyncCallback, succeed, fail, succeeded,
	failed, isAttemptResult, getResultError, getResultValue, handleResultAsync, handleResultSync, throwIfFailed,
	getAttemptStatus, SUCCEEDED, FAILED,
} from './attempt.js';

describe('Test `attempt` library', async () => {
	/**
	 *
	 * @param {string} msg
	 * @throws {Error}
	 */
	const err = (msg = 'I throw') => {
		throw new Error(msg);
	};

	/**
	 *
	 * @param {string} result
	 * @returns {string}
	 */
	const returns = (result = 'I return') => result;

	const signal = AbortSignal.timeout(1_000);

	test('Test that it does not throw', { signal }, async () => {
		await doesNotReject(() => attemptAsync(err, 'Should not throw.'), 'Errors should not be thrown.');
	});

	test('Verify valid results/tuples', { signal }, () => {
		const good = succeed(true);
		const bad = fail(new Error('forced failure.'));

		ok(isAttemptResult(good), 'Should return a frozen tuple with a hidden status.');
		ok(succeeded(good), 'Should be a valid result with a successful status.');
		ok(failed(bad), 'Should be a valid result with a failed status.');
		ok(getResultValue(good), 'Should return the value given by a successful attempt.');
		ok(getResultError(bad) instanceof Error, 'Should return the error of a failed attempt.');
		throws(() => getResultValue(bad), 'Failed attempts  throw TypeError when attempting to get value.');
		throws(() => getResultError(good), 'Successful attempts throw TypeError when attempting to get error.');
		ok(failed(fail(null)), 'Should be a valid result with a failed status when passing `null` to `fail()`.');
		strictEqual(succeed(good), good, 'Duplicate `succeed()`/`fail()` on results should return original value.');
		strictEqual(fail(bad), bad, 'Duplicate `succeed()`/`fail()` on results should return original value.');
	});

	test('Test forced succeed/fail returns', { signal }, () => {
		const [result1, err1] = succeed('This should succeed.');
		const [result2, err2] = fail('This should error.');

		strictEqual(result1, 'This should succeed.', '`succeed()` should have the expected result.');
		strictEqual(err1, null, '`succeed()` should not return an error.');
		strictEqual(result2, null, '`fail()` should not return a result.');
		ok(err2 instanceof Error, '`fail()` should return an error.');
	});

	test('Test return tuples.', { signal }, () => {
		const msg = 'Hello, World!';
		const [result1, error1] = attemptSync(returns, msg);
		const [result2, error2] = attemptSync(err, 'I should throw');

		strictEqual(error1, null, 'Successful path should not return an error.');
		strictEqual(result1, msg, 'Returned result should match expectations.');
		strictEqual(result2, null, 'Failed attempts should not return a value.');
		ok(error2 instanceof Error, 'Failed attempts should return an error.');
	});

	test('`attemptAsync()` should throw if callback is not a function.', { signal }, async () => {
		await rejects(() => attemptAsync('Not a function.'), '`attemptAsync()` should throw if callback is not a function.');
	});

	test('`attemptSync()` should throw if callback is invalid.', { signal }, () => {
		throws(() => attemptSync('Not a function.'), '`attemptSync()` should throw if callback is not a function.');
		throws(() => attemptSync(async () => null), '`attemptSync()` should throw if callback is an async function.');
	});

	test('Test `createCallbackSync()`', { signal }, () => {
		const data = {foo: 'bar'};
		const parse = createSafeSyncCallback(JSON.parse);
		const [parsed, err] = parse(JSON.stringify(data));
		const [failed, error] = parse('{Invalid JSON}');

		deepStrictEqual(parsed, data, 'Safe callbacks should return expected results.');
		strictEqual(err, null, 'Successfull callbacks should not return an error.');
		strictEqual(failed, null, 'Errored callbacks should not return results.');
		ok(error instanceof Error, 'Failed callbacks should return an error.');
	});

	test('Test `createCallbackAsync()`', { signal }, async () => {
		const data = {foo: 'bar'};
		const parse = createSafeAsyncCallback(JSON.parse);
		const [parsed, err] = await parse(JSON.stringify(data));
		const [failed, error] = await parse('{Invalid JSON}');

		deepStrictEqual(parsed, data, 'Safe callbacks should return expected results.');
		strictEqual(err, null, 'Successfull callbacks should not return an error.');
		strictEqual(failed, null, 'Errored callbacks should not return results.');
		ok(error instanceof Error, 'Failed callbacks should return an error.');
		throws(() => throwIfFailed(handleResultSync(err, {})), 'Default error handle should return an `AttemptFailure`.');
	});

	test('Test asynchronously handling results', { signal }, async () => {
		const result = succeed('Success.');
		const err = fail(new Error('Failure.'));

		rejects(() => handleResultAsync(['invlid'], {}));
		rejects(() => handleResultAsync(result, { success: null }), 'Invalid success callback should throw a TypeError.');
		rejects(() => handleResultAsync(result, { failure: null }), 'Invalid failuer callback should throw a TypeError.');
		throws(() => throwIfFailed(err), 'Failed result should throw its error.');

		throwIfFailed(handleResultAsync(result, {
			failure: failTest,
		}));


		throwIfFailed(handleResultAsync(err, {
			success: () => failTest('Failed test triggered success branch of handler.'),
			failure: () => null,
		}));

		rejects(async () => throwIfFailed(await handleResultAsync(err, {})), 'Default error handle should return an `AttemptFailure`.');
	});

	test('Test synchronously handling results', { signal }, async () => {
		const result = succeed('Successful results should be handled by `success` handler.');
		const err = fail(new TypeError('Failed results should be handled by `failure` handler.'));

		throws(() => handleResultSync(['invalid']));
		throws(() => handleResultSync(result, { success: null }), 'Invalid success callback should throw a TypeError.');
		throws(() => handleResultSync(result, { failure: null }), 'Invalid failuer callback should throw a TypeError.');

		throwIfFailed(handleResultSync(result, {
			failure: failTest,
		}));

		throwIfFailed(handleResultSync(err, {
			success: () => failTest('Failed test triggered success branch of handler.'),
			failure: console.info,
		}));
	});

	test('Test result status', { signal }, () => {
		const result = succeed('Successful results should be handled by `success` handler.');
		const err = fail(new TypeError('Failed results should be handled by `failure` handler.'));

		strictEqual(getAttemptStatus(result), SUCCEEDED, 'Result should have a status of `SUCCEEDED`.');
		strictEqual(getAttemptStatus(err), FAILED, 'Result should have a status of `FAILED`.');
		throws(() => getAttemptStatus('invalid'), 'Invalid results should throw a TypeError.');
	});
});
