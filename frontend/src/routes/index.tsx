import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { UsersPage } from '../pages/UsersPage';
import { UserCreatePage } from '../pages/UserCreatePage';
import { UserEditPage } from '../pages/UserEditPage';
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
        path: 'admin/dev-tools',
        element: (
          <ProtectedRoute>
            <AdminDevToolsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
