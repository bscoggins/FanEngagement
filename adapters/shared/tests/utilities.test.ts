import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { serializeError } from '../errors.js';
import { createPostHandler } from '../http.js';

describe('Shared Adapter Utilities', () => {
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

    test('should serialize object to JSON string message', () => {
      const error = { code: 'ERR_001', details: 'Something went wrong' };
      const serialized = serializeError(error);

      expect(serialized).toHaveProperty('message');
      expect(typeof serialized.message).toBe('string');
      // With JSON.stringify, we get proper JSON representation
      expect(serialized.message).toBe(JSON.stringify(error));
      expect(serialized).not.toHaveProperty('stack');
      expect(serialized).not.toHaveProperty('name');
    });

    test('should convert array to JSON string message', () => {
      const error = ['error1', 'error2'];
      const serialized = serializeError(error);

      // With JSON.stringify, arrays are properly serialized
      expect(serialized).toEqual({ message: JSON.stringify(error) });
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

    test('should handle circular references gracefully', () => {
      const circular: any = { prop: 'value' };
      circular.self = circular;

      const serialized = serializeError(circular);

      expect(serialized).toHaveProperty('message');
      expect(typeof serialized.message).toBe('string');
      // Should fallback to String() when JSON.stringify fails
      expect(serialized.message).toBe('[object Object]');
    });
  });

  describe('createPostHandler', () => {
    const schema = z.object({ value: z.string() });
    const buildResponse = jest.fn((result: Record<string, string>, data: Record<string, string>) => result);
    type ExecuteResult = Record<string, string>;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should validate input, execute task, and send response', async () => {
      const execute = jest.fn(async (data: { value: string }): Promise<ExecuteResult> => ({ id: '123', ...data }));
      const onError = jest.fn();
      const handler = createPostHandler({
        schema,
        execute,
        buildResponse,
        status: 202,
        onError,
      });

      const req = { body: { value: 'hello' } } as unknown as Request;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await handler(req, res);

      expect(execute).toHaveBeenCalledWith({ value: 'hello' });
      expect(buildResponse).toHaveBeenCalledWith({ id: '123', value: 'hello' }, { value: 'hello' });
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ id: '123', value: 'hello' });
      expect(onError).not.toHaveBeenCalled();
    });

    test('should call onError when validation fails', async () => {
      const execute = jest.fn(async (_data: { value: string }): Promise<ExecuteResult> => ({ id: 'noop' }));
      const onError = jest.fn();
      const handler = createPostHandler({
        schema,
        execute,
        buildResponse,
        onError,
      });

      const req = { body: {} } as unknown as Request;
      const res = {} as Response;

      await handler(req, res);

      expect(execute).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error), req, res);
    });

    test('should throw when onError handler is missing', () => {
      expect(() =>
        createPostHandler({
          schema,
          execute: async () => ({ id: '123' }),
          buildResponse,
          onError: undefined as unknown as (error: unknown) => void,
        })
      ).toThrow('createPostHandler requires an onError handler');
    });
  });
});
