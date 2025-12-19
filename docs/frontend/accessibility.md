# Accessibility Playbook

**Version:** 1.0  
**Last Updated:** 2025-12-19  
**WCAG Compliance Target:** WCAG 2.1 Level AA

---

## 📖 Table of Contents

- [Quick Checklist](#quick-checklist)
- [Overview](#overview)
- [ARIA Implementation](#aria-implementation)
- [Keyboard Navigation](#keyboard-navigation)
- [Color Contrast](#color-contrast)
- [Screen Reader Testing](#screen-reader-testing)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Tools & Setup](#tools--setup)
- [Resources](#resources)

---

## Quick Checklist

Use this checklist when implementing **any new feature or component**:

### New Feature Checklist

- [ ] **Semantic HTML** - Use correct elements (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] **Keyboard Navigation** - All interactions work with Tab, Enter, Space, Arrow keys
- [ ] **Focus Indicators** - Visible focus ring on all interactive elements (2px minimum)
- [ ] **ARIA Labels** - All interactive elements have accessible names
- [ ] **Form Labels** - All inputs have associated `<label>` elements
- [ ] **Error Handling** - Use `aria-invalid` and `aria-describedby` for validation errors
- [ ] **Live Regions** - Dynamic content uses `aria-live` or `role="alert"`/`role="status"`
- [ ] **Color Contrast** - Text meets 4.5:1 ratio (3:1 for large text and UI components)
- [ ] **Heading Hierarchy** - Logical h1→h2→h3 structure (no skipping levels)
- [ ] **Alternative Text** - Images have descriptive `alt` text (or `alt=""` if decorative)
- [ ] **Screen Reader Test** - Test with at least one screen reader (NVDA, JAWS, VoiceOver)
- [ ] **Automated Test** - Run axe DevTools scan and fix critical/serious issues

---

## Overview

### Purpose

This document serves as the **single source of truth** for accessibility implementation in the FanEngagement application. Use it during:

- Feature planning and design
- Component development
- Code review
- QA testing
- Accessibility audits

### Compliance Goal

All features must meet **WCAG 2.1 Level AA** standards, which includes:

- **Perceivable**: Information and UI components are presentable to users in ways they can perceive
- **Operable**: UI components and navigation are operable (keyboard accessible, sufficient time, navigation support)
- **Understandable**: Information and UI operation are understandable
- **Robust**: Content can be interpreted by a wide variety of user agents, including assistive technologies

### Who This Is For

- **Frontend Developers**: Implement accessible features from day one
- **Designers**: Ensure designs meet accessibility standards
- **QA Engineers**: Test for accessibility compliance
- **Product Managers**: Understand accessibility requirements

---

## ARIA Implementation

### Landmark Roles

Use HTML5 semantic elements with explicit ARIA roles for screen reader compatibility:

```html
<!-- Header -->
<header role="banner">
  <img src="/logo.png" alt="FanEngagement" />
  <button aria-label="Open menu">☰</button>
</header>

<!-- Navigation -->
<nav role="navigation" aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current="page">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

<!-- Main Content -->
<main role="main" id="main-content">
  <h1>Page Title</h1>
  <!-- Primary content here -->
</main>

<!-- Sidebar -->
<aside role="complementary" aria-label="Related content">
  <!-- Secondary content here -->
</aside>
```

**Required Landmarks:**

- `<header role="banner">` - Site header
- `<nav role="navigation">` - Navigation menus (use descriptive `aria-label`)
- `<main role="main" id="main-content">` - Primary content (targeted by skip links)
- `<aside role="complementary">` - Sidebars and related content

### Live Regions

Announce dynamic content changes to screen readers:

#### Polite Announcements (Non-Interrupting)

Use `aria-live="polite"` for non-critical updates:

```tsx
// Loading indicator
<div role="status" aria-live="polite" aria-busy="true">
  <span className="spinner" aria-hidden="true"></span>
  <span className="visually-hidden">Loading...</span>
</div>

// Success toast
<div role="status" aria-live="polite">
  Changes saved successfully
</div>

// Empty state
<div role="status" aria-label="Empty state">
  <p>No results found</p>
</div>
```

**Use for:**

- Loading states
- Success messages
- Info notifications
- Empty state announcements
- Non-critical updates

#### Assertive Announcements (Immediate)

Use `aria-live="assertive"` or `role="alert"` for critical updates:

```tsx
// Error message
<div role="alert" aria-live="assertive">
  <p>Error: Unable to save changes. Please try again.</p>
  <button aria-label="Retry loading">Retry</button>
</div>

// Form validation error
<div role="alert" id="email-error">
  Please enter a valid email address
</div>
```

**Use for:**

- Error messages
- Validation failures
- Critical system notifications
- Security warnings

### Interactive Elements

#### Buttons

All buttons must have accessible names:

```tsx
// Text button (accessible name from text)
<button>Save Changes</button>

// Icon-only button (use aria-label)
<button aria-label="Close modal">
  <svg aria-hidden="true">
    <path d="..." />
  </svg>
</button>

// Button component (icon-only variant)
<Button iconOnly aria-label="Delete item">
  <TrashIcon />
</Button>
```

**Best Practices:**

- Use `<button>` for actions, `<a>` for navigation
- Provide descriptive `aria-label` for icon-only buttons
- Use `aria-busy="true"` for loading states
- Use `disabled` attribute (not just visual styling)

#### Links

```tsx
// Current page indicator
<a href="/dashboard" aria-current="page">
  Dashboard
</a>

// External link
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Visit Example
  <span className="visually-hidden">(opens in new window)</span>
</a>
```

### Forms

All form controls require proper labels and error handling:

```tsx
// Input with label
<div>
  <label htmlFor="email">
    Email Address <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error email-hint" : "email-hint"}
  />
  <div id="email-hint" className="text-sm text-gray-600">
    We'll never share your email
  </div>
  {hasError && (
    <div id="email-error" role="alert" className="text-red-600">
      Please enter a valid email address
    </div>
  )}
</div>

// Select with label
<div>
  <label htmlFor="country">Country</label>
  <select id="country" aria-required="true">
    <option value="">Select a country</option>
    <option value="us">United States</option>
    <option value="ca">Canada</option>
  </select>
</div>

// Checkbox with label
<div>
  <input type="checkbox" id="terms" required />
  <label htmlFor="terms">
    I agree to the <a href="/terms">terms and conditions</a>
  </label>
</div>
```

**Best Practices:**

- Always use `<label>` with `htmlFor` attribute
- Use `aria-required="true"` for required fields
- Use `aria-invalid="true"` when validation fails
- Link error messages with `aria-describedby`
- Group related fields with `<fieldset>` and `<legend>`

### Modals

Implement the WCAG dialog pattern:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <div className="modal-content">
    <h2 id="modal-title">Confirm Deletion</h2>
    <p id="modal-description">
      Are you sure you want to delete this item? This action cannot be undone.
    </p>
    <div className="modal-actions">
      <button onClick={handleCancel}>Cancel</button>
      <button onClick={handleConfirm}>Delete</button>
    </div>
    <button
      aria-label="Close modal"
      onClick={handleClose}
    >
      ×
    </button>
  </div>
</div>
```

**Required Features:**

- `role="dialog"` and `aria-modal="true"`
- `aria-labelledby` pointing to modal title
- Focus trap (Tab/Shift+Tab cycles within modal)
- Focus management (restore on close)
- Escape key closes modal
- Keyboard activation (Enter/Space on buttons)

### Tables

Implement accessible data tables:

```tsx
<table>
  <caption>User List (24 results)</caption>
  <thead>
    <tr>
      <th scope="col">
        <button
          role="button"
          tabIndex={0}
          aria-sort="ascending"
          aria-label="Name, sorted ascending. Click to sort descending."
          onClick={handleSort}
        >
          Name
          <span aria-hidden="true">↑</span>
        </button>
      </th>
      <th scope="col">Email</th>
      <th scope="col">Role</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>John Doe</td>
      <td>john@example.com</td>
      <td>Admin</td>
    </tr>
  </tbody>
</table>
```

**Best Practices:**

- Use `<caption>` to describe table contents
- Use `<th scope="col">` for column headers
- Use `<th scope="row">` for row headers
- Sortable columns: Include `aria-sort` and descriptive `aria-label`
- Clickable rows: Add `role="button"` and keyboard support

---

## Keyboard Navigation

### Global Focus Styles

All interactive elements display a **consistent, high-contrast focus ring**:

```css
*:focus-visible {
  outline: 2px solid var(--focus-ring-color); /* #0056b3 */
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 86, 179, 0.1);
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  *:focus-visible {
    transition: none;
  }
}
```

**Design Requirements:**

- Minimum 2px outline width
- High contrast ratio (3:1 minimum against background)
- 2px offset from element border
- Visible on all interactive elements

### Skip Links

Provide skip links at the top of each page:

```tsx
// SkipLink component
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// CSS
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
}

.skip-link:focus {
  left: 0;
  top: 0;
  background: var(--color-primary);
  color: white;
  padding: 1rem;
}
```

**Implementation:**

- Hidden off-screen by default
- Visible when focused (first Tab press)
- Links to `#main-content` element
- High contrast styling

### Tab Order

Tab order must follow **natural reading order**:

1. Skip link (first Tab press)
2. Header elements (logo, user menu, etc.)
3. Navigation sidebar
4. Main content area
5. Interactive elements within content

**Best Practices:**

- Never use `tabindex` > 0 (breaks natural order)
- Use `tabindex="0"` to make custom elements focusable
- Use `tabindex="-1"` for programmatic focus only
- Test by tabbing through entire page

### Focus Trap

Trap focus within modals and drawers:

```tsx
// Modal with focus trap
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift+Tab: wrap to last element
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: wrap to first element
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // ...
}
```

### Keyboard Shortcuts

Document and implement keyboard shortcuts:

**Organization Admin Navigation:**

- `Ctrl+1` (Windows/Linux) / `Cmd+1` (Mac): Navigate to first org admin page
- `Ctrl+2–6`: Navigate to subsequent org admin pages

**Global Shortcuts:**

- `?`: Show keyboard shortcuts help
- `Esc`: Close modals, dropdowns, drawers
- `Enter`: Activate buttons and links
- `Space`: Activate buttons and checkboxes
- `↑/↓`: Navigate dropdown menus
- `Tab`: Move to next focusable element
- `Shift+Tab`: Move to previous focusable element

**Implementation Notes:**

- Prevent conflicts with browser shortcuts
- Show brief notification toast on shortcut use
- Document shortcuts in help overlay or settings

---

## Color Contrast

### Minimum Requirements (WCAG 2.1 AA)

- **Normal text** (< 18px or < 14px bold): **4.5:1** contrast ratio
- **Large text** (≥ 18px or ≥ 14px bold): **3:1** contrast ratio
- **UI components** (buttons, form borders, focus indicators): **3:1** contrast ratio
- **Graphical objects** (icons, charts): **3:1** contrast ratio

### Testing Contrast

Use browser DevTools or online tools:

```bash
# WebAIM Contrast Checker
https://webaim.org/resources/contrastchecker/

# Chrome DevTools
1. Inspect element
2. Click color swatch in Styles panel
3. Check contrast ratio indicator
```

### Design System Tokens

Our design tokens meet AA standards:

```css
/* Text colors (on white background) */
--color-text-primary: #1a1a1a;      /* 15.3:1 ✓ */
--color-text-secondary: #6b7280;    /* 5.7:1 ✓ */
--color-text-tertiary: #9ca3af;     /* 3.5:1 ✓ (large text only) */

/* Interactive elements */
--color-primary: #0066cc;           /* 4.7:1 ✓ */
--color-danger: #dc2626;            /* 5.2:1 ✓ */
--color-success: #059669;           /* 4.5:1 ✓ */

/* UI components */
--color-border: #d1d5db;            /* 3.1:1 ✓ */
--focus-ring-color: #0056b3;        /* 5.8:1 ✓ */
```

### Common Violations to Avoid

❌ **Don't:**

- Use light gray text (#999) on white background (2.8:1 - fails)
- Use color alone to convey information
- Use low-contrast placeholder text for critical info
- Rely on hover-only indicators

✓ **Do:**

- Use our design system tokens (pre-tested)
- Combine color with icons or text labels
- Ensure disabled states are visually distinct
- Test with color blindness simulators

---

## Screen Reader Testing

### Recommended Tools

1. **NVDA** (Windows) - Free, open-source - [Download](https://www.nvaccess.org/download/)
2. **JAWS** (Windows) - Industry standard - [Download](https://www.freedomscientific.com/products/software/jaws/)
3. **VoiceOver** (macOS/iOS) - Built-in (Cmd+F5 to enable)
4. **TalkBack** (Android) - Built-in (Settings → Accessibility)

### Quick Screen Reader Test (5 minutes per page)

#### 1. Landmarks Test
Navigate by landmarks to verify page structure:

**NVDA:** Press `D` (next landmark) / `Shift+D` (previous)  
**VoiceOver:** `VO+U`, select Landmarks

**Verify:**

- Banner (header) landmark announced
- Navigation landmarks with descriptive labels
- Main content landmark present
- No unlabeled regions

#### 2. Headings Test
Navigate by headings to verify hierarchy:

**NVDA:** Press `H` (next heading) / `Shift+H` (previous)  
**VoiceOver:** `VO+U`, select Headings

**Verify:**

- Logical h1 → h2 → h3 structure
- No skipped heading levels
- Headings accurately describe content

#### 3. Forms Test
Navigate through form controls:

**NVDA:** Press `F` (next form field) / `Shift+F` (previous)  
**VoiceOver:** Tab through form

**Verify:**

- Each input announces its label
- Required fields announced
- Error messages announced immediately
- Helpful instructions provided

#### 4. Interactive Elements Test
Navigate through buttons and links:

**NVDA:** Press `B` (buttons) / `K` (links)  
**VoiceOver:** Tab through page

**Verify:**

- Buttons announce as "button" with descriptive label
- Links announce destination or purpose
- Current page link marked with "current page"
- No unlabeled buttons

#### 5. Live Regions Test
Trigger dynamic updates:

**Test scenarios:**

- Show loading spinner → Should announce "Loading..."
- Trigger error → Should announce error immediately
- Show success toast → Should announce success message
- Change organization → Should announce switch

### NVDA Quick Commands (Windows)

```text
NVDA + Space       - Toggle browse/focus mode
D / Shift+D        - Next/previous landmark
H / Shift+H        - Next/previous heading  
F / Shift+F        - Next/previous form field
B / Shift+B        - Next/previous button
K / Shift+K        - Next/previous link
Insert+F7          - Elements list (view all landmarks, headings, links)
```

### VoiceOver Quick Commands (macOS)

```text
VO = Ctrl+Option

VO+U               - Rotor (navigate by element type)
VO+Right/Left      - Navigate through elements
VO+A               - Read from current position
VO+Command+H       - Navigate by headings
VO+Shift+Space     - Activate element
```

### Priority Testing Flows

Test these critical paths with a screen reader:

1. **Authentication:**
   - Login form (label association, error announcements)
   - MFA setup (QR code alternative text)

2. **Organization Switching:**
   - Open organization dropdown
   - Select different organization
   - Verify navigation updates announced

3. **Admin Workflows:**
   - Create user (form validation, success message)
   - View and sort tables (column headers, sort state)

4. **Proposal Voting:**
   - Vote on proposal
   - Verify confirmation announcement

5. **Error Recovery:**
   - Trigger network error
   - Verify error announcement
   - Activate retry button

---

## Common Patterns

### Loading States

```tsx
// LoadingSpinner component
<div role="status" aria-live="polite" aria-busy="true">
  <svg className="spinner" aria-hidden="true">
    {/* Spinner SVG */}
  </svg>
  <span className="visually-hidden">Loading...</span>
</div>

// Button loading state
<Button isLoading aria-busy="true">
  Save Changes
</Button>
```

### Empty States

```tsx
<div role="status" aria-label="Empty state">
  <svg aria-hidden="true">{/* Icon */}</svg>
  <h3>No Results Found</h3>
  <p>Try adjusting your search criteria</p>
</div>
```

### Error Messages

```tsx
// Inline error (form validation)
<div>
  <input
    id="email"
    type="email"
    aria-invalid={hasError}
    aria-describedby="email-error"
  />
  {hasError && (
    <div id="email-error" role="alert">
      Please enter a valid email address
    </div>
  )}
</div>

// Global error (page-level)
<div role="alert" className="error-banner">
  <svg aria-hidden="true">{/* Error icon */}</svg>
  <div>
    <h3>Unable to Load Data</h3>
    <p>Please try again or contact support if the problem persists.</p>
    <button aria-label="Retry loading">Retry</button>
  </div>
</div>
```

### Notifications (Toasts)

```tsx
// Notification container
<div
  role="region"
  aria-label="Notifications"
  aria-live="polite" // Switches to "assertive" for errors
>
  {notifications.map(notification => (
    <div
      key={notification.id}
      role={notification.type === 'error' ? 'alert' : 'status'}
      className={`toast toast-${notification.type}`}
    >
      <span>{notification.message}</span>
      <button
        aria-label={`Dismiss ${notification.type} notification`}
        onClick={() => dismiss(notification.id)}
      >
        ×
      </button>
    </div>
  ))}
</div>
```

### Dropdowns / Menus

```tsx
// Organization selector (listbox pattern)
<div>
  <button
    aria-haspopup="listbox"
    aria-expanded={isOpen}
    aria-labelledby="org-label"
    onClick={toggle}
  >
    <span id="org-label">Organization:</span>
    <span>{selectedOrg.name}</span>
  </button>
  
  {isOpen && (
    <ul role="listbox" aria-labelledby="org-label">
      {organizations.map(org => (
        <li
          key={org.id}
          role="option"
          aria-selected={org.id === selectedOrg.id}
          onClick={() => select(org)}
        >
          {org.name}
        </li>
      ))}
    </ul>
  )}
</div>
```

### Visually Hidden Text

Use for screen reader-only content:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

```tsx
// Icon-only button with screen reader text
<button>
  <svg aria-hidden="true">{/* Icon */}</svg>
  <span className="visually-hidden">Close menu</span>
</button>
```

---

## Troubleshooting

### Issue: Focus ring not visible

**Symptoms:** Keyboard users can't see which element is focused

**Solutions:**

1. Check if `:focus-visible` styles are defined in `index.css`
2. Ensure custom components don't override focus styles
3. Verify contrast ratio meets 3:1 minimum
4. Test with browser zoom at 200%

```css
/* Add to component if needed */
.my-button:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
}
```

### Issue: Screen reader not announcing dynamic updates

**Symptoms:** Loading states, errors, or success messages are silent

**Solutions:**

1. Ensure live region is present in DOM before update
2. Use `aria-live="assertive"` for critical updates
3. For immediate announcements, use `role="alert"` instead
4. Check that live region contains text (not just child elements)

```tsx
// Wrong: Live region added after content
{showError && (
  <div role="alert">Error occurred</div>
)}

// Right: Live region always present
<div role="alert">
  {showError && "Error occurred"}
</div>
```

### Issue: Modal/dropdown not trapping focus

**Symptoms:** Tab key escapes modal or dropdown

**Solutions:**

1. Verify focus trap implementation (see [Keyboard Navigation](#focus-trap))
2. Check that all focusable elements are queried correctly
3. Ensure event listener is attached to document or modal
4. Test with Shift+Tab as well as Tab

### Issue: Form label not associated

**Symptoms:** Screen reader doesn't announce label when focusing input

**Solutions:**

1. Use `<label htmlFor="input-id">` with matching `id` on input
2. Alternatively, wrap input with `<label>` element
3. Verify IDs are unique on the page
4. Check browser DevTools Accessibility tree

```tsx
// Method 1: htmlFor
<label htmlFor="username">Username</label>
<input id="username" type="text" />

// Method 2: Implicit association
<label>
  Username
  <input type="text" />
</label>
```

### Issue: Color contrast failing

**Symptoms:** axe DevTools reports contrast issues

**Solutions:**

1. Use design system tokens (pre-tested for contrast)
2. Check contrast with Chrome DevTools color picker
3. Ensure text is not over low-contrast backgrounds
4. For images, use text overlays with sufficient background

```tsx
// Use pre-tested tokens
<p className="text-gray-600"> {/* 5.7:1 contrast ✓ */}
  Secondary text
</p>

// Not: custom color values
<p style={{ color: '#999' }}> {/* 2.8:1 contrast ✗ */}
  Light gray text
</p>
```

### Issue: Keyboard shortcuts not working

**Symptoms:** Ctrl+1, Cmd+K, etc. don't trigger actions

**Solutions:**

1. Check that event listener prevents default browser behavior
2. Verify modifier keys (Ctrl/Cmd) are correctly detected
3. Ensure shortcuts don't conflict with browser/OS shortcuts
4. Test on both Windows (Ctrl) and Mac (Cmd)

```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Detect Ctrl (Windows) or Cmd (Mac)
    const modifier = e.ctrlKey || e.metaKey;
    
    if (modifier && e.key === '1' && !e.shiftKey && !e.altKey) {
      e.preventDefault(); // Prevent browser default
      navigate('/dashboard');
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
```

### Issue: Table sorting not announced

**Symptoms:** Screen reader doesn't announce sort direction changes

**Solutions:**

1. Add `aria-sort="ascending|descending|none"` to `<th>`
2. Include sort state in `aria-label`: "Name, sorted ascending. Click to sort descending."
3. Mark sort icons with `aria-hidden="true"`
4. Ensure live region announces sort changes

---

## Tools & Setup

### Automated Testing Tools

#### 1. axe DevTools (Browser Extension)

**Installation:**

- [Chrome/Edge](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

**Usage:**

1. Open browser DevTools (F12)
2. Navigate to "axe DevTools" tab
3. Click "Scan All of My Page"
4. Review issues by severity (Critical, Serious, Moderate, Minor)
5. Fix Critical and Serious issues immediately

**CI Integration:**
```bash
# Install axe-core for Playwright
npm install --save-dev @axe-core/playwright

# Run in tests
import { injectAxe, checkA11y } from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);
  await checkA11y(page);
});
```

#### 2. WAVE (Web Accessibility Evaluation Tool)

**Installation:**

- [Chrome Extension](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/wave-accessibility-tool/)

**Usage:**

1. Navigate to page to test
2. Click WAVE extension icon
3. Review errors (red), alerts (yellow), and features (green)
4. Click icons for detailed explanations

#### 3. Lighthouse (Built into Chrome DevTools)

**Usage:**

1. Open Chrome DevTools (F12)
2. Navigate to "Lighthouse" tab
3. Select "Accessibility" category
4. Click "Generate report"
5. Review score and recommendations

**Command Line:**
```bash
# Install Lighthouse CLI
npm install -g lighthouse

# Run accessibility audit
lighthouse http://localhost:3000 --only-categories=accessibility --view
```

#### 4. Storybook Accessibility Addon

**Already installed** in the project:

```bash
# Run Storybook
npm run storybook

# Navigate to any component story
# Check the "Accessibility" tab for violations
```

### Manual Testing Tools

#### 1. Keyboard Navigation Testing

**No tools needed** - just your keyboard:

1. Disconnect mouse (optional but helpful)
2. Press Tab to move through page
3. Press Shift+Tab to move backward
4. Press Enter to activate links/buttons
5. Press Space to toggle checkboxes
6. Press Arrow keys in dropdowns/menus
7. Press Escape to close modals/menus

**Checklist:**

- [ ] All interactive elements are reachable
- [ ] Focus order is logical
- [ ] Focus indicators are visible
- [ ] No keyboard traps (can escape all components)
- [ ] Skip link appears on first Tab

#### 2. Color Contrast Testing

**Chrome DevTools:**

1. Inspect element with text
2. Click color swatch in Styles panel
3. Look for contrast ratio indicator
4. Ensure it shows ✓ (passing)

**WebAIM Contrast Checker:**
https://webaim.org/resources/contrastchecker/

#### 3. Screen Reader Testing

See [Screen Reader Testing](#screen-reader-testing) section above.

### Running Tests Locally

#### Frontend Unit Tests
```bash
cd frontend
npm test
```

#### Playwright E2E Tests
```bash
# Start application
docker compose up -d

# Run E2E tests
npm run test:e2e
```

#### Accessibility Audit
```bash
# Run axe in Storybook
npm run storybook
# Check Accessibility tab for each component

# Run Lighthouse
lighthouse http://localhost:3000 --only-categories=accessibility --view
```

---

## Resources

### WCAG 2.1 Guidelines

- **Official Specification**: [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- **Quick Reference**: [How to Meet WCAG](https://www.w3.org/WAI/WCAG21/quickref/)
- **Understanding Docs**: [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### ARIA Documentation

- **WAI-ARIA Authoring Practices**: [ARIA APG](https://www.w3.org/WAI/ARIA/apg/)
  - Dialog (Modal) Pattern
  - Listbox Pattern
  - Menu Pattern
  - Table Pattern
- **ARIA in HTML**: [W3C Specification](https://www.w3.org/TR/html-aria/)

### Testing & Tools

- **axe DevTools**: [Deque University](https://www.deque.com/axe/devtools/)
- **WAVE**: [WebAIM Tool](https://wave.webaim.org/)
- **Lighthouse**: [Google Developers](https://developers.google.com/web/tools/lighthouse)
- **WebAIM Contrast Checker**: [Tool](https://webaim.org/resources/contrastchecker/)
- **Color Oracle**: [Color Blindness Simulator](https://colororacle.org/)

### Screen Readers

- **NVDA**: [Download](https://www.nvaccess.org/download/)
- **JAWS**: [Freedom Scientific](https://www.freedomscientific.com/products/software/jaws/)
- **VoiceOver Guide**: [Apple Accessibility](https://www.apple.com/accessibility/voiceover/)
- **Screen Reader Testing**: [WebAIM Article](https://webaim.org/articles/screenreader_testing/)

### Learning Resources

- **Deque University**: [Free Courses](https://dequeuniversity.com/)
- **Inclusive Components**: [Pattern Library](https://inclusive-components.design/)
- **A11ycasts**: [Video Series](https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g)
- **WebAIM Articles**: [WebAIM.org](https://webaim.org/articles/)

### Project-Specific Documentation

- **Accessibility Testing Guide**: [docs/accessibility-testing.md](../accessibility-testing.md)
- **Keyboard Navigation**: [docs/frontend/keyboard-navigation.md](./keyboard-navigation.md)
- **Design System**: [docs/frontend/design-system.md](./design-system.md)
- **Component Documentation**: [frontend/src/components/](../../frontend/src/components/)

---

## Getting Help

### Report Accessibility Issues

Open a GitHub issue with:

- **Label**: `accessibility`
- **Description**: What's not accessible and why
- **Tool Used**: axe DevTools, screen reader, manual testing
- **Severity**: Critical, Serious, Moderate, Minor
- **Screenshot/Video**: If applicable

### Ask Questions

- **GitHub Discussions**: For general accessibility questions
- **PR Comments**: For implementation-specific questions
- **Slack/Teams**: For quick questions (if applicable)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-19 | Initial release: Complete accessibility playbook with WCAG 2.1 AA guidelines |

---

**Maintained by:** FanEngagement Frontend Team  
**Last Reviewed:** 2025-12-19  
**Next Review:** 2026-01-19 (monthly)
