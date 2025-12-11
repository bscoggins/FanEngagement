# Card Component

A flexible, accessible card component for grouping related content with elevation and interactive states.

## Features

- **Multiple Variants**: Default, interactive (with hover effects), and bordered styles
- **Elevation Levels**: Five shadow levels (none, sm, md, lg, xl) using design system tokens
- **Padding Options**: Compact, default, and spacious spacing
- **Interactive States**: Enhanced hover effects with scale and shadow transitions
- **Accessibility**: Keyboard navigation, ARIA support, and semantic HTML
- **Dark Mode**: Full support for dark theme with appropriate styling
- **Responsive**: Adapts padding for mobile, tablet, and desktop screens
- **Motion**: Respects `prefers-reduced-motion` for accessibility

## Usage

### Basic Card

```tsx
import { Card } from './components/Card';

<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>
```

### Interactive Card

```tsx
<Card variant="interactive" onClick={handleClick}>
  <h3>Clickable Card</h3>
  <p>Click to perform an action</p>
</Card>
```

### Card as Link

```tsx
<Card variant="interactive" href="/details">
  <h3>Navigation Card</h3>
  <p>Navigate to details page</p>
</Card>
```

### Custom Styling

```tsx
<Card
  variant="bordered"
  padding="compact"
  elevation="lg"
  className="custom-class"
>
  <h3>Customized Card</h3>
  <p>With custom props and styling</p>
</Card>
```

## Props

### `variant?: 'default' | 'interactive' | 'bordered'`
Visual variant of the card.
- **default**: Simple card with subtle border (default)
- **interactive**: Enhanced hover effects for clickable cards
- **bordered**: Emphasized border for visual distinction

### `padding?: 'compact' | 'default' | 'spacious'`
Padding size of the card.
- **compact**: Minimal padding (16px)
- **default**: Standard padding (24px, default)
- **spacious**: Extra padding (32px)

### `elevation?: 'none' | 'sm' | 'md' | 'lg' | 'xl'`
Shadow elevation level using design tokens.
- **none**: No shadow
- **sm**: Subtle shadow
- **md**: Standard shadow (default)
- **lg**: Prominent shadow
- **xl**: Maximum shadow

### `onClick?: () => void`
Click handler. Makes the card interactive and keyboard accessible.

### `href?: string`
Link URL. Makes the card a navigation element. Takes precedence over `onClick`.

### `className?: string`
Additional CSS classes to apply.

### `style?: React.CSSProperties`
Inline styles to apply.

### `testId?: string`
Test identifier for automated testing.

### `aria-label?: string`
Accessibility label for screen readers. Recommended for interactive cards without descriptive text.

### `tabIndex?: number`
Custom tab index for keyboard navigation. Defaults to 0 for interactive cards.

### `children?: React.ReactNode`
Card content.

## Variants

### Default
Simple card with subtle border and shadow. Use for static content displays.

```tsx
<Card variant="default">
  <p>Static content</p>
</Card>
```

### Interactive
Enhanced hover effects with scale and shadow transitions. Use for clickable cards.

```tsx
<Card variant="interactive" onClick={handleClick}>
  <p>Click me!</p>
</Card>
```

### Bordered
Emphasized border for stronger visual separation. Use when you need visual distinction.

```tsx
<Card variant="bordered">
  <p>Distinct content</p>
</Card>
```

## Elevation Levels

Cards support five elevation levels using shadow design tokens:

```tsx
<Card elevation="none">No shadow</Card>
<Card elevation="sm">Subtle shadow</Card>
<Card elevation="md">Standard shadow (default)</Card>
<Card elevation="lg">Prominent shadow</Card>
<Card elevation="xl">Maximum shadow</Card>
```

Interactive cards automatically enhance their shadow on hover:
- `sm` → `md`
- `md` → `lg`
- `lg` → `xl`
- `xl` → `2xl`

## Padding Options

Three padding sizes for different content densities:

```tsx
<Card padding="compact">Dense layout</Card>
<Card padding="default">Balanced spacing (default)</Card>
<Card padding="spacious">Extra breathing room</Card>
```

Padding automatically reduces on smaller screens for better mobile UX.

## Accessibility

### Keyboard Navigation

