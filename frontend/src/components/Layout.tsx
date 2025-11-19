import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './Layout.css';

export const Layout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

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
                Welcome, {user?.displayName || user?.email}
              </span>
              <button onClick={logout} className="logout-button">
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
