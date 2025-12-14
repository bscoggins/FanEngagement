# Modal Component

**Version:** 2.0  
**Status:** Production Ready  
**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Story:** E-008-22 – Modal Component

## Overview

The Modal component is a fully-featured, accessible dialog implementation built with React and TypeScript. It provides a flexible foundation for confirmations, forms, and content overlays while maintaining strict WCAG 2.1 AA compliance and consistency with the FanEngagement design system.

## Features

✅ **5 Size Variants**: sm, md, lg, xl, full  
✅ **Flexible Slots**: header, body, footer with custom content support  
✅ **Configurable Backdrop**: Click-to-close can be enabled/disabled  
✅ **Keyboard Navigation**: Escape to close, Tab for focus trap  
✅ **Focus Management**: Automatic focus on open, restoration on close  
✅ **Focus Trap**: Tab cycles only within modal elements  
✅ **Body Scroll Lock**: Background scrolling prevented when open  
✅ **Animation Options**: Slide-in or fade-in with reduced motion support  
✅ **Full Accessibility**: ARIA dialog, labels, and focus management  
✅ **Design System Integration**: Uses all design tokens from `index.css`  
✅ **TypeScript**: Fully typed with excellent IntelliSense support  
✅ **Dark Mode Support**: Automatic theming  
✅ **Comprehensive Tests**: 26 passing unit tests  
✅ **Storybook Stories**: Interactive examples and documentation

## Quick Start

### Basic Usage

```tsx
import { useState } from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="My Modal"
      >
        <p>This is the modal content.</p>
      </Modal>
    </>
  );
}
```

### Confirmation Dialog

```tsx
const [showConfirm, setShowConfirm] = useState(false);

<Modal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  title="Confirm Deletion"
  size="sm"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowConfirm(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </>
  }
>
  <p>Are you sure you want to delete this item? This action cannot be undone.</p>
</Modal>
```

### Form Modal

```tsx
<Modal
  isOpen={isFormOpen}
  onClose={() => setIsFormOpen(false)}
  title="Create New Item"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleSubmit}>
        Create
      </Button>
    </>
  }
>
  <form>
    <Input label="Name" value={name} onChange={setName} />
    <Input label="Email" value={email} onChange={setEmail} />
  </form>
</Modal>
```

## Component API

### Props

```tsx
interface ModalProps {
  /**
   * Whether the modal is visible
   */
  isOpen: boolean;
  
  /**
   * Callback when modal should close
   */
  onClose: () => void;
  
  /**
   * Modal content
   */
  children: React.ReactNode;
  
  /**
   * Modal title (displays in header)
   */
  title?: string;
  
  /**
   * Custom max width (deprecated - use size instead)
   * @deprecated
   */
  maxWidth?: string;
  
  /**
   * Modal size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  
  /**
   * Whether clicking the backdrop closes the modal
   * @default true
   */
  closeOnBackdropClick?: boolean;
  
  /**
   * Optional custom header content (overrides title)
   */
  header?: React.ReactNode;
  
  /**
   * Optional footer content (usually action buttons)
   */
  footer?: React.ReactNode;
  
  /**
   * Animation variant
   * @default 'slide'
   */
  animation?: 'slide' | 'fade';
}
```

## Size Variants

### Small (sm)
**Max Width**: 400px  
**Use Cases**: Quick confirmations, alerts, simple forms

```tsx
<Modal size="sm" title="Delete Item?" isOpen={isOpen} onClose={onClose}>
  <p>This action cannot be undone.</p>
</Modal>
```

### Medium (md) - Default
**Max Width**: 600px  
**Use Cases**: Standard forms, content dialogs, most use cases

```tsx
<Modal size="md" title="Edit Profile" isOpen={isOpen} onClose={onClose}>
  {/* Form content */}
</Modal>
```

### Large (lg)
**Max Width**: 800px  
**Use Cases**: Detailed forms, content-rich dialogs, multi-section modals

```tsx
<Modal size="lg" title="Settings" isOpen={isOpen} onClose={onClose}>
  {/* Complex settings form */}
</Modal>
```

### Extra Large (xl)
**Max Width**: 1200px  
**Use Cases**: Data tables, galleries, embedded content

```tsx
<Modal size="xl" title="Data Export" isOpen={isOpen} onClose={onClose}>
  {/* Large table or preview */}
</Modal>
```

### Full
**Max Width**: 95% of viewport  
**Max Height**: 90vh  
**Use Cases**: Full-screen experiences, embedded apps, rich editors

```tsx
<Modal size="full" title="Document Editor" isOpen={isOpen} onClose={onClose}>
  {/* Full-screen editor */}
</Modal>
```

## Slots

### Header Slot

The header slot provides three options:

1. **Title String** (Simple)
```tsx
<Modal title="My Modal">
  {/* content */}
</Modal>
```

2. **Custom Header** (Full Control)
```tsx
<Modal 
  header={
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Icon name="settings" />
      <h2>Advanced Settings</h2>
    </div>
  }
>
  {/* content */}
</Modal>
```

