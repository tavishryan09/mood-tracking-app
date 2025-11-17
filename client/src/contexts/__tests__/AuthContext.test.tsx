import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../../services/api';

// Mock the API module
jest.mock('../../services/api', () => ({
  authAPI: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
  },
}));

const mockAuthAPI = authAPI as jest.Mocked<typeof authAPI>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

  describe('Initial State', () => {
    it('should initialize with no user and not authenticated', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load stored auth on mount', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
      };
      const mockToken = 'stored-token';

      await AsyncStorage.setItem('authToken', mockToken);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
      };
      const mockToken = 'jwt-token';

      mockAuthAPI.login.mockResolvedValueOnce({
        data: { token: mockToken, user: mockUser },
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Verify storage
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      expect(storedToken).toBe(mockToken);
      expect(JSON.parse(storedUser!)).toEqual(mockUser);
    });

    it('should handle login failure with error message', async () => {
      mockAuthAPI.login.mockRejectedValueOnce({
        response: { data: { error: 'Invalid credentials' } },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        result.current.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network errors', async () => {
      mockAuthAPI.login.mockRejectedValueOnce({
        message: 'Network Error',
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        result.current.login('test@example.com', 'password123')
      ).rejects.toThrow('Network error. Please check your connection.');
    });
  });

  describe('Logout', () => {
    it('should logout and clear stored data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
      };
      const mockToken = 'jwt-token';

      // Set up logged-in state
      await AsyncStorage.setItem('authToken', mockToken);
      await AsyncStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Logout
      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);

      // Verify storage cleared
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      expect(storedToken).toBeNull();
      expect(storedUser).toBeNull();
    });
  });

  describe('loginWithToken', () => {
    it('should authenticate with provided token', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
      };
      const mockToken = 'oauth-token';

      mockAuthAPI.getProfile.mockResolvedValueOnce({
        data: mockUser,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.loginWithToken(mockToken);
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.token).toBe(mockToken);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('should clear invalid token', async () => {
      const mockToken = 'invalid-token';

      mockAuthAPI.getProfile.mockRejectedValueOnce({
        response: { status: 401 },
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        result.current.loginWithToken(mockToken)
      ).rejects.toThrow('Failed to authenticate with token');

      expect(result.current.token).toBeNull();
    });
  });

  describe('refreshUser', () => {
    it('should refresh user data', async () => {
      const initialUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER' as const,
      };

      const updatedUser = {
        ...initialUser,
        firstName: 'Updated',
      };

      const mockToken = 'jwt-token';

      await AsyncStorage.setItem('authToken', mockToken);
      await AsyncStorage.setItem('user', JSON.stringify(initialUser));

      mockAuthAPI.getProfile.mockResolvedValueOnce({
        data: updatedUser,
      } as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(initialUser);
      });

      await act(async () => {
        await result.current.refreshUser();
      });

      await waitFor(() => {
        expect(result.current.user).toEqual(updatedUser);
      });
    });
  });
});
