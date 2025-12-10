import '@testing-library/jest-dom/vitest';
import { afterAll } from 'vitest';

const SUPPRESSED_ERROR_PREFIXES = ['Failed to ', 'Could not '];
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

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
