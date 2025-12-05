# Navigation System Documentation

## Overview

The FanEngagement application features a comprehensive navigation system designed for accessibility, mobile-friendliness, and clear user orientation. This document describes the navigation architecture, components, and usage patterns.

## Design Principles

1. **Accessibility First**: WCAG 2.1 AA compliant with keyboard navigation, screen reader support, and clear focus indicators
2. **Responsive Design**: Mobile-first approach with hamburger menu on small screens and sidebar on desktop
3. **Context Awareness**: Navigation adapts based on user role, active organization, and current location
4. **Visual Clarity**: Clear active states, role badges, and section labeling

## Components

### Core Navigation Components

#### SkipLink
Allows keyboard users to jump directly to main content, bypassing navigation.

**Features:**
- Hidden by default, visible on keyboard focus
- Positioned at top of page when focused
- Respects `prefers-reduced-motion`

#### Breadcrumb
Displays navigation hierarchy to help users understand their location.

**Features:**
- ARIA landmark with `aria-label="Breadcrumb"`
- Last item marked with `aria-current="page"`
- Responsive (hides earlier items on mobile)

#### MobileNav
Touch-friendly navigation drawer for mobile devices.

**Features:**
- Slide-in animation from left
- 44px minimum tap targets
- Backdrop click to close
- Escape key support

## Accessibility Features

### Keyboard Navigation

- **Tab / Shift+Tab**: Navigate between links
- **Enter**: Activate link or button
- **Escape**: Close mobile menu
- **Arrow Keys**: Navigate within org selector

### ARIA Landmarks

All layouts include proper landmark roles:
- `role="banner"` for headers
- `role="navigation"` for nav elements
- `role="main"` for main content

### Screen Reader Support

- All interactive elements have accessible names
- Active items marked with `aria-current="page"`
- Org switching announces via `aria-live="polite"`

## Design Tokens

All components use CSS custom properties:

- Colors: `--color-primary-600`, `--focus-ring-color`
- Typography: `--font-size-sm`, `--font-weight-semibold`
- Spacing: `--spacing-2`, `--spacing-3`
- Animation: `--ease-out`, `--ease-in-out`

## Responsive Behavior

- **Mobile**: < 768px - Hamburger menu
- **Desktop**: 768px+ - Sidebar navigation

## Related Files

- `frontend/src/navigation/navConfig.ts` - Configuration
- `frontend/src/components/AdminLayout.tsx` - Admin layout
- `frontend/src/components/Layout.tsx` - User layout
- `frontend/src/index.css` - Design tokens
