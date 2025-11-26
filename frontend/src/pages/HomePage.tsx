import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDefaultRouteForUser } from '../utils/routeUtils';
import { membershipsApi } from '../api/membershipsApi';

export const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Auto-redirect authenticated users to their appropriate landing page
  useEffect(() => {
    const redirectAuthenticatedUser = async () => {
      if (isAuthenticated && user && !isRedirecting) {
        setIsRedirecting(true);
        try {
          // For admins, redirect immediately
          if (user.role === 'Admin') {
            navigate(getDefaultRouteForUser(user), { replace: true });
            return;
          }
          // For non-admins, fetch memberships to determine if they're OrgAdmin
          const memberships = await membershipsApi.getByUserId(user.userId);
          navigate(getDefaultRouteForUser(user, memberships), { replace: true });
        } catch {
          // On error, use default route without memberships
          navigate(getDefaultRouteForUser(user), { replace: true });
        }
      }
    };
    redirectAuthenticatedUser();
  }, [isAuthenticated, user, navigate, isRedirecting]);

  // Show loading while redirecting authenticated users
  if (isAuthenticated && isRedirecting) {
    return (
      <div className="home-page">
        <h2>Redirecting...</h2>
      </div>
    );
  }

  return (
    <div className="home-page">
      <h2>Welcome to FanEngagement</h2>
      <p>A multi-tenant fan governance platform where organizations issue share types to users for voting on proposals.</p>
      
      {!isAuthenticated ? (
        <div style={{ marginTop: '2rem' }}>
          <Link to="/login" style={{ color: '#0066cc', fontSize: '1.1rem' }}>
            Get started by logging in →
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: '2rem' }}>
          <Link to="/me/home" style={{ color: '#0066cc', fontSize: '1.1rem' }}>
            Go to Dashboard →
          </Link>
        </div>
      )}
    </div>
  );
};
