# FanEngagement Design System

**Version:** 1.0  
**Last Updated:** 2025-12-09  
**Status:** Authoritative Reference

---

## 🎨 Interactive Token Showcase

**[View Interactive Token Showcase →](design-tokens-showcase.html)**

For a visual, interactive reference of all design tokens, open the **design-tokens-showcase.html** file in your browser. This live demo includes:
- Color swatches with HSL values
- Typography scale with live examples
- Spacing scale with visual measurements
- Shadow elevation demonstrations
- Border radius examples
- Interactive component patterns

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

## Quick Start Guide

### For Developers: How to Use Tokens

**In CSS/Component Styles:**
```css
.my-component {
  /* Colors */
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  
  /* Typography */
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  
  /* Spacing */
  padding: var(--spacing-4);
  margin-bottom: var(--spacing-6);
  gap: var(--spacing-3);
  
  /* Shadows & Borders */
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-lg);
  
  /* Transitions */
  transition: all var(--duration-normal) var(--ease-out);
}
```

**Using Utility Classes (index.css):**
```html
<div class="p-6 mb-4 gap-3">
  <h2 class="mb-3">Title</h2>
  <p class="text-body mb-4">Content</p>
</div>
```

**Finding the Right Token:**
1. **Colors**: Use semantic names (`--color-text-primary`, `--color-success-600`)
2. **Typography**: Start with `--font-size-base` (16px) and adjust up/down
3. **Spacing**: Use the spacing scale (primarily 4px-based: `--spacing-2` = 8px, `--spacing-4` = 16px; also includes 2px, 12px, etc.)
4. **Shadows**: `--shadow-sm` for buttons, `--shadow-md` for cards, `--shadow-lg` for modals

**🎨 [View All Tokens Interactively →](design-tokens-showcase.html)**

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

### Visual Color Reference

**For interactive color swatches, see [design-tokens-showcase.html](design-tokens-showcase.html)**

Below is a text-based reference. For the best visual experience with actual color previews, click on backgrounds, and interactive examples, open the showcase HTML file in your browser.

### Brand Colors

The primary brand color is blue, used for primary actions, links, and brand emphasis.

**Visual Palette:**
```
████ primary-50  - Very light blue backgrounds
████ primary-100 - Light blue hover backgrounds  
████ primary-200 - Light blue fills
████ primary-300 - Light accents
████ primary-400 - Medium blue
████ primary-500 - Main interactive blue
████ primary-600 - #007bff MAIN BRAND COLOR ⭐
████ primary-700 - #0056b3 Hover/Active states
████ primary-800 - Dark blue emphasis
████ primary-900 - Very dark blue
```

**Token Reference:**

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

**Visual Palette:**
```
████ success-50  - Light green background
████ success-100 - Very light green
████ success-500 - Main success color ✓
████ success-600 - Hover state
████ success-700 - Active state
```

**Token Reference:**
```css
--color-success-50: hsl(142, 70%, 97%)   /* Light green background */
--color-success-100: hsl(142, 70%, 92%)
--color-success-500: hsl(142, 70%, 45%)  /* Main success color */
--color-success-600: hsl(142, 70%, 40%)  /* Hover state */
--color-success-700: hsl(142, 70%, 35%)  /* Active state */
```

**Usage:** Successful actions, positive feedback, confirmation messages

#### Warning (Amber)

**Visual Palette:**
```
████ warning-50  - Light amber background
████ warning-100 - Very light amber
████ warning-500 - Main warning color ⚠️
████ warning-600 - Hover state
████ warning-700 - Active state
```

**Token Reference:**
```css
--color-warning-50: hsl(38, 90%, 97%)    /* Light amber background */
--color-warning-100: hsl(38, 90%, 92%)
--color-warning-500: hsl(38, 90%, 50%)   /* Main warning color */
--color-warning-600: hsl(38, 90%, 45%)   /* Hover state */
--color-warning-700: hsl(38, 90%, 40%)   /* Active state */
```

**Usage:** Caution messages, non-critical issues, warnings

#### Error (Red)

**Visual Palette:**
```
████ error-50  - Light red background
████ error-100 - Very light red
████ error-500 - Main error color ❌
████ error-600 - Hover state
████ error-700 - Active state
```

