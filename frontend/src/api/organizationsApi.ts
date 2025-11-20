import { apiClient } from './client';
import type { Organization } from '../types/api';

export const organizationsApi = {
  getAll: async (): Promise<Organization[]> => {
    const response = await apiClient.get<Organization[]>('/organizations');
    return response.data;
  },

  getById: async (id: string): Promise<Organization> => {
    const response = await apiClient.get<Organization>(`/organizations/${id}`);
    return response.data;
  },
};
