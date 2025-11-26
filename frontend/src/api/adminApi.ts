import { apiClient } from './client';

export type SeedScenario = 'BasicDemo' | 'HeavyProposals' | 'WebhookFailures';

export interface SeedScenarioInfo {
  scenario: SeedScenario;
  name: string;
  description: string;
}

export interface DevDataSeedingResult {
  scenario: string;
  organizationsCreated: number;
  usersCreated: number;
  membershipsCreated: number;
  shareTypesCreated: number;
  shareIssuancesCreated: number;
  proposalsCreated: number;
  votesCreated: number;
  webhookEndpointsCreated: number;
  outboundEventsCreated: number;
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
  getSeedScenarios: async (): Promise<SeedScenarioInfo[]> => {
    const response = await apiClient.get<SeedScenarioInfo[]>('/admin/seed-scenarios');
    return response.data;
  },
  seedDevData: async (scenario?: SeedScenario): Promise<DevDataSeedingResult> => {
    const params = scenario ? `?scenario=${scenario}` : '';
    const response = await apiClient.post<DevDataSeedingResult>(`/admin/seed-dev-data${params}`);
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
