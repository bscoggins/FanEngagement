import { apiClient } from './client';
import type { OutboundEvent, OutboundEventDetails, OutboundEventStatus } from '../types/api';

export interface OutboundEventsFilter {
  status?: OutboundEventStatus;
  eventType?: string;
  fromDate?: string;
  toDate?: string;
}

export const outboundEventsApi = {
  /**
   * Get all outbound events for an organization with optional filters
   */
  async getAll(
    organizationId: string,
    filter?: OutboundEventsFilter
  ): Promise<OutboundEvent[]> {
    const params = new URLSearchParams();
    
    if (filter?.status) {
      params.append('status', filter.status);
    }
    if (filter?.eventType) {
      params.append('eventType', filter.eventType);
    }
    if (filter?.fromDate) {
      params.append('fromDate', filter.fromDate);
    }
    if (filter?.toDate) {
      params.append('toDate', filter.toDate);
    }
    
    const queryString = params.toString();
    const url = `/organizations/${organizationId}/outbound-events${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<OutboundEvent[]>(url);
    return response.data;
  },

  /**
   * Get details of a specific outbound event
   */
  async getById(organizationId: string, eventId: string): Promise<OutboundEventDetails> {
    const response = await apiClient.get<OutboundEventDetails>(
      `/organizations/${organizationId}/outbound-events/${eventId}`
    );
    return response.data;
  },

  /**
   * Retry a failed outbound event
   */
  async retry(organizationId: string, eventId: string): Promise<void> {
    await apiClient.post(`/organizations/${organizationId}/outbound-events/${eventId}/retry`);
  },
};
