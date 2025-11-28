import { apiClient } from './client';
import type { Membership, MembershipWithOrganizationDto, MembershipWithUserDto, CreateMembershipRequest, User } from '../types/api';

export const membershipsApi = {
  getByOrganization: async (organizationId: string): Promise<Membership[]> => {
    const response = await apiClient.get<Membership[]>(`/organizations/${organizationId}/memberships`);
    return response.data;
  },

  getByOrganizationWithUserDetails: async (organizationId: string): Promise<MembershipWithUserDto[]> => {
    const response = await apiClient.get<MembershipWithUserDto[]>(`/organizations/${organizationId}/memberships?includeUserDetails=true`);
    return response.data;
  },

  getByUserId: async (userId: string): Promise<MembershipWithOrganizationDto[]> => {
    const response = await apiClient.get<MembershipWithOrganizationDto[]>(`/users/${userId}/memberships`);
    return response.data;
  },

  getMyOrganizations: async (): Promise<MembershipWithOrganizationDto[]> => {
    const response = await apiClient.get<MembershipWithOrganizationDto[]>('/users/me/organizations');
    return response.data;
  },

  getAvailableUsers: async (organizationId: string): Promise<User[]> => {
    const response = await apiClient.get<User[]>(`/organizations/${organizationId}/memberships/available-users`);
    return response.data;
  },

  create: async (organizationId: string, request: CreateMembershipRequest): Promise<Membership> => {
    const response = await apiClient.post<Membership>(`/organizations/${organizationId}/memberships`, request);
    return response.data;
  },

  delete: async (organizationId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${organizationId}/memberships/${userId}`);
  },
};
