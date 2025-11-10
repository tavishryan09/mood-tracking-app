import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (authToken: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authAPI.login({ email, password });
      const { token: authToken, user: userData } = response.data;

      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      console.error('[AuthContext] Login error:', error);

      // Extract error message properly
      let errorMessage = 'Login failed';

      if (error.response?.data?.error) {
        errorMessage = typeof error.response.data.error === 'string'
          ? error.response.data.error
          : JSON.stringify(error.response.data.error);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (!error.response) {
        errorMessage = 'Network error. Please check your connection.';
      }

      throw new Error(errorMessage);
    }
  }, []);

  const loginWithToken = useCallback(async (authToken: string) => {
    try {
      // Store the token first
      await AsyncStorage.setItem('authToken', authToken);
      setToken(authToken);

      // Fetch user profile using the token
      const response = await authAPI.getProfile();
      const userData = response.data;

      // Store user data
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error: any) {
      console.error('[AuthContext] Login with token error:', error);
      // Clear invalid token
      await AsyncStorage.removeItem('authToken');
      setToken(null);
      throw new Error('Failed to authenticate with token');
    }
  }, []);

  const register = useCallback(async (data: any) => {
    try {
      const response = await authAPI.register(data);
      const { token: authToken, user: userData } = response.data;

      await AsyncStorage.setItem('authToken', authToken);
      await AsyncStorage.setItem('user', JSON.stringify(userData));

      setToken(authToken);
      setUser(userData);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      console.log('[AuthContext] Logging out...');

      // Clear state FIRST to trigger immediate UI update
      setToken(null);
      setUser(null);
      console.log('[AuthContext] Cleared state');

      // Then clear AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      console.log('[AuthContext] Cleared AsyncStorage');

      // Force clear localStorage on web
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        console.log('[AuthContext] Clearing localStorage...');
        try {
          window.localStorage.removeItem('authToken');
          window.localStorage.removeItem('user');
          window.localStorage.clear(); // Nuclear option
        } catch (e) {
          console.error('[AuthContext] Error clearing localStorage:', e);
        }

        // Give React time to update UI before reload
        console.log('[AuthContext] Reloading page in 200ms...');
        setTimeout(() => {
          window.location.href = '/';
        }, 200);
      }
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
      // Even if there's an error, ensure state is cleared
      setToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      if (!token) return;

      const response = await authAPI.getProfile();
      const userData = response.data;

      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [token]);

  const isAuthenticated = useMemo(() => !!token && !!user, [token, user]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    loginWithToken,
    register,
    logout,
    refreshUser,
    isAuthenticated,
  }), [user, token, loading, login, loginWithToken, register, logout, refreshUser, isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
