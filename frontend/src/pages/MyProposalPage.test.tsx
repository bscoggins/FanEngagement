import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { MyProposalPage } from './MyProposalPage';
import { proposalsApi } from '../api/proposalsApi';
import { shareBalancesApi } from '../api/shareBalancesApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { NotificationProvider } from '../contexts/NotificationContext';
import { NotificationContainer } from '../components/NotificationContainer';
import * as checkVotingEligibilityModule from '../utils/proposalUtils';

vi.mock('../api/proposalsApi');
vi.mock('../api/shareBalancesApi');
vi.mock('../api/shareTypesApi');

const renderWithAuth = (proposalId: string, userId: string) => {
  const mockUser = {
    token: 'test-token',
    userId,
    email: 'user@example.com',
    displayName: 'Test User',
    role: 'User',
      mfaRequired: false,
  };
  
  localStorage.setItem('authToken', mockUser.token);
  localStorage.setItem('authUser', JSON.stringify(mockUser));

  return render(
    <MemoryRouter initialEntries={[`/me/proposals/${proposalId}`]}>
      <AuthProvider>
        <NotificationProvider>
          <NotificationContainer />
          <Routes>
            <Route path="/me/proposals/:proposalId" element={<MyProposalPage />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyProposalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    
    // Mock share balances by default - can be overridden in specific tests
    vi.mocked(shareBalancesApi.getBalances).mockResolvedValue([
      {
        shareTypeId: 'share-type-1',
        shareTypeName: 'Test Share',
        shareTypeSymbol: 'TST',
        balance: 100,
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ]);
    
    // Mock share types by default - can be overridden in specific tests
    vi.mocked(shareTypesApi.getByOrganization).mockResolvedValue([
      {
        id: 'share-type-1',
        organizationId: 'org-1',
        name: 'Test Share',
        symbol: 'TST',
        votingWeight: 1,
        isTransferable: true,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]);
    
    // Mock results by default (empty for most cases)
    vi.mocked(proposalsApi.getResults).mockResolvedValue({
      proposalId: 'proposal-1',
      optionResults: [],
      totalVotingPower: 0,
    });
  });

  it('displays proposal details with options', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: 'A test proposal description',
      status: 'Open' as const,
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: 50,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
    expect(screen.getByRole('radio', { name: /Option A/i })).toBeInTheDocument();
    expect(screen.getByText('First option')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Option B/i })).toBeInTheDocument();
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
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
      castAt: '2020-01-16T00:00:00Z',
    };

    const mockResults = {
      proposalId: 'proposal-1',
      optionResults: [
        { optionId: 'option-1', optionText: 'Option A', voteCount: 1, totalVotingPower: 100 },
        { optionId: 'option-2', optionText: 'Option B', voteCount: 0, totalVotingPower: 0 },
      ],
      totalVotingPower: 100,
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });
    let resolveVote: (() => void) | null = null;
    vi.mocked(proposalsApi.castVote).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveVote = () => resolve(mockVote);
        })
    );
    vi.mocked(proposalsApi.getResults).mockResolvedValue(mockResults);

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

    // Optimistic feedback shown while request is in flight
    await screen.findByText('Casting your vote...');

    // Ensure optimistic state stays visible before resolving
    expect(screen.queryByText('Your vote has been cast successfully!')).toBeNull();

    resolveVote?.();

    await waitFor(() => {
      expect(proposalsApi.castVote).toHaveBeenCalledWith('proposal-1', {
        proposalOptionId: 'option-1',
        userId: 'user-1',
      });
    });

    await screen.findByText('Your vote has been cast successfully!');
  });

  it('displays error message when vote fails', async () => {
    const user = userEvent.setup();
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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

    await screen.findAllByText('User has no voting power in this organization.');
  });

  it('optimistically updates vote results and rolls back on failure', async () => {
    const user = userEvent.setup();
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
        { optionId: 'option-1', optionText: 'Option A', voteCount: 0, totalVotingPower: 0 },
        { optionId: 'option-2', optionText: 'Option B', voteCount: 0, totalVotingPower: 0 },
      ],
      totalVotingPower: 0,
    };

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockRejectedValue({ response: { status: 404 } });
    vi.mocked(proposalsApi.getResults).mockResolvedValue(mockResults);

    let rejectVote: ((value: unknown) => void) | null = null;
    vi.mocked(proposalsApi.castVote).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectVote = reject;
        })
    );

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: /Option A/i }));
    await user.click(screen.getByRole('button', { name: /Cast Vote/i }));

    await screen.findByText('Casting your vote...');
    await screen.findByText('Votes: 1 | Voting Power: 100.00');

    rejectVote?.({
      response: { data: { Error: 'Voting failed' } },
    });

    await screen.findAllByText('Voting failed');

    expect(screen.queryByText('Votes: 1 | Voting Power: 100.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('Votes: 0 | Voting Power: 0.00')).toHaveLength(2);
    const optionARadio = screen.getByRole('radio', { name: /Option A/i }) as HTMLInputElement;
    expect(optionARadio.checked).toBe(true);
    expect(screen.queryByTestId('results-refresh-warning')).not.toBeInTheDocument();
  });

  it('supports changing a vote with optimistic counts updated', async () => {
    const user = userEvent.setup();
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
      options: [
        { id: 'option-1', proposalId: 'proposal-1', text: 'Option A', description: '' },
        { id: 'option-2', proposalId: 'proposal-1', text: 'Option B', description: '' },
      ],
    };

    const previousVote = {
      id: 'vote-prev',
      proposalId: 'proposal-1',
      proposalOptionId: 'option-1',
      userId: 'user-1',
      votingPower: 50,
      castAt: '2020-01-16T00:00:00Z',
    };

    const updatedVote = {
      ...previousVote,
      id: 'vote-new',
      proposalOptionId: 'option-2',
      votingPower: 100,
      castAt: '2020-01-17T00:00:00Z',
    };

    const initialResults = {
      proposalId: 'proposal-1',
      optionResults: [
        { optionId: 'option-1', optionText: 'Option A', voteCount: 1, totalVotingPower: 50 },
        { optionId: 'option-2', optionText: 'Option B', voteCount: 0, totalVotingPower: 0 },
      ],
      totalVotingPower: 50,
    };

    const finalResults = {
      proposalId: 'proposal-1',
      optionResults: [
        { optionId: 'option-1', optionText: 'Option A', voteCount: 0, totalVotingPower: 0 },
        { optionId: 'option-2', optionText: 'Option B', voteCount: 1, totalVotingPower: 100 },
      ],
      totalVotingPower: 100,
    };

    const eligibilitySpy = vi
      .spyOn(checkVotingEligibilityModule, 'checkVotingEligibility')
      .mockReturnValue({ eligible: true, reason: '' });

    vi.mocked(proposalsApi.getById).mockResolvedValue(mockProposal);
    vi.mocked(proposalsApi.getUserVote).mockResolvedValue(previousVote);
    vi.mocked(proposalsApi.getResults).mockResolvedValueOnce(initialResults).mockResolvedValueOnce(finalResults);

    let resolveVote: ((value: typeof updatedVote) => void) | null = null;
    const castPromise = new Promise<typeof updatedVote>((resolve) => {
      resolveVote = resolve;
    });
    vi.mocked(proposalsApi.castVote).mockReturnValue(castPromise);

    renderWithAuth('proposal-1', 'user-1');

    await waitFor(() => {
      expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('radio', { name: /Option B/i }));
    await user.click(screen.getByRole('button', { name: /Cast Vote/i }));

    await screen.findByText('Casting your vote...');
    await screen.findByText('Votes: 0 | Voting Power: 0.00');
    await screen.findByText('Votes: 1 | Voting Power: 100.00');
    await screen.findByText(
      'Your voting power changed since your last vote. Totals will refresh after the latest results load.'
    );

    resolveVote?.(updatedVote);

    await screen.findAllByText('Your vote has been cast successfully!');
    expect(
      screen.queryByText(
        'Your voting power changed since your last vote. Totals will refresh after the latest results load.'
      )
    ).not.toBeInTheDocument();

    eligibilitySpy.mockRestore();
  });

  it('displays user vote when already voted', async () => {
    const mockProposal = {
      id: 'proposal-1',
      organizationId: 'org-1',
      title: 'Test Proposal',
      description: '',
      status: 'Open' as const,
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
      castAt: '2020-01-16T00:00:00Z',
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
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
    expect(screen.getByText('800.00')).toBeInTheDocument();
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
      startAt: '2020-01-15T00:00:00Z',
      endAt: '2099-02-15T00:00:00Z',
      quorumRequirement: undefined,
      createdByUserId: 'user-2',
      createdAt: '2020-01-10T00:00:00Z',
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
