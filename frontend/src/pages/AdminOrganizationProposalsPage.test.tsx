import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminOrganizationProposalsPage } from './AdminOrganizationProposalsPage';
import { proposalsApi } from '../api/proposalsApi';
import { organizationsApi } from '../api/organizationsApi';
import { AuthProvider } from '../auth/AuthContext';
import type { Proposal, Organization } from '../types/api';

// Mock the APIs
vi.mock('../api/proposalsApi', () => ({
  proposalsApi: {
    getByOrganization: vi.fn(),
    getByOrganizationPaged: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
  },
}));

describe('AdminOrganizationProposalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage for auth
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === 'authToken') {
        return 'test-token';
      }
      if (key === 'authUser') {
        return JSON.stringify({ 
          userId: 'user-1',
          email: 'admin@test.com',
          displayName: 'Admin User',
          role: 'Admin',
          token: 'test-token'
        });
      }
      return null;
    });
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockProposals: Proposal[] = [
    {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'First Proposal',
      description: 'Description of first proposal',
      status: 'Open',
      startAt: '2024-01-01T00:00:00Z',
      endAt: '2024-12-31T23:59:59Z',
      quorumRequirement: 50,
      createdByUserId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'proposal-2',
      organizationId: 'org-1',
      title: 'Second Proposal',
      description: undefined,
      status: 'Draft',
      startAt: undefined,
      endAt: undefined,
      quorumRequirement: undefined,
      createdByUserId: 'user-1',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockPagedProposals = {
    items: mockProposals,
    totalCount: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  const renderPage = (orgId = 'org-1') => {
    return render(
      <AuthProvider>
        <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/proposals`]}>
          <Routes>
            <Route path="/admin/organizations/:orgId/proposals" element={<AdminOrganizationProposalsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );
  };

  it('renders proposals heading', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Proposals')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(() => new Promise(() => {}));
    vi.mocked(proposalsApi.getByOrganizationPaged).mockImplementation(() => new Promise(() => {}));
    
    renderPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('loads and displays proposals', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('First Proposal')).toBeInTheDocument();
    expect(screen.getByText('Second Proposal')).toBeInTheDocument();
    expect(screen.getByText('Description of first proposal')).toBeInTheDocument();
  });

  it('displays empty state when no proposals exist', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/no proposals found/i)).toBeInTheDocument();
    });
  });

  it('displays error message when data fails to load', async () => {
    vi.mocked(organizationsApi.getById).mockRejectedValueOnce(new Error('Network error'));
    vi.mocked(proposalsApi.getByOrganizationPaged).mockRejectedValueOnce(new Error('Network error'));
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load data/i)).toBeInTheDocument();
    });
  });

  it('shows create proposal form when create button clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButtons = screen.getAllByText('Create New Proposal');
    fireEvent.click(createButtons[0]); // Click the button, not the form heading
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
  });

  it('creates a new proposal successfully', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValue(mockPagedProposals);
    vi.mocked(proposalsApi.create).mockResolvedValueOnce(mockProposals[0]);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButtons = screen.getAllByText('Create New Proposal');
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'New Test Proposal' } });
    
    const submitButton = screen.getByText('Create Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(proposalsApi.create).toHaveBeenCalledWith('org-1', expect.objectContaining({
        title: 'New Test Proposal',
        createdByUserId: 'user-1',
      }));
    });
  });

  it('displays error when create fails', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValue(mockPagedProposals);
    vi.mocked(proposalsApi.create).mockRejectedValueOnce({
      response: { data: { Error: 'Invalid data' } }
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButtons = screen.getAllByText('Create New Proposal');
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
    
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'New Test Proposal' } });
    
    const submitButton = screen.getByText('Create Proposal');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid data')).toBeInTheDocument();
    });
  });

  it('cancels create form', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValue(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButtons = screen.getAllByText('Create New Proposal');
    fireEvent.click(createButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByLabelText(/title/i)).not.toBeInTheDocument();
    });
  });

  it('displays status badges correctly', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      // Look for status badges within the proposals, not the filter dropdown
      const openBadge = screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && 
               (element as HTMLElement)?.style.backgroundColor === 'rgb(40, 167, 69)' && 
               content === 'Open';
      });
      const draftBadge = screen.getByText((content, element) => {
        return element?.tagName === 'SPAN' && 
               (element as HTMLElement)?.style.backgroundColor === 'rgb(108, 117, 125)' && 
               content === 'Draft';
      });
      expect(openBadge).toBeInTheDocument();
      expect(draftBadge).toBeInTheDocument();
    });
  });

  it('displays view/edit links for proposals', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(proposalsApi.getByOrganizationPaged).mockResolvedValueOnce(mockPagedProposals);
    
    renderPage();
    
    await waitFor(() => {
      const links = screen.getAllByText('View/Edit');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/admin/organizations/org-1/proposals/proposal-1');
    });
  });
});
