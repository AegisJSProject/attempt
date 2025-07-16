# @aegisjsproject/attempt

Run synchronous and asynchronous code without throwing errors.

This is a *tiny* (about 750 bytes when minified & gzipped) library to help avoid `try / catch` and uncaught errors.
It has 100% test coverage and extensive JSDocs.

[![CodeQL](https://github.com/AegisJSProject/attempt/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/AegisJSProject/attempt/actions/workflows/codeql-analysis.yml)
![Node CI](https://github.com/AegisJSProject/attempt/workflows/Node%20CI/badge.svg)
![Lint Code Base](https://github.com/AegisJSProject/attempt/workflows/Lint%20Code%20Base/badge.svg)

[![GitHub license](https://img.shields.io/github/license/AegisJSProject/attempt.svg)](https://github.com/AegisJSProject/attempt/blob/master/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/AegisJSProject/attempt.svg)](https://github.com/AegisJSProject/attempt/commits/master)
[![GitHub release](https://img.shields.io/github/release/AegisJSProject/attempt?logo=github)](https://github.com/AegisJSProject/attempt/releases)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/shgysk8zer0?logo=github)](https://github.com/sponsors/shgysk8zer0)

[![npm](https://img.shields.io/npm/v/@aegisjsproject/attempt)](https://www.npmjs.com/package/@aegisjsproject/attempt)
![node-current](https://img.shields.io/node/v/@aegisjsproject/attempt)
![npm bundle size gzipped](https://img.shields.io/bundlephobia/minzip/@aegisjsproject/attempt)
[![npm](https://img.shields.io/npm/dw/@aegisjsproject/attempt?logo=npm)](https://www.npmjs.com/package/@aegisjsproject/attempt)

[![GitHub followers](https://img.shields.io/github/followers/shgysk8zer0.svg?style=social)](https://github.com/shgysk8zer0)
![GitHub forks](https://img.shields.io/github/forks/AegisJSProject/attempt.svg?style=social)
![GitHub stars](https://img.shields.io/github/stars/AegisJSProject/attempt.svg?style=social)
[![Twitter Follow](https://img.shields.io/twitter/follow/shgysk8zer0.svg?style=social)](https://twitter.com/shgysk8zer0)

[![Donate using Liberapay](https://img.shields.io/liberapay/receives/shgysk8zer0.svg?logo=liberapay)](https://liberapay.com/shgysk8zer0/donate "Donate using Liberapay")
- - -

- [Code of Conduct](./.github/CODE_OF_CONDUCT.md)
- [Contributing](./.github/CONTRIBUTING.md)
<!-- - [Security Policy](./.github/SECURITY.md) -->

## Bulletproof Error Handling for Modern JavaScript

**Tiny footprint, maximum utility.** At under 1KB, this library provides comprehensive error handling without bloating your bundle - essential for performance-critical applications.

**Zero runtime overhead for success cases.** Unlike try-catch blocks that require stack unwinding, successful operations return immediately with lightweight frozen tuples.

**Bulletproof error normalization.** All errors become proper `Error` objects with consistent structure, preventing the security and debugging issues that come from arbitrary thrown values.

**Functional composition ready.** The Result pattern enables clean error handling in pipelines without breaking function composition or requiring nested exception handling.

**Idempotent operations.** `succeed()` and `fail()` safely handle already-wrapped results, preventing double-wrapping bugs common in complex error handling chains.

**Sync/async parity.** Identical APIs for synchronous and asynchronous operations mean consistent error handling patterns across your entire codebase.

**Immutable by design.** All results are frozen tuples with hidden metadata, preventing accidental mutations while maintaining type safety through symbol-based internal state.

**Production-hardened.** 100% test coverage, security-focused implementation, and battle-tested patterns borrowed from languages like Rust and Go.

## Installation

### NPM
```bash
npm i @aegisjsproject/attempt
```

### Using [`<script type="importmap">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)

```html
<script type="importmap">
  {
    "imports": {
      "@aegisjsproject/attempt": "https://unpkg.com/@aegisjsproject/attempt@1.0.0/attempt.min.js"
    }
  }
</script>
```

## The Simple API

| helper                                                | description                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **`attemptAsync(fn, …args)`**<br>`attempt(fn, …args)` | Runs `fn` (sync or async) via `Promise.try`. **Returns:** `Promise<[value, error]>`.                 |
| **`attemptSync(fn, …args)`**                          | Runs a **synchronous** function. **Returns:** `[value, error]`. Throws `TypeError` if `fn` is async. |
| **`createSafeAsyncCallback(fn)`**                     | Decorates any function once → returns a proxy that **always** yields `Promise<[value, error]>`.      |
| **`createSafeSyncCallback(fn)`**                      | Decorates a *sync* function → returns a proxy that yields `[value, error]`.                          |
| **`createSafeCallback`**                              | Alias of `createSafeAsyncCallback`.                                                                  |
| **`succeed(value)`**                                  | Force a frozen `[value, null]` tuple.                                                                |
| **`fail(err)`**                                       | Force a frozen `[null, Error]` tuple (normalises non‑Error throws).                                  |
| **`isAttemptResult(result)`**                         | Checks is a value is a valid `[value, error]` tuple as created by `succeed()` or `fail()`.           |
| **`succeeded(result)`**                               | Checks is a value is a valid `[value, null]` tuple as created by `succeed()`.                        |
| **`failed(result)`**                                  | Checks is a value is a valid `[null, error]` tuple as created by `fail()`.                           |
| **`getResultValue(result)`**                          | Gets the `AttemptResult` value if successful or `null` otherwise.                                    |
| **`getResultError(result)`**                          | Gets the `AttemptResult` error if failed or `null` otherwise.                                        |
| **`handleResultAsync(result, { success, failure })`** | Handles an `AttemptResult` asynchronously by invoking the appropriatecallback.                       |
| **`handleResultSync(result, { success, failure })`**  | Handles an `AttemptResult` synchronously by invoking the appropriate callback.                       |
| **`throwIfFailed(result)`**                           | Handle errors the typical `try/catch` way by throwing the error in an `AttemptFailure`.              |

## Requirements

This library requires [Promise.try()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/try) to work.
As of July of 2025, it has > 80% support, and polyfills are simple and readily available.

## Usage Examples

```js
import { attemptAsync, createSafeSyncCallback, createSafeAsyncCallback } from '@aegisjsproject/attempt';

const unsafeFunction = (num) => {
  if (num > 0.5) {
    throw new Error(`${num} is greater than 0.5`);
  } else {
    return num;
  }
};

const safeFunction = createSafeSyncCallback(unsafeFunction);
const safeParse = createSafeSyncCallback(JSON.parse);
const safeFetch = createSafeAsyncCallback(async (url, init) => {
  const resp = await fetch(url, init);

  if (resp.ok) {
    return await resp.json();
  } else {
    throw new Error(`${resp.url} [${resp.status}]`);
  }
});

const [num, err] = safeFunction(Math.random()); // 50% chance of throwing, but it'll return the error instead
safeParse('{Invalid JSON}');

const [value, error] = await attemptAsync(fetch, '/api', { signal: AbortSignal.abort('Request cancelled') });
if (error) { … }           // always an Error instance
else       { …value… }     // may be any value (even null/undefined)
```
