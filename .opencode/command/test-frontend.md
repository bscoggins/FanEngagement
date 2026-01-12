---
description: Run frontend Vitest tests
agent: test
---

Run the frontend test suite and analyze the results.

## Test Output

```
!`./scripts/test-frontend`
```

## Instructions

1. Review the test output above
2. If all tests pass, confirm success
3. If tests fail:
   - Identify the failing tests
   - Analyze the failure messages and stack traces
   - Suggest fixes for each failure
   - Check if snapshots need updating

## Test Location

Frontend tests are located in `frontend/src/` alongside their components (`.test.ts` or `.test.tsx` files).

## Common Issues

- **Snapshot mismatches**: Run `npm test -- -u` to update snapshots if changes are intentional
- **Missing dependencies**: Run `cd frontend && npm ci`
- **Mock issues**: Check that API mocks in `frontend/src/test/` are up to date

## Useful Commands

- Watch mode: `cd frontend && npm test -- --watch`
- Coverage: `cd frontend && npm test -- --coverage`
- Single file: `cd frontend && npm test -- MyComponent.test.tsx`
