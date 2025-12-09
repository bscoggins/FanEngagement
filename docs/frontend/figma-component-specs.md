# Figma Component Specifications

**Version:** 1.0  
**Last Updated:** 2025-12-09  
**Purpose:** Detailed specifications for building UI components in Figma

---

## Table of Contents

1. [Overview](#overview)
2. [Button Components](#button-components)
3. [Card Components](#card-components)
4. [Form Components](#form-components)
5. [Badge & Tag Components](#badge--tag-components)
6. [Navigation Components](#navigation-components)
7. [Modal & Overlay Components](#modal--overlay-components)
8. [Table Components](#table-components)
9. [Component States](#component-states)
10. [Accessibility Requirements](#accessibility-requirements)

---

## Overview

This document provides exact specifications for building components in Figma that match the FanEngagement frontend implementation.

### Component Anatomy Format

Each component specification includes:
- **Visual structure** (anatomy diagram)
- **Spacing & sizing** (measurements)
- **Token mapping** (which design tokens to use)
- **States** (default, hover, focus, active, disabled)
- **Variants** (sizes, types, colors)
- **Accessibility requirements** (contrast, touch targets, ARIA)

### Design Tokens Reference

All measurements use design tokens. See `figma-token-mapping.md` for complete token definitions.

---

## Button Components

### Primary Button

#### Anatomy

```
┌──────────────────────────────────┐
│  ←12px→ [Icon] ←8px→ Label ←12px→│
│    ↑                         ↑   │
│   12px                      12px │
│    ↓                         ↓   │
└──────────────────────────────────┘
    ←────── Min 88px ──────→

Padding: 12px (spacing-3) vertical, 16px (spacing-4) horizontal
Min Width: 88px (for accessibility)
Min Height: 44px (for touch targets)
Border Radius: 6px (radius-md)
```

#### Specifications

**Default State:**
- **Background:** `Color/Primary/600` (#007bff)
- **Text:** `Color/Text/OnPrimary` (white)
- **Font:** `Text/Label/Default` (14px, Medium)
- **Shadow:** `Effect/Shadow/SM`
- **Border Radius:** 6px
- **Padding:** 12px (top/bottom), 16px (left/right)
- **Min Width:** 88px
- **Min Height:** 44px

**Hover State:**
- **Background:** `Color/Primary/700` (#0056b3)
- **Shadow:** `Effect/Shadow/MD` (lift effect)
- **Transition:** 200ms ease-out

**Focus State:**
- **Outline:** 2px solid `Color/Focus/Ring` (#0056b3)
- **Outline Offset:** 2px
- **Shadow:** `Effect/Shadow/SM` + focus ring shadow

**Active State (Pressed):**
- **Background:** `Color/Primary/800`
- **Shadow:** `Effect/Shadow/Inner` (pressed effect)
- **Transform:** translateY(1px)

**Disabled State:**
- **Background:** `Color/Neutral/300` (#ccc)
- **Text:** `Color/Text/Tertiary` (#999)
- **Shadow:** None
- **Cursor:** not-allowed
- **Opacity:** 0.6

#### Variants

**Size Variants:**

| Variant | Height | Padding V/H | Font Size | Icon Size |
|---------|--------|-------------|-----------|-----------|
| Small | 36px | 8px / 12px | 12px (xs) | 16px |
| Default | 44px | 12px / 16px | 14px (sm) | 20px |
| Large | 52px | 16px / 24px | 16px (base) | 24px |

**Type Variants:**

| Type | Background | Text | Border | Shadow |
|------|------------|------|--------|--------|
| Primary | Primary/600 | White | None | SM |
| Secondary | Neutral/100 | Text/Primary | 1px Neutral/300 | None |
| Outline | Transparent | Primary/600 | 1px Primary/600 | None |
| Ghost | Transparent | Text/Primary | None | None |
| Danger | Error/500 | White | None | SM |

**Icon Placement:**
- **Icon Only:** 44x44px, icon centered, no padding adjustment
- **Icon Left:** Icon + 8px gap + Label
- **Icon Right:** Label + 8px gap + Icon

### Secondary Button

Same anatomy as Primary Button, different colors:

**Default State:**
- **Background:** `Color/Neutral/100` (#f5f5f5)
- **Text:** `Color/Text/Primary` (#333)
- **Border:** 1px solid `Color/Border/Default` (#ccc)
- **Shadow:** None

**Hover State:**
- **Background:** `Color/Neutral/200`
- **Border:** 1px solid `Color/Border/Strong`

### Button Group

When buttons are grouped:
- **Gap:** 8px (spacing-2) for horizontal
- **Stack Gap:** 12px (spacing-3) for vertical
- **Alignment:** Center for mixed widths

---

## Card Components

### Default Card

#### Anatomy

```
┌────────────────────────────────────────┐
│  ←24px→                          ↑     │
│         Card Title              24px   │
│                                  ↓     │
│  ←16px→                          ↑     │
│         Subtitle / Meta         16px   │
│                                  ↓     │
│  ←16px→                          ↑     │
│         Card body content               │
│         Multiple lines of text          │
│         ...                             │
│                                  ↓     │
│  ←16px→                          ↑     │
│         [Button] [Button]       24px   │
│                                  ↓     │
└────────────────────────────────────────┘
   ←──────── Min 300px ──────────→

Padding: 24px (spacing-6) all sides
Border Radius: 8px (radius-lg)
Gap between sections: 16px (spacing-4)
```

#### Specifications

**Default State:**
- **Background:** `Color/Surface/Default` (white)
- **Border:** 1px solid `Color/Border/Subtle` (#e6e6e6)
- **Shadow:** `Effect/Shadow/MD`
- **Border Radius:** 8px (radius-lg)
- **Padding:** 24px (spacing-6)

**Hover State (Interactive Cards):**
- **Shadow:** `Effect/Shadow/LG` (lift effect)
- **Transform:** translateY(-2px)
- **Transition:** 200ms ease-out

**Focus State (Clickable Cards):**
- **Outline:** 2px solid `Color/Focus/Ring`
- **Outline Offset:** 2px

**Active State (Pressed):**
- **Transform:** translateY(0)
- **Shadow:** `Effect/Shadow/MD`

#### Content Structure

**Card Header:**
- **Title:** `Text/H4` (20px, Medium)
- **Margin Bottom:** 8px (spacing-2)
- **Meta/Subtitle:** `Text/Caption` (12px, Regular), `Color/Text/Secondary`

**Card Body:**
- **Text:** `Text/Body/Default` (16px, Regular)
- **Line Spacing:** 16px (spacing-4) between paragraphs
- **Lists:** 8px (spacing-2) gap between items

**Card Footer:**
- **Margin Top:** 16px (spacing-4)
- **Button Gap:** 8px (spacing-2) between buttons
- **Alignment:** Left (default), Right (actions), Space-between (mixed)

#### Variants

**Elevated Card:**
- **Shadow:** `Effect/Shadow/LG` (always elevated)
- **Background:** `Color/Surface/Default`
- **Border:** None

**Outlined Card:**
- **Border:** 1px solid `Color/Border/Default` (#ccc)
- **Shadow:** None
- **Background:** `Color/Surface/Default`

**Filled Card:**
- **Background:** `Color/Neutral/50` (#fafafa)
- **Border:** None
- **Shadow:** None

---

## Form Components

### Text Input

#### Anatomy

```
Label ←─────────────────────────────┐
  ↓                                 │
┌────────────────────────────────┐  │
│  ←12px→ Placeholder text  ←12px→│  │
│    ↑                        ↑   │  │
│   12px                     12px │  │
│    ↓                        ↓   │  │
└────────────────────────────────┘  │
  ↓                                 │
Helper text or error message        │
                                    │
Min Height: 44px                    │
Border Radius: 6px                  │
```

#### Specifications

**Default State:**
- **Background:** `Color/Surface/Default` (white)
- **Border:** 1px solid `Color/Border/Default` (#ccc)
- **Text:** `Text/Body/Default` (16px, Regular), `Color/Text/Primary`
- **Placeholder:** `Color/Text/Tertiary` (#999)
- **Border Radius:** 6px (radius-md)
- **Padding:** 12px (spacing-3)
- **Min Height:** 44px

**Focus State:**
- **Border:** 2px solid `Color/Primary/600`
- **Outline:** None (border serves as focus indicator)
- **Shadow:** `0 0 0 4px rgba(0, 123, 255, 0.1)` (focus ring)

**Hover State:**
- **Border:** 1px solid `Color/Border/Strong` (#999)

**Error State:**
- **Border:** 2px solid `Color/Error/500`
- **Shadow:** `0 0 0 4px rgba(204, 51, 51, 0.1)`
- **Helper Text:** `Color/Error/500`, icon (⚠️ or ❌)

**Success State:**
- **Border:** 2px solid `Color/Success/500`
- **Helper Text:** `Color/Success/500`, icon (✓)

**Disabled State:**
- **Background:** `Color/Neutral/100` (#f5f5f5)
- **Border:** 1px solid `Color/Border/Subtle` (#e6e6e6)
- **Text:** `Color/Text/Tertiary` (#999)
- **Cursor:** not-allowed
- **Opacity:** 0.6

#### Label & Helper Text

**Label:**
- **Font:** `Text/Label/Default` (14px, Medium)
- **Color:** `Color/Text/Primary`
- **Margin Bottom:** 8px (spacing-2)
- **Required Indicator:** Red asterisk (*) if required

**Helper Text:**
- **Font:** `Text/Caption` (12px, Regular)
- **Color:** `Color/Text/Secondary` (default), `Color/Error/500` (error)
- **Margin Top:** 8px (spacing-2)

**Error Message:**
- **Font:** `Text/Caption` (12px, Regular)
- **Color:** `Color/Error/500`
- **Icon:** Error icon (16px) + 4px gap + text

### Textarea

Same as Text Input, but:
- **Min Height:** 120px (3 lines of text)
- **Resize:** Vertical only
- **Line Height:** 1.5 (line-height-normal)

### Checkbox

#### Anatomy

```
┌─────┐
│  ✓  │ ←24px→ Label text
└─────┘
  20x20px
```

#### Specifications

**Default State (Unchecked):**
- **Size:** 20x20px
- **Background:** `Color/Surface/Default` (white)
- **Border:** 2px solid `Color/Border/Default` (#ccc)
- **Border Radius:** 4px (radius-sm)

**Checked State:**
- **Background:** `Color/Primary/600`
- **Border:** 2px solid `Color/Primary/600`
- **Checkmark:** White, centered, 14px icon

**Focus State:**
- **Outline:** 2px solid `Color/Focus/Ring`
- **Outline Offset:** 2px

**Hover State:**
- **Border:** 2px solid `Color/Primary/600` (unchecked)
- **Background:** `Color/Primary/700` (checked)

**Disabled State:**
- **Background:** `Color/Neutral/100`
- **Border:** 2px solid `Color/Border/Subtle`
- **Opacity:** 0.5

**Label:**
- **Font:** `Text/Body/Default` (16px, Regular)
- **Color:** `Color/Text/Primary`
- **Gap:** 8px (spacing-2) from checkbox

### Radio Button

Similar to checkbox, but:
- **Border Radius:** 9999px (radius-full) - perfect circle
- **Checked Indicator:** Inner circle (8px diameter) centered

### Select Dropdown

Same as Text Input, but:
- **Right Icon:** Chevron down icon (20px), 12px from right edge
- **Padding Right:** 40px (to accommodate icon)

---

## Badge & Tag Components

### Badge

#### Anatomy

```
┌────────────────┐
│ ←8px→ Text ←8px→│
│   ↑          ↑  │
│  4px        4px │
│   ↓          ↓  │
└────────────────┘

Padding: 4px (spacing-1) vertical, 8px (spacing-2) horizontal
Border Radius: 9999px (radius-full)
```

#### Specifications

**Default Badge:**
- **Background:** `Color/Neutral/200` (#e6e6e6)
- **Text:** `Color/Text/Primary` (#333)
- **Font:** `Text/Label/Small` (12px, Medium)
- **Padding:** 4px (vertical), 8px (horizontal)
- **Border Radius:** 9999px (full)
- **Letter Spacing:** 0.025em (wider)

**Color Variants:**

| Type | Background | Text | Icon |
|------|------------|------|------|
| Primary | Primary/600 | White | - |
| Success | Success/500 | White | ✓ |
| Warning | Warning/500 | Neutral/900 | ⚠️ |
| Error | Error/500 | White | ❌ |
| Info | Info/500 | White | ℹ️ |

**Size Variants:**

| Size | Padding V/H | Font Size | Height |
|------|-------------|-----------|--------|
| Small | 2px / 6px | 10px (2xs) | 18px |
| Default | 4px / 8px | 12px (xs) | 24px |
| Large | 6px / 12px | 14px (sm) | 32px |

**Icon Badge:**
- **Icon Size:** 16px
- **Icon + Text Gap:** 4px (spacing-1)
- **Icon Only:** 24x24px circular, icon centered

### Tag (Removable Badge)

Same as Badge, but with close button:
- **Close Button:** 16x16px, right-aligned
- **Close Icon:** × (12px)
- **Gap:** 4px between text and close button
- **Total Padding Right:** 4px (after close button)

---

## Navigation Components

### Navigation Link

#### Anatomy

```
┌────────────────────────────────┐
│  ←12px→ [Icon] ←8px→ Label ←12px→│
│    ↑                        ↑   │
│   12px                     12px │
│    ↓                        ↓   │
└────────────────────────────────┘

Padding: 12px (spacing-3) all sides
Border Radius: 6px (radius-md)
Min Height: 44px
```

#### Specifications

**Default State:**
- **Background:** Transparent
- **Text:** `Color/Text/Secondary` (#666)
- **Font:** `Text/Body/Default` (16px, Medium)
- **Icon:** 20px, `Color/Text/Secondary`
- **Padding:** 12px (spacing-3)
- **Border Radius:** 6px (radius-md)

**Hover State:**
- **Background:** `Color/Neutral/100` (#f5f5f5)
- **Text:** `Color/Text/Primary` (#333)
- **Transition:** 150ms ease-out

**Active/Current State:**
- **Background:** `Color/Primary/50` (#f0f9ff)
- **Text:** `Color/Primary/600` (#007bff)
- **Font Weight:** Semibold (600)
- **Border Left:** 3px solid `Color/Primary/600` (optional)

**Focus State:**
- **Outline:** 2px solid `Color/Focus/Ring`
- **Outline Offset:** 2px

**Icon Spacing:**
- **Icon Size:** 20px
- **Gap:** 8px (spacing-2) between icon and label

### Breadcrumb

#### Anatomy

```
Home → Category → Current Page
 ↑       ↑           ↑
12px    12px       12px (font size)
Gap: 8px between items
Separator: → or / (8px on each side)
```

#### Specifications

**Default Link:**
- **Text:** `Color/Text/Secondary` (#666)
- **Font:** `Text/Body/Small` (14px, Regular)
- **Underline:** None

**Hover Link:**
- **Text:** `Color/Primary/600`
- **Underline:** Yes (1px)

**Current Page:**
- **Text:** `Color/Text/Primary` (#333)
- **Font Weight:** Medium (500)
- **Underline:** None
- **Cursor:** default (not clickable)

**Separator:**
- **Character:** `/` or `›`
- **Color:** `Color/Text/Tertiary` (#999)
- **Margin:** 8px (spacing-2) on each side

---

## Modal & Overlay Components

### Modal Dialog

#### Anatomy

```
Overlay (full screen, dark transparent)
  ↓
┌─────────────────────────────────────┐
│  ←24px→  Title           [×] ←24px→ │ ← Header
│                                      │
├──────────────────────────────────────┤
│  ←24px→                        ↑     │
│         Modal body content    24px  │ ← Body
│         ...                    ↓     │
│                                      │
├──────────────────────────────────────┤
│  ←24px→  [Cancel] [Save]  ←24px→    │ ← Footer
└─────────────────────────────────────┘

Min Width: 400px
Max Width: 600px (default), 800px (large)
Border Radius: 12px (radius-xl)
```

#### Specifications

**Overlay:**
- **Background:** `Color/Overlay/Dark` (rgba(0,0,0,0.5))
- **Position:** Fixed, full screen
- **Z-index:** 1000

**Modal Container:**
- **Background:** `Color/Surface/Default` (white)
- **Shadow:** `Effect/Shadow/2XL`
- **Border Radius:** 12px (radius-xl)
- **Max Height:** 90vh
- **Overflow:** Auto (if content exceeds max height)

**Modal Header:**
- **Padding:** 24px (spacing-6)
- **Border Bottom:** 1px solid `Color/Border/Subtle`
- **Title:** `Text/H3` (24px, Semibold)
- **Close Button:** 32x32px, top-right, icon 20px

**Modal Body:**
- **Padding:** 24px (spacing-6)
- **Min Height:** 120px
- **Max Height:** Calc(90vh - header - footer)
- **Overflow:** Auto if needed

**Modal Footer:**
- **Padding:** 16px 24px (spacing-4, spacing-6)
- **Border Top:** 1px solid `Color/Border/Subtle`
- **Button Gap:** 8px (spacing-2)
- **Alignment:** Right (default)

**Size Variants:**

| Size | Width | Max Width |
|------|-------|-----------|
| Small | 400px | 500px |
| Default | 500px | 600px |
| Large | 700px | 800px |
| Full | 90vw | 1200px |

### Toast Notification

#### Anatomy

```
┌────────────────────────────────────┐
│ [Icon] ←8px→ Message text    [×]   │
│         Multi-line if needed       │
└────────────────────────────────────┘

Min Width: 300px
Max Width: 500px
Padding: 16px (spacing-4)
Border Radius: 6px (radius-md)
```

#### Specifications

**Default Toast:**
- **Background:** `Color/Surface/Default` (white)
- **Border:** 1px solid `Color/Border/Default`
- **Shadow:** `Effect/Shadow/LG`
- **Padding:** 16px (spacing-4)
- **Border Radius:** 6px (radius-md)
- **Position:** Fixed, top-right (16px from edges)

**Type Variants:**

| Type | Background | Border | Icon | Icon Color |
|------|------------|--------|------|------------|
| Success | Success/50 | Success/500 | ✓ | Success/600 |
| Warning | Warning/50 | Warning/500 | ⚠️ | Warning/600 |
| Error | Error/50 | Error/500 | ❌ | Error/600 |
| Info | Info/50 | Info/500 | ℹ️ | Info/600 |

**Content:**
- **Icon:** 20px, left-aligned
- **Text:** `Text/Body/Default` (16px, Regular)
- **Gap:** 8px (spacing-2) between icon and text
- **Close Button:** 24x24px, right-aligned, optional

**Animation:**
- **Entry:** Slide in from right, 300ms ease-out
- **Exit:** Fade out, 200ms ease-in
- **Auto-dismiss:** 5 seconds (default)

---

## Table Components

### Data Table

#### Anatomy

```
┌──────────────────────────────────────┐
│ Column 1    Column 2    Column 3  [↓]│ ← Header
├──────────────────────────────────────┤
│ Data 1.1    Data 1.2    Data 1.3     │ ← Row
│ Data 2.1    Data 2.2    Data 2.3     │ ← Row
│ ...                                   │
└──────────────────────────────────────┘

Header Height: 48px
Row Height: 56px (default)
Cell Padding: 16px (spacing-4)
```

#### Specifications

**Table Container:**
- **Background:** `Color/Surface/Default` (white)
- **Border:** 1px solid `Color/Border/Subtle`
- **Border Radius:** 8px (radius-lg)
- **Overflow:** Auto (horizontal scroll if needed)

**Table Header:**
- **Background:** `Color/Neutral/50` (#fafafa)
- **Border Bottom:** 2px solid `Color/Border/Default`
- **Text:** `Text/Label/Default` (14px, Semibold)
- **Color:** `Color/Text/Primary`
- **Padding:** 16px (spacing-4)
- **Height:** 48px

**Table Row:**
- **Background:** `Color/Surface/Default` (white)
- **Border Bottom:** 1px solid `Color/Border/Subtle`
- **Padding:** 16px (spacing-4)
- **Height:** 56px
- **Last Row:** No border bottom

**Hover State (Row):**
- **Background:** `Color/Neutral/50` (#fafafa)
- **Transition:** 150ms ease-out

**Selected State (Row):**
- **Background:** `Color/Primary/50` (#f0f9ff)
- **Border Left:** 3px solid `Color/Primary/600`

**Sortable Header:**
- **Cursor:** pointer
- **Icon:** Sort icon (16px) 4px from text
- **Hover:** Background `Color/Neutral/100`

**Cell Alignment:**
- **Text:** Left
- **Numbers:** Right
- **Actions:** Center or Right

---

## Component States

### Universal State Tokens

All interactive components share these state patterns:

#### Default
- Base appearance as documented per component

#### Hover
- Slight background change or shadow increase
- 150-200ms transition
- Cursor: pointer

#### Focus
- **Outline:** 2px solid `Color/Focus/Ring` (#0056b3)
- **Outline Offset:** 2px
- **Shadow:** `0 0 0 4px rgba(0, 86, 179, 0.1)` (optional)

#### Active (Pressed)
- Darker background or inset shadow
- Slight transform (translateY(1px))
- Reduced shadow

#### Disabled
- Reduced opacity (0.5-0.6)
- Cursor: not-allowed
- No hover/focus effects
- Muted colors (grays)

#### Loading
- Spinner or skeleton
- Disabled interaction
- Reduced opacity or overlay

---

## Accessibility Requirements

### Color Contrast

All text must meet **WCAG 2.1 AA** standards:

| Element | Contrast Ratio | Status |
|---------|----------------|--------|
| Normal text (< 18px) | 4.5:1 minimum | ✓ |
| Large text (≥ 18px) | 3:1 minimum | ✓ |
| UI components | 3:1 minimum | ✓ |
| Focus indicators | 3:1 minimum | ✓ |

**Verified Combinations:**
- Primary text (#333) on white: **12.6:1** ✓ AAA
- Secondary text (#666) on white: **5.7:1** ✓ AA
- Primary button (#007bff) on white: **4.5:1** ✓ AA
- Focus ring (#0056b3) on white: **7.4:1** ✓ AAA

### Touch Target Sizes

**WCAG 2.1 AAA:** Minimum **44×44px** for all interactive elements

| Component | Min Width | Min Height | Status |
|-----------|-----------|------------|--------|
| Button | 88px | 44px | ✓ |
| Input | - | 44px | ✓ |
| Checkbox | 20px | 20px | ⚠️ Add 12px padding |
| Nav Link | - | 44px | ✓ |
| Icon Button | 44px | 44px | ✓ |

**Mobile Adjustment:** Increase to **48×48px** on mobile devices

### Focus Indicators

**All interactive elements must have visible focus:**
- Outline: 2px solid (minimum)
- Offset: 2px (for visibility)
- Color: High contrast (3:1 minimum)
- Never use `outline: none` without alternative

### Semantic Structure

**Use correct HTML elements in code:**
- Buttons for actions (`<button>`)
- Links for navigation (`<a>`)
- Form controls with labels (`<label>` + `<input>`)
- Headings in order (H1 → H2 → H3)
- Lists for navigation (`<nav>` + `<ul>`)

**ARIA Labels:**
- Icon-only buttons: `aria-label="Close"`
- Complex widgets: Appropriate ARIA roles
- Form validation: `aria-invalid`, `aria-describedby`

### Keyboard Navigation

**All components must be keyboard accessible:**
- Tab order follows visual flow
- Enter/Space activates buttons/links
- Arrow keys navigate lists/menus
- Escape closes modals/dropdowns
- Focus trap in modals

### Screen Reader Support

**Provide text alternatives:**
- Alt text for icons
- ARIA labels for icon buttons
- Status announcements for toasts
- Loading states announced
- Error messages associated with inputs

---

## Building Components in Figma

### Step-by-Step Process

1. **Create Base Components**
   - Use specifications above for exact measurements
   - Apply design tokens (colors, typography, shadows)
   - Name layers descriptively

2. **Add Variants**
   - Use Figma's variant feature for states (Default, Hover, Focus, etc.)
   - Create size variants (Small, Default, Large)
   - Create type variants (Primary, Secondary, etc.)

3. **Make Components Responsive**
   - Use Auto Layout for flexible sizing
   - Set min/max constraints
   - Use constraints for responsiveness

4. **Document Usage**
   - Add descriptions to component properties
   - Include accessibility notes
   - Link to this documentation

5. **Test Components**
   - Verify all states work
   - Check contrast ratios
   - Validate measurements
   - Test with actual content

### Component Checklist

Before publishing a component:
- [ ] All states implemented (Default, Hover, Focus, Active, Disabled)
- [ ] All size variants created
- [ ] All type variants created
- [ ] Uses design tokens consistently
- [ ] Meets accessibility requirements (contrast, touch targets)
- [ ] Auto Layout configured properly
- [ ] Named following conventions
- [ ] Documented with description
- [ ] Tested with real content

---

## Resources

- **Token Mapping:** `docs/frontend/figma-token-mapping.md`
- **Design System:** `docs/frontend/design-system.md`
- **CSS Source:** `frontend/src/index.css`
- **Interactive Showcase:** `docs/frontend/design-tokens-showcase.html`

---

## Maintenance

**When to Update:**
- New component added to codebase
- Component behavior changes
- New state or variant added
- Accessibility requirements change
- Design token values change

**How to Update:**
1. Update this document with new specs
2. Update Figma components to match
3. Notify design team of changes
4. Test changes in both Figma and code
5. Document changes in changelog

---

**Last Updated:** 2025-12-09  
**Maintained By:** Frontend Experience Specialist  
**Next Review:** 2025-03-09 (Quarterly sync)
