---
description: Build all projects
---

Build all projects in the repository and report any errors.

## Build Output

### Backend (.NET)

```
!`dotnet build backend/FanEngagement.sln --configuration Release`
```

### Frontend (Vite)

```
!`cd frontend && npm run build`
```

## Instructions

1. Review the build output above
2. If both builds succeed, confirm success
3. If builds fail:
   - Identify the failing project(s)
   - Analyze error messages
   - Suggest fixes for each error
   - Prioritize by:
     1. Syntax errors
     2. Type errors
     3. Missing dependencies
     4. Warnings (if blocking)

## Build Artifacts

| Project | Output |
|---------|--------|
| Backend | `backend/FanEngagement.Api/bin/Release/net9.0/` |
| Frontend | `frontend/dist/` |

## Common Issues

### Backend
- **Missing packages**: Run `dotnet restore backend/FanEngagement.sln`
- **SDK version**: Ensure .NET 9 SDK is installed

### Frontend
- **Missing dependencies**: Run `cd frontend && npm ci`
- **Type errors**: Check TypeScript configuration in `frontend/tsconfig.json`
