# Button Component

**Version:** 1.0  
**Status:** Production Ready  
**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Story:** E-008-16 – Button Component Redesign

## Overview

The Button component is a flexible, accessible, and fully-featured button implementation built with React and TypeScript. It supports multiple variants, sizes, states, and icon configurations while maintaining consistency with the FanEngagement design system.

## Features

✅ **5 Variants**: primary, secondary, outline, ghost, danger  
✅ **5 Sizes**: xs, sm, md, lg, xl  
✅ **Complete State Management**: default, hover, focus, active, disabled, loading  
✅ **Icon Support**: left, right, and icon-only configurations  
✅ **Full Accessibility**: ARIA labels, focus rings, keyboard navigation  
✅ **Design System Integration**: Uses all design tokens from `index.css`  
✅ **TypeScript**: Fully typed with excellent IntelliSense support  
✅ **Comprehensive Tests**: 42 passing unit tests  
✅ **Showcase**: Interactive HTML demo of all variants and states

## Quick Start

### Basic Usage

```tsx
import { Button } from '../components/Button';

// Simple primary button
<Button>Click me</Button>

// Submit button with loading state
<Button type="submit" isLoading={isSaving}>
  Save Changes
</Button>

// Danger button for destructive actions
<Button variant="danger" onClick={handleDelete}>
  Delete Account
</Button>
```

### With Icons

```tsx
// Icon on the left (default)
<Button icon="✓">Save</Button>

// Icon on the right
<Button icon="→" iconPosition="right">
  Next
</Button>

// Icon-only button
<Button icon="🔍" iconOnly aria-label="Search">
  Search
</Button>
```

## Component API

### Props

```tsx
interface ButtonProps {
  /**
   * Visual variant of the button
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  
  /**
   * Size of the button
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * Icon to display (can be emoji, SVG, or component)
   */
  icon?: React.ReactNode;
  
  /**
   * Position of the icon relative to text
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';
  
  /**
   * If true, only the icon is shown (no text)
   */
  iconOnly?: boolean;
  
  /**
   * If true, shows loading spinner and disables button
   */
  isLoading?: boolean;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  testId?: string;
  
  /**
   * Makes button full width
   */
  fullWidth?: boolean;
  
  /**
   * Button content (text)
   */
  children?: React.ReactNode;
  
  // Plus all standard HTML button attributes:
  // disabled, type, onClick, onFocus, onBlur, etc.
}
```

## Variants

### Primary
The main call-to-action button. Use for the primary action on a page.

```tsx
<Button variant="primary">Primary Action</Button>
```

**Colors**: Blue background (`--color-primary-600`), white text  
**Use cases**: Submit forms, confirm actions, primary CTAs

### Secondary
Standard secondary actions. Use for less prominent actions.

```tsx
<Button variant="secondary">Secondary Action</Button>
```

**Colors**: Gray background (`--color-neutral-200`), dark text  
**Use cases**: Cancel buttons, alternative actions

### Outline
Subtle button style with border. Use for tertiary actions.

```tsx
<Button variant="outline">Outlined Button</Button>
```

**Colors**: Transparent background, blue border and text  
**Use cases**: Alternative CTAs, complementary actions

### Ghost
Minimal button with no border. Use for subtle interactions.

```tsx
<Button variant="ghost">Ghost Button</Button>
```

**Colors**: Transparent background, gray text  
**Use cases**: Toolbar buttons, icon buttons, subtle actions

### Danger
For destructive actions. Use sparingly and with confirmation.

```tsx
<Button variant="danger">Delete</Button>
```

**Colors**: Red background (`--color-error-600`), white text  
**Use cases**: Delete, remove, destructive operations

## Sizes

| Size | Height | Font Size | Padding | Use Case |
|------|--------|-----------|---------|----------|
| `xs` | 1.5rem (24px) | 12px | 4px 8px | Dense UIs, toolbars |
| `sm` | 2rem (32px) | 14px | 6px 12px | Compact forms, cards |
| `md` | 2.5rem (40px) | 16px | 8px 16px | **Default**, standard forms |
| `lg` | 3rem (48px) | 18px | 12px 20px | Prominent CTAs |
| `xl` | 3.5rem (56px) | 20px | 16px 24px | Hero sections, landing pages |

```tsx
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>  {/* Default */}
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

## States

### Default
Normal, interactive state. Button is enabled and clickable.

### Hover
Elevated shadow, slightly darker color. Automatic on mouse hover.

### Focus
2px outline for keyboard navigation. Automatic on focus via Tab key.

### Active
Pressed appearance with slight translation. Automatic on click/press.

### Disabled
Reduced opacity (60%), cursor shows "not-allowed". User cannot interact.

```tsx
<Button disabled>Disabled Button</Button>
```

### Loading
Shows spinner, disables interaction, sets `aria-busy="true"`. Text remains visible.

```tsx
<Button isLoading>Processing...</Button>
```

**Note**: The loading state preserves the button text (unlike the old pattern that changed text to "Loading..."). This provides better UX as users know what action is in progress.

## Icon Support

### Icon Position

```tsx
// Icon on left (default)
<Button icon="✓">Save</Button>

// Icon on right
<Button icon="→" iconPosition="right">Next</Button>
```

### Icon Only

For icon-only buttons, always provide an `aria-label` for accessibility:

```tsx
<Button icon="🔍" iconOnly aria-label="Search">
  Search
