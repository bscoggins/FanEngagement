import { useEffect, useRef } from 'react';

/**
 * Adds/removes the `is-scrollable` class based on horizontal overflow.
 * Useful for showing scroll hint affordances only when needed.
 */
export function useScrollHint<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const scrollable = el.scrollWidth > el.clientWidth;
      if (scrollable) {
        el.classList.add('is-scrollable');
      } else {
        el.classList.remove('is-scrollable');
      }
    };

    update();

    const observerSupported = typeof ResizeObserver === 'function';
    let resizeObserver: ResizeObserver | null = null;
    let fallbackTimeoutId: number | null = null;

    if (observerSupported) {
      resizeObserver = new ResizeObserver(update);
      resizeObserver.observe(el);
    } else {
      // ResizeObserver not available; perform a delayed best-effort update for dynamic layouts.
      fallbackTimeoutId = window.setTimeout(update, 250);
    }

    window.addEventListener('resize', update);

    return () => {
      resizeObserver?.disconnect();
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      window.removeEventListener('resize', update);
    };
  }, []);

  return ref;
}