**Token Reference:**
```css
--color-error-50: hsl(0, 70%, 97%)       /* Light red background */
--color-error-100: hsl(0, 70%, 92%)
--color-error-500: hsl(0, 70%, 50%)      /* Main error color */
--color-error-600: hsl(0, 70%, 45%)      /* Hover state */
--color-error-700: hsl(0, 70%, 40%)      /* Active state */
```

**Usage:** Errors, destructive actions, validation failures

#### Info (Blue)

**Visual Palette:**
```
████ info-50  - Light blue background
████ info-100 - Very light blue
████ info-500 - Main info color ℹ️
████ info-600 - Hover state
████ info-700 - Active state
```

**Token Reference:**
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

**Visual Palette:**
```
██ neutral-50  - #fafafa Very light gray
██ neutral-100 - #f5f5f5 Light gray backgrounds
██ neutral-200 - #e6e6e6 Subtle borders
██ neutral-300 - #cccccc Default borders
██ neutral-400 - #999999 Disabled text
██ neutral-500 - #808080 Mid-gray
██ neutral-600 - #666666 Secondary text
██ neutral-700 - #333333 Primary text ⭐
██ neutral-800 - #262626 Dark surfaces
██ neutral-900 - #1a1a1a Very dark surfaces
```

**Token Reference:**

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
--color-text-tertiary: hsl(0, 0%, 42%)               /* #6b6b6b - Tertiary/muted text (meets WCAG AA ≥4.5:1 on light backgrounds) */
--color-text-inverse: hsl(0, 0%, 100%)               /* white - Text on dark backgrounds */
--color-text-on-primary: hsl(0, 0%, 100%)            /* white - Text on primary color */
```

**Contrast Ratios (WCAG 2.1 AA):**
- Primary text (#333) on white: **12.6:1** ✓ (AAA)
- Secondary text (#666) on white: **5.7:1** ✓ (AA)
- Tertiary text (#6b6b6b) on white: **5.33:1** ✓ (AA for normal text)

### Border Colors

```css
--color-border-subtle: hsl(0, 0%, 55%)      /* #8c8c8c - Light borders (≥3:1 on light bg) */
--color-border-default: hsl(0, 0%, 46.27%)  /* #757575 - Default borders */
--color-border-strong: hsl(0, 0%, 42%)      /* #6b6b6b - Emphasized borders */
--color-border-dark: hsl(0, 0%, 35%)        /* #595959 - Borders on dark surfaces */
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
--focus-ring-color: hsl(217, 100%, 56%)              /* #1f7bff */
--focus-ring-shadow: 0 0 0 4px rgba(31, 123, 255, 0.25) /* Soft blue glow with stronger visibility */
```

**Contrast Ratio:** Focus ring holds **3.9:1 on white** and **4.4:1 on #1a1a1a**, exceeding the WCAG 2.1 AA **3:1** requirement for non-text UI (verified with WebAIM Contrast Checker).

### WCAG AA Contrast Pairings (Light Theme)

| Pairing | Contrast Ratio | Notes |
|---------|----------------|-------|
| `--color-text-primary` (#333) on `--color-surface` (#fff) | **12.63:1** | Primary body text, headings |
| `--color-text-secondary` (#666) on `--color-surface` (#fff) | **5.74:1** | Secondary labels, meta |
| `--color-text-tertiary` (#6b6b6b) on `--color-surface` (#fff) | **5.33:1** (WebAIM) | Tertiary/meta text with safety margin |
| `--color-text-primary` (#333) on `--color-background` (#f5f5f5) | **11.59:1** | Page background |
| `--color-text-tertiary` (#6b6b6b) on `--color-background` (#f5f5f5) | **4.89:1** | Muted text on background sections |
| `--color-border-default` (#757575) on `--color-surface` (#fff) | **4.61:1** | Standard borders, dividers |
| `--color-border-default` (#757575) on `--color-background` (#f5f5f5) | **4.23:1** | Cards on subtle backgrounds |
| `--focus-ring-color` (#1f7bff) on `--color-surface` (#fff) | **3.94:1** | Keyboard focus, light theme |
| `--focus-ring-color` (#1f7bff) on `--color-surface-dark` (#1a1a1a) | **4.42:1** | Keyboard focus, dark chrome |
| `--color-text-inverse` (#fff) on `--color-surface-elevated` (#2a2a2a) | **14.35:1** | Sidebar/header text |

> Non-color indicator: apply the `.content-link` class to inline links so they stay underlined at all times, with underline thickness increasing on hover/focus for additional state feedback.

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

Visual representation of the spacing scale (each block = 4px):

```
Token    Value       Visual Scale
──────────────────────────────────────────────────
0        0px         (none)
0.5      2px         ▎
1        4px         ▌
2        8px         █
3        12px        █▌
4        16px        ██               ← Standard spacing
5        20px        ██▌
6        24px        ███              ← Section spacing
8        32px        ████
10       40px        █████
12       48px        ██████
16       64px        ████████
20       80px        ██████████
24       96px        ████████████
```

### Spacing Utility Classes

The design system includes utility classes for common spacing patterns:

#### Gap Utilities (Flexbox/Grid)
```css
.gap-0  /* gap: 0 */
.gap-1  /* gap: 4px */
.gap-2  /* gap: 8px */
.gap-3  /* gap: 12px */
.gap-4  /* gap: 16px */
.gap-5  /* gap: 20px */
.gap-6  /* gap: 24px */
.gap-8  /* gap: 32px */
```

**Usage:**
```tsx
<div className="gap-4" style={{ display: 'flex' }}>
  <button>Action 1</button>
  <button>Action 2</button>
