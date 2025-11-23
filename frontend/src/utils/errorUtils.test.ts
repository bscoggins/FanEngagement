import { describe, it, expect } from 'vitest';
import { parseApiError, isUnauthorizedError, isForbiddenError } from './errorUtils';

describe('errorUtils', () => {
  describe('parseApiError', () => {
    it('extracts RFC 7807 detail', () => {
      const error = {
        response: {
          data: {
            type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
            title: 'Bad Request',
            status: 400,
            detail: 'Cannot update proposal in Closed state.',
          },
        },
      };
      expect(parseApiError(error)).toBe('Cannot update proposal in Closed state.');
    });

    it('extracts RFC 7807 title when detail is missing', () => {
      const error = {
        response: {
          data: {
            type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
            title: 'Not Found',
            status: 404,
          },
        },
      };
      expect(parseApiError(error)).toBe('Not Found');
    });

    it('extracts validation errors', () => {
      const error = {
        response: {
          data: {
            type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: {
              Email: ['Email must be a valid email address.'],
              Password: ['Password must be at least 8 characters.'],
            },
          },
        },
      };
      expect(parseApiError(error)).toContain('Email must be a valid email address');
    });

    it('provides default message for 400 status', () => {
      const error = {
        response: {
          status: 400,
          data: {},
        },
      };
      expect(parseApiError(error)).toBe('Invalid request. Please check your input.');
    });

    it('provides default message for 401 status', () => {
      const error = {
        response: {
          status: 401,
          data: {},
        },
      };
      expect(parseApiError(error)).toBe('You are not authenticated. Please log in.');
    });

    it('provides default message for 403 status', () => {
      const error = {
        response: {
          status: 403,
          data: {},
        },
      };
      expect(parseApiError(error)).toBe('You do not have permission to perform this action.');
    });

    it('provides default message for 404 status', () => {
      const error = {
        response: {
          status: 404,
          data: {},
        },
      };
      expect(parseApiError(error)).toBe('The requested resource was not found.');
    });

    it('provides default message for 500 status', () => {
      const error = {
        response: {
          status: 500,
          data: {},
        },
      };
      expect(parseApiError(error)).toBe('A server error occurred. Please try again later.');
    });

    it('handles network errors', () => {
      const error = {
        message: 'Network error',
      };
      expect(parseApiError(error)).toBe('Network error. Please check your connection.');
    });

    it('returns default for unknown errors', () => {
      expect(parseApiError(null)).toBe('An unexpected error occurred');
      expect(parseApiError({})).toBe('An unexpected error occurred');
    });
  });

  describe('isUnauthorizedError', () => {
    it('returns true for 401 errors', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('returns false for non-401 errors', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      expect(isUnauthorizedError(error)).toBe(false);
    });
  });

  describe('isForbiddenError', () => {
    it('returns true for 403 errors', () => {
      const error = {
        response: {
          status: 403,
        },
      };
      expect(isForbiddenError(error)).toBe(true);
    });

    it('returns false for non-403 errors', () => {
      const error = {
        response: {
          status: 401,
        },
      };
      expect(isForbiddenError(error)).toBe(false);
    });
  });
});
