import { useState, useCallback } from 'react';
import { usersAPI, projectsAPI, planningTasksAPI, settingsAPI, deadlineTasksAPI } from '../services/api';
import { logger } from '../utils/logger';

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

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface BlockAssignment {
  id?: string;
  projectId: string;
  projectName: string;
  task?: string;
  span: number;
}

interface DeadlineTask {
  id: string;
  name: string;
  date: string;
  type: string;
  projectId?: string;
}

interface UsePlanningDataReturn {
  users: User[];
  projects: Project[];
  filteredProjects: Project[];
  blockAssignments: { [key: string]: BlockAssignment };
  deadlineTasks: DeadlineTask[];
  visibleUserIds: string[];
  loading: boolean;
  setUsers: (users: User[]) => void;
  setProjects: (projects: Project[]) => void;
  setFilteredProjects: (projects: Project[]) => void;
  setBlockAssignments: (assignments: { [key: string]: BlockAssignment }) => void;
  setDeadlineTasks: (tasks: DeadlineTask[]) => void;
  setVisibleUserIds: (ids: string[]) => void;
  loadData: (currentQuarter: QuarterInfo) => Promise<void>;
  loadGlobalDefaults: () => Promise<any>;
}

export const usePlanningData = (): UsePlanningDataReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [blockAssignments, setBlockAssignments] = useState<{ [key: string]: BlockAssignment }>({});
  const [deadlineTasks, setDeadlineTasks] = useState<DeadlineTask[]>([]);
  const [visibleUserIds, setVisibleUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGlobalDefaults = useCallback(async () => {
    try {
      const response = await settingsAPI.app.get('planning_default_view');
      if (response.data?.value) {
        return response.data.value;
      }
    } catch (error) {
      // Setting doesn't exist yet, that's okay
    }
    return null;
  }, []);

  const loadData = useCallback(async (currentQuarter: QuarterInfo) => {
    try {
      setLoading(true);

      // Calculate quarter range for loading planning tasks
      const { year, quarter } = currentQuarter;
      const startMonth = (quarter - 1) * 3;
      const quarterStart = new Date(year, startMonth, 1);
      quarterStart.setHours(0, 0, 0, 0);

      const quarterEnd = new Date(year, startMonth + 3, 0);
      quarterEnd.setHours(23, 59, 59, 999);

      // Load users, projects, planning tasks, and deadline tasks for the entire quarter
      const [usersResponse, projectsResponse, planningTasksResponse, deadlineTasksResponse] = await Promise.all([
        usersAPI.getAll(),
        projectsAPI.getAll(),
        planningTasksAPI.getAll({
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        }),
        deadlineTasksAPI.getAll({
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        }),
      ]);

      // Set deadline tasks
      setDeadlineTasks(deadlineTasksResponse.data);

      let loadedUsers = usersResponse.data;
      setProjects(projectsResponse.data);
      setFilteredProjects(projectsResponse.data);

      // Transform planning tasks into blockAssignments with span values
      const assignments: { [key: string]: BlockAssignment } = {};

      planningTasksResponse.data.forEach((task: any) => {
        const dateString = new Date(task.date).toISOString().split('T')[0];
        const blockKey = `${task.userId}-${dateString}-${task.blockIndex}`;

        // Get span directly from task (migrated from expansionBlocks)
        const span = task.span || 1;

        // Check if this is a status event (no projectId means status event)
        const isStatusEvent = !task.projectId;

        // Check if this is a project with Out of Office status
        const hasOutOfOfficeMarker = task.task?.startsWith('[OUT_OF_OFFICE]');
        const isProjectWithOutOfOffice = task.projectId && hasOutOfOfficeMarker;

        // Determine project name
        let projectName = '';
        let taskDescription = task.task;

        if (isStatusEvent) {
          // Pure status event - use task field as project name
          projectName = task.task || '';
          taskDescription = undefined;
        } else if (isProjectWithOutOfOffice) {
          // Project + Out of Office - append status to project name
          projectName = (task.project?.description || task.project?.name || '') + ' (Out of Office)';
          // Extract task description after marker
          taskDescription = task.task.replace('[OUT_OF_OFFICE]', '') || undefined;
        } else {
          // Regular project
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

      setBlockAssignments(assignments);

      // Load user preferences: try database first, then global defaults
      // Do this BEFORE setting users/visibleUserIds to prevent flash
      let userIds: string[] | null = null;
      let visibleIds: string[] | null = null;

      try {

        // Try to load user-specific preferences from database
        try {
          const userOrderResponse = await settingsAPI.user.get(`planning_user_order`);
          if (userOrderResponse.data?.value) {
            userIds = userOrderResponse.data.value;
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            logger.error('Error loading user order:', error, 'usePlanningData');
          }
        }

        try {
          const visibleUsersResponse = await settingsAPI.user.get(`planning_visible_users`);
          if (visibleUsersResponse.data?.value) {
            visibleIds = visibleUsersResponse.data.value;
          }
        } catch (error: any) {
          if (error.response?.status !== 404) {
            logger.error('Error loading visible users:', error, 'usePlanningData');
          }
        }

        // If no user-specific preferences, try global defaults
        if (!userIds || !visibleIds) {
          const globalDefaults = await loadGlobalDefaults();
          if (globalDefaults) {
            if (!userIds && globalDefaults.userOrder) {
              userIds = globalDefaults.userOrder;
            }
            if (!visibleIds && globalDefaults.visibleUsers) {
              visibleIds = globalDefaults.visibleUsers;
            }
          }
        }

        // Apply user order if available
        if (userIds) {
          const orderedUsers: User[] = [];
          userIds.forEach((userId: string) => {
            const user = loadedUsers.find((u: any) => u.id === userId);
            if (user) {
              orderedUsers.push(user);
            }
          });

          // Add any new users that weren't in the saved order
          loadedUsers.forEach((user: any) => {
            if (!userIds!.includes(user.id)) {
              orderedUsers.push(user);
            }
          });

          loadedUsers = orderedUsers;
        }
      } catch (error) {
        logger.error('Error loading preferences:', error, 'usePlanningData');
      }

      // Set users and visibleUserIds together AFTER preferences are loaded
      // This prevents the flash of all users before filtering
      setUsers(loadedUsers);
      if (visibleIds) {
        setVisibleUserIds(visibleIds);
      } else {
        // If no preferences, show all users (first-time user)
        setVisibleUserIds(loadedUsers.map((u: any) => u.id));
      }
    } catch (error) {
      logger.error('Error loading data:', error, 'usePlanningData');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [loadGlobalDefaults]);

  return {
    users,
    projects,
    filteredProjects,
    blockAssignments,
    deadlineTasks,
    visibleUserIds,
    loading,
    setUsers,
    setProjects,
    setFilteredProjects,
    setBlockAssignments,
    setDeadlineTasks,
    setVisibleUserIds,
    loadData,
    loadGlobalDefaults,
  };
};