Interactive cards are fully keyboard accessible:
- **Tab**: Focus the card
- **Enter** or **Space**: Activate the card (if `onClick` is provided)

### ARIA Support

```tsx
<Card 
  variant="interactive" 
  onClick={handleAction}
  aria-label="Delete item"
>
  🗑️
</Card>
```

### Semantic HTML

- Interactive cards with `onClick` use `role="button"`
- Cards with `href` render as semantic `<a>` tags
- Focus indicators follow WCAG 2.1 AA guidelines

### Reduced Motion

The component respects `prefers-reduced-motion` settings by disabling transforms and transitions.

## Dark Mode

Cards automatically adapt to dark mode using:
- `@media (prefers-color-scheme: dark)` for system preference
- `body.theme-dark` class for manual theme switching

Dark mode adjustments:
- Background: `var(--color-surface-elevated)`
- Borders: `var(--color-border-dark)`
- Interactive hover: Subtle background lightening

## Examples

### Dashboard Stats Card

```tsx
<Card variant="default" elevation="md">
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <h3>Active Users</h3>
      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>1,234</p>
    </div>
    <div style={{ fontSize: '3rem' }}>👥</div>
  </div>
</Card>
```

### Quick Action Card

```tsx
<Card 
  variant="interactive" 
  onClick={() => navigate('/create')}
  padding="spacious"
  elevation="sm"
>
  <h3>Create New Item</h3>
  <p>Start a new project or document</p>
  <div style={{ marginTop: '1rem', color: 'var(--color-primary-600)' }}>
    Get started →
  </div>
</Card>
```

### Information Panel

```tsx
<Card variant="bordered" padding="default" elevation="none">
  <div style={{ display: 'flex', gap: '1rem' }}>
    <div>ℹ️</div>
    <div>
      <h4>Important Information</h4>
      <p>This action cannot be undone. Please review carefully.</p>
    </div>
  </div>
</Card>
```

### Content Preview Card

```tsx
<Card variant="interactive" href="/article/123" elevation="md">
  <img 
    src="/thumbnail.jpg" 
    alt="Article preview" 
    style={{ width: '100%', borderRadius: '0.5rem', marginBottom: '1rem' }}
  />
  <h3>Article Title</h3>
  <p>Article preview text goes here...</p>
  <div style={{ 
    marginTop: '1rem', 
    fontSize: '0.875rem', 
    color: 'var(--color-text-tertiary)' 
  }}>
    5 min read • Feb 20, 2024
  </div>
</Card>
```

## Design Tokens

The Card component uses the following design system tokens:

### Colors
- `--color-surface`: Card background (light mode)
- `--color-surface-elevated`: Card background (dark mode)
- `--color-border-subtle`: Default border color
- `--color-border-default`: Bordered variant
- `--color-border-dark`: Dark mode borders
- `--color-text-primary`: Primary text color
- `--focus-ring-color`: Focus indicator

### Shadows
- `--shadow-sm`: Small elevation
- `--shadow-md`: Medium elevation (default)
- `--shadow-lg`: Large elevation
- `--shadow-xl`: Extra large elevation
- `--shadow-2xl`: Maximum elevation

### Spacing
- `--spacing-3`: Compact padding (mobile)
- `--spacing-4`: Compact padding
- `--spacing-5`: Default padding (mobile/tablet)
- `--spacing-6`: Default padding
- `--spacing-8`: Spacious padding

### Border Radius
- `--radius-lg`: Card corner radius

### Transitions
- `--duration-normal`: Animation duration (200ms)
- `--ease-out`: Animation easing

## Testing

The component includes comprehensive tests:

```bash
npm test Card.test.tsx
```

Test coverage includes:
- Rendering with all variants
- Padding and elevation options
- Interactive behavior (click, keyboard)
- Link functionality
- Accessibility features
- Prop combinations

## Showcase

View the interactive showcase:

```bash
# Serve the showcase file
npx serve frontend/src/components
# Then open: http://localhost:3000/Card.showcase.html
```

Or open `Card.showcase.html` directly in a browser (may require adjusting CSS paths).

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (uses CSS custom properties)
- Mobile browsers fully supported

## Related Components

- **QuickActionCard**: Specialized card for dashboard quick actions
- **Button**: Interactive button component
- **Badge**: Status indicator component
