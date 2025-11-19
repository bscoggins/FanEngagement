import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LoginRequest, LoginResponse } from '../types/api';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: LoginResponse | null;
  token: string | null;
  login: (request: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LoginResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        // Clear invalid data
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        console.error('Failed to parse stored user data:', error);
      }
    }
  }, []);

  const login = async (request: LoginRequest) => {
    const response = await authApi.login(request);
    
    // Store token and user in state
    setToken(response.token);
    setUser(response);
    
    // Persist to localStorage
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('authUser', JSON.stringify(response));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!token,
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