</div>
```

#### Padding Utilities
```css
/* All sides */
.p-0  /* padding: 0 */
.p-2  /* padding: 8px */
.p-3  /* padding: 12px */
.p-4  /* padding: 16px */
.p-5  /* padding: 20px */
.p-6  /* padding: 24px */
.p-8  /* padding: 32px */

/* Horizontal (left + right) */
.px-2  /* padding-left: 8px; padding-right: 8px */
.px-3  /* padding-left: 12px; padding-right: 12px */
.px-4  /* padding-left: 16px; padding-right: 16px */
.px-6  /* padding-left: 24px; padding-right: 24px */

/* Vertical (top + bottom) */
.py-2  /* padding-top: 8px; padding-bottom: 8px */
.py-3  /* padding-top: 12px; padding-bottom: 12px */
.py-4  /* padding-top: 16px; padding-bottom: 16px */
.py-6  /* padding-top: 24px; padding-bottom: 24px */
```

**Usage:**
```tsx
<div className="p-6">
  <h2>Card Title</h2>
  <p>Card content with consistent padding</p>
</div>
```

#### Margin Bottom Utilities (Vertical Rhythm)
```css
.mb-0  /* margin-bottom: 0 */
.mb-2  /* margin-bottom: 8px */
.mb-3  /* margin-bottom: 12px */
.mb-4  /* margin-bottom: 16px */
.mb-6  /* margin-bottom: 24px */
.mb-8  /* margin-bottom: 32px */
```

**Usage:**
```tsx
<div>
  <h2 className="mb-4">Section Title</h2>
  <p className="mb-6">Paragraph with spacing below</p>
  <button>Call to Action</button>
</div>
```

### Using Spacing Tokens in Custom CSS

When utility classes don't fit your needs, use spacing tokens directly:

```css
/* Component-specific spacing */
.custom-component {
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-8);
  gap: var(--spacing-4);
}

/* Asymmetric padding */
.header {
  padding: var(--spacing-4) var(--spacing-8);
}

/* Responsive spacing */
@media (max-width: 768px) {
  .custom-component {
    padding: var(--spacing-4);
    gap: var(--spacing-2);
  }
}
```

### Spacing Best Practices

1. **Always use spacing tokens** - Never use hardcoded pixel or rem values
2. **Start with the scale** - Choose from existing tokens before creating custom spacing
3. **Maintain vertical rhythm** - Use consistent spacing (4, 6, 8) between sections
4. **Use utility classes first** - Apply `.gap-4`, `.p-6`, `.mb-4` before writing custom CSS
5. **Group related elements** - Closer spacing (2-3) for related items, wider spacing (6-8) between sections
6. **Responsive spacing** - Reduce spacing on mobile (e.g., 8 → 4, 6 → 4)

### Common Spacing Patterns

#### Card Layout
```tsx
<div className="p-6 mb-4">
  <h3 className="mb-3">Card Title</h3>
  <p className="mb-4">Card content</p>
  <div className="gap-3" style={{ display: 'flex' }}>
    <button>Primary</button>
    <button>Secondary</button>
  </div>
