/**
 * Type definitions for API requests and responses
 *
 * Provides strong typing for all API interactions
 * Replace 'any' types with these interfaces throughout the app
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';
export type AuthProvider = 'local' | 'microsoft';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  isActive: boolean;
  authProvider?: AuthProvider;
  microsoftId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

// ============================================================================
// Project Types
// ============================================================================

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  client: Client;
  status: ProjectStatus;
  projectValue: number | null;
  useStandardRate: boolean;
  standardHourlyRate: number | null;
  dueDate: string | null;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    events: number;
    planningTasks: number;
  };
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  user: User;
  customHourlyRate: number | null;
  joinedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  clientId: string;
  status?: ProjectStatus;
  projectValue?: number;
  useStandardRate?: boolean;
  standardHourlyRate?: number;
  dueDate?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  clientId?: string;
  status?: ProjectStatus;
  projectValue?: number;
  useStandardRate?: boolean;
  standardHourlyRate?: number;
  dueDate?: string;
}

export interface AddProjectMemberRequest {
  userId: string;
  customHourlyRate?: number;
}

export interface UpdateProjectMemberRequest {
  customHourlyRate: number;
}

// ============================================================================
// Client Types
// ============================================================================

export interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
  };
}

export interface CreateClientRequest {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface UpdateClientRequest {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
}

// ============================================================================
// Event Types
// ============================================================================

export type EventType =
  | 'PROJECT_WORK'
  | 'MEETING'
  | 'CALL'
  | 'DEADLINE'
  | 'MILESTONE'
  | 'OUT_OF_OFFICE'
  | 'PERSONAL'
  | 'OTHER';

export interface Event {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  eventType: EventType;
  projectId: string | null;
  project?: Project;
  userId: string;
  user: User;
  attendees: EventAttendee[];
  createdAt: string;
  updatedAt: string;
}

export interface EventAttendee {
  id: string;
  eventId: string;
  userId: string;
  user: User;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  eventType: EventType;
  projectId?: string;
  attendeeIds?: string[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  eventType?: EventType;
  projectId?: string;
  attendeeIds?: string[];
}

// ============================================================================
// Planning Task Types
// ============================================================================

export interface PlanningTask {
  id: string;
  date: string;
  task: string;
  projectId: string | null;
  project?: Project;
  userId: string;
  user: User;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanningTaskRequest {
  date: string;
  task: string;
  projectId?: string;
  userId?: string;
  completed?: boolean;
}

export interface UpdatePlanningTaskRequest {
  date?: string;
  task?: string;
  projectId?: string;
  completed?: boolean;
}

export interface GetPlanningTasksQuery {
  userId?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
  completed?: boolean;
}

// ============================================================================
// Deadline Task Types
// ============================================================================

export type DeadlineType = 'DEADLINE' | 'INTERNAL_DEADLINE' | 'MILESTONE';

export interface DeadlineTask {
  id: string;
  date: string;
  description: string;
  deadlineType: DeadlineType;
  projectId: string | null;
  project?: Project;
  userId: string;
  user: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeadlineTaskRequest {
  date: string;
  description: string;
  deadlineType: DeadlineType;
  projectId?: string;
}

export interface UpdateDeadlineTaskRequest {
  date?: string;
  description?: string;
  deadlineType?: DeadlineType;
  projectId?: string;
}

export interface GetDeadlineTasksQuery {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  deadlineType?: DeadlineType;
}

// ============================================================================
// Settings Types
// ============================================================================

export interface AppSetting {
  id: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserSetting {
  id: string;
  userId: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export interface SetSettingRequest {
  value: any;
}

// ============================================================================
// Generic API Response Types
// ============================================================================

export interface APIResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface APIError {
  error: string;
  errors?: Array<{
    field: string;
    message: string;
  }>;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Query Parameters
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

export type QueryParams = PaginationParams & SortParams & FilterParams;
