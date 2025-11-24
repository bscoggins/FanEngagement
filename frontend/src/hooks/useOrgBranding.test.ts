import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOrgBranding } from './useOrgBranding';
import { organizationsApi } from '../api/organizationsApi';

vi.mock('../api/organizationsApi');

describe('useOrgBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default branding when no orgId is provided', async () => {
    const { result } = renderHook(() => useOrgBranding(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.primaryColor).toBe('#0066cc');
    expect(result.current.secondaryColor).toBe('#6c757d');
    expect(result.current.logoUrl).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('fetches and returns organization branding', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      description: 'Test Description',
      createdAt: '2024-01-01T00:00:00Z',
      logoUrl: 'https://example.com/logo.png',
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
    };

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);

    const { result } = renderHook(() => useOrgBranding('org-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.logoUrl).toBe('https://example.com/logo.png');
    expect(result.current.primaryColor).toBe('#ff0000');
    expect(result.current.secondaryColor).toBe('#00ff00');
    expect(result.current.error).toBeUndefined();
  });

  it('returns default colors when organization has no branding set', async () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      description: 'Test Description',
      createdAt: '2024-01-01T00:00:00Z',
    };

    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrg);

    const { result } = renderHook(() => useOrgBranding('org-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.primaryColor).toBe('#0066cc');
    expect(result.current.secondaryColor).toBe('#6c757d');
    expect(result.current.logoUrl).toBeUndefined();
  });

  it('handles errors and returns defaults', async () => {
    vi.mocked(organizationsApi.getById).mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useOrgBranding('org-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.primaryColor).toBe('#0066cc');
    expect(result.current.secondaryColor).toBe('#6c757d');
    expect(result.current.error).toBe('Failed to load branding');
  });
});
