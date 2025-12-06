# Keyboard Shortcuts for Org Admin Navigation

## Overview

Org administrators can use keyboard shortcuts to quickly navigate between organization admin pages without clicking through the sidebar navigation.

## Available Shortcuts

When viewing an organization as an OrgAdmin, the following keyboard shortcuts are available:

| Shortcut | Destination | Description |
|----------|-------------|-------------|
| Ctrl+1 (⌘1 on Mac) | Overview | Organization settings and details |
| Ctrl+2 (⌘2 on Mac) | Memberships | Manage organization members |
| Ctrl+3 (⌘3 on Mac) | Share Types | Configure share types |
| Ctrl+4 (⌘4 on Mac) | Proposals | View and manage proposals |
| Ctrl+5 (⌘5 on Mac) | Webhook Events | Monitor webhook events |
| Ctrl+6 (⌘6 on Mac) | Audit Log | Review audit trail |

## How It Works

1. **Activation**: Shortcuts are only active when:
   - You have an active organization selected
   - You have OrgAdmin role for that organization
   - You're viewing a page within the `/admin` section

2. **Visual Indicators**: Each org admin navigation item in the sidebar displays its keyboard shortcut hint on the right side of the link (e.g., "Ctrl1", "Ctrl2", etc.)

3. **Feedback**: When you use a keyboard shortcut, a brief toast notification appears at the bottom-right of the screen showing the available shortcuts.

4. **Mobile**: Keyboard shortcut hints are hidden on mobile devices (screen width < 768px) since they're not applicable to touch interfaces.

## Accessibility

- **Screen readers**: Keyboard shortcuts are announced via ARIA labels on each navigation link
- **Focus management**: Shortcuts respect keyboard focus and work consistently with tab navigation
- **Reduced motion**: The keyboard help toast respects the `prefers-reduced-motion` setting

## Technical Implementation

The keyboard shortcuts are implemented in `AdminLayout.tsx` using:
- Event listener for `keydown` events on the document
- Detection of Ctrl (Windows/Linux) or Cmd (Mac) modifier keys
- Navigation using React Router's `navigate()` function
- Cleanup on component unmount to prevent memory leaks

## Design Tokens

The keyboard shortcut hints use the following design tokens:
- Background: `rgba(255, 255, 255, 0.05)`
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Active state: `rgba(0, 123, 255, 0.2)` background
- Font: Monospace family with 0.7rem size

## Future Enhancements

Potential improvements for keyboard shortcuts:
- Custom shortcut configuration per user
- Shortcut discovery via `?` key
- Additional shortcuts for global admin actions
- Shortcut conflict detection with browser shortcuts
