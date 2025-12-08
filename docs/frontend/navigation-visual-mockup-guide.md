# Navigation Visual Mockup Guide

**Version:** 1.0  
**Last Updated:** 2025-12-08  
**Purpose:** Visual reference and mockup guide for navigation implementation  
**Related:** [Navigation Design Specifications](./navigation-design-specifications.md)

---

## Overview

This document provides visual mockup guidance and reference diagrams for implementing the FanEngagement navigation system. Use this alongside the [Navigation Design Specifications](./navigation-design-specifications.md) for complete implementation guidance.

---

## Desktop Navigation Mockup

### Full Layout Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│  Header (1a1a1a dark background)                                   │
│  ┌──────┐  ┌─────────────────────┐         ┌─────────┐ ┌────────┐│
│  │  ☰   │  │ FanEngagement       │         │ Org ▼   │ │ Logout ││
│  └──────┘  └─────────────────────┘         └─────────┘ └────────┘│
├────────┬────────────────────────────────────────────────────────────┤
│ Sidebar│ Main Content Area                                         │
│ (250px)│                                                            │
│ ┌──────┴──────────────────────────┐                                │
│ │  MY ORGANIZATION                │  ┌─────────────────────────┐  │
│ │  Acme Corp                      │  │  Breadcrumb              │  │
│ │  [Org Admin]                    │  │  Home / Org / Detail     │  │
│ ├─────────────────────────────────┤  └─────────────────────────┘  │
│ │                                 │                                │
│ │  USER                           │  Page Title                   │
│ │  • Home                     h   │  ───────────────              │
│ │  • My Account               a   │                                │
│ │  • My Organizations         o   │  Page content goes here...    │
│ │                                 │                                │
│ │  ORGANIZATION                   │                                │
│ │  • Overview                 g   │                                │
│ │  • Memberships              m   │                                │
│ │  • Share Types              s   │                                │
│ │  • Proposals                p   │                                │
│ │  • Webhook Events           w   │                                │
│ │                                 │                                │
│ │  ADMINISTRATION                 │                                │
│ │  • Platform Overview        d   │                                │
│ │  • Organizations            o   │                                │
│ │  • Users                    u   │                                │
│ │                                 │                                │
│ ├─────────────────────────────────┤                                │
│ │  ← Home                         │                                │
│ └─────────────────────────────────┘                                │
└────────────────────────────────────────────────────────────────────┘

Dimensions:
- Header Height: ~60px
- Sidebar Width: 250px
- Main Content: Flex-grow to fill remaining space
```

### Navigation Link States (Desktop Sidebar)

**Default State:**
```
│  • Link Text                             │
   └─ Text: #ddd, Weight: 500
   └─ Border-left: 3px transparent
   └─ Padding: 12px 24px
```

**Hover State:**
```
│  • Link Text                             │
   └─ Background: #333 (lighter)
   └─ Text: white
   └─ Border-left: 3px solid #007bff
   └─ Cursor: pointer
```

**Active State:**
```
│  • Current Page                          │
   └─ Background: #333
   └─ Text: white, Weight: 600 (bold)
   └─ Border-left: 3px solid #007bff
```

**With Keyboard Shortcut:**
```
│  • Link Text                      [Cmd+H]│
   └─ Shortcut: monospace, 11px, #888
   └─ Shortcut bg: rgba(255,255,255,0.05)
   └─ Shortcut border: 1px rgba(255,255,255,0.1)
   └─ Shortcut padding: 2px 6px
