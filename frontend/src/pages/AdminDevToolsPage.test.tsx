import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AdminDevToolsPage } from './AdminDevToolsPage';
import { adminApi, type SeedScenarioInfo } from '../api/adminApi';

// Mock the adminApi
vi.mock('../api/adminApi', () => ({
  adminApi: {
    seedDevData: vi.fn(),
    getSeedScenarios: vi.fn(),
  },
}));

describe('AdminDevToolsPage', () => {
  const mockScenarios: SeedScenarioInfo[] = [
    { scenario: 'BasicDemo', name: 'Basic Demo', description: 'Basic demo data.' },
    { scenario: 'HeavyProposals', name: 'Heavy Proposals', description: 'Many proposals.' },
    { scenario: 'WebhookFailures', name: 'Webhook Failures', description: 'Webhook events.' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // Default mock for getSeedScenarios
    vi.mocked(adminApi.getSeedScenarios).mockResolvedValue(mockScenarios);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const renderAdminDevToolsPage = (isAdmin = true) => {
    // Set up auth state for admin or regular user
    const userRole = isAdmin ? 'Admin' : 'User';
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('authUser', JSON.stringify({
      token: 'test-token',
      userId: 'user-123',
      email: 'test@example.com',
      displayName: 'Test User',
      role: userRole,
    }));

    return render(
      <MemoryRouter initialEntries={['/admin/dev-tools']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin/dev-tools" element={<AdminDevToolsPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
  };

  const createMockResult = (overrides = {}) => ({
    scenario: 'BasicDemo',
    organizationsCreated: 2,
    usersCreated: 3,
    membershipsCreated: 4,
    shareTypesCreated: 3,
    shareIssuancesCreated: 5,
    proposalsCreated: 2,
    votesCreated: 2,
    webhookEndpointsCreated: 0,
    outboundEventsCreated: 0,
    ...overrides,
  });

  it('renders dev tools page for admin users', async () => {
    renderAdminDevToolsPage(true);

    expect(screen.getByText('Developer Tools')).toBeInTheDocument();
    expect(screen.getByText(/Admin-only tools for development and testing/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });
  });

  it('renders scenario selector', async () => {
    renderAdminDevToolsPage(true);

    await waitFor(() => {
      expect(screen.getByLabelText(/select scenario/i)).toBeInTheDocument();
    });
  });

  it('calls seedDevData API when button is clicked', async () => {
    const mockResult = createMockResult();
    vi.mocked(adminApi.seedDevData).mockResolvedValueOnce(mockResult);

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    await user.click(seedButton);

    expect(adminApi.seedDevData).toHaveBeenCalledWith('BasicDemo');
  });

  it('displays success message with summary after successful seeding', async () => {
    const mockResult = createMockResult();
    vi.mocked(adminApi.seedDevData).mockResolvedValueOnce(mockResult);

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    await user.click(seedButton);

    await waitFor(() => {
      expect(screen.getByText(/Success!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/2 organization\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/3 user\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/4 membership\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/3 share type\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/5 share issuance\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/2 proposal\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/2 vote\(s\) created/i)).toBeInTheDocument();
  });

  it('displays error message when API call fails', async () => {
    const mockError = {
      response: {
        status: 403,
        data: {
          message: 'This endpoint is only available in Development environment',
        },
      },
    };

    vi.mocked(adminApi.seedDevData).mockRejectedValueOnce(mockError);

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    await user.click(seedButton);

    await waitFor(() => {
      expect(screen.getByText(/Error 403:/i)).toBeInTheDocument();
    });
  });

  it('displays network error message when server is unreachable', async () => {
    vi.mocked(adminApi.seedDevData).mockRejectedValueOnce(new Error('Network error'));

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    await user.click(seedButton);

    await waitFor(() => {
      expect(screen.getByText(/An unexpected error occurred/i)).toBeInTheDocument();
    });
  });

  it('disables button while seeding is in progress', async () => {
    const mockResult = createMockResult();
    vi.mocked(adminApi.seedDevData).mockImplementation(() => {
      return new Promise(resolve => setTimeout(() => resolve(mockResult), 100));
    });

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    await user.click(seedButton);

    // Button should be disabled and show loading state
    await waitFor(() => {
      expect(screen.getByText(/Seeding\.\.\./i)).toBeInTheDocument();
    });

    const disabledButton = screen.getByRole('button', { name: /seeding/i });
    expect(disabledButton).toBeDisabled();
  });

  it('clears previous messages when seeding again', async () => {
    const mockResult = createMockResult();
    vi.mocked(adminApi.seedDevData).mockResolvedValue(mockResult);

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seed basic demo/i })).toBeInTheDocument();
    });

    const seedButton = screen.getByRole('button', { name: /seed basic demo/i });
    
    // First click - success
    await user.click(seedButton);
    await waitFor(() => {
      expect(screen.getByText(/Success!/i)).toBeInTheDocument();
    });

    // Second click - should clear previous success message during loading
    await user.click(seedButton);
    
    // Previous message should be cleared (though a new one will appear)
    await waitFor(() => {
      expect(screen.getAllByText(/Success!/i)).toHaveLength(1);
    });
  });

  it('displays webhook data when WebhookFailures scenario creates them', async () => {
    const mockResult = createMockResult({
      scenario: 'WebhookFailures',
      webhookEndpointsCreated: 3,
      outboundEventsCreated: 12,
    });
    vi.mocked(adminApi.seedDevData).mockResolvedValueOnce(mockResult);

    renderAdminDevToolsPage(true);
    const user = userEvent.setup();

    await waitFor(() => {
      expect(screen.getByLabelText(/select scenario/i)).toBeInTheDocument();
    });

    // Select WebhookFailures scenario
    const select = screen.getByLabelText(/select scenario/i);
    await user.selectOptions(select, 'WebhookFailures');

    const seedButton = screen.getByRole('button', { name: /seed webhook failures/i });
    await user.click(seedButton);

    await waitFor(() => {
      expect(screen.getByText(/Success!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/3 webhook endpoint\(s\) created/i)).toBeInTheDocument();
    expect(screen.getByText(/12 outbound event\(s\) created/i)).toBeInTheDocument();
  });
});
