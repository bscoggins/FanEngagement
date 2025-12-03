import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { AdminRoute } from '../components/AdminRoute';
import { OrgAdminRoute } from '../components/OrgAdminRoute';
import { PlatformAdminRoute } from '../components/PlatformAdminRoute';
import { AdminLayout } from '../components/AdminLayout';
import { PlatformAdminLayout } from '../components/PlatformAdminLayout';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';
import { UserCreatePage } from '../pages/UserCreatePage';
import { UserEditPage } from '../pages/UserEditPage';
import { MyAccountPage } from '../pages/MyAccountPage';
import { MyOrganizationsPage } from '../pages/MyOrganizationsPage';
import { MyOrganizationPage } from '../pages/MyOrganizationPage';
import { MyProposalPage } from '../pages/MyProposalPage';
import { MemberDashboardPage } from '../pages/MemberDashboardPage';
import { PlatformAdminDashboardPage } from '../pages/PlatformAdminDashboardPage';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { AdminUsersPage } from '../pages/AdminUsersPage';
import { AdminUserDetailPage } from '../pages/AdminUserDetailPage';
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage';
import { AdminOrganizationEditPage } from '../pages/AdminOrganizationEditPage';
import { AdminOrganizationMembershipsPage } from '../pages/AdminOrganizationMembershipsPage';
import { AdminOrganizationShareTypesPage } from '../pages/AdminOrganizationShareTypesPage';
import { AdminOrganizationProposalsPage } from '../pages/AdminOrganizationProposalsPage';
import { AdminProposalDetailPage } from '../pages/AdminProposalDetailPage';
import { AdminWebhookEventsPage } from '../pages/AdminWebhookEventsPage';
import { AdminAuditLogPage } from '../pages/AdminAuditLogPage';
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
        path: 'me/home',
        element: (
          <ProtectedRoute>
            <MemberDashboardPage />
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
    path: '/platform-admin',
    element: (
      <PlatformAdminRoute>
        <PlatformAdminLayout />
      </PlatformAdminRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <PlatformAdminDashboardPage />,
      },
    ],
  },
  {
    path: '/admin',
    element: (
      <AdminRoute allowOrgAdmin={true}>
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
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      {
        path: 'users/:userId',
        element: (
          <AdminRoute>
            <AdminUserDetailPage />
          </AdminRoute>
        ),
      },
      {
        path: 'organizations',
        element: (
          <AdminRoute>
            <AdminOrganizationsPage />
          </AdminRoute>
        ),
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
        path: 'organizations/:orgId/webhook-events',
        element: (
          <OrgAdminRoute>
            <AdminWebhookEventsPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'organizations/:orgId/audit-log',
        element: (
          <OrgAdminRoute>
            <AdminAuditLogPage />
          </OrgAdminRoute>
        ),
      },
      {
        path: 'dev-tools',
        element: (
          <AdminRoute>
            <AdminDevToolsPage />
          </AdminRoute>
        ),
      },
    ],
  },
]);
