import React from 'react';
import { Dropdown, type DropdownItem } from './Dropdown';

export default {
  title: 'Components/Dropdown',
};

const menuItems: DropdownItem[] = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'settings', label: 'Settings', description: 'Manage preferences', icon: '⚙️' },
  { id: 'divider-1', label: 'divider-1', divider: true },
  { id: 'invite', label: 'Invite teammates', icon: '➕' },
  { id: 'disabled', label: 'Disabled action', disabled: true, icon: '🚫' },
  { id: 'logout', label: 'Logout', icon: '🚪' },
];

export const DefaultDropdown = () => (
  <div style={{ maxWidth: '260px' }}>
    <Dropdown
      label="Actions menu"
      triggerLabel="Open dropdown"
      items={menuItems}
      onSelect={(item) => console.log('Selected', item.id)}
    />
  </div>
);

export const CustomTrigger = () => (
  <Dropdown
    label="User menu"
    items={menuItems}
    placement="bottom-right"
    renderTrigger={({ ref, open, ariaControls, getReferenceProps }) => (
      <button
        type="button"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: '9999px',
          border: '1px solid var(--color-border-default)',
          background: 'var(--color-surface)',
          cursor: 'pointer',
        }}
        {...getReferenceProps({
          ref,
          'aria-expanded': open,
          'aria-controls': ariaControls,
          'aria-haspopup': 'menu',
        })}
      >
        <span
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            background: 'var(--color-primary-100)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          JD
        </span>
        <span>Jordan Developer</span>
        <span aria-hidden="true">▾</span>
      </button>
    )}
  />
);

export const CustomContent = () => (
  <Dropdown
    label="Custom content dropdown"
    triggerLabel="Show custom content"
    placement="bottom-left"
  >
    <div style={{ padding: '0.5rem', maxWidth: '280px' }}>
      <p style={{ marginBottom: '0.5rem' }}>
        You can render any custom content here, including forms or quick actions.
      </p>
      <button type="button" className="dropdown-trigger" style={{ width: '100%' }}>
        Secondary action
      </button>
    </div>
  </Dropdown>
);
