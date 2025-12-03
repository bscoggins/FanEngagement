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

    const response = await apiClient.get(
      `/organizations/${organizationId}/audit-events?${params.toString()}`
    );
    return response.data;
  },
};
