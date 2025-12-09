# Figma Design Library Token Mapping

**Version:** 1.0  
**Last Updated:** 2025-12-09  
**Purpose:** Bridge between CSS design tokens and Figma design library

---

## Table of Contents

1. [Overview](#overview)
2. [Color Tokens](#color-tokens)
3. [Typography Tokens](#typography-tokens)
4. [Spacing Tokens](#spacing-tokens)
5. [Shadow Tokens (Effects)](#shadow-tokens-effects)
6. [Border Radius Tokens](#border-radius-tokens)
7. [Creating Figma Styles](#creating-figma-styles)
8. [Naming Conventions](#naming-conventions)
9. [Maintenance & Sync](#maintenance--sync)

---

## Overview

This document maps FanEngagement CSS design tokens to Figma styles. Use this as a reference when:
- Creating or updating the Figma design library
- Ensuring design-to-code consistency
- Adding new components or features

### Quick Links

- **CSS Source:** `frontend/src/index.css`
- **Token Documentation:** `docs/frontend/design-system.md`
- **Interactive Showcase:** `docs/frontend/design-tokens-showcase.html`

### Token Categories in Figma

| CSS Category | Figma Style Type | Count |
|--------------|------------------|-------|
| Colors | Color Styles | 50+ |
| Typography | Text Styles | 20+ |
| Spacing | - (use values) | 14 |
| Shadows | Effect Styles | 10 |
| Border Radius | - (use values) | 7 |

---

## Color Tokens

### How to Create in Figma

1. Open Figma → Select a frame/shape
2. Click the color picker → Click the four-squares icon (Styles)
3. Click "+" to create a new color style
4. Name it using the convention below
5. Set the color value (hex or HSL)

### Primary Brand Colors

Create these as **Color Styles** in Figma:

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-primary-50` | Color/Primary/50 | `#f0f9ff` | `hsl(210, 100%, 97%)` | Very light backgrounds |
| `--color-primary-100` | Color/Primary/100 | `#e0f4ff` | `hsl(210, 100%, 95%)` | Light hover backgrounds |
| `--color-primary-200` | Color/Primary/200 | `#b3e0ff` | `hsl(210, 100%, 90%)` | Light fills |
| `--color-primary-300` | Color/Primary/300 | `#66ccff` | `hsl(210, 100%, 80%)` | Light accents |
| `--color-primary-400` | Color/Primary/400 | `#1ab3ff` | `hsl(210, 100%, 65%)` | Medium blue |
| `--color-primary-500` | Color/Primary/500 | `#0099ff` | `hsl(210, 100%, 55%)` | Interactive blue |
| `--color-primary-600` | Color/Primary/600 ⭐ | `#007bff` | `hsl(210, 100%, 50%)` | **Main brand color** |
| `--color-primary-700` | Color/Primary/700 | `#0056b3` | `hsl(210, 100%, 42%)` | Hover/active states |
| `--color-primary-800` | Color/Primary/800 | `#003d80` | `hsl(210, 100%, 35%)` | Dark emphasis |
| `--color-primary-900` | Color/Primary/900 | `#00264d` | `hsl(210, 100%, 20%)` | Very dark blue |

### Semantic Colors - Success (Green)

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-success-50` | Color/Success/50 | `#f0fcf4` | `hsl(142, 70%, 97%)` | Light green background |
| `--color-success-100` | Color/Success/100 | `#ddf9e5` | `hsl(142, 70%, 92%)` | Very light green |
| `--color-success-500` | Color/Success/500 ✓ | `#2d8a4d` | `hsl(142, 70%, 45%)` | Main success color |
| `--color-success-600` | Color/Success/600 | `#257a41` | `hsl(142, 70%, 40%)` | Hover state |
| `--color-success-700` | Color/Success/700 | `#1d6a35` | `hsl(142, 70%, 35%)` | Active state |

### Semantic Colors - Warning (Amber)

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-warning-50` | Color/Warning/50 | `#fffaf0` | `hsl(38, 90%, 97%)` | Light amber background |
| `--color-warning-100` | Color/Warning/100 | `#fff4db` | `hsl(38, 90%, 92%)` | Very light amber |
| `--color-warning-500` | Color/Warning/500 ⚠️ | `#f5a623` | `hsl(38, 90%, 50%)` | Main warning color |
| `--color-warning-600` | Color/Warning/600 | `#dd9519` | `hsl(38, 90%, 45%)` | Hover state |
| `--color-warning-700` | Color/Warning/700 | `#c58410` | `hsl(38, 90%, 40%)` | Active state |

### Semantic Colors - Error (Red)

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-error-50` | Color/Error/50 | `#fef2f2` | `hsl(0, 70%, 97%)` | Light red background |
| `--color-error-100` | Color/Error/100 | `#fee5e5` | `hsl(0, 70%, 92%)` | Very light red |
| `--color-error-500` | Color/Error/500 ❌ | `#cc3333` | `hsl(0, 70%, 50%)` | Main error color |
| `--color-error-600` | Color/Error/600 | `#b82d2d` | `hsl(0, 70%, 45%)` | Hover state |
| `--color-error-700` | Color/Error/700 | `#a32626` | `hsl(0, 70%, 40%)` | Active state |

### Semantic Colors - Info (Blue)

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-info-50` | Color/Info/50 | `#f0f9ff` | `hsl(210, 90%, 97%)` | Light blue background |
| `--color-info-100` | Color/Info/100 | `#e0f3ff` | `hsl(210, 90%, 92%)` | Very light blue |
| `--color-info-500` | Color/Info/500 ℹ️ | `#1a9fff` | `hsl(210, 90%, 55%)` | Main info color |
| `--color-info-600` | Color/Info/600 | `#0085e6` | `hsl(210, 90%, 50%)` | Hover state |
| `--color-info-700` | Color/Info/700 | `#006bb8` | `hsl(210, 90%, 45%)` | Active state |

### Neutral Scale (Grayscale)

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-neutral-50` | Color/Neutral/50 | `#fafafa` | `hsl(0, 0%, 98%)` | Very light gray |
| `--color-neutral-100` | Color/Neutral/100 | `#f5f5f5` | `hsl(0, 0%, 96%)` | Light gray backgrounds |
| `--color-neutral-200` | Color/Neutral/200 | `#e6e6e6` | `hsl(0, 0%, 90%)` | Subtle borders |
| `--color-neutral-300` | Color/Neutral/300 | `#cccccc` | `hsl(0, 0%, 80%)` | Default borders |
| `--color-neutral-400` | Color/Neutral/400 | `#999999` | `hsl(0, 0%, 60%)` | Disabled text |
| `--color-neutral-500` | Color/Neutral/500 | `#808080` | `hsl(0, 0%, 50%)` | Mid-gray |
| `--color-neutral-600` | Color/Neutral/600 | `#666666` | `hsl(0, 0%, 40%)` | Secondary text |
| `--color-neutral-700` | Color/Neutral/700 ⭐ | `#333333` | `hsl(0, 0%, 20%)` | Primary text |
| `--color-neutral-800` | Color/Neutral/800 | `#262626` | `hsl(0, 0%, 15%)` | Dark surfaces |
| `--color-neutral-900` | Color/Neutral/900 | `#1a1a1a` | `hsl(0, 0%, 10%)` | Very dark surfaces |

### Semantic Surface Colors

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--color-background` | Color/Surface/Background | `#f5f5f5` | `hsl(0, 0%, 96%)` | Main page background |
| `--color-surface` | Color/Surface/Default | `#ffffff` | `hsl(0, 0%, 100%)` | Cards, panels, modals |
| `--color-surface-elevated` | Color/Surface/Elevated | `#2a2a2a` | `hsl(0, 0%, 16.5%)` | Sidebar (dark) |
| `--color-surface-dark` | Color/Surface/Dark | `#1a1a1a` | `hsl(0, 0%, 10%)` | Header (very dark) |

### Semantic Text Colors

| CSS Token | Figma Style Name | Hex Value | Reference | Usage |
|-----------|------------------|-----------|-----------|-------|
| `--color-text-primary` | Color/Text/Primary | `#333333` | Neutral/700 | Main text |
| `--color-text-secondary` | Color/Text/Secondary | `#666666` | Neutral/600 | Secondary text |
| `--color-text-tertiary` | Color/Text/Tertiary | `#999999` | Neutral/400 | Muted text |
| `--color-text-inverse` | Color/Text/Inverse | `#ffffff` | White | Text on dark BG |
| `--color-text-on-primary` | Color/Text/OnPrimary | `#ffffff` | White | Text on primary color |

### Semantic Border Colors

| CSS Token | Figma Style Name | Hex Value | Reference | Usage |
|-----------|------------------|-----------|-----------|-------|
| `--color-border-subtle` | Color/Border/Subtle | `#e6e6e6` | Neutral/200 | Light borders |
| `--color-border-default` | Color/Border/Default | `#cccccc` | Neutral/300 | Default borders |
| `--color-border-strong` | Color/Border/Strong | `#999999` | Neutral/400 | Emphasized borders |
| `--color-border-dark` | Color/Border/Dark | `#444444` | `hsl(0, 0%, 27%)` | Borders on dark surfaces |

### Special Colors

| CSS Token | Figma Style Name | Hex Value | HSL | Usage |
|-----------|------------------|-----------|-----|-------|
| `--focus-ring-color` | Color/Focus/Ring | `#0056b3` | Primary/700 | Focus indicators |
| `--color-overlay-dark` | Color/Overlay/Dark | `rgba(0,0,0,0.5)` | 50% black | Modal overlays |
| `--color-overlay-light` | Color/Overlay/Light | `rgba(255,255,255,0.1)` | 10% white | Light overlays |
| `--color-overlay-medium` | Color/Overlay/Medium | `rgba(255,255,255,0.15)` | 15% white | Medium overlays |

### Accessibility Notes for Colors

- **Primary text (#333) on white: 12.6:1** → WCAG AAA ✓
- **Secondary text (#666) on white: 5.7:1** → WCAG AA ✓
- **Tertiary text (#999) on white: 2.8:1** → Use for large text only ⚠️
- **Focus ring on white: 7.4:1** → WCAG AAA ✓

---

## Typography Tokens

### How to Create in Figma

1. Select a text layer
2. Click the "Type settings" panel
3. Click the four-squares icon next to the font dropdown
4. Click "+" to create a new text style
5. Configure font, size, weight, line height, letter spacing
6. Name it using the convention below

### Font Families

**Primary:** System UI (use platform defaults in Figma)
- macOS: San Francisco
- Windows: Segoe UI
- Linux: Roboto

**Monospace:** SF Mono, Cascadia Code, or Monaco

### Text Styles

Create these as **Text Styles** in Figma:

#### Headings

| CSS Token | Figma Style Name | Font Size | Weight | Line Height | Usage |
|-----------|------------------|-----------|--------|-------------|-------|
| `--font-size-4xl` | Text/H1 | 36px (2.25rem) | Bold (700) | 1.2 | Page titles |
| `--font-size-3xl` | Text/H2 | 30px (1.875rem) | Semibold (600) | 1.2 | Section headings |
| `--font-size-2xl` | Text/H3 | 24px (1.5rem) | Semibold (600) | 1.2 | Subsections |
| `--font-size-xl` | Text/H4 | 20px (1.25rem) | Medium (500) | 1.2 | Card titles |
| `--font-size-lg` | Text/H5 | 18px (1.125rem) | Medium (500) | 1.2 | Minor headings |
| `--font-size-base` | Text/H6 | 16px (1rem) | Semibold (600) | 1.5 | Strong labels |

#### Body Text

| CSS Token | Figma Style Name | Font Size | Weight | Line Height | Letter Spacing | Usage |
|-----------|------------------|-----------|--------|-------------|----------------|-------|
| `--font-size-lg` | Text/Body/Large | 18px (1.125rem) | Regular (400) | 1.5 | 0 | Emphasis paragraphs |
| `--font-size-base` | Text/Body/Default ⭐ | 16px (1rem) | Regular (400) | 1.5 | 0 | Standard text |
| `--font-size-sm` | Text/Body/Small | 14px (0.875rem) | Regular (400) | 1.5 | 0 | Dense content |

#### Labels & Captions

| CSS Token | Figma Style Name | Font Size | Weight | Line Height | Letter Spacing | Usage |
|-----------|------------------|-----------|--------|-------------|----------------|-------|
| `--font-size-sm` | Text/Label/Default | 14px (0.875rem) | Medium (500) | 1.5 | 0 | Form labels |
| `--font-size-xs` | Text/Label/Small | 12px (0.75rem) | Medium (500) | 1.5 | 0 | Compact labels |
| `--font-size-xs` | Text/Caption | 12px (0.75rem) | Regular (400) | 1.5 | 0 | Help text |
| `--font-size-2xs` | Text/Overline | 10px (0.625rem) | Semibold (600) | 1.5 | 0.05em (widest) | Categories, uppercase |

#### Special Purpose

| Figma Style Name | Font Family | Font Size | Weight | Line Height | Usage |
|------------------|-------------|-----------|--------|-------------|-------|
| Text/Code | Monospace | 14px (0.875rem) | Regular (400) | 1.5 | Inline code |
| Text/Kbd | Sans Serif | 12px (0.75rem) | Medium (500) | 1.5 | Keyboard shortcuts |

### Typography Scale Visual Reference

```
┌───────────────────────────────────────┐
│ H1 - 36px - Bold (700)               │  Page title
│ H2 - 30px - Semibold (600)           │  Section heading
│ H3 - 24px - Semibold (600)           │  Subsection
│ H4 - 20px - Medium (500)             │  Card title
│ H5 - 18px - Medium (500)             │  Minor heading
│ H6 - 16px - Semibold (600)           │  Strong label
│ Body Large - 18px - Regular (400)    │  Emphasis
│ Body Default - 16px - Regular (400)  │  Standard ⭐
│ Body Small - 14px - Regular (400)    │  Dense
│ Label - 14px - Medium (500)          │  Form labels
│ Caption - 12px - Regular (400)       │  Help text
│ Overline - 10px - Semibold (600)     │  Categories
└───────────────────────────────────────┘
```

### Font Weight Reference

| CSS Token | Value | Figma Setting | Usage |
|-----------|-------|---------------|-------|
| `--font-weight-regular` | 400 | Regular | Body text |
| `--font-weight-medium` | 500 | Medium | Labels, emphasis |
| `--font-weight-semibold` | 600 | Semibold | Headings, active states |
| `--font-weight-bold` | 700 | Bold | Strong emphasis |

### Line Height Reference

| CSS Token | Value | Usage |
|-----------|-------|-------|
| `--line-height-tight` | 1.2 | Headings |
| `--line-height-normal` | 1.5 | Body text (default) |
| `--line-height-relaxed` | 1.75 | Long-form content |

### Letter Spacing Reference

| CSS Token | Value | Figma Value | Usage |
|-----------|-------|-------------|-------|
| `--letter-spacing-tight` | -0.02em | -2% | Large headings |
| `--letter-spacing-normal` | 0 | 0% | Body text (default) |
| `--letter-spacing-wide` | 0.02em | 2% | Small caps |
| `--letter-spacing-wider` | 0.025em | 2.5% | Badges |
| `--letter-spacing-widest` | 0.05em | 5% | Uppercase labels |

---

## Spacing Tokens

Spacing tokens are **not created as Figma styles** but are used as **values** when designing layouts.

### Base Unit: 4px

All spacing uses a **4px base unit** for consistency.

### Spacing Scale

| CSS Token | Value (rem) | Pixels | Figma Value | Usage |
|-----------|-------------|--------|-------------|-------|
| `--spacing-0` | 0 | 0px | 0 | No spacing |
| `--spacing-0-5` | 0.125rem | 2px | 2 | Tight spacing |
| `--spacing-1` | 0.25rem | 4px | 4 | Very small gaps |
| `--spacing-2` | 0.5rem | 8px | 8 | Small gaps ⭐ |
| `--spacing-3` | 0.75rem | 12px | 12 | Nav padding ⭐ |
| `--spacing-4` | 1rem | 16px | 16 | Standard spacing ⭐ |
| `--spacing-5` | 1.25rem | 20px | 20 | Medium spacing |
| `--spacing-6` | 1.5rem | 24px | 24 | Section spacing ⭐ |
| `--spacing-8` | 2rem | 32px | 32 | Large spacing |
| `--spacing-10` | 2.5rem | 40px | 40 | Section padding |
| `--spacing-12` | 3rem | 48px | 48 | Large section padding |
| `--spacing-16` | 4rem | 64px | 64 | Extra large sections |
| `--spacing-20` | 5rem | 80px | 80 | Hero padding |
| `--spacing-24` | 6rem | 96px | 96 | Very large spacing |

### Common Spacing Patterns

**Card Layout:**
- Padding: 24px (spacing-6)
- Gap between elements: 16px (spacing-4)
- Margin bottom: 16px (spacing-4)

**Button Padding:**
- Vertical: 12px (spacing-3)
- Horizontal: 16px (spacing-4)

**Form Fields:**
- Label margin bottom: 8px (spacing-2)
- Field margin bottom: 16px (spacing-4)
- Section margin bottom: 24px (spacing-6)

**Icon + Text Gap:**
- Small: 8px (spacing-2)
- Default: 12px (spacing-3)

### Using Spacing in Figma

1. **Auto Layout**: Set gaps to spacing values (8, 12, 16, 24)
2. **Padding**: Use spacing values for frame padding
3. **Alignment**: Ensure elements align to 4px grid
4. **Responsive**: Reduce spacing on mobile (e.g., 24 → 16, 16 → 12)

---

## Shadow Tokens (Effects)

### How to Create in Figma

1. Select a frame/shape
2. Open "Effects" panel
3. Click "+" → Choose "Drop Shadow"
4. Configure X, Y, Blur, Spread
5. Click the style icon → Create new effect style
6. Name it using the convention below

### Shadow Effect Styles

Create these as **Effect Styles** in Figma:

| CSS Token | Figma Style Name | X | Y | Blur | Spread | Color | Opacity | Usage |
|-----------|------------------|---|---|------|--------|-------|---------|-------|
| `--shadow-xs` | Effect/Shadow/XS | 0 | 1 | 2 | 0 | #000 | 5% | Subtle borders |
| `--shadow-sm` | Effect/Shadow/SM | 0 | 1 | 3 | 0 | #000 | 10% | Buttons |
| `--shadow-md` | Effect/Shadow/MD ⭐ | 0 | 4 | 6 | -1 | #000 | 10% | Cards |
| `--shadow-lg` | Effect/Shadow/LG | 0 | 10 | 15 | -3 | #000 | 10% | Modals |
| `--shadow-xl` | Effect/Shadow/XL | 0 | 20 | 25 | -5 | #000 | 10% | Overlays |
| `--shadow-2xl` | Effect/Shadow/2XL | 0 | 25 | 50 | -12 | #000 | 25% | Full-screen modals |
| `--shadow-inner` | Effect/Shadow/Inner | 0 | 2 | 4 | 0 | #000 | 6% | Inset (inner shadow) |
| `--shadow-header` | Effect/Shadow/Header | 0 | 2 | 4 | 0 | #000 | 10% | Header elevation |
| `--shadow-header-dark` | Effect/Shadow/Header/Dark | 0 | 2 | 4 | 0 | #000 | 20% | Dark header |
| `--shadow-sidebar` | Effect/Shadow/Sidebar | 2 | 0 | 4 | 0 | #000 | 10% | Right-edge shadow |

### Multi-Layer Shadows

Some shadows have **multiple layers** for depth. In Figma, add multiple drop shadows:

**shadow-sm (Small):**
- Layer 1: X=0, Y=1, Blur=3, Spread=0, Color=#000, Opacity=10%
- Layer 2: X=0, Y=1, Blur=2, Spread=0, Color=#000, Opacity=6%

**shadow-md (Medium):**
- Layer 1: X=0, Y=4, Blur=6, Spread=-1, Color=#000, Opacity=10%
- Layer 2: X=0, Y=2, Blur=4, Spread=-1, Color=#000, Opacity=6%

**shadow-lg (Large):**
- Layer 1: X=0, Y=10, Blur=15, Spread=-3, Color=#000, Opacity=10%
- Layer 2: X=0, Y=4, Blur=6, Spread=-2, Color=#000, Opacity=5%

**shadow-xl (Extra Large):**
- Layer 1: X=0, Y=20, Blur=25, Spread=-5, Color=#000, Opacity=10%
- Layer 2: X=0, Y=10, Blur=10, Spread=-5, Color=#000, Opacity=4%

### Shadow Usage Guidelines

| Shadow | Use Case | Visual Impact |
|--------|----------|---------------|
| XS | Keyboard shortcuts, subtle depth | Barely visible |
| SM | Buttons, form inputs | Light elevation |
| MD | Cards, dropdowns | Standard elevation ⭐ |
| LG | Modals, popovers | Clear separation |
| XL | Floating panels | Strong elevation |
| 2XL | Full-screen modals | Maximum depth |
| Inner | Pressed buttons, insets | Recessed |
| Header | Navigation headers | Consistent header |
| Sidebar | Side navigation | Directional shadow |

---

## Border Radius Tokens

Border radius values are **not created as Figma styles** but are used as **values** in the corner radius field.

### Radius Scale

| CSS Token | Value (rem) | Pixels | Figma Value | Usage |
|-----------|-------------|--------|-------------|-------|
| `--radius-none` | 0 | 0px | 0 | Square corners |
| `--radius-sm` | 0.25rem | 4px | 4 | Small elements |
| `--radius-md` | 0.375rem | 6px | 6 | Buttons, inputs ⭐ |
| `--radius-lg` | 0.5rem | 8px | 8 | Cards, panels ⭐ |
| `--radius-xl` | 0.75rem | 12px | 12 | Modals |
| `--radius-2xl` | 1rem | 16px | 16 | Hero sections |
| `--radius-full` | 9999px | ∞ | 9999 | Circles, badges |

### Common Radius Patterns

| Element | Radius Value | Figma Value |
|---------|--------------|-------------|
| Button | 6px | `--radius-md` |
| Input | 6px | `--radius-md` |
| Card | 8px | `--radius-lg` |
| Modal | 12px | `--radius-xl` |
| Badge | 9999px | `--radius-full` |
| Avatar | 9999px | `--radius-full` |
| Dropdown | 6px | `--radius-md` |
| Toast | 6px | `--radius-md` |

### Using Radius in Figma

1. Select a frame/shape
2. Find "Corner radius" in the properties panel
3. Enter the pixel value from the table above
4. For circular elements (badges, avatars), use **9999**

---

## Creating Figma Styles

### Step-by-Step Guide

#### 1. Set Up Your File Structure

```
📁 FanEngagement Design System
  ├── 📄 Foundation
  │   ├── Colors
  │   ├── Typography
  │   └── Effects
  ├── 📄 Components
  │   ├── Buttons
  │   ├── Cards
  │   ├── Forms
  │   └── Navigation
  └── 📄 Documentation
```

#### 2. Create Color Styles

1. Create a new page called "Foundation"
2. Draw a rectangle (R) for each color token
3. Fill with the color value from the mapping table
4. Select the rectangle → Click fill color → Four-squares icon → "+"
5. Name using the pattern: `Color/Category/Value` (e.g., `Color/Primary/600`)
6. Repeat for all colors (50+ styles)

**Tip:** Use a plugin like "Figma Tokens" to bulk import colors from JSON.

#### 3. Create Text Styles

1. Create a text layer (T) for each typography token
2. Set font family (System UI / San Francisco / Segoe UI)
3. Set size, weight, line height, letter spacing from the table
4. Select text → Click "..." next to style → "+"
5. Name using pattern: `Text/Category/Name` (e.g., `Text/H1`, `Text/Body/Default`)
6. Repeat for all text styles (20+ styles)

#### 4. Create Effect Styles (Shadows)

1. Draw a rectangle for each shadow token
2. Add drop shadow effect(s) using values from the table
3. Select rectangle → Effects panel → Style icon → "+"
4. Name using pattern: `Effect/Shadow/Name` (e.g., `Effect/Shadow/MD`)
5. For multi-layer shadows, add all layers before creating the style
6. Repeat for all shadows (10 styles)

#### 5. Organize Styles

Figma will automatically group styles by their naming convention:
- `Color/Primary/600` → Color > Primary > 600
- `Text/Body/Default` → Text > Body > Default
- `Effect/Shadow/MD` → Effect > Shadow > MD

---

## Naming Conventions

### Figma Style Naming Pattern

```
[Type]/[Category]/[Variant]
```

**Examples:**
- `Color/Primary/600` (Main brand blue)
- `Color/Text/Primary` (Primary text color)
- `Text/H1` (Heading 1 text style)
- `Text/Body/Default` (Default body text)
- `Effect/Shadow/MD` (Medium shadow)

### Category Organization

**Colors:**
- `Color/Primary/*` - Brand colors (50-900)
- `Color/Success/*` - Green colors (50, 100, 500, 600, 700)
- `Color/Warning/*` - Amber colors
- `Color/Error/*` - Red colors
- `Color/Info/*` - Blue colors
- `Color/Neutral/*` - Grayscale (50-900)
- `Color/Surface/*` - Surface colors (Background, Default, Elevated, Dark)
- `Color/Text/*` - Text colors (Primary, Secondary, Tertiary, Inverse, OnPrimary)
- `Color/Border/*` - Border colors (Subtle, Default, Strong, Dark)
- `Color/Focus/*` - Focus states (Ring)
- `Color/Overlay/*` - Overlays (Light, Medium, Dark)

**Typography:**
- `Text/H1` through `Text/H6` - Headings
- `Text/Body/*` - Body text (Large, Default, Small)
- `Text/Label/*` - Labels (Default, Small)
- `Text/Caption` - Caption text
- `Text/Overline` - Overline/category text
- `Text/Code` - Monospace code
- `Text/Kbd` - Keyboard shortcuts

**Effects:**
- `Effect/Shadow/XS` through `Effect/Shadow/2XL` - Standard shadows
- `Effect/Shadow/Inner` - Inset shadow
- `Effect/Shadow/Header` - Header-specific
- `Effect/Shadow/Header/Dark` - Dark header
- `Effect/Shadow/Sidebar` - Sidebar directional

### Naming Best Practices

1. **Use consistent separators:** Forward slash `/` for hierarchy
2. **Be descriptive:** `Color/Text/Primary` is better than `TextPrimary`
3. **Match CSS tokens:** Keep Figma names aligned with CSS variable names
4. **Avoid abbreviations:** Use `Primary` not `Pri`, `Medium` not `Med`
5. **Follow hierarchy:** Type → Category → Variant

---

## Maintenance & Sync

### Keeping Figma and CSS in Sync

#### When CSS Tokens Change

1. **Update this document** with new values
2. **Update Figma styles** to match
3. **Notify design team** of changes
4. **Test components** using affected styles

#### When Figma Library Changes

1. **Update CSS tokens** in `frontend/src/index.css`
2. **Update documentation** in `docs/frontend/design-system.md`
3. **Test in browser** that changes render correctly
4. **Run visual regression tests** if available

#### Version Control

- **Document version numbers** in both Figma and docs
- **Maintain changelog** of token changes
- **Tag Figma releases** when publishing library updates
- **Coordinate releases** with frontend team

### Quarterly Sync Process

**Every 3 months:**

1. **Audit CSS tokens** against Figma library
2. **Check for drift** (mismatched values)
3. **Verify naming** consistency
4. **Update documentation** as needed
5. **Run contrast checks** for new colors
6. **Review component usage** in both systems

### Tools for Sync

**Recommended Figma Plugins:**
- **Figma Tokens** - Import/export tokens as JSON
- **Design Lint** - Check for inconsistent styles
- **Contrast** - Verify color accessibility
- **Stark** - Accessibility checker

**Recommended Tools:**
- **Style Dictionary** - Transform tokens between formats
- **Theo** - Salesforce's design token tool
- **Figma API** - Programmatic style extraction

### Token Change Workflow

```
┌─────────────────────┐
│ Token Change Needed │
└──────────┬──────────┘
           │
    ┌──────▼───────┐
    │ Design First │ (Figma → CSS)
    └──────┬───────┘
           │
    ┌──────▼───────┐
    │ Code First   │ (CSS → Figma)
    └──────┬───────┘
           │
    ┌──────▼──────────────────┐
    │ Update Both Sources     │
    │ - CSS tokens            │
    │ - Figma styles          │
    │ - Documentation         │
    └──────┬──────────────────┘
           │
    ┌──────▼────────────────┐
    │ Publish & Notify Team │
    └───────────────────────┘
```

---

## Quick Reference Card

### Most Used Tokens

**Colors:**
- Brand: `Color/Primary/600` (#007bff)
- Text: `Color/Text/Primary` (#333)
- Background: `Color/Surface/Background` (#f5f5f5)
- Surface: `Color/Surface/Default` (white)

**Typography:**
- Body: `Text/Body/Default` (16px, Regular)
- Label: `Text/Label/Default` (14px, Medium)
- Heading: `Text/H2` (30px, Semibold)

**Spacing (use as values):**
- Small gap: 8px
- Standard: 16px
- Section: 24px
- Large: 32px

**Shadows (effects):**
- Button: `Effect/Shadow/SM`
- Card: `Effect/Shadow/MD`
- Modal: `Effect/Shadow/LG`

**Radius (use as values):**
- Button/Input: 6px
- Card: 8px
- Modal: 12px
- Circle: 9999px

---

## Resources

- **CSS Source:** `frontend/src/index.css`
- **Design System Docs:** `docs/frontend/design-system.md`
- **Interactive Showcase:** `docs/frontend/design-tokens-showcase.html`
- **Component Specs:** See `docs/frontend/figma-component-specs.md` (to be created)

---

## Questions or Feedback?

- **Design questions:** Contact design team
- **Token changes:** Open PR with rationale
- **Figma access:** Request from design lead
- **Sync issues:** File issue in repository

---

**Last Updated:** 2025-12-09  
**Maintained By:** Frontend Experience Specialist  
**Next Review:** 2025-03-09 (Quarterly sync)
