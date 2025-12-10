import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { LoginRequest, LoginResponse, MfaValidateRequest, ThemePreference } from '../types/api';
import { authApi } from '../api/authApi';

interface AuthContextType {
  user: LoginResponse | null;
  token: string | null;
  login: (request: LoginRequest) => Promise<LoginResponse>;
  validateMfa: (request: MfaValidateRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUserThemePreference: (theme: ThemePreference) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isValidThemePreference = (value: unknown): value is ThemePreference => value === 'Light' || value === 'Dark';

const getThemePreferenceFromUser = (user: any): ThemePreference => {
  if (isValidThemePreference(user?.themePreference)) {
    return user.themePreference;
  }

  if (isValidThemePreference(user?.preferredTheme)) {
    return user.preferredTheme;
  }

  return 'Light';
};

// Helper function to load auth data from localStorage
const normalizeStoredUser = (user: any): LoginResponse | null => {
  if (!user) {
    return null;
  }

  const themePreference = getThemePreferenceFromUser(user);
  return { ...user, themePreference } as LoginResponse;
};

const loadAuthFromStorage = (): { token: string | null; user: LoginResponse | null } => {
  const storedToken = localStorage.getItem('authToken');
  const storedUser = localStorage.getItem('authUser');
  
  if (storedToken && storedUser) {
    try {
      return {
        token: storedToken,
        user: normalizeStoredUser(JSON.parse(storedUser)),
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

  const ensureThemePreference = useCallback((response: LoginResponse): LoginResponse => {
    const themePreference = getThemePreferenceFromUser(response);
    return { ...response, themePreference };
  }, []);

  const login = useCallback(async (request: LoginRequest): Promise<LoginResponse> => {
    const response = await authApi.login(request);
    const normalizedResponse = ensureThemePreference(response);
    
    // If MFA is not required, store auth data
    if (!normalizedResponse.mfaRequired) {
      setAuthState({ token: normalizedResponse.token, user: normalizedResponse });
      localStorage.setItem('authToken', normalizedResponse.token);
      localStorage.setItem('authUser', JSON.stringify(normalizedResponse));
    }
    
    return normalizedResponse;
  }, [ensureThemePreference]);

  const validateMfa = useCallback(async (request: MfaValidateRequest) => {
    const response = await authApi.validateMfa(request);
    const normalizedResponse = ensureThemePreference(response);
    
    // Store token and user after successful MFA validation
    setAuthState({ token: normalizedResponse.token, user: normalizedResponse });
    localStorage.setItem('authToken', normalizedResponse.token);
    localStorage.setItem('authUser', JSON.stringify(normalizedResponse));
  }, [ensureThemePreference]);

  const logout = useCallback(() => {
    setAuthState({ token: null, user: null });
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }, []);

  const setUserThemePreference = useCallback((theme: ThemePreference) => {
    setAuthState((prev) => {
      if (!prev.user) {
        return prev;
      }

      const updatedUser = { ...prev.user, themePreference: theme };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return { ...prev, user: updatedUser };
    });
  }, []);

  const value = {
    user: authState.user,
    token: authState.token,
    login,
    validateMfa,
    logout,
    isAuthenticated: !!authState.token,
    isAdmin: authState.user?.role === 'Admin',
    setUserThemePreference,
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
