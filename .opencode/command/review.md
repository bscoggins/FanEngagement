---
description: Review current code changes
subtask: true
---

Review the current code changes in this repository.

## Current State

### Git Status

```
!`git status`
```

### Current Diff

```
!`git diff`
```

### Staged Changes

```
!`git diff --cached`
```

## Review Instructions

Analyze the changes above for:

### 1. Code Quality
- Does the code follow project conventions?
- Are there any code smells or anti-patterns?
- Is the code readable and well-organized?

### 2. Potential Bugs
- Are there edge cases not handled?
- Are there null/undefined checks missing?
- Are error conditions handled properly?

### 3. Security Considerations
- Are there any security vulnerabilities introduced?
- Is sensitive data handled appropriately?
- Are authorization checks in place?

### 4. Test Coverage
- Do the changes include appropriate tests?
- Are edge cases tested?
- Do existing tests still pass?

### 5. Documentation
- Are code comments clear and accurate?
- Do public APIs have documentation?
- Should README or other docs be updated?

## Output Format

Provide feedback in this format:

### Summary
Brief overview of the changes.

### Findings
List issues found, categorized by severity:
- **Critical**: Must fix before merge
- **Warning**: Should fix, but not blocking
- **Suggestion**: Nice to have improvements

### Recommendations
Specific actions to address the findings.
