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
  role: string;
  createdAt: string;
}

export interface MembershipWithOrganizationDto {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  role: string;
  createdAt: string;
}

export interface MembershipWithUserDto {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  role: string;
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