</div>
```

#### Form Layout
```tsx
<form>
  <div className="mb-4">
    <label className="mb-2">Name</label>
    <input type="text" />
  </div>
  <div className="mb-6">
    <label className="mb-2">Email</label>
    <input type="email" />
  </div>
  <button>Submit</button>
</form>
```

#### Section Spacing
```tsx
<div>
  <section className="mb-8">
    <h2 className="mb-4">Section 1</h2>
    <p>Content</p>
  </section>
  <section className="mb-8">
    <h2 className="mb-4">Section 2</h2>
    <p>Content</p>
  </section>
</div>
```

### Migration Guide: From Inline Styles to Spacing Tokens

If you have existing code with hardcoded spacing values, here's how to migrate:

#### Before (❌ Hardcoded values)
```tsx
<div style={{ 
  padding: '1.5rem',
  marginBottom: '2rem',
  gap: '1rem',
  display: 'flex'
}}>
  <button style={{ padding: '0.75rem 1rem' }}>Action</button>
</div>
```

#### After (✅ Using tokens and utilities)
```tsx
<div className="p-6 mb-8 gap-4" style={{ display: 'flex' }}>
  <button className="py-3 px-4">Action</button>
</div>
```

#### Or with CSS custom properties (for more complex layouts)
```tsx
// Component.css
.custom-layout {
  padding: var(--spacing-6);
  margin-bottom: var(--spacing-8);
  gap: var(--spacing-4);
  display: flex;
}

.custom-button {
  padding: var(--spacing-3) var(--spacing-4);
}

// Component.tsx
<div className="custom-layout">
  <button className="custom-button">Action</button>
</div>
```

### Spacing Token Reference Card

Quick reference for common conversions:

| Old Value | Token | Utility Class | Pixels |
|-----------|-------|---------------|--------|
| `0.5rem` | `--spacing-2` | `.p-2`, `.gap-2`, `.mb-2` | 8px |
| `0.75rem` | `--spacing-3` | `.p-3`, `.gap-3`, `.mb-3` | 12px |
| `1rem` | `--spacing-4` | `.p-4`, `.gap-4`, `.mb-4` | 16px |
| `1.5rem` | `--spacing-6` | `.p-6`, `.gap-6`, `.mb-6` | 24px |
| `2rem` | `--spacing-8` | `.p-8`, `.gap-8`, `.mb-8` | 32px |

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

/* Specialized shadows for layout components */
--shadow-header: 0 2px 4px 0 rgba(0, 0, 0, 0.1)
  /* Header elevation (light backgrounds) */

--shadow-header-dark: 0 2px 4px 0 rgba(0, 0, 0, 0.2)
  /* Header elevation (dark backgrounds) */

--shadow-sidebar: 2px 0 4px 0 rgba(0, 0, 0, 0.1)
  /* Sidebar/drawer elevation (right edge) */
```

### Shadow Usage Guidelines

| Shadow Token | Use Case | Visual Impact |
|--------------|----------|---------------|
| `--shadow-xs` | Keyboard shortcuts, tags, subtle borders | Barely visible, hint of depth |
| `--shadow-sm` | Buttons, small cards, form inputs | Light elevation, interactive elements |
| `--shadow-md` | Cards, dropdowns, tooltips | Standard elevation for content panels |
| `--shadow-lg` | Modals, popovers, dialogs | Clear separation from background |
| `--shadow-xl` | Overlays, floating panels | Strong elevation for temporary UI |
| `--shadow-2xl` | Full-screen modals, critical overlays | Maximum depth and focus |
| `--shadow-inner` | Pressed buttons, inset areas | Recessed appearance |
| `--shadow-header` | Navigation headers (light mode) | Consistent header elevation |
| `--shadow-header-dark` | Navigation headers (dark surfaces) | Enhanced header elevation |
| `--shadow-sidebar` | Sidebar navigation, drawers | Directional right-edge shadow |

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

**Header with Dark Surface Shadow:**
```css
.admin-header {
  background-color: var(--color-surface-dark);
  color: var(--color-text-inverse);
  padding: var(--spacing-4) var(--spacing-8);
  box-shadow: var(--shadow-header-dark);
}
```

**Sidebar with Directional Shadow:**
```css
.sidebar {
  width: 250px;
  background-color: var(--color-surface-elevated);
  box-shadow: var(--shadow-sidebar); /* Creates right-edge elevation */
}
```

