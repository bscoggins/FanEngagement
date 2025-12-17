import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormErrorSummary } from './FormErrorSummary';

describe('FormErrorSummary', () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) =>
      cb(performance.now())
    );
    // jsdom doesn't implement scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    vi.unstubAllGlobals();
  });

  it('renders nothing when there are no errors', () => {
    const { container } = render(<FormErrorSummary errors={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces errors and focuses the first invalid field', async () => {
    const input = document.createElement('input');
    input.id = 'email';
    document.body.appendChild(input);

    render(
      <FormErrorSummary
        errors={[{ fieldId: 'email', message: 'Email is required' }]}
        title="There is a problem"
      />
    );

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByRole('link', { name: /Email is required/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(summary).toHaveFocus();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: /Email is required/i }));
    expect(input).toHaveFocus();

    document.body.removeChild(input);
  });
});
