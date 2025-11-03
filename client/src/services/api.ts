import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { offlineManager } from '../utils/offlineManager';

// For Vercel deployment: use relative path on production, full URL for local dev
const API_URL = process.env.EXPO_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? '/api'
    : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
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
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and offline mode
api.interceptors.response.use(
  (response) => response,
  async (error) => {
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
  removeMember: (id: string, memberId: string) => api.delete(`/projects/${id}/members/${memberId}`),
};

// Time Entries API
export const timeEntriesAPI = {
  getAll: (params?: any) => api.get('/time-entries', { params }),
  getById: (id: string) => api.get(`/time-entries/${id}`),
  create: (data: any) => api.post('/time-entries', data),
  update: (id: string, data: any) => api.put(`/time-entries/${id}`, data),
  delete: (id: string) => api.delete(`/time-entries/${id}`),
  stopTimer: (id: string) => api.post(`/time-entries/${id}/stop`),
  getRunningTimer: () => api.get('/time-entries/running'),
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