</Button>
```

The text in `children` will be visually hidden but available to screen readers.

### Icon Types

Icons can be:
- **Emojis**: `icon="✓"`
- **SVG elements**: `icon={<SearchIcon />}`
- **Icon components**: `icon={<FaSearch />}`

## Accessibility

The Button component follows WCAG 2.1 AA guidelines:

✅ **Keyboard Navigation**: Full support via Tab, Enter, and Space keys  
✅ **Focus Indicators**: 2px outline with proper color contrast  
✅ **ARIA Attributes**: `aria-busy`, `aria-label`, `aria-hidden` as needed  
✅ **Screen Reader Support**: Semantic HTML, descriptive labels  
✅ **Color Contrast**: All variants meet WCAG AA standards  
✅ **Disabled State**: Visual + programmatic (disabled attribute)

### Best Practices

1. **Always provide meaningful text** or `aria-label` for icon-only buttons
2. **Use the loading state** instead of changing button text
3. **Choose the right variant** for the semantic purpose
4. **Don't rely on color alone** - icons and text provide context
5. **Test with keyboard** - ensure Tab and Enter work as expected

## Usage Examples

### Form Submit Button

```tsx
<form onSubmit={handleSubmit}>
  {/* ... form fields ... */}
  <Button type="submit" isLoading={isSubmitting}>
    Save Changes
  </Button>
</form>
```

### Form Actions (Submit + Cancel)

```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
  <Button type="submit" isLoading={isSaving}>
    Save
  </Button>
  <Link to="/users">
    <Button variant="secondary" type="button">
      Cancel
    </Button>
  </Link>
</div>
```

### Destructive Action with Icon

```tsx
<Button 
  variant="danger" 
  icon="🗑"
  onClick={handleDelete}
  size="sm"
>
  Delete Account
</Button>
```

### Toolbar Icon Buttons

```tsx
<div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
  <Button variant="ghost" icon="B" iconOnly aria-label="Bold" size="sm">
    Bold
  </Button>
  <Button variant="ghost" icon="I" iconOnly aria-label="Italic" size="sm">
    Italic
  </Button>
  <Button variant="ghost" icon="U" iconOnly aria-label="Underline" size="sm">
    Underline
  </Button>
</div>
```

### Call-to-Action

```tsx
<Button 
  variant="primary" 
  size="lg"
  icon="→"
  iconPosition="right"
>
  Get Started
</Button>
```

### Full Width Button

```tsx
<Button variant="primary" fullWidth>
  Continue
</Button>
```

## Design Tokens Used

The Button component uses tokens from `index.css`:

### Colors
- `--color-primary-*` (600, 700, 800)
- `--color-neutral-*` (100-900)
- `--color-error-*` (600, 700)
- `--color-text-*` (primary, inverse, on-primary)

### Typography
- `--font-size-xs` through `--font-size-xl`
- `--font-weight-medium`
- `--line-height-tight`

### Spacing
- `--spacing-1` through `--spacing-6`
- `--spacing-1-5`, `--spacing-2-5` (added)

### Effects
- `--shadow-xs`, `--shadow-sm`, `--shadow-md`
- `--radius-sm`, `--radius-md`, `--radius-lg`
- `--duration-normal`, `--ease-out`
- `--focus-ring-color`

## Migration Guide

### From Old Button Pattern

**Before:**
```tsx
<button
  type="submit"
  disabled={isLoading}
  style={{
    padding: '0.75rem 1.5rem',
    backgroundColor: isLoading ? '#ccc' : '#0066cc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
  }}
>
  {isLoading ? 'Saving...' : 'Save Changes'}
</button>
```

**After:**
```tsx
<Button type="submit" isLoading={isLoading}>
  Save Changes
</Button>
```

### Benefits
- ✅ 80% less code
- ✅ Consistent styling across the app
- ✅ Built-in accessibility
- ✅ Better loading UX (spinner instead of text change)
- ✅ Type safety with TypeScript
- ✅ Responsive design included

## Testing

### Unit Tests

42 comprehensive tests covering:
- All variants and sizes
- All states (default, disabled, loading)
- Icon configurations
- Accessibility features
- Interaction handling
- TypeScript types

Run tests:
```bash
npm test -- Button.test.tsx
```

### Visual Testing

Open the showcase file in a browser:
```
frontend/src/components/Button.showcase.html
```

## Files

- **Component**: `frontend/src/components/Button.tsx`
- **Styles**: `frontend/src/components/Button.css`
- **Tests**: `frontend/src/components/Button.test.tsx`
- **Showcase**: `frontend/src/components/Button.showcase.html`
- **Documentation**: This file

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Uses standard CSS custom properties and modern JavaScript features supported in all evergreen browsers.

## Contributing

When modifying the Button component:

1. **Update tests** to cover new functionality
2. **Update showcase** with new examples
3. **Follow design tokens** - don't use hardcoded values
4. **Test accessibility** with keyboard and screen reader
5. **Test all variants and sizes** to ensure consistency
6. **Update this documentation** with new features

## Support

For questions or issues:
- Check the showcase file for visual examples
- Review the test file for usage patterns
- Consult the design system documentation
- Reach out to the frontend team

---

**Last Updated**: 2025-12-09  
**Component Version**: 1.0  
**Maintained By**: Frontend Team
