import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutOverlay } from './KeyboardShortcutOverlay';

describe('KeyboardShortcutOverlay', () => {
  it('should not render when isOpen is false', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={false} onClose={onClose} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('should display default shortcuts', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Show keyboard shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Focus global search')).toBeInTheDocument();
    expect(screen.getByText('Close overlay or dialog')).toBeInTheDocument();
  });

  it('should close when close button is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText(/close keyboard shortcuts overlay/i);
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close when Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should close when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should not close when modal content is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('should display custom shortcuts when provided', () => {
    const onClose = vi.fn();
    const customShortcuts = [
      { key: 'X', description: 'Custom shortcut 1', category: 'Custom' },
      { key: 'Y', description: 'Custom shortcut 2', category: 'Custom' },
    ];

    render(
      <KeyboardShortcutOverlay
        isOpen={true}
        onClose={onClose}
        shortcuts={customShortcuts}
      />
    );

    expect(screen.getByText('Custom shortcut 1')).toBeInTheDocument();
    expect(screen.getByText('Custom shortcut 2')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('should group shortcuts by category', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Navigation')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutOverlay isOpen={true} onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'keyboard-shortcuts-title');
  });
});
