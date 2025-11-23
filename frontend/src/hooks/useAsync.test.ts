import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('executes function immediately by default', async () => {
    const mockFn = vi.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe('test data');
    expect(result.current.error).toBe(null);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('does not execute immediately when immediate is false', () => {
    const mockFn = vi.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockFn, false));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(mockFn).not.toHaveBeenCalled();
  });

  it('can be executed manually', async () => {
    const mockFn = vi.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockFn, false));

    expect(mockFn).not.toHaveBeenCalled();

    result.current.execute();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe('test data');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('handles errors correctly', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    const { result } = renderHook(() => useAsync(mockFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe('Test error');
  });

  it('parses API errors with detail field', async () => {
    const mockFn = vi.fn().mockRejectedValue({
      response: {
        data: {
          detail: 'Cannot update closed proposal',
        },
      },
    });
    
    const { result } = renderHook(() => useAsync(mockFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Cannot update closed proposal');
  });

  it('parses API validation errors', async () => {
    const mockFn = vi.fn().mockRejectedValue({
      response: {
        data: {
          errors: {
            Email: ['Email is required'],
            Password: ['Password is too short'],
          },
        },
      },
    });
    
    const { result } = renderHook(() => useAsync(mockFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Email is required');
  });

  it('handles 404 errors', async () => {
    const mockFn = vi.fn().mockRejectedValue({
      response: {
        status: 404,
      },
    });
    
    const { result } = renderHook(() => useAsync(mockFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('The requested resource was not found.');
  });

  it('can be reset', async () => {
    const mockFn = vi.fn().mockResolvedValue('test data');
    
    const { result } = renderHook(() => useAsync(mockFn));

    await waitFor(() => {
      expect(result.current.data).toBe('test data');
    });

    await act(async () => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
