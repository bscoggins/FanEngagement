import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';
import { OrgAdminRoute } from '../components/OrgAdminRoute';
import { AdminLayout } from '../components/AdminLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';
import { UserCreatePage } from '../pages/UserCreatePage';
import { UserEditPage } from '../pages/UserEditPage';
import { MyAccountPage } from '../pages/MyAccountPage';
import { MyOrganizationsPage } from '../pages/MyOrganizationsPage';
import { MyOrganizationPage } from '../pages/MyOrganizationPage';
import { MyProposalPage } from '../pages/MyProposalPage';
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
      {
        path: 'me',
        element: (
          <ProtectedRoute>
            <MyAccountPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'me/organizations',
        element: (
          <ProtectedRoute>
            <MyOrganizationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'me/organizations/:orgId',
        element: (
          <ProtectedRoute>
            <MyOrganizationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'me/proposals/:proposalId',
        element: (
          <ProtectedRoute>
            <MyProposalPage />
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
        element: (
          <OrgAdminRoute>
            <AdminOrganizationEditPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'organizations/:orgId/memberships',
        element: (
          <OrgAdminRoute>
            <AdminOrganizationMembershipsPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'organizations/:orgId/share-types',
        element: (
          <OrgAdminRoute>
            <AdminOrganizationShareTypesPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'organizations/:orgId/proposals',
        element: (
          <OrgAdminRoute>
            <AdminOrganizationProposalsPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'organizations/:orgId/proposals/:proposalId',
        element: (
          <OrgAdminRoute>
            <AdminProposalDetailPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'dev-tools',
        element: <AdminDevToolsPage />,
      },
    ],
  },
]);
