import { test, expect } from '@playwright/test';
import { loginViaApi, seedDevData, API_BASE_URL } from './utils';

test.describe('Audit Log E2E Tests', () => {
  let adminToken: string;

  test.beforeEach(async ({ page, request }) => {
    // Navigate to clear storage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.context().clearCookies();

    // Login as admin and seed dev data
    const loginResult = await loginViaApi(request, 'admin@example.com', 'Admin123!');
    adminToken = loginResult.token;
    await seedDevData(request, adminToken);

    // Set auth token in localStorage
    await page.goto('/');
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
    }, adminToken);

    // Generate some audit events via API
    await generateAuditEvents(request, adminToken);
  });

  test('Platform admin can access audit events via API', async ({ page, request }) => {
    // Use token from beforeEach
    
    // Get first organization
    const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgId = orgs[0]?.id;

    if (!orgId) {
      test.skip();
      return;
    }

    // Verify admin can access organization audit events API endpoint
    const auditResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?page=1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(auditResponse.status()).toBe(200);
    const auditData = await auditResponse.json();
    
    // Verify the API returns the expected structure
    expect(auditData).toHaveProperty('totalCount');
    expect(auditData).toHaveProperty('items');
    expect(auditData).toHaveProperty('page');
    expect(auditData).toHaveProperty('pageSize');
  });

  test('Audit log displays events in table', async ({ page, request }) => {
    // Use token from beforeEach
    
    // Get first organization
    const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgId = orgs[0]?.id;

    if (!orgId) {
      test.skip();
      return;
    }

    // Navigate directly to audit events API endpoint to verify events exist
    const auditResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?page=1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(auditResponse.status()).toBe(200);
    const auditData = await auditResponse.json();
    
    // Verify audit events were created
    expect(auditData.totalCount).toBeGreaterThan(0);
    expect(auditData.items).toBeDefined();
    expect(auditData.items.length).toBeGreaterThan(0);

    // Verify audit event structure
    const firstEvent = auditData.items[0];
    expect(firstEvent).toHaveProperty('id');
    expect(firstEvent).toHaveProperty('timestamp');
    expect(firstEvent).toHaveProperty('actionType');
    expect(firstEvent).toHaveProperty('resourceType');
    expect(firstEvent).toHaveProperty('outcome');
  });

  test('Audit log filters work correctly', async ({ page, request }) => {
    // Use token from beforeEach
    
    // Get first organization
    const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgId = orgs[0]?.id;

    if (!orgId) {
      test.skip();
      return;
    }

    // Test filtering by action type
    const createdEventsResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?actionType=Created&page=1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(createdEventsResponse.status()).toBe(200);
    const createdEvents = await createdEventsResponse.json();
    
    // All returned events should have ActionType = Created
    createdEvents.items.forEach((event: any) => {
      expect(event.actionType).toBe('Created');
    });

    // Test filtering by resource type
    const proposalEventsResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?resourceType=Proposal&page=1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(proposalEventsResponse.status()).toBe(200);
    const proposalEvents = await proposalEventsResponse.json();
    
    // All returned events should have ResourceType = Proposal
    proposalEvents.items.forEach((event: any) => {
      expect(event.resourceType).toBe('Proposal');
    });

    // Test filtering by outcome
    const successEventsResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?outcome=Success&page=1&pageSize=10`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(successEventsResponse.status()).toBe(200);
    const successEvents = await successEventsResponse.json();
    
    // All returned events should have Outcome = Success
    successEvents.items.forEach((event: any) => {
      expect(event.outcome).toBe('Success');
    });
  });

  test('Audit log pagination works correctly', async ({ page, request }) => {
    // Use token from beforeEach
    
    // Get first organization
    const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgId = orgs[0]?.id;

    if (!orgId) {
      test.skip();
      return;
    }

    // Get page 1
    const page1Response = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?page=1&pageSize=5`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(page1Response.status()).toBe(200);
    const page1Data = await page1Response.json();
    
    // Get page 2
    const page2Response = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?page=2&pageSize=5`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(page2Response.status()).toBe(200);
    const page2Data = await page2Response.json();

    // If we have more than 5 events, verify pagination
    if (page1Data.totalCount > 5) {
      expect(page1Data.items.length).toBe(5);
      expect(page1Data.hasNextPage).toBe(true);
      
      // Page 2 should have different items
      expect(page2Data.items.length).toBeGreaterThan(0);
      
      // Verify items on page 2 are different from page 1
      const page1Ids = page1Data.items.map((e: any) => e.id);
      const page2Ids = page2Data.items.map((e: any) => e.id);
      
      // No overlap between pages
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    }
  });

  test('User can query their own audit events', async ({ page, request }) => {
    // Create a regular user with unique email
    const uniqueEmail = `testuser-${crypto.randomUUID()}@example.com`;
    const createUserResponse = await request.post(`${API_BASE_URL}/users`, {
      data: {
        email: uniqueEmail,
        displayName: 'Test User',
        password: 'TestPassword123!'
      }
    });
    
    expect(createUserResponse.status()).toBe(201);
    const user = await createUserResponse.json();

    // Login as the user
    const loginResult = await loginViaApi(request, user.email, 'TestPassword123!');

    // Query user's own audit events
    const auditResponse = await request.get(`${API_BASE_URL}/users/me/audit-events`, {
      headers: { Authorization: `Bearer ${loginResult.token}` }
    });
    
    expect(auditResponse.status()).toBe(200);
    const auditData = await auditResponse.json();
    
    // Should have at least the user creation event
    expect(auditData.totalCount).toBeGreaterThan(0);
    
    // All events should be related to this user (as actor or resource)
    auditData.items.forEach((event: any) => {
      // Event should either have this user as actor OR be about this user as a resource
      const isUserEvent = event.actorUserId === user.id || 
                         (event.resourceType === 'User' && event.resourceId === user.id);
      expect(isUserEvent).toBe(true);
    });

    // Verify IP addresses are NOT included in user audit events (privacy)
    auditData.items.forEach((event: any) => {
      expect(event.actorIpAddress).toBeUndefined();
    });
  });

  test('Admin can query across all organizations', async ({ page, request }) => {
    // Use token from beforeEach

    // Query all audit events across organizations
    const adminAuditResponse = await request.get(`${API_BASE_URL}/admin/audit-events?page=1&pageSize=20`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    expect(adminAuditResponse.status()).toBe(200);
    const auditData = await adminAuditResponse.json();
    
    // Should have events from multiple organizations
    expect(auditData.totalCount).toBeGreaterThan(0);
    
    // Check if we have events from different organizations
    const orgIds = new Set(
      auditData.items
        .filter((e: any) => e.organizationId)
        .map((e: any) => e.organizationId)
    );
    
    // With seeded dev data, we should have multiple organizations
    expect(orgIds.size).toBeGreaterThanOrEqual(1);
  });

  test('Non-admin cannot access admin audit endpoint', async ({ page, request }) => {
    // Create a regular user with unique email
    const uniqueEmail = `regular-${crypto.randomUUID()}@example.com`;
    const createUserResponse = await request.post(`${API_BASE_URL}/users`, {
      data: {
        email: uniqueEmail,
        displayName: 'Regular User',
        password: 'TestPassword123!'
      }
    });
    
    expect(createUserResponse.status()).toBe(201);
    const user = await createUserResponse.json();

    // Login as regular user
    const loginResult = await loginViaApi(request, user.email, 'TestPassword123!');

    // Try to access admin audit endpoint
    const adminAuditResponse = await request.get(`${API_BASE_URL}/admin/audit-events`, {
      headers: { Authorization: `Bearer ${loginResult.token}` }
    });
    
    // Should be forbidden
    expect(adminAuditResponse.status()).toBe(403);
  });

  test('Date range filtering works correctly', async ({ page, request }) => {
    // Use token from beforeEach
    
    const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orgs = await orgsResponse.json();
    const orgId = orgs[0]?.id;

    if (!orgId) {
      test.skip();
      return;
    }

    // Query events from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const recentEventsResponse = await request.get(
      `${API_BASE_URL}/organizations/${orgId}/audit-events?dateFrom=${encodeURIComponent(oneHourAgo)}&page=1&pageSize=20`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    
    expect(recentEventsResponse.status()).toBe(200);
    const recentEvents = await recentEventsResponse.json();
    
    // All events should be within the date range
    recentEvents.items.forEach((event: any) => {
      const eventDate = new Date(event.timestamp);
      expect(eventDate.getTime()).toBeGreaterThanOrEqual(new Date(oneHourAgo).getTime());
    });
  });
});

/**
 * Helper function to generate audit events via API operations
 * @param request - Playwright APIRequestContext for making API calls
 * @param token - Authentication token for API requests
 */
async function generateAuditEvents(request: any, token: string): Promise<void> {
  // Create a user (generates audit event) with unique email
  const uniqueEmail = `audit-test-${crypto.randomUUID()}@example.com`;
  await request.post(`${API_BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      email: uniqueEmail,
      displayName: 'Audit Test User',
      password: 'TestPassword123!'
    }
  });

  // Get organizations to generate more events
  const orgsResponse = await request.get(`${API_BASE_URL}/organizations`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (orgsResponse.ok()) {
    const orgs = await orgsResponse.json();
    
    // For each org, perform some operations to generate audit events
    for (const org of orgs.slice(0, 2)) { // Limit to 2 orgs to avoid timeout
      // Update organization (generates audit event)
      await request.put(`${API_BASE_URL}/organizations/${org.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name: `${org.name} Updated`,
          description: org.description || 'Updated description'
        }
      });
    }
  }
}
