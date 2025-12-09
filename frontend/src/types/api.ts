export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  role: 'User' | 'Admin';
  mfaRequired: boolean;
}

export interface MfaValidateRequest {
  userId: string;
  code: string;
}

export interface MfaSetupResult {
  secretKey: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export interface MfaEnableRequest {
  secretKey: string;
  totpCode: string;
}

export interface MfaDisableRequest {
  code: string;
}

export interface MfaStatusResponse {
  mfaEnabled: boolean;
}

// Blockchain types
export type BlockchainType = 'None' | 'Solana' | 'Polygon';

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

// UserProfile is used for displaying user account info where createdAt may not be available
// (e.g., when data comes from auth context instead of API)
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'User' | 'Admin';
  createdAt?: string;
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

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SetPasswordRequest {
  newPassword: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  blockchainType?: BlockchainType;
  blockchainConfig?: string;
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  blockchainType?: BlockchainType;
  blockchainConfig?: string;
}

export interface UpdateOrganizationRequest {
  name: string;
  description?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  blockchainType?: BlockchainType;
  blockchainConfig?: string;
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

// Outbound Event types
export type OutboundEventStatus = 'Pending' | 'Delivered' | 'Failed';

export interface OutboundEvent {
  id: string;
  organizationId: string;
  webhookEndpointId?: string;
  eventType: string;
  status: OutboundEventStatus;
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
}

export interface OutboundEventDetails extends OutboundEvent {
  payload: string;
}

// Audit Event types
export type AuditActionType =
  | 'Created'
  | 'Updated'
  | 'Deleted'
  | 'Accessed'
  | 'Exported'
  | 'StatusChanged'
  | 'RoleChanged'
  | 'Authenticated'
  | 'AuthorizationDenied'
  | 'AdminDataSeeded'
  | 'AdminDataReset'
  | 'AdminDataCleanup';

export type AuditResourceType =
  | 'User'
  | 'Organization'
  | 'Membership'
  | 'ShareType'
  | 'ShareIssuance'
  | 'ShareBalance'
  | 'Proposal'
  | 'ProposalOption'
  | 'Vote'
  | 'WebhookEndpoint'
  | 'OutboundEvent'
  | 'AuditEvent'
  | 'SystemConfiguration';

export type AuditOutcome = 'Success' | 'Failure' | 'Denied' | 'Partial';

export interface AuditEvent {
  id: string;
  timestamp: string;
  actorUserId?: string;
  actorDisplayName?: string;
  actorIpAddress?: string;
  actionType: AuditActionType;
  outcome: AuditOutcome;
  failureReason?: string;
  resourceType: AuditResourceType;
  resourceId: string;
  resourceName?: string;
  organizationId?: string;
  organizationName?: string;
  correlationId?: string;
}

export interface AuditEventDetails extends AuditEvent {
  details?: string;
}
