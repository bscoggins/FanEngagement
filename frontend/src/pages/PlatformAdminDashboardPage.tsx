import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../api/usersApi';
import { organizationsApi } from '../api/organizationsApi';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { QuickActionCard } from '../components/QuickActionCard';
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
        <QuickActionCard
          to="/admin/organizations/new"
          icon="➕"
          iconBgClass="bg-light-blue"
          title="Create Organization"
          description="Set up a new organization with custom governance and share types."
          actionText="Create new"
          testId="create-organization-card"
        />
        
        <QuickActionCard
          to="/admin/users"
          icon="👥"
          iconBgClass="bg-light-purple"
          title="Manage Users"
          description="View, create, and manage user accounts across the platform."
          actionText="Go to Users"
          testId="manage-users-card"
        />
        
        <QuickActionCard
          to="/admin/organizations"
          icon="🏢"
          iconBgClass="bg-light-green"
          title="View Organizations"
          description="Browse and configure all organizations and their settings."
          actionText="Go to Organizations"
          testId="manage-organizations-card"
        />
        
        <QuickActionCard
          to="/admin/dev-tools"
          icon="🛠️"
          iconBgClass="bg-light-orange"
          title="Dev Tools"
          description="Development utilities for seeding data and testing."
          actionText="Go to Dev Tools"
          testId="dev-tools-card"
        />
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
