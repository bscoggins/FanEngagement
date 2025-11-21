import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';
import { AdminLayout } from '../components/AdminLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';
import { UserCreatePage } from '../pages/UserCreatePage';
import { UserEditPage } from '../pages/UserEditPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/AdminUserDetailPage';
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage';
import { AdminOrganizationEditPage } from '../pages/AdminOrganizationEditPage';
import { AdminOrganizationMembershipsPage } from '../pages/AdminOrganizationMembershipsPage';
import { AdminOrganizationShareTypesPage } from '../pages/AdminOrganizationShareTypesPage';
import { AdminOrganizationProposalsPage } from '../pages/AdminOrganizationProposalsPage';
import { AdminProposalDetailPage } from '../pages/AdminProposalDetailPage';
import { AdminDevToolsPage } from '../pages/AdminDevToolsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'users',
        element: (
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users/new',
        element: (
          <ProtectedRoute>
            <UserCreatePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'users/:id/edit',
        element: (
          <ProtectedRoute>
            <UserEditPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <AdminLayout />
      </AdminRoute>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboardPage />,
      },
      {
        path: 'users',
        element: <AdminUsersPage />,
      },
      {
        path: 'users/:userId',
        element: <AdminUserDetailPage />,
      },
      {
        path: 'organizations',
        element: <AdminOrganizationsPage />,
      },
      {
        path: 'organizations/:orgId/edit',
        element: <AdminOrganizationEditPage />,
      },
      {
        path: 'organizations/:orgId/memberships',
        element: <AdminOrganizationMembershipsPage />,
      },
      {
        path: 'organizations/:orgId/share-types',
        element: <AdminOrganizationShareTypesPage />,
      },
      {
        path: 'organizations/:orgId/proposals',
        element: <AdminOrganizationProposalsPage />,
      },
      {
        path: 'organizations/:orgId/proposals/:proposalId',
        element: <AdminProposalDetailPage />,
      },
      {
        path: 'dev-tools',
        element: <AdminDevToolsPage />,
      },
    ],
  },
]);
