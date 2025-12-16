import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dropdown, type DropdownItem } from './Dropdown';

const baseItems: DropdownItem[] = [
  { id: 'item-1', label: 'Item One' },
  { id: 'item-2', label: 'Item Two' },
];

describe('Dropdown', () => {
  it('opens and closes on click', () => {
    render(<Dropdown items={baseItems} triggerLabel="Open menu" testId="dropdown" />);

    const trigger = screen.getByText('Open menu');
    fireEvent.click(trigger);

    expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument();
  });

  it('calls onSelect and closes when an item is chosen', () => {
    const onSelect = vi.fn();
    render(<Dropdown items={baseItems} triggerLabel="Select" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Item Two'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-2' }));
    expect(screen.queryByText('Item Two')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation and selection', () => {
    const onSelect = vi.fn();
    render(<Dropdown items={baseItems} triggerLabel="Keyboard" onSelect={onSelect} testId="kbd" />);

    const trigger = screen.getByText('Keyboard');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const firstItem = screen.getAllByRole('menuitem')[0];
    expect(firstItem).toHaveAttribute('data-focused', 'true');

    fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
    const secondItem = screen.getAllByRole('menuitem')[1];
    expect(secondItem).toHaveAttribute('data-focused', 'true');

    fireEvent.keyDown(secondItem, { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-2' }));
  });

  it('does not select disabled items', () => {
    const onSelect = vi.fn();
    const items: DropdownItem[] = [
      { id: 'enabled', label: 'Enabled' },
      { id: 'disabled', label: 'Disabled', disabled: true },
    ];

    render(<Dropdown items={items} triggerLabel="Disabled test" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Disabled test'));
    fireEvent.click(screen.getByText('Disabled'));

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders a custom trigger', () => {
    render(
      <Dropdown
        items={baseItems}
        renderTrigger={({ getReferenceProps, ref, open, ariaControls }) => (
          <button type="button" {...getReferenceProps({ ref, 'aria-controls': ariaControls, 'aria-expanded': open })}>
            Custom Trigger
          </button>
        )}
      />
    );

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('renders dividers', () => {
    const items: DropdownItem[] = [
      { id: 'one', label: 'One' },
      { id: 'div', label: 'Divider', divider: true },
      { id: 'two', label: 'Two' },
    ];

    render(<Dropdown items={items} triggerLabel="Show" />);

    fireEvent.click(screen.getByText('Show'));

    expect(screen.getAllByRole('separator')).toHaveLength(1);
  });

  it('closes on Escape and returns focus to trigger', async () => {
    const user = userEvent.setup();
    render(<Dropdown items={baseItems} triggerLabel="Menu" testId="escape-test" />);

    const trigger = screen.getByRole('button', { name: /menu/i });
    await user.click(trigger);

    expect(screen.getByTestId('escape-test-menu')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByTestId('escape-test-menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
