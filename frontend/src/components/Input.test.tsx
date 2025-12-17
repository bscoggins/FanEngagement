import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders label, helper, and error with proper aria wiring', () => {
    render(
      <Input
        label="Email"
        helperText="We will keep this private."
        error="Required field"
        defaultValue="test@example.com"
      />
    );

    const input = screen.getByLabelText(/Email/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('aria-invalid')).toBe('true');

    const helper = screen.getByText('We will keep this private.');
    const error = screen.getByRole('alert');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBe(`${input.id}-helper ${input.id}-error`);
    expect(helper).toHaveAttribute('id', `${input.id}-helper`);
    expect(error).toHaveAttribute('id', `${input.id}-error`);
  });

  it('supports left and right icons', () => {
    render(<Input label="Search" leftIcon="🔍" rightIcon="↗" />);

    expect(screen.getAllByText('🔍')[0]).toHaveClass('form-field__icon--left');
    expect(screen.getAllByText('↗')[0]).toHaveClass('form-field__icon--right');
  });

  it('respects disabled state', () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('marks required inputs with aria-required', () => {
    render(<Input label="Required field" required />);
    const input = screen.getByLabelText(/Required field/i);
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('auto-generates an id when not provided', async () => {
    const user = userEvent.setup();
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.id).toBeTruthy();
    await user.type(input, 'Jane');
    expect(input).toHaveValue('Jane');
  });
});
