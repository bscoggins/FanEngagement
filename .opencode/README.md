# OpenCode Configuration — FanEngagement

This directory contains OpenCode-specific configuration for the FanEngagement project.

## Directory Structure

```
.opencode/
├── README.md           # This file
├── agent/              # Specialized subagent definitions
│   ├── docs.md         # Documentation specialist
│   ├── test.md         # QA/testing specialist
│   ├── lint.md         # Code style specialist
│   ├── frontend.md     # Frontend/UI specialist
│   ├── research.md     # Architecture research
│   └── security.md     # Security auditor
└── command/            # Custom slash commands
    ├── test-backend.md # Run backend tests
    ├── test-frontend.md# Run frontend tests
    ├── test-all.md     # Run all unit tests
    ├── e2e.md          # Run Playwright E2E
    ├── build.md        # Build all projects
    ├── lint-fix.md     # Fix linting issues
    ├── migrate.md      # Create EF migration
    ├── dev-up.md       # Start dev environment
    └── review.md       # Code review
```

## Related Files

| File | Purpose |
|------|---------|
| `/AGENTS.md` | Main OpenCode rules and instructions |
| `/opencode.json` | OpenCode configuration (agents, commands, formatters, MCP) |

## Usage

### Agents

Invoke specialized agents using `@` mentions:

```
@docs Update the README with the new API endpoints
@test Create tests for the new UserService methods
@frontend Fix the accessibility issues in the navigation
@security Audit the authentication flow for vulnerabilities
```

### Commands

Run custom commands using `/`:

```
/test-backend      # Run backend xUnit tests
/test-frontend     # Run frontend Vitest tests
/test-all          # Run all unit tests
/e2e               # Run Playwright E2E tests
/build             # Build all projects
/lint-fix          # Fix linting issues
/migrate AddNewField  # Create EF migration
/dev-up            # Start dev environment
/review            # Review current changes
```

## Relationship to GitHub Copilot

This project also includes GitHub Copilot configuration in `.github/`:

- `.github/copilot-instructions.md` — VS Code Copilot Chat behavior
- `.github/copilot-coding-agent-instructions.md` — Copilot Coding Agent guide
- `.github/agents/*.agent.md` — Specialized Copilot agents

The OpenCode and GitHub Copilot configurations are independent and can coexist. Each uses its own directory structure and file formats.
