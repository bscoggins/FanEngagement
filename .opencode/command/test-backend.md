---
description: Run backend xUnit tests
agent: test
---

Run the backend test suite and analyze the results.

## Test Output

```
!`./scripts/test-backend`
```

## Instructions

1. Review the test output above
2. If all tests pass, confirm success
3. If tests fail:
   - Identify the failing tests
   - Analyze the failure messages
   - Suggest fixes for each failure
   - Prioritize by severity (compilation errors > assertion failures > warnings)

## Test Location

Backend tests are located in `backend/FanEngagement.Tests/`

## Common Issues

- **Connection errors**: Ensure PostgreSQL is running (`docker compose up -d db`)
- **Migration issues**: Run `dotnet ef database update` if schema is out of sync
- **Dependency issues**: Run `dotnet restore backend/FanEngagement.sln`
