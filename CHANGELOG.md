<!-- markdownlint-disable -->
# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.6] - 2025-08-13

### Added
- Add `Symbol.toStringTag` getters for `AttemptSuccess` & `AttemptFailure`, and `toString()` on `AttemptResult`

### Changed
- Refactor `attemptAll()` to simplify & improve performance

## [v1.0.5] - 2025-08-10

### Added
- Add `ok` property to result tuple, including as 3rd element 

### Removed
- No longer set internal status property in results

## [v1.0.4] - 2025-08-05

### Changed
- Refactor to use `AttemptResult` & `AttemtFailure` classes extending `Array` for better type safety and clarity.
- Improved type definitions for `AttemptSuccess` and `AttemptFailure`.

## [v1.0.3] - 2025-07-30

### Added
- Added `attemptAll` function to execute multiple callbacks sequentially, passing the result of each callback to the next.
- Add support for `AbortSignal`s in `handleResultAsync`

## [v1.0.2] - 2025-07-23

### Changed
- `handleResultAsync` & `handleResultSync` now throw `TypeError`s if `success` or `failure` are not functions

### Fixed
- Update README to reflect changes in result handling

## [v1.0.1] - 2025-07-22

### Added
- `getAttemptStatus`, `SUCCEEDED`, and `FAILED` exports for standardized status handling.

### Changed
- Improved type safety and clarity of `AttemptResult`, `AttemptSuccess`, and `AttemptFailure`.
- Enhanced `fail()` with additional overloads and better documentation.
- Refined value and error extraction utilities.
- Strengthened tests with stricter error handling and status checks.

## [v1.0.0] - 2025-07-16

Initial Release
