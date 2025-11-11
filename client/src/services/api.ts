import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { offlineManager } from '../utils/offlineManager';

// For Vercel deployment: use relative path on production, full URL for local dev
// For mobile and other devices: use the computer's IP address instead of localhost
const getApiUrl = () => {
  // If explicitly set via environment variable, use that
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // For production (Vercel), use relative path
  if (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      !window.location.hostname.match(/^192\.168\./)) {
    return '/api';
  }

  // For web platform
  if (Platform.OS === 'web') {
    // If accessing via IP address (from another device), use that IP for API calls
    if (typeof window !== 'undefined' && window.location.hostname.match(/^192\.168\./)) {
      return `http://${window.location.hostname}:3000/api`;
    }
    // Otherwise use localhost
    return 'http://localhost:3000/api';
  }

  // For mobile platforms (iOS/Android), always use the computer's IP
  return 'http://192.168.100.117:3000/api';
};

const API_URL = getApiUrl();

console.log('[API] Platform:', Platform.OS);
console.log('[API] Hostname:', typeof window !== 'undefined' ? window.location?.hostname : 'N/A');
console.log('[API] Using API URL:', API_URL);
console.log('[API] Full config loaded - timestamp:', new Date().toISOString());

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 second timeout - increased for better reliability
  headers: {
    'Content-Type': 'application/json',
  },
});

// Check if online (only available on web)
const isOnline = () => {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    return navigator.onLine;
  }
  return true; // Assume online for native platforms
};

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    console.log('[API] Request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and offline mode
api.interceptors.response.use(
  (response) => {
    console.log('[API] Response:', {
      status: response.status,
      url: response.config.url
    });
    return response;
  },
  async (error) => {
    console.error('[API] Response error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      baseURL: error.config?.baseURL
    });

    // Handle auth errors
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
    }

    // Handle network errors - queue request if offline
    if (Platform.OS === 'web' && !error.response && !isOnline()) {
      console.log('[API] Offline - queueing request:', error.config.url);

      // Only queue write operations (POST, PUT, DELETE)
      if (['post', 'put', 'delete', 'patch'].includes(error.config.method?.toLowerCase() || '')) {
        try {
          await offlineManager.queueRequest(
            error.config.url || '',
            error.config.method || 'GET',
            error.config.headers || {},
            error.config.data
          );

          // Return a special offline response
          return Promise.resolve({
            data: {
              offline: true,
              message: 'Request queued for sync when online',
              queued: true,
            },
            status: 202,
            statusText: 'Queued',
            headers: {},
            config: error.config,
          });
        } catch (queueError) {
          console.error('[API] Failed to queue request:', queueError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  // Registration disabled - users must be invited by admins
  // register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// User Management API (Admin only)
export const userManagementAPI = {
  getAllUsers: () => api.get('/users'),
  inviteUser: (data: any) => api.post('/users/invite', data),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),
};

// Clients API
export const clientsAPI = {
  getAll: () => api.get('/clients'),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Projects API
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (data: any) => api.post('/projects', data),
  update: (id: string, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  addMember: (id: string, data: any) => api.post(`/projects/${id}/members`, data),
  updateMember: (id: string, memberId: string, data: any) => api.put(`/projects/${id}/members/${memberId}`, data),
  removeMember: (id: string, memberId: string) => api.delete(`/projects/${id}/members/${memberId}`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id: string) => api.get(`/users/${id}`),
  updateRate: (id: string, data: any) => api.put(`/users/${id}/rate`, data),
};

// Events API
export const eventsAPI = {
  getAll: (params?: any) => api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  addAttendee: (id: string, data: any) => api.post(`/events/${id}/attendees`, data),
  removeAttendee: (id: string, userId: string) => api.delete(`/events/${id}/attendees/${userId}`),
  updateStatus: (id: string, status: string) => api.put(`/events/${id}/attendee-status`, { status }),
};

// Travel API
export const travelAPI = {
  getAll: (params?: any) => api.get('/travel', { params }),
  getById: (id: string) => api.get(`/travel/${id}`),
  create: (data: any) => api.post('/travel', data),
  update: (id: string, data: any) => api.put(`/travel/${id}`, data),
  delete: (id: string) => api.delete(`/travel/${id}`),
};

// Export API
export const exportAPI = {
  timeReport: (params?: any) => api.get('/export/time-report', { params, responseType: 'blob' }),
  projectSummary: () => api.get('/export/project-summary', { responseType: 'blob' }),
  travelReport: (params?: any) => api.get('/export/travel-report', { params, responseType: 'blob' }),
};

// Planning Tasks API
export const planningTasksAPI = {
  getAll: (params?: any) => api.get('/planning-tasks', { params }),
  getById: (id: string) => api.get(`/planning-tasks/${id}`),
  create: (data: any) => api.post('/planning-tasks', data),
  update: (id: string, data: any) => api.put(`/planning-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/planning-tasks/${id}`),
};

// Settings API
export const settingsAPI = {
  // App-wide settings (admin only)
  app: {
    getAll: () => api.get('/settings/app'),
    get: (key: string) => api.get(`/settings/app/${key}`),
    set: (key: string, value: any) => api.put(`/settings/app/${key}`, { value }),
    batchSet: (settings: Array<{ key: string; value: any }>) =>
      api.post('/settings/app/batch', { settings }),
    delete: (key: string) => api.delete(`/settings/app/${key}`),
  },
  // User-specific settings
  user: {
    getAll: () => api.get('/settings/user'),
    get: (key: string) => api.get(`/settings/user/${key}`),
    set: (key: string, value: any) => api.put(`/settings/user/${key}`, { value }),
    batchSet: (settings: Array<{ key: string; value: any }>) =>
      api.post('/settings/user/batch', { settings }),
    delete: (key: string) => api.delete(`/settings/user/${key}`),
  },
};

// Deadline Tasks API
export const deadlineTasksAPI = {
  getAll: (params?: any) => api.get('/deadline-tasks', { params }),
  create: (data: any) => api.post('/deadline-tasks', data),
  update: (id: string, data: any) => api.put(`/deadline-tasks/${id}`, data),
  delete: (id: string) => api.delete(`/deadline-tasks/${id}`),
  syncDueDates: () => api.post('/deadline-tasks/sync-due-dates'),
};

// Outlook Calendar API
export const outlookAPI = {
  getStatus: () => api.get('/outlook/status'),
  connect: () => api.post('/outlook/connect'),
  disconnect: () => api.post('/outlook/disconnect'),
  sync: () => api.post('/outlook/sync'),
  getSyncStatus: (jobId: string) => api.get(`/outlook/sync/${jobId}`),
  syncPlanning: (jobId: string) => api.post('/outlook/sync/planning', { jobId }),
  syncDeadline: (jobId: string) => api.post('/outlook/sync/deadline', { jobId }),
  syncCleanup: (jobId: string) => api.post('/outlook/sync/cleanup', { jobId }),
};
