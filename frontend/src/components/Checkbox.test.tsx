import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders label, helper, and error with aria wiring', () => {
    render(
      <Checkbox
        label="Accept terms"
        helperText="You must accept the terms"
        error="Required"
        defaultChecked
      />
    );

    const checkbox = screen.getByLabelText(/Accept terms/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(checkbox.getAttribute('aria-invalid')).toBe('true');

    const describedBy = checkbox.getAttribute('aria-describedby');
    expect(describedBy).toBe(`${checkbox.id}-helper ${checkbox.id}-error`);
    expect(screen.getByText('You must accept the terms')).toHaveAttribute('id', `${checkbox.id}-helper`);
    expect(screen.getByRole('alert')).toHaveAttribute('id', `${checkbox.id}-error`);
  });

  it('toggles checked state and respects disabled', async () => {
    const user = userEvent.setup();
    render(<Checkbox label="Subscribe" />);
    const checkbox = screen.getByLabelText('Subscribe') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    await user.click(checkbox);
    expect(checkbox.checked).toBe(true);

    render(<Checkbox label="Disabled checkbox" disabled />);
    expect(screen.getByLabelText('Disabled checkbox')).toBeDisabled();
  });
});
