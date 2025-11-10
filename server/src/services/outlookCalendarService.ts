// Temporary stub to fix TypeScript compilation
// Actual Outlook integration temporarily disabled

export const outlookCalendarService = {
  syncDeadlineTaskToAllUsers: async (deadlineTaskId: string) => {
    console.log('[Outlook] Sync disabled - deadline task:', deadlineTaskId);
  },
  deleteDeadlineTaskFromAllUsers: async (deadlineTaskId: string) => {
    console.log('[Outlook] Delete disabled - deadline task:', deadlineTaskId);
  },
  syncPlanningTask: async (planningTaskId: string, userId: string) => {
    console.log('[Outlook] Sync disabled - planning task:', planningTaskId);
  },
  syncPlanningTaskForUser: async (planningTaskId: string, userId: string) => {
    console.log('[Outlook] Sync disabled - planning task for user:', planningTaskId);
  },
  deletePlanningTask: async (planningTaskId: string, userId: string) => {
    console.log('[Outlook] Delete disabled - planning task:', planningTaskId);
  },
  deletePlanningTaskForUser: async (planningTaskId: string, userId: string) => {
    console.log('[Outlook] Delete disabled - planning task for user:', planningTaskId);
  },
  deletePlanningTaskByEventId: async (outlookEventId: string, userId: string) => {
    console.log('[Outlook] Delete by event ID disabled:', outlookEventId);
  },
  syncAllUserTasks: async (userId: string) => {
    console.log('[Outlook] Sync all disabled - user:', userId);
  },
  getAuthorizationUrl: (redirectUri: string) => {
    return 'https://disabled';
  },
  exchangeCodeForTokens: async (code: string, redirectUri: string) => {
    return 'disabled';
  },
};
