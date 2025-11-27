import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminOrganizationMembershipsPage } from './AdminOrganizationMembershipsPage';
import { membershipsApi } from '../api/membershipsApi';
import { organizationsApi } from '../api/organizationsApi';
import { usersApi } from '../api/usersApi';
import type { MembershipWithUserDto, Organization, User } from '../types/api';

// Mock the APIs
vi.mock('../api/membershipsApi', () => ({
  membershipsApi: {
    getByOrganizationWithUserDetails: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
  },
}));

vi.mock('../api/usersApi', () => ({
  usersApi: {
    getAll: vi.fn(),
  },
}));

describe('AdminOrganizationMembershipsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockMemberships: MembershipWithUserDto[] = [
    {
      id: 'mem-1',
      organizationId: 'org-1',
      userId: 'user-1',
      userEmail: 'user1@example.com',
      userDisplayName: 'User One',
      role: 'Member',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'mem-2',
      organizationId: 'org-1',
      userId: 'user-2',
      userEmail: 'admin@example.com',
      userDisplayName: 'Admin User',
      role: 'OrgAdmin',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const mockUsers: User[] = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      displayName: 'User One',
      role: 'User',
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'Admin',
      createdAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'user-3',
      email: 'user3@example.com',
      displayName: 'User Three',
      role: 'User',
      createdAt: '2024-01-03T00:00:00Z',
    },
  ];

  const renderPage = (orgId = 'org-1') => {
    return render(
      <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/memberships`]}>
        <Routes>
          <Route path="/admin/organizations/:orgId/memberships" element={<AdminOrganizationMembershipsPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders manage memberships heading', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Memberships')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(() => new Promise(() => {}));
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockImplementation(() => new Promise(() => {}));
    vi.mocked(usersApi.getAll).mockImplementation(() => new Promise(() => {}));
    
    renderPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('loads and displays memberships', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Org Admin')).toBeInTheDocument();
  });

  it('shows add member form when button is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const addButton = screen.getByText('Add Member');
    fireEvent.click(addButton);
    
    expect(screen.getByText('Add New Member')).toBeInTheDocument();
    expect(screen.getByLabelText(/select user/i)).toBeInTheDocument();
  });

  it('successfully adds a membership', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValue(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(membershipsApi.create).mockResolvedValueOnce({
      id: 'mem-3',
      organizationId: 'org-1',
      userId: 'user-3',
      role: 'Member',
      createdAt: '2024-01-03T00:00:00Z',
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const addButton = screen.getByText('Add Member');
    fireEvent.click(addButton);
    
    // Select user
    const userSelect = screen.getByLabelText(/select user/i);
    fireEvent.change(userSelect, { target: { value: 'user-3' } });
    
    // Submit
    const submitButton = screen.getByText('Add Member', { selector: 'button' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(membershipsApi.create).toHaveBeenCalledWith('org-1', {
        userId: 'user-3',
        role: 'Member',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/membership added successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays error when adding duplicate membership', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    vi.mocked(membershipsApi.create).mockRejectedValueOnce({
      response: { status: 400, data: { message: 'User is already a member' } }
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const addButton = screen.getByText('Add Member');
    fireEvent.click(addButton);
    
    // Select user
    const userSelect = screen.getByLabelText(/select user/i);
    fireEvent.change(userSelect, { target: { value: 'user-3' } });
    
    // Submit
    const submitButton = screen.getByText('Add Member', { selector: 'button' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/user is already a member/i)).toBeInTheDocument();
    });
  });

  it('successfully removes a membership', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValue(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValue(mockUsers);
    vi.mocked(membershipsApi.delete).mockResolvedValueOnce(undefined);
    
    // Mock confirm dialog
    window.confirm = vi.fn(() => true);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const removeButtons = screen.getAllByText('Remove');
    fireEvent.click(removeButtons[0]);
    
    await waitFor(() => {
      expect(membershipsApi.delete).toHaveBeenCalledWith('org-1', 'user-1');
    });
    
    await waitFor(() => {
      expect(screen.getByText(/membership removed successfully/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays empty state when no memberships exist', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce([]);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('No members found.')).toBeInTheDocument();
  });

  it('filters available users to exclude current members', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(membershipsApi.getByOrganizationWithUserDetails).mockResolvedValueOnce(mockMemberships);
    vi.mocked(usersApi.getAll).mockResolvedValueOnce(mockUsers);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const addButton = screen.getByText('Add Member');
    fireEvent.click(addButton);
    
    const userSelect = screen.getByLabelText(/select user/i);
    const options = Array.from(userSelect.querySelectorAll('option')).map(opt => opt.textContent);
    
    // Should only have User Three as available (User One and Admin User are already members)
    expect(options).toContain('User Three (user3@example.com)');
    expect(options).not.toContain('User One (user1@example.com)');
    expect(options).not.toContain('Admin User (admin@example.com)');
  });
});
