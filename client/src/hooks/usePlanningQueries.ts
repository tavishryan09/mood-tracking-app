import { useQuery, useQueries } from '@tanstack/react-query';
import { usersAPI, projectsAPI, planningTasksAPI, settingsAPI, deadlineTasksAPI } from '../services/api';

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface BlockAssignment {
  id?: string;
  projectId: string;
  projectName: string;
  task?: string;
  span: number;
}

/**
 * React Query hook for fetching users with caching
 */
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await usersAPI.getAll();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * React Query hook for fetching projects with caching
 */
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectsAPI.getAll();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * React Query hook for fetching planning tasks with caching
 */
export const usePlanningTasks = (currentQuarter: QuarterInfo) => {
  const { year, quarter } = currentQuarter;
  const startMonth = (quarter - 1) * 3;
  const quarterStart = new Date(year, startMonth, 1);
  quarterStart.setHours(0, 0, 0, 0);

  const quarterEnd = new Date(year, startMonth + 3, 0);
  quarterEnd.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ['planningTasks', year, quarter],
    queryFn: async () => {
      const response = await planningTasksAPI.getAll({
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString(),
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes (fresher for planning data)
  });
};

/**
 * React Query hook for fetching deadline tasks with caching
 */
export const useDeadlineTasks = (currentQuarter: QuarterInfo) => {
  const { year, quarter } = currentQuarter;
  const startMonth = (quarter - 1) * 3;
  const quarterStart = new Date(year, startMonth, 1);
  quarterStart.setHours(0, 0, 0, 0);

  const quarterEnd = new Date(year, startMonth + 3, 0);
  quarterEnd.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ['deadlineTasks', year, quarter],
    queryFn: async () => {
      const response = await deadlineTasksAPI.getAll({
        startDate: quarterStart.toISOString(),
        endDate: quarterEnd.toISOString(),
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * React Query hook for fetching user preferences
 */
export const useUserPreferences = () => {
  return useQueries({
    queries: [
      {
        queryKey: ['userPreferences', 'planning_user_order'],
        queryFn: async () => {
          try {
            const response = await settingsAPI.user.get('planning_user_order');
            return response.data?.value || null;
          } catch (error: any) {
            if (error.response?.status === 404) {
              return null;
            }
            throw error;
          }
        },
        staleTime: 10 * 60 * 1000, // 10 minutes (preferences change rarely)
      },
      {
        queryKey: ['userPreferences', 'planning_visible_users'],
        queryFn: async () => {
          try {
            const response = await settingsAPI.user.get('planning_visible_users');
            return response.data?.value || null;
          } catch (error: any) {
            if (error.response?.status === 404) {
              return null;
            }
            throw error;
          }
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
      },
    ],
  });
};

/**
 * React Query hook for fetching global default view settings
 */
export const useGlobalDefaults = () => {
  return useQuery({
    queryKey: ['globalDefaults', 'planning_default_view'],
    queryFn: async () => {
      try {
        const response = await settingsAPI.app.get('planning_default_view');
        return response.data?.value || null;
      } catch (error) {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * Transform planning tasks into block assignments
 */
export const transformPlanningTasks = (tasks: any[]): { [key: string]: BlockAssignment } => {
  const assignments: { [key: string]: BlockAssignment } = {};

  tasks.forEach((task: any) => {
    const dateString = new Date(task.date).toISOString().split('T')[0];
    const blockKey = `${task.userId}-${dateString}-${task.blockIndex}`;

    const span = task.span || 1;
    const isStatusEvent = !task.projectId;
    const hasOutOfOfficeMarker = task.task?.startsWith('[OUT_OF_OFFICE]');
    const isProjectWithOutOfOffice = task.projectId && hasOutOfOfficeMarker;

    let projectName = '';
    let taskDescription = task.task;

    if (isStatusEvent) {
      projectName = task.task || '';
      taskDescription = undefined;
    } else if (isProjectWithOutOfOffice) {
      projectName = (task.project?.description || task.project?.name || '') + ' (Out of Office)';
      taskDescription = task.task.replace('[OUT_OF_OFFICE]', '') || undefined;
    } else {
      projectName = task.project?.description || task.project?.name || '';
      taskDescription = task.task || undefined;
    }

    assignments[blockKey] = {
      id: task.id,
      projectId: task.projectId,
      projectName: projectName,
      task: taskDescription,
      span: span,
    };
  });

  return assignments;
};
