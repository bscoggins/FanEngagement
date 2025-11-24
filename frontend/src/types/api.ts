export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
}

// Pagination types
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'User' | 'Admin';
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface UpdateUserRequest {
  email: string;
  displayName: string;
  role?: 'User' | 'Admin';
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  description?: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OrgAdmin' | 'Member';
  createdAt: string;
}

export interface MembershipWithOrganizationDto {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  role: 'OrgAdmin' | 'Member';
  createdAt: string;
}

export interface MembershipWithUserDto {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  role: 'OrgAdmin' | 'Member';
  createdAt: string;
}

export interface CreateMembershipRequest {
  userId: string;
  role: 'OrgAdmin' | 'Member';
}

export interface ShareType {
  id: string;
  organizationId: string;
  name: string;
  symbol: string;
  description?: string;
  votingWeight: number;
  maxSupply?: number;
  isTransferable: boolean;
  createdAt: string;
}

export interface CreateShareTypeRequest {
  name: string;
  symbol: string;
  description?: string;
  votingWeight: number;
  maxSupply?: number;
  isTransferable: boolean;
}

export interface UpdateShareTypeRequest {
  name: string;
  symbol: string;
  description?: string;
  votingWeight: number;
  maxSupply?: number;
  isTransferable: boolean;
}

export type ProposalStatus = 'Draft' | 'Open' | 'Closed' | 'Finalized';

export interface Proposal {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: ProposalStatus;
  startAt?: string;
  endAt?: string;
  quorumRequirement?: number;
  createdByUserId: string;
  createdAt: string;
  // Governance result fields (populated when closed/finalized)
  winningOptionId?: string;
  quorumMet?: boolean;
  totalVotesCast?: number;
  closedAt?: string;
  eligibleVotingPowerSnapshot?: number;
}

export interface ProposalOption {
  id: string;
  proposalId: string;
  text: string;
  description?: string;
}

export interface ProposalDetails {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  status: ProposalStatus;
  startAt?: string;
  endAt?: string;
  quorumRequirement?: number;
  createdByUserId: string;
  createdAt: string;
  options: ProposalOption[];
  // Governance result fields (populated when closed/finalized)
  winningOptionId?: string;
  quorumMet?: boolean;
  totalVotesCast?: number;
  closedAt?: string;
  eligibleVotingPowerSnapshot?: number;
}

export interface CreateProposalRequest {
  title: string;
  description?: string;
  startAt?: string;
  endAt?: string;
  quorumRequirement?: number;
  createdByUserId: string;
}

export interface UpdateProposalRequest {
  title?: string;
  description?: string;
}

export interface AddProposalOptionRequest {
  text: string;
  description?: string;
}

export interface OptionResult {
  optionId: string;
  optionText: string;
  voteCount: number;
  totalVotingPower: number;
}

export interface ProposalResults {
  proposalId: string;
  optionResults: OptionResult[];
  totalVotingPower: number;
  quorumMet?: boolean;
  eligibleVotingPower?: number;
  winningOptionId?: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  proposalOptionId: string;
  userId: string;
  votingPower: number;
  castAt: string;
}

export interface CastVoteRequest {
  proposalOptionId: string;
  userId: string;
}

export interface ShareBalance {
  shareTypeId: string;
  shareTypeName: string;
  shareTypeSymbol: string;
  balance: number;
  updatedAt: string;
}
