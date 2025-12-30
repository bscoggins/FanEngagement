import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminProposalDetailPage } from './AdminProposalDetailPage';
import { proposalsApi } from '../api/proposalsApi';
import { organizationsApi } from '../api/organizationsApi';
import type { ProposalDetails, ProposalResults, Organization } from '../types/api';

// Mock the APIs
vi.mock('../api/proposalsApi', () => ({
  proposalsApi: {
    getById: vi.fn(),
    update: vi.fn(),
    close: vi.fn(),
    addOption: vi.fn(),
    deleteOption: vi.fn(),
    getResults: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getById: vi.fn(),
  },
}));

// Mock window.confirm
const originalConfirm = window.confirm;

describe('AdminProposalDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  const mockOrganization: Organization = {
    id: 'org-1',
    name: 'Test Org',
    createdAt: '2024-01-01T00:00:00Z',
    blockchainType: 'Polygon',
    blockchainConfig: '{"adapterUrl":"https://adapter.example","network":"amoy","apiKey":"key"}',
  };

  const mockProposal: ProposalDetails = {
    id: 'proposal-1',
    organizationId: 'org-1',
    title: 'Test Proposal',
    description: 'Test description',
    status: 'Open',
    startAt: '2024-01-01T00:00:00Z',
    endAt: '2024-12-31T23:59:59Z',
    quorumRequirement: 50,
    createdByUserId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    options: [
      {
        id: 'option-1',
        proposalId: 'proposal-1',
        text: 'Option A',
        description: 'First option',
      },
      {
        id: 'option-2',
        proposalId: 'proposal-1',
        text: 'Option B',
        description: undefined,
      },
    ],
  };

  const mockClosedProposal: ProposalDetails = {
    ...mockProposal,
    status: 'Closed',
  };

  const mockResults: ProposalResults = {
    proposalId: 'proposal-1',
    totalVotingPower: 100,
    optionResults: [
      {
        optionId: 'option-1',
        optionText: 'Option A',
        voteCount: 5,
        totalVotingPower: 60,
      },
      {
        optionId: 'option-2',
        optionText: 'Option B',
        voteCount: 3,
        totalVotingPower: 40,
      },
    ],
  };

  const renderPage = (orgId = 'org-1', proposalId = 'proposal-1') => {
    vi.mocked(organizationsApi.getById).mockResolvedValue(mockOrganization);
    return render(
      <MemoryRouter initialEntries={[`/admin/organizations/${orgId}/proposals/${proposalId}`]}>
        <Routes>
          <Route path="/admin/organizations/:orgId/proposals/:proposalId" element={<AdminProposalDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders proposal details', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Open')).toBeInTheDocument();
    });
  });

  it('renders polygon explorer link when blockchain data exists', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce({
      ...mockProposal,
      blockchainProposalAddress: '0xabc123',
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('proposal-explorer-link')).toBeInTheDocument();
    });

    expect(screen.getByTestId('proposal-explorer-link')).toHaveAttribute('href', 'https://amoy.polygonscan.com/address/0xabc123');
  });

  it('displays loading state initially', () => {
    vi.mocked(proposalsApi.getById).mockImplementation(() => new Promise(() => {}));
    
    renderPage();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays options list', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('First option')).toBeInTheDocument();
    });
  });

  it('displays error message when proposal fails to load', async () => {
    vi.mocked(proposalsApi.getById).mockRejectedValueOnce(new Error('Network error'));
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load proposal/i)).toBeInTheDocument();
    });
  });

  it('shows edit button for open proposal', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });

  it('shows close button for open proposal', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Close Proposal')).toBeInTheDocument();
    });
  });

  it('enters edit mode when edit button clicked', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Proposal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Proposal')).toBeInTheDocument();
    });
  });

  it('updates proposal successfully', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.update).mockResolvedValueOnce({
      ...mockProposal,
      title: 'Updated Title',
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Proposal')).toBeInTheDocument();
    });
    
    const titleInput = screen.getByDisplayValue('Test Proposal');
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });
    
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(proposalsApi.update).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
        title: 'Updated Title',
      }));
    });
  });

  it('cancels edit mode', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByText('Edit Proposal')).toBeInTheDocument();
    });
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Edit Proposal')).not.toBeInTheDocument();
    });
  });

  it('closes proposal successfully', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.close).mockResolvedValueOnce(mockClosedProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Close Proposal')).toBeInTheDocument();
    });
    
    const closeButton = screen.getByText('Close Proposal');
    fireEvent.click(closeButton);
    
    await waitFor(() => {
      expect(proposalsApi.close).toHaveBeenCalledWith('proposal-1');
    });
  });

  it('shows add option button for open proposal', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Add Option')).toBeInTheDocument();
    });
  });

  it('shows add option form when button clicked', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockProposal);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    
    const addButtons = screen.getAllByText('Add Option');
    fireEvent.click(addButtons[0]); // Click the button, not the form submit button
    
    await waitFor(() => {
      expect(screen.getByText('Add New Option')).toBeInTheDocument();
      expect(screen.getByLabelText(/option text/i)).toBeInTheDocument();
    });
  });

  it('adds option successfully', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.addOption).mockResolvedValueOnce({
      id: 'option-3',
      proposalId: 'proposal-1',
      text: 'Option C',
      description: 'New option',
    });
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Options')).toBeInTheDocument();
    });
    
    const addButtons = screen.getAllByText('Add Option');
    fireEvent.click(addButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByLabelText(/option text/i)).toBeInTheDocument();
    });
    
    const textInput = screen.getByLabelText(/option text/i);
    fireEvent.change(textInput, { target: { value: 'Option C' } });
    
    const submitButtons = screen.getAllByText('Add Option');
    // Find the submit button inside the form (it should be the last one)
    fireEvent.click(submitButtons[submitButtons.length - 1]);
    
    await waitFor(() => {
      expect(proposalsApi.addOption).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
        text: 'Option C',
      }));
    });
  });

  it('deletes option successfully', async () => {
    const draftProposal = { ...mockProposal, status: 'Draft' as const };
    vi.mocked(proposalsApi.getById).mockResolvedValue(draftProposal);
    vi.mocked(proposalsApi.deleteOption).mockResolvedValueOnce(undefined);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Option A')).toBeInTheDocument();
    });
    
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    await waitFor(() => {
      expect(proposalsApi.deleteOption).toHaveBeenCalledWith('proposal-1', 'option-1');
    });
  });

  it('displays results for closed proposal', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockClosedProposal);
    vi.mocked(proposalsApi.getResults).mockResolvedValueOnce(mockResults);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
      expect(screen.getByText('Total Voting Power:')).toBeInTheDocument();
      expect(screen.getByText('100.00')).toBeInTheDocument();
    });
  });

  it('displays option results with percentages', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockClosedProposal);
    vi.mocked(proposalsApi.getResults).mockResolvedValueOnce(mockResults);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Results')).toBeInTheDocument();
    });
    
    // Check for voting powers  
    expect(screen.getByText(/60\.00/)).toBeInTheDocument();
    expect(screen.getByText(/40\.00/)).toBeInTheDocument();
    // Check for percentages
    expect(screen.getByText(/60\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/40\.0%/)).toBeInTheDocument();
  });

  it('does not show edit/close buttons for closed proposal', async () => {
    vi.mocked(proposalsApi.getById).mockResolvedValueOnce(mockClosedProposal);
    vi.mocked(proposalsApi.getResults).mockResolvedValueOnce(mockResults);
    
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Closed')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Close Proposal')).not.toBeInTheDocument();
  });
});
