import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NotificationContainer } from './components/NotificationContainer';
import { router } from './routes';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <NotificationContainer />
        <RouterProvider router={router} />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
