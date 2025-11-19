import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

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
              <Link to="/users">Users</Link>
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
