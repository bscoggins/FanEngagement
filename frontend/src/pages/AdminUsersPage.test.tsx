import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminUsersPage } from './AdminUsersPage';

describe('AdminUsersPage', () => {
  const renderAdminUsersPage = () => {
    return render(
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    );
  };

  it('renders user management heading', () => {
    renderAdminUsersPage();
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('displays placeholder message', () => {
    renderAdminUsersPage();
    expect(screen.getByText(/This is a placeholder page/i)).toBeInTheDocument();
    expect(screen.getByText(/User management features will be implemented here/i)).toBeInTheDocument();
  });

  it('displays link to main users page', () => {
    renderAdminUsersPage();
    const usersLink = screen.getByText('Users page');
    expect(usersLink).toBeInTheDocument();
    expect(usersLink.closest('a')).toHaveAttribute('href', '/users');
  });
});
