# GitHub Copilot Chat — Project Instructions (FanEngagement)

These instructions tell GitHub Copilot **how to behave inside VS Code** when assisting with this repository.  
For full technical documentation, Copilot should reference `.github/copilot-coding-agent-instructions.md`.

---

## 1. Global Rules for All Interactions

- **Always propose a plan first** before modifying files.  
- **Never delete code** unless explicitly instructed.  
- **Never introduce new external dependencies** without justification and approval.  
- **Prefer minimal diffs** and backward‑compatible changes.  
- **Ensure the build compiles** after suggested changes.  
- **Follow repository patterns** (backend layering, React frontend patterns).  
- **If schema changes occur**, remind the user to create an EF migration.  
- **Ask clarifying questions** when requirements are unclear.  
- **Generate complete, ready‑to‑use code** when providing snippets.

---

## 2. What Copilot Should Reference for Context

When answering questions or generating changes, use:

- `.github/copilot-coding-agent-instructions.md` — full architecture rules  
- `docs/architecture.md` — domain, lifecycle, authorization, governance  
- Backend folder structure for pattern matching  
- Frontend folder structure for routing and UI consistency  
- `FanEngagement.Tests` for test conventions  
- EF Core migrations folder for schema conventions  

Copilot should **follow existing patterns** instead of inventing new ones.

---

## 3. Project Overview (High‑Level)

FanEngagement is a multi‑tier system:

- **Backend**: .NET 9 Web API  
- **Database**: PostgreSQL + EF Core  
- **Frontend**: React 19 + TypeScript + Vite  
- **Authentication**: JWT with Admin, OrgAdmin, Member roles  
- **Governance**: proposals, votes, share types, balances  
- **Admin & Member portals**: role‑based routing and UI  

All changes must respect these patterns.

---

## 4. When User Requests Code Changes

Copilot Chat must:

1. **Restate the user’s request**  
2. **Propose a clear plan**  
3. **List the files that will be changed**  
4. Only then provide the code changes  

**Example response:**

```text
Here is the plan:
1. Modify X file to add Y
2. Update Z service method
3. Add a new test in ...
```

---

## 5. Backend Guidance

Copilot must:

- Follow **API → Application → Domain → Infrastructure** layering  
- Use dependency injection with primary constructors  
- Include `CancellationToken` in async APIs  
- Use domain services (`ProposalGovernanceService`, `VotingPowerCalculator`)  
- Use structured logging  
- Use ProblemDetails error responses  
- Suggest tests using `WebApplicationFactory`  
- Remind user to create EF migrations when needed  

---

## 6. Frontend Guidance

Copilot must:

- Use existing API client modules instead of creating new ones  
- Use `usePermissions()`, `OrgAdminRoute`, `PlatformAdminRoute` consistently  
- Use established UI components:
  - `LoadingSpinner`
  - `ErrorMessage`
  - `EmptyState`
  - Notification system  
- Use `useAsync` where helpful  
- Use `data-testid` for new DOM elements  
- Follow the routing and layout patterns already in place  

### Organization Navigation Model

The application uses a centralized organization navigation model:

1. **Organization Switcher**: Located in the AdminLayout sidebar, allows users to switch between organizations they belong to.

2. **Role-based Navigation**: Navigation items appear/disappear based on the user's role in the currently selected organization:
   - **OrgAdmin role**: Shows full org admin sub-nav (Overview, Memberships, Share Types, Proposals, Webhook Events)
   - **Member role**: Shows message with link to member view, hides org admin tools

3. **Mixed-role Users**: Users who are OrgAdmin in one org and Member in another:
   - See all their organizations in the switcher
   - Get org admin tools when viewing their admin org
   - Get member-level view when viewing their member org
   - The sidebar dynamically updates based on selected org

4. **Navigation Configuration**: Defined in `frontend/src/navigation/navConfig.ts`:
   - Items have `scope` property: 'global', 'org', or 'user'
   - Items have `roles` property to control visibility
   - Org-scoped items only appear when user has OrgAdmin role for active org

---

## 7. What Copilot Should Avoid

- Creating new architectural patterns  
- Producing untested or untestable code  
- Adding npm/nuget dependencies without explicit approval  
- Mixing concerns between layers  
- Modifying EF migration history  
- Inventing domain rules  
- Suggesting nonstandard HTTP responses  
- Bypassing validation or authorization patterns  

---

## 8. Future Improvements Workflow

When the user asks to “log” an idea:

- Update `docs/future-improvements.md`  
- Add a new `###` heading  
- Provide a short description and optional bullets  
- Never place future ideas in random files or PRs  

---

## 9. Clarification Rules

Copilot must ask clarifying questions when:

- Requirements conflict or are ambiguous  
- Domain rules may be violated  
- A change affects database schema  
- A change affects authorization  
- A change affects multi‑org behavior  
- A change affects routing or major UI flows  

---

## 10. Summary

This file defines **how GitHub Copilot Chat behaves** inside VS Code:  

- Follow global rules  
- Use minimal diffs  
- Confirm before editing  
- Respect repository architecture  
- Reference deeper docs when needed  
Technical details live in `.github/copilot-coding-agent-instructions.md`.
