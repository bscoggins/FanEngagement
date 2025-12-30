import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PlatformAdminBlockchainPage } from './PlatformAdminBlockchainPage';
import { blockchainApi } from '../api/blockchainApi';
import { organizationsApi } from '../api/organizationsApi';
import type { BlockchainRecordDto, Organization, PagedResult } from '../types/api';

vi.mock('../api/blockchainApi', () => ({
  blockchainApi: {
    getTransactions: vi.fn(),
    verifyRecord: vi.fn(),
  },
}));

vi.mock('../api/organizationsApi', () => ({
  organizationsApi: {
    getAll: vi.fn(),
  },
}));

describe('PlatformAdminBlockchainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrganizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Polygon Org',
      createdAt: '2024-01-01T00:00:00Z',
      blockchainType: 'Polygon',
      blockchainConfig: '{"network":"amoy","adapterUrl":"https://adapter","apiKey":"key"}',
    },
  ];

  const mockRecords: PagedResult<BlockchainRecordDto> = {
    items: [
      {
        entityId: 'rec-1',
        organizationId: 'org-1',
        organizationName: 'Polygon Org',
        entityType: 'Proposal',
        entityName: 'Test Proposal',
        transactionId: '0xabc123',
        onChainAddress: '0xdef456',
        timestamp: new Date('2024-02-01T00:00:00Z').toISOString(),
        status: 'Recorded',
      },
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/platform-admin/blockchain']}>
        <Routes>
          <Route path="/platform-admin/blockchain" element={<PlatformAdminBlockchainPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders blockchain records with explorer links and network metadata', async () => {
    vi.mocked(organizationsApi.getAll).mockResolvedValue(mockOrganizations);
    vi.mocked(blockchainApi.getTransactions).mockResolvedValue(mockRecords);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Blockchain Transactions')).toBeInTheDocument();
    });

    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText(/Network: amoy/)).toBeInTheDocument();

    const txLink = screen.getByText('0xabc123').closest('a');
    expect(txLink).toHaveAttribute('href', 'https://amoy.polygonscan.com/tx/0xabc123');

    const addressLink = screen.getByText('0xdef456').closest('a');
    expect(addressLink).toHaveAttribute('href', 'https://amoy.polygonscan.com/address/0xdef456');
  });
});
