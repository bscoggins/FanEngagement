import { apiClient } from './client';
import type { User, CreateUserRequest, UpdateUserRequest, PagedResult } from '../types/api';

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users');
    return response.data;
  },

  getAllPaged: async (page: number, pageSize: number, search?: string): Promise<PagedResult<User>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    const response = await apiClient.get<PagedResult<User>>(`/users?${params.toString()}`);
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  },

  create: async (request: CreateUserRequest): Promise<User> => {
    const response = await apiClient.post<User>('/users', request);
    return response.data;
  },

  update: async (id: string, request: UpdateUserRequest): Promise<User> => {
    const response = await apiClient.put<User>(`/users/${id}`, request);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`);
  },

  changeMyPassword: async (request: import('../types/api').ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/users/me/password', request);
    return response.data;
  },

  setUserPassword: async (id: string, request: import('../types/api').SetPasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.put<{ message: string }>(`/users/${id}/password`, request);
    return response.data;
  },
};
