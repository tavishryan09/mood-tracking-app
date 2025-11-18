import { useMemo } from 'react';
import {
  useUsers,
  useProjects,
  usePlanningTasks,
  useDeadlineTasks,
  useUserPreferences,
  useGlobalDefaults,
  transformPlanningTasks,
} from './usePlanningQueries';

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

/**
 * Comprehensive React Query hook for all planning screen data
 *
 * Benefits:
 * - Automatic caching (5min for users/projects, 2min for tasks)
 * - Request deduplication (multiple components can use same query)
 * - Automatic refetching on window focus
 * - Loading and error states handled by React Query
 * - Significantly reduces API calls
 */
export const usePlanningDataQuery = (currentQuarter: QuarterInfo) => {
  // Fetch all data in parallel with React Query
  const usersQuery = useUsers();
  const projectsQuery = useProjects();
  const planningTasksQuery = usePlanningTasks(currentQuarter);
  const deadlineTasksQuery = useDeadlineTasks(currentQuarter);
  const [userOrderQuery, visibleUsersQuery] = useUserPreferences();
  const globalDefaultsQuery = useGlobalDefaults();

  // Determine loading state
  const isLoading =
    usersQuery.isLoading ||
    projectsQuery.isLoading ||
    planningTasksQuery.isLoading ||
    deadlineTasksQuery.isLoading;

  // Determine error state
  const hasError =
    usersQuery.isError ||
    projectsQuery.isError ||
    planningTasksQuery.isError ||
    deadlineTasksQuery.isError;

  // Transform planning tasks into block assignments
  const blockAssignments = useMemo(() => {
    if (!planningTasksQuery.data) return {};
    return transformPlanningTasks(planningTasksQuery.data);
  }, [planningTasksQuery.data]);

  // Apply user ordering if preferences exist
  const orderedUsers = useMemo(() => {
    let loadedUsers = usersQuery.data || [];
    const userIds = userOrderQuery.data;

    if (userIds && Array.isArray(userIds)) {
      const orderedList: User[] = [];

      // Add users in saved order
      userIds.forEach((userId: string) => {
        const user = loadedUsers.find((u: any) => u.id === userId);
        if (user) {
          orderedList.push(user);
        }
      });

      // Add any new users not in saved order
      loadedUsers.forEach((user: any) => {
        if (!userIds.includes(user.id)) {
          orderedList.push(user);
        }
      });

      return orderedList;
    }

    return loadedUsers;
  }, [usersQuery.data, userOrderQuery.data]);

  // Determine visible users
  const visibleUserIds = useMemo(() => {
    const visibleIds = visibleUsersQuery.data;

    if (visibleIds && Array.isArray(visibleIds)) {
      return visibleIds;
    }

    // Fallback to all users
    return orderedUsers.map((u) => u.id);
  }, [visibleUsersQuery.data, orderedUsers]);

  return {
    // Data
    users: orderedUsers,
    projects: projectsQuery.data || [],
    blockAssignments,
    deadlineTasks: deadlineTasksQuery.data || [],
    visibleUserIds,
    globalDefaults: globalDefaultsQuery.data,

    // State
    isLoading,
    hasError,

    // Individual query states (for granular error handling)
    usersQuery,
    projectsQuery,
    planningTasksQuery,
    deadlineTasksQuery,

    // Refetch functions
    refetchAll: () => {
      usersQuery.refetch();
      projectsQuery.refetch();
      planningTasksQuery.refetch();
      deadlineTasksQuery.refetch();
    },
  };
};
