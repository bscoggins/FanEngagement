import React, { useState } from 'react';
import { adminApi, type DevDataSeedingResult } from '../api/adminApi';
import { useAuth } from '../auth/AuthContext';
import { Navigate } from 'react-router-dom';

export const AdminDevToolsPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DevDataSeedingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admins
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

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
    </div>
  );
};
