import { apiClient } from './client';
import type { PagedResult, AuditEvent } from '../types/api';

export interface AuditEventsFilter {
  actionType?: string; // comma-separated list
  resourceType?: string; // comma-separated list
  resourceId?: string;
  actorUserId?: string;
  dateFrom?: string; // ISO 8601 format
  dateTo?: string; // ISO 8601 format
  outcome?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminAuditEventsFilter extends AuditEventsFilter {
  organizationId?: string; // Optional organization filter for admin queries
}

export const auditEventsApi = {
  /**
   * Get audit events for a specific organization with filters
   */
  getByOrganization: async (
    organizationId: string,
    filters?: AuditEventsFilter
  ): Promise<PagedResult<AuditEvent>> => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.actorUserId) params.append('actorUserId', filters.actorUserId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.outcome) params.append('outcome', filters.outcome);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    }

    const queryString = params.toString();
    const url = `/organizations/${organizationId}/audit-events${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get audit events across all organizations (Platform Admin only)
   */
  getAllAcrossOrganizations: async (
    filters?: AdminAuditEventsFilter
  ): Promise<PagedResult<AuditEvent>> => {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.organizationId) params.append('organizationId', filters.organizationId);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.actorUserId) params.append('actorUserId', filters.actorUserId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.outcome) params.append('outcome', filters.outcome);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
    }

    const queryString = params.toString();
    const url = `/admin/audit-events${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Export audit events across all organizations (Platform Admin only)
   */
  exportAllAcrossOrganizations: async (
    format: 'csv' | 'json',
    filters?: AdminAuditEventsFilter
  ): Promise<Blob> => {
    const params = new URLSearchParams({ format });
    
    if (filters) {
      if (filters.organizationId) params.append('organizationId', filters.organizationId);
      if (filters.actionType) params.append('actionType', filters.actionType);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.resourceId) params.append('resourceId', filters.resourceId);
      if (filters.actorUserId) params.append('actorUserId', filters.actorUserId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.outcome) params.append('outcome', filters.outcome);
    }

    const queryString = params.toString();
    const url = `/admin/audit-events/export${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get(url, { responseType: 'blob' });
    return response.data;
  },
};