3. **No Header** (Close button only)
```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  {/* content without header */}
</Modal>
```

### Body Slot

The body is the main content area. It automatically scrolls if content exceeds the modal height.

```tsx
<Modal title="Long Content">
  <div>
    {/* Any React content */}
    <p>Paragraph 1</p>
    <p>Paragraph 2</p>
    {/* Content scrolls automatically */}
  </div>
</Modal>
```

### Footer Slot

The footer typically contains action buttons, aligned to the right on desktop and stacked on mobile.

```tsx
<Modal
  title="Confirm Action"
  footer={
    <>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </>
  }
>
  <p>Are you sure?</p>
</Modal>
```

**Note**: Footer buttons automatically:
- Stack vertically on mobile (< 768px)
- Display in reverse order on mobile (primary button on top)
- Take full width on mobile

## Behavior

### Close Methods

The modal can be closed in three ways:

1. **Close Button**: Click the × button in the header
2. **Escape Key**: Press Escape on the keyboard
3. **Backdrop Click**: Click outside the modal (configurable)

```tsx
// Disable backdrop close for important modals
<Modal closeOnBackdropClick={false} />
```

### Focus Management

When the modal opens:
1. Previous focus is stored
2. Focus moves to the close button
3. Tab/Shift+Tab cycles through modal elements only
4. Focus cannot escape the modal (focus trap)

When the modal closes:
5. Focus returns to the previously focused element

This ensures keyboard users can navigate efficiently and never lose their place.

### Body Scroll Lock

When the modal is open, the page body cannot scroll. This:
- Prevents confusing scroll behavior
- Ensures users focus on the modal content
- Automatically restores scrolling on close

## Accessibility

The Modal component follows WCAG 2.1 AA guidelines:

✅ **ARIA Dialog Pattern**: Uses `role="dialog"` and `aria-modal="true"`  
✅ **Keyboard Navigation**: Full support for Tab, Shift+Tab, and Escape  
✅ **Focus Trap**: Tab cycles only through modal elements  
✅ **Focus Management**: Automatic focus on open, restoration on close  
✅ **Screen Reader Support**: Proper labels and ARIA attributes  
✅ **Reduced Motion**: Respects `prefers-reduced-motion` setting  
✅ **Color Contrast**: All text meets WCAG AA standards  
✅ **Focus Indicators**: 2px outlines with proper contrast

### Best Practices

1. **Always provide a title** or custom header for screen readers
2. **Use semantic button order** in footer (cancel first, confirm last)
3. **Test with keyboard only** - ensure all actions are accessible
4. **Provide clear labels** for action buttons
5. **Don't nest modals** - use a single modal at a time
6. **Keep content concise** - modals should be quick interactions

## Animation

### Slide Animation (Default)

Modal slides down from above with fade-in backdrop:

```tsx
<Modal animation="slide">
  {/* content */}
</Modal>
```

**Effect**: Feels like content dropping into view

### Fade Animation

Modal and backdrop both fade in:

```tsx
<Modal animation="fade">
  {/* content */}
</Modal>
```

**Effect**: Smoother, more subtle entrance

### Reduced Motion

Users who prefer reduced motion (OS setting) see no animation. The modal appears instantly.

## Dark Mode

The Modal automatically adapts to dark mode:

- Background changes to `--color-surface-elevated`
- Close button hover uses subtle overlay
- Footer border uses dark theme color

No additional configuration needed!

## Usage Patterns

### Confirmation Dialog

```tsx
const ConfirmDelete: React.FC = () => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    // Perform deletion
    setShowConfirm(false);
  };

  return (
    <>
      <Button variant="danger" onClick={() => setShowConfirm(true)}>
        Delete Item
      </Button>
      
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Deletion"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this item?</p>
        <p><strong>This action cannot be undone.</strong></p>
      </Modal>
    </>
  );
};
```

### Form Dialog

```tsx
const CreateUserModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await api.createUser({ name, email });
      setIsOpen(false);
      // Show success message
    } catch (error) {
      // Show error message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Create User</Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create New User"
        size="md"
        closeOnBackdropClick={false}
        footer={
          <>
            <Button 
              variant="secondary" 
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              Create User
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </Modal>
    </>
  );
};
```

### Information Dialog

```tsx
const InfoModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        Learn More
      </Button>
      
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="About This Feature"
        size="lg"
        footer={
          <Button onClick={() => setIsOpen(false)}>
            Got it
          </Button>
        }
      >
        <div>
          <h3>What is this feature?</h3>
          <p>
            This feature allows you to manage your organization's settings
            and configure advanced options.
          </p>
          
          <h3>How do I use it?</h3>
          <ol>
            <li>Navigate to the settings page</li>
            <li>Click on the feature you want to configure</li>
            <li>Save your changes</li>
          </ol>
        </div>
      </Modal>
    </>
  );
};
```

## Design Tokens Used

The Modal component uses tokens from `index.css`:

