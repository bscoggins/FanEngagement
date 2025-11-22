import React from 'react';
import { Link } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { IfGlobalAdmin } from '../components/PermissionWrappers';

export const AdminDashboardPage: React.FC = () => {
  const { isGlobalAdmin, memberships } = usePermissions();
  
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the FanEngagement administration area.</p>
      
      <IfGlobalAdmin>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginTop: '2rem' 
        }}>
          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Users</h2>
            <p style={{ color: '#666' }}>Manage user accounts and permissions</p>
            <Link to="/admin/users" style={{ 
              color: '#007bff', 
              textDecoration: 'none', 
              fontWeight: 500 
            }}>
              Go to Users →
            </Link>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Organizations</h2>
            <p style={{ color: '#666' }}>Manage organizations and memberships</p>
            <Link to="/admin/organizations" style={{ 
              color: '#007bff', 
              textDecoration: 'none', 
              fontWeight: 500 
            }}>
              Go to Organizations →
            </Link>
          </div>

          <div style={{ 
            padding: '1.5rem', 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
          }}>
            <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Dev Tools</h2>
            <p style={{ color: '#666' }}>Development and testing utilities</p>
            <Link to="/admin/dev-tools" style={{ 
              color: '#007bff', 
              textDecoration: 'none', 
              fontWeight: 500 
            }}>
              Go to Dev Tools →
            </Link>
          </div>
        </div>
      </IfGlobalAdmin>
      
      {!isGlobalAdmin() && memberships.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Your Organizations</h2>
          <p>You are an organization administrator for the following organizations:</p>
          <div style={{ marginTop: '1rem' }}>
            {memberships.filter(m => m.role === 'OrgAdmin').map(membership => (
              <div 
                key={membership.id}
                style={{ 
                  padding: '1rem', 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  marginBottom: '1rem'
                }}
              >
                <h3 style={{ marginTop: 0 }}>{membership.organizationName}</h3>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <Link to={`/admin/organizations/${membership.organizationId}/edit`}>Edit Organization</Link>
                  <Link to={`/admin/organizations/${membership.organizationId}/memberships`}>Manage Members</Link>
                  <Link to={`/admin/organizations/${membership.organizationId}/share-types`}>Manage Share Types</Link>
                  <Link to={`/admin/organizations/${membership.organizationId}/proposals`}>Manage Proposals</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {!isGlobalAdmin() && memberships.filter(m => m.role === 'OrgAdmin').length === 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
          <p>You don't have administrator permissions for any organizations.</p>
          <p>Contact a platform administrator if you need access.</p>
        </div>
      )}
    </div>
  );
};
