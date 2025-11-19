import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { LoginRequest, LoginResponse } from '../types/api';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: LoginResponse | null;
  token: string | null;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to load auth data from localStorage
const loadAuthFromStorage = (): { token: string | null; user: LoginResponse | null } => {
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('authUser');
  
  if (storedToken && storedUser) {
    try {
      return {
        token: storedToken,
        user: JSON.parse(storedUser),
      };
    } catch (error) {
      // Clear invalid data
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      console.error('Failed to parse stored user data:', error);
    }
  }
  
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<{ token: string | null; user: LoginResponse | null }>(() => {
    // Initialize state from localStorage synchronously
    return loadAuthFromStorage();
  });

  const login = async (request: LoginRequest) => {
    const response = await authApi.login(request);
    
    // Store token and user in state
    setAuthState({ token: response.token, user: response });
    
    // Persist to localStorage
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('authUser', JSON.stringify(response));
  };

  const logout = () => {
    setAuthState({ token: null, user: null });
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const value = {
    user: authState.user,
    token: authState.token,
    login,
    logout,
    isAuthenticated: !!authState.token,
    isLoading: false, // Loading from localStorage is synchronous, so no loading state needed
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
