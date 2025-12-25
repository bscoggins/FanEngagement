import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { useScrollHint } from './useScrollHint';

const HookHost: React.FC<{ width: number; scrollWidth: number }> = ({ width, scrollWidth }) => {
  const ref = useScrollHint<HTMLDivElement>();

  React.useLayoutEffect(() => {
    if (ref.current) {
      Object.defineProperty(ref.current, 'clientWidth', { value: width, configurable: true });
      Object.defineProperty(ref.current, 'scrollWidth', { value: scrollWidth, configurable: true });
    }
  }, [width, scrollWidth, ref]);

  return <div data-testid="container" ref={ref} style={{ width }} />;
};

describe('useScrollHint', () => {
  let originalResizeObserver: typeof ResizeObserver | undefined;
  let resizeObserverCallback: ResizeObserverCallback | null = null;
  let observeMock: ReturnType<typeof vi.fn>;
  let disconnectMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    originalResizeObserver = (global as any).ResizeObserver;
    resizeObserverCallback = null;
    observeMock = vi.fn();
    disconnectMock = vi.fn();

    class MockResizeObserver implements ResizeObserver {
      observe = observeMock;
      disconnect = disconnectMock;
      unobserve = vi.fn();
      constructor(cb: ResizeObserverCallback) {
        resizeObserverCallback = cb;
      }
      takeRecords(): ResizeObserverEntry[] {
        return [];
      }
    }

    (global as any).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    vi.useRealTimers();
    (global as any).ResizeObserver = originalResizeObserver;
  });

  it('adds is-scrollable when content overflows', () => {
    render(<HookHost width={100} scrollWidth={200} />);
    const el = screen.getByTestId('container');

    expect(el.classList.contains('is-scrollable')).toBe(true);

    act(() => {
      resizeObserverCallback?.([], [] as any, {} as any);
    });

    expect(el.classList.contains('is-scrollable')).toBe(true);
  });

  it('removes is-scrollable when content fits', () => {
    render(<HookHost width={200} scrollWidth={100} />);
    const el = screen.getByTestId('container');

    expect(el.classList.contains('is-scrollable')).toBe(false);

    act(() => {
      resizeObserverCallback?.([], [] as any, {} as any);
    });

    expect(el.classList.contains('is-scrollable')).toBe(false);
  });

  it('updates on window resize', () => {
    const { rerender } = render(<HookHost width={100} scrollWidth={200} />);
    const el = screen.getByTestId('container');

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(el.classList.contains('is-scrollable')).toBe(true);

    rerender(<HookHost width={200} scrollWidth={100} />);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });
    expect(el.classList.contains('is-scrollable')).toBe(false);
  });

  it('cleans up observers and listeners', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<HookHost width={100} scrollWidth={200} />);
    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('falls back when ResizeObserver is unavailable', () => {
    (global as any).ResizeObserver = undefined;
    const { rerender } = render(<HookHost width={100} scrollWidth={200} />);
    const el = screen.getByTestId('container');

    act(() => {
      vi.runAllTimers();
    });
    expect(el.classList.contains('is-scrollable')).toBe(true);

    // ensure no crash when re-rendering
    rerender(<HookHost width={200} scrollWidth={100} />);
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });
    expect(el.classList.contains('is-scrollable')).toBe(false);
  });
});
