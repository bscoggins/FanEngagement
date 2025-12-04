# Story E-008-09: Design System & Tokens

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** B – Design System & Tokens  
**Theme:** T1/T2 – Member Engagement & OrgAdmin Efficiency  
**Priority:** Now  
**Status:** Proposed

---

## Summary

Establish a comprehensive design system with CSS custom properties (tokens) for colors, typography, spacing, shadows, and radii. Create the foundation for consistent, themeable, and maintainable UI development across the entire application.

---

## User Problem & Context

**Pain Points:**
- Inconsistent colors, spacing, and typography across pages (visual inconsistency)
- Hardcoded magic numbers make maintenance difficult (technical debt)
- Difficult to theme or apply global style changes (no design system)
- Developers unsure which colors or spacing to use (lack of guidance)
- Slow development velocity due to repeated style decisions (decision fatigue)

**Current State:**
- CSS styles scattered across component files with hardcoded values
- No centralized color palette or typography scale
- Inconsistent spacing leading to misaligned elements
- No documentation for design decisions

**Impact:**
- Poor brand consistency across pages
- Slower feature development (reinventing styles each time)
- Higher maintenance burden (changes require updating many files)
- Difficult to onboard new frontend developers

---

## Desired Outcome

**Business Impact:**
- Accelerate frontend development velocity by 30%
- Reduce style-related bugs and inconsistencies by 70%
- Enable future dark mode implementation with minimal effort
- Improve brand perception with consistent visual language

**Developer Experience:**
- Clear, documented design tokens for all style decisions
- No more guessing which color or spacing to use
- Easy theming and global style changes
- Improved code maintainability and readability

**User Experience:**
- Consistent visual language across all pages
- Cohesive brand experience
- Smooth transition to dark mode (future)

---

## Style Direction

**Primary Direction:** Minimalist / Calm with expressive accents

**Design System Principles:**
- **Consistency**: Every design decision has a token
- **Simplicity**: Constrained palette and scale (opinionated choices)
- **Accessibility**: Built-in contrast and readability
- **Flexibility**: Tokens support light/dark modes and customization
- **Performance**: CSS custom properties with zero runtime cost

**Color Strategy:**
- **Brand Colors**: Primary (blue), Secondary (gray), Accent (green for success)
- **Semantic Colors**: Success, Warning, Error, Info
- **Neutral Scale**: 50-900 (10 shades of gray for backgrounds, borders, text)
- **Alpha Colors**: Transparent overlays for shadows and overlays

**Typography Strategy:**
- **Font Stack**: System font stack (native OS fonts for faster loading and consistent native feel, e.g., -apple-system, Segoe UI, Roboto)
- **Type Scale**: Modular scale based on 1.25 ratio
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Line Heights**: Tight (1.2), Normal (1.5), Relaxed (1.75)

---

## Inspiration / References

**Design Systems:**
- **Radix Colors**: Comprehensive color system with accessibility built-in
- **Tailwind CSS**: Opinionated spacing and color scales
- **Shadcn UI**: Minimalist design token structure
- **Atlassian Design System**: Enterprise-grade tokens and documentation
- **Material Design 3**: Color roles and semantic naming

**External Examples:**
- **Linear**: Clean color palette with excellent contrast
- **GitHub Primer**: Well-documented design system
- **Stripe**: Elegant typography and spacing

---

## Main Responsibilities

### Design Tokens / Theming Adjustments
- [ ] Define CSS custom properties for colors (brand, semantic, neutral, alpha)
- [ ] Define CSS custom properties for typography (families, sizes, weights, line heights, letter spacing)
- [ ] Define CSS custom properties for spacing (base unit, scale)
- [ ] Define CSS custom properties for shadows (elevation levels)
- [ ] Define CSS custom properties for border radii (roundness scale)
- [ ] Define CSS custom properties for transitions (durations, easing functions)
- [ ] Optional: Dark mode color tokens (foundation only)

### Documentation
- [ ] Design token documentation in `/docs/frontend/design-system.md`
- [ ] Color swatches with hex values and usage guidelines
- [ ] Typography scale with examples
- [ ] Spacing scale visualization
- [ ] Shadow and radius examples
- [ ] Code examples for common patterns

### Token Implementation
- [ ] Replace all hardcoded colors with color tokens
- [ ] Replace all hardcoded font sizes with typography tokens
- [ ] Replace all magic numbers (spacing) with spacing tokens
- [ ] Replace all hardcoded shadows with shadow tokens
- [ ] Replace all hardcoded border radii with radius tokens

---

## Functional Requirements

### Design Token Structure

