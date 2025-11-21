import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { organizationsApi } from '../api/organizationsApi';
import type { Organization } from '../types/api';

export const AdminOrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await organizationsApi.getAll();
        setOrganizations(data);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setError('Failed to load organizations. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  if (isLoading) {
    return (
      <div>
        <h1>Organization Management</h1>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading organizations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Organization Management</h1>
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
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Organization Management</h1>
      </div>
      
      {organizations.length === 0 ? (
        <div style={{ 
          padding: '2rem', 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#666' }}>No organizations found.</p>
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
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ padding: '1rem' }}>{org.name}</td>
                  <td style={{ padding: '1rem', color: '#666', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {org.description || <em style={{ color: '#999' }}>No description</em>}
                  </td>
                  <td style={{ padding: '1rem', color: '#666', fontSize: '0.9rem' }}>
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                      <Link
                        to={`/admin/organizations/${org.id}/edit`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#0066cc',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '0.875rem',
                        }}
                      >
                        Edit
                      </Link>
                      <Link
                        to={`/admin/organizations/${org.id}/memberships`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '0.875rem',
                        }}
                      >
                        Members
                      </Link>
                      <Link
                        to={`/admin/organizations/${org.id}/share-types`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '0.875rem',
                        }}
                      >
                        Share Types
                      </Link>
                      <Link
                        to={`/admin/organizations/${org.id}/proposals`}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          textDecoration: 'none',
                          display: 'inline-block',
                          fontSize: '0.875rem',
                        }}
                      >
                        Proposals
                      </Link>
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
