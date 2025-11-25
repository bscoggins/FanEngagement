import { Page, APIRequestContext } from '@playwright/test';

/**
 * Generate a unique identifier for test data
 * Uses timestamp + random string to ensure uniqueness
 */
export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique name with prefix
 */
export function generateUniqueName(prefix: string): string {
  return `${prefix}-${generateUniqueId()}`;
}

/**
 * Seed development data using the admin API endpoint.
 * 
 * This function navigates to the admin dev-tools page and triggers the seed
 * operation. It's useful when you need a pre-populated database for tests
 * that don't want to set up all data programmatically.
 * 
 * **Prerequisites:**
 * - Must be logged in as admin
 * - Backend must be in Development mode
 * 
 * **When to use:**
 * - When tests need a realistic data set
 * - When testing against seeded development data
 * - Not recommended for isolated tests that need specific data states
 * 
 * @example
 * ```typescript
 * test.beforeAll(async ({ page }) => {
 *   await loginAsAdmin(page);
 *   await seedDevData(page);
 * });
 * ```
 */
export async function seedDevData(page: Page): Promise<void> {
  // Navigate to dev tools page and seed data
  await page.goto('/admin/dev-tools');
  
  // Click the seed button if available
  const seedButton = page.getByRole('button', { name: /seed/i });
  if (await seedButton.isVisible()) {
    await seedButton.click();
    // Wait for seed operation to complete by checking for success message
    await page.getByText(/seeded|success|complete/i).waitFor({ state: 'visible', timeout: 10000 });
  }
}

/**
 * Create an organization via the API
 */
export async function createOrganization(
  request: APIRequestContext,
  token: string,
  name: string,
  description?: string
): Promise<{ id: string; name: string }> {
  const response = await request.post('/api/organizations', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: description || `Test organization ${name}`,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to create organization: ${response.status()}`);
  }
  
  return await response.json();
}

/**
 * Create a user via the API
 */
export async function createUser(
  request: APIRequestContext,
  token: string,
  email: string,
  password: string,
  displayName: string
): Promise<{ id: string; email: string }> {
  const response = await request.post('/api/users', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
      displayName,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to create user: ${response.status()}`);
  }
  
  return await response.json();
}

/**
 * Get auth token via login API
 */
export async function getAuthToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const response = await request.post('/api/auth/login', {
    headers: {
      'Content-Type': 'application/json',
    },
    data: {
      email,
      password,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to login: ${response.status()}`);
  }
  
  const data = await response.json();
  return data.token;
}

/**
 * Add membership to organization
 */
export async function addMembership(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  userId: string,
  role: 'Member' | 'OrgAdmin' = 'Member'
): Promise<void> {
  const response = await request.post(`/api/organizations/${organizationId}/memberships`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      userId,
      role,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to add membership: ${response.status()}`);
  }
}

/**
 * Create a share type for an organization
 */
export async function createShareType(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  name: string,
  votingWeight: number = 1
): Promise<{ id: string; name: string }> {
  const response = await request.post(`/api/organizations/${organizationId}/share-types`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      name,
      description: `Share type ${name}`,
      votingWeight,
    },
  });
  
  if (!response.ok()) {
    const errorBody = await response.text().catch(() => 'No error body');
    throw new Error(`Failed to create share type: ${response.status()} - ${errorBody}`);
  }
  
  return await response.json();
}

/**
 * Issue shares to a user
 */
export async function issueShares(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  userId: string,
  shareTypeId: string,
  amount: number
): Promise<void> {
  const response = await request.post(`/api/organizations/${organizationId}/share-issuances`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      userId,
      shareTypeId,
      amount,
      reason: 'E2E test issuance',
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to issue shares: ${response.status()}`);
  }
}

/**
 * Create a proposal with options
 */
export async function createProposal(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  createdByUserId: string,
  title: string,
  options: string[]
): Promise<{ id: string; title: string }> {
  // Create proposal
  const createResponse = await request.post(`/api/organizations/${organizationId}/proposals`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      title,
      description: `Test proposal: ${title}`,
      createdByUserId,
      quorumRequirement: 0.5, // 50% quorum
    },
  });
  
  if (!createResponse.ok()) {
    throw new Error(`Failed to create proposal: ${createResponse.status()}`);
  }
  
  const proposal = await createResponse.json();
  
  // Add options
  for (const optionText of options) {
    const optionResponse = await request.post(`/api/proposals/${proposal.id}/options`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        text: optionText,
      },
    });
    
    if (!optionResponse.ok()) {
      throw new Error(`Failed to add option: ${optionResponse.status()}`);
    }
  }
  
  return proposal;
}

/**
 * Open a proposal for voting
 */
export async function openProposal(
  request: APIRequestContext,
  token: string,
  proposalId: string
): Promise<void> {
  const response = await request.post(`/api/proposals/${proposalId}/open`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to open proposal: ${response.status()}`);
  }
}

/**
 * Close a proposal
 */
export async function closeProposal(
  request: APIRequestContext,
  token: string,
  proposalId: string
): Promise<void> {
  const response = await request.post(`/api/proposals/${proposalId}/close`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to close proposal: ${response.status()}`);
  }
}

/**
 * Cast a vote on a proposal
 */
export async function castVote(
  request: APIRequestContext,
  token: string,
  proposalId: string,
  optionId: string
): Promise<void> {
  const response = await request.post(`/api/proposals/${proposalId}/votes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      optionId,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to cast vote: ${response.status()}`);
  }
}

/**
 * Get proposal with options
 */
export async function getProposal(
  request: APIRequestContext,
  token: string,
  proposalId: string
): Promise<{ id: string; options: Array<{ id: string; text: string }> }> {
  const response = await request.get(`/api/proposals/${proposalId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to get proposal: ${response.status()}`);
  }
  
  return await response.json();
}

/**
 * Create a webhook endpoint
 */
export async function createWebhookEndpoint(
  request: APIRequestContext,
  token: string,
  organizationId: string,
  url: string,
  eventTypes: string[]
): Promise<{ id: string }> {
  const response = await request.post(`/api/organizations/${organizationId}/webhooks`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      url,
      eventTypes,
      isActive: true,
    },
  });
  
  if (!response.ok()) {
    throw new Error(`Failed to create webhook: ${response.status()}`);
  }
  
  return await response.json();
}
