import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shareIssuancesApi } from '../api/shareIssuancesApi';
import { organizationsApi } from '../api/organizationsApi';
import { shareTypesApi } from '../api/shareTypesApi';
import { membershipsApi } from '../api/membershipsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { Skeleton, SkeletonTable, SkeletonTextLines } from '../components/Skeleton';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { Tooltip } from '../components/Tooltip';
import './AdminPage.css';
import type { 
  ShareIssuanceDto, 
  Organization, 
  ShareType, 
  MembershipWithUserDto,
  CreateShareIssuanceRequest 
} from '../types/api';

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};

export const AdminOrganizationShareIssuancePage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { showSuccess, showError } = useNotifications();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [issuances, setIssuances] = useState<ShareIssuanceDto[]>([]);
  const [shareTypes, setShareTypes] = useState<ShareType[]>([]);
  const [members, setMembers] = useState<MembershipWithUserDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateShareIssuanceRequest>({
    userId: '',
    shareTypeId: '',
    quantity: 0,
    reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = async () => {
    if (!orgId) {
      setError('Invalid organization ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const [orgData, issuancesData, shareTypesData, membersData] = await Promise.all([
        organizationsApi.getById(orgId),
        shareIssuancesApi.getByOrganization(orgId),
        shareTypesApi.getByOrganization(orgId),
        membershipsApi.getByOrganizationWithUserDetails(orgId),
      ]);
      
      setOrganization(orgData);
      setIssuances(issuancesData);
      setShareTypes(shareTypesData);
      setMembers(membersData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const handleCreateNew = () => {
    setFormData({
      userId: '',
      shareTypeId: shareTypes.length > 0 ? shareTypes[0].id : '',
      quantity: 0,
      reason: '',
    });
    setShowForm(true);
    setError(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    if (!formData.userId) {
      setError('Please select a user');
      return;
    }
    if (!formData.shareTypeId) {
      setError('Please select a share type');
      return;
    }
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      await shareIssuancesApi.create(orgId, formData);
      
      showSuccess('Shares issued successfully');
      setShowForm(false);
      fetchData(); // Refresh list
    } catch (err) {
      console.error('Failed to issue shares:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page" role="status" aria-live="polite">
        <div className="admin-header">
          <div>
            <h1>Share Issuance</h1>
            <p className="text-muted">Issue shares to members</p>
          </div>
          <Skeleton width="9rem" height="2.75rem" />
        </div>
        <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
          <SkeletonTextLines count={2} widths={['70%', '55%']} />
          <SkeletonTable columns={4} rows={5} />
          <p className="text-muted" style={{ margin: 0 }}>Loading share issuance...</p>
        </div>
      </div>
    );
  }

  if (!organization) {
    return <ErrorMessage message="Organization not found" />;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Share Issuance</h1>
          <p className="text-muted">Issue shares to members of {organization.name}</p>
        </div>
        {!showForm && (
          <Button onClick={handleCreateNew} disabled={shareTypes.length === 0}>
            Issue Shares
          </Button>
        )}
      </div>

      {error && <ErrorMessage message={error} />}

      {showForm && (
        <div className="admin-card mb-4">
          <h3>Issue New Shares</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <Select
                label="Member"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                required
              >
                <option value="">Select Member</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.userDisplayName} ({member.userEmail})
                  </option>
                ))}
              </Select>

              <Select
                label="Share Type"
                value={formData.shareTypeId}
                onChange={(e) => setFormData({ ...formData, shareTypeId: e.target.value })}
                required
              >
                <option value="">Select Share Type</option>
                {shareTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name} ({type.symbol})
                  </option>
                ))}
              </Select>

              <Input
                label="Quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                required
                min="0.000001"
                step="any"
              />

              <Input
                label="Reason (Optional)"
                value={formData.reason || ''}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>

            <div className="form-actions">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Issue Shares
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-card">
        <h3>Issuance History</h3>
        {issuances.length === 0 ? (
          <EmptyState
            message="No shares issued yet. Issue shares to members to get started."
            action={shareTypes.length > 0 ? {
              label: "Issue Shares",
              onClick: handleCreateNew
            } : undefined}
          />
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Member</th>
                  <th>Share Type</th>
                  <th>Quantity</th>
                  <th>Issued By</th>
                  <th>Reason</th>
                  <th>Blockchain</th>
                </tr>
              </thead>
              <tbody>
                {issuances.map((issuance) => (
                  <tr key={issuance.id}>
                    <td>{formatDate(issuance.issuedAt)}</td>
                    <td>{issuance.userDisplayName}</td>
                    <td>{issuance.shareTypeName} ({issuance.shareTypeSymbol})</td>
                    <td className="font-monospace">{issuance.quantity}</td>
                    <td>{issuance.issuedByUserDisplayName}</td>
                    <td>{issuance.reason || '-'}</td>
                    <td>
                      {issuance.blockchainTransactionId ? (
                        <Tooltip content={issuance.blockchainTransactionId}>
                          <span className="badge badge-success">
                            Recorded
                          </span>
                        </Tooltip>
                      ) : (
                        <span className="badge badge-secondary">Off-chain</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
