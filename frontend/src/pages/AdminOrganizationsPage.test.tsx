import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { AdminOrganizationsPage } from './AdminOrganizationsPage';
import { organizationsApi } from '../api/organizationsApi';
import { NotificationProvider } from '../contexts/NotificationContext';
import type { Organization } from '../types/api';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the organizationsApi
vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getAll: vi.fn(),
    getAllPaged: vi.fn(),
    create: vi.fn(),
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

  const mockPagedOrganizations = {
    items: mockOrganizations,
    totalCount: 2,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  const renderAdminOrganizationsPage = () => {
    return render(
      <NotificationProvider>
        <MemoryRouter>
          <AdminOrganizationsPage />
        </MemoryRouter>
      </NotificationProvider>
    );
  };

  it('renders organization management heading', () => {
    vi.mocked(organizationsApi.getAllPaged).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminOrganizationsPage();
    expect(screen.getByText('Organization Management')).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getAllPaged).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderAdminOrganizationsPage();
    
    expect(screen.getByText(/loading organizations/i)).toBeInTheDocument();
  });

  it('displays organizations list after loading', async () => {
    vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
    
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
    vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
    
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
    vi.mocked(organizationsApi.getAllPaged).mockRejectedValueOnce(new Error('Network error'));
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('displays empty state when no organizations exist', async () => {
    vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    });
    
    renderAdminOrganizationsPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No organizations found.')).toBeInTheDocument();
  });

  describe('Create Organization', () => {
    beforeEach(() => {
      mockNavigate.mockClear();
    });

    it('displays create organization button', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /create organization/i })).toBeInTheDocument();
    });

    it('shows and hides create form when button is clicked', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      const user = userEvent.setup();
      
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Initially form is hidden
      expect(screen.queryByLabelText(/name \*/i)).not.toBeInTheDocument();
      
      // Click create button
      const createButton = screen.getByRole('button', { name: /\+ create organization/i });
      await user.click(createButton);
      
      // Form should be visible
      expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      
      // Click cancel to hide form
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i });
      // Get the cancel button inside the form (the second one)
      const formCancelButton = cancelButtons.find(btn => btn.getAttribute('type') === 'button');
      await user.click(formCancelButton!);
      
      // Form should be hidden again
      await waitFor(() => {
        expect(screen.queryByLabelText(/name \*/i)).not.toBeInTheDocument();
      });
    });

    it('creates organization and navigates to edit page on success', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      const newOrg: Organization = {
        id: 'new-org-id',
        name: 'New Test Org',
        description: 'New test description',
        createdAt: '2024-01-15T10:00:00Z',
      };
      vi.mocked(organizationsApi.create).mockResolvedValueOnce(newOrg);
      
      const user = userEvent.setup();
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Open create form
      const createButton = screen.getByRole('button', { name: /\+ create organization/i });
      await user.click(createButton);
      
      // Fill form
      const nameInput = screen.getByLabelText(/name \*/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      
      await user.type(nameInput, 'New Test Org');
      await user.type(descriptionInput, 'New test description');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /^create organization$/i });
      await user.click(submitButton);
      
      // Verify API was called with correct data
      await waitFor(() => {
        expect(organizationsApi.create).toHaveBeenCalledWith({
          name: 'New Test Org',
          description: 'New test description',
        });
      });
      
      // Verify navigation
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations/new-org-id/edit');
      });
    });

    it('displays error message when create fails', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      vi.mocked(organizationsApi.create).mockRejectedValueOnce(new Error('Failed to create organization'));
      
      const user = userEvent.setup();
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Open create form
      const createButton = screen.getByRole('button', { name: /\+ create organization/i });
      await user.click(createButton);
      
      // Fill and submit form
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.type(nameInput, 'Test Org');
      
      const submitButton = screen.getByRole('button', { name: /^create organization$/i });
      await user.click(submitButton);
      
      // Verify API was called
      await waitFor(() => {
        expect(organizationsApi.create).toHaveBeenCalled();
      });
      
      // Form should still be visible
      expect(screen.getByLabelText(/name \*/i)).toBeInTheDocument();
    });

    it('validates required name field', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      
      const user = userEvent.setup();
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Open create form
      const createButton = screen.getByRole('button', { name: /\+ create organization/i });
      await user.click(createButton);
      
      // Try to submit without filling name (browser validation will prevent this)
      const nameInput = screen.getByLabelText(/name \*/i) as HTMLInputElement;
      expect(nameInput).toBeRequired();
      expect(nameInput.maxLength).toBe(200);
    });

    it('disables form during submission', async () => {
      vi.mocked(organizationsApi.getAllPaged).mockResolvedValueOnce(mockPagedOrganizations);
      
      // Mock create to never resolve to test loading state
      let resolveCreate: (value: Organization) => void;
      const createPromise = new Promise<Organization>((resolve) => {
        resolveCreate = resolve;
      });
      vi.mocked(organizationsApi.create).mockReturnValue(createPromise);
      
      const user = userEvent.setup();
      renderAdminOrganizationsPage();
      
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
      
      // Open create form and fill
      const createButton = screen.getByRole('button', { name: /\+ create organization/i });
      await user.click(createButton);
      
      const nameInput = screen.getByLabelText(/name \*/i);
      await user.type(nameInput, 'Test Org');
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /^create organization$/i });
      await user.click(submitButton);
      
      // Verify loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeInTheDocument();
      });
      
      // Verify form fields are disabled
      expect(nameInput).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
    });
  });
});