**Colors:**
```css
/* Brand Colors */
--color-primary-50: hsl(210, 100%, 97%);
--color-primary-100: hsl(210, 100%, 95%);
...
--color-primary-600: hsl(210, 100%, 50%);  /* Primary brand color */
...
--color-primary-900: hsl(210, 100%, 10%);

/* Semantic Colors */
--color-success-500: hsl(142, 70%, 45%);
--color-warning-500: hsl(38, 90%, 50%);
--color-error-500: hsl(0, 70%, 50%);
--color-info-500: hsl(210, 90%, 55%);

/* Neutral Scale */
--color-neutral-50: hsl(0, 0%, 98%);
...
--color-neutral-500: hsl(0, 0%, 50%);  /* Mid-gray */
...
--color-neutral-900: hsl(0, 0%, 10%);

/* Surface Colors */
--color-background: var(--color-neutral-50);
--color-surface: var(--color-neutral-100);
--color-surface-elevated: white;

/* Text Colors */
--color-text-primary: var(--color-neutral-900);
--color-text-secondary: var(--color-neutral-600);
--color-text-tertiary: var(--color-neutral-400);

/* Border Colors */
--color-border-subtle: var(--color-neutral-200);
--color-border-default: var(--color-neutral-300);
--color-border-strong: var(--color-neutral-400);
```

**Typography:**
```css
/* Font Families */
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
--font-family-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', monospace;

/* Font Sizes (Modular scale: 1.25 ratio) */
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 1.875rem;  /* 30px */
--font-size-4xl: 2.25rem;   /* 36px */

/* Font Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line Heights */
--line-height-tight: 1.2;
--line-height-normal: 1.5;
--line-height-relaxed: 1.75;

/* Letter Spacing */
--letter-spacing-tight: -0.02em;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.02em;
```

**Spacing:**
```css
/* Base unit: 4px */
--spacing-0: 0;
--spacing-0-5: 0.125rem;  /* 2px */
--spacing-1: 0.25rem;     /* 4px */
--spacing-2: 0.5rem;      /* 8px */
--spacing-3: 0.75rem;     /* 12px */
--spacing-4: 1rem;        /* 16px */
--spacing-5: 1.25rem;     /* 20px */
--spacing-6: 1.5rem;      /* 24px */
--spacing-8: 2rem;        /* 32px */
--spacing-10: 2.5rem;     /* 40px */
--spacing-12: 3rem;       /* 48px */
--spacing-16: 4rem;       /* 64px */
--spacing-20: 5rem;       /* 80px */
--spacing-24: 6rem;       /* 96px */
```

**Shadows:**
```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
```

**Radii:**
```css
--radius-none: 0;
--radius-sm: 0.25rem;   /* 4px */
--radius-md: 0.375rem;  /* 6px */
--radius-lg: 0.5rem;    /* 8px */
--radius-xl: 0.75rem;   /* 12px */
--radius-2xl: 1rem;     /* 16px */
--radius-full: 9999px;  /* Circular */
```

**Transitions:**
```css
--duration-fast: 150ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Dark Mode Foundation (Optional)
```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-neutral-900);
    --color-surface: var(--color-neutral-800);
    --color-surface-elevated: var(--color-neutral-700);
    --color-text-primary: var(--color-neutral-50);
    --color-text-secondary: var(--color-neutral-300);
    --color-border-subtle: var(--color-neutral-700);
    /* ... other dark mode tokens */
  }
}
```

---

## Guardrails / Constraints

### Performance
- CSS custom properties have zero runtime overhead (native browser feature)
- Token file size must remain < 5KB (minified)
- No JavaScript computation of styles (pure CSS)

### Accessibility
- All color combinations must meet WCAG 2.1 AA contrast ratios:
  - Normal text: 4.5:1 minimum
  - Large text (18px+ or 14px+ bold): 3:1 minimum
  - UI components and borders: 3:1 minimum
- Focus ring color must have 3:1 contrast against both light and dark backgrounds

### Browser Support
- CSS custom properties supported in all evergreen browsers (IE11 not required)
- Fallback values for critical tokens (optional)

### Constraints
- Must not break existing styles during migration (incremental replacement)
- Must maintain visual consistency during token rollout
- Must document all tokens before marking story complete

---

## Brand & Tokens

### Primary Brand Colors
- **Primary (Blue)**: `hsl(210, 100%, 50%)` - Main brand color, primary buttons, links
- **Secondary (Gray)**: `hsl(0, 0%, 50%)` - Secondary actions, borders
- **Accent (Green)**: `hsl(142, 70%, 45%)` - Success states, positive actions

### Semantic Colors
- **Success**: Green - Successful actions, positive feedback
- **Warning**: Amber - Caution, non-critical issues
- **Error**: Red - Errors, destructive actions
- **Info**: Blue - Informational messages

### Neutral Scale
- 50-100: Very light backgrounds
- 200-400: Borders, dividers, inactive states
- 500-700: Secondary text, icons
- 800-900: Primary text, dark backgrounds

---

## Acceptance Criteria

### Design Tokens Defined
- [ ] All color tokens defined (brand, semantic, neutral, surface, text, border)
- [ ] All typography tokens defined (families, sizes, weights, line heights, letter spacing)
- [ ] All spacing tokens defined (base unit, scale 0-24)
- [ ] All shadow tokens defined (xs, sm, md, lg, xl, 2xl)
- [ ] All radius tokens defined (none, sm, md, lg, xl, 2xl, full)
- [ ] All transition tokens defined (durations, easing functions)
- [ ] Tokens stored in `/frontend/src/index.css` or `/frontend/src/tokens.css`

### Documentation Complete
- [ ] Design system documentation in `/docs/frontend/design-system.md`
- [ ] Color swatches with hex/HSL values and usage guidelines
- [ ] Typography scale with visual examples (headings, body text, captions)
- [ ] Spacing scale visualization (boxes showing each spacing value)
- [ ] Shadow examples (cards with different elevation levels)
- [ ] Radius examples (buttons and cards with different roundness)
- [ ] Code examples for common patterns (card with shadow, button with focus ring)

### Token Migration
- [ ] All hardcoded colors replaced with color tokens (search for `#`, `rgb(`, `hsl(`)
- [ ] All hardcoded font sizes replaced with typography tokens (search for `px`, `rem`, `em`)
- [ ] All magic numbers (spacing) replaced with spacing tokens
- [ ] All hardcoded shadows replaced with shadow tokens
- [ ] All hardcoded border radii replaced with radius tokens

