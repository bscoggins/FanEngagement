# Story E-008-31: Automated Accessibility Testing

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** D – Accessibility Remediation  
**Priority:** Now  
**Status:** Proposed

## User Story

> As a **QA engineer**, I want **automated accessibility testing in CI**, so that **accessibility regressions are caught early**.

## Acceptance Criteria

- [ ] Axe-core or pa11y integrated into CI pipeline
- [ ] Tests run on all pages (or representative sample)
- [ ] CI fails if critical accessibility issues detected
- [ ] Test report generated and saved as artifact
- [ ] Documentation for running tests locally

## Implementation Notes

- Use `@axe-core/playwright` or `pa11y-ci`
- Add to GitHub Actions workflow

## Files to Change

- `.github/workflows/` (CI configuration)
- `playwright.config.ts` (test configuration)
