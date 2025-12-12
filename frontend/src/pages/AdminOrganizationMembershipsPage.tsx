import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { membershipsApi } from '../api/membershipsApi';
import { organizationsApi } from '../api/organizationsApi';
import { useNotifications } from '../contexts/NotificationContext';
import { parseApiError } from '../utils/errorUtils';
import { getRoleFullName } from '../utils/roleUtils';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import './AdminPage.css';
import type { MembershipWithUserDto, Organization, User } from '../types/api';
import { Select } from '../components/Select';

export const AdminOrganizationMembershipsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const { showSuccess, showError } = useNotifications();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<MembershipWithUserDto[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add membership form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'OrgAdmin' | 'Member'>('Member');
  const [isAdding, setIsAdding] = useState(false);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'OrgAdmin' || value === 'Member') {
      setSelectedRole(value);
    }
  };

  const fetchData = async () => {
    if (!orgId) {
      setError('Invalid organization ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const [orgData, membershipsData, usersData] = await Promise.all([
        organizationsApi.getById(orgId),
        membershipsApi.getByOrganizationWithUserDetails(orgId),
        membershipsApi.getAvailableUsers(orgId),
      ]);
      
      setOrganization(orgData);
      setMemberships(membershipsData);
      setAvailableUsers(usersData);
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

  const handleAddMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedUserId) return;

    setError(null);
    setIsAdding(true);

    try {
      await membershipsApi.create(orgId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      
      showSuccess('Membership added successfully!');
      setShowAddForm(false);
      setSelectedUserId('');
      setSelectedRole('Member');
      
      // Refresh memberships
      await fetchData();
    } catch (err) {
      console.error('Failed to add membership:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMembership = async (userId: string, userDisplayName: string) => {
    if (!orgId) return;
    
    if (!confirm(`Are you sure you want to remove ${userDisplayName} from this organization?`)) {
      return;
    }

    setError(null);

    try {
      await membershipsApi.delete(orgId, userId);
      showSuccess('Membership removed successfully!');
      
      // Refresh memberships
      await fetchData();
    } catch (err) {
      console.error('Failed to remove membership:', err);
      const errorMessage = parseApiError(err);
      setError(errorMessage);
      showError(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="admin-page">
        <h1>Manage Memberships</h1>
        <LoadingSpinner message="Loading memberships..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="admin-page">
        <h1>Manage Memberships</h1>
        <ErrorMessage message={error || 'Organization not found'} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div className="admin-page-title-group">
          <h1>Memberships</h1>
          <div className="admin-page-subtitle">
            Organization: {organization.name}
          </div>
        </div>
        <div className="admin-page-actions">
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className={`admin-button ${showAddForm ? 'admin-button-neutral' : 'admin-button-success'}`}
          >
            {showAddForm ? 'Cancel' : 'Add Member'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Add New Member</h2>
          <form onSubmit={handleAddMembership}>
            <div style={{ marginBottom: '1rem' }}>
              <Select
                id="userId"
                label="Select User *"
                data-testid="membership-user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
              >
                <option value="">-- Select a user --</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id} data-testid={`membership-option-${user.email}`}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <Select
                id="role"
                label="Role *"
                value={selectedRole}
                onChange={handleRoleChange}
                required
              >
                <option value="Member">Member</option>
                <option value="OrgAdmin">Organization Admin</option>
              </Select>
            </div>

            <button
              type="submit"
              disabled={isAdding || !selectedUserId}
              className="admin-button admin-button-success"
            >
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </div>
      )}

      {memberships.length === 0 ? (
        <EmptyState message="No members found. Add members to this organization." />
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id}>
                  <td>{membership.userDisplayName}</td>
                  <td>{membership.userEmail}</td>
                  <td>
                    <span
                      className={`admin-pill ${membership.role === 'OrgAdmin' ? 'admin-pill-accent' : ''}`}
                    >
                      {getRoleFullName(membership.role)}
                    </span>
                  </td>
                  <td>
                    <span className="admin-secondary-text">
                      {new Date(membership.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        type="button"
                        className="admin-button admin-button-danger"
                        onClick={() => handleRemoveMembership(membership.userId, membership.userDisplayName)}
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
