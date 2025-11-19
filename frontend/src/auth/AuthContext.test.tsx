import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi } from '../api/authApi';
import { vi } from 'vitest';

// Mock the authApi
vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('should start with unauthenticated state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isAdmin).toBe(false);
  });

  it('should set isAdmin to true for Admin role', async () => {
    const mockResponse = {
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'admin@example.com',
        password: 'password',
      });
    });

    expect(result.current.isAdmin).toBe(true);
    expect(result.current.user?.role).toBe('Admin');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should set isAdmin to false for User role', async () => {
    const mockResponse = {
      token: 'user-token',
      userId: 'user-123',
      email: 'user@example.com',
      displayName: 'Regular User',
      role: 'User',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'user@example.com',
        password: 'password',
      });
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.user?.role).toBe('User');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should persist admin status in localStorage', async () => {
    const mockResponse = {
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'admin@example.com',
        password: 'password',
      });
    });

    // Verify data is stored in localStorage
    const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
    expect(storedUser.role).toBe('Admin');

    // Create a new hook instance to verify it loads from localStorage
    const { result: newResult } = renderHook(() => useAuth(), { wrapper });
    expect(newResult.current.isAdmin).toBe(true);
  });

  it('should reset isAdmin on logout', async () => {
    const mockResponse = {
      token: 'admin-token',
      userId: 'admin-123',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
    };

    vi.mocked(authApi.login).mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({
        email: 'admin@example.com',
        password: 'password',
      });
    });

    expect(result.current.isAdmin).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
