import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { membershipsApi } from '../api/membershipsApi';
import { organizationsApi } from '../api/organizationsApi';
import { usersApi } from '../api/usersApi';
import type { MembershipWithUserDto, Organization, User } from '../types/api';

export const AdminOrganizationMembershipsPage: React.FC = () => {
  const { orgId } = useParams<{ orgId: string }>();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [memberships, setMemberships] = useState<MembershipWithUserDto[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
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

  useEffect(() => {
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
          usersApi.getAll(),
        ]);
        
        setOrganization(orgData);
        setMemberships(membershipsData);
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orgId]);

  const refetchData = async () => {
    if (!orgId) return;

    try {
      const [orgData, membershipsData, usersData] = await Promise.all([
        organizationsApi.getById(orgId),
        membershipsApi.getByOrganizationWithUserDetails(orgId),
        usersApi.getAll(),
      ]);
      
      setOrganization(orgData);
      setMemberships(membershipsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  };

  const handleAddMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !selectedUserId) return;

    setError(null);
    setSuccessMessage(null);
    setIsAdding(true);

    try {
      await membershipsApi.create(orgId, {
        userId: selectedUserId,
        role: selectedRole,
      });
      
      setSuccessMessage('Membership added successfully!');
      setShowAddForm(false);
      setSelectedUserId('');
      setSelectedRole('Member');
      
      // Refresh memberships
      await refetchData();
    } catch (err) {
      console.error('Failed to add membership:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status: number; data?: { message?: string } } };
        if (axiosError.response?.status === 400) {
          setError(axiosError.response.data?.message || 'Invalid membership data. The user may already be a member.');
        } else {
          setError('Failed to add membership. Please try again.');
        }
      } else {
        setError('Failed to add membership. Please try again.');
      }
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
    setSuccessMessage(null);

    try {
      await membershipsApi.delete(orgId, userId);
      setSuccessMessage('Membership removed successfully!');
      
      // Refresh memberships
      await refetchData();
    } catch (err) {
      console.error('Failed to remove membership:', err);
      setError('Failed to remove membership. Please try again.');
    }
  };

  // Get users that are not already members
  const availableUsers = users.filter(
    (user) => !memberships.some((m) => m.userId === user.id)
  );

  if (isLoading) {
    return (
      <div>
        <h1>Manage Memberships</h1>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div>
        <h1>Manage Memberships</h1>
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginTop: '1rem',
          }}
        >
          Organization not found
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Link
            to="/admin/organizations"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Organizations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          to="/admin/organizations"
          style={{
            color: '#0066cc',
            textDecoration: 'none',
            fontSize: '0.875rem',
          }}
        >
          ← Back to Organizations
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Manage Memberships</h1>
          <div style={{ color: '#666', fontSize: '1rem' }}>
            Organization: {organization.name}
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: showAddForm ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {showAddForm ? 'Cancel' : 'Add Member'}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#e7f5e7',
            border: '1px solid #b3e0b3',
            borderRadius: '4px',
            color: '#2d5a2d',
            marginBottom: '1rem',
          }}
        >
          {successMessage}
        </div>
      )}

      {showAddForm && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>Add New Member</h2>
          <form onSubmit={handleAddMembership}>
            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="userId" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Select User *
              </label>
              <select
                id="userId"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              >
                <option value="">-- Select a user --</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="role" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                Role *
              </label>
              <select
                id="role"
                value={selectedRole}
                onChange={handleRoleChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              >
                <option value="Member">Member</option>
                <option value="OrgAdmin">Organization Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isAdding || !selectedUserId}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isAdding || !selectedUserId ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isAdding || !selectedUserId ? 'not-allowed' : 'pointer',
              }}
            >
              {isAdding ? 'Adding...' : 'Add Member'}
            </button>
          </form>
        </div>
      )}

      {memberships.length === 0 ? (
        <div style={{ 
          padding: '2rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666' }}>No members found.</p>
        </div>
      ) : (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Joined</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {memberships.map((membership) => (
                <tr key={membership.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>{membership.userDisplayName}</td>
                  <td style={{ padding: '1rem' }}>{membership.userEmail}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      backgroundColor: membership.role === 'OrgAdmin' ? '#e3f2fd' : '#f5f5f5',
                      color: membership.role === 'OrgAdmin' ? '#1976d2' : '#666',
                    }}>
                      {membership.role === 'OrgAdmin' ? 'Org Admin' : 'Member'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    {new Date(membership.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemoveMembership(membership.userId, membership.userDisplayName)}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      Remove
                    </button>
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
