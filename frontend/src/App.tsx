import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OrgProvider } from './contexts/OrgContext';
import { NotificationContainer } from './components/NotificationContainer';
import { router } from './routes';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const prefersDark = user?.themePreference === 'Dark';
    document.body.classList.toggle('theme-dark', prefersDark);
  }, [user?.themePreference]);
  
  return (
    <OrgProvider isAuthenticated={isAuthenticated}>
      <NotificationProvider>
        <NotificationContainer />
        <RouterProvider router={router} />
      </NotificationProvider>
    </OrgProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
