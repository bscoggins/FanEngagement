# Motion Design Guidelines

**Version:** 1.0  
**Last Updated:** 2025-12-24  
**Status:** Authoritative Reference

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [Quick Rules](#quick-rules)
3. [When to Animate](#when-to-animate)
4. [Durations & Easing Tokens](#durations--easing-tokens)
5. [Component Recipes](#component-recipes)
   - [Button Hover / Focus](#button-hover--focus)
   - [Modal Open / Close](#modal-open--close)
   - [Toast Slide](#toast-slide)
   - [Page Transition](#page-transition)
6. [Accessibility & Reduced Motion](#accessibility--reduced-motion)
7. [Implementation Checklist](#implementation-checklist)

---

## Overview

Purpose-built motion keeps the experience responsive, communicates hierarchy, and never distracts from primary tasks. Use these guidelines to keep animation consistent across FanEngagement, translate design intent into tokens, and ensure accessibility.

**Goals**

- Reinforce state changes (hover, focus, submit, success) with quick, lightweight motion.
- Use the shared duration and easing tokens for every transition.
- Prefer opacity and transform-based motion for GPU-friendly performance.
- Respect `prefers-reduced-motion` without losing affordances or feedback.

---

## Quick Rules

- Favor **subtle motion** (≤12px translation, ≤1.05 scale) for UI controls.
- **One idea per animation**: avoid combining large move + scale + color at once.
- Keep **entrances faster than exits** (ease-out for showing, ease-in for leaving).
- Use **tokens only**—no hardcoded durations or cubic-beziers outside design tokens.
- Keep feedback **under 300ms**; anything longer must communicate progress (spinners/skeletons).

---

## When to Animate

- **Hover / Focus:** Communicate interactivity. Use `--duration-fast` with `--ease-out`.
- **Press / Release:** Compress or darken slightly, then return on release; keep under 150ms.
- **State Change (success/error):** Fade/slide small banners or toasts within 200–250ms.
- **Overlays / Modals:** Fade + scale with `--duration-slow` entering, slightly faster exiting.
- **Navigation / Page change:** Fade + slight slide (10–20px) over 200–300ms; pair with skeletons for longer loads.
- **System interruptions (toasts/alerts):** Slide from screen edge; exit mirrors entry direction.

---

## Durations & Easing Tokens

Use the existing transition tokens (defined in `design-tokens.*`):

```css
/* Durations */
--duration-fast: 150ms;   /* Micro interactions: hover, focus */
--duration-normal: 200ms; /* Standard control changes */
--duration-slow: 300ms;   /* Overlays, drawers, page transitions */

/* Easing */
--ease-in: cubic-bezier(0.4, 0, 1, 1);        /* Accelerate in */
--ease-out: cubic-bezier(0, 0, 0.2, 1);       /* Decelerate out */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);  /* Smooth both ways */
```

**Pairings**

- **Enter / highlight:** `--duration-fast` or `--duration-normal` with `--ease-out`.
- **Exit / dismiss:** Same duration with `--ease-in` (or slightly shorter).
- **Continuous movement (carousels, progress):** `--duration-slow` with `--ease-in-out`.

---

## Component Recipes

### Button Hover / Focus

**Behavior:** Slight lift + shadow for hover/focus, quick compress on active press.

```css
.btn {
  transition:
    transform var(--duration-fast) var(--ease-out),
    box-shadow var(--duration-fast) var(--ease-out),
    background-color var(--duration-fast) var(--ease-out);
}

.btn:hover,
.btn:focus-visible {
  transform: translateY(-1px) scale(1.02);
  box-shadow: var(--shadow-md);
}

.btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

@media (prefers-reduced-motion: reduce) {
  .btn {
    transition: none;
    transform: none;
  }
}
```

### Modal Open / Close

**Behavior:** Fade-in overlay, content scales from 96% to 100% with ease-out; closing uses ease-in and slightly faster duration.

```css
.modal-overlay {
  transition: opacity var(--duration-slow) var(--ease-out);
}

.modal {
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
  transform: translateY(8px) scale(0.96);
  opacity: 0;
}

.modal[data-state="open"] {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.modal[data-state="closed"] {
  transition-duration: var(--duration-normal);
  transition-timing-function: var(--ease-in);
}

@media (prefers-reduced-motion: reduce) {
  .modal,
  .modal-overlay {
    transition: none;
    transform: none;
    opacity: 1;
  }
}
```

### Toast Slide

**Behavior:** Slide from the nearest edge with slight fade; exit reverses direction.

```css
.toast {
  transition:
    transform var(--duration-normal) var(--ease-out),
    opacity var(--duration-normal) var(--ease-out);
  transform: translateY(16px);
  opacity: 0;
}

.toast[data-state="open"] {
  transform: translateY(0);
  opacity: 1;
}

.toast[data-state="closed"] {
  transition-timing-function: var(--ease-in);
  transform: translateY(16px);
  opacity: 0;
}
```

### Page Transition

**Behavior:** Fade + 12px translate. Keep under 300ms; pair with skeletons or progress for loads >500ms.

```css
.page-enter {
  opacity: 0;
  transform: translateY(12px);
}

.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition:
    opacity var(--duration-slow) var(--ease-out),
    transform var(--duration-slow) var(--ease-out);
}

.page-exit {
  opacity: 1;
  transform: translateY(0);
}

.page-exit-active {
  opacity: 0;
  transform: translateY(-8px);
  transition:
    opacity var(--duration-normal) var(--ease-in),
    transform var(--duration-normal) var(--ease-in);
}
```

---

## Accessibility & Reduced Motion

- Always wrap motion overrides in `@media (prefers-reduced-motion: reduce)`:
  - Disable non-essential transitions (`transition: none; animation: none;`).
  - Preserve state feedback with instantaneous color/border changes.
- Avoid large parallax, continuous panning, or auto-looping animations.
- Keep focus indicators visible and stable—never animate outline or focus ring opacity.
- For toasts and alerts, include `role="status"` or `aria-live="polite"` so users relying on assistive tech receive updates without extra motion.
- For long-running actions, switch to **progress indicators** (skeletons/spinners) instead of extended movement.

---

## Implementation Checklist

- [ ] Uses only tokenized durations and easing (`var(--duration-*)`, `var(--ease-*)`).
- [ ] Enter/exit motion durations are ≤300ms; page changes pair with loading affordances when needed.
- [ ] Interactions rely on opacity/transform (no expensive layout-thrashing properties).
- [ ] `prefers-reduced-motion` path tested: motion removed but feedback preserved.
- [ ] Component-specific recipes followed (button, modal, toast, page transitions).
- [ ] Live regions applied where content changes without focus movement.

