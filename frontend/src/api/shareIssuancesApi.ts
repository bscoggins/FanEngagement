import { apiClient } from './client';
import type { ShareIssuanceDto, CreateShareIssuanceRequest } from '../types/api';

export const shareIssuancesApi = {
  create: async (organizationId: string, request: CreateShareIssuanceRequest): Promise<ShareIssuanceDto> => {
    const response = await apiClient.post<ShareIssuanceDto>(`/organizations/${organizationId}/share-issuances`, request);
    return response.data;
  },

  getByOrganization: async (organizationId: string): Promise<ShareIssuanceDto[]> => {
    const response = await apiClient.get<ShareIssuanceDto[]>(`/organizations/${organizationId}/share-issuances`);
    return response.data;
  },

  getByUser: async (organizationId: string, userId: string): Promise<ShareIssuanceDto[]> => {
    const response = await apiClient.get<ShareIssuanceDto[]>(`/organizations/${organizationId}/users/${userId}/share-issuances`);
    return response.data;
  },
};
