import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';
import { type Toast as ToastModel } from '../contexts/ToastContext';

const createToast = (overrides: Partial<ToastModel> = {}): ToastModel => ({
  id: 'toast-1',
  type: 'success',
  message: 'Operation completed',
  duration: 5000,
  position: 'top-right',
  ...overrides,
});

describe('Toast', () => {
  it('renders svg icon per variant with accent color', () => {
    const { rerender } = render(<Toast toast={createToast({ type: 'success' })} onDismiss={vi.fn()} />);
    const icon = () => screen.getByTestId('toast-icon');

    expect(icon().querySelector('svg')).toBeInTheDocument();
    expect(icon()).toHaveStyle({ color: 'var(--color-success-600)' });

    rerender(<Toast toast={createToast({ type: 'warning' })} onDismiss={vi.fn()} />);
    expect(icon()).toHaveStyle({ color: 'var(--color-warning-700)' });

    rerender(<Toast toast={createToast({ type: 'error' })} onDismiss={vi.fn()} />);
    expect(icon()).toHaveStyle({ color: 'var(--color-error-700)' });

    rerender(<Toast toast={createToast({ type: 'info' })} onDismiss={vi.fn()} />);
    expect(icon()).toHaveStyle({ color: 'var(--color-info-700)' });
  });

  it('animates progress bar toward dismissal', () => {
    vi.useFakeTimers();
    render(<Toast toast={createToast({ duration: 1200 })} onDismiss={vi.fn()} />);

    const progress = screen.getByTestId('toast-progress');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(progress).toHaveStyle({ width: '0%' });
    vi.useRealTimers();
  });

  it('animates progress bar mid-way', () => {
    vi.useFakeTimers();
    render(<Toast toast={createToast({ duration: 1200 })} onDismiss={vi.fn()} />);
    const progress = screen.getByTestId('toast-progress');

    act(() => {
      vi.advanceTimersByTime(600);
    });

    const widthValue = parseFloat(progress.style.width);
    expect(widthValue).toBeGreaterThan(20);
    expect(widthValue).toBeLessThan(80);
    vi.useRealTimers();
  });

  it('hides progress bar when duration is non-positive', () => {
    render(<Toast toast={createToast({ duration: 0 })} onDismiss={vi.fn()} />);
    expect(screen.queryByTestId('toast-progress-track')).toBeNull();
  });

  it('fires dismiss callback on close click', async () => {
    const onDismiss = vi.fn();
    render(<Toast toast={createToast()} onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });

  it('sets slide offsets based on position', () => {
    const { rerender } = render(<Toast toast={createToast({ position: 'top-left' })} onDismiss={vi.fn()} />);
    const toast = () => screen.getByTestId('toast-success');

    expect(toast().style.getPropertyValue('--toast-translate-x')).toBe('-120%');
    expect(toast().style.getPropertyValue('--toast-translate-y')).toBe('0');

    rerender(<Toast toast={createToast({ position: 'bottom-center', id: 'toast-2' })} onDismiss={vi.fn()} />);
    expect(toast().style.getPropertyValue('--toast-translate-x')).toBe('0');
    expect(toast().style.getPropertyValue('--toast-translate-y')).toBe('120%');
  });

  it('announces countdown for screen readers when duration is set', () => {
    vi.useFakeTimers();
    render(<Toast toast={createToast({ duration: 3000 })} onDismiss={vi.fn()} />);
    const srText = screen.getByText(/Dismissing in/i);
    expect(srText).toHaveTextContent('3 seconds');

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(srText).toHaveTextContent('2 seconds');
    vi.useRealTimers();
  });

  it('omits countdown when duration is non-positive', () => {
    render(<Toast toast={createToast({ duration: 0 })} onDismiss={vi.fn()} />);
    expect(screen.queryByText(/Dismissing in/i)).toBeNull();
  });
});
