# Story E-008-01: Navigation Redesign

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** A – Navigation Redesign  
**Theme:** T1/T2 – Member Engagement & OrgAdmin Efficiency  
**Priority:** Now  
**Status:** Proposed

---

## Summary

Redesign navigation across all user roles (Member, OrgAdmin, PlatformAdmin) with clear visual indicators, improved organization switcher, consistent sub-navigation, keyboard accessibility, and mobile-friendly layouts. Focus on eliminating user confusion about "where am I" and "how do I get there."

---

## User Problem & Context

**Pain Points:**
- Users get lost when switching between dashboard, admin, and profile flows
- Organization switcher confuses users with mixed roles (OrgAdmin in one org, Member in another)
- Deep links fail to restore proper navigation context
- No breadcrumbs on deeply nested admin pages
- Keyboard navigation is inconsistent or broken
- Mobile navigation lacks touch-friendly tap targets

**Support Ticket Data:**
- 40% of support tickets are "where is the [feature] page?"
- Users report "feeling lost" after switching organizations
- Screen reader users report navigation is "impossible to use"

**Analytics Observations:**
- High bounce rate on admin pages (users can't find next step)
- Low usage of org admin tools (users don't know they exist)
- Mobile navigation shows high drop-off rate

---

## Desired Outcome

**Business Impact:**
- Reduce navigation-related support tickets by 60%
- Increase org admin tool usage by 35%
- Improve user satisfaction scores (NPS) by 15+ points
- Enable seamless multi-org workflows

**User Experience:**
- Users always know where they are (active state, breadcrumbs, page titles)
- Organization switcher clearly shows user's role in each org
- Navigation adapts to user context (role, active org)
- Keyboard users can navigate efficiently without mouse
- Mobile users have thumb-friendly navigation

---

## Style Direction

**Primary Direction:** Minimalist / Calm with expressive accents for key actions

**Design Principles:**
- **Clarity over complexity**: Remove visual noise; emphasize hierarchy
- **Consistency**: Same patterns across all pages and roles
- **Accessibility first**: Keyboard and screen reader support baked in
- **Responsive**: Mobile-first approach with graceful scaling

**Visual Treatment:**
- Active nav items: Bold text + colored left border or underline
- Breadcrumbs: Subtle gray with chevron separators
- Org switcher: Dropdown with role badges (pill-shaped, colored by role)
- Focus ring: 2px solid accent color with subtle shadow

---

## Inspiration / References

**Internal References:**
- Existing `navConfig.ts` structure (scope, roles, order)
- Current `AdminLayout.tsx` and `PlatformAdminLayout.tsx` patterns
- Organization switcher pattern in `OrganizationSelector.tsx`

**External Inspiration:**
- **Linear.app**: Clean sidebar navigation with role-based views
- **Notion**: Nested navigation with clear active states and breadcrumbs
- **GitHub**: Org switcher with role indicators and quick search
- **Tailwind UI Navigation Examples**: Modern responsive patterns

**Design Systems:**
- Radix UI navigation patterns (accessible by default)
- Shadcn UI navigation components (clean, minimal)
- Material Design 3 navigation rail (mobile/tablet inspiration)

---

## Main Responsibilities

### New Components or Refactors (React + Tailwind/Vite stack)
- [ ] Breadcrumb component (auto-generated from route config)
- [ ] Enhanced OrganizationSelector with role badges
- [ ] Mobile navigation drawer (hamburger menu)
- [ ] Skip links for keyboard accessibility

### Navigation Configuration
- [ ] Update `navConfig.ts` with improved item organization
- [ ] Add metadata for breadcrumb generation
- [ ] Define keyboard shortcuts (optional)

### Layout Updates
- [ ] Update `AdminLayout.tsx` with consistent sub-nav rendering
- [ ] Update `PlatformAdminLayout.tsx` with quick action shortcuts
- [ ] Update `Layout.tsx` with mobile nav support

### Motion / Micro-interactions
- [ ] Active state transitions (subtle highlight animation)
- [ ] Org switcher dropdown fade-in with scale
- [ ] Mobile nav drawer slide-in animation

### Accessibility Review + Fixes
- [ ] ARIA labels for all navigation links
- [ ] Keyboard navigation (arrow keys, Enter, Escape)
- [ ] Focus ring with design token
- [ ] Skip link to main content
- [ ] Screen reader announcements for org switching

---

## Functional Requirements

### Data Flows
- Use existing `useActiveOrganization()` hook for org context
- Use `usePermissions()` for role-based nav item filtering
- Use `useNavigation()` hook to access resolved nav items
- Query `GET /users/me/organizations` for org switcher population

### State Management
- Active org stored in localStorage and context
- Active nav item determined from `useLocation()` (React Router)
- Breadcrumb trail generated from route matches

### API Hooks
- No new API endpoints required
- Use existing endpoints: `/users/me/organizations`
- Optimistic UI for org switching (update context immediately, fallback on error)

### Error Handling
- If org switching fails, show error toast and revert to previous org
- If user navigates to org they don't have access to, redirect to appropriate home route
- Handle missing or invalid org IDs gracefully (fallback to first org or user home)

---

## Guardrails / Constraints

### Performance
- Keep initial bundle size under 200KB (navigation is critical path)
- Navigation rendering must be <100ms on low-end devices
- Avoid heavy JavaScript animations (prefer CSS transforms)

### Accessibility Targets
- WCAG 2.1 AA compliance (color contrast, keyboard nav, ARIA)
- Screen reader tested with NVDA, JAWS, and VoiceOver
- Keyboard-only navigation tested (all features accessible without mouse)

### Browser Support
- Evergreen browsers (Chrome, Firefox, Safari, Edge latest versions)
- iOS Safari 14+ (mobile nav)
- Chrome Android 90+ (mobile nav)

### Constraints
- Must work with existing route structure (no route refactoring)
- Must not break existing E2E tests (maintain data-testid attributes)
- Must not introduce new dependencies (use existing libraries or plain CSS/JS)

---

## Brand & Tokens

### Color Tokens
- `--color-primary-600`: Active nav item highlight
- `--color-neutral-700`: Default nav item text
- `--color-neutral-400`: Inactive nav item text (hover to show)
- `--focus-ring-color`: Focus ring for keyboard navigation
- `--color-background-elevated`: Dropdown and mobile nav background

### Typography
- `--font-size-sm`: Breadcrumb text (14px)
- `--font-size-base`: Nav item text (16px)
- `--font-weight-medium`: Nav item text (500)
- `--font-weight-semibold`: Active nav item text (600)

### Spacing
- `--spacing-2`: Gap between breadcrumb items (8px)
- `--spacing-3`: Nav item padding (12px)
- `--spacing-4`: Section spacing in sidebar (16px)

### Shadows
- `--shadow-sm`: Org switcher dropdown
- `--shadow-md`: Mobile nav drawer

### Animations
- `--ease-out`: Org switcher dropdown fade-in
- `--ease-in-out`: Mobile nav drawer slide-in
- Duration: 200ms (fast, responsive feel)

---

## Acceptance Criteria

### Core Functionality
- [ ] Active nav items have distinct visual treatment (bold text + colored indicator)
- [ ] Breadcrumbs appear on nested admin pages (auto-generated from route config)
- [ ] Page titles match navigation labels for consistency
- [ ] URL structure reflects page hierarchy
- [ ] Org switcher shows role badge for each org ("Org Name (Admin)" or "Org Name (Member)")
- [ ] Switching orgs updates nav items and redirects to appropriate dashboard
- [ ] Org admin sub-nav appears consistently on all org-scoped pages
- [ ] Sub-nav items: Overview, Memberships, Share Types, Proposals, Webhook Events, Audit Log

### Keyboard Accessibility
- [ ] All nav items focusable and keyboard-activatable (Enter key)
- [ ] Visible focus ring on all focused elements (2px solid, high contrast)
- [ ] Tab order follows logical reading order
- [ ] Skip link to main content appears on Tab press
- [ ] Org switcher navigable with arrow keys, Enter to select, Escape to close
- [ ] Mobile nav closes on Escape key

### Mobile & Responsive
- [ ] Hamburger menu icon on mobile (< 768px breakpoint)
- [ ] Tapping hamburger opens full-screen or slide-out nav drawer
- [ ] Nav items have 44px minimum tap target size
- [ ] Org switcher accessible from mobile nav
- [ ] Active route highlighted in mobile nav
- [ ] Mobile nav closes on backdrop tap or close button

### Accessibility (WCAG 2.1 AA)
- [ ] All nav links have accessible names (ARIA labels or text content)
- [ ] Landmark roles present: `<nav>`, `<main>`, `<header>`
- [ ] Breadcrumbs use `<nav aria-label="Breadcrumb">`
- [ ] Org switcher button has `aria-label` and `aria-expanded`
- [ ] Screen reader announces org switch (ARIA live region)
- [ ] Tested with screen reader (NVDA, JAWS, or VoiceOver)

### Visual Polish
- [ ] Hover states on nav items (subtle background change)
- [ ] Active state transition (150ms ease-out)
- [ ] Org switcher dropdown fade-in animation (200ms)
- [ ] Mobile nav drawer slide-in animation (300ms)
- [ ] Respects `prefers-reduced-motion` media query (disables animations)

### Performance
- [ ] Navigation rendering < 100ms on low-end devices
- [ ] No layout shift during navigation render (CLS < 0.1)
- [ ] Bundle size increase < 10KB (navigation components)

### Testing
- [ ] Works on desktop (1280px+), tablet (768-1024px), and mobile (< 768px)
- [ ] Keyboard navigation tested (Tab, Shift+Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader tested (NVDA, JAWS, VoiceOver)
- [ ] Touch tested on real devices (iOS and Android)
- [ ] E2E tests updated (maintain existing test-ids)

---

## Files Allowed To Change

### Components
- `frontend/src/components/AdminLayout.tsx`
- `frontend/src/components/AdminLayout.css`
- `frontend/src/components/PlatformAdminLayout.tsx`
- `frontend/src/components/PlatformAdminLayout.css`
- `frontend/src/components/Layout.tsx`
- `frontend/src/components/Layout.css`
- `frontend/src/components/OrganizationSelector.tsx`

### New Components
- `frontend/src/components/Breadcrumb.tsx` (new)
- `frontend/src/components/MobileNav.tsx` (new)
- `frontend/src/components/SkipLink.tsx` (new)

### Configuration
- `frontend/src/navigation/navConfig.ts` (add breadcrumb metadata, keyboard shortcuts)

### Styles
- `frontend/src/index.css` (global focus ring styles)

### Documentation
- `docs/frontend/navigation.md` (new or updated)

---

## Required Deliverables

- [ ] Updated UI components/pages (AdminLayout, PlatformAdminLayout, Layout, OrganizationSelector)
- [ ] New Breadcrumb, MobileNav, SkipLink components
- [ ] Storybook stories for new components (optional but recommended)
- [ ] Design reference (screenshots or GIFs showing before/after)
- [ ] Playwright/visual tests adjusted for new navigation structure
- [ ] Documentation update (`docs/frontend/navigation.md`)

---

## Testing & Review Notes

### Commands to Run
```bash
# Frontend unit tests
npm test -- navigation

# Visual regression (if using)
npm run test:visual

# E2E tests
npm run test:e2e -- e2e/navigation.spec.ts

# Accessibility audit
npm run test:a11y
```

### Stakeholders
- **Product Owner**: Sign-off on visual design and UX flow
- **Frontend Team**: Code review and pair programming
- **Accessibility Lead**: Screen reader testing and audit
- **QA**: Cross-browser and device testing

### Review Checklist
- [ ] Mockups or Figma designs reviewed and approved
- [ ] Frontend agent implements navigation updates
- [ ] Code review completed (focus on accessibility and performance)
- [ ] Screen reader testing by accessibility lead
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS and Android)
- [ ] E2E tests passing with no regressions
- [ ] Documentation reviewed and published
- [ ] Stakeholder demo and sign-off

### Success Criteria for Review
- Navigation discoverability improved (user testing task completion increases)
- Zero critical accessibility violations (axe-core)
- Support tickets related to navigation decrease post-launch
- Positive feedback from users ("much easier to find things")

---

## Related Stories

- **E-008-02**: Organization switcher improvements (depends on this story's layout foundation)
- **E-008-03**: Org admin sub-nav consistency (builds on AdminLayout updates)
- **E-008-04**: Keyboard navigation enhancements (accessibility refinement)
- **E-008-06**: Mobile navigation (mobile-specific patterns)
- **E-008-09 to E-008-13**: Design system tokens (navigation uses these tokens)

---

## Notes

- This story establishes the navigation foundation for all subsequent UI/UX improvements
- Prioritize accessibility from the start (don't bolt it on later)
- Test with real screen readers and keyboard-only users early and often
- Get stakeholder feedback on mockups before implementation to avoid rework
- Consider: Start with desktop navigation, then adapt for mobile (mobile-first CSS but desktop-first UX design in this case)
