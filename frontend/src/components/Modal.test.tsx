import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  let originalBodyOverflow: string;

  beforeEach(() => {
    originalBodyOverflow = document.body.style.overflow;
  });

  afterEach(() => {
    document.body.style.overflow = originalBodyOverflow;
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Test Modal' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    // Click the backdrop (not the modal content)
    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal content is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    const content = screen.getByText('Modal content');
    await user.click(content);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Modal isOpen={true} onClose={onClose}>
        <div>Modal content</div>
      </Modal>
    );

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll when open', () => {
    const { rerender } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe(originalBodyOverflow);

    rerender(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <Modal isOpen={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body.style.overflow).toBe(originalBodyOverflow);
  });

  it('traps focus within modal', async () => {
    const user = userEvent.setup();

    render(
      <Modal isOpen={true} onClose={() => {}} title="Test Modal">
        <button>First button</button>
        <button>Second button</button>
        <button>Third button</button>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    const firstButton = screen.getByRole('button', { name: 'First button' });
    const thirdButton = screen.getByRole('button', { name: 'Third button' });

    // Wait for focus to be set on close button
    await vi.waitFor(() => {
      expect(closeButton).toHaveFocus();
    });

    // Tab to first button
    await user.tab();
    expect(firstButton).toHaveFocus();

    // Tab through to third button
    await user.tab();
    await user.tab();
    expect(thirdButton).toHaveFocus();

    // Tab should wrap to close button
    await user.tab();
    expect(closeButton).toHaveFocus();

    // Shift+Tab should wrap to last button
    await user.tab({ shift: true });
    expect(thirdButton).toHaveFocus();
  });

  it('has proper ARIA attributes', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Accessible Modal">
        <div>Modal content</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('applies custom maxWidth', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} maxWidth="500px">
        <div>Modal content</div>
      </Modal>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ maxWidth: '500px' });
  });
});