**Keyboard Shortcut Key with Subtle Shadow:**
```css
kbd {
  padding: var(--spacing-0-5) var(--spacing-2);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
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

**Status:** Fully implemented across admin/unified/member layouts (2025-12 rollout).

The design system ships with a complete dark mode token foundation that now powers every authenticated surface. `App.tsx` applies the `theme-dark` class to `<body>` whenever a user selects the Dark theme from **My Account → Preferences**, and all shell/layout styles read their colors exclusively through tokens. System preference support remains available for future use, but the manual toggle is the primary activation path today.

### Implementation Notes

- **Preference source:** `user.themePreference` is hydrated from the auth profile and toggled via the My Account page; the selection is persisted server-side so every session reuses the same mode.
- **Runtime hook:** `AppContent` listens for preference changes and executes `document.body.classList.toggle('theme-dark', prefersDark);`, so any stylesheet that keys off `body.theme-dark` automatically updates without component-level state.
- **Token-only styling:** New admin/unified/mobile navigation styles consume shared `--nav-item-*` variables which define gradients, glow, and text colors for both themes, removing the need for hard-coded blues.

### Overview

Dark mode provides:

- **Reduced eye strain** in low-light environments
- **Battery savings** on OLED displays
- **User preference alignment** with OS-level settings
- **Modern UX expectations** for professional applications

### Activation Methods

The system supports two complementary approaches:

#### 1. System Preference (Automatic)

Automatically applies dark mode when the user's operating system or browser is set to dark mode.

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode tokens automatically apply */
  }
}
```

**When it activates:**

- User has dark mode enabled in their OS (macOS, Windows, iOS, Android)
- Browser respects the system preference
- No user action required in the app

#### 2. Manual Toggle (Explicit Override)

Allows users to explicitly choose dark mode within the application, overriding system preference.

```tsx
// Future implementation example
function toggleDarkMode() {
  document.body.classList.toggle('theme-dark');
  // Save preference to localStorage
}
```

**When it activates:**

- User toggles dark mode switch in app settings
- Takes precedence over system preference
- Persists across sessions via localStorage

### Dark Mode Token Reference

All tokens required for dark mode are defined and actively used. Here's the complete set:

#### Surface Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-background` | `#f5f5f5` | `#1a1a1a` | Main page background |
| `--color-surface` | `white` | `#262626` | Cards, panels, modals |
| `--color-surface-elevated` | `#2a2a2a` | `#333333` | Sidebar, elevated UI |
| `--color-surface-dark` | `#1a1a1a` | `#141414` | Header, dark elements |

**Dark mode strategy:**

- Inverts the lightness hierarchy
- Maintains relative contrast between surfaces
- Uses neutral scale (900 → 700) for consistency

#### Text Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-text-primary` | `#333333` | `#fafafa` | Primary content |
| `--color-text-secondary` | `#666666` | `#cccccc` | Secondary content |
| `--color-text-tertiary` | `#6b6b6b` (`hsl(0,0%,42%)`) | `#8a95a5` (`hsl(216,14%,60%)`) | Muted/disabled text |
| `--color-text-inverse` | `white` | `#1a1a1a` | Text on colored backgrounds |

**Contrast ratios (WCAG 2.1 AA):**

