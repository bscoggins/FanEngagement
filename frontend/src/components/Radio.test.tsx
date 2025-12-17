import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio } from './Radio';

describe('Radio', () => {
  it('renders with helper and error and proper aria', () => {
    render(
      <Radio
        label="Option A"
        helperText="Helper text"
        error="Error text"
        name="group"
        value="a"
      />
    );

    const radio = screen.getByLabelText(/Option A/i) as HTMLInputElement;
    expect(radio.getAttribute('aria-invalid')).toBe('true');
    const describedBy = radio.getAttribute('aria-describedby');
    expect(describedBy).toBe(`${radio.id}-helper ${radio.id}-error`);
    expect(screen.getByText('Helper text')).toHaveAttribute('id', `${radio.id}-helper`);
    expect(screen.getByRole('alert')).toHaveAttribute('id', `${radio.id}-error`);
  });

  it('supports exclusive selection within the same group and disabled state', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Radio label="A" name="group" value="a" />
        <Radio label="B" name="group" value="b" />
      </>
    );

    const radioA = screen.getByLabelText('A') as HTMLInputElement;
    const radioB = screen.getByLabelText('B') as HTMLInputElement;

    await user.click(radioA);
    expect(radioA.checked).toBe(true);
    expect(radioB.checked).toBe(false);

    await user.click(radioB);
    expect(radioB.checked).toBe(true);
    expect(radioA.checked).toBe(false);

    render(<Radio label="Disabled" name="group2" value="d" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('marks required radios with aria-required', () => {
    render(<Radio label="Choice" name="group3" value="c" required />);
    expect(screen.getByLabelText(/Choice/i)).toHaveAttribute('aria-required', 'true');
  });
});
