import { apiClient } from './client';
import type { ShareType, CreateShareTypeRequest, UpdateShareTypeRequest } from '../types/api';

export const shareTypesApi = {
  getByOrganization: async (organizationId: string): Promise<ShareType[]> => {
    const response = await apiClient.get<ShareType[]>(`/organizations/${organizationId}/share-types`);
    return response.data;
  },

  getById: async (organizationId: string, id: string): Promise<ShareType> => {
    const response = await apiClient.get<ShareType>(`/organizations/${organizationId}/share-types/${id}`);
    return response.data;
  },

  create: async (organizationId: string, request: CreateShareTypeRequest): Promise<ShareType> => {
    const response = await apiClient.post<ShareType>(`/organizations/${organizationId}/share-types`, request);
    return response.data;
  },

  update: async (organizationId: string, id: string, request: UpdateShareTypeRequest): Promise<ShareType> => {
    const response = await apiClient.put<ShareType>(`/organizations/${organizationId}/share-types/${id}`, request);
    return response.data;
  },
};
