import { apiClient } from './client';
import type { PagedResult, BlockchainRecordDto, BlockchainVerificationDto, PlatformWalletDto } from '../types/api';

interface BlockchainFilters {
  page?: number;
  pageSize?: number;
  organizationId?: string;
  type?: string;
}

export const blockchainApi = {
  getTransactions: async (filters: BlockchainFilters = {}): Promise<PagedResult<BlockchainRecordDto>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    if (filters.organizationId) params.append('organizationId', filters.organizationId);
    if (filters.type) params.append('type', filters.type);

    const response = await apiClient.get<PagedResult<BlockchainRecordDto>>(`/admin/blockchain/transactions?${params.toString()}`);
    return response.data;
  },

  verifyRecord: async (entityType: string, entityId: string): Promise<BlockchainVerificationDto> => {
    const response = await apiClient.get<BlockchainVerificationDto>(`/admin/blockchain/verify/${entityType}/${entityId}`);
    return response.data;
  },

  getPlatformWallet: async (blockchain: string = 'Solana'): Promise<PlatformWalletDto> => {
    const response = await apiClient.get<PlatformWalletDto>(`/admin/blockchain/wallet?blockchain=${blockchain}`);
    return response.data;
  },
};
