import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LoginRequest, LoginResponse, MfaValidateRequest } from '../types/api';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: LoginResponse | null;
  token: string | null;
  login: (request: LoginRequest) => Promise<LoginResponse>;
  validateMfa: (request: MfaValidateRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
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

  const login = useCallback(async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await authApi.login(request);
    
    // If MFA is not required, store auth data
    if (!response.mfaRequired) {
      setAuthState({ token: response.token, user: response });
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('authUser', JSON.stringify(response));
    }
    
    return response;
  }, []);

  const validateMfa = useCallback(async (request: MfaValidateRequest) => {
    const response = await authApi.validateMfa(request);
    
    // Store token and user after successful MFA validation
    setAuthState({ token: response.token, user: response });
    localStorage.setItem('authToken', response.token);
    localStorage.setItem('authUser', JSON.stringify(response));
  }, []);

  const logout = useCallback(() => {
    setAuthState({ token: null, user: null });
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }, []);

  const value = {
    user: authState.user,
    token: authState.token,
    login,
    validateMfa,
    logout,
    isAuthenticated: !!authState.token,
    isAdmin: authState.user?.role === 'Admin',
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
