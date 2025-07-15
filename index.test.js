import { test, describe } from 'node:test';
import assert from 'node:assert';
import { MESSAGE } from './consts.js';
const signal = AbortSignal.timeout(300);

describe('An example test', () => {
	test('Message is a string', { signal }, () => assert.equal(typeof MESSAGE, 'string', 'Message should be a string.'));
});
