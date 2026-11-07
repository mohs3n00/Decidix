import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthResponse } from '../types';
import { authService } from '../services/authService';
import { apiClient } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  isAnalyst: boolean;
  login: (email: string, pass: string) => Promise<AuthResponse>;
  register: (data: { name: string; email: string; password: string; role?: string; arabic_name?: string }) => Promise<AuthResponse>;
  googleLogin: (idToken: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  changePassword: (current_password: string, new_password: string) => Promise<{ message: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchProfile = async () => {
    const token = apiClient.getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await authService.me();
      setUser(currentUser);
    } catch {
      // Failed to get profile with token
      setUser(null);
      apiClient.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleLogoutEvent = () => {
      setUser(null);
    };

    window.addEventListener('decidix:auth:logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('decidix:auth:logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email: string, pass: string): Promise<AuthResponse> => {
    const res = await authService.login(email, pass);
    setUser(res.user);
    return res;
  };

  const register = async (data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    arabic_name?: string;
  }): Promise<AuthResponse> => {
    const res = await authService.register(data);
    setUser(res.user);
    return res;
  };

  const googleLogin = async (idToken: string): Promise<AuthResponse> => {
    const res = await authService.googleLogin(idToken);
    setUser(res.user);
    return res;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setUser(null);
  };

  const refreshProfile = async (): Promise<void> => {
    await fetchProfile();
  };

  const resendVerification = async (email: string): Promise<{ message: string }> => {
    return await authService.resendVerification(email);
  };

  const changePassword = async (current_password: string, new_password: string): Promise<{ message: string }> => {
    return await authService.changePassword(current_password, new_password);
  };

  const isAdmin = user?.role === 'admin';
  const isAnalyst = user?.role === 'analyst' || user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        isAnalyst,
        login,
        register,
        googleLogin,
        logout,
        refreshProfile,
        resendVerification,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
