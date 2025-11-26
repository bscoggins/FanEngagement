import React, { useState } from 'react';
import { adminApi, type DevDataSeedingResult, type TestDataResetResult } from '../api/adminApi';

export const AdminDevToolsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DevDataSeedingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<TestDataResetResult | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSeedDevData = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const seedResult = await adminApi.seedDevData();
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
    if (!window.confirm('This will delete all organizations and non-admin users, then reseed sample data. Continue?')) {
      return;
    }
    setResetLoading(true);
    setResetError(null);
    setResetResult(null);
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

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Developer Tools</h1>
      <p>Admin-only tools for development and testing.</p>

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Seed Development Data</h2>
        <p>
          Populate the database with sample data for testing. This includes organizations, users,
          memberships, share types, issuances, proposals, and votes.
        </p>
        <p style={{ color: '#666', fontSize: '0.9em' }}>
          Note: This endpoint is only available in Development environment.
          Seeding is idempotent - running it multiple times will not create duplicate data.
        </p>

        <button
          onClick={handleSeedDevData}
          disabled={isLoading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
          }}
        >
          {isLoading ? 'Seeding...' : 'Seed Dev Data'}
        </button>

        {result && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>✓ Success!</h3>
            <p style={{ marginBottom: '10px' }}>Development data seeded successfully:</p>
            <ul style={{ marginBottom: 0 }}>
              <li>{result.organizationsCreated} organization(s) created</li>
              <li>{result.usersCreated} user(s) created</li>
              <li>{result.membershipsCreated} membership(s) created</li>
              <li>{result.shareTypesCreated} share type(s) created</li>
              <li>{result.shareIssuancesCreated} share issuance(s) created</li>
              <li>{result.proposalsCreated} proposal(s) created</li>
              <li>{result.votesCreated} vote(s) created</li>
            </ul>
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>✗ Error</h3>
            <p style={{ marginBottom: 0 }}>{error}</p>
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
        <h2>Full Reset to Original Seed Data</h2>
        <p>
          Delete all organizations and non-admin users, then restore the original sample data. Useful to get back to a clean baseline.
        </p>
        <p style={{ color: '#666', fontSize: '0.9em' }}>
          Note: Available only in Development/Demo. This action is destructive.
        </p>

        <button
          onClick={handleResetDevData}
          disabled={resetLoading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: resetLoading ? '#ccc' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: resetLoading ? 'not-allowed' : 'pointer',
            marginTop: '10px',
          }}
        >
          {resetLoading ? 'Resetting...' : 'Reset to Seed Data'}
        </button>

        {resetResult && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#d4edda',
              color: '#155724',
              border: '1px solid #c3e6cb',
              borderRadius: '4px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>✓ Reset Complete</h3>
            <ul style={{ marginBottom: 0 }}>
              <li>{resetResult.organizationsDeleted} organization(s) deleted</li>
              <li>{resetResult.nonAdminUsersDeleted} non-admin user(s) deleted</li>
              <li>Seeded: {resetResult.seedResult.organizationsCreated} org(s), {resetResult.seedResult.usersCreated} user(s), {resetResult.seedResult.membershipsCreated} membership(s), {resetResult.seedResult.shareTypesCreated} share type(s), {resetResult.seedResult.shareIssuancesCreated} issuance(s), {resetResult.seedResult.proposalsCreated} proposal(s), {resetResult.seedResult.votesCreated} vote(s)</li>
            </ul>
          </div>
        )}

        {resetError && (
          <div
            style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
            }}
          >
            <h3 style={{ marginTop: 0 }}>✗ Error</h3>
            <p style={{ marginBottom: 0 }}>{resetError}</p>
          </div>
        )}
      </div>
    </div>
  );
};
