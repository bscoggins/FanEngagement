---
name: "Coding Task"
about: "Strengthen password requirements"
title: "[Dev] E-006-05: Strengthen Password Requirements"
labels: ["development", "copilot", "security", "T3"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Strengthen password requirements to improve user account security. Increase minimum password length and add complexity requirements (uppercase, number, special character).

This story is part of **Epic E-006: Security Documentation Update and Enhancements**.

**Reference:** `docs/product/security-authorization-research-report.md`

---

## 2. Requirements

- Increase minimum password length to 12 characters
- Require at least one uppercase letter
- Require at least one number
- Require at least one special character
- Update validation messages to describe requirements clearly
- Update frontend registration to show requirements
- Follow existing validation patterns in the repository

---

## 3. Acceptance Criteria (Testable)

- [ ] Minimum password length increased to 12 characters
- [ ] Password must contain at least one uppercase letter
- [ ] Password must contain at least one number
- [ ] Password must contain at least one special character
- [ ] `CreateUserRequestValidator` updated with new rules
- [ ] Validation error messages clearly describe requirements
- [ ] Frontend registration form shows password requirements
- [ ] Existing tests updated to use compliant passwords
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Maintain backward compatibility for existing users (only applies to new passwords)
- Do not add new dependencies unless necessary
- Follow existing validation patterns
- Follow naming conventions documented in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes

**Current Password Validation (in CreateUserRequestValidator):**
```csharp
RuleFor(x => x.Password)
    .NotEmpty()
    .MinimumLength(8);
```

**Should Be:**
```csharp
RuleFor(x => x.Password)
    .NotEmpty()
    .MinimumLength(12)
    .WithMessage("Password must be at least 12 characters long")
    .Matches("[A-Z]")
    .WithMessage("Password must contain at least one uppercase letter")
    .Matches("[0-9]")
    .WithMessage("Password must contain at least one number")
    .Matches("[^a-zA-Z0-9]")
    .WithMessage("Password must contain at least one special character");
```

**Key Files to Modify:**
- `backend/FanEngagement.Application/Validators/CreateUserRequestValidator.cs`
- `frontend/src/pages/Register.tsx` (or similar registration component)

**Test Data Updates:**
- Update test passwords in `backend/FanEngagement.Tests/` to meet new requirements
- Example compliant password: `SecurePass123!`

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

Allowed:
- `backend/FanEngagement.Application/Validators/CreateUserRequestValidator.cs`
- `backend/FanEngagement.Tests/**`
- `frontend/src/**`

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test the work (`dotnet build`, `dotnet test`)
- Screenshot of updated frontend registration form
- Test results showing all tests pass