### Accessibility
- [ ] All color combinations tested for WCAG 2.1 AA contrast (use WebAIM Contrast Checker)
- [ ] Focus ring color has 3:1 contrast against both light and dark backgrounds
- [ ] Color contrast ratios documented in design system docs

### Dark Mode Foundation (Optional)
- [ ] Dark mode color tokens defined (foundation only, not full implementation)
- [ ] Dark mode tokens use `@media (prefers-color-scheme: dark)` or `.dark` class
- [ ] Documentation explains dark mode token structure

### Testing
- [ ] All pages render correctly with new tokens (visual QA)
- [ ] No visual regressions (compare screenshots before/after)
- [ ] Tokens work across all breakpoints (mobile, tablet, desktop)
- [ ] Performance: No layout shift or flicker during token application (CLS < 0.1)

---

## Files Allowed To Change

### Token Definition
- `frontend/src/index.css` (add or update token definitions in `:root` selector)
- `frontend/src/tokens.css` (new file, optional separate token file)

### Component Styles (Replace hardcoded values with tokens)
- `frontend/src/components/**/*.css`
- `frontend/src/components/**/*.tsx` (inline styles if any)
- `frontend/src/pages/**/*.css`
- `frontend/src/pages/**/*.tsx` (inline styles if any)

### Documentation
- `docs/frontend/design-system.md` (new)

---

## Required Deliverables

- [ ] CSS custom properties (tokens) defined in `index.css` or `tokens.css`
- [ ] All hardcoded values replaced with tokens across codebase
- [ ] Storybook stories showing token usage (optional but recommended)
- [ ] Design reference (Figma library or style guide document)
- [ ] Playwright/visual tests for token migration (compare before/after screenshots)
- [ ] Documentation (`docs/frontend/design-system.md`)

---

## Testing & Review Notes

### Commands to Run
```bash
# Visual regression testing (if using)
npm run test:visual

# Accessibility audit
npm run test:a11y

# Build and preview
npm run build
npm run preview
```

### Stakeholders
- **Product Owner**: Sign-off on color palette and typography choices
- **Designer**: Figma library creation and token alignment
- **Frontend Team**: Code review and token migration
- **Accessibility Lead**: Contrast ratio verification

### Review Checklist
- [ ] Figma library or style guide document reviewed and approved
- [ ] Token definitions reviewed by design team
- [ ] Color contrast ratios verified for accessibility
- [ ] All hardcoded values replaced with tokens (code review)
- [ ] Visual QA: No visual regressions across all pages
- [ ] Documentation reviewed and published
- [ ] Stakeholder demo and sign-off

### Success Criteria for Review
- Consistent visual language across all pages
- Development velocity increases (easier to build new features)
- Maintenance burden decreases (global style changes are trivial)
- Positive developer feedback ("tokens make styling so much easier")

---

## Related Stories

- **E-008-01**: Navigation redesign (uses design tokens)
- **E-008-16 to E-008-25**: Component library refresh (components use design tokens)
- **E-008-26 to E-008-32**: Accessibility (color contrast ensured by token choices)
- **E-008-15**: Dark mode foundation (depends on this story's token structure)

---

## Notes

- This story is foundational for all subsequent UI/UX work; prioritize completion early
- Use HSL color format for easier manipulation (hue, saturation, lightness adjustments)
- Consider using Radix Colors or Tailwind color palette as reference (proven accessibility)
- Token migration can be incremental (prioritize components used across many pages)
- Document anti-patterns (when NOT to use certain tokens) to guide developers
- Consider: Automated token documentation generation from CSS variables (future enhancement)
