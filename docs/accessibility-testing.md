# Accessibility Testing Guide

This document outlines accessibility features, ARIA implementation, and testing procedures for the FanEngagement application.

## WCAG 2.1 AA Compliance

The application aims for WCAG 2.1 AA compliance across all user interfaces.

## Landmark Roles

All layout components use proper HTML5 semantic elements with explicit ARIA roles for screen reader compatibility:

### Layout Components

- **Header**: `<header role="banner">` - Site header with logo and authentication controls
- **Navigation**: `<nav role="navigation">` or `<aside role="navigation">` - All navigation menus with descriptive `aria-label`
  - "Main navigation" (unauthenticated layout)
  - "User navigation" (authenticated user sidebar)
  - "Admin navigation" (admin sidebar)
  - "Platform admin navigation" (platform admin sidebar)
  - "Mobile navigation" (mobile drawer)
- **Main Content**: `<main role="main" id="main-content">` - Primary content area, targeted by skip links
- **Skip Links**: Implemented at the top of each layout for keyboard navigation efficiency

**Note**: No footer elements are currently implemented as the application does not require footer content.

## ARIA Live Regions

Dynamic content updates use appropriate ARIA live regions:

### Status Announcements (Polite)

Components that use `aria-live="polite"` for non-critical updates:

- **LoadingSpinner**: `role="status" aria-live="polite" aria-busy="true"`
  - Announces loading state changes without interrupting current screen reader activity
  - Includes visually hidden text when no message is provided
  
- **NotificationContainer**: `role="region" aria-label="Notifications" aria-live="polite"` (default)
  - Toast notifications for success, info, and warning messages
  - Automatically switches to `aria-live="assertive"` when error toasts are present

- **EmptyState**: `role="status" aria-label="Empty state"`
  - Announces when a data view has no results
  - Decorative icons marked with `aria-hidden="true"`

- **OrganizationDropdown**: Active organization text has `aria-live="polite"`

- **GlobalSearch**: Loading state uses `role="status" aria-live="polite"`

### Alert Announcements (Assertive)

Components that use `aria-live="assertive"` for critical updates:

- **ErrorMessage**: `role="alert" aria-live="assertive"`
  - Immediately announces error messages
  - Retry button includes `aria-label="Retry loading"`

- **Toast (error type)**: `role="alert"`
  - Error notifications are announced immediately via role="alert"
  - Non-error toasts rely on the container's live region

## Interactive Elements

### Buttons

All buttons have accessible names:

- Text buttons: Use visible text as the accessible name
- Icon-only buttons: Use `aria-label` for accessible name, with visually hidden text as backup
  - Button component supports `iconOnly` prop which automatically adds `.visually-hidden` class to children
  - Examples: Modal close button (`aria-label="Close modal"`), Mobile menu (`aria-label="Open navigation menu"`)

### Forms

All form controls have proper labels and ARIA attributes:

- **Input**: Associates with `<label>` via `id`/`htmlFor`, supports `aria-describedby` for helper text and errors
- **Select**: Associates with `<label>` via `id`/`htmlFor`, supports `aria-describedby`
- **Checkbox**: Uses `<input type="checkbox">` with associated `<label>`
- **Radio**: Uses `<input type="radio">` with associated `<label>`
- **Toggle**: Similar to checkbox with ARIA attributes for on/off states

All form components:
- Support `required` attribute with visual indicators (asterisk in label)
- Use `aria-invalid="true"` when validation fails
- Link error messages via `aria-describedby`

### Tables

The Table component includes comprehensive accessibility support:

- **Caption**: Optional `caption` prop rendered as `<caption>` for table description
- **Column Headers**: `<th>` elements with proper scope
- **Sortable Columns**: 
  - `role="button"` with keyboard support (Enter/Space)
  - `tabIndex={0}` for keyboard focus
  - `aria-sort="ascending|descending"` to indicate current sort state
  - Descriptive `aria-label` that includes column name, current sort state, and next action
    - Example: "Name, sorted ascending. Click to sort descending."
    - Example: "Email, not sorted. Click to sort ascending."
  - Sort icons marked with `aria-hidden="true"`
- **Clickable Rows**: When `onRowClick` is provided, rows get `role="button"` and keyboard support
- **Mobile Cards**: Responsive layout maintains accessibility in card mode

### Modals

Modal component implements WCAG dialog pattern:

- **Role**: `role="dialog" aria-modal="true"`
- **Labeling**: `aria-labelledby` points to modal title when using `title` prop
- **Focus Management**: 
  - Focuses close button on open
  - Restores focus to triggering element on close
  - Traps focus within modal (Tab/Shift+Tab cycle through modal elements)
- **Keyboard**: Escape key closes modal
- **Backdrop**: Clicking backdrop closes modal (configurable via `closeOnBackdropClick`)

### Dropdowns

Dropdown components use Floating UI with ARIA menu pattern:

