import type { APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:5049';

export type LoginResult = {
  token: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
};

export async function loginViaApi(request: APIRequestContext, email: string, password: string): Promise<LoginResult> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: { email, password },
  });

  if (response.status() !== 200) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${response.statusText()}`);
  }

  const body = await response.json();
  return {
    token: body.token,
    userId: body.userId,
    email: body.email,
    displayName: body.displayName,
    role: body.role,
  };
}

export async function seedDevData(request: APIRequestContext, token: string): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/admin/seed-dev-data`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed dev data: ${response.status()} ${response.statusText()}`);
  }
}

export async function getUserByEmail(request: APIRequestContext, token: string, email: string) {
  const response = await request.get(`${API_BASE_URL}/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to load users: ${response.status()} ${response.statusText()}`);
  }

  const users = await response.json();
  return users.find((u: { email: string }) => u.email === email);
}

export async function getShareTypeIdByName(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  shareTypeName: string,
) {
  const response = await request.get(`${API_BASE_URL}/organizations/${organizationId}/share-types`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to load share types: ${response.status()} ${response.statusText()}`);
  }

  const shareTypes = await response.json();
  const match = shareTypes.find((s: { name: string }) => s.name === shareTypeName);

  if (!match) {
    throw new Error(`Share type ${shareTypeName} not found for org ${organizationId}`);
  }

  return match.id as string;
}

export async function issueShares(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  shareTypeId: string,
  userId: string,
  quantity: number,
) {
  const response = await request.post(`${API_BASE_URL}/organizations/${organizationId}/share-issuances`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      shareTypeId,
      userId,
      quantity,
      reason: 'E2E test issuance',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to issue shares: ${response.status()} ${response.statusText()}`);
  }
}

export async function getLatestProposalId(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  title: string,
) {
  const response = await request.get(`${API_BASE_URL}/organizations/${organizationId}/proposals`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to load proposals: ${response.status()} ${response.statusText()}`);
  }

  const proposals = await response.json();
  const match = proposals.find((p: { title: string }) => p.title === title);
  if (!match) {
    throw new Error(`Proposal titled ${title} not found for org ${organizationId}`);
  }
  return match.id as string;
}
