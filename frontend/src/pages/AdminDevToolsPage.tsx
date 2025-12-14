import React, { useEffect, useState } from 'react';
import { adminApi, type DevDataSeedingResult, type TestDataResetResult, type SeedScenario, type SeedScenarioInfo } from '../api/adminApi';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import './AdminPage.css';

const DEFAULT_SCENARIOS: SeedScenarioInfo[] = [
  { scenario: 'BasicDemo', name: 'Basic Demo', description: 'Basic demo data with organizations, users, and proposals.' },
  { scenario: 'HeavyProposals', name: 'Heavy Proposals', description: 'Many proposals for pagination testing.' },
  { scenario: 'WebhookFailures', name: 'Webhook Failures', description: 'Webhook events with various statuses for observability testing.' }
];

export const AdminDevToolsPage: React.FC = () => {
  const [scenarios, setScenarios] = useState<SeedScenarioInfo[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<SeedScenario>('BasicDemo');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DevDataSeedingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<TestDataResetResult | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const scenarioList = await adminApi.getSeedScenarios();
        setScenarios(scenarioList.length ? scenarioList : DEFAULT_SCENARIOS);
      } catch {
        // Ensure UI always has at least the default scenarios
        setScenarios(DEFAULT_SCENARIOS);
      }
    };
    fetchScenarios();
  }, []);

  const handleSeedDevData = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const seedResult = await adminApi.seedDevData(selectedScenario);
      setResult(seedResult);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response) {
          const status = axiosError.response.status;
          const message = axiosError.response.data?.message || '';
          setError(`Error ${status}: ${message || 'Failed to seed dev data'}`);
        } else {
          setError('Cannot connect to server. Please ensure the API is running.');
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDevData = async () => {
    setResetLoading(true);
    setResetError(null);
    setResetResult(null);
    setShowResetConfirmModal(false);
    try {
      const res = await adminApi.resetDevData();
      setResetResult(res);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response) {
          const status = axiosError.response.status;
          const message = axiosError.response.data?.message || '';
          setResetError(`Error ${status}: ${message || 'Failed to reset data'}`);
        } else {
          setResetError('Cannot connect to server. Please ensure the API is running.');
        }
      } else {
        setResetError('An unexpected error occurred');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const selectedScenarioInfo = scenarios.find(s => s.scenario === selectedScenario);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Developer Tools</h1>
          <div className="admin-page-subtitle">Admin-only tools for development and testing.</div>
        </div>
      </div>

      <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-5)' }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Seed Development Data</h2>
          <p className="admin-secondary-text" style={{ marginBottom: 0 }}>
            Populate the database with sample data for testing. Choose a scenario based on what you want to validate.
          </p>
        </div>

        <div>
          <span className="admin-form-label">Select Scenario</span>
          <div
            className="scenario-grid"
            role="radiogroup"
            aria-label="Seed scenarios"
            aria-live="polite"
          >
            {scenarios.map((s) => {
              const isSelected = s.scenario === selectedScenario;
              return (
                <button
                  key={s.scenario}
                  type="button"
                  className={`scenario-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedScenario(s.scenario as SeedScenario)}
                  aria-pressed={isSelected}
                  aria-label={`${s.name} scenario`}
                  disabled={isLoading}
                >
                  <div className="scenario-option__header">
                    <span className="admin-pill admin-pill-accent">{s.name}</span>
                    <span className="scenario-option__slug">{s.scenario}</span>
                  </div>
                  <p className="scenario-option__description">{s.description}</p>
                  {isSelected && <span className="scenario-option__selected">Selected</span>}
                </button>
              );
            })}
          </div>
        </div>

        <p className="admin-secondary-text" style={{ margin: 0 }}>
          Note: This endpoint is only available in Development environments. Seeding is idempotent—rerunning it will not create duplicate records.
        </p>

        <Button
          onClick={handleSeedDevData}
          disabled={isLoading}
          isLoading={isLoading}
          variant="primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {isLoading ? 'Seeding...' : `Seed ${selectedScenarioInfo?.name || 'Dev Data'}`}
        </Button>

        {result && (
          <div className="admin-alert admin-alert-success">
            <h3 style={{ marginTop: 0 }}>Success ({result.scenario})</h3>
            <p style={{ marginBottom: 'var(--spacing-2)' }}>Development data seeded successfully:</p>
            <ul style={{ margin: 0, paddingLeft: 'var(--spacing-5)' }}>
              <li>{result.organizationsCreated} organization(s) created</li>
              <li>{result.usersCreated} user(s) created</li>
              <li>{result.membershipsCreated} membership(s) created</li>
              <li>{result.shareTypesCreated} share type(s) created</li>
              <li>{result.shareIssuancesCreated} share issuance(s) created</li>
              <li>{result.proposalsCreated} proposal(s) created</li>
              <li>{result.votesCreated} vote(s) created</li>
              {result.webhookEndpointsCreated > 0 && (
                <li>{result.webhookEndpointsCreated} webhook endpoint(s) created</li>
              )}
              {result.outboundEventsCreated > 0 && (
                <li>{result.outboundEventsCreated} outbound event(s) created</li>
              )}
            </ul>
          </div>
        )}

        {error && (
          <div className="admin-alert admin-alert-error">
            <h3 style={{ marginTop: 0 }}>Error</h3>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </div>
        )}
      </div>

      <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Full Reset to Original Seed Data</h2>
          <p className="admin-secondary-text" style={{ marginBottom: 0 }}>
            Delete all organizations and non-admin users, then restore the original sample data. This action is destructive and only available in Development/Demo.
          </p>
        </div>

        <Button
          onClick={() => setShowResetConfirmModal(true)}
          disabled={resetLoading}
          isLoading={resetLoading}
          variant="danger"
          style={{ alignSelf: 'flex-start' }}
        >
          {resetLoading ? 'Resetting...' : 'Reset to Seed Data'}
        </Button>

        {resetResult && (
          <div className="admin-alert admin-alert-success">
            <h3 style={{ marginTop: 0 }}>Reset Complete</h3>
            <ul style={{ margin: 0, paddingLeft: 'var(--spacing-5)' }}>
              <li>{resetResult.organizationsDeleted} organization(s) deleted</li>
              <li>{resetResult.nonAdminUsersDeleted} non-admin user(s) deleted</li>
              <li>
                Seeded: {resetResult.seedResult.organizationsCreated} org(s), {resetResult.seedResult.usersCreated} user(s), {resetResult.seedResult.membershipsCreated} membership(s), {resetResult.seedResult.shareTypesCreated} share type(s), {resetResult.seedResult.shareIssuancesCreated} issuance(s), {resetResult.seedResult.proposalsCreated} proposal(s), {resetResult.seedResult.votesCreated} vote(s)
              </li>
            </ul>
          </div>
        )}

        {resetError && (
          <div className="admin-alert admin-alert-error">
            <h3 style={{ marginTop: 0 }}>Error</h3>
            <p style={{ marginBottom: 0 }}>{resetError}</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showResetConfirmModal}
        onClose={() => setShowResetConfirmModal(false)}
        title="Confirm Reset"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResetConfirmModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleResetDevData}>
              Reset Data
            </Button>
          </>
        }
      >
        <p>This will delete all organizations and non-admin users, then reseed sample data.</p>
        <p className="mb-0">
          <strong>This action cannot be undone.</strong> Are you sure you want to continue?
        </p>
      </Modal>
    </div>
  );
};
