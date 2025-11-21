import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminOrganizationShareTypesPage } from './AdminOrganizationShareTypesPage';
import { shareTypesApi } from '../api/shareTypesApi';
import { organizationsApi } from '../api/organizationsApi';
import type { ShareType, Organization } from '../types/api';

// Mock the APIs
vi.mock('../api/shareTypesApi', () => ({
  shareTypesApi: {
    getByOrganization: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
  },
}));

describe('AdminOrganizationShareTypesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    description: 'Test description',
    createdAt: '2024-01-01T00:00:00Z',
  };

  const mockShareTypes: ShareType[] = [
    {
      id: 'share-1',
      organizationId: 'org-1',
      name: 'Common Shares',
      symbol: 'CS',
      description: 'Common voting shares',
      votingWeight: 1,
      maxSupply: 1000,
      isTransferable: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'share-2',
      organizationId: 'org-1',
      name: 'Preferred Shares',
      symbol: 'PS',
      description: undefined,
      votingWeight: 2,
      maxSupply: undefined,
      isTransferable: false,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ];

  const renderPage = (orgId = 'org-1') => {
    return render(
      <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/share-types`]}>
        <Routes>
          <Route path="/admin/organizations/:orgId/share-types" element={<AdminOrganizationShareTypesPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders manage share types heading', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Manage Share Types')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    vi.mocked(organizationsApi.getById).mockImplementation(() => new Promise(() => {}));
    vi.mocked(shareTypesApi.getByOrganization).mockImplementation(() => new Promise(() => {}));
    
    renderPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('loads and displays share types', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Common Shares')).toBeInTheDocument();
    expect(screen.getByText('CS')).toBeInTheDocument();
    expect(screen.getByText('Preferred Shares')).toBeInTheDocument();
    expect(screen.getByText('PS')).toBeInTheDocument();
  });

  it('shows create form when button is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const createButton = screen.getByText('Create Share Type');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Create New Share Type')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/symbol/i)).toBeInTheDocument();
  });

  it('successfully creates a share type', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValue(mockShareTypes);
    vi.mocked(shareTypesApi.create).mockResolvedValueOnce({
      id: 'share-3',
      organizationId: 'org-1',
      name: 'New Share',
      symbol: 'NS',
      description: 'New share type',
      votingWeight: 1,
      maxSupply: undefined,
      isTransferable: true,
      createdAt: '2024-01-03T00:00:00Z',
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const createButton = screen.getByText('Create Share Type');
    fireEvent.click(createButton);
    
    // Fill form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New Share' } });
    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: 'NS' } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'New share type' } });
    fireEvent.change(screen.getByLabelText(/voting weight/i), { target: { value: '1' } });
    
    // Submit
    const submitButton = screen.getByText('Create Share Type', { selector: 'button' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(shareTypesApi.create).toHaveBeenCalledWith('org-1', {
        name: 'New Share',
        symbol: 'NS',
        description: 'New share type',
        votingWeight: 1,
        maxSupply: undefined,
        isTransferable: true,
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText(/share type created successfully/i)).toBeInTheDocument();
    });
  });

  it('shows edit form when edit button is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    expect(screen.getByText('Edit Share Type')).toBeInTheDocument();
    
    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Common Shares');
  });

  it('successfully updates a share type', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValue(mockShareTypes);
    vi.mocked(shareTypesApi.update).mockResolvedValueOnce({
      ...mockShareTypes[0],
      name: 'Updated Shares',
      votingWeight: 1.5,
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open edit form
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    
    // Update fields
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Updated Shares' } });
    fireEvent.change(screen.getByLabelText(/voting weight/i), { target: { value: '1.5' } });
    
    // Submit
    const submitButton = screen.getByText('Update Share Type');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(shareTypesApi.update).toHaveBeenCalledWith('org-1', 'share-1', expect.objectContaining({
        name: 'Updated Shares',
        votingWeight: 1.5,
      }));
    });
    
    await waitFor(() => {
      expect(screen.getByText(/share type updated successfully/i)).toBeInTheDocument();
    });
  });

  it('displays validation error when creating with invalid data', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    vi.mocked(shareTypesApi.create).mockRejectedValueOnce({
      response: { status: 400, data: { message: 'Invalid share type data' } }
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const createButton = screen.getByText('Create Share Type');
    fireEvent.click(createButton);
    
    // Fill minimal form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/symbol/i), { target: { value: 'T' } });
    
    // Submit
    const submitButton = screen.getByText('Create Share Type', { selector: 'button' });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid share type data/i)).toBeInTheDocument();
    });
  });

  it('displays empty state when no share types exist', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce([]);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/no share types found/i)).toBeInTheDocument();
  });

  it('displays transferable status correctly', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    const yesLabels = screen.getAllByText('Yes');
    const noLabels = screen.getAllByText('No');
    
    // First share type is transferable (Yes), second is not (No)
    expect(yesLabels.length).toBeGreaterThan(0);
    expect(noLabels.length).toBeGreaterThan(0);
  });

  it('cancels form when cancel button is clicked', async () => {
    vi.mocked(organizationsApi.getById).mockResolvedValueOnce(mockOrganization);
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValueOnce(mockShareTypes);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Open form
    const createButton = screen.getByText('Create Share Type');
    fireEvent.click(createButton);
    
    expect(screen.getByText('Create New Share Type')).toBeInTheDocument();
    
    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(screen.queryByText('Create New Share Type')).not.toBeInTheDocument();
  });
});