- **OrganizationDropdown**: Menu button with `aria-expanded` and `aria-haspopup="true"`
- **RecentsDropdown**: Similar ARIA menu pattern
- All dropdowns support keyboard navigation (Arrow keys, Enter, Escape)

### Navigation

- **Active Page**: Links use `aria-current="page"` to indicate current location
- **Keyboard Shortcuts**: Documented shortcuts with visual indicators
  - AdminLayout: Cmd/Ctrl+1–6 for org admin pages
  - PlatformAdminLayout: Cmd/Ctrl+K for search, ? for help overlay
- **Mobile Navigation**: Proper ARIA attributes for drawer (`aria-label`, `aria-controls`, `aria-expanded`)

## Screen Reader Testing

### Recommended Testing Tools

1. **NVDA** (Windows) - Free, open-source
2. **JAWS** (Windows) - Industry standard
3. **VoiceOver** (macOS/iOS) - Built-in
4. **TalkBack** (Android) - Built-in

### Testing Workflow

#### 1. Automated Testing with axe DevTools

Install the [axe DevTools browser extension](https://www.deque.com/axe/devtools/):

```bash
# The project includes @storybook/addon-a11y for Storybook testing
npm run storybook
# Navigate to components and check the "Accessibility" tab
```

For page-level testing:
1. Open browser DevTools
2. Open axe DevTools tab
3. Click "Scan All of My Page"
4. Review and address issues

#### 2. Manual Screen Reader Testing

**Basic Navigation Test** (5 minutes per page):

1. **Landmarks**: 
   - Navigate by landmarks (NVDA: D key, VoiceOver: VO+U → Landmarks)
   - Verify all regions are announced with correct labels
   
2. **Headings**:
   - Navigate by headings (NVDA: H key, VoiceOver: VO+U → Headings)
   - Verify logical heading structure (H1 → H2 → H3)
   
3. **Forms**:
   - Tab through all form controls
   - Verify each announces its label, type, and state
   - Trigger validation errors and verify they are announced
   
4. **Interactive Elements**:
   - Tab through buttons, links, and custom widgets
   - Verify each announces its purpose and state
   - Test keyboard activation (Enter for buttons, Space for checkboxes)
   
5. **Live Regions**:
   - Trigger loading states → Verify announcement
   - Trigger errors → Verify immediate announcement
   - Trigger success toasts → Verify polite announcement

**NVDA Quick Commands** (Windows):

```
NVDA + Space       - Toggle browse/focus mode
D / Shift+D        - Next/previous landmark
H / Shift+H        - Next/previous heading
F / Shift+F        - Next/previous form field
B / Shift+B        - Next/previous button
K / Shift+K        - Next/previous link
Insert+F7          - Elements list
```

**VoiceOver Quick Commands** (macOS):

```
VO+U               - Rotor (navigate by element type)
VO+Right/Left      - Navigate through elements
VO+A               - Read from current position
VO+Command+H       - Navigate by headings
VO+Shift+Space     - Activate element
```

#### 3. High-Priority Testing Flows

Test these critical user paths with a screen reader:

1. **Authentication Flow**:
   - Login form (label association, error announcements)
   - MFA setup (QR code alternative text)

2. **Organization Switching** (for mixed-role users):
   - Open organization dropdown
   - Select different organization
   - Verify navigation updates are announced

3. **Admin Workflows**:
   - Create user (form validation, success message)
   - Create organization (form validation)
   - View and sort tables (column headers, sort state)

4. **Proposal Voting**:
   - Vote on a proposal
   - Verify confirmation announcement

5. **Error Recovery**:
   - Trigger network error
   - Verify error announcement
   - Activate retry button
   - Verify loading announcement

## Known Limitations

### Visual-Only Indicators

These areas may need future enhancement:

1. **Loading States**: Some loading states are visual only (no live region yet)
   - Consider adding global loading announcements

2. **Inline Validation**: Some forms validate on blur without announcement
   - Error messages are associated via aria-describedby but may not announce immediately

### Future Improvements

See `docs/future-improvements.md` for planned accessibility enhancements:

- Enhanced keyboard shortcuts documentation
- Better focus indicators for high contrast mode
- More granular ARIA roles for complex widgets
- Improved mobile screen reader experience

## Testing Checklist

Use this checklist when implementing new features:

- [ ] All interactive elements have accessible names
- [ ] Form inputs have associated labels
- [ ] Error states use `aria-invalid` and `aria-describedby`
- [ ] Dynamic content uses appropriate live regions
- [ ] Keyboard navigation works for all interactions
- [ ] Focus indicators are visible
- [ ] Color is not the only means of conveying information
- [ ] Sufficient color contrast (4.5:1 for normal text, 3:1 for large text)
- [ ] Page structure uses proper heading hierarchy
- [ ] Custom widgets use appropriate ARIA roles and states
- [ ] Tested with at least one screen reader
- [ ] Automated accessibility tests pass (axe DevTools, Storybook a11y addon)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Inclusive Components](https://inclusive-components.design/)

## Contact

For accessibility questions or to report issues, please open a GitHub issue with the "accessibility" label.