- Primary text on dark background: **15.9:1** ✓ AAA
- Secondary text on dark background: **10.0:1** ✓ AAA
- Tertiary text (#8a95a5) on dark background (#1a1a1a): **5.74:1** ✓ AA (normal text)

#### Border Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-border-subtle` | `#8c8c8c` | `#858585` | Subtle separators |
| `--color-border-default` | `#808080` | `#9e9e9e` | Default borders |
| `--color-border-strong` | `#6b6b6b` | `#bdbdbd` | Emphasized borders |
| `--color-border-dark` | `#595959` | `#d9d9d9` | Borders on dark surfaces |

#### Alpha Colors (Overlays)

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--color-overlay-light` | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.05)` | Subtle overlays |
| `--color-overlay-medium` | `rgba(255,255,255,0.15)` | `rgba(255,255,255,0.1)` | Medium overlays |
| `--color-overlay-dark` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` | Modal backdrops |

**Note:** Dark mode uses more opaque overlays for better visibility against dark backgrounds.

#### Focus Ring

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--focus-ring-color` | `#1f7bff` | `#5aa2ff` | Keyboard focus outline |
| `--focus-ring-shadow` | `0 0 0 4px rgba(31,123,255,0.25)` | `0 0 0 4px rgba(31,123,255,0.35)` | Focus glow |

**Dark mode adjustment:**

- Uses brighter primary color for better contrast
- Increased shadow opacity for visibility

#### Shadows

Dark mode uses adjusted shadows with higher opacity for depth on dark backgrounds:

```css
/* Light Mode */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* Dark Mode */
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3);
```

**All shadow tokens are adjusted:**

- `--shadow-xs` through `--shadow-2xl`
- `--shadow-inner`
- `--shadow-header`, `--shadow-header-dark`, `--shadow-sidebar`

#### Navigation Glow Tokens

To keep sidebar links visually consistent across Platform Admin, Org Admin, and member experiences we expose a dedicated set of navigation tokens:

| Token | Light Mode | Dark Mode | Purpose |
|-------|------------|-----------|---------|
| `--nav-item-hover-bg` | `rgba(0,0,0,0.06)` | `rgba(59,130,246,0.12)` | Soft wash behind hovered links |
| `--nav-item-hover-color` | `var(--color-primary-600)` | `var(--color-text-primary)` | Text color on hover |
| `--nav-item-active-color` | `var(--color-primary-800)` | `var(--color-text-primary)` | Selected text color |
| `--nav-item-active-gradient` | `linear-gradient(120deg, rgba(59,130,246,0.25), rgba(59,130,246,0))` | `linear-gradient(120deg, rgba(59,130,246,0.35), rgba(11,20,38,0.95))` | Base gradient band |
| `--nav-item-active-radial` | `radial-gradient(circle at 0% 50%, rgba(59,130,246,0.35), transparent 60%)` | `radial-gradient(circle at 0% 50%, rgba(59,130,246,0.45), transparent 65%)` | Glow highlight |
| `--nav-item-active-border` | `var(--color-primary-500)` | `var(--color-primary-500)` | Accent border/indicator |
| `--nav-item-active-shadow` | `inset 0 1px rgba(255,255,255,0.05), 0 10px 20px rgba(0,0,0,0.35)` | `0 18px 32px rgba(5,8,20,0.65)` | Depth + bloom |

Use these tokens (already imported into `AdminLayout.css`, `Layout.css`, and `MobileNav.css`) whenever you build a new navigation surface so that gradient, glow, and text contrast stay in sync with the active theme.

### Token Structure Example

```css
/* System Preference Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-neutral-900);
    --color-surface: var(--color-neutral-800);
    --color-text-primary: var(--color-neutral-50);
    /* ... all dark mode tokens ... */
  }
}

/* Manual Toggle Dark Mode */
body.theme-dark {
  --color-background: var(--color-neutral-900);
  --color-surface: var(--color-neutral-800);
  --color-text-primary: var(--color-neutral-50);
  /* ... identical token values ... */
}
```

**Why duplicate definitions?**

- System preference: Respects OS settings automatically
- Class-based: Allows explicit override and manual control
- Both use identical values for consistency

### Writing Dark Mode-Ready CSS

When writing component styles, use semantic tokens instead of hardcoded colors:

#### ✅ Good - Automatically supports dark mode

```css
.my-component {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  box-shadow: var(--shadow-md);
}
```

#### ❌ Bad - Hardcoded colors break in dark mode

```css
.my-component {
  background-color: white;
  color: #333;
  border: 1px solid #ccc;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

### Brand & Semantic Colors in Dark Mode

Brand colors (primary, success, warning, error, info) **remain unchanged** in dark mode:

- Same hues and saturation
- Automatically maintain WCAG contrast on dark backgrounds
- Provide consistent brand identity across themes

```css
/* These work in both light and dark mode */
.primary-button {
  background-color: var(--color-primary-600);  /* Same in both modes */
  color: var(--color-text-on-primary);          /* White in both modes */
}

.success-badge {
  background-color: var(--color-success-100);   /* Adjusted automatically */
  color: var(--color-success-700);
}
```

### Testing Dark Mode (Future)

When implementing full dark mode, follow this testing checklist:

#### Visual Testing

- [ ] All text has sufficient contrast (4.5:1 minimum)
- [ ] Borders are visible against backgrounds
- [ ] Shadows provide depth without being too harsh
- [ ] Focus indicators are clearly visible
- [ ] Brand colors remain recognizable

#### Component Testing

- [ ] Forms and inputs are readable
- [ ] Tables and data displays have clear hierarchy
- [ ] Modals and overlays provide adequate separation
- [ ] Navigation elements are distinguishable
- [ ] Loading states and placeholders are visible

#### Accessibility Testing

- [ ] Screen readers announce theme changes
- [ ] Keyboard navigation focus indicators are visible
- [ ] Color is not the only means of conveying information
- [ ] High contrast mode (Windows) still works
- [ ] Reduced motion preferences are respected

#### Browser Testing

- [ ] Chrome/Edge (system preference)
- [ ] Firefox (system preference)
- [ ] Safari (system preference)
- [ ] Manual toggle works in all browsers
- [ ] Preference persists after reload

### Implementation Roadmap

When ready to activate dark mode:

#### Phase 1: Foundation (Complete ✓)

- [x] Define all dark mode color tokens
- [x] Implement system preference support
- [x] Implement class-based toggle support
- [x] Document token structure and usage

#### Phase 2: UI Implementation (Future Epic)

- [ ] Add dark mode toggle to user settings
- [ ] Implement localStorage persistence
- [ ] Create theme context/hook
- [ ] Update all custom component styles
- [ ] Test third-party component compatibility

#### Phase 3: Polish & Testing (Future Epic)

- [ ] Comprehensive visual QA across all pages
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing (paint/layout thrashing)
- [ ] Cross-browser testing
- [ ] User acceptance testing

#### Phase 4: Deployment (Future Epic)

- [ ] Feature flag for gradual rollout
- [ ] Monitor user adoption metrics
- [ ] Gather user feedback
- [ ] Iterate on contrast and aesthetics
- [ ] Document best practices learned

### Migration Guide

For developers working on dark mode implementation:

#### Adding Dark Mode to Existing Components

1. **Audit current styles:**

   ```bash
   # Find hardcoded colors in your component
   grep -E '#[0-9a-fA-F]{3,6}|rgba?\(' MyComponent.css
   ```

2. **Replace with tokens:**

   ```diff
   .card {
   -  background-color: white;
   +  background-color: var(--color-surface);
   -  color: #333;
   +  color: var(--color-text-primary);
   -  border: 1px solid #e6e6e6;
   +  border: 1px solid var(--color-border-subtle);
   }
   ```

3. **Test in both modes:**

   ```tsx
   // Add theme toggle to DevTools or Storybook
   const toggleDarkMode = () => {
     document.body.classList.toggle('theme-dark');
   };
   ```

#### Creating New Components

Always use semantic tokens from the start:

```tsx
// MyComponent.module.css
.container {
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: var(--spacing-6);
  box-shadow: var(--shadow-md);
}

.heading {
  color: var(--color-text-primary);
  font-size: var(--font-size-2xl);
  margin-bottom: var(--spacing-4);
}

.description {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
```

### FAQ

**Q: Is dark mode active now?**
A: No. The token foundation is complete, but UI implementation (toggle, persistence, testing) is deferred to a future epic.

**Q: Will my existing components work with dark mode?**
A: If they use design tokens (`var(--color-*)`), yes. If they use hardcoded colors, they need migration.

**Q: Can I test dark mode now?**
A: Yes, for development:

- System preference: Set your OS to dark mode
- Manual toggle: Add `theme-dark` class to `<body>` via DevTools

**Q: Which approach should I use - system preference or manual toggle?**
A: Both. They complement each other. System preference is the default; manual toggle allows user override.

**Q: Do I need to define dark mode colors in my components?**
A: No. Use semantic tokens (`--color-surface`, `--color-text-primary`) and they automatically adapt.

**Q: What about custom brand colors?**
A: Brand colors (primary, success, error, etc.) remain the same in dark mode and automatically maintain WCAG contrast.

**Q: How do I handle images and icons in dark mode?**
A: Use CSS filters or provide alternate assets:

```css
@media (prefers-color-scheme: dark) {
  .logo {
    filter: invert(1) hue-rotate(180deg);
  }
}
```

**Q: Should I use `prefers-color-scheme` or `.theme-dark` in my CSS?**
A: Neither. Use semantic tokens and let the root-level media query and class handle it automatically.

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
