import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types/auth';
import { api, setAuthCallbacks } from '../services/apiClient';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  sessionExpired: boolean;
  forbiddenToast: string | null;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserProfile>) => void;
  dismissSessionExpired: () => void;
  dismissForbiddenToast: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nirman_auth_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const [forbiddenToast, setForbiddenToast] = useState<string | null>(null);

  // Initialize Auth Callbacks for 401 & 403 Interceptors
  useEffect(() => {
    setAuthCallbacks(
      () => {
        // 401 Session Expired Interceptor
        setUser(null);
        setToken(null);
        localStorage.removeItem('nirman_auth_token');
        setSessionExpired(true);
      },
      (forbiddenMsg: string) => {
        // 403 Forbidden Interceptor (Does not force logout, displays toast)
        setForbiddenToast(forbiddenMsg);
      }
    );
  }, []);

  // Validate existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('nirman_auth_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch (err) {
          console.warn("Stored auth token verification failed:", err);
          setUser(null);
          setToken(null);
          localStorage.removeItem('nirman_auth_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (usernameOrEmail: string, password: string) => {
    const res = await api.login(usernameOrEmail, password);
    setUser(res.user);
    setToken(res.access_token);
    setSessionExpired(false);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setToken(null);
    setSessionExpired(false);
  };

  const updateUser = (userData: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const dismissSessionExpired = () => setSessionExpired(false);
  const dismissForbiddenToast = () => setForbiddenToast(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        loading,
        sessionExpired,
        forbiddenToast,
        login,
        logout,
        updateUser,
        dismissSessionExpired,
        dismissForbiddenToast
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
