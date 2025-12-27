# Responsive testing checklist

**Version:** 1.0  
**Last Updated:** 2025-12-27  
**Audience:** Frontend engineers, QA, design partners

Use this checklist before merging responsive changes and during release validation so every layout, component, and flow stays consistent across breakpoints and devices.

---

## Breakpoint references

- Follow the shared tokens from [responsive-utilities.md](./responsive-utilities.md):
  - `--bp-sm` 480px (small phones)
  - `--bp-md` 768px (tablets / narrow landscape)
  - `--bp-lg` 1024px (small laptop / large tablet)
  - `--bp-xl` 1280px (desktop baseline)
- Prefer the existing helpers (`show-*-down`, `hide-*-down`, `stack-*`, `responsive-grid`) before adding bespoke media queries.

---

## Device matrix (portrait and landscape)

Prefer real hardware; fall back to emulators/Browser DevTools when devices are unavailable. Verify both orientations on mobile and tablets unless stated otherwise.

| Device | Resolution target (CSS px) | Orientation | Notes |
| --- | --- | --- | --- |
| iPhone SE | 375×667 | Portrait & landscape | Baseline small-screen check; watch nav density and form controls. |
| iPhone 14 Pro | 390×844 | Portrait & landscape | Modern notch device; confirm safe area padding. |
| iPad (10"+) | 768×1024 | Portrait & landscape | Validate split layouts, grids, and multi-column sections. |
| Android phone (Pixel 7 class) | 412×915 | Portrait & landscape | Check scrollbar width and Android font scaling. |
| Android tablet | ~800×1280 | Portrait & landscape | Ensure responsive grids collapse gracefully. |
| Desktop | ≥1280px | Landscape | Validate full nav shell and expanded tables/cards. |

---

## How to run the checklist

1. Pick the devices above (real first, BrowserStack/DevTools if needed).  
2. Test critical flows at `--bp-sm`, `--bp-md`, `--bp-lg`, and `--bp-xl` breakpoints.  
3. Capture screenshots for regressions and link them in the PR/QA ticket.

---

## Scenario checklist

### Navigation and shell
- [ ] Global header/sidebars stay visible or collapse into the mobile pattern (`show-*-down` / `hide-*-down` helpers).
- [ ] Org switcher and user menus remain reachable via touch (44px min target) and keyboard.
- [ ] Sticky elements do not overlap page content when toolbars wrap on small widths.
- [ ] Safe area insets respected on devices with notches (no clipped icons/text).

### Page layout and sections
- [ ] Grids using `responsive-grid` collapse cleanly without overflow; cards maintain minimum width tokens.
- [ ] Sections keep consistent vertical rhythm using spacing tokens (no compressed whitespace on landscape phones).
- [ ] Long headings and breadcrumbs wrap without causing horizontal scroll.

### Forms
- [ ] Inputs, selects, and buttons stay at least 44px tall; focus rings remain visible against the theme.
- [ ] Inline validation and helper text wrap without pushing fields off-screen.
- [ ] Multi-column forms stack vertically at `--bp-md` and below without misaligned labels.
- [ ] Sticky CTA bars (e.g., save/cancel) do not cover form fields when the mobile keyboard is open.

### Tables and data grids
- [ ] Horizontal scroll appears without clipping columns; pinned columns remain visible.
- [ ] Numeric and status columns stay readable at `--bp-sm` (consider hiding non-critical columns via responsive utilities).
- [ ] Row actions stay reachable via touch and keyboard; overflow menus remain within the viewport.

### Modals and overlays
- [ ] Modals fit within the viewport on `--bp-sm`; content scrolls inside the modal, not the page.
- [ ] Focus is trapped and returns to the trigger after close across orientations.
- [ ] Mobile keyboards do not push buttons off-screen; sticky footers remain visible.

### Media (images, charts, illustrations)
- [ ] Media scales fluidly without stretching; respect intrinsic aspect ratios.
- [ ] Captions/legends wrap and stay associated with their media.
- [ ] Lazy-loaded images and skeletons do not cause layout shift when resized.

---

## Tooling guidance

### Browser DevTools (fastest for breakpoints/emulation)
- Open responsive mode, set the device presets above, and verify both portrait and landscape.
- Toggle throttling to catch layout flashes during slow loads.
- Use the “Show rulers”/“Layout shift” overlays to spot overflow and CLS issues.

### BrowserStack or similar device cloud
- Use for cross-browser/device coverage (Safari, Chrome, Firefox) when hardware is unavailable.
- Capture screenshots for regressions and attach to QA tickets.
- Validate hardware-specific quirks (viewport height on iOS Safari, Android scrollbars).

### Physical device lab
- Preferred for final verification; catches touch, pixel density, and keyboard overlap issues.
- Test with real network conditions (LTE/Wi-Fi) and system font scaling.
- Confirm accessibility settings (reduced motion, large text) do not break responsive layouts.

---

## Exit criteria

- All device/orientation pairs checked or explicitly noted as “not tested” in the QA notes.
- Screenshots captured for failures with breakpoint/device noted.
- No horizontal scrollbars at `--bp-sm` unless intentionally required for data tables.
