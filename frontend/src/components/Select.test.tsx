import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  it('renders label, helper, and error with aria connections', () => {
    render(
      <Select label="Role" helperText="Choose a role" error="Role is required" defaultValue="">
        <option value="">Select</option>
        <option value="admin">Admin</option>
      </Select>
    );

    const select = screen.getByLabelText(/Role/i) as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.getAttribute('aria-invalid')).toBe('true');

    const describedBy = select.getAttribute('aria-describedby');
    expect(describedBy).toBe(`${select.id}-helper ${select.id}-error`);
    expect(screen.getByText('Choose a role')).toHaveAttribute('id', `${select.id}-helper`);
    expect(screen.getByRole('alert')).toHaveAttribute('id', `${select.id}-error`);
  });

  it('supports selection changes and disabled state', async () => {
    const user = userEvent.setup();
    render(
      <Select label="Status" defaultValue="">
        <option value="">All</option>
        <option value="open">Open</option>
      </Select>
    );

    const select = screen.getByLabelText('Status') as HTMLSelectElement;
    await user.selectOptions(select, 'open');
    expect(select).toHaveValue('open');

    render(
      <Select label="Disabled" disabled>
        <option value="x">X</option>
      </Select>
    );
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });
});
