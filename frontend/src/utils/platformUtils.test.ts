import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isMacPlatform } from './platformUtils';

describe('platformUtils', () => {
  describe('isMacPlatform', () => {
    // Store original navigator properties
    const originalNavigator = global.navigator;
    const originalUserAgent = navigator.userAgent;

    afterEach(() => {
      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it('should return true when userAgentData.platform contains MAC', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: {
            platform: 'macOS',
          },
          platform: 'Win32',
          userAgent: 'Windows',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should return true when userAgentData.platform contains mac (case insensitive)', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: {
            platform: 'MacIntel',
          },
          platform: 'Win32',
          userAgent: 'Windows',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should return false when userAgentData.platform does not contain MAC', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgentData: {
            platform: 'Windows',
          },
          platform: 'Win32',
          userAgent: 'Windows',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(false);
    });

    it('should fallback to navigator.platform when userAgentData is unavailable', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'MacIntel',
          userAgent: 'Windows',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should return false when platform is not Mac and userAgentData unavailable', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          platform: 'Win32',
          userAgent: 'Windows',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(false);
    });

    it('should fallback to userAgent when both userAgentData and platform are unavailable', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should detect iPhone as Mac platform', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should detect iPad as Mac platform', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should detect iPod as Mac platform', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_0 like Mac OS X)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(true);
    });

    it('should return false for Windows userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(false);
    });

    it('should return false for Linux userAgent', () => {
      Object.defineProperty(global, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (X11; Linux x86_64)',
        },
        writable: true,
        configurable: true,
      });

      expect(isMacPlatform()).toBe(false);
    });
  });
});
