import React, { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Listen for auth:logout events from the API client
  useEffect(() => {
    const handleAuthLogout = () => {
      logout();
      navigate('/login');
    };

    window.addEventListener('auth:logout', handleAuthLogout);
    return () => window.removeEventListener('auth:logout', handleAuthLogout);
  }, [logout, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <h1>FanEngagement</h1>
        <nav className="nav">
          {!isAuthenticated ? (
            <Link to="/login">Login</Link>
          ) : (
            <>
              <Link to="/me">My Account</Link>
              <Link to="/me/organizations">My Organizations</Link>
              <Link to="/users">Users</Link>
              {isAdmin && <Link to="/admin">Admin</Link>}
              <span className="user-info">
                Logged in as {user?.email}
              </span>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </>
          )}
        </nav>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
