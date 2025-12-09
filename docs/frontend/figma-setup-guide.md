# Figma Design Library Setup Guide

**Version:** 1.0  
**Last Updated:** 2025-12-09  
**Estimated Setup Time:** 2-3 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Process](#setup-process)
4. [Importing Tokens](#importing-tokens)
5. [Creating Components](#creating-components)
6. [Publishing the Library](#publishing-the-library)
7. [Using the Library](#using-the-library)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through creating a Figma design library for the FanEngagement project using the documented design tokens.

### What You'll Create

- **Color Styles:** 50+ color tokens
- **Text Styles:** 20+ typography combinations
- **Effect Styles:** 10 shadow effects
- **Component Library:** Buttons, cards, forms, navigation
- **Documentation:** Usage guidelines and examples

### Expected Outcome

A published Figma library that:
- Matches the CSS design tokens exactly
- Can be used by the design team for new features
- Stays in sync with the codebase
- Includes comprehensive component examples

---

## Prerequisites

### Required

- [ ] Figma account (Pro or Organization plan for publishing)
- [ ] Access to FanEngagement repository
- [ ] Read through `figma-token-mapping.md` and `figma-component-specs.md`

### Optional but Recommended

- [ ] **Figma Tokens Plugin** - For bulk token import
- [ ] **Contrast Plugin** - For accessibility checks
- [ ] **Design Lint Plugin** - For consistency checks
- [ ] **Arc Plugin** - For spacing visualization

### Files You'll Need

Located in `docs/frontend/`:
- `design-tokens.json` - JSON export for plugins
- `design-tokens.csv` - CSV export for spreadsheet import
- `figma-token-mapping.md` - Complete token reference
- `figma-component-specs.md` - Component specifications
- `design-tokens-showcase.html` - Visual reference (open in browser)

---

## Setup Process

### Step 1: Create New Figma File

1. **Open Figma** and click "New Design File"
2. **Name it:** "FanEngagement Design System"
3. **Set up pages:**
   - "🎨 Foundation" (colors, typography, effects)
   - "🧩 Components" (buttons, cards, forms, etc.)
   - "📖 Documentation" (usage examples)
   - "🔬 Playground" (testing area)

### Step 2: Set Up Foundation Page

#### 2.1 Color Palette Frame

1. Create a new frame (F): **1920 × variable height**
2. Name it: "Color Palette"
3. Create sections for each color category:
   - Primary Colors (10 shades)
   - Semantic Colors (Success, Warning, Error, Info - 5 each)
   - Neutral Scale (10 shades)
   - Surface Colors (4 variants)
   - Text Colors (5 variants)
   - Border Colors (4 variants)

#### 2.2 Typography Scale Frame

1. Create a new frame (F): **1920 × variable height**
2. Name it: "Typography"
3. Create text samples for:
   - Headings (H1-H6)
   - Body text (Large, Default, Small)
   - Labels and captions
   - Special text (Code, Kbd, Overline)

#### 2.3 Spacing & Radius Frame

1. Create a new frame (F): **1920 × variable height**
2. Name it: "Spacing & Radius"
3. Visualize spacing scale (0-24)
4. Show radius examples (none, sm, md, lg, xl, 2xl, full)

---

## Importing Tokens

### Option A: Manual Import (Most Reliable)

#### Colors (50+ styles)

**For each color in `figma-token-mapping.md`:**

1. Draw a rectangle (R)
2. Set size: **120 × 80px**
3. Fill with the color value
4. Add text label inside with token name and hex
5. Select rectangle → Fill color → Four-squares icon → "+"
6. Name: `Color/Category/Value` (e.g., `Color/Primary/600`)
7. Arrange in grid (8 columns, gap: 16px)

**Pro Tip:** Use Auto Layout to create a grid that updates automatically.

**Time estimate:** 45-60 minutes

#### Typography (20+ styles)

**For each text style in `figma-token-mapping.md`:**

1. Create text layer (T)
2. Type sample text (e.g., "The quick brown fox...")
3. Set font: System UI or appropriate system font
4. Configure:
   - Font size (from token)
   - Weight (Regular, Medium, Semibold, Bold)
   - Line height (1.2, 1.5, or 1.75)
   - Letter spacing (if specified)
5. Select text → "..." next to style → "+"
6. Name: `Text/Category` (e.g., `Text/H1`, `Text/Body/Default`)
7. Add description with usage notes

**Time estimate:** 30 minutes

#### Effects/Shadows (10 styles)

**For each shadow in `figma-token-mapping.md`:**

1. Draw rectangle (R): **240 × 160px**
2. Fill: white
3. Add drop shadow(s):
   - For multi-layer shadows, add each layer separately
   - Set X, Y, Blur, Spread from spec
   - Color: #000000
   - Opacity: 5%-25% (from spec)
4. Select rectangle → Effects panel → Style icon → "+"
5. Name: `Effect/Shadow/Size` (e.g., `Effect/Shadow/MD`)

**Note:** Some shadows have 2 layers. Add both before creating the style.

**Time estimate:** 15 minutes

### Option B: Using Figma Tokens Plugin (Faster)

1. **Install Figma Tokens Plugin:**
   - Open Figma → Plugins → Browse plugins
   - Search "Figma Tokens"
   - Install "Figma Tokens" by Jan Six

2. **Import JSON:**
   - Open plugin
   - Click "Import" or "Load from File"
   - Select `docs/frontend/design-tokens.json`
   - Review imported tokens
   - Click "Create Styles"

3. **Verify Import:**
   - Check that all colors appear as Color Styles
   - Check that all text settings appear (may need manual text style creation)
   - Verify shadow effects

**Time estimate:** 15-20 minutes + verification time

**Note:** Plugin may not create text styles automatically. You might need to create these manually.

### Option C: Style Dictionary (Advanced)

For automated token transformation:

1. Set up Style Dictionary in the repository
2. Configure transforms for Figma format
3. Generate token files
4. Use Figma API to create styles programmatically

**Time estimate:** 2-3 hours initial setup, 5 minutes per update

---

## Creating Components

### Component Structure

Organize components by category:
- Buttons
- Cards
- Forms
- Badges & Tags
- Navigation
- Modals & Overlays
- Tables

### Example: Primary Button Component

#### Step 1: Create Base Button

1. **Create frame (F):** Name it "Button/Primary"
2. **Set Auto Layout:** Horizontal, gap: 8px
3. **Add padding:** 12px (top/bottom), 16px (left/right)
4. **Add text layer:** "Button Text"
5. **Apply styles:**
   - Fill: `Color/Primary/600`
   - Text: `Text/Label/Default`, `Color/Text/OnPrimary`
   - Effect: `Effect/Shadow/SM`
   - Corner radius: 6px
6. **Set constraints:**
   - Min width: 88px
   - Min height: 44px (add extra padding if needed)

#### Step 2: Create Variants

1. **Select button frame**
2. **Right-click → Create Component**
3. **Right-click → Add Variant**
4. **Create variants for:**
   - **State:** Default, Hover, Focus, Active, Disabled
   - **Size:** Small, Default, Large (optional)
   - **Type:** Primary, Secondary, Outline, Ghost, Danger (optional)

**For each state:**
- **Default:** As created
- **Hover:** Change fill to `Color/Primary/700`, effect to `Effect/Shadow/MD`
- **Focus:** Add outline (2px, `Color/Focus/Ring`, offset 2px)
- **Active:** Fill to `Color/Primary/800`, effect to `Effect/Shadow/Inner`
- **Disabled:** Fill to `Color/Neutral/300`, text to `Color/Text/Tertiary`, no shadow, opacity 0.6

#### Step 3: Add Properties

1. **Select component set**
2. **Configure properties:**
   - State (Default, Hover, Focus, Active, Disabled)
   - Size (if variants exist)
   - Icon (Boolean - show/hide icon)
3. **Add description:**
   ```
   Primary button component
   - Default: Blue background, white text
   - Min size: 88×44px for accessibility
   - See docs/frontend/figma-component-specs.md
   ```

#### Step 4: Document Usage

1. Create instance on Documentation page
2. Show all states side-by-side
3. Add annotations for measurements
4. Include accessibility notes

**Time estimate per component:** 15-30 minutes

### Components to Create

Based on `figma-component-specs.md`:

**Priority 1 (Essential):**
- [ ] Button (Primary, Secondary)
- [ ] Card (Default, Elevated, Outlined)
- [ ] Text Input
- [ ] Checkbox
- [ ] Badge
- [ ] Navigation Link

**Priority 2 (Important):**
- [ ] Select Dropdown
- [ ] Textarea
- [ ] Radio Button
- [ ] Tag (with close button)
- [ ] Modal Dialog
- [ ] Toast Notification

**Priority 3 (Nice to Have):**
- [ ] Table
- [ ] Breadcrumb
- [ ] Pagination
- [ ] Tabs
- [ ] Tooltip
- [ ] Progress Bar

---

## Publishing the Library

### Before Publishing Checklist

- [ ] All color styles created and named correctly
- [ ] All text styles created and tested
- [ ] All effect styles created
- [ ] Core components built with variants
- [ ] Documentation page complete
- [ ] Accessibility notes added
- [ ] File organized and clean
- [ ] No "Untitled" layers

### Publishing Steps

1. **Click file name** in top-left
2. **Select "Publish library..."** (Figma Pro/Organization only)
3. **Add description:**
   ```
   FanEngagement Design System
   Version 1.0
   
   Design tokens and component library for FanEngagement project.
   Synchronized with frontend CSS tokens.
   
   Docs: github.com/bscoggins/FanEngagement/docs/frontend/
   ```
4. **Select what to publish:**
   - ✓ Styles
   - ✓ Components
5. **Click "Publish"**

### Sharing with Team

1. **Click "Share"** button
2. **Add team members:**
   - Designers: Edit access
   - Developers: View access
   - Stakeholders: View access
3. **Send notification** with link and instructions

---

## Using the Library

### For Designers

#### Enabling the Library

1. Open any Figma file
2. Click Assets panel (left sidebar)
3. Click book icon → "Enable library"
4. Select "FanEngagement Design System"
5. Library is now available

#### Using Styles

**Colors:**
1. Select element
2. Click fill color
3. Click style icon (four squares)
4. Choose from `Color/...` styles

**Typography:**
1. Select text
2. Click text style dropdown
3. Choose from `Text/...` styles

**Shadows:**
1. Select element
2. Effects panel → Click style icon
3. Choose from `Effect/Shadow/...` styles

#### Using Components

1. Assets panel → Components
2. Drag component to canvas
3. Configure properties in right panel
4. Detach if customization needed (Cmd/Ctrl + Option/Alt + B)

### For Developers

#### Inspecting Designs

1. Select element in Figma
2. Click "Inspect" tab (right panel)
3. View token names and CSS values
4. Copy token variables for implementation

#### Token Verification

Use `figma-token-mapping.md` to verify:
- Color hex values match
- Font sizes match
- Spacing matches
- Shadows match

#### Reporting Issues

If design doesn't match code:
1. Note the component and token
2. Check `figma-token-mapping.md` for correct value
3. Open issue in repository with details
4. Tag design team and frontend team

---

## Maintenance

### Regular Sync Schedule

**Weekly:**
- Check for new token additions in CSS
- Review component usage in designs
- Address any reported inconsistencies

**Monthly:**
- Full token audit (compare CSS to Figma)
- Update documentation if needed
- Check for deprecated tokens

**Quarterly:**
- Major sync and review
- Update component variants
- Refresh documentation page
- Run accessibility audit

### When CSS Tokens Change

1. **Frontend team notifies design** of token change
2. **Update Figma styles** to match new values
3. **Publish library update** with changelog
4. **Notify team** of update
5. **Update documentation** (`figma-token-mapping.md`)

### When Figma Library Changes

1. **Designer proposes change** with rationale
2. **Frontend team reviews** feasibility
3. **Update CSS tokens** if approved
4. **Update documentation**
5. **Test in browser**
6. **Coordinate release**

### Version Control

**Version naming:**
- `1.0` - Initial release
- `1.1` - Minor updates (new components, small changes)
- `2.0` - Major updates (breaking changes, redesign)

**Changelog format:**
```
## Version 1.1 - 2025-12-15

### Added
- New tooltip component
- Dark mode color variants

### Changed
- Updated primary-600 to #007bff (was #0066ff)
- Increased button padding to 12px (was 10px)

### Fixed
- Corrected shadow-lg blur value
- Fixed text-secondary contrast ratio
```

---

## Troubleshooting

### Common Issues

#### "I can't see the library in other files"

**Solution:**
- Ensure file is published (not just saved)
- Check that team members have access
- Try refreshing Figma (Cmd/Ctrl + R)
- Verify library is enabled in Assets panel

#### "Colors don't match the CSS exactly"

**Solution:**
- Double-check hex values in `figma-token-mapping.md`
- Ensure color space is sRGB (not Display P3)
- Verify no opacity overrides

#### "Text styles aren't applying correctly"

**Solution:**
- Check font family is available on user's system
- Verify line height is set correctly (not auto)
- Ensure letter spacing is configured
- Check for local text overrides

#### "Shadows look different in Figma vs browser"

**Solution:**
- Shadows render differently in Figma vs CSS
- Use `design-tokens-showcase.html` as reference
- Adjust Figma shadow values if needed for visual match
- Document any intentional differences

#### "Components aren't updating after library publish"

**Solution:**
- Check for detached instances (reattach if needed)
- Update library in consuming file (Assets → Updates icon)
- Some properties may need manual update
- Check for overrides that block updates

### Getting Help

**Documentation:**
- `figma-token-mapping.md` - Token reference
- `figma-component-specs.md` - Component specs
- `design-system.md` - Full design system docs

**Team Contacts:**
- Design questions: Contact design lead
- Token questions: Contact frontend team
- Technical issues: Open repository issue
- Figma access: Contact organization admin

---

## Quick Reference

### Essential Token Mapping

| Element | Figma Style | CSS Token |
|---------|-------------|-----------|
| Brand color | Color/Primary/600 | --color-primary-600 |
| Main text | Color/Text/Primary | --color-text-primary |
| Background | Color/Surface/Background | --color-background |
| Card | Color/Surface/Default | --color-surface |
| Body text | Text/Body/Default | --font-size-base |
| Label | Text/Label/Default | --font-size-sm |
| Heading | Text/H2 | --font-size-3xl |
| Button shadow | Effect/Shadow/SM | --shadow-sm |
| Card shadow | Effect/Shadow/MD | --shadow-md |
| Modal shadow | Effect/Shadow/LG | --shadow-lg |

### Common Actions

| Task | Shortcut |
|------|----------|
| Create frame | F |
| Create text | T |
| Create rectangle | R |
| Create component | Cmd/Ctrl + Option/Alt + K |
| Create variant | Right-click → Add Variant |
| Create instance | Cmd/Ctrl + Option/Alt + drag |
| Detach instance | Cmd/Ctrl + Option/Alt + B |

---

## Success Metrics

Your library is ready when:

- [ ] All 50+ color styles match CSS exactly
- [ ] All 20+ text styles are created
- [ ] All 10 shadow effects are created
- [ ] At least 6 core components are built
- [ ] Documentation page is complete
- [ ] Library is published and shared
- [ ] Team members can successfully use it
- [ ] Token values match when inspecting designs

---

## Next Steps

After completing this setup:

1. **Share with team** and gather feedback
2. **Create example screens** using the library
3. **Document any additions** or changes
4. **Set up sync schedule** with frontend team
5. **Plan for dark mode** (future enhancement)
6. **Consider Storybook** integration for component showcase

---

**Questions or Issues?**

- Open issue in repository
- Contact frontend team
- Refer to `figma-token-mapping.md` and `figma-component-specs.md`

---

**Last Updated:** 2025-12-09  
**Maintained By:** Frontend Experience Specialist  
**Next Review:** 2025-03-09
