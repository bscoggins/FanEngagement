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
  createdAt: string;
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