### Colors
- `--color-surface` - Modal background
- `--color-surface-elevated` - Dark mode background
- `--color-overlay-dark` - Backdrop (rgba(0, 0, 0, 0.5))
- `--color-overlay-light` - Dark mode hover
- `--color-border-subtle` - Footer border
- `--color-border-dark` - Dark mode footer border
- `--color-text-primary` - Title color
- `--color-text-secondary` - Close button color

### Typography
- `--font-size-2xl` - Title (24px)
- `--font-weight-semibold` - Title weight (600)

### Spacing
- `--spacing-2` through `--spacing-8`
- Consistent padding and gaps

### Effects
- `--shadow-2xl` - Modal elevation shadow
- `--radius-lg` - Modal border radius (8px)
- `--radius-sm` - Close button radius (4px)
- `--duration-normal` - Animation duration (200ms)
- `--ease-out` - Animation easing
- `--focus-ring-color` - Focus outline
- `--focus-ring-shadow` - Focus shadow

## Responsive Design

### Desktop (> 768px)
- Modal centered in viewport
- Size variants apply
- Footer buttons horizontal
- Padding: 32px

### Mobile (≤ 768px)
- Modal takes 95% width
- All sizes become full-width
- Footer buttons stack vertically
- Footer buttons full width
- Primary button on top
- Reduced padding: 24px

## Migration Guide

### From window.confirm()

**Before:**
```tsx
const handleDelete = () => {
  if (window.confirm('Are you sure you want to delete this?')) {
    performDelete();
  }
};
```

**After:**
```tsx
const [showConfirm, setShowConfirm] = useState(false);

const handleDelete = () => {
  performDelete();
  setShowConfirm(false);
};

return (
  <>
    <Button onClick={() => setShowConfirm(true)}>Delete</Button>
    <Modal
      isOpen={showConfirm}
      onClose={() => setShowConfirm(false)}
      title="Confirm Deletion"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => setShowConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </>
      }
    >
      <p>Are you sure you want to delete this?</p>
    </Modal>
  </>
);
```

### Benefits
- ✅ Consistent styling across the app
- ✅ Full accessibility support
- ✅ Custom branding and theming
- ✅ Better mobile experience
- ✅ Focus management
- ✅ Keyboard navigation
- ✅ Screen reader support

### From Old Modal Implementation

If upgrading from the v1 Modal:

**New Features:**
- ✅ Size variants (was only maxWidth)
- ✅ Footer slot (new)
- ✅ Custom header slot (new)
- ✅ Configurable backdrop click (new)
- ✅ Animation variants (new)
- ✅ Dark mode support (new)

**Breaking Changes:**
- `maxWidth` prop deprecated (use `size` instead)
- Footer now requires explicit prop (not part of children)

## Testing

### Unit Tests

26 comprehensive tests covering:
- Open/close behavior
- Size variants
- Animation variants
- Footer slot
- Custom header
- Backdrop click behavior
- Keyboard navigation
- Focus trap
- Body scroll lock
- ARIA attributes
- Accessibility features

Run tests:
```bash
npm test -- Modal.test.tsx
```

### Visual Testing

Open the Storybook stories:
```bash
npm run storybook
```

Navigate to "Components/Overlays/Modal" to see:
- All size variants
- With footer examples
- Custom header example
- Animation variants
- Confirmation dialog pattern
- Long scrollable content
- Interactive form example

## Files

- **Component**: `frontend/src/components/Modal.tsx`
- **Styles**: `frontend/src/components/Modal.css`
- **Tests**: `frontend/src/components/Modal.test.tsx`
- **Stories**: `frontend/src/components/Modal.stories.tsx`
- **Documentation**: This file

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Uses standard CSS custom properties and modern JavaScript features supported in all evergreen browsers.

## Performance

The Modal component is optimized for performance:

- **Conditional Rendering**: Returns `null` when closed (no DOM overhead)
- **Event Listener Management**: Automatically cleans up event listeners
- **Focus Management**: Efficient focus trap implementation
- **Scroll Lock**: Minimal DOM manipulation
- **CSS Animations**: Hardware-accelerated transforms

## Security

- **No XSS Vulnerabilities**: All content is properly escaped by React
- **No innerHTML**: Uses React's safe rendering
- **Backdrop Click Protection**: Prevents accidental closes on important actions

## Contributing

When modifying the Modal component:

1. **Update tests** to cover new functionality
2. **Update Storybook stories** with new examples
3. **Follow design tokens** - don't use hardcoded values
4. **Test accessibility** with keyboard and screen reader
5. **Test all size variants** to ensure consistency
6. **Test on mobile** for responsive behavior
7. **Update this documentation** with new features

## Support

For questions or issues:
- Check the Storybook stories for visual examples
- Review the test file for usage patterns
- Consult the design system documentation
- Reach out to the frontend team

---

**Last Updated**: 2025-12-14  
**Component Version**: 2.0  
**Maintained By**: Frontend Team
