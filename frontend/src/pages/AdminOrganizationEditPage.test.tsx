import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminOrganizationEditPage } from './AdminOrganizationEditPage';
import { organizationsApi } from '../api/organizationsApi';
import type { Organization } from '../types/api';

// Mock the organizationsApi
vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AdminOrganizationEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const renderPage = (orgId = 'org-1') => {
    return render(
      <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/edit`]}>
        <Routes>
          <Route path="/admin/organizations/:orgId/edit" element={<AdminOrganizationEditPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders edit organization heading', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Organization Overview')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(() => new Promise(() => {})); // Never resolves
    renderPage();
    
    expect(screen.getByText(/loading organization/i)).toBeInTheDocument();
  });

  it('loads and displays organization data', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    
    expect(nameInput.value).toBe('Test Organization');
    expect(descriptionInput.value).toBe('Test description');
  });

  it('successfully updates organization', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(organizationsApi.update).mockResolvedValueOnce({
      ...mockOrganization,
      name: 'Updated Organization',
      description: 'Updated description',
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const nameInput = screen.getByLabelText(/name \*/i);
    const descriptionInput = screen.getByLabelText(/^description$/i);
    
    fireEvent.change(nameInput, { target: { value: 'Updated Organization' } });
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(organizationsApi.update).toHaveBeenCalledWith('org-1', {
        name: 'Updated Organization',
        description: 'Updated description',
        logoUrl: '',
        primaryColor: '',
        secondaryColor: '',
        blockchainType: 'None',
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/organization updated successfully/i)).toBeInTheDocument();
    });
  });

  it('displays error message when update fails', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(organizationsApi.update).mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Invalid data' } }
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid data/i)).toBeInTheDocument();
    });
  });

  it('displays error message when organization not found', async () => {
    vi.mocked(organizationsApi.getById).mockRejectedValueOnce({
      response: { status: 404 }
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/organization not found/i)).toBeInTheDocument();
    });
  });

  it('navigates back when cancel is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/admin/organizations');
  });

  it('disables save button while saving', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(organizationsApi.update).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });
});
