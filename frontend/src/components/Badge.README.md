# Badge Component

A versatile badge component for displaying status indicators and labels in the FanEngagement application.

## Features

- **6 semantic variants**: default, success, warning, error, info, neutral
- **3 sizes**: sm, md (default), lg
- **2 shapes**: rounded (default), pill
- **Icon support**: Optional icon before text
- **Dot indicator**: Compact status display
- **Design system tokens**: Uses CSS variables for consistency
- **Dark mode support**: Automatically adapts to theme
- **Accessibility**: Proper ARIA attributes and semantic HTML
- **Responsive**: Works across all breakpoints

## Basic Usage

```tsx
import { Badge } from '../components/Badge';

// Simple badge
<Badge>Default</Badge>

// With variant
<Badge variant="success">Active</Badge>

// With size and shape
<Badge variant="warning" size="sm" shape="pill">Beta</Badge>

// With icon
<Badge variant="info" icon="ℹ️">Information</Badge>

// With dot indicator
<Badge variant="success" size="sm" shape="pill" dot>Online</Badge>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'success' \| 'warning' \| 'error' \| 'info' \| 'neutral'` | `'default'` | Visual variant of the badge |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Size of the badge |
| `shape` | `'rounded' \| 'pill'` | `'rounded'` | Shape of the badge |
| `icon` | `React.ReactNode` | - | Optional icon to display before text |
| `dot` | `boolean` | `false` | Show dot indicator (mutually exclusive with icon) |
| `className` | `string` | - | Additional CSS classes |
| `testId` | `string` | - | Test ID for testing |
| `children` | `React.ReactNode` | - | Badge content (text) |

## Variants

### Default (Primary)
Use for primary actions, default states, or general information.
```tsx
<Badge variant="default">Default</Badge>
```

### Success (Green)
Use for successful operations, active states, or positive feedback.
```tsx
<Badge variant="success">Success</Badge>
<Badge variant="success">Open</Badge>
<Badge variant="success" dot>Online</Badge>
```

### Warning (Yellow/Orange)
Use for warnings, pending states, or items requiring attention.
```tsx
<Badge variant="warning">Warning</Badge>
<Badge variant="warning" icon="⚠️">Caution</Badge>
```

### Error (Red)
Use for errors, failed operations, or critical issues.
```tsx
<Badge variant="error">Error</Badge>
<Badge variant="error">Closed</Badge>
```

### Info (Blue)
Use for informational messages or secondary information.
```tsx
<Badge variant="info">Info</Badge>
<Badge variant="info" icon="ℹ️">New Feature</Badge>
```

### Neutral (Gray)
Use for inactive states, drafts, or neutral information.
```tsx
<Badge variant="neutral">Neutral</Badge>
<Badge variant="neutral">Draft</Badge>
```

## Sizes

### Small (sm)
Compact size for inline use or space-constrained areas.
```tsx
<Badge size="sm">Small Badge</Badge>
```

### Medium (md) - Default
Standard size for most use cases.
```tsx
<Badge size="md">Medium Badge</Badge>
```

### Large (lg)
Larger size for emphasis or prominent displays.
```tsx
<Badge size="lg">Large Badge</Badge>
```

## Shapes

### Rounded (default)
Standard rounded corners (6px border radius).
```tsx
<Badge shape="rounded">Rounded</Badge>
```

### Pill
Fully rounded ends (9999px border radius).
```tsx
<Badge shape="pill">Pill Shape</Badge>
```

## Icon Support

Add optional icons (emoji, text, or SVG) before the badge text:

```tsx
<Badge variant="success" icon="✓">Verified</Badge>
<Badge variant="warning" icon="⚠️">Warning</Badge>
<Badge variant="error" icon="✗">Failed</Badge>
<Badge variant="info" icon="ℹ️">Info</Badge>
<Badge variant="default" icon="🔔">Notification</Badge>
```

## Dot Indicator

Show a compact dot indicator for status displays (commonly used with `pill` shape):

```tsx
<Badge variant="success" size="sm" shape="pill" dot>Online</Badge>
<Badge variant="error" size="sm" shape="pill" dot>Offline</Badge>
<Badge variant="warning" size="sm" shape="pill" dot>Away</Badge>
<Badge variant="neutral" size="sm" shape="pill" dot>Inactive</Badge>
```

**Note:** Icon takes precedence over dot if both are provided.

## Real-world Examples

### Proposal Status
```tsx
<Badge variant="neutral">Draft</Badge>
<Badge variant="success">Open</Badge>
<Badge variant="error">Closed</Badge>
<Badge variant="default">Finalized</Badge>
```

### User Status
```tsx
<Badge variant="success" size="sm" shape="pill" dot>Active</Badge>
<Badge variant="warning" size="sm" shape="pill" dot>Pending</Badge>
<Badge variant="error" size="sm" shape="pill" dot>Suspended</Badge>
```

### Notification Count
```tsx
<Badge variant="error" size="sm" shape="pill">3</Badge>
<Badge variant="info" size="sm" shape="pill">12</Badge>
<Badge variant="default" size="sm" shape="pill">99+</Badge>
```

### Feature Tags
```tsx
<Badge variant="info" size="sm" shape="pill">New</Badge>
<Badge variant="success" size="sm" shape="pill" icon="✓">Beta</Badge>
<Badge variant="warning" size="sm" shape="pill">Experimental</Badge>
<Badge variant="neutral" size="sm" shape="pill">Deprecated</Badge>
```

## Accessibility

- Uses semantic HTML (`<span>` with appropriate classes)
- Icons and dots have `aria-hidden="true"` to avoid redundant screen reader announcements
- Color is not the only indicator (text labels provide context)
- Proper color contrast ratios for WCAG 2.1 AA compliance
- Support for reduced motion preferences

## Design Tokens

The Badge component uses design system tokens for consistency:

- **Colors**: `--color-primary-*`, `--color-success-*`, `--color-warning-*`, `--color-error-*`, `--color-info-*`, `--color-neutral-*`
- **Spacing**: `--spacing-*`
- **Typography**: `--font-size-*`, `--font-weight-*`, `--line-height-*`
- **Border Radius**: `--radius-*`
- **Transitions**: `--duration-*`, `--ease-*`

## Dark Mode

The Badge component automatically adapts to dark mode using:
- `@media (prefers-color-scheme: dark)` for system preference
- `body.theme-dark` class for manual theme override

Dark mode uses darker color variants (e.g., `--color-success-700` instead of `--color-success-600`).

## Testing

The component includes comprehensive tests covering:
- All variants, sizes, and shapes
- Icon and dot indicator behavior
- Custom className and testId props
- Ref forwarding
- Various combinations

Run tests with:
```bash
npm test -- Badge.test.tsx
```

## Visual Reference

See `Badge.showcase.html` for a comprehensive visual showcase of all badge variants, sizes, shapes, and combinations.

## Migration from Old ProposalStatusBadge

The `ProposalStatusBadge` component has been updated to use the new `Badge` component internally:

**Before:**
```tsx
<ProposalStatusBadge status="Open" />
// Rendered with inline styles
```

**After:**
```tsx
<ProposalStatusBadge status="Open" />
// Now uses Badge component with proper variant mapping:
// Draft → neutral
// Open → success
// Closed → error
// Finalized → default
```

The migration is backward compatible - no changes needed in existing code.
