import { apiClient } from './client';
import type { ShareBalance } from '../types/api';

export const shareBalancesApi = {
  /**
   * Get user's share balances in an organization
   */
  async getBalances(organizationId: string, userId: string): Promise<ShareBalance[]> {
    const response = await apiClient.get<ShareBalance[]>(`/organizations/${organizationId}/users/${userId}/balances`);
    return response.data;
  },
};
