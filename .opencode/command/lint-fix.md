---
description: Fix linting issues across the codebase
agent: lint
---

Fix linting and formatting issues across the codebase.

## Lint Fix Output

### Frontend (ESLint + Prettier)

```
!`cd frontend && npm run lint -- --fix`
```

### Backend (dotnet format)

```
!`dotnet format backend/FanEngagement.sln`
```

## Instructions

1. Review the output above
2. Report what was fixed automatically
3. If there are errors that couldn't be auto-fixed:
   - List them with file locations
   - Suggest manual fixes

## What Gets Fixed

### Frontend
- ESLint rule violations
- Prettier formatting (indentation, quotes, semicolons)
- Import ordering
- Unused imports

### Backend
- C# code style per `.editorconfig`
- Namespace organization
- Using directive ordering
- Whitespace and indentation

## Manual Review Needed

Some issues require manual intervention:
- Complex type errors
- Logic-related lint warnings
- Deprecated API usage
- Security-related warnings

## Adapter Linting

To lint blockchain adapters:

```bash
cd adapters/solana && npm run lint
cd adapters/polygon && npm run lint
```
