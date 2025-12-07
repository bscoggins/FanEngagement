import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { parseApiError } from '../utils/errorUtils';

interface PlatformStats {
  totalUsers: number;
  totalOrganizations: number;
  activeProposals: number;
  recentWebhookFailures: number;
}

export const PlatformAdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch users and organizations in parallel
      const [users, organizations] = await Promise.all([
        usersApi.getAll(),
        organizationsApi.getAll(),
      ]);

      // For active proposals, we would need to aggregate across all orgs
      // For now, we'll use a placeholder since we don't have a platform-wide endpoint
      // Similarly for webhook failures

      setStats({
        totalUsers: users.length,
        totalOrganizations: organizations.length,
        activeProposals: 0, // Placeholder - would need platform-wide endpoint
        recentWebhookFailures: 0, // Placeholder - would need platform-wide endpoint
      });
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return <LoadingSpinner message="Loading platform statistics..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchStats} />;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }} data-testid="platform-admin-dashboard">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#333' }} data-testid="platform-overview-heading">
          Platform Overview
        </h1>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Manage and monitor all aspects of the FanEngagement platform.
        </p>
      </div>

      {/* Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
        data-testid="stats-grid"
      >
        {/* Total Users */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            textAlign: 'center',
          }}
          data-testid="users-stat-card"
        >
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#007bff' }}>
            {stats?.totalUsers ?? 0}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Total Users</div>
        </div>

        {/* Total Organizations */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            textAlign: 'center',
          }}
          data-testid="organizations-stat-card"
        >
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#28a745' }}>
            {stats?.totalOrganizations ?? 0}
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Total Organizations</div>
        </div>

        {/* Active Proposals */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            textAlign: 'center',
            position: 'relative',
          }}
          data-testid="proposals-stat-card"
        >
          <span style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '0.125rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.625rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            Coming Soon
          </span>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6c757d' }}>
            —
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Active Proposals</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
            Platform-wide aggregation pending
          </div>
        </div>

        {/* Webhook Failures */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            textAlign: 'center',
            position: 'relative',
          }}
          data-testid="webhook-failures-stat-card"
        >
          <span style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '0.125rem 0.5rem',
            borderRadius: '4px',
            fontSize: '0.625rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
          }}>
            Coming Soon
          </span>
          <div style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            color: '#6c757d'
          }}>
            —
          </div>
          <div style={{ color: '#666', marginTop: '0.5rem' }}>Recent Webhook Failures</div>
          <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
            Platform-wide aggregation pending
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <h2 style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem' }}>Quick Actions</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem',
        }}
        data-testid="quick-actions-grid"
      >
        {/* Create Organization */}
        <Link
          to="/admin/organizations/new"
          style={{ textDecoration: 'none' }}
          data-testid="create-organization-card"
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2rem',
                marginRight: '0.75rem',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
              }}>
                🏢
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#333', fontWeight: 600 }}>Create Organization</h3>
            </div>
            <p style={{ color: '#666', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Set up a new organization with custom governance and share types.
            </p>
            <div style={{ marginTop: '1rem', color: '#007bff', fontWeight: 500, fontSize: '0.875rem' }}>
              Create new →
            </div>
          </div>
        </Link>

        {/* Manage Users */}
        <Link
          to="/admin/users"
          style={{ textDecoration: 'none' }}
          data-testid="manage-users-card"
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2rem',
                marginRight: '0.75rem',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f3e5f5',
                borderRadius: '8px',
              }}>
                👥
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#333', fontWeight: 600 }}>Manage Users</h3>
            </div>
            <p style={{ color: '#666', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              View, create, and manage user accounts across the platform.
            </p>
            <div style={{ marginTop: '1rem', color: '#007bff', fontWeight: 500, fontSize: '0.875rem' }}>
              Go to Users →
            </div>
          </div>
        </Link>

        {/* Manage Organizations */}
        <Link
          to="/admin/organizations"
          style={{ textDecoration: 'none' }}
          data-testid="manage-organizations-card"
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2rem',
                marginRight: '0.75rem',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
              }}>
                🏢
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#333', fontWeight: 600 }}>View Organizations</h3>
            </div>
            <p style={{ color: '#666', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Browse and configure all organizations and their settings.
            </p>
            <div style={{ marginTop: '1rem', color: '#007bff', fontWeight: 500, fontSize: '0.875rem' }}>
              Go to Organizations →
            </div>
          </div>
        </Link>

        {/* Dev Tools */}
        <Link
          to="/admin/dev-tools"
          style={{ textDecoration: 'none' }}
          data-testid="dev-tools-card"
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              padding: '1.5rem',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              height: '100%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{
                fontSize: '2rem',
                marginRight: '0.75rem',
                width: '48px',
                height: '48px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
              }}>
                🛠️
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#333', fontWeight: 600 }}>Dev Tools</h3>
            </div>
            <p style={{ color: '#666', margin: 0, fontSize: '0.875rem', lineHeight: 1.5 }}>
              Development utilities for seeding data and testing.
            </p>
            <div style={{ marginTop: '1rem', color: '#007bff', fontWeight: 500, fontSize: '0.875rem' }}>
              Go to Dev Tools →
            </div>
          </div>
        </Link>
      </div>

      {/* Platform Admin Info */}
      <div
        style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeeba',
        }}
        data-testid="platform-admin-info"
      >
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: '1rem' }}>
          🔐 Platform Administrator Access
        </h3>
        <p style={{ margin: 0, color: '#856404', fontSize: '0.875rem' }}>
          You have full platform administrator privileges. This grants you access to all organizations,
          users, and system-wide settings. Please use these capabilities responsibly.
        </p>
      </div>
    </div>
  );
};
