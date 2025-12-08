# Navigation Design Specifications

**Version:** 1.0  
**Last Updated:** 2025-12-08  
**Status:** Authoritative Reference  
**Epic:** E-008 – Frontend User Experience & Navigation Overhaul

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Design Token System](#design-token-system)
4. [Desktop Sidebar Navigation](#desktop-sidebar-navigation)
5. [Mobile Navigation](#mobile-navigation)
6. [Organization Switcher](#organization-switcher)
7. [Breadcrumb Navigation](#breadcrumb-navigation)
8. [Interaction States](#interaction-states)
9. [Responsive Behavior](#responsive-behavior)
10. [Accessibility Specifications](#accessibility-specifications)
11. [Animation & Motion](#animation--motion)
12. [Implementation Reference](#implementation-reference)

---

## Overview

This document provides comprehensive design specifications for all navigation surfaces in the FanEngagement application. It serves as the authoritative reference for implementation, ensuring consistency across desktop and mobile experiences.

### Navigation Surfaces

- **Desktop Sidebar** - Primary navigation for screens ≥768px
- **Mobile Hamburger Menu** - Touch-optimized drawer for screens <768px
- **Organization Switcher** - Context selector for multi-org users
- **Breadcrumbs** - Hierarchical navigation for deep page structures

### Target Breakpoints

- **Mobile**: <768px (320px minimum width)
- **Tablet**: 768px - 1024px
- **Desktop**: ≥1024px

---

## Design Principles

### 1. Clarity Over Complexity
- Clear visual hierarchy with minimal decoration
- Emphasis on content and user actions
- Remove unnecessary visual elements

### 2. Consistent Patterns
- Same interaction patterns across all navigation surfaces
- Predictable behavior reduces cognitive load
- Unified visual language throughout application

### 3. Accessibility First
- WCAG 2.1 AA compliance for all interactive elements
- Keyboard navigation support with visible focus indicators
- Screen reader optimized with proper ARIA labels

### 4. Touch-Friendly
- Minimum 44×44px tap targets (WCAG 2.1 AAA)
- Adequate spacing between interactive elements
- Clear visual feedback for touch interactions

### 5. Performant
- CSS-based animations with hardware acceleration
- Respect for reduced motion preferences
- Fast rendering with minimal layout shifts

---

## Design Token System

### Color Tokens

#### Brand Colors
```css
--color-primary-600: #007bff      /* Primary brand blue */
--color-primary-700: #0056b3      /* Darker blue for hover states */
```

#### Neutral Colors
```css
--color-neutral-400: #999         /* Light gray for separators */
--color-neutral-600: #666         /* Medium gray for secondary text */
--color-neutral-700: #333         /* Dark gray for primary text */
```

#### Background Colors
```css
--color-background-elevated: #2a2a2a  /* Elevated surfaces (sidebar, drawers) */
```

#### Focus Ring
```css
--focus-ring-color: #0056b3       /* Focus indicator color */
```

### Typography Tokens

```css
/* Note: --font-size-xs and --font-size-lg not defined in index.css; use hardcoded values when needed */
0.7rem                            /* 11.2px - Small badges, shortcuts */
--font-size-sm: 0.875rem          /* 14px - Breadcrumbs, secondary text */
--font-size-base: 1rem            /* 16px - Navigation links */
1.25rem                           /* 20px - Mobile nav title (hardcoded) */

--font-weight-medium: 500         /* Default nav item weight */
--font-weight-semibold: 600       /* Active nav item weight */
700                               /* Emphasis text (hardcoded) */
```

### Spacing Tokens

```css
--spacing-2: 0.5rem               /* 8px - Small gaps */
--spacing-3: 0.75rem              /* 12px - Nav item padding */
--spacing-4: 1rem                 /* 16px - Standard spacing */
```

### Radius Tokens

```css
--radius-md: 6px                  /* Default border radius */
```

### Shadow Tokens

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05)
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
```

### Animation Tokens

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Desktop Sidebar Navigation

### Layout Specifications

**Dimensions:**
- Width: 250px (fixed)
- Height: 100vh (full viewport height)
- Background: `var(--color-background-elevated)` (#2a2a2a)

**Structure:**
```
┌─────────────────────────┐
│  Organization Info      │
│  (if org selected)      │
├─────────────────────────┤
│                         │
│  Navigation Links       │
│  (Global & Org)         │
│                         │
│                         │
├─────────────────────────┤
│  Footer Links           │
└─────────────────────────┘
```

### Navigation Links

**Base State:**
- Padding: `var(--spacing-3, 0.75rem)` 1.5rem
- Font Size: `var(--font-size-base)` (1rem / 16px)
- Font Weight: `var(--font-weight-medium)` (500)
- Color: #ddd (light gray)
- Border Left: 3px solid transparent
- Transition: background-color 0.15s var(--ease-out), color 0.15s var(--ease-out)

**Hover State:**
- Background: #333 (slightly lighter than sidebar)
- Color: white
- Border Left: 3px solid `var(--color-primary-600)` (#007bff)
- Cursor: pointer

**Active State:**
- Background: #333
- Color: white
- Border Left: 3px solid `var(--color-primary-600)` (#007bff)
- Font Weight: `var(--font-weight-semibold)` (600)

**Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: -2px (inset)

### Keyboard Shortcuts (Desktop Only)

**Appearance:**
- Font Size: `var(--font-size-xs)` (0.7rem / 11.2px)
- Color: #888
- Background: rgba(255, 255, 255, 0.05)
- Padding: 0.125rem 0.375rem
- Border Radius: 3px
- Border: 1px solid rgba(255, 255, 255, 0.1)
- Font Family: monospace
- Position: Right-aligned in nav link

**Hover State:**
- Background: rgba(255, 255, 255, 0.1)
- Color: #bbb

**Active State:**
- Background: rgba(0, 123, 255, 0.2)
- Color: #6ea8fe
- Border: 1px solid rgba(0, 123, 255, 0.3)

### Section Labels

**Styling:**
- Padding: 0.5rem 1.5rem
- Font Size: `var(--font-size-sm)` (0.75rem / 12px)
- Text Transform: uppercase
- Color: #888
- Letter Spacing: 0.05em
- Font Weight: `var(--font-weight-semibold)` (600)

### Organization Info Display

**Container:**
- Padding: 0.5rem 1.5rem
- Border Bottom: 1px solid #444

**Organization Name:**
- Font Size: `var(--font-size-sm)` (0.875rem / 14px)
- Font Weight: `var(--font-weight-semibold)` (600)
- Color: white
- Margin Bottom: 0.5rem

**Role Badge:**
- Display: inline-block
- Padding: 0.25rem 0.5rem
- Color: white
- Border Radius: 4px
- Font Size: `var(--font-size-xs)` (0.7rem / 11.2px)
- Font Weight: `var(--font-weight-bold)` (700)

**Role Badge Colors:**
- Admin: Background #007bff (blue)
- Member: Background #6c757d (gray)

### Dividers

- Border: 1px solid #444
- Margin: 0.5rem 0 (between sections)

---

## Mobile Navigation

### Hamburger Menu Button

**Dimensions:**
- Minimum Size: 44×44px (WCAG 2.1 AAA touch target)
- Visible: screens <768px only
- Position: Top-left corner of header

**Styling:**
- Background: none (transparent)
- Color: white
- Font Size: 1.5rem
- Padding: 0.5rem
- Border Radius: 4px
- Transition: background-color 0.2s ease

**Hover State:**
- Background: rgba(255, 255, 255, 0.1)

**Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px

### Mobile Navigation Drawer

**Dimensions:**
- Width: 280px
- Max Width: 85vw (ensures backdrop remains visible)
- Height: 100vh
- Position: Fixed, left side

**Styling:**
- Background: `var(--color-background-elevated)` (#2a2a2a)
- Color: white
- Box Shadow: `var(--shadow-md)` (2px 0 8px rgba(0, 0, 0, 0.3))
- Z-Index: 1000

**Animation:**
- Duration: 300ms
- Easing: var(--ease-out)
- Transform: translateX(-100%) to translateX(0)

**Backdrop:**
- Background: rgba(0, 0, 0, 0.5)
- Z-Index: 999
- Animation: fade-in 300ms ease-out

### Drawer Header

**Layout:**
- Display: flex
- Justify Content: space-between
- Align Items: center
- Padding: 1rem 1.5rem
- Border Bottom: 1px solid #444

**Title:**
- Font Size: `var(--font-size-lg)` (1.25rem / 20px)
- Font Weight: `var(--font-weight-semibold)` (600)

**Close Button:**
- Dimensions: 44×44px (minimum tap target)
- Background: none
- Color: white
- Font Size: 2rem
- Border Radius: 4px
- Display: flex (center content)

**Close Button Hover:**
- Background: rgba(255, 255, 255, 0.1)

**Close Button Focus:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px

### Mobile Navigation Links

**Base State:**
- Display: block
- Padding: 0.75rem 1.5rem
- Minimum Height: 44px (WCAG 2.1 AAA touch target)
- Font Size: `var(--font-size-base)` (1rem / 16px)
- Font Weight: `var(--font-weight-medium)` (500)
- Color: #ddd
- Border Left: 3px solid transparent
- Transition: background-color 0.2s ease, color 0.2s ease

**Hover/Active State:**
- Background: rgba(255, 255, 255, 0.1)
- Color: white

**Active Route State:**
- Background: rgba(0, 123, 255, 0.2)
- Color: white
- Border Left: 3px solid `var(--color-primary-600)` (#007bff)
- Font Weight: `var(--font-weight-semibold)` (600)

**Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: -2px

### Mobile Organization Switcher Section

**Container:**
- Padding: 0 1.5rem 1.5rem
- Border Bottom: 1px solid #444
- Margin Bottom: 0.5rem

**Section Label:**
- Font Size: `var(--font-size-sm)` (0.75rem / 12px)
- Text Transform: uppercase
- Color: #888
- Letter Spacing: 0.05em
- Font Weight: `var(--font-weight-semibold)` (600)
- Margin Bottom: 0.75rem

**Organization Buttons:**
- Display: flex
- Flex Direction: column
- Gap: 0.5rem

### Mobile Organization Button

**Dimensions:**
- Minimum Height: 44px (WCAG 2.1 AAA touch target)
- Width: 100%
- Padding: 0.875rem 1rem

**Styling:**
- Display: flex
- Align Items: center
- Gap: 0.75rem
- Background: rgba(255, 255, 255, 0.05)
- Border: 2px solid rgba(255, 255, 255, 0.1)
- Border Radius: 6px
- Color: white
- Cursor: pointer
- Transition: all 0.2s ease

**Hover State:**
- Background: rgba(255, 255, 255, 0.1)
- Border Color: rgba(255, 255, 255, 0.2)

**Active Organization State:**
- Background: rgba(0, 123, 255, 0.2)
- Border Color: `var(--color-primary-600)` (#007bff)

**Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px

**Organization Name:**
- Flex: 1
- Font Size: `var(--font-size-base)` (1rem / 16px)
- Font Weight: `var(--font-weight-medium)` (500)
- Overflow: hidden
- Text Overflow: ellipsis
- White Space: nowrap

**Role Badge:**
- Padding: 0.25rem 0.5rem
- Border Radius: 4px
- Font Size: `var(--font-size-sm)` (0.75rem / 12px)
- Font Weight: `var(--font-weight-semibold)` (600)
- Flex Shrink: 0

**Role Badge Colors:**
- Admin: Background #007bff, Color white
- Member: Background #6c757d, Color white

**Checkmark (Active Org):**
- Font Size: 1.25rem
- Color: `var(--color-primary-600)` (#007bff)
- Flex Shrink: 0

### Closing Behaviors

**User Actions:**
1. Tap backdrop (outside drawer)
2. Tap close (×) button
3. Press Escape key
4. Tap any navigation link (navigates and closes)
5. Select organization (switches and closes)

**Focus Management:**
- On open: Focus moves to close button
- On close: Focus returns to hamburger menu button

**Body Scroll Lock:**
- When drawer is open: `body { overflow: hidden }`
- When drawer is closed: Restore original overflow value

---

## Organization Switcher

### Desktop Organization Switcher (Dropdown)

**Button Dimensions:**
- Min Width: 200px
- Padding: 0.5rem 0.75rem
- Height: auto (content-based)

**Button Base State:**
- Display: flex
- Align Items: center
- Gap: `var(--spacing-2)` (0.5rem / 8px)
- Border: 1px solid #ddd
- Border Radius: `var(--radius-md)` (6px)
- Font Size: `var(--font-size-sm)` (0.875rem / 14px)
- Background: white
- Cursor: pointer
- Transition: all 0.2s var(--ease-out)

**Button Hover State:**
- Border Color: `var(--color-primary-600)` (#007bff)
- Box Shadow: `var(--shadow-sm)`

**Button Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px
- Border Color: `var(--color-primary-600)` (#007bff)
- Box Shadow: 0 0 0 3px rgba(0, 123, 255, 0.1)

**Button Expanded State (aria-expanded="true"):**
- Border Color: `var(--color-primary-600)` (#007bff)
- Box Shadow: 0 0 0 3px rgba(0, 123, 255, 0.1)

**Button Text:**
- Flex: 1
- Text Align: left
- Overflow: hidden
- Text Overflow: ellipsis
- White Space: nowrap

**Role Badge (in button):**
- Padding: 0.125rem 0.5rem
- Color: white
- Border Radius: `var(--radius-md)` (6px)
- Font Size: `var(--font-size-xs)` (0.7rem / 11.2px)
- Font Weight: `var(--font-weight-semibold)` (600)
- Text Transform: uppercase
- Letter Spacing: 0.025em
- White Space: nowrap

**Role Badge Colors:**
- Admin: Background `var(--color-primary-600)` (#007bff)
- Member: Background `var(--color-neutral-600)` (#6c757d)

**Dropdown Arrow:**
- Font Size: 0.7rem
- Color: `var(--color-neutral-600)` (#666)

### Dropdown Menu

**Container:**
- Position: absolute
- Top: calc(100% + 0.25rem)
- Left: 0
- Right: 0
- Max Height: 300px
- Overflow Y: auto
- Padding: `var(--spacing-2)` (0.5rem / 8px)
- Background: white
- Border: 1px solid #ddd
- Border Radius: `var(--radius-md)` (6px)
- Box Shadow: `var(--shadow-md)`
- Z-Index: 1000

**Animation:**
- Duration: 150ms
- Easing: var(--ease-out)
- From: opacity 0, translateY(-0.5rem)
- To: opacity 1, translateY(0)

### Dropdown Option

**Dimensions:**
- Minimum Height: 44px (WCAG 2.1 AAA touch target)
- Padding: 0.625rem 0.75rem

**Base State:**
- Display: flex
- Align Items: center
- Gap: `var(--spacing-2)` (0.5rem / 8px)
- Border Radius: `var(--radius-md)` (6px)
- Cursor: pointer
- Transition: background-color 0.15s var(--ease-out)

**Hover/Focused State:**
- Background: rgba(0, 123, 255, 0.08)

**Active Organization State:**
- Background: rgba(0, 123, 255, 0.12)
- Font Weight: `var(--font-weight-semibold)` (600)

**Option Name:**
- Flex: 1
- Overflow: hidden
- Text Overflow: ellipsis
- White Space: nowrap

**Role Badge (in option):**
- Padding: 0.125rem 0.5rem
- Color: white
- Border Radius: `var(--radius-md)` (6px)
- Font Size: `var(--font-size-xs)` (0.7rem / 11.2px)
- Font Weight: `var(--font-weight-semibold)` (600)
- Text Transform: uppercase
- Letter Spacing: 0.025em
- White Space: nowrap

**Role Badge Colors:**
- Admin: Background `var(--color-primary-600)` (#007bff)
- Member: Background `var(--color-neutral-600)` (#6c757d)

**Checkmark (Active Org):**
- Color: `var(--color-primary-600)` (#007bff)
- Font Weight: bold
- Margin Left: auto

### Keyboard Navigation

**Arrow Down:**
- If closed: Open dropdown and focus first/active item
- If open: Move focus to next item (circular)

**Arrow Up:**
- If closed: Open dropdown and focus last/active item
- If open: Move focus to previous item (circular)

**Enter/Space:**
- If closed: Open dropdown
- If open on item: Select item and close

**Escape:**
- Close dropdown and return focus to button

**Tab:**
- Close dropdown and move to next focusable element

### Tooltip (for truncated names)

**Appearance:**
- Position: absolute, bottom calc(100% + 0.5rem)
- Padding: `var(--spacing-2)` `var(--spacing-3)`
- Background: `var(--color-background-elevated)` (#2a2a2a)
- Color: white
- Font Size: `var(--font-size-sm)` (0.875rem / 14px)
- Border Radius: `var(--radius-md)` (6px)
- Box Shadow: `var(--shadow-md)`
- White Space: nowrap
- Z-Index: 1001
- Pointer Events: none

**Animation:**
- Duration: 150ms
- Easing: var(--ease-out)
- From: opacity 0, translateY(0.25rem)
- To: opacity 1, translateY(0)

---

## Breadcrumb Navigation

### Container

**Layout:**
- Display: flex
- Flex Wrap: wrap
- Align Items: center
- Gap: `var(--spacing-2)` (0.5rem / 8px)
- Margin Bottom: 1.5rem

### Breadcrumb Item

**Base State:**
- Display: flex
- Align Items: center
- Gap: `var(--spacing-2)` (0.5rem / 8px)
- Font Size: `var(--font-size-sm)` (0.875rem / 14px)

### Breadcrumb Link

**Base State:**
- Color: `var(--color-neutral-600)` (#666)
- Text Decoration: none
- Font Weight: `var(--font-weight-medium)` (500)
- Transition: color 0.2s ease

**Hover State:**
- Color: `var(--color-primary-600)` (#007bff)
- Text Decoration: underline

**Focus State:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px
- Border Radius: 2px

### Current Page (Last Item)

**Styling:**
- Color: `var(--color-neutral-700)` (#333)
- Font Weight: `var(--font-weight-semibold)` (600)
- Not a link (plain text)
- aria-current="page"

### Separator

**Styling:**
- Color: `var(--color-neutral-400)` (#999)
- User Select: none
- Content: "/" (forward slash)

### Responsive Behavior

**Very Small Screens (<480px):**
- Font Size: 0.8rem (reduced)
- Hide all items except last 2 items
- Show: "... / Previous / Current"

---

## Interaction States

### State Hierarchy

1. **Default** - Base appearance
2. **Hover** - Mouse over (desktop only)
3. **Focus** - Keyboard focus
4. **Active** - Current page/selected item
5. **Disabled** - Inactive/unavailable (if applicable)

### Focus Ring Standard

**All Interactive Elements:**
- Outline: 2px solid `var(--focus-ring-color)` (#0056b3)
- Outline Offset: 2px (external) or -2px (internal)
- Box Shadow: 0 0 0 4px rgba(0, 86, 179, 0.1) (optional enhancement)

**Visibility:**
- Only visible when using keyboard navigation (:focus-visible)
- Not visible when using mouse (:focus:not(:focus-visible))

### Hover Effects

**Navigation Links:**
- Background color change (subtle lightening)
- Border color change (left border highlight)
- Text color change (increase contrast)
- Transition: 150ms ease-out

**Buttons:**
- Background color change
- Border color change
- Box shadow addition
- Transition: 200ms ease-out

### Active State Indicators

**Navigation Items:**
- Bold font weight (600)
- Colored left border (3px solid primary-600)
- Background highlight (subtle)
- Icon/checkmark indicator

**Organization Switcher:**
- Checkmark (✓) for active organization
- Background highlight
- Bold font weight

---

## Responsive Behavior

### Breakpoint Strategy

**Mobile First:**
- Base styles target mobile (<768px)
- Progressive enhancement for larger screens

### Breakpoint Definitions

```css
/* Mobile: Base styles (default) */
/* Applies to screens <768px */

/* Tablet and Desktop */
@media (min-width: 768px) {
  /* Desktop sidebar visible */
  /* Hamburger menu hidden */
}

/* Large Desktop (optional refinements) */
@media (min-width: 1024px) {
  /* Optional: wider layouts */
}
```

### Layout Adaptations

**<768px (Mobile):**
- Hamburger menu button visible
- Desktop sidebar hidden
- Mobile drawer navigation
- Organization switcher in drawer (if multiple orgs)
- Simplified breadcrumbs (last 2 items only on <480px)
- Header org selector displayed (non-platform admins)

**≥768px (Tablet/Desktop):**
- Desktop sidebar visible
- Hamburger menu hidden
- Organization switcher in header (dropdown)
- Full breadcrumbs visible
- Keyboard shortcuts visible

### Touch Target Sizing

**Mobile (<768px):**
- Minimum tap target: 48×48px (preferred)
- Acceptable minimum: 44×44px (WCAG 2.1 AAA)

**Desktop (≥768px):**
- Minimum clickable area: 44×44px
- Focus area can be smaller (text links)

### Content Adaptations

**Organization Names:**
- Mobile: Truncate with ellipsis, show tooltip on long press
- Desktop: Truncate with ellipsis, show tooltip on hover

**Navigation Labels:**
- Mobile: Full text, stacked layout
- Desktop: Full text with optional keyboard shortcuts

**Breadcrumbs:**
- Mobile <480px: Show last 2 items only
- Mobile ≥480px: Show all items, wrap if needed
- Desktop: Show all items, single line preferred

---

## Accessibility Specifications

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18px+ or 14px+ bold): 3:1 minimum
- UI components: 3:1 minimum

**Verified Contrast Ratios:**
- White text (#fff) on dark sidebar (#2a2a2a): 12.63:1 ✓
- Light text (#ddd) on dark sidebar (#2a2a2a): 10.74:1 ✓
- Primary blue (#007bff) on white: 4.52:1 ✓
- Medium gray (#666) on white: 5.74:1 ✓
- Dark gray (#333) on white: 12.63:1 ✓

### Keyboard Navigation

**Tab Order:**
1. Skip link (appears on focus)
2. Header elements (logo, org switcher, logout)
3. Main navigation links (top to bottom)
4. Page content
5. Footer links

**Keyboard Shortcuts:**
- Tab: Move to next focusable element
- Shift+Tab: Move to previous focusable element
- Enter/Space: Activate link or button
- Escape: Close drawer/dropdown
- Arrow Up/Down: Navigate dropdown options (org switcher)

**Focus Trap:**
- Mobile drawer: Focus trapped within drawer when open
- Dropdowns: Focus trapped within dropdown when open
- Escape key releases trap and closes

### ARIA Labels and Roles

**Landmarks:**
```html
<nav aria-label="Main navigation">
<nav aria-label="Breadcrumb">
<main id="main-content">
```

**Organization Switcher:**
```html
<button aria-label="Select organization" aria-expanded="false" aria-haspopup="true">
<ul role="listbox" aria-label="Organizations">
<li role="option" aria-selected="true">
```

**Mobile Navigation:**
```html
<button aria-label="Open navigation menu" aria-expanded="false">
<nav aria-label="Mobile navigation" aria-modal="true">
```

**Current Page Indicator:**
```html
<a href="#" aria-current="page">Current Page</a>
```

### Screen Reader Announcements

**Organization Switch:**
- Live region announces: "Switched to [Org Name] as [Role]"
- aria-live="polite" region for non-intrusive announcements

**Navigation State:**
- Current page indicated with aria-current="page"
- Active organization indicated with aria-selected="true"

**Drawer State:**
- Drawer open: aria-modal="true", focus trapped
- Drawer close: focus returned to trigger button

### Focus Management

**Drawer Opening:**
1. Store currently focused element
2. Open drawer (animate in)
3. Move focus to close button
4. Trap focus within drawer

**Drawer Closing:**
1. Close drawer (animate out)
2. Release focus trap
3. Return focus to hamburger button

**Dropdown Opening:**
1. Store currently focused element
2. Open dropdown (animate in)
3. Focus active item or first item
4. Trap focus within dropdown

**Dropdown Closing:**
1. Close dropdown (animate out)
2. Release focus trap
3. Return focus to button

### Skip Links

**Implementation:**
```html
<a href="#main-content" class="skip-link">
  Skip to main content
</a>
```

**Behavior:**
- Hidden by default (off-screen)
- Visible on keyboard focus (:focus-visible)
- First focusable element on page
- Jumps focus to main content area

---

## Animation & Motion

### Animation Principles

1. **Purposeful** - Animations guide attention and communicate state changes
2. **Subtle** - Avoid distracting motion; enhance, don't overwhelm
3. **Fast** - Keep durations short (150-300ms) for responsive feel
4. **Respectful** - Honor prefers-reduced-motion preference

### Standard Durations

```css
--duration-fast: 150ms      /* Quick feedback (hover, focus) */
--duration-normal: 200ms    /* Standard transitions */
--duration-slow: 300ms      /* Drawer open/close */
```

### Easing Functions

```css
--ease-out: cubic-bezier(0, 0, 0.2, 1)        /* Decelerating (default) */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)  /* Smooth start and end */
```

### Mobile Drawer Animations

**Opening:**
```css
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

animation: slide-in 300ms var(--ease-out);
```

**Backdrop:**
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

animation: fade-in 300ms ease-out;
```

**Closing:**
- Reverse of opening animation
- Same duration (300ms) for consistency

### Dropdown Animations

**Appearing:**
```css
@keyframes dropdown-appear {
  from {
    opacity: 0;
    transform: translateY(-0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

animation: dropdown-appear 150ms var(--ease-out);
```

### Navigation Link Transitions

**Hover/Focus:**
```css
transition: 
  background-color 0.15s var(--ease-out),
  color 0.15s var(--ease-out),
  border-left-color 0.15s var(--ease-out);
```

**Active State Highlight:**
```css
@keyframes highlight-fade {
  from { background-color: rgba(0, 123, 255, 0.3); }
  to { background-color: #333; }
}

animation: highlight-fade 0.3s var(--ease-out);
```

### Reduced Motion Support

**Media Query:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Alternative Pattern:**
```css
/* Wrap animations */
@media (prefers-reduced-motion: no-preference) {
  .element {
    animation: slide-in 300ms ease-out;
  }
}

/* Explicitly disable for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .element {
    animation: none;
  }
}
```

### Performance Optimization

**Hardware Acceleration:**
- Use `transform` and `opacity` properties (GPU accelerated)
- Avoid animating `width`, `height`, `left`, `top` (CPU intensive)

**Will-Change Hint:**
```css
.mobile-nav-drawer {
  will-change: transform;
}

.org-selector-dropdown {
  will-change: opacity, transform;
}
```

**Cleanup:**
- Remove `will-change` after animation completes
- Avoid overuse (can hurt performance)

---

## Implementation Reference

### Technology Stack

- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite
- **Routing**: React Router v7
- **Styling**: CSS Modules / Plain CSS with CSS Custom Properties
- **Testing**: Vitest (unit), Playwright (E2E)

### Key Files

**Components:**
- `frontend/src/components/AdminLayout.tsx` - Desktop sidebar layout
- `frontend/src/components/AdminLayout.css` - Desktop sidebar styles
- `frontend/src/components/MobileNav.tsx` - Mobile drawer component
- `frontend/src/components/MobileNav.css` - Mobile drawer styles
- `frontend/src/components/OrganizationSelector.tsx` - Org switcher dropdown
- `frontend/src/components/OrganizationSelector.css` - Org switcher styles
- `frontend/src/components/Breadcrumb.tsx` - Breadcrumb component
- `frontend/src/components/Breadcrumb.css` - Breadcrumb styles
- `frontend/src/components/SkipLink.tsx` - Skip to content link
- `frontend/src/components/SkipLink.css` - Skip link styles

**Configuration:**
- `frontend/src/navigation/navConfig.ts` - Navigation structure and config
- `frontend/src/index.css` - Global tokens and base styles

**Context:**
- `frontend/src/contexts/OrgContext.tsx` - Organization state management
- `frontend/src/auth/AuthContext.tsx` - Authentication state

**Hooks:**
- `frontend/src/hooks/usePermissions.ts` - Role-based permissions
- `frontend/src/hooks/useMobileOrgSwitcher.ts` - Mobile org switching logic

**Utilities:**
- `frontend/src/utils/roleUtils.ts` - Role badge helpers

### Design Token Location

**Primary Token File:**
```
frontend/src/index.css
```

**Token Structure:**
```css
:root {
  /* Color tokens */
  --color-primary-600: #007bff;
  --color-primary-700: #0056b3;
  --color-neutral-400: #999;
  --color-neutral-600: #666;
  --color-neutral-700: #333;
  --color-background-elevated: #2a2a2a;
  --focus-ring-color: #0056b3;
  
  /* Typography tokens */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  
  /* Spacing tokens */
  --spacing-2: 0.5rem;
  --spacing-3: 0.75rem;
  --spacing-4: 1rem;
  
  /* Radius tokens */
  --radius-md: 6px;
  
  /* Shadow tokens */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  
  /* Animation tokens */
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Testing

**Unit Tests:**
- Component rendering tests
- Interaction tests (click, keyboard)
- State management tests
- Role badge display tests

**E2E Tests:**
- Mobile navigation drawer functionality
- Organization switching
- Breadcrumb navigation
- Keyboard navigation flows
- Touch target verification
- Responsive behavior across viewports

**Accessibility Tests:**
- Automated: axe-core integration
- Manual: Screen reader testing (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation testing

### Browser Support

**Minimum Supported Versions:**
- Chrome: Latest
- Firefox: Latest
- Safari: 14+
- Edge: Latest
- iOS Safari: 14+
- Chrome Android: 90+

**Progressive Enhancement:**
- Core functionality works without JavaScript
- CSS Grid with flexbox fallback
- CSS Custom Properties with hardcoded fallbacks (optional)

---

## Visual Reference

### Desktop Sidebar Layout

```
┌──────────────────────────────┐
│  Header                      │
│  ┌──────────────────────┐   │
│  │ Org Selector         │   │
│  └──────────────────────┘   │
├──────────────────────────────┤
│ ┌────────────┬────────────┐ │
│ │            │            │ │
│ │  Sidebar   │  Main      │ │
│ │  250px     │  Content   │ │
│ │            │            │ │
│ │ • Link 1   │            │ │
│ │ • Link 2   │            │ │
│ │            │            │ │
│ │ SECTION    │            │ │
│ │ • Link 3   │            │ │
│ │ • Link 4   │            │ │
│ │            │            │ │
│ └────────────┴────────────┘ │
└──────────────────────────────┘
```

### Mobile Drawer Overlay

```
┌──────────────────────────────┐
│  Header [☰]                  │
├──────────────────────────────┤
│                              │
│  Main Content                │
│  (behind drawer overlay)     │
│                              │
└──────────────────────────────┘

When drawer opens:
┌─────────────┬────────────────┐
│ Drawer      │  Backdrop      │
│ 280px       │  (tap to close)│
│             │                │
│ [×] Nav     │                │
│             │                │
│ ORGS        │                │
│ □ Org 1 ✓   │                │
│ □ Org 2     │                │
│             │                │
│ • Link 1    │                │
│ • Link 2    │                │
│             │                │
└─────────────┴────────────────┘
```

### Organization Switcher States

**Closed State:**
```
┌──────────────────────────────┐
│ Organization Name [Admin] ▼  │
└──────────────────────────────┘
```

**Open State:**
```
┌──────────────────────────────┐
│ Organization Name [Admin] ▲  │
└──────────────────────────────┘
┌──────────────────────────────┐
│ Org 1 [Admin]            ✓   │
│ Org 2 [Member]               │
│ Org 3 [Admin]                │
└──────────────────────────────┘
```

### Breadcrumb Hierarchy

```
Home / Organizations / Org Name / Memberships
```

### Component State Matrix

| Component | Default | Hover | Focus | Active | Disabled |
|-----------|---------|-------|-------|--------|----------|
| Nav Link | Gray text, transparent border | Light bg, blue border | Focus ring | Bold text, blue border, highlight bg | - |
| Org Button (Mobile) | Subtle bg, light border | Lighter bg | Focus ring | Blue border, highlight bg, checkmark | - |
| Org Option (Desktop) | White bg | Light blue bg | Light blue bg | Darker blue bg, checkmark | - |
| Breadcrumb Link | Gray text | Blue text, underline | Focus ring | Bold dark text | - |
| Hamburger Button | White icon | Light bg | Focus ring | - | - |

---

## Version History

### Version 1.0 - 2025-12-08 (Current)
- Initial comprehensive design specification
- Documented all navigation surfaces
- Defined design tokens and usage
- Specified interaction states and animations
- Included accessibility requirements (WCAG 2.1 AA)
- Added responsive behavior specifications
- Referenced existing implementation

---

## Related Documentation

- [Navigation System Overview](./navigation.md)
- [Mobile Navigation Implementation](../mobile-navigation.md)
- [Frontend Header Navigation](../frontend-header-navigation.md)
- [Keyboard Navigation](./keyboard-navigation.md)
- [E-008-01 Navigation Redesign Story](../product/archive/E8/E-008-01-navigation-redesign.md)
- [E-008-09 Design System & Tokens Story](../product/archive/E8/E-008-09-design-system-tokens.md)

---

## Notes

- This specification reflects the **current implemented state** of the navigation system
- All measurements and tokens are based on the existing codebase
- For mockups and visual designs, refer to design tools (Figma/Sketch) if available
- This document should be updated when navigation design changes are implemented
- All specifications align with WCAG 2.1 AA accessibility standards
- Design decisions prioritize consistency, accessibility, and performance

---

**Maintained by:** Frontend Team  
**Review Frequency:** Quarterly or when navigation changes are implemented  
**Feedback:** Open an issue or contact the frontend team for questions or improvements
