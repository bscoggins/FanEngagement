import '@testing-library/jest-dom/vitest';
import { afterAll, vi } from 'vitest';

const SUPPRESSED_ERROR_PREFIXES = ['Failed to ', 'Could not '];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// jsdom does not implement scrollIntoView; mock to avoid test failures when components call it
Element.prototype.scrollIntoView = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

console.error = ((...args: Parameters<typeof originalConsoleError>) => {
	const [message] = args;
	if (typeof message === 'string' && SUPPRESSED_ERROR_PREFIXES.some(prefix => message.startsWith(prefix))) {
		return;
	}

	originalConsoleError(...args);
}) as typeof console.error;

console.warn = ((...args: Parameters<typeof originalConsoleWarn>) => {
	const [message] = args;
	if (typeof message === 'string' && SUPPRESSED_ERROR_PREFIXES.some(prefix => message.startsWith(prefix))) {
		return;
	}

	originalConsoleWarn(...args);
}) as typeof console.warn;

afterAll(() => {
	console.error = originalConsoleError;
	console.warn = originalConsoleWarn;
});
