import { describe, expect, jest, test } from '@jest/globals';
import { resolveChainId } from '../src/config.js';

describe('config utilities', () => {
  test('resolveChainId warns and returns undefined on invalid network', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = resolveChainId('invalid-network');

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
