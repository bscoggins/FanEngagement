import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import './AdminLayout.css';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <h1>FanEngagement Admin</h1>
        <div className="admin-header-right">
          <span className="admin-user-info">
            {user?.email}
          </span>
          <button onClick={handleLogout} className="admin-logout-button">
            Logout
          </button>
        </div>
      </header>
      <div className="admin-container">
        <aside className="admin-sidebar">
          <nav className="admin-nav">
            <Link to="/admin" className="admin-nav-link">
              Dashboard
            </Link>
            <Link to="/admin/users" className="admin-nav-link">
              Users
            </Link>
            <Link to="/admin/organizations" className="admin-nav-link">
              Organizations
            </Link>
            <Link to="/admin/dev-tools" className="admin-nav-link">
              Dev Tools
            </Link>
          </nav>
          <div className="admin-sidebar-footer">
            <Link to="/" className="admin-back-link">
              ← Back to Main App
            </Link>
          </div>
        </aside>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
