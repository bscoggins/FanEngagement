import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminOrganizationsPage } from './AdminOrganizationsPage';
import { organizationsApi } from '../api/organizationsApi';
import type { Organization } from '../types/api';

// Mock the organizationsApi
vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getAll: vi.fn(),
  },
}));

describe('AdminOrganizationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Test Organization 1',
      description: 'Test description 1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'org-2',
      name: 'Test Organization 2',
      description: undefined,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const renderAdminOrganizationsPage = () => {
    return render(
      <MemoryRouter>
        <AdminOrganizationsPage />
      </MemoryRouter>
    );
  };

  it('renders organization management heading', () => {
    vi.mocked(organizationsApi.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminOrganizationsPage();
    expect(screen.getByText('Organization Management')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getAll).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminOrganizationsPage();
    
    expect(screen.getByText(/loading organizations/i)).toBeInTheDocument();
  });

  it('displays organizations list after loading', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValueOnce(mockOrganizations);
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check that organizations are displayed
    expect(screen.getByText('Test Organization 1')).toBeInTheDocument();
    expect(screen.getByText('Test description 1')).toBeInTheDocument();
    expect(screen.getByText('Test Organization 2')).toBeInTheDocument();
    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('displays action buttons for each organization', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValueOnce(mockOrganizations);
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check Edit links
    const editLinks = screen.getAllByText('Edit');
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/admin/organizations/org-1/edit');
    expect(editLinks[1].closest('a')).toHaveAttribute('href', '/admin/organizations/org-2/edit');

    // Check Members links
    const memberLinks = screen.getAllByText('Members');
    expect(memberLinks).toHaveLength(2);
    expect(memberLinks[0].closest('a')).toHaveAttribute('href', '/admin/organizations/org-1/memberships');

    // Check Share Types links
    const shareTypeLinks = screen.getAllByText('Share Types');
    expect(shareTypeLinks).toHaveLength(2);
    expect(shareTypeLinks[0].closest('a')).toHaveAttribute('href', '/admin/organizations/org-1/share-types');
  });

  it('displays error message when API call fails', async () => {
    vi.mocked(organizationsApi.getAll).mockRejectedValueOnce(new Error('Network error'));
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/failed to load organizations/i)).toBeInTheDocument();
  });

  it('displays empty state when no organizations exist', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValueOnce([]);
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No organizations found.')).toBeInTheDocument();
  });
});
