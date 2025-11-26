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

export interface E2eCleanupResult {
  organizationsDeleted: number;
}

export interface TestDataResetResult {
  organizationsDeleted: number;
  nonAdminUsersDeleted: number;
  seedResult: DevDataSeedingResult;
}

export const adminApi = {
  seedDevData: async (): Promise<DevDataSeedingResult> => {
    const response = await apiClient.post<DevDataSeedingResult>('/admin/seed-dev-data');
    return response.data;
  },
  cleanupE2eData: async (): Promise<E2eCleanupResult> => {
    const response = await apiClient.post<E2eCleanupResult>('/admin/cleanup-e2e-data');
    return response.data;
  },
  resetDevData: async (): Promise<TestDataResetResult> => {
    const response = await apiClient.post<TestDataResetResult>('/admin/reset-dev-data');
    return response.data;
  },
};
