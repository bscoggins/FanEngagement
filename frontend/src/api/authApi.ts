import { apiClient } from './client';
import type { LoginRequest, LoginResponse, MfaValidateRequest, MfaSetupResult, MfaEnableRequest, MfaDisableRequest, MfaStatusResponse } from '../types/api';

export const authApi = {
  login: async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response.data;
  },

  validateMfa: async (request: MfaValidateRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/mfa/validate', request);
    return response.data;
  },
};

export const mfaApi = {
  setup: async (): Promise<MfaSetupResult> => {
    const response = await apiClient.post<MfaSetupResult>('/users/me/mfa/setup', {});
    return response.data;
  },

  enable: async (request: MfaEnableRequest): Promise<{ message: string; backupCodes: string[] }> => {
    const response = await apiClient.post<{ message: string; backupCodes: string[] }>('/users/me/mfa/enable', request);
    return response.data;
  },

  disable: async (request: MfaDisableRequest): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/users/me/mfa/disable', request);
    return response.data;
  },

  getStatus: async (): Promise<MfaStatusResponse> => {
    const response = await apiClient.get<MfaStatusResponse>('/users/me/mfa/status');
    return response.data;
  },
};
