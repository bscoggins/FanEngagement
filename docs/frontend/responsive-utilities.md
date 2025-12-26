# Responsive utilities and breakpoints

Shared responsive helpers live in `frontend/src/index.css` so every page can opt into consistent breakpoints and layout behaviors without bespoke media queries.

## Breakpoint tokens

Token | Value | Typical use
--- | --- | ---
`--bp-sm` | `480px` | Small phones / compact dialogs
`--bp-md` | `768px` | Tablets / narrow landscape layouts
`--bp-lg` | `1024px` | Small laptop / large tablet
`--bp-xl` | `1280px` | Desktop baseline

> Keep breakpoint math aligned with these tokens when adding component-specific media queries.

## Visibility helpers

- `.hide-sm-down`, `.hide-md-down`, `.hide-lg-down` — hide elements at and below the matching breakpoint.
- `.show-sm-down`, `.show-md-down`, `.show-lg-down` — show only at and below the breakpoint. Set `--responsive-display` on the element (e.g., `inline-flex`) when you need a specific display value.

```tsx
<button
  className="admin-mobile-menu-button show-md-down"
  style={{ '--responsive-display': 'inline-flex' } as React.CSSProperties}
>
  Menu
</button>

<aside className="admin-sidebar hide-md-down">…</aside>
```

## Layout helpers

- `.stack-sm`, `.stack-md`, `.stack-lg` — flex containers that switch to column direction at the respective breakpoint. Useful for header rows that need to stack on mobile.
- `.responsive-grid` — auto-fit grid with shared spacing (`--grid-gap`, default `var(--spacing-4)`) and a configurable minimum column width (`--grid-min`, default `240px`). Convenience tokens: `.grid-min-220`, `.grid-min-260`, `.grid-min-300`.

```tsx
<div className="responsive-grid grid-min-260" data-testid="quick-actions">
  <Card /> 
  <Card />
</div>
```

## Current adoption

- Global layouts (`Layout`, `AdminLayout`, `PlatformAdminLayout`) now use the `show-*-down`, `hide-*-down`, and `stack-md` helpers for navigation shells.
- Admin dashboard grids use `responsive-grid` with `grid-min-*` tokens to collapse cleanly without custom media queries.

When adding new pages or refactoring legacy media queries, reach for these helpers first to keep breakpoints consistent across the app.
