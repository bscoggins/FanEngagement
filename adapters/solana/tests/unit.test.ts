import { describe, test, expect } from '@jest/globals';
import { PublicKey } from '@solana/web3.js';

// Helper function to test - copied from solana-service.ts
const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return { message: String(error) };
};

describe('Solana Adapter Unit Tests', () => {
  describe('serializeError', () => {
    test('should serialize Error instance with message, stack, and name', () => {
      const error = new Error('Test error message');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message', 'Test error message');
      expect(serialized).toHaveProperty('stack');
      expect(serialized).toHaveProperty('name', 'Error');
      expect(typeof serialized.stack).toBe('string');
      expect(serialized.stack).toContain('Test error message');
    });

    test('should serialize custom Error subclass with correct name', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom error occurred');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message', 'Custom error occurred');
      expect(serialized).toHaveProperty('name', 'CustomError');
      expect(serialized).toHaveProperty('stack');
      expect(typeof serialized.stack).toBe('string');
    });

    test('should convert string to message property', () => {
      const error = 'Simple string error';
      const serialized = serializeError(error);

      expect(serialized).toEqual({ message: 'Simple string error' });
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert number to string message', () => {
      const error = 404;
      const serialized = serializeError(error);

      expect(serialized).toEqual({ message: '404' });
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert null to string message', () => {
      const error = null;
      const serialized = serializeError(error);

      expect(serialized).toEqual({ message: 'null' });
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert undefined to string message', () => {
      const error = undefined;
      const serialized = serializeError(error);

      expect(serialized).toEqual({ message: 'undefined' });
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert object to string message', () => {
      const error = { code: 'ERR_001', details: 'Something went wrong' };
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message');
      expect(typeof serialized.message).toBe('string');
      expect(serialized.message).toContain('[object Object]');
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert array to string message', () => {
      const error = ['error1', 'error2'];
      const serialized = serializeError(error);

      expect(serialized).toEqual({ message: 'error1,error2' });
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should not throw exception when serializing Error', () => {
      const error = new Error('Test error');
      expect(() => serializeError(error)).not.toThrow();
    });

    test('should not throw exception when serializing non-Error values', () => {
      expect(() => serializeError('string error')).not.toThrow();
      expect(() => serializeError(123)).not.toThrow();
      expect(() => serializeError(null)).not.toThrow();
      expect(() => serializeError(undefined)).not.toThrow();
      expect(() => serializeError({})).not.toThrow();
      expect(() => serializeError([])).not.toThrow();
    });

    test('should produce consistent format for Error instances', () => {
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      const serialized1 = serializeError(error1);
      const serialized2 = serializeError(error2);

      // Both should have the same structure
      expect(Object.keys(serialized1).sort()).toEqual(['message', 'name', 'stack'].sort());
      expect(Object.keys(serialized2).sort()).toEqual(['message', 'name', 'stack'].sort());
    });

    test('should produce consistent format for non-Error values', () => {
      const error1 = 'string error';
      const error2 = 404;
      const error3 = null;
      
      const serialized1 = serializeError(error1);
      const serialized2 = serializeError(error2);
      const serialized3 = serializeError(error3);

      // All should have only 'message' property
      expect(Object.keys(serialized1)).toEqual(['message']);
      expect(Object.keys(serialized2)).toEqual(['message']);
      expect(Object.keys(serialized3)).toEqual(['message']);
    });

    test('should handle Error with empty message', () => {
      const error = new Error('');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message', '');
      expect(serialized).toHaveProperty('stack');
      expect(serialized).toHaveProperty('name', 'Error');
    });

    test('should handle TypeError correctly', () => {
      const error = new TypeError('Type error occurred');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message', 'Type error occurred');
      expect(serialized).toHaveProperty('name', 'TypeError');
      expect(serialized).toHaveProperty('stack');
    });

    test('should handle RangeError correctly', () => {
      const error = new RangeError('Range error occurred');
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message', 'Range error occurred');
      expect(serialized).toHaveProperty('name', 'RangeError');
      expect(serialized).toHaveProperty('stack');
    });
  });
  describe('PDA Derivation', () => {
    test('should derive consistent PDA for organization', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const orgIdBuffer = Buffer.from(organizationId.replace(/-/g, ''), 'hex');

      const [pda1, bump1] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), orgIdBuffer],
        programId
      );

      const [pda2, bump2] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), orgIdBuffer],
        programId
      );

      // PDA should be deterministic
      expect(pda1.toBase58()).toBe(pda2.toBase58());
      expect(bump1).toBe(bump2);
      expect(pda1).toBeInstanceOf(PublicKey);
      expect(bump1).toBeGreaterThanOrEqual(0);
      expect(bump1).toBeLessThanOrEqual(255);
    });

    test('should derive different PDAs for different organizations', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      
      const org1Id = '550e8400-e29b-41d4-a716-446655440000';
      const org2Id = '550e8400-e29b-41d4-a716-446655440001';

      const org1Buffer = Buffer.from(org1Id.replace(/-/g, ''), 'hex');
      const org2Buffer = Buffer.from(org2Id.replace(/-/g, ''), 'hex');

      const [pda1] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), org1Buffer],
        programId
      );

      const [pda2] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), org2Buffer],
        programId
      );

      // Different organizations should have different PDAs
      expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });

    test('should derive PDA for proposal', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const proposalId = '660e8400-e29b-41d4-a716-446655440000';
      const proposalBuffer = Buffer.from(proposalId.replace(/-/g, ''), 'hex');

      const [pda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('proposal'), proposalBuffer],
        programId
      );

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    test('should derive PDA for vote', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const voteId = '770e8400-e29b-41d4-a716-446655440000';
      const voteBuffer = Buffer.from(voteId.replace(/-/g, ''), 'hex');

      const [pda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('vote'), voteBuffer],
        programId
      );

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });
  });

  describe('UUID Processing', () => {
    test('should correctly remove hyphens from UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const expected = '550e8400e29b41d4a716446655440000';
      const result = uuid.replace(/-/g, '');
      expect(result).toBe(expected);
    });

    test('should create valid buffer from UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const buffer = Buffer.from(uuid.replace(/-/g, ''), 'hex');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16); // UUID is 16 bytes
    });
  });
});
