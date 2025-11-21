import { apiClient } from './client';
import type {
  Proposal,
  ProposalDetails,
  CreateProposalRequest,
  UpdateProposalRequest,
  ProposalOption,
  AddProposalOptionRequest,
  ProposalResults,
} from '../types/api';

export const proposalsApi = {
  /**
   * Create a new proposal for an organization
   */
  async create(organizationId: string, data: CreateProposalRequest): Promise<Proposal> {
    const response = await apiClient.post(`/organizations/${organizationId}/proposals`, data);
    return response.data;
  },

  /**
   * Get proposals for an organization
   */
  async getByOrganization(organizationId: string): Promise<Proposal[]> {
    const response = await apiClient.get(`/organizations/${organizationId}/proposals`);
    return response.data;
  },

  /**
   * Get proposal details by ID (includes options)
   */
  async getById(proposalId: string): Promise<ProposalDetails> {
    const response = await apiClient.get(`/proposals/${proposalId}`);
    return response.data;
  },

  /**
   * Update a proposal
   */
  async update(proposalId: string, data: UpdateProposalRequest): Promise<Proposal> {
    const response = await apiClient.put(`/proposals/${proposalId}`, data);
    return response.data;
  },

  /**
   * Close a proposal (transitions to Closed status)
   */
  async close(proposalId: string): Promise<Proposal> {
    const response = await apiClient.post(`/proposals/${proposalId}/close`);
    return response.data;
  },

  /**
   * Add an option to a proposal
   */
  async addOption(proposalId: string, data: AddProposalOptionRequest): Promise<ProposalOption> {
    const response = await apiClient.post(`/proposals/${proposalId}/options`, data);
    return response.data;
  },

  /**
   * Delete an option from a proposal
   */
  async deleteOption(proposalId: string, optionId: string): Promise<void> {
    await apiClient.delete(`/proposals/${proposalId}/options/${optionId}`);
  },

  /**
   * Get proposal results
   */
  async getResults(proposalId: string): Promise<ProposalResults> {
    const response = await apiClient.get(`/proposals/${proposalId}/results`);
    return response.data;
  },
};
