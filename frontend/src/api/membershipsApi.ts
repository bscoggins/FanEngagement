import { apiClient } from './client';
import type { Membership } from '../types/api';

export const membershipsApi = {
  getByOrganization: async (organizationId: string): Promise<Membership[]> => {
    const response = await apiClient.get<Membership[]>(`/organizations/${organizationId}/memberships`);
    return response.data;
  },
};
