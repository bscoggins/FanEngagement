# FanEngagement Design System

**Version:** 1.0  
**Last Updated:** 2025-12-08  
**Status:** Authoritative Reference

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing](#spacing)
6. [Shadows & Elevation](#shadows--elevation)
7. [Border Radii](#border-radii)
8. [Transitions & Animation](#transitions--animation)
9. [Accessibility](#accessibility)
10. [Usage Guidelines](#usage-guidelines)
11. [Dark Mode Foundation](#dark-mode-foundation)

---

## Overview

The FanEngagement design system provides a comprehensive set of design tokens implemented as CSS custom properties. These tokens ensure visual consistency, improve maintainability, and establish a foundation for theming.

### Design System Principles

1. **Consistency** - Every design decision has a token
2. **Simplicity** - Constrained palette and scale (opinionated choices)
3. **Accessibility** - Built-in contrast and readability (WCAG 2.1 AA)
4. **Flexibility** - Tokens support light/dark modes and customization
5. **Performance** - CSS custom properties with zero runtime cost

### Style Direction

**Primary Direction:** Minimalist / Calm with expressive accents

The design system emphasizes clarity, readability, and a professional aesthetic that supports both member engagement and administrative efficiency.

---

## Color System

### Brand Colors

The primary brand color is blue, used for primary actions, links, and brand emphasis.

```css
--color-primary-50: hsl(210, 100%, 97%)   /* Very light blue - backgrounds */
--color-primary-100: hsl(210, 100%, 95%)  /* Light blue - hover backgrounds */
--color-primary-200: hsl(210, 100%, 90%)
--color-primary-300: hsl(210, 100%, 80%)
--color-primary-400: hsl(210, 100%, 65%)
--color-primary-500: hsl(210, 100%, 55%)
--color-primary-600: hsl(210, 100%, 50%)  /* #007bff - Main brand color */
--color-primary-700: hsl(210, 100%, 42%)  /* #0056b3 - Hover/active states */
--color-primary-800: hsl(210, 100%, 35%)
--color-primary-900: hsl(210, 100%, 20%)  /* Very dark blue */
```

**Usage:**
- `--color-primary-600`: Primary buttons, links, brand elements
- `--color-primary-700`: Hover states, focus rings
- `--color-primary-50/100`: Light backgrounds for primary-colored sections

### Semantic Colors

Semantic colors convey meaning and state in the UI.

#### Success (Green)
```css
--color-success-50: hsl(142, 70%, 97%)   /* Light green background */
--color-success-100: hsl(142, 70%, 92%)
--color-success-500: hsl(142, 70%, 45%)  /* Main success color */
--color-success-600: hsl(142, 70%, 40%)  /* Hover state */
--color-success-700: hsl(142, 70%, 35%)  /* Active state */
```

**Usage:** Successful actions, positive feedback, confirmation messages

#### Warning (Amber)
```css
--color-warning-50: hsl(38, 90%, 97%)    /* Light amber background */
--color-warning-100: hsl(38, 90%, 92%)
--color-warning-500: hsl(38, 90%, 50%)   /* Main warning color */
--color-warning-600: hsl(38, 90%, 45%)   /* Hover state */
--color-warning-700: hsl(38, 90%, 40%)   /* Active state */
```

**Usage:** Caution messages, non-critical issues, warnings

#### Error (Red)
```css
--color-error-50: hsl(0, 70%, 97%)       /* Light red background */
--color-error-100: hsl(0, 70%, 92%)
--color-error-500: hsl(0, 70%, 50%)      /* Main error color */
--color-error-600: hsl(0, 70%, 45%)      /* Hover state */
--color-error-700: hsl(0, 70%, 40%)      /* Active state */
```

**Usage:** Errors, destructive actions, validation failures

#### Info (Blue)
```css
--color-info-50: hsl(210, 90%, 97%)      /* Light blue background */
--color-info-100: hsl(210, 90%, 92%)
--color-info-500: hsl(210, 90%, 55%)     /* Main info color */
--color-info-600: hsl(210, 90%, 50%)     /* Hover state */
--color-info-700: hsl(210, 90%, 45%)     /* Active state */
```

**Usage:** Informational messages, tips, neutral notifications

### Neutral Scale

A 10-step grayscale for backgrounds, borders, and text.

```css
--color-neutral-50: hsl(0, 0%, 98%)      /* #fafafa - Very light gray */
--color-neutral-100: hsl(0, 0%, 96%)     /* #f5f5f5 - Light gray backgrounds */
--color-neutral-200: hsl(0, 0%, 90%)     /* #e6e6e6 - Subtle borders */
--color-neutral-300: hsl(0, 0%, 80%)     /* #cccccc - Default borders */
--color-neutral-400: hsl(0, 0%, 60%)     /* #999999 - Disabled text */
--color-neutral-500: hsl(0, 0%, 50%)     /* #808080 - Mid-gray */
--color-neutral-600: hsl(0, 0%, 40%)     /* #666666 - Secondary text */
--color-neutral-700: hsl(0, 0%, 20%)     /* #333333 - Primary text */
--color-neutral-800: hsl(0, 0%, 15%)     /* #262626 - Dark surfaces */
--color-neutral-900: hsl(0, 0%, 10%)     /* #1a1a1a - Very dark surfaces */
```

**Usage Guidelines:**
- **50-100**: Very light backgrounds, subtle fills
- **200-400**: Borders, dividers, inactive states
- **500-700**: Secondary text, icons, tertiary actions
- **800-900**: Primary text, dark backgrounds

### Surface Colors

Semantic aliases for common surface types.

```css
--color-background: hsl(0, 0%, 96%)             /* #f5f5f5 - Main page background */
--color-surface: hsl(0, 0%, 100%)               /* white - Cards, panels */
--color-surface-elevated: hsl(0, 0%, 16.5%)     /* #2a2a2a - Sidebar, elevated elements */
--color-surface-dark: hsl(0, 0%, 10%)           /* #1a1a1a - Header, dark surfaces */
```

**Usage:**
- `--color-background`: Main page background
- `--color-surface`: Cards, panels, modals
- `--color-surface-elevated`: Sidebars, navigation drawers (dark)
- `--color-surface-dark`: Headers, toolbars (very dark)

### Text Colors

Semantic text color tokens for different hierarchy levels.

```css
--color-text-primary: var(--color-neutral-700)       /* #333 - Main text */
--color-text-secondary: var(--color-neutral-600)     /* #666 - Secondary text */
--color-text-tertiary: var(--color-neutral-400)      /* #999 - Tertiary/muted text */
--color-text-inverse: hsl(0, 0%, 100%)               /* white - Text on dark backgrounds */
--color-text-on-primary: hsl(0, 0%, 100%)            /* white - Text on primary color */
```

**Contrast Ratios (WCAG 2.1 AA):**
- Primary text (#333) on white: **12.6:1** ✓ (AAA)
- Secondary text (#666) on white: **5.7:1** ✓ (AA)
- Tertiary text (#999) on white: **2.8:1** ✗ (Use for large text only)

### Border Colors

```css
--color-border-subtle: var(--color-neutral-200)      /* Light borders */
--color-border-default: var(--color-neutral-300)     /* Default borders */
--color-border-strong: var(--color-neutral-400)      /* Emphasized borders */
--color-border-dark: hsl(0, 0%, 27%)                 /* #444 - Borders on dark surfaces */
```

### Alpha Colors

Transparent overlays for layering effects.

```css
--color-overlay-light: rgba(255, 255, 255, 0.1)      /* Light overlay on dark surfaces */
--color-overlay-medium: rgba(255, 255, 255, 0.15)    /* Medium overlay */
--color-overlay-dark: rgba(0, 0, 0, 0.5)             /* Dark overlay for modals */
```

### Focus Ring

```css
--focus-ring-color: var(--color-primary-700)         /* #0056b3 */
--focus-ring-shadow: 0 0 0 4px rgba(0, 86, 179, 0.1) /* Soft blue glow */
```

**Contrast Ratio:** Focus ring has **3:1** contrast against both light and dark backgrounds (WCAG 2.1 AAA).

---

## Typography

### Font Families

```css
--font-family-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                    'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 
                    'Droid Sans', 'Helvetica Neue', sans-serif

--font-family-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Source Code Pro', 
                    'Menlo', 'Monaco', 'Consolas', monospace
```

**Rationale:** System font stack provides native OS fonts for:
- Faster loading (no web fonts to download)
- Consistent native feel across platforms
- Excellent readability and familiarity

### Font Sizes

Modular scale based on **1.25 ratio** for harmonious typography.

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--font-size-2xs` | 0.625rem | 10px | Keyboard shortcuts, tiny labels |
| `--font-size-xs` | 0.75rem | 12px | Small badges, shortcuts, captions |
| `--font-size-sm` | 0.875rem | 14px | Secondary text, breadcrumbs |
| `--font-size-base` | 1rem | 16px | **Body text, navigation links** |
| `--font-size-lg` | 1.125rem | 18px | Large body text, subheadings |
| `--font-size-xl` | 1.25rem | 20px | Headings (H4-H5) |
| `--font-size-2xl` | 1.5rem | 24px | Headings (H3) |
| `--font-size-3xl` | 1.875rem | 30px | Headings (H2) |
| `--font-size-4xl` | 2.25rem | 36px | Headings (H1), hero text |

**Example Usage:**

```css
/* Heading hierarchy - automatically applied to h1-h6 */
h1 { font-size: var(--font-size-4xl); font-weight: var(--font-weight-bold); }
h2 { font-size: var(--font-size-3xl); font-weight: var(--font-weight-semibold); }
h3 { font-size: var(--font-size-2xl); font-weight: var(--font-weight-semibold); }
h4 { font-size: var(--font-size-xl); font-weight: var(--font-weight-medium); }
h5 { font-size: var(--font-size-lg); font-weight: var(--font-weight-medium); }
h6 { font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); }

/* Body text */
body { font-size: var(--font-size-base); }

/* Semantic typography utility classes */
.text-body { font-size: var(--font-size-base); }
.text-body-large { font-size: var(--font-size-lg); }
.text-body-small { font-size: var(--font-size-sm); }
.text-label { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.text-caption { font-size: var(--font-size-xs); color: var(--color-text-secondary); }
.text-overline { font-size: var(--font-size-2xs); font-weight: var(--font-weight-semibold); letter-spacing: var(--letter-spacing-widest); text-transform: uppercase; }
```

### Font Weights

```css
--font-weight-regular: 400      /* Body text, default */
--font-weight-medium: 500       /* Navigation, emphasis */
--font-weight-semibold: 600     /* Headings, active states */
--font-weight-bold: 700         /* Strong emphasis, badges */
```

### Line Heights

```css
--line-height-tight: 1.2        /* Headings, compact text */
--line-height-normal: 1.5       /* Body text (default) */
--line-height-relaxed: 1.75     /* Long-form content */
```

### Letter Spacing

```css
--letter-spacing-tight: -0.02em     /* Large headings */
--letter-spacing-normal: 0          /* Body text (default) */
--letter-spacing-wide: 0.02em       /* Small caps, labels */
--letter-spacing-wider: 0.025em     /* Badges, compact uppercase */
--letter-spacing-widest: 0.05em     /* Uppercase labels, overlines */
```

### Semantic Typography Classes

The design system includes utility classes for common text patterns:

#### Body Text

```css
/* Standard body text (16px) */
.text-body {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* Large body text (18px) - for emphasis or introductory paragraphs */
.text-body-large {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* Small body text (14px) - for dense content or sidebars */
.text-body-small {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}
```

#### Labels and Captions

```css
/* Standard label (14px, medium weight) - for form labels, button text */
.text-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

/* Small label (12px, medium weight) - for compact UI elements */
.text-label-small {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}

/* Caption (12px) - for supplementary information */
.text-caption {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}
```

#### Special Purpose

```css
/* Overline (10px, uppercase, wide spacing) - for section headers, categories */
.text-overline {
  font-size: var(--font-size-2xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
  letter-spacing: var(--letter-spacing-widest);
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

/* Code text - for inline code or technical content */
.text-code {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
}
```

**Usage Examples:**

```html
<!-- Page title -->
<h1>Platform Administration</h1>

<!-- Section heading -->
<h2>Recent Activity</h2>

<!-- Subsection -->
<h3>User Management</h3>

<!-- Category label -->
<div class="text-overline">Navigation</div>

<!-- Primary content -->
<p class="text-body">The platform enables multi-organization governance...</p>

<!-- Supporting detail -->
<span class="text-caption">Last updated 2 hours ago</span>

<!-- Form label -->
<label class="text-label">Organization Name</label>

<!-- Code snippet -->
<code class="text-code">npm install</code>
```

### Type Scale Visual Reference

```
┌─────────────────────────────────────────────────┐
│ H1 (36px/2.25rem) - Bold                       │ ← Main page title
│ H2 (30px/1.875rem) - Semibold                  │ ← Section heading
│ H3 (24px/1.5rem) - Semibold                    │ ← Subsection
│ H4 (20px/1.25rem) - Medium                     │ ← Card title
│ H5 (18px/1.125rem) - Medium                    │ ← Minor heading
│ H6 (16px/1rem) - Semibold                      │ ← Strong label
│ Body (16px/1rem) - Regular                     │ ← Standard text
│ Body Small (14px/0.875rem) - Regular           │ ← Dense content
│ Label (14px/0.875rem) - Medium                 │ ← Form labels
│ Caption (12px/0.75rem) - Regular               │ ← Help text
│ Overline (10px/0.625rem) - Semibold, Uppercase │ ← Categories
└─────────────────────────────────────────────────┘
```

---

## Spacing

Base unit: **4px** (0.25rem)

### Spacing Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| `--spacing-0` | 0 | 0px | No spacing |
| `--spacing-0-5` | 0.125rem | 2px | Tight spacing |
| `--spacing-1` | 0.25rem | 4px | Very small gaps |
| `--spacing-2` | 0.5rem | 8px | **Small gaps, icon spacing** |
| `--spacing-3` | 0.75rem | 12px | **Nav item padding, compact elements** |
| `--spacing-4` | 1rem | 16px | **Standard spacing, button padding** |
| `--spacing-5` | 1.25rem | 20px | Medium spacing |
| `--spacing-6` | 1.5rem | 24px | Large spacing between sections |
| `--spacing-8` | 2rem | 32px | Extra large spacing |
| `--spacing-10` | 2.5rem | 40px | Section padding |
| `--spacing-12` | 3rem | 48px | Large section padding |
| `--spacing-16` | 4rem | 64px | Extra large sections |
| `--spacing-20` | 5rem | 80px | Hero padding |
| `--spacing-24` | 6rem | 96px | Very large spacing |

### Spacing Guidelines

**Common Patterns:**
```css
/* Card padding */
padding: var(--spacing-6);

/* Button padding */
padding: var(--spacing-3) var(--spacing-4);

/* Section margins */
margin-bottom: var(--spacing-8);

/* List item gaps */
gap: var(--spacing-2);
```

### Spacing Visualization

```
0     ▏
0.5   ▎
1     ▎
2     ▌
3     ▊
4     █
5     █▎
6     █▌
8     ██
10    ██▌
12    ███
16    ████
20    █████
24    ██████
```

---

## Shadows & Elevation

Shadows create depth and hierarchy through elevation levels.

### Shadow Tokens

```css
--shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
  /* Subtle shadow - Borders, very slight elevation */

--shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)
  /* Small shadow - Buttons, small cards */

--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)
  /* Medium shadow - Cards, dropdowns */

--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)
  /* Large shadow - Modals, popovers */

--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)
  /* Extra large shadow - Overlays, floating panels */

--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
  /* Massive shadow - Full-screen modals, major overlays */

--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)
  /* Inset shadow - Pressed buttons, input fields */
```

### Shadow Examples

**Card with Medium Elevation:**
```css
.card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}
```

**Button with Small Shadow:**
```css
.button {
  background-color: var(--color-primary-600);
  color: var(--color-text-on-primary);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-4);
  box-shadow: var(--shadow-sm);
}
```

**Modal with Extra Large Shadow:**
```css
.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-xl);
  padding: var(--spacing-8);
  box-shadow: var(--shadow-2xl);
}
```

---

## Border Radii

Border radius creates visual softness and hierarchy.

### Radius Tokens

```css
--radius-none: 0                /* Square corners */
--radius-sm: 0.25rem            /* 4px - Small elements */
--radius-md: 0.375rem           /* 6px - Default buttons, inputs */
--radius-lg: 0.5rem             /* 8px - Cards, panels */
--radius-xl: 0.75rem            /* 12px - Large cards, modals */
--radius-2xl: 1rem              /* 16px - Hero sections */
--radius-full: 9999px           /* Circular - Badges, avatars */
```

### Radius Usage

| Element | Radius | Rationale |
|---------|--------|-----------|
| Buttons, Inputs | `--radius-md` | Standard interactive elements |
| Cards, Panels | `--radius-lg` | Larger surfaces need more roundness |
| Modals | `--radius-xl` | Emphasis and visual hierarchy |
| Badges, Avatars | `--radius-full` | Perfect circles |
| Alerts, Notifications | `--radius-md` | Consistent with buttons |

**Example:**
```css
.card {
  border-radius: var(--radius-lg);
}

.button {
  border-radius: var(--radius-md);
}

.avatar {
  border-radius: var(--radius-full);
}
```

---

## Transitions & Animation

### Duration Tokens

```css
--duration-fast: 150ms          /* Quick interactions - hover, focus */
--duration-normal: 200ms        /* Standard transitions - buttons */
--duration-slow: 300ms          /* Complex transitions - drawers */
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1)           /* Accelerating (entering) */
--ease-out: cubic-bezier(0, 0, 0.2, 1)          /* Decelerating (exiting) */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)     /* Smooth both ways */
```

### Animation Guidelines

**Standard Transition:**
```css
.button {
  transition: background-color var(--duration-normal) var(--ease-out),
              box-shadow var(--duration-normal) var(--ease-out);
}
```

**Respect Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .animated-element {
    transition: none;
    animation: none;
  }
}
```

**Hover Effect:**
```css
.card {
  transition: transform var(--duration-fast) var(--ease-out),
              box-shadow var(--duration-fast) var(--ease-out);
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

@media (prefers-reduced-motion: reduce) {
  .card:hover {
    transform: none;
  }
}
```

---

## Accessibility

### WCAG 2.1 AA Compliance

All color combinations meet WCAG 2.1 AA contrast requirements:
- **Normal text (< 18px)**: 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold)**: 3:1 minimum
- **UI components and borders**: 3:1 minimum

### Color Contrast Ratios

| Foreground | Background | Ratio | Status |
|------------|------------|-------|--------|
| `--color-text-primary` (#333) | white | 12.6:1 | ✓ AAA |
| `--color-text-secondary` (#666) | white | 5.7:1 | ✓ AA |
| `--color-text-tertiary` (#999) | white | 2.8:1 | ⚠️ Use for large text only |
| `--color-text-inverse` (white) | `--color-surface-elevated` (#2a2a2a) | 11.2:1 | ✓ AAA |
| `--color-primary-600` | white | 4.5:1 | ✓ AA |
| `--focus-ring-color` | white | 7.4:1 | ✓ AAA |
| `--focus-ring-color` | `--color-surface-elevated` | 3.2:1 | ✓ AA |

### Focus Indicators

All interactive elements must have visible focus indicators:

```css
*:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  box-shadow: var(--focus-ring-shadow);
}
```

### Touch Target Sizes

Minimum touch target: **44×44px** (WCAG 2.1 AAA)

```css
.button {
  min-width: 44px;
  min-height: 44px;
}
```

### Screen Reader Support

Use semantic HTML and ARIA labels:
```html
<button aria-label="Close modal">×</button>
<nav aria-label="Main navigation">...</nav>
```

---

## Usage Guidelines

### When to Use Tokens

**✓ Always use tokens for:**
- Colors (text, backgrounds, borders)
- Font sizes and weights
- Spacing (margins, padding, gaps)
- Shadows
- Border radii
- Transition durations and easing

**✗ Avoid hardcoded values:**
```css
/* ❌ Bad */
color: #333;
font-size: 16px;
margin: 12px;

/* ✅ Good */
color: var(--color-text-primary);
font-size: var(--font-size-base);
margin: var(--spacing-3);
```

### Common Patterns

#### Card Component
```css
.card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
  transition: box-shadow var(--duration-normal) var(--ease-out);
}

.card:hover {
  box-shadow: var(--shadow-lg);
}
```

#### Primary Button
```css
.button-primary {
  background-color: var(--color-primary-600);
  color: var(--color-text-on-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: background-color var(--duration-normal) var(--ease-out);
}

.button-primary:hover {
  background-color: var(--color-primary-700);
}

.button-primary:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  box-shadow: var(--focus-ring-shadow);
}
```

#### Navigation Link
```css
.nav-link {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-3) var(--spacing-4);
  border-radius: var(--radius-md);
  transition: color var(--duration-fast) var(--ease-out),
              background-color var(--duration-fast) var(--ease-out);
}

.nav-link:hover {
  color: var(--color-text-primary);
  background-color: var(--color-neutral-100);
}

.nav-link.active {
  color: var(--color-primary-600);
  font-weight: var(--font-weight-semibold);
}
```

### Anti-Patterns

**Don't create custom shades outside the scale:**
```css
/* ❌ Bad - creates inconsistent gray */
color: #888;

/* ✅ Good - use defined neutral colors */
color: var(--color-neutral-400);
```

**Don't mix tokens with hardcoded values:**
```css
/* ❌ Bad - inconsistent spacing */
padding: var(--spacing-3) 14px;

/* ✅ Good - consistent spacing */
padding: var(--spacing-3) var(--spacing-4);
```

**Don't use semantic colors for decoration:**
```css
/* ❌ Bad - success color used for decoration */
background-color: var(--color-success-500);

/* ✅ Good - use neutral or brand colors for decoration */
background-color: var(--color-neutral-100);
```

---

## Dark Mode Foundation

Dark mode tokens are defined but **not currently active**. They provide structure for future dark mode implementation.

### Dark Mode Tokens

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Surface Colors - Dark Mode */
    --color-background: var(--color-neutral-900);
    --color-surface: var(--color-neutral-800);
    --color-surface-elevated: var(--color-neutral-700);
    --color-surface-dark: hsl(0, 0%, 8%);

    /* Text Colors - Dark Mode */
    --color-text-primary: var(--color-neutral-50);
    --color-text-secondary: var(--color-neutral-300);
    --color-text-tertiary: var(--color-neutral-500);

    /* Border Colors - Dark Mode */
    --color-border-subtle: var(--color-neutral-700);
    --color-border-default: var(--color-neutral-600);
    --color-border-strong: var(--color-neutral-500);

    /* Focus Ring - Dark Mode */
    --focus-ring-shadow: 0 0 0 4px rgba(0, 123, 255, 0.2);
  }
}
```

### Activating Dark Mode

To activate dark mode in the future:

1. **Uncomment the dark mode media query** (currently present but can be enhanced)
2. **Test all components** for readability and contrast
3. **Add dark mode toggle** in user settings
4. **Update tests** to include dark mode scenarios

---

## Quick Reference

### Most Used Tokens

```css
/* Colors */
--color-primary-600          /* Brand blue */
--color-text-primary         /* Main text #333 */
--color-text-secondary       /* Secondary text #666 */
--color-background           /* Page background #f5f5f5 */
--color-surface              /* Card background white */

/* Typography */
--font-size-base             /* 16px body text */
--font-size-sm               /* 14px secondary text */
--font-weight-medium         /* 500 for emphasis */
--font-weight-semibold       /* 600 for headings */

/* Spacing */
--spacing-2                  /* 8px small gaps */
--spacing-3                  /* 12px compact padding */
--spacing-4                  /* 16px standard spacing */
--spacing-6                  /* 24px section spacing */

/* Shadows & Radius */
--shadow-md                  /* Default card shadow */
--radius-md                  /* 6px buttons/inputs */
--radius-lg                  /* 8px cards */

/* Transitions */
--duration-normal            /* 200ms standard */
--ease-out                   /* Deceleration curve */
```

---

## Maintenance

### Adding New Tokens

When adding new tokens:

1. Follow the existing naming convention
2. Add to appropriate section in `index.css`
3. Document in this file with usage guidelines
4. Update color contrast ratios if applicable
5. Test across all breakpoints

### Deprecating Tokens

When deprecating tokens:

1. Mark as deprecated in comments
2. Update documentation
3. Provide migration path
4. Remove after one major version

---

## Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **MDN CSS Custom Properties**: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- **Radix Colors**: https://www.radix-ui.com/colors (inspiration)
- **Tailwind CSS**: https://tailwindcss.com/docs/customizing-colors (reference)

---

**Questions or feedback?** Contact the frontend team or open an issue in the repository.
