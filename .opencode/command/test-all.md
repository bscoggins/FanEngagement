---
description: Run all unit tests (backend + frontend)
agent: test
---

Run the complete unit test suite (backend and frontend) and analyze the results.

## Test Output

```
!`./scripts/run-tests.sh`
```

## Instructions

1. Review the test output above
2. The script runs backend tests first, then frontend tests
3. If all tests pass, confirm success
4. If tests fail:
   - Identify which suite failed (backend or frontend)
   - Analyze the failure messages
   - Suggest fixes prioritized by:
     1. Compilation errors
     2. Backend test failures
     3. Frontend test failures

## Test Locations

| Suite | Location | Framework |
|-------|----------|-----------|
| Backend | `backend/FanEngagement.Tests/` | xUnit |
| Frontend | `frontend/src/**/*.test.{ts,tsx}` | Vitest |

## Options

- Backend only: `./scripts/run-tests.sh --backend-only`
- Frontend only: `./scripts/run-tests.sh --frontend-only`

## Pre-requisites

- PostgreSQL running for backend integration tests
- Node.js dependencies installed (`cd frontend && npm ci`)
