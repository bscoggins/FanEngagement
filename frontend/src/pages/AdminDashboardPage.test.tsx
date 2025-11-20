import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';

describe('AdminDashboardPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderAdminDashboard = () => {
    return render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );
  };

  it('renders admin dashboard heading', () => {
    renderAdminDashboard();
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays welcome message', () => {
    renderAdminDashboard();
    expect(screen.getByText(/Welcome to the FanEngagement administration area/i)).toBeInTheDocument();
  });

  it('displays links to admin sections', () => {
    renderAdminDashboard();
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('Dev Tools')).toBeInTheDocument();
    
    expect(screen.getByText('Go to Users →')).toBeInTheDocument();
    expect(screen.getByText('Go to Organizations →')).toBeInTheDocument();
    expect(screen.getByText('Go to Dev Tools →')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    renderAdminDashboard();
    
    const usersLink = screen.getByText('Go to Users →').closest('a');
    const orgsLink = screen.getByText('Go to Organizations →').closest('a');
    const devToolsLink = screen.getByText('Go to Dev Tools →').closest('a');
    
    expect(usersLink).toHaveAttribute('href', '/admin/users');
    expect(orgsLink).toHaveAttribute('href', '/admin/organizations');
    expect(devToolsLink).toHaveAttribute('href', '/admin/dev-tools');
  });
});
