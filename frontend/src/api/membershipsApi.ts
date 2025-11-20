import { apiClient } from './client';
import type { Membership, MembershipWithOrganizationDto } from '../types/api';

export const membershipsApi = {
  getByOrganization: async (organizationId: string): Promise<Membership[]> => {
    const response = await apiClient.get<Membership[]>(`/organizations/${organizationId}/memberships`);
    return response.data;
  },

  getByUserId: async (userId: string): Promise<MembershipWithOrganizationDto[]> => {
    const response = await apiClient.get<MembershipWithOrganizationDto[]>(`/users/${userId}/memberships`);
    return response.data;
  },
};
