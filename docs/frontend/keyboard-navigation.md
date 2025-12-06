# Keyboard Navigation & Accessibility

This document describes the keyboard navigation and accessibility features implemented in the FanEngagement frontend application.

## Overview

The application implements comprehensive keyboard navigation support following WCAG 2.1 AA guidelines. All interactive elements are accessible via keyboard, with visible focus indicators, logical tab order, and focus trap management for modal dialogs and drawers.

## Global Focus Styles

### Focus Ring Design

All interactive elements display a consistent, high-contrast focus ring when navigated via keyboard:

- **Outline**: 2px solid using `--focus-ring-color` token (#0056b3)
- **Shadow**: Subtle 4px shadow with 10% opacity for additional clarity
- **Offset**: 2px outline offset for visual separation from element borders

### CSS Implementation

Location: `frontend/src/index.css`

```css
*:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 86, 179, 0.1);
}
```

### Supported Elements

Focus styles are explicitly applied to:
- Buttons (`<button>`)
- Links (`<a>`)
- Form inputs (`<input>`, `<textarea>`, `<select>`)
- Custom interactive elements (`[role="button"]`, `[role="link"]`, `[tabindex]`)

### Reduced Motion Support

The application respects user preferences for reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *:focus-visible {
    transition: none;
  }
}
```

## Skip Link

### Purpose

Allows keyboard users to bypass navigation and jump directly to main content.

### Implementation

Location: `frontend/src/components/SkipLink.tsx`

The skip link is visually hidden by default and appears at the top of the page when focused:

```tsx
<SkipLink href="#main-content">Skip to main content</SkipLink>
```

### Behavior

- Hidden off-screen by default (`left: -9999px`)
- Visible when focused via Tab key
- Links to `#main-content` landmark in AdminLayout
- Styled with primary color background and high contrast

## Focus Trap Implementation

### Overview

Focus traps prevent keyboard focus from escaping modal dialogs and drawers, ensuring keyboard users can navigate within the component without losing context.

### Components with Focus Traps

#### 1. Modal Component

Location: `frontend/src/components/Modal.tsx`

**Features:**
- Traps focus within modal dialog
- Tab cycles forward through focusable elements
- Shift+Tab cycles backward
- Wraps to first/last element at boundaries
- Escape key closes modal
- Focus restoration on close
- Body scroll lock when open

**Usage:**
```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  <div>Modal content</div>
</Modal>
```

**Accessibility Attributes:**
- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` (when title provided)

#### 2. MobileNav Drawer

Location: `frontend/src/components/MobileNav.tsx`

**Features:**
- Focus trap for mobile navigation drawer
- Tab/Shift+Tab cycling within drawer
- Escape key closes drawer
- Focus restoration to trigger button on close
- Body scroll lock when open

**Behavior:**
- Opens with focus on close button
- Allows navigation through all menu items
- Prevents focus from escaping to page content

## Tab Order

### Principles

Tab order follows natural reading order:
1. Skip link (first Tab press)
2. Header elements (logo, badges, controls)
3. Navigation sidebar links
4. Main content area
5. Interactive elements within content

### AdminLayout Tab Order

1. Skip to main content link
2. Mobile menu button (on small screens)
3. Logout button
4. Organization selector dropdown (if applicable)
5. Sidebar navigation links
6. Main content interactive elements

## Keyboard Shortcuts

### Organization Admin Navigation

Location: `frontend/src/components/AdminLayout.tsx`

When an organization is selected and user has OrgAdmin role:

- **Ctrl+1** (Windows/Linux) / **Cmd+1** (Mac): Navigate to first org admin page
- **Ctrl+2** through **Ctrl+6**: Navigate to subsequent org admin pages

**Implementation Notes:**
- Only active when user has OrgAdmin role for active organization
- Prevents conflicts with browser shortcuts (checks `!e.altKey && !e.shiftKey`)
- Shows brief notification toast on shortcut use
- Limited to first 6 navigation items

## Dropdown & Menu Navigation

### OrganizationSelector

Location: `frontend/src/components/OrganizationSelector.tsx`

**Keyboard Support:**
- **Arrow Down**: Open dropdown or move to next item
- **Arrow Up**: Open dropdown or move to previous item
- **Enter**: Select focused item or toggle dropdown
- **Space**: Open dropdown or select focused item
- **Escape**: Close dropdown and return focus to button
- **Tab**: Close dropdown and move to next focusable element

**ARIA Pattern:**
- Implements listbox pattern
- `role="listbox"` on dropdown container
- `role="option"` on each list item
- `aria-expanded` on button
- `aria-selected` on options
- `aria-activedescendant` for focused item

## Screen Reader Support

### Announcements

Components use ARIA live regions for dynamic announcements:

1. **OrganizationSelector**: Announces organization switches
   ```tsx
   <div role="status" aria-live="polite" aria-atomic="true">
     {announcement}
   </div>
   ```

2. **Keyboard Help Toast**: Announces keyboard shortcuts
   ```tsx
   <div role="status" aria-live="polite" aria-atomic="true">
     Use Ctrl+1–6 to navigate org admin pages
   </div>
   ```

### Semantic HTML

- `<nav>` for navigation regions
- `<main>` for primary content (with `id="main-content"`)
- `<header>` for page headers
- `<aside>` for sidebars
- Proper heading hierarchy (h1 → h2 → h3)

### ARIA Labels

All interactive elements have proper labels:
- Buttons: `aria-label` when text not visible
- Links: `aria-current="page"` for active navigation
- Modals: `aria-modal="true"` and `aria-labelledby`
- Dropdowns: `aria-haspopup`, `aria-expanded`

## Testing Keyboard Navigation

### Manual Testing Checklist

- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible on all elements
- [ ] Skip link appears on first Tab and functions correctly
- [ ] Modal dialogs trap focus (Tab/Shift+Tab wraps)
- [ ] Escape key closes modals and drawers
- [ ] Focus returns to trigger element after closing modals
- [ ] Dropdown menus navigable with arrow keys
- [ ] Organization selector accepts keyboard input
- [ ] No focus is lost during navigation
- [ ] Tab order follows logical reading order

### Browser Testing

Tested on:
- Chrome/Edge (Chromium-based)
- Firefox
- Safari

### Screen Reader Testing

Compatible with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Design Tokens

Focus styles use CSS custom properties defined in `index.css`:

```css
:root {
  --focus-ring-color: #0056b3;      /* Primary focus color */
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);  /* Shadow token */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);     /* Animation easing */
}
```

## Future Enhancements

Potential improvements for keyboard navigation:

1. **Custom Focus Management**
   - Page-level focus management on route changes
   - Announce page title changes to screen readers

2. **Additional Keyboard Shortcuts**
   - Global search shortcut (e.g., Ctrl+K)
   - Quick navigation to user account (e.g., Ctrl+Shift+A)

3. **Focus Visible Polyfill**
   - Add polyfill for older browsers that don't support `:focus-visible`

4. **Keyboard Navigation Documentation**
   - In-app help modal showing available keyboard shortcuts
   - Keyboard shortcut legend in settings

## References

- [WCAG 2.1 AA Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN: Keyboard-navigable JavaScript widgets](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Keyboard-navigable_JavaScript_widgets)
- [Modal Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [Listbox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)
