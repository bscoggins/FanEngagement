import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
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
  it('renders variant icon', () => {
    render(<Toast toast={createToast({ type: 'warning' })} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('toast-icon')).toHaveTextContent('⚠');
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
});
