# Navigation Design Token Usage Guide

**Version:** 1.0  
**Last Updated:** 2025-12-08  
**Purpose:** Practical examples for using design tokens in navigation implementation  
**Related:** [Navigation Design Specifications](./navigation-design-specifications.md)

---

## Overview

This guide provides practical code examples for implementing navigation components using the design token system. Use these examples as a reference when building or modifying navigation elements.

---

## Table of Contents

1. [Token Reference Quick Start](#token-reference-quick-start)
2. [Desktop Navigation Examples](#desktop-navigation-examples)
3. [Mobile Navigation Examples](#mobile-navigation-examples)
4. [Organization Switcher Examples](#organization-switcher-examples)
5. [Breadcrumb Examples](#breadcrumb-examples)
6. [Common Patterns](#common-patterns)
7. [Best Practices](#best-practices)

---

## Token Reference Quick Start

### Essential Tokens for Navigation

```css
/* Copy these into your component CSS file */
/* Note: Some values are hardcoded as they don't exist as CSS custom properties in index.css */

/* Colors */
--color-primary-600: #007bff;
--color-primary-700: #0056b3;
--color-neutral-400: #999;
--color-neutral-600: #666;
--color-neutral-700: #333;
--color-background-elevated: #2a2a2a;
--focus-ring-color: #0056b3;

/* Typography (from index.css) */
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-weight-medium: 500;
--font-weight-semibold: 600;

/* Typography (hardcoded - not in index.css) */
/* Use 0.7rem for extra small text (badges, shortcuts) */
/* Use 1.25rem for large text (mobile nav title) */
/* Use 700 for bold font weight */

/* Spacing */
--spacing-2: 0.5rem;
--spacing-3: 0.75rem;
--spacing-4: 1rem;

/* Effects */
--radius-md: 6px;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

---

## Desktop Navigation Examples

### Navigation Link Component

```css
/* NavLink.css */
.nav-link {
  /* Use spacing tokens for padding */
  padding: var(--spacing-3, 0.75rem) 1.5rem;
  
  /* Use typography tokens */
  font-size: var(--font-size-base, 1rem);
  font-weight: var(--font-weight-medium, 500);
  
  /* Use color tokens */
  color: #ddd;
  
  /* Border for active indicator */
  border-left: 3px solid transparent;
  
  /* Use animation tokens */
  transition: 
    background-color 0.15s var(--ease-out),
    color 0.15s var(--ease-out),
    border-left-color 0.15s var(--ease-out);
}

.nav-link:hover {
  background-color: #333;
  color: white;
  border-left-color: var(--color-primary-600, #007bff);
}

.nav-link.active {
  background-color: #333;
  color: white;
  border-left-color: var(--color-primary-600, #007bff);
  font-weight: var(--font-weight-semibold, 600);
}

.nav-link:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: -2px;
}
```

**Usage in React:**
```tsx
// NavLink.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './NavLink.css';

interface NavLinkProps {
  href: string;
  isActive?: boolean;
  children: React.ReactNode;
}

export const NavLink: React.FC<NavLinkProps> = ({ href, isActive, children }) => {
  return (
    <Link 
      to={href} 
      className={`nav-link ${isActive ? 'active' : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {children}
    </Link>
  );
};
```

### Keyboard Shortcut Badge

```css
/* KeyboardShortcut.css */
.nav-shortcut {
  /* Use typography tokens */
  font-size: var(--font-size-xs, 0.7rem);
  
  /* Use spacing tokens */
  padding: 0.125rem 0.375rem;
  margin-left: var(--spacing-2, 0.5rem);
  
  /* Use radius token */
  border-radius: 3px;
  
  /* Colors */
  color: #888;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Monospace for keyboard keys */
  font-family: monospace;
  letter-spacing: 0.5px;
  
  /* Use animation token */
  transition: 
    background-color 0.15s var(--ease-out),
    color 0.15s var(--ease-out);
}

.nav-link:hover .nav-shortcut {
  background-color: rgba(255, 255, 255, 0.1);
  color: #bbb;
}

.nav-link.active .nav-shortcut {
  background-color: rgba(0, 123, 255, 0.2);
  color: #6ea8fe;
  border-color: rgba(0, 123, 255, 0.3);
}
```

**Usage in React:**
```tsx
// NavLink with shortcut
<Link to="/home" className="nav-link">
  <span className="nav-link-text">Home</span>
  <span className="nav-shortcut">⌘H</span>
</Link>
```

### Section Label

```css
/* SectionLabel.css */
.nav-section-label {
  /* Use spacing tokens */
  padding: 0.5rem 1.5rem;
  
  /* Use typography tokens */
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-semibold, 600);
  
  /* Uppercase and spaced */
  text-transform: uppercase;
  letter-spacing: 0.05em;
  
  /* Use color tokens */
  color: #888;
}
```

**Usage in React:**
```tsx
// Navigation section
<nav>
  <div className="nav-section-label">User</div>
  <NavLink href="/home">Home</NavLink>
  <NavLink href="/account">My Account</NavLink>
  
  <div className="nav-section-label">Organization</div>
  <NavLink href="/org/overview">Overview</NavLink>
  <NavLink href="/org/members">Memberships</NavLink>
</nav>
```

---

## Mobile Navigation Examples

### Mobile Drawer Container

```css
/* MobileDrawer.css */
.mobile-nav-drawer {
  /* Fixed positioning */
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  
  /* Dimensions */
  width: 280px;
  max-width: 85vw;
  
  /* Use background token */
  background-color: var(--color-background-elevated, #2a2a2a);
  color: white;
  
  /* Use shadow token */
  box-shadow: var(--shadow-md, 2px 0 8px rgba(0, 0, 0, 0.3));
  
  /* High z-index */
  z-index: 1000;
  
  /* Flexbox layout */
  display: flex;
  flex-direction: column;
  
  /* Animation */
  animation: slide-in 0.3s var(--ease-out);
}

@keyframes slide-in {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

/* Backdrop */
.mobile-nav-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
  .mobile-nav-drawer,
  .mobile-nav-backdrop {
    animation: none;
  }
}
```

### Mobile Navigation Link

```css
/* MobileNavLink.css */
.mobile-nav-link {
  /* Block display for full-width tap */
  display: block;
  
  /* Use spacing tokens */
  padding: 0.75rem 1.5rem;
  
  /* Touch target */
  min-height: 44px;
  
  /* Use typography tokens */
  font-size: var(--font-size-base, 1rem);
  font-weight: var(--font-weight-medium, 500);
  
  /* Colors */
  color: #ddd;
  text-decoration: none;
  
  /* Border for active indicator */
  border-left: 3px solid transparent;
  
  /* Use animation tokens */
  transition: 
    background-color 0.2s ease,
    color 0.2s ease;
}

.mobile-nav-link:hover,
.mobile-nav-link:active {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.mobile-nav-link.active {
  background-color: rgba(0, 123, 255, 0.2);
  color: white;
  border-left-color: var(--color-primary-600, #007bff);
  font-weight: var(--font-weight-semibold, 600);
}
```

### Hamburger Button

```css
/* HamburgerButton.css */
.hamburger-button {
  /* Remove default button styles */
  background: none;
  border: none;
  
  /* Colors */
  color: white;
  
  /* Typography */
  font-size: 1.5rem;
  
  /* Use spacing tokens */
  padding: var(--spacing-2, 0.5rem);
  
  /* Touch target */
  min-width: 44px;
  min-height: 44px;
  
  /* Flexbox for centering */
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Use radius token */
  border-radius: 4px;
  
  /* Cursor */
  cursor: pointer;
  
  /* Use animation token */
  transition: background-color 0.2s ease;
}

.hamburger-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.hamburger-button:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: 2px;
}

/* Hide on desktop */
@media (min-width: 768px) {
  .hamburger-button {
    display: none;
  }
}
```

---

## Organization Switcher Examples

### Dropdown Button

```css
/* OrgSwitcherButton.css */
.org-selector-button {
  /* Flexbox for content layout */
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  
  /* Use spacing tokens */
  padding: 0.5rem 0.75rem;
  
  /* Dimensions */
  min-width: 200px;
  
  /* Use typography tokens */
  font-size: var(--font-size-sm, 0.875rem);
  
  /* Colors and border */
  background-color: white;
  border: 1px solid #ddd;
  
  /* Use radius token */
  border-radius: var(--radius-md, 6px);
  
  /* Cursor */
  cursor: pointer;
  
  /* Use animation tokens */
  transition: all 0.2s var(--ease-out);
}

.org-selector-button:hover {
  border-color: var(--color-primary-600, #007bff);
  box-shadow: var(--shadow-sm);
}

.org-selector-button:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: 2px;
  border-color: var(--color-primary-600, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.org-selector-button[aria-expanded="true"] {
  border-color: var(--color-primary-600, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}
```

### Role Badge

```css
/* RoleBadge.css */
.role-badge {
  /* Use spacing tokens */
  padding: 0.125rem 0.5rem;
  
  /* Use radius token */
  border-radius: var(--radius-md, 6px);
  
  /* Use typography tokens */
  font-size: var(--font-size-xs, 0.7rem);
  font-weight: var(--font-weight-semibold, 600);
  
  /* Text styling */
  text-transform: uppercase;
  letter-spacing: 0.025em;
  white-space: nowrap;
  
  /* Colors */
  color: white;
}

.role-badge.admin {
  background-color: var(--color-primary-600, #007bff);
}

.role-badge.member {
  background-color: var(--color-neutral-600, #6c757d);
}
```

**Usage in React:**
```tsx
// RoleBadge component
interface RoleBadgeProps {
  role: 'OrgAdmin' | 'Member';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const badgeClass = role === 'OrgAdmin' ? 'admin' : 'member';
  const label = role === 'OrgAdmin' ? 'Admin' : 'Member';
  
  return (
    <span className={`role-badge ${badgeClass}`}>
      {label}
    </span>
  );
};
```

### Dropdown Menu

```css
/* OrgDropdown.css */
.org-selector-dropdown {
  /* Positioning */
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  
  /* Dimensions */
  max-height: 300px;
  overflow-y: auto;
  
  /* Reset list styles */
  margin: 0;
  padding: var(--spacing-2, 0.5rem);
  list-style: none;
  
  /* Colors and border */
  background-color: white;
  border: 1px solid #ddd;
  
  /* Use radius token */
  border-radius: var(--radius-md, 6px);
  
  /* Use shadow token */
  box-shadow: var(--shadow-md);
  
  /* High z-index */
  z-index: 1000;
  
  /* Animation */
  animation: dropdown-appear 0.15s var(--ease-out);
}

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

@media (prefers-reduced-motion: reduce) {
  .org-selector-dropdown {
    animation: none;
  }
}
```

### Dropdown Option

```css
/* OrgOption.css */
.org-selector-option {
  /* Flexbox for content layout */
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  
  /* Use spacing tokens */
  padding: 0.625rem 0.75rem;
  
  /* Touch target */
  min-height: 44px;
  
  /* Use radius token */
  border-radius: var(--radius-md, 6px);
  
  /* Cursor */
  cursor: pointer;
  
  /* Use animation token */
  transition: background-color 0.15s var(--ease-out);
}

.org-selector-option:hover,
.org-selector-option.focused {
  background-color: rgba(0, 123, 255, 0.08);
}

.org-selector-option.active {
  background-color: rgba(0, 123, 255, 0.12);
  font-weight: var(--font-weight-semibold, 600);
}

.org-selector-option-name {
  /* Take available space */
  flex: 1;
  
  /* Truncation */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-selector-option-checkmark {
  /* Use color token */
  color: var(--color-primary-600, #007bff);
  font-weight: bold;
  margin-left: auto;
}
```

---

## Breadcrumb Examples

### Breadcrumb Container

```css
/* Breadcrumb.css */
.breadcrumb {
  /* Use spacing token */
  margin-bottom: 1.5rem;
}

.breadcrumb-list {
  /* Flexbox with wrapping */
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  
  /* Use spacing token for gaps */
  gap: var(--spacing-2, 0.5rem);
  
  /* Reset list styles */
  list-style: none;
  margin: 0;
  padding: 0;
}

.breadcrumb-item {
  /* Flexbox for inline layout */
  display: flex;
  align-items: center;
  gap: var(--spacing-2, 0.5rem);
  
  /* Use typography token */
  font-size: var(--font-size-sm, 0.875rem);
}
```

### Breadcrumb Link

```css
/* BreadcrumbLink.css */
.breadcrumb-link {
  /* Use color token */
  color: var(--color-neutral-600, #666);
  
  /* Remove underline */
  text-decoration: none;
  
  /* Use typography token */
  font-weight: var(--font-weight-medium, 500);
  
  /* Use animation token */
  transition: color 0.2s ease;
}

.breadcrumb-link:hover {
  color: var(--color-primary-600, #007bff);
  text-decoration: underline;
}

.breadcrumb-link:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: 2px;
  border-radius: 2px;
}
```

### Current Page Indicator

```css
/* BreadcrumbCurrent.css */
.breadcrumb-current {
  /* Use color token */
  color: var(--color-neutral-700, #333);
  
  /* Use typography token */
  font-weight: var(--font-weight-semibold, 600);
}
```

### Breadcrumb Separator

```css
/* Separator styling */
.breadcrumb-separator {
  /* Use color token */
  color: var(--color-neutral-400, #999);
  
  /* Prevent text selection */
  user-select: none;
}
```

**Usage in React:**
```tsx
// Breadcrumb component
import React from 'react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumb">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          
          return (
            <li key={index} className="breadcrumb-item">
              {item.path && !isLast ? (
                <Link to={item.path} className="breadcrumb-link">
                  {item.label}
                </Link>
              ) : (
                <span 
                  className="breadcrumb-current"
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
```

---

## Common Patterns

### Focus Ring Standard

```css
/* Apply to all focusable navigation elements */
.focusable-element:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(0, 86, 179, 0.1); /* Optional enhancement */
}

/* For inset focus (inside element boundary) */
.focusable-element-inset:focus-visible {
  outline: 2px solid var(--focus-ring-color, #0056b3);
  outline-offset: -2px;
}

/* Remove focus for mouse users */
.focusable-element:focus:not(:focus-visible) {
  outline: none;
}
```

### Touch Target Sizing

```css
/* Ensure minimum touch targets on mobile */
.touch-target {
  min-height: 44px; /* WCAG 2.1 AAA */
  min-width: 44px;
  
  /* For inline elements, use padding */
  padding: 0.75rem 1rem; /* Typically achieves 44px+ height */
  
  /* Center content */
  display: flex;
  align-items: center;
}

/* Preferred size for better UX */
.touch-target-preferred {
  min-height: 48px;
  min-width: 48px;
}
```

### Active State Indicator

```css
/* Left border highlight for active navigation */
.active-indicator {
  border-left: 3px solid var(--color-primary-600, #007bff);
  background-color: rgba(0, 123, 255, 0.1);
  font-weight: var(--font-weight-semibold, 600);
}

/* Checkmark for active selection */
.active-checkmark::after {
  content: '✓';
  color: var(--color-primary-600, #007bff);
  margin-left: auto;
  font-weight: bold;
}
```

### Truncation with Tooltip

```css
/* Text truncation */
.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Tooltip on hover */
.truncate-text[title]:hover::after {
  content: attr(title);
  position: absolute;
  bottom: calc(100% + 0.5rem);
  left: 0;
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--color-background-elevated, #2a2a2a);
  color: white;
  font-size: var(--font-size-sm, 0.875rem);
  border-radius: var(--radius-md, 6px);
  box-shadow: var(--shadow-md);
  white-space: nowrap;
  z-index: 1001;
  pointer-events: none;
}
```

### Responsive Visibility

```css
/* Show only on mobile */
.mobile-only {
  display: block;
}

@media (min-width: 768px) {
  .mobile-only {
    display: none;
  }
}

/* Show only on desktop */
.desktop-only {
  display: none;
}

@media (min-width: 768px) {
  .desktop-only {
    display: block;
  }
}
```

---

## Best Practices

### 1. Always Use Design Tokens

**❌ Bad:**
```css
.nav-link {
  color: #666;
  font-size: 14px;
  padding: 12px 24px;
  border-radius: 6px;
}
```

**✅ Good:**
```css
.nav-link {
  color: var(--color-neutral-600, #666);
  font-size: var(--font-size-sm, 0.875rem);
  padding: var(--spacing-3, 0.75rem) 1.5rem;
  border-radius: var(--radius-md, 6px);
}
```

### 2. Provide Fallback Values

```css
/* Always provide fallback for tokens */
color: var(--color-primary-600, #007bff);
/*      ^token name           ^fallback */
```

### 3. Use Semantic Token Names

**❌ Bad:**
```css
color: var(--blue-500);
```

**✅ Good:**
```css
color: var(--color-primary-600);
```

### 4. Respect Reduced Motion

```css
/* Wrap animations in media query */
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

### 5. Use Proper ARIA Labels

```tsx
// Always provide accessible names
<button
  aria-label="Open navigation menu"
  aria-expanded={isOpen}
  aria-controls="mobile-nav"
>
  ☰
</button>

<nav
  id="mobile-nav"
  aria-label="Main navigation"
  aria-hidden={!isOpen}
>
  {/* Navigation content */}
</nav>
```

### 6. Maintain Focus Management

```tsx
// Focus trap example
useEffect(() => {
  if (isOpen) {
    // Store currently focused element
    const previousFocus = document.activeElement;
    
    // Focus first element in drawer
    closeButtonRef.current?.focus();
    
    return () => {
      // Restore focus on close
      previousFocus?.focus();
    };
  }
}, [isOpen]);
```

### 7. Use Touch-Friendly Sizes

```css
/* Always ensure minimum touch targets */
.touch-element {
  min-height: 44px;
  min-width: 44px;
  
  /* Or use padding to achieve size */
  padding: 0.75rem 1rem; /* ~44px height */
}
```

### 8. Consistent Hover States

```css
/* Use consistent hover pattern */
.interactive-element {
  transition: background-color 0.2s var(--ease-out);
}

.interactive-element:hover {
  background-color: rgba(255, 255, 255, 0.1);
}
```

### 9. Test Color Contrast

```
Use tools to verify:
- Normal text: 4.5:1 minimum
- Large text: 3:1 minimum
- UI components: 3:1 minimum

Recommended tools:
- WebAIM Contrast Checker
- Chrome DevTools Lighthouse
- axe DevTools
```

### 10. Document Custom Patterns

```css
/**
 * Custom navigation link pattern
 * 
 * Usage:
 * <a href="#" class="nav-link" aria-current="page">Link</a>
 * 
 * Tokens used:
 * - --color-primary-600 (active border)
 * - --font-weight-semibold (active text)
 * - --spacing-3 (padding)
 * 
 * States: default, hover, active, focus
 */
.nav-link { /* ... */ }
```

---

## Token Migration Checklist

When converting hardcoded values to tokens:

- [ ] Replace color hex codes with `var(--color-*)` tokens
- [ ] Replace pixel font-sizes with `var(--font-size-*)` tokens
- [ ] Replace numeric font-weights with `var(--font-weight-*)` tokens
- [ ] Replace pixel spacing with `var(--spacing-*)` tokens
- [ ] Replace border-radius values with `var(--radius-*)` tokens
- [ ] Replace box-shadow values with `var(--shadow-*)` tokens
- [ ] Replace easing functions with `var(--ease-*)` tokens
- [ ] Test visual consistency before and after migration
- [ ] Verify accessibility (contrast ratios, focus rings)
- [ ] Update tests if they reference specific values

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│ Navigation Token Quick Reference                    │
├─────────────────────────────────────────────────────┤
│ Colors:                                             │
│   Primary: var(--color-primary-600)     #007bff    │
│   Focus:   var(--focus-ring-color)      #0056b3    │
│   Text:    var(--color-neutral-700)     #333       │
│                                                     │
│ Typography:                                         │
│   Body:    var(--font-size-base)        1rem       │
│   Small:   var(--font-size-sm)          0.875rem   │
│   Bold:    var(--font-weight-semibold)  600        │
│                                                     │
│ Spacing:                                            │
│   Small:   var(--spacing-2)             0.5rem     │
│   Medium:  var(--spacing-3)             0.75rem    │
│   Large:   var(--spacing-4)             1rem       │
│                                                     │
│ Effects:                                            │
│   Radius:  var(--radius-md)             6px        │
│   Shadow:  var(--shadow-md)             ...        │
│   Easing:  var(--ease-out)              cubic-bez  │
└─────────────────────────────────────────────────────┘
```

---

## Additional Resources

### Token Documentation
- [Navigation Design Specifications](./navigation-design-specifications.md)
- [Visual Mockup Guide](./navigation-visual-mockup-guide.md)

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [cubic-bezier.com](https://cubic-bezier.com) - Easing function visualizer
- [Can I Use](https://caniuse.com) - Browser support checker

### Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)

---

## Version History

### Version 1.0 - 2025-12-08 (Current)
- Initial token usage guide
- Code examples for all navigation components
- Common patterns and best practices
- Migration checklist

---

**Maintained by:** Frontend Team  
**Questions:** Open an issue or contact the frontend team
