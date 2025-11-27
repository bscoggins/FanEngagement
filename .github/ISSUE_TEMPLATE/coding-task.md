---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] "
labels: ["development", "copilot"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Provide a brief description of the change.

Example:

- Add a new endpoint for listing open proposals.
- Update OrgAdmin dashboard to include webhook error counts.
- Implement frontend UI for managing share types.

---

## 2. Requirements

List the concrete functional requirements.

Examples:

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`).
- New API must support pagination.
- Frontend should include loading, error, and empty states.
- Must respect authorization rules (OrgAdmin only, Member-only, etc.)

---

## 3. Acceptance Criteria (Testable)

Use checkbox format so the agent can validate its work and so the PR reviewer can confirm.

Examples:

- [ ] All new backend endpoints include `CancellationToken`.
- [ ] DTOs and validators created/updated as needed.
- [ ] Unit tests added in `FanEngagement.Tests`.
- [ ] Frontend matches existing patterns (permissions, notifications, async handling).
- [ ] Documentation updated (README, architecture, or usage docs as needed).
- [ ] EF Core migration created if schema changes occur.
- [ ] All tests pass (`dotnet test`, `npm test`).

---

## 4. Constraints

Define boundaries.

- Avoid refactoring unrelated code.
- No new external dependencies unless explicitly approved.
- Maintain backward compatibility unless stated otherwise.
- Follow naming and architectural conventions documented in `.github/copilot-coding-agent-instructions.md`.

Optional constraints:

- Only modify backend files.
- Only modify frontend files.
- No database schema changes.
- Stick to minor UI adjustments.

---

## 5. Technical Notes (Optional)

Include any relevant links, code references, or hints:

Examples:

- “The existing API for proposals is here: `backend/FanEngagement.Api/Controllers/ProposalsController.cs`”
- “Mirroring the style used in `/me/organizations` list.”
- “Consider adding a method to `IProposalService`.”

---

## 6. Desired Agent

Select one:

- [ ] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Specify the permitted files or folders.

Examples:
Allowed:
- backend/FanEngagement.Api/**
- backend/FanEngagement.Application/**
- backend/FanEngagement.Domain/**
- backend/FanEngagement.Infrastructure/**

Optional:
- frontend/**
- docs/**

If uncertain, you may leave this blank and the agent will infer based on requirements.

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`, `npm test`)
- Notes on risks or migrations
- Confirmed adherence to architecture and authorization rules