```

### Organization Info Display

```
┌─────────────────────────────────┐
│  MY ORGANIZATION                │  ← Section label (12px, uppercase, #888)
│  Acme Corporation               │  ← Org name (14px, weight 600, white)
│  [Org Admin]                    │  ← Role badge (blue bg #007bff)
└─────────────────────────────────┘
    Border-bottom: 1px solid #444
```

---

## Mobile Navigation Mockup

### Mobile Header (Collapsed State)

```
┌─────────────────────────────────────────┐
│  [☰]  FanEngagement        [Org ▼] [X] │  ← Height: 60px
└─────────────────────────────────────────┘
   44px  Logo/Title           Selectors
   touch
   target
```

### Mobile Drawer (Open State)

```
Backdrop (rgba(0,0,0,0.5))
├────────────────┐
│ ┌──────────────┴──────────────┐
│ │ Nav Menu              [×]   │  ← Header: 60px, close: 44×44px
│ │ ──────────────────────────  │
│ │                             │
│ │ ORGANIZATIONS               │  ← Section (uppercase, 12px, #888)
│ │ ┌─────────────────────────┐ │
│ │ │ Acme Corp [Admin]    ✓  │ │  ← 44px min height
│ │ └─────────────────────────┘ │
│ │ ┌─────────────────────────┐ │
│ │ │ Beta Inc [Member]       │ │  ← 44px min height
│ │ └─────────────────────────┘ │
│ │ ──────────────────────────  │
│ │                             │
│ │ USER                        │
│ │ • Home                      │  ← 44px min height
│ │ • My Account                │
│ │ • My Organizations          │
│ │                             │
│ │ ORGANIZATION                │
│ │ • Overview                  │
│ │ • Memberships               │
│ │ • Share Types               │
│ │                             │
│ └─────────────────────────────┘
│        280px width
│        85vw max width
```

### Mobile Organization Button Detail

```
┌─────────────────────────────────────┐
│  Acme Corporation  [Admin]       ✓  │  ← 44px min height
│  └─ Name (flex:1)  └─Badge  └─Check │
│                    (12px)   (20px)  │
│  Padding: 14px 16px                 │
│  Border: 2px rgba(255,255,255,0.1)  │
│  Bg: rgba(255,255,255,0.05)         │
│  Border-radius: 6px                 │
└─────────────────────────────────────┘

Active State (selected org):
┌─────────────────────────────────────┐
│  Acme Corporation  [Admin]       ✓  │
│  Border: 2px solid #007bff          │
│  Bg: rgba(0,123,255,0.2)            │
└─────────────────────────────────────┘
```

---

## Organization Switcher Mockup

### Desktop Dropdown (Closed)

```
┌──────────────────────────────────┐
│  Acme Corporation  [Admin]    ▼  │  ← Button: 200px min width
│  └─ Text         └─ Badge └─Arrow│
│                   (7px)    (7px) │
│  Padding: 8px 12px               │
│  Border: 1px solid #ddd          │
│  Border-radius: 6px              │
└──────────────────────────────────┘
```

### Desktop Dropdown (Open)

```
┌──────────────────────────────────┐
│  Acme Corporation  [Admin]    ▲  │  ← Button (expanded state)
│  Border: 1px solid #007bff       │
│  Box-shadow: 0 0 0 3px blue/0.1  │
└──────────────────────────────────┘
┌──────────────────────────────────┐  ← Dropdown menu (animated)
│  ┌────────────────────────────┐  │     Position: absolute
│  │ Acme Corp [Admin]       ✓  │  │     Top: calc(100% + 4px)
│  └────────────────────────────┘  │     Padding: 8px
│  ┌────────────────────────────┐  │     Border: 1px solid #ddd
│  │ Beta Inc [Member]          │  │     Box-shadow: medium
│  └────────────────────────────┘  │     Z-index: 1000
│  ┌────────────────────────────┐  │
│  │ Gamma LLC [Admin]          │  │  Each option: 44px min height
│  └────────────────────────────┘  │
└──────────────────────────────────┘
   └─ Animation: 150ms ease-out
      from: opacity 0, translateY(-8px)
      to: opacity 1, translateY(0)
```

### Dropdown Option States

**Default:**
```
┌────────────────────────────────┐
│  Organization Name  [Badge]    │  ← Bg: white
│  Padding: 10px 12px            │     44px min height
└────────────────────────────────┘
```

**Hover/Focus:**
```
┌────────────────────────────────┐
│  Organization Name  [Badge]    │  ← Bg: rgba(0,123,255,0.08)
│                                │     Light blue highlight
└────────────────────────────────┘
```

**Active (Selected):**
```
┌────────────────────────────────┐
│  Organization Name  [Badge]  ✓ │  ← Bg: rgba(0,123,255,0.12)
│  Font-weight: 600 (bold)       │     Darker blue highlight
└────────────────────────────────┘
```

---

## Breadcrumb Mockup

### Desktop Breadcrumb

```
Home  /  Organizations  /  Acme Corp  /  Memberships
└──┘    └────────────┘    └────────┘    └──────────┘
 │            │               │              └─ Current (bold, dark)
 │            │               └─ Link (hover: blue, underline)
 │            └─ Link (color: #666, weight: 500)
 └─ Link

Font-size: 14px (0.875rem)
Gap: 8px between items
Margin-bottom: 1.5rem
```

### Mobile Breadcrumb (Very Small Screens <480px)

```
...  /  Acme Corp  /  Memberships
└──┘    └────────┘    └──────────┘
 │           │              └─ Current
 │           └─ Previous
 └─ Ellipsis (first items hidden)

Font-size: 12.8px (0.8rem) reduced
Only last 2 items shown
```

---

## Focus Ring Specifications

### Standard Focus Ring

```
  ┌─────────────────────────┐
 ╱                           ╲  ← 2px solid #0056b3
│   Focused Element           │    Outline-offset: 2px (external)
 ╲                           ╱     Box-shadow: 0 0 0 4px rgba(0,86,179,0.1)
  └─────────────────────────┘

Applied to:
- Navigation links
- Buttons
- Dropdowns
- Interactive elements
```

### Inset Focus Ring (for list items)

```
┌────────────────────────────┐
│ ║ Focused Nav Link         │  ← 2px solid #0056b3
│ ║                          │     Outline-offset: -2px (inset)
└────────────────────────────┘
    └─ Appears inside element boundary
```

---

## Role Badge Specifications

### Badge Color Matrix

| Role      | Background | Text  | Size | Weight | Usage |
|-----------|------------|-------|------|--------|-------|
| Admin     | #007bff    | white | 11px | 600    | Organization switcher, org info |
| Member    | #6c757d    | white | 11px | 600    | Organization switcher, org info |

### Badge Visual Structure

```
┌─────────┐
│  ADMIN  │  ← Padding: 2px 8px (vertical, horizontal)
└─────────┘     Border-radius: 6px
                Text-transform: uppercase
                Letter-spacing: 0.025em
                Font-weight: 600
```

---

## Animation Timing Diagrams

### Mobile Drawer Animation

```
OPEN (300ms ease-out):
─────────────────────────────────────▶
0ms                           300ms
│                              │
├─ Backdrop: opacity 0→1       │
│  (fade-in)                   │
│                              │
├─ Drawer: translateX(-100%→0) │
│  (slide-in from left)        │
└──────────────────────────────┘
```

### Dropdown Animation

```
APPEAR (150ms ease-out):
────────────────────────▶
0ms                150ms
│                   │
├─ Opacity: 0→1     │
├─ TranslateY:      │
│  -8px → 0px       │
└───────────────────┘
```

### Navigation Link Transition

```
HOVER (150ms ease-out):
────────────────────────▶
0ms                150ms
│                   │
├─ Background:      │
│  transparent→#333 │
├─ Color:           │
│  #ddd→white       │
├─ Border:          │
│  transparent→blue │
└───────────────────┘
```

---

## Color Palette Reference

### Semantic Colors

```
┌──────────┬──────────┬─────────────────────────────┐
│ Token    │ Hex      │ Usage                       │
├──────────┼──────────┼─────────────────────────────┤
│ Primary  │ #007bff  │ Active states, links, focus │
│ Primary  │ #0056b3  │ Hover states, focus ring    │
│ Dark     │
├──────────┼──────────┼─────────────────────────────┤
│ Neutral  │ #999     │ Separators, inactive text   │
│ 400      │          │                             │
├──────────┼──────────┼─────────────────────────────┤
│ Neutral  │ #666     │ Secondary text, links       │
│ 600      │          │                             │
├──────────┼──────────┼─────────────────────────────┤
│ Neutral  │ #333     │ Primary text, active bg     │
│ 700      │          │                             │
├──────────┼──────────┼─────────────────────────────┤
│ Elevated │ #2a2a2a  │ Sidebar, drawer background  │
│ Surface  │          │                             │
└──────────┴──────────┴─────────────────────────────┘
```

### Color Contrast Ratios (WCAG AA)

```
Background → Foreground     Ratio    Status
────────────────────────────────────────────
#2a2a2a → white (#fff)      12.63:1  ✓✓✓ AAA
#2a2a2a → light (#ddd)      10.74:1  ✓✓✓ AAA
white → #007bff             4.52:1   ✓✓ AA
white → #666                5.74:1   ✓✓ AA
white → #333                12.63:1  ✓✓✓ AAA
```

---

## Spacing Grid Reference

### Standard Spacing Scale (Base: 4px)

```
0.5rem (8px)   ●────●          spacing-2
0.75rem (12px) ●─────●         spacing-3
1rem (16px)    ●──────●        spacing-4
1.5rem (24px)  ●─────────●     spacing-6

Usage:
- spacing-2: Gaps between inline elements
- spacing-3: Navigation link padding (vertical)
- spacing-4: Standard section spacing
- spacing-6: Large section spacing
```

### Touch Target Sizing

```
Mobile Touch Targets (WCAG 2.1 AAA):

Minimum 44×44px:
┌─────────────┐
│             │  44px
│   Content   │
│             │
└─────────────┘
     44px

Preferred 48×48px:
┌──────────────┐
│              │  48px
│   Content    │
│              │
└──────────────┘
      48px
```

---

## Typography Scale Reference

### Font Size Scale

```
Size     Pixels   Usage
─────────────────────────────────────────
xs       11.2px   Small badges, shortcuts
sm       12px     Section labels
sm       14px     Breadcrumbs, secondary
base     16px     Body text, nav links
lg       18px     Subheadings
xl       20px     Mobile nav title
```

### Font Weight Scale

```
Weight   Value   Usage
─────────────────────────────────────────
regular  400     Body text (if used)
medium   500     Default nav links
semibold 600     Active nav, current page
bold     700     Emphasis, strong labels
```

---

## Responsive Breakpoint Behavior

### Layout Transformations

```
Mobile (<768px):
┌─────────────────┐
│ [☰] Header      │
├─────────────────┤
│                 │
│  Full Width     │
│  Content        │
│                 │
└─────────────────┘

Desktop (≥768px):
┌──────┬──────────┐
│ Side │ Header   │
├──────┼──────────┤
│      │          │
│ Nav  │ Content  │
│ 250px│ Flex     │
│      │          │
└──────┴──────────┘
```

---

## Implementation Checklist

### Desktop Sidebar
- [ ] Fixed 250px width
- [ ] Dark background (#2a2a2a)
- [ ] Organization info display (if org selected)
- [ ] Section labels (uppercase, 12px)
- [ ] Navigation links with keyboard shortcuts
- [ ] 3px left border for active/hover states
- [ ] Smooth transitions (150ms)
- [ ] Focus rings on keyboard navigation

### Mobile Navigation
- [ ] Hamburger button (44×44px minimum)
- [ ] Slide-out drawer (280px, 85vw max)
- [ ] Backdrop overlay (tap to close)
- [ ] Close button (44×44px)
- [ ] Organization switcher section (if multiple orgs)
- [ ] Touch-optimized links (44px min height)
- [ ] Focus trap when open
- [ ] Body scroll lock
- [ ] 300ms slide-in animation

### Organization Switcher
- [ ] Desktop dropdown with role badges
- [ ] Keyboard navigation (arrows, enter, escape)
- [ ] Active organization checkmark
- [ ] Hover/focus states
- [ ] Truncation with tooltip for long names
- [ ] Screen reader announcements
- [ ] 150ms dropdown animation

### Breadcrumbs
- [ ] Flexible layout with wrapping
- [ ] Forward slash separators
- [ ] Link hover states (blue, underline)
- [ ] Current page (bold, dark, aria-current)
- [ ] Responsive truncation (<480px)
- [ ] Focus rings on links

### Accessibility
- [ ] WCAG 2.1 AA color contrast
- [ ] Visible focus indicators
- [ ] ARIA labels and roles
- [ ] Keyboard navigation support
- [ ] Screen reader testing
- [ ] Touch target sizing (44×44px min)

### Animations
- [ ] Respect prefers-reduced-motion
- [ ] Hardware-accelerated transforms
- [ ] Consistent durations (150-300ms)
- [ ] Smooth easing (ease-out, ease-in-out)

---

## Design Tool References

### Recommended Design Tools

1. **Figma** (Preferred)
   - Collaborative design
   - Component library support
   - Developer handoff tools
   - Auto-layout for responsive design

2. **Sketch**
   - Mac-only design tool
   - Symbol library support
   - Plugin ecosystem

3. **Adobe XD**
   - Cross-platform
   - Prototyping capabilities
   - Design system management

### Design File Structure Recommendation

```
FanEngagement-Navigation.fig
├── 📁 Tokens
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   └── Shadows
├── 📁 Components
│   ├── Navigation Link
│   ├── Organization Button
│   ├── Dropdown Option
│   ├── Breadcrumb Item
│   └── Badges
├── 📁 Layouts
│   ├── Desktop Sidebar (1280px)
│   ├── Tablet View (768px)
│   └── Mobile Drawer (375px)
└── 📁 States
    ├── Default
    ├── Hover
    ├── Focus
    ├── Active
    └── Disabled
```

---

## Asset Export Specifications

### Icon Requirements

**Hamburger Menu Icon:**
- Format: SVG or Unicode (☰)
- Size: 24×24px at 1.5rem font-size
- Color: white (#fff)
- Stroke-width: 2px (if SVG)

**Close Icon:**
- Format: SVG or Unicode (×)
- Size: 32×32px at 2rem font-size
- Color: white (#fff)
- Stroke-width: 2px (if SVG)

**Checkmark Icon:**
- Format: Unicode (✓) or SVG
- Size: 20×20px at 1.25rem font-size
- Color: primary-600 (#007bff)

**Dropdown Arrow:**
- Format: Unicode (▼/▲) or SVG
- Size: 11.2×11.2px at 0.7rem font-size
- Color: neutral-600 (#666)

### Screenshot Guidelines

**For Documentation:**
- Format: PNG (lossless)
- Resolution: Actual pixels (1x) for accuracy
- Annotations: Red arrows, blue boxes for callouts
- File naming: `component-state-breakpoint.png`
  - Example: `nav-link-hover-desktop.png`

---

## Feedback and Iteration

### Review Checkpoints

1. **Design Review**
   - Product owner approval of mockups
   - Accessibility lead review of color contrast
   - Frontend team review of feasibility

2. **Implementation Review**
   - Compare built navigation to specifications
   - Verify all interaction states implemented
   - Test responsive behavior at all breakpoints

3. **User Testing**
   - Observe navigation usage patterns
   - Gather feedback on discoverability
   - Test with keyboard and screen reader users

### Change Management

When updating navigation design:
1. Update this mockup guide
2. Update design specifications document
3. Update implementation code
4. Update tests (unit and E2E)
5. Document changes in version history

---

## Additional Resources

### External Inspiration

**Linear.app Navigation:**
- Clean sidebar with subtle hover states
- Keyboard shortcut display
- Minimal decoration, maximum clarity

**Notion Navigation:**
- Collapsible sections
- Clear active states
- Breadcrumb integration

**GitHub Navigation:**
- Organization switcher with search
- Role indicators
- Responsive mobile patterns

### Useful Tools

**Color Contrast Checkers:**
- WebAIM Contrast Checker
- Colorable.jxnblk.com
- Chrome DevTools Lighthouse

**Animation Timing:**
- cubic-bezier.com (easing function visualizer)
- easings.net (easing reference)

**Accessibility:**
- WAVE browser extension
- axe DevTools
- Screen reader testing (NVDA, JAWS, VoiceOver)

---

## Version History

### Version 1.0 - 2025-12-08 (Current)
- Initial visual mockup guide
- Wireframes and state diagrams
- Animation timing references
- Color and spacing specifications
- Touch target guidelines

---

**Maintained by:** Frontend Team & Design Team  
**Related Document:** [Navigation Design Specifications](./navigation-design-specifications.md)  
**For Questions:** Contact frontend team or open an issue
