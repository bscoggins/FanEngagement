import { describe, expect, jest, test } from '@jest/globals';
import { resolveChainId } from '../src/config.js';

describe('config utilities', () => {
  test('resolveChainId falls back to polygon on invalid network', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = resolveChainId('invalid-network');

    expect(result).toBe(137);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
