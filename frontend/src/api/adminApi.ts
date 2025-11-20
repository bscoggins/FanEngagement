import { apiClient } from './client';

export interface DevDataSeedingResult {
  organizationsCreated: number;
  usersCreated: number;
  membershipsCreated: number;
  shareTypesCreated: number;
  shareIssuancesCreated: number;
  proposalsCreated: number;
  votesCreated: number;
}

export const adminApi = {
  seedDevData: async (): Promise<DevDataSeedingResult> => {
    const response = await apiClient.post<DevDataSeedingResult>('/admin/seed-dev-data');
    return response.data;
  },
};
