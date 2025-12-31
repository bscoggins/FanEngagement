import { describe, expect, test } from '@jest/globals';
import { redactLogInfoForTest } from '../src/logger.js';

describe('logger redaction', () => {
  test('redacts secrets without throwing when symbols are present', () => {
    const secretSymbol = Symbol('secret');
    const info: any = {
      message: 'test',
      apiKey: 'super-secret',
      nested: { token: 'abc' },
      [Symbol.for('level')]: 'info',
      [secretSymbol]: 'preserve',
    };

    const redacted = redactLogInfoForTest(info) as any;

    expect(redacted?.apiKey).toBe('[REDACTED]');
    expect(redacted?.nested.token).toBe('[REDACTED]');
    expect(redacted?.[secretSymbol]).toBe('preserve');
  });
});
