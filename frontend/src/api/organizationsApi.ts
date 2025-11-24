import { apiClient } from './client';
import type { Organization, UpdateOrganizationRequest, CreateOrganizationRequest, PagedResult } from '../types/api';

export const organizationsApi = {
  create: async (request: CreateOrganizationRequest): Promise<Organization> => {
    const response = await apiClient.post<Organization>('/organizations', request);
    return response.data;
  },

  getAll: async (): Promise<Organization[]> => {
    const response = await apiClient.get<Organization[]>('/organizations');
    return response.data;
  },

  getAllPaged: async (page: number, pageSize: number, search?: string): Promise<PagedResult<Organization>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    const response = await apiClient.get<PagedResult<Organization>>(`/organizations?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<Organization> => {
    const response = await apiClient.get<Organization>(`/organizations/${id}`);
    return response.data;
  },

  update: async (id: string, request: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await apiClient.put<Organization>(`/organizations/${id}`, request);
    return response.data;
  },
};
