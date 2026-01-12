---
description: Run Playwright E2E tests
agent: test
---

Run the Playwright end-to-end test suite.

**Note**: This requires Docker to be running and may take several minutes.

## What This Does

1. Loads `.env.development`
2. Rebuilds the Docker Compose stack (db, api, frontend)
3. Waits for health checks to pass
4. Resets dev data via `/admin/reset-dev-data`
5. Runs Playwright tests inside the E2E container
6. Cleans up on success (preserves state on failure for debugging)

## Test Output

```
!`./scripts/run-e2e.sh`
```

## Instructions

1. Review the test output above
2. If all tests pass, confirm success
3. If tests fail:
   - Check `frontend/test-results/` for screenshots and traces
   - Open `frontend/playwright-report/index.html` for the HTML report
   - Use `npx playwright show-trace <trace.zip>` to debug traces
   - Identify flaky vs. genuine failures

## Test Location

E2E tests are located in `frontend/e2e/`

## Common Issues

- **Timeout waiting for services**: Check for lingering containers with `docker ps -a | grep fanengagement`
- **Stale containers**: Run `docker compose down -v` for a clean slate
- **Port conflicts**: Ensure ports 8080 and 3000 are available

## Debugging

- Run specific test: `cd frontend && npx playwright test e2e/my-test.spec.ts`
- Headed mode: `cd frontend && npx playwright test --headed`
- Debug mode: `cd frontend && npx playwright test --debug`
