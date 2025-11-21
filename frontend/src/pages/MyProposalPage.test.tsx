import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { MyProposalPage } from './MyProposalPage';
import { proposalsApi } from '../api/proposalsApi';

vi.mock('../api/proposalsApi');

const renderWithAuth = (proposalId: string, userId: string) => {
  const mockUser = {
    token: 'test-token',
    userId,
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'User',
  };
  
  localStorage.setItem('authToken', mockUser.token);
  localStorage.setItem('authUser', JSON.stringify(mockUser));

  return render(
    <MemoryRouter initialEntries={[`/me/proposals/${proposalId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/me/proposals/:proposalId" element={<MyProposalPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyProposalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays proposal details with options', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: 'A test proposal description',
      status: 'Open' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: 50,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
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
          description: 'Second option',
        },
      ],
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    expect(screen.getByText('A test proposal description')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('First option')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
    expect(screen.getByText('Second option')).toBeInTheDocument();
  });

  it('allows voting on an open proposal', async () => {
    const user = userEvent.setup();
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
      options: [
        {
          id: 'option-1',
          proposalId: 'proposal-1',
          text: 'Option A',
          description: '',
        },
        {
          id: 'option-2',
          proposalId: 'proposal-1',
          text: 'Option B',
          description: '',
        },
      ],
    };

    const mockVote = {
      id: 'vote-1',
      proposalId: 'proposal-1',
      proposalOptionId: 'option-1',
      userId: 'user-1',
      votingPower: 100,
      castAt: '2024-01-16T00:00:00Z',
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(proposalsApi.castVote).mockResolvedValue(mockVote);

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    // Select an option
    const optionARadio = screen.getByRole('radio', { name: /Option A/i });
    await user.click(optionARadio);

    // Submit vote
    const voteButton = screen.getByRole('button', { name: /Cast Vote/i });
    await user.click(voteButton);

    await waitFor(() => {
      expect(proposalsApi.castVote).toHaveBeenCalledWith('proposal-1', {
        proposalOptionId: 'option-1',
        userId: 'user-1',
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Your vote has been cast successfully!')).toBeInTheDocument();
    });
  });

  it('displays error message when vote fails', async () => {
    const user = userEvent.setup();
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
      options: [
        {
          id: 'option-1',
          proposalId: 'proposal-1',
          text: 'Option A',
          description: '',
        },
      ],
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(proposalsApi.castVote).mockRejectedValue({
      response: { data: { Error: 'User has no voting power in this organization.' } },
    });

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    // Select option and vote
    await user.click(screen.getByRole('radio', { name: /Option A/i }));
    await user.click(screen.getByRole('button', { name: /Cast Vote/i }));

    await waitFor(() => {
      expect(screen.getByText('User has no voting power in this organization.')).toBeInTheDocument();
    });
  });

  it('displays user vote when already voted', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
      options: [
        {
          id: 'option-1',
          proposalId: 'proposal-1',
          text: 'Option A',
          description: '',
        },
        {
          id: 'option-2',
          proposalId: 'proposal-1',
          text: 'Option B',
          description: '',
        },
      ],
    };

    const mockVote = {
      id: 'vote-1',
      proposalId: 'proposal-1',
      proposalOptionId: 'option-1',
      userId: 'user-1',
      votingPower: 100,
      castAt: '2024-01-16T00:00:00Z',
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockResolvedValue(mockVote);

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    expect(screen.getByText('You have already voted!')).toBeInTheDocument();
    expect(screen.getAllByText(/Option A/)[0]).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('displays results for closed proposal', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Closed' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
      options: [
        {
          id: 'option-1',
          proposalId: 'proposal-1',
          text: 'Option A',
          description: '',
        },
        {
          id: 'option-2',
          proposalId: 'proposal-1',
          text: 'Option B',
          description: '',
        },
      ],
    };

    const mockResults = {
      proposalId: 'proposal-1',
      optionResults: [
        {
          optionId: 'option-1',
          optionText: 'Option A',
          voteCount: 5,
          totalVotingPower: 500,
        },
        {
          optionId: 'option-2',
          optionText: 'Option B',
          voteCount: 3,
          totalVotingPower: 300,
        },
      ],
      totalVotingPower: 800,
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(proposalsApi.getResults).mockResolvedValue(mockResults);

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    expect(screen.getByText('Results')).toBeInTheDocument();
    expect(screen.getByText(/Total Voting Power:/)).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText(/62.5%/)).toBeInTheDocument(); // 500/800
    expect(screen.getByText(/37.5%/)).toBeInTheDocument(); // 300/800
  });

  it('disables vote button when no option selected', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2024-01-15T00:00:00Z',
      endAt: '2024-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2024-01-10T00:00:00Z',
      options: [
        {
          id: 'option-1',
          proposalId: 'proposal-1',
          text: 'Option A',
          description: '',
        },
      ],
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    const voteButton = screen.getByRole('button', { name: /Cast Vote/i });
    expect(voteButton).toBeDisabled();
  });

  it('displays loading state', () => {
    vi.mocked(proposalsApi.getById).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithAuth('proposal-1', 'user-1');

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays error message when proposal fails to load', async () => {
    vi.mocked(proposalsApi.getById).mockRejectedValue(new Error('Network error'));

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Failed to load proposal information.')).toBeInTheDocument();
    });
  });
});
