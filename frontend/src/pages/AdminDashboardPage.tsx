import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { useActiveOrganization } from '../contexts/OrgContext';
import { membershipsApi } from '../api/membershipsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { proposalsApi } from '../api/proposalsApi';
import { outboundEventsApi } from '../api/outboundEventsApi';
import { auditEventsApi } from '../api/auditEventsApi';
import { QuickActionCard } from '../components/QuickActionCard';
import { ErrorMessage } from '../components/ErrorMessage';
import { parseApiError } from '../utils/errorUtils';
import { formatDate } from '../utils/auditUtils';
import type { AuditEvent, MembershipWithUserDto, Proposal } from '../types/api';
import { SkeletonCardGrid, SkeletonList, SkeletonTextLines } from '../components/Skeleton';

interface OrgDashboardStats {
  totalMembers: number;
  orgAdmins: number;
  shareTypes: number;
  totalProposals: number;
  activeProposals: number;
  draftProposals: number;
  failedWebhooks7d: number;
}

interface StatCardProps {
  label: string;
  value: number | undefined;
  description?: string;
  accentClass: string;
  testId: string;
}

const formatStatValue = (value: number | undefined): string => {
  if (value == null) {
    return '—';
  }
  return value.toLocaleString();
};

const StatCard: React.FC<StatCardProps> = ({ label, value, description, accentClass, testId }) => (
  <div
    className={`admin-dashboard-stat-card ${accentClass}`}
    data-testid={testId}
  >
    <div className="admin-secondary-text">{label}</div>
    <div className="admin-dashboard-stat-value">{formatStatValue(value)}</div>
    {description && <div className="admin-dashboard-stat-meta">{description}</div>}
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const { isGlobalAdmin, memberships, isLoading } = usePermissions();
  const { activeOrg, hasMultipleOrgs, isLoading: orgContextLoading } = useActiveOrganization();
  const navigate = useNavigate();

  const globalAdmin = isGlobalAdmin();

  const isActiveOrgAdmin = useMemo(() => {
    if (globalAdmin) return true;
    if (!activeOrg) return false;
    return memberships.some((m) => m.organizationId === activeOrg.id && m.role === 'OrgAdmin');
  }, [globalAdmin, activeOrg, memberships]);

  const hasOrgAdminMembership = useMemo(() => memberships.some((m) => m.role === 'OrgAdmin'), [memberships]);

  const [stats, setStats] = useState<OrgDashboardStats | null>(null);
  const [orgAdminContacts, setOrgAdminContacts] = useState<MembershipWithUserDto[]>([]);
  const [recentAuditEvents, setRecentAuditEvents] = useState<AuditEvent[]>([]);
  const [proposalHighlights, setProposalHighlights] = useState<Proposal[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    if (!activeOrg || !isActiveOrgAdmin) {
      return;
    }

    try {
      setLoadingDashboard(true);
      setDashboardError('');

      const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [orgMemberships, shareTypes, proposals, failedWebhooks, auditLog] = await Promise.all([
        membershipsApi.getByOrganizationWithUserDetails(activeOrg.id),
        shareTypesApi.getByOrganization(activeOrg.id),
        proposalsApi.getByOrganization(activeOrg.id),
        outboundEventsApi.getAll(activeOrg.id, { status: 'Failed', fromDate: sevenDaysAgoIso }),
        auditEventsApi.getByOrganization(activeOrg.id, { page: 1, pageSize: 5 }),
      ]);

      const activeProposals = proposals.filter((proposal) => proposal.status === 'Open');
      const draftProposals = proposals.filter((proposal) => proposal.status === 'Draft');
      const organizationAdmins = orgMemberships.filter((membership) => membership.role === 'OrgAdmin');

      setStats({
        totalMembers: orgMemberships.length,
        orgAdmins: organizationAdmins.length,
        shareTypes: shareTypes.length,
        totalProposals: proposals.length,
        activeProposals: activeProposals.length,
        draftProposals: draftProposals.length,
        failedWebhooks7d: failedWebhooks.length,
      });
      setOrgAdminContacts(organizationAdmins.slice(0, 3));
      setProposalHighlights(activeProposals.slice(0, 3));
      setRecentAuditEvents(auditLog.items.slice(0, 5));
    } catch (err) {
      setDashboardError(parseApiError(err));
    } finally {
      setLoadingDashboard(false);
    }
  }, [activeOrg, isActiveOrgAdmin]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!activeOrg) {
      setStats(null);
      setOrgAdminContacts([]);
      setProposalHighlights([]);
      setRecentAuditEvents([]);
    }
  }, [activeOrg]);

  useEffect(() => {
    if (!isLoading && activeOrg && !isActiveOrgAdmin) {
      navigate(`/me/organizations/${activeOrg.id}`, { replace: true });
    }
  }, [isLoading, activeOrg, isActiveOrgAdmin, navigate]);

  if (!isLoading && activeOrg && !isActiveOrgAdmin) {
    return null;
  }

  if ((isLoading || orgContextLoading) && !activeOrg) {
    return (
      <div className="admin-page" role="status" aria-live="polite">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <SkeletonTextLines count={2} widths={['60%', '40%']} />
          <SkeletonCardGrid items={3} linesPerCard={2} />
          <p className="admin-secondary-text">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  if (!globalAdmin && !isLoading && !hasOrgAdminMembership) {
    return (
      <div className="admin-page">
        <div className="admin-empty-state">
          <p style={{ marginBottom: '0.5rem' }}>You don't have administrator permissions for any organizations.</p>
          <p style={{ margin: 0 }}>Contact a platform administrator if you need access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page" data-testid="org-admin-dashboard">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Admin Dashboard</h1>
          <div className="admin-page-subtitle">
            {activeOrg
              ? `You're managing ${activeOrg.name}.`
              : 'Select an organization to begin administering it.'}
          </div>
        </div>
        {globalAdmin && (
          <Link to="/platform-admin/dashboard" className="admin-button admin-button-outline">
            Platform Admin Dashboard
          </Link>
        )}
      </div>

      {!activeOrg ? (
        <div className="admin-empty-state">
          <p style={{ marginBottom: '0.5rem' }}>Choose an organization from the header menu to view its insights.</p>
          <p style={{ margin: 0 }}>Need access? Reach out to a platform administrator.</p>
        </div>
      ) : (
        <>
          <div className="admin-card" data-testid="organization-overview-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
              <div>
                <div className="admin-secondary-text" style={{ marginBottom: '0.25rem' }}>Active Organization</div>
                <h2 style={{ margin: 0 }}>{activeOrg.name}</h2>
                <div className="admin-meta-text" style={{ marginTop: '0.5rem' }}>
                  {globalAdmin ? 'Platform Administrator (full access)' : 'Organization Administrator'}
                </div>
                {hasMultipleOrgs && (
                  <div className="admin-secondary-text" style={{ marginTop: 'var(--spacing-2)' }}>
                    Switch organizations anytime using the selector in the header.
                  </div>
                )}
              </div>
              <div className="admin-page-actions">
                <Link
                  className="admin-button admin-button-outline"
                  to={`/admin/organizations/${activeOrg.id}/edit`}
                >
                  Organization Settings
                </Link>
                <Link
                  className="admin-button admin-button-primary"
                  to={`/admin/organizations/${activeOrg.id}/memberships`}
                >
                  Manage Members
                </Link>
              </div>
            </div>
          </div>

          {dashboardError && (
            <ErrorMessage message={dashboardError} onRetry={fetchDashboardData} />
          )}

          {loadingDashboard && !stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }} role="status" aria-live="polite">
              <SkeletonCardGrid items={4} linesPerCard={2} />
              <SkeletonTextLines count={1} widths={['35%']} />
              <SkeletonList items={3} withAvatar={false} linesPerItem={2} />
              <p className="admin-secondary-text">Loading organization insights...</p>
            </div>
          ) : (
            <>
              <div className="admin-dashboard-stats-grid responsive-grid grid-min-220" data-testid="stats-grid">
                <StatCard
                  label="Members"
                  value={stats?.totalMembers}
                  description={stats ? `${stats.orgAdmins} org admins` : 'Counting members...'}
                  accentClass="accent-blue"
                  testId="members-stat-card"
                />
                <StatCard
                  label="Share Types"
                  value={stats?.shareTypes}
                  description={stats && stats.shareTypes > 0 ? 'Governance-ready' : 'Define share classes'}
                  accentClass="accent-teal"
                  testId="share-types-stat-card"
                />
                <StatCard
                  label="Active Proposals"
                  value={stats?.activeProposals}
                  description={
                    stats
                      ? `${stats.draftProposals} draft${stats.draftProposals === 1 ? '' : 's'} ready`
                      : 'Track participation'
                  }
                  accentClass="accent-orange"
                  testId="active-proposals-stat-card"
                />
                <StatCard
                  label="Failed Webhooks (7d)"
                  value={stats?.failedWebhooks7d}
                  description="Keep integrations healthy"
                  accentClass="accent-pink"
                  testId="webhook-failures-stat-card"
                />
              </div>

              <h2 style={{ marginTop: 'var(--spacing-6)' }}>Quick Actions</h2>
              <div className="admin-dashboard-quick-actions responsive-grid grid-min-260" data-testid="quick-actions-grid">
                <QuickActionCard
                  to={`/admin/organizations/${activeOrg.id}/memberships`}
                  icon="👥"
                  iconBgClass="bg-dark-gray"
                  title="Manage Members"
                  description="Invite members, update roles, and keep your roster current."
                  actionText="Go to Members"
                  testId="manage-members-card"
                />
                <QuickActionCard
                  to={`/admin/organizations/${activeOrg.id}/share-types`}
                  icon="⚖️"
                  iconBgClass="bg-indigo"
                  title="Share Types"
                  description="Configure voting power, supply caps, and transfer rules."
                  actionText="Edit Share Types"
                  testId="share-types-card"
                />
                <QuickActionCard
                  to={`/admin/organizations/${activeOrg.id}/proposals`}
                  icon="🗳️"
                  iconBgClass="bg-brown"
                  title="Proposals"
                  description="Draft, open, and finalize governance decisions."
                  actionText="Manage Proposals"
                  testId="proposals-card"
                />
                <QuickActionCard
                  to={`/admin/organizations/${activeOrg.id}/webhook-events`}
                  icon="🔔"
                  iconBgClass="bg-cyan"
                  title="Webhook Events"
                  description="Monitor outbound events and retry failed deliveries."
                  actionText="Review Events"
                  testId="webhooks-card"
                />
                <QuickActionCard
                  to={`/admin/organizations/${activeOrg.id}/audit-log`}
                  icon="📜"
                  iconBgClass="bg-slate"
                  title="Audit Log"
                  description="Trace critical changes and export compliance records."
                  actionText="View Audit Log"
                  testId="audit-log-card"
                />
              </div>

              <div className="admin-dashboard-panels responsive-grid grid-min-300">
                <div className="admin-card" data-testid="recent-activity-card">
                  <div className="admin-section-header">
                    <h3 style={{ margin: 0 }}>Recent Activity</h3>
                    <Link to={`/admin/organizations/${activeOrg.id}/audit-log`} className="admin-button admin-button-ghost">
                      Open Log
                    </Link>
                  </div>
                  {recentAuditEvents.length === 0 ? (
                    <p className="admin-secondary-text" style={{ marginBottom: 0 }}>
                      No recent administrator actions yet.
                    </p>
                  ) : (
                    <ul className="admin-dashboard-list">
                      {recentAuditEvents.map((event) => (
                        <li key={event.id} className="admin-dashboard-list-item">
                          <div>
                            <div style={{ fontWeight: 600 }}>{event.actionType}</div>
                            <div className="admin-secondary-text" style={{ fontSize: '0.85rem' }}>
                              {event.resourceType}
                              {event.resourceName ? ` · ${event.resourceName}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="admin-meta-text">{formatDate(event.timestamp)}</div>
                            <div className="admin-secondary-text" style={{ fontSize: '0.8rem' }}>
                              {event.actorDisplayName || 'System'}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="admin-card" data-testid="governance-card">
                  <div className="admin-section-header">
                    <h3 style={{ margin: 0 }}>Governance Snapshot</h3>
                    <Link to={`/admin/organizations/${activeOrg.id}/proposals`} className="admin-button admin-button-ghost">
                      Manage Proposals
                    </Link>
                  </div>
                  {proposalHighlights.length === 0 ? (
                    <p className="admin-secondary-text" style={{ marginBottom: 0 }}>
                      No open proposals right now. Create one to engage your members.
                    </p>
                  ) : (
                    <ul className="admin-dashboard-list">
                      {proposalHighlights.map((proposal) => (
                        <li key={proposal.id} className="admin-dashboard-list-item">
                          <div>
                            <div style={{ fontWeight: 600 }}>{proposal.title}</div>
                            <div className="admin-secondary-text" style={{ fontSize: '0.85rem' }}>
                              Status: {proposal.status}
                            </div>
                          </div>
                          <div className="admin-meta-text">
                            {proposal.endAt ? `Ends ${formatDate(proposal.endAt)}` : 'No end date'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="admin-card" data-testid="org-admin-contacts-card">
                  <div className="admin-section-header">
                    <h3 style={{ margin: 0 }}>Key Contacts</h3>
                    <Link to={`/admin/organizations/${activeOrg.id}/memberships`} className="admin-button admin-button-ghost">
                      Manage Access
                    </Link>
                  </div>
                  {orgAdminContacts.length === 0 ? (
                    <p className="admin-secondary-text" style={{ marginBottom: 0 }}>
                      Add another OrgAdmin so governance tasks are always covered.
                    </p>
                  ) : (
                    <ul className="admin-dashboard-list">
                      {orgAdminContacts.map((membership) => (
                        <li key={membership.id} className="admin-dashboard-list-item">
                          <div>
                            <div style={{ fontWeight: 600 }}>{membership.userDisplayName || membership.userEmail}</div>
                            <div className="admin-secondary-text" style={{ fontSize: '0.85rem' }}>{membership.userEmail}</div>
                          </div>
                          <span className="admin-pill admin-pill-accent">Org Admin</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="admin-card admin-card-access" data-testid="org-admin-access-card">
                <h3 style={{ marginTop: 0 }}>Organization Administrator Access</h3>
                <p style={{ marginBottom: '0.5rem' }}>
                  You are responsible for day-to-day governance, membership, and integrations for {activeOrg.name}.
                </p>
                <p style={{ margin: 0 }}>
                  Keep member lists current, close proposals on time, and monitor outbound events to ensure a healthy platform
                  experience.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
