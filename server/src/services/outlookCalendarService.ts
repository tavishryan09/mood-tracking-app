import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import prisma from '../config/database';
import { syncJobTracker } from './syncJobTracker';

// Microsoft App Configuration
// Read environment variables at runtime (not at module load time)
// This ensures Vercel serverless functions can properly access the env vars
function getMicrosoftCredentials() {
  return {
    clientId: (process.env.MICROSOFT_CLIENT_ID || '').trim(),
    clientSecret: (process.env.MICROSOFT_CLIENT_SECRET || '').trim(),
    tenantId: 'common' // Use 'common' for multitenant + personal accounts
  };
}

interface OutlookEvent {
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  body?: { contentType: string; content: string };
  isAllDay?: boolean;
  categories?: string[];
}

class OutlookCalendarService {
  private readonly MOOD_TRACKER_CALENDAR_NAME = 'Mood Tracker';

  /**
   * Get or create the Mood Tracker calendar for a user
   */
  private async getMoodTrackerCalendar(client: Client): Promise<string | null> {
    try {
      // Get all calendars
      const calendars = await client.api('/me/calendars').get();

      // Find the Mood Tracker calendar
      const moodTrackerCalendar = calendars.value.find(
        (cal: any) => cal.name === this.MOOD_TRACKER_CALENDAR_NAME
      );

      if (moodTrackerCalendar) {
        console.log(`[Outlook] Found existing Mood Tracker calendar: ${moodTrackerCalendar.id}`);
        return moodTrackerCalendar.id;
      }

      // Create the Mood Tracker calendar if it doesn't exist
      console.log('[Outlook] Creating Mood Tracker calendar...');
      const newCalendar = await client.api('/me/calendars').post({
        name: this.MOOD_TRACKER_CALENDAR_NAME
      });

      console.log(`[Outlook] Created Mood Tracker calendar: ${newCalendar.id}`);
      return newCalendar.id;
    } catch (error) {
      console.error('[Outlook] Error getting/creating Mood Tracker calendar:', error);
      return null;
    }
  }

  /**
   * Get Microsoft Graph client for a user
   */
  private async getGraphClient(userId: string): Promise<Client | null> {
    console.log(`[Outlook] Getting Graph client for user: ${userId}`);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { outlookRefreshToken: true, outlookCalendarEnabled: true }
    });

    console.log(`[Outlook] User outlook settings - enabled: ${user?.outlookCalendarEnabled}, hasToken: ${!!user?.outlookRefreshToken}`);

    if (!user?.outlookRefreshToken || !user.outlookCalendarEnabled) {
      console.log('[Outlook] No refresh token or Outlook not enabled - skipping sync');
      return null;
    }

    try {
      console.log('[Outlook] Attempting to exchange refresh token for access token...');
      // Get credentials at runtime
      const creds = getMicrosoftCredentials();

      // Exchange refresh token for access token
      const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            refresh_token: user.outlookRefreshToken,
            grant_type: 'refresh_token',
            scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
          })
        }
      );

      console.log('[Outlook] Token refresh response status:', tokenResponse.status);

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[Outlook] Failed to refresh token. Status:', tokenResponse.status);
        console.error('[Outlook] Error response:', errorText);
        return null;
      }

      const tokenData = await tokenResponse.json() as { access_token: string };
      console.log('[Outlook] Successfully got access token');
      const accessToken = tokenData.access_token;

      // Create Graph client
      console.log('[Outlook] Creating Microsoft Graph client...');
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        }
      });
      console.log('[Outlook] Graph client created successfully');
      return client;
    } catch (error) {
      console.error('[Outlook] Error getting Graph client:', error);
      return null;
    }
  }

  /**
   * Create master categories in Outlook calendar
   */
  async ensureMasterCategories(userId: string): Promise<boolean> {
    console.log(`[Outlook] Ensuring master categories for user: ${userId}`);
    try {
      const client = await this.getGraphClient(userId);
      if (!client) {
        console.log('[Outlook] No Graph client available - cannot create categories');
        return false;
      }

      // Define all categories with colors
      const categories = [
        { displayName: 'Project Task', color: 'preset0' },        // Red
        { displayName: 'Deadline', color: 'preset1' },            // Orange
        { displayName: 'Internal Deadline', color: 'preset2' },   // Brown
        { displayName: 'Project Milestone', color: 'preset3' },   // Yellow
        { displayName: 'Out of office', color: 'preset4' },       // Green
        { displayName: 'Time off', color: 'preset5' },            // Teal
        { displayName: 'Unavailable', color: 'preset6' },         // Olive
      ];

      // Get existing categories
      const existingCategories = await client.api('/me/outlook/masterCategories').get();
      const existingNames = existingCategories.value.map((cat: any) => cat.displayName);

      console.log('[Outlook] Existing categories:', existingNames);

      // Create missing categories
      for (const category of categories) {
        if (!existingNames.includes(category.displayName)) {
          console.log(`[Outlook] Creating category: ${category.displayName}`);
          await client.api('/me/outlook/masterCategories').post(category);
        } else {
          console.log(`[Outlook] Category already exists: ${category.displayName}`);
        }
      }

      console.log('[Outlook] Master categories ensured successfully');
      return true;
    } catch (error) {
      console.error('[Outlook] Error ensuring master categories:', error);
      return false;
    }
  }

  /**
   * Sync a single planning task to Outlook calendar
   * Optimized for serverless - uses efficient helper methods
   */
  async syncPlanningTask(taskId: string, userId: string): Promise<boolean> {
    console.log(`[Outlook] syncPlanningTask - taskId: ${taskId}, userId: ${userId}`);
    try {
      // Get Graph client
      const client = await this.getGraphClient(userId);
      if (!client) {
        console.error('[Outlook] No Graph client available');
        return false;
      }

      // Get or create the Mood Tracker calendar
      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        console.error('[Outlook] Could not get/create Mood Tracker calendar');
        return false;
      }

      // Ensure master categories exist
      await this.ensureMasterCategories(userId);

      // Fetch task with project data
      const task = await prisma.planningTask.findUnique({
        where: { id: taskId },
        include: { project: true }
      });

      if (!task) {
        console.log('[Outlook] Task not found');
        return false;
      }

      // Use the same optimized sync method as batch sync
      const success = await this.syncPlanningTaskFast(task, client, calendarId);
      console.log(`[Outlook] syncPlanningTask ${success ? 'succeeded' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('[Outlook] Error syncing planning task:', error);
      return false;
    }
  }

  /**
   * Sync a single deadline task to Outlook calendar
   * Optimized for serverless - uses efficient helper methods
   */
  async syncDeadlineTask(taskId: string, userId: string): Promise<boolean> {
    console.log(`[Outlook] syncDeadlineTask - taskId: ${taskId}, userId: ${userId}`);
    try {
      // Get Graph client
      const client = await this.getGraphClient(userId);
      if (!client) {
        console.error('[Outlook] No Graph client available');
        return false;
      }

      // Get or create the Mood Tracker calendar
      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        console.error('[Outlook] Could not get/create Mood Tracker calendar');
        return false;
      }

      // Ensure master categories exist
      await this.ensureMasterCategories(userId);

      // Fetch task with client and project data
      const task = await prisma.deadlineTask.findUnique({
        where: { id: taskId },
        include: { client: true, project: true }
      });

      if (!task) {
        console.log('[Outlook] Task not found');
        return false;
      }

      // Use the same optimized sync method as batch sync
      const success = await this.syncDeadlineTaskFast(task, client, calendarId, userId);
      console.log(`[Outlook] syncDeadlineTask ${success ? 'succeeded' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('[Outlook] Error syncing deadline task:', error);
      return false;
    }
  }

  /**
   * Delete a planning task from Outlook calendar
   */
  async deletePlanningTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const client = await this.getGraphClient(userId);
      if (!client) return false;

      const task = await prisma.planningTask.findUnique({
        where: { id: taskId },
        select: { outlookEventId: true }
      });

      if (!task?.outlookEventId) return true; // Nothing to delete

      try {
        await client.api(`/me/events/${task.outlookEventId}`).delete();
        console.log(`[Outlook] Deleted planning task event: ${task.outlookEventId}`);
        return true;
      } catch (error: any) {
        // If event doesn't exist (404), that's fine
        if (error.statusCode === 404) {
          return true;
        }
        throw error;
      }
    } catch (error) {
      console.error('[Outlook] Error deleting planning task:', error);
      return false;
    }
  }

  /**
   * Delete a planning task from Outlook calendar using the outlookEventId directly
   * (used when the task has already been deleted from the database)
   */
  async deletePlanningTaskByEventId(outlookEventId: string, userId: string): Promise<boolean> {
    try {
      const client = await this.getGraphClient(userId);
      if (!client) return false;

      if (!outlookEventId) return true; // Nothing to delete

      try {
        await client.api(`/me/events/${outlookEventId}`).delete();
        console.log(`[Outlook] Deleted planning task event: ${outlookEventId} for user: ${userId}`);
        return true;
      } catch (error: any) {
        // If event doesn't exist (404), that's fine
        if (error.statusCode === 404) {
          console.log(`[Outlook] Event ${outlookEventId} not found (already deleted)`);
          return true;
        }
        throw error;
      }
    } catch (error) {
      console.error('[Outlook] Error deleting planning task by event ID:', error);
      return false;
    }
  }

  /**
   * Delete a planning task from ALL users' Outlook calendars
   */
  async deletePlanningTaskFromAllUsers(taskId: string): Promise<void> {
    try {
      console.log(`[Outlook] Deleting planning task ${taskId} from all users' calendars`);

      // Get all users with Outlook enabled
      const users = await prisma.user.findMany({
        where: { outlookCalendarEnabled: true },
        select: { id: true }
      });

      console.log(`[Outlook] Found ${users.length} users with Outlook enabled`);

      // Delete from each user's calendar
      for (const user of users) {
        await this.deletePlanningTask(taskId, user.id);
      }

      console.log(`[Outlook] Finished deleting planning task from all users`);
    } catch (error) {
      console.error('[Outlook] Error deleting planning task from all users:', error);
    }
  }

  /**
   * Sync a planning task to ALL users' Outlook calendars
   */
  async syncPlanningTaskToAllUsers(taskId: string): Promise<void> {
    try {
      console.log(`[Outlook] Syncing planning task ${taskId} to all users' calendars`);

      // Get all users with Outlook enabled
      const users = await prisma.user.findMany({
        where: { outlookCalendarEnabled: true },
        select: { id: true }
      });

      console.log(`[Outlook] Found ${users.length} users with Outlook enabled`);

      // Sync to each user's calendar
      for (const user of users) {
        await this.syncPlanningTask(taskId, user.id);
      }

      console.log(`[Outlook] Finished syncing planning task to all users`);
    } catch (error) {
      console.error('[Outlook] Error syncing planning task to all users:', error);
    }
  }

  /**
   * Delete a deadline task from Outlook calendar
   */
  async deleteDeadlineTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const client = await this.getGraphClient(userId);
      if (!client) return false;

      const task = await prisma.deadlineTask.findUnique({
        where: { id: taskId },
        select: { outlookEventId: true }
      });

      if (!task?.outlookEventId) return true; // Nothing to delete

      try {
        await client.api(`/me/events/${task.outlookEventId}`).delete();
        console.log(`[Outlook] Deleted deadline task event: ${task.outlookEventId}`);
        return true;
      } catch (error: any) {
        // If event doesn't exist (404), that's fine
        if (error.statusCode === 404) {
          return true;
        }
        throw error;
      }
    } catch (error) {
      console.error('[Outlook] Error deleting deadline task:', error);
      return false;
    }
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(redirectUri: string): string {
    const creds = getMicrosoftCredentials();
    const scopes = 'https://graph.microsoft.com/Calendars.ReadWrite offline_access';
    const params = new URLSearchParams({
      client_id: creds.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      response_mode: 'query'
    });

    return `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/authorize?${params}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<string | null> {
    try {
      const creds = getMicrosoftCredentials();
      const response = await fetch(
        `https://login.microsoftonline.com/${creds.tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
          })
        }
      );

      if (!response.ok) {
        console.error('[Outlook] Token exchange failed:', await response.text());
        return null;
      }

      const data = await response.json() as { refresh_token: string };
      return data.refresh_token;
    } catch (error) {
      console.error('[Outlook] Error exchanging code for tokens:', error);
      return null;
    }
  }

  /**
   * Sync a deadline task to ALL users' Outlook calendars
   */
  async syncDeadlineTaskToAllUsers(taskId: string): Promise<void> {
    try {
      console.log(`[Outlook] Syncing deadline task ${taskId} to all users' calendars`);

      // Get all users with Outlook enabled
      const users = await prisma.user.findMany({
        where: { outlookCalendarEnabled: true },
        select: { id: true }
      });

      console.log(`[Outlook] Found ${users.length} users with Outlook enabled`);

      // Sync to each user's calendar
      for (const user of users) {
        await this.syncDeadlineTask(taskId, user.id);
      }

      console.log(`[Outlook] Finished syncing deadline task to all users`);
    } catch (error) {
      console.error('[Outlook] Error syncing deadline task to all users:', error);
    }
  }

  /**
   * Delete a deadline task from ALL users' Outlook calendars
   */
  async deleteDeadlineTaskFromAllUsers(taskId: string): Promise<void> {
    try {
      console.log(`[Outlook] Deleting deadline task ${taskId} from all users' calendars`);

      // Get all users with Outlook enabled
      const users = await prisma.user.findMany({
        where: { outlookCalendarEnabled: true },
        select: { id: true }
      });

      console.log(`[Outlook] Found ${users.length} users with Outlook enabled`);

      // Delete from each user's calendar
      for (const user of users) {
        await this.deleteDeadlineTask(taskId, user.id);
      }

      console.log(`[Outlook] Finished deleting deadline task from all users`);
    } catch (error) {
      console.error('[Outlook] Error deleting deadline task from all users:', error);
    }
  }

  /**
   * Sync all existing tasks for a user to Outlook calendar
   * Incremental sync approach:
   * 1. Sync/update all tasks from database (create new or update existing)
   * 2. Delete orphaned events (events in Outlook but not in database)
   *
   * This is efficient for large datasets and preserves existing events
   *
   * @param jobId Optional job ID for progress tracking
   * @returns Sync progress information
   */
  /**
   * Build Outlook event object from planning task data
   * Extracted for reuse in batch API calls
   */
  private buildPlanningTaskEvent(task: any): OutlookEvent | null {
    try {
      // Build date strings
      const taskDate = new Date(task.date);
      const year = taskDate.getFullYear();
      const month = String(taskDate.getMonth() + 1).padStart(2, '0');
      const day = String(taskDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const taskEndDate = new Date(taskDate);
      taskEndDate.setDate(taskEndDate.getDate() + 1);
      const endYear = taskEndDate.getFullYear();
      const endMonth = String(taskEndDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(taskEndDate.getDate()).padStart(2, '0');
      const endDateString = `${endYear}-${endMonth}-${endDay}`;

      // Determine subject, category, body
      let subject: string;
      let category: string;
      let bodyContent: string;

      const isStatusEvent = !task.projectId;

      if (isStatusEvent) {
        const statusName = task.task || '';
        if (statusName === 'Time Off') {
          subject = 'PTO';
          category = 'Time off';
          bodyContent = 'Time Off\n\nAdded by MoodTracker';
        } else if (statusName === 'Unavailable') {
          subject = 'Unavailable';
          category = 'Unavailable';
          bodyContent = 'Unavailable\n\nAdded by MoodTracker';
        } else if (statusName === 'Out of Office') {
          subject = 'OOS';
          category = 'Out of office';
          bodyContent = 'Out of Office\n\nAdded by MoodTracker';
        } else {
          subject = statusName || 'Status Event';
          category = 'Project Task';
          bodyContent = `${statusName}\n\nAdded by MoodTracker`;
        }
      } else if (!task.project) {
        return null;
      } else {
        const commonName = task.project.description || task.project.name;

        if (task.project.name === 'Time Off') {
          subject = 'PTO';
          category = 'Time off';
          bodyContent = `Time Off\n\nAdded by MoodTracker`;
        } else if (task.project.name === 'Out of Office' || task.task?.startsWith('[OUT_OF_OFFICE]')) {
          subject = `OOS - ${commonName}`;
          category = 'Out of office';
          const taskDescription = task.task?.replace('[OUT_OF_OFFICE]', '').trim() || '';
          bodyContent = taskDescription
            ? `Project: ${commonName}\nTask: ${taskDescription}\n\nAdded by MoodTracker`
            : `Project: ${commonName}\n\nAdded by MoodTracker`;
        } else if (task.project.name === 'Unavailable') {
          subject = 'Unavailable';
          category = 'Unavailable';
          bodyContent = `Unavailable\n\nAdded by MoodTracker`;
        } else {
          subject = commonName;
          category = 'Project Task';
          bodyContent = task.task
            ? `Project: ${commonName}\nTask: ${task.task}\n\nAdded by MoodTracker`
            : `Project: ${commonName}\n\nAdded by MoodTracker`;
        }
      }

      return {
        subject: subject,
        start: {
          dateTime: dateString,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDateString,
          timeZone: 'UTC'
        },
        isAllDay: true,
        body: {
          contentType: 'text',
          content: bodyContent
        },
        categories: [category]
      };
    } catch (error) {
      console.error(`[Outlook] Error building event for task ${task.id}:`, error);
      return null;
    }
  }

  /**
   * Helper method to build Outlook event object for a deadline task
   * Extracted for reuse in batch API and individual sync
   */
  private buildDeadlineTaskEvent(task: any): OutlookEvent | null {
    try {
      const deadlineDate = new Date(task.date);
      deadlineDate.setUTCHours(0, 0, 0, 0);
      const deadlineEndDate = new Date(deadlineDate);
      deadlineEndDate.setDate(deadlineEndDate.getDate() + 1);

      const commonName = task.project?.description || task.project?.name || 'Unknown';

      let title = '';
      let category = '';

      switch (task.deadlineType) {
        case 'DEADLINE':
          title = `Deadline - ${commonName}`;
          category = 'Deadline';
          break;
        case 'INTERNAL_DEADLINE':
          title = `Internal - ${commonName}`;
          category = 'Internal Deadline';
          break;
        case 'MILESTONE':
          title = `Milestone - ${commonName}`;
          category = 'Project Milestone';
          break;
        default:
          title = commonName;
          category = 'Deadline';
      }

      return {
        subject: title,
        start: {
          dateTime: deadlineDate.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: deadlineEndDate.toISOString(),
          timeZone: 'UTC'
        },
        isAllDay: true,
        body: {
          contentType: 'text',
          content: [
            `Type: ${task.deadlineType}`,
            task.client ? `Client: ${task.client.name}` : null,
            task.project ? `Project: ${task.project.description || task.project.name}` : null,
            task.description ? `Description: ${task.description}` : null,
            '',
            'Added by MoodTracker'
          ].filter(line => line !== null).join('\n')
        },
        categories: [category]
      };
    } catch (error) {
      console.error(`[Outlook] Error building event for deadline task ${task.id}:`, error);
      return null;
    }
  }

  /**
   * Fast sync for planning task (optimized for serverless)
   * Takes task data directly to avoid extra DB queries
   * Uses update-or-create pattern to minimize API calls
   */
  private async syncPlanningTaskFast(
    task: any,
    client: Client,
    calendarId: string
  ): Promise<boolean> {
    try {
      const event = this.buildPlanningTaskEvent(task);
      if (!event) return false;

      let eventId = task.outlookEventId;

      if (eventId) {
        // Try to update existing event
        try {
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).update(event);
          return true;
        } catch (error: any) {
          // Event not found or update failed - create new one
          if (error.statusCode === 404) {
            const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
            await prisma.planningTask.update({
              where: { id: task.id },
              data: { outlookEventId: createdEvent.id }
            });
            return true;
          }
          throw error;
        }
      } else {
        // Create new event
        const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
        await prisma.planningTask.update({
          where: { id: task.id },
          data: { outlookEventId: createdEvent.id }
        });
        return true;
      }
    } catch (error) {
      console.error(`[Outlook] Error syncing planning task ${task.id}:`, error);
      return false;
    }
  }

  /**
   * Sync only planning tasks to Outlook
   */
  async syncPlanningTasks(userId: string, jobId?: string): Promise<{
    success: boolean;
    totalTasks: number;
    syncedTasks: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      totalTasks: 0,
      syncedTasks: 0,
      errors: [] as string[]
    };

    try {
      console.log(`[Outlook] Starting planning tasks sync for user ${userId}`);

      const client = await this.getGraphClient(userId);
      if (!client) {
        result.errors.push('No Graph client available');
        return result;
      }

      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        result.errors.push('Could not get/create Mood Tracker calendar');
        return result;
      }

      await this.ensureMasterCategories(userId);

      // Get planning tasks from database WITH project data (single query)
      const planningTasks = await prisma.planningTask.findMany({
        where: { userId },
        include: { project: true }
      });
      console.log(`[Outlook] Found ${planningTasks.length} planning tasks`);
      result.totalTasks = planningTasks.length;

      // Update job progress
      if (jobId) {
        await syncJobTracker.updateProgress(jobId, {
          totalTasks: result.totalTasks,
          syncedPlanningTasks: 0
        });
      }

      // Use Microsoft Graph Batch API to reduce API calls
      // Batch up to 20 requests per batch (Microsoft Graph limit)
      const BATCH_SIZE = 20;

      for (let i = 0; i < planningTasks.length; i += BATCH_SIZE) {
        const batch = planningTasks.slice(i, i + BATCH_SIZE);

        // Build batch requests
        const batchRequests = batch.map((task, index) => {
          const event = this.buildPlanningTaskEvent(task);
          if (!event) return null;

          // If task has outlookEventId, try to update; otherwise create
          if (task.outlookEventId) {
            return {
              id: index.toString(),
              method: 'PATCH',
              url: `/me/calendars/${calendarId}/events/${task.outlookEventId}`,
              body: event,
              headers: { 'Content-Type': 'application/json' }
            };
          } else {
            return {
              id: index.toString(),
              method: 'POST',
              url: `/me/calendars/${calendarId}/events`,
              body: event,
              headers: { 'Content-Type': 'application/json' }
            };
          }
        }).filter(r => r !== null);

        if (batchRequests.length === 0) continue;

        // Execute batch request
        try {
          const batchResponse = await client.api('/$batch').post({ requests: batchRequests });

          // Process batch responses
          for (let j = 0; j < batchResponse.responses.length; j++) {
            const response = batchResponse.responses[j];
            const taskIndex = parseInt(response.id);
            const task = batch[taskIndex];

            if (response.status >= 200 && response.status < 300) {
              result.syncedTasks++;

              // If it was a POST (create), save the new eventId
              if (!task.outlookEventId && response.body?.id) {
                await prisma.planningTask.update({
                  where: { id: task.id },
                  data: { outlookEventId: response.body.id }
                });
              }
            } else if (response.status === 404 && task.outlookEventId) {
              // Event not found, need to create it - handle in next iteration
              console.log(`[Outlook] Event ${task.outlookEventId} not found, will recreate`);
              // Clear the invalid eventId
              await prisma.planningTask.update({
                where: { id: task.id },
                data: { outlookEventId: null }
              });
            } else {
              console.error(`[Outlook] Batch request failed for task ${task.id}:`, response.status, response.body);
            }
          }
        } catch (error) {
          console.error('[Outlook] Batch API error:', error);
          // Fallback to individual sync for this batch
          for (const task of batch) {
            const success = await this.syncPlanningTaskFast(task, client, calendarId);
            if (success) result.syncedTasks++;
          }
        }

        // Report progress
        if (jobId) {
          await syncJobTracker.updateProgress(jobId, {
            syncedPlanningTasks: result.syncedTasks
          });
        }

        console.log(`[Outlook] Planning tasks progress: ${result.syncedTasks}/${planningTasks.length}`);
      }

      result.success = result.syncedTasks === result.totalTasks;
      console.log(`[Outlook] Planning tasks sync completed: ${result.syncedTasks}/${result.totalTasks}`);

      return result;
    } catch (error) {
      console.error('[Outlook] Error syncing planning tasks:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Fast sync for deadline task (optimized for serverless)
   * Takes task data directly to avoid extra DB queries
   * Uses update-or-create pattern to minimize API calls
   */
  private async syncDeadlineTaskFast(
    task: any,
    client: Client,
    calendarId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const event = this.buildDeadlineTaskEvent(task);
      if (!event) return false;

      let eventId = task.outlookEventId;

      if (eventId) {
        // Try to update existing event
        try {
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).update(event);
          return true;
        } catch (error: any) {
          // Event not found - create new one
          if (error.statusCode === 404) {
            const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
            await prisma.deadlineTask.update({
              where: { id: task.id },
              data: { outlookEventId: createdEvent.id }
            });
            return true;
          }
          throw error;
        }
      } else {
        // Create new event
        const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
        await prisma.deadlineTask.update({
          where: { id: task.id },
          data: { outlookEventId: createdEvent.id }
        });
        return true;
      }
    } catch (error) {
      console.error(`[Outlook] Error syncing deadline task ${task.id}:`, error);
      return false;
    }
  }

  /**
   * Sync only deadline tasks to Outlook
   */
  async syncDeadlineTasks(userId: string, jobId?: string): Promise<{
    success: boolean;
    totalTasks: number;
    syncedTasks: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      totalTasks: 0,
      syncedTasks: 0,
      errors: [] as string[]
    };

    try {
      console.log(`[Outlook] Starting deadline tasks sync for user ${userId}`);

      const client = await this.getGraphClient(userId);
      if (!client) {
        result.errors.push('No Graph client available');
        return result;
      }

      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        result.errors.push('Could not get/create Mood Tracker calendar');
        return result;
      }

      // Get all deadline tasks (team-wide) WITH project and client data
      const deadlineTasks = await prisma.deadlineTask.findMany({
        include: { project: true, client: true }
      });
      console.log(`[Outlook] Found ${deadlineTasks.length} deadline tasks`);
      result.totalTasks = deadlineTasks.length;

      // Update job progress
      if (jobId) {
        await syncJobTracker.updateProgress(jobId, {
          syncedDeadlineTasks: 0
        });
      }

      // Use Microsoft Graph Batch API to reduce API calls
      // Batch up to 20 requests per batch (Microsoft Graph limit)
      const BATCH_SIZE = 20;

      for (let i = 0; i < deadlineTasks.length; i += BATCH_SIZE) {
        const batch = deadlineTasks.slice(i, i + BATCH_SIZE);

        // Build batch requests
        const batchRequests = batch.map((task, index) => {
          const event = this.buildDeadlineTaskEvent(task);
          if (!event) return null;

          // If task has outlookEventId, try to update; otherwise create
          if (task.outlookEventId) {
            return {
              id: index.toString(),
              method: 'PATCH',
              url: `/me/calendars/${calendarId}/events/${task.outlookEventId}`,
              body: event,
              headers: { 'Content-Type': 'application/json' }
            };
          } else {
            return {
              id: index.toString(),
              method: 'POST',
              url: `/me/calendars/${calendarId}/events`,
              body: event,
              headers: { 'Content-Type': 'application/json' }
            };
          }
        }).filter(r => r !== null);

        if (batchRequests.length === 0) continue;

        // Execute batch request
        try {
          const batchResponse = await client.api('/$batch').post({ requests: batchRequests });

          // Process batch responses
          for (let j = 0; j < batchResponse.responses.length; j++) {
            const response = batchResponse.responses[j];
            const taskIndex = parseInt(response.id);
            const task = batch[taskIndex];

            if (response.status >= 200 && response.status < 300) {
              result.syncedTasks++;

              // If it was a POST (create), save the new eventId
              if (!task.outlookEventId && response.body?.id) {
                await prisma.deadlineTask.update({
                  where: { id: task.id },
                  data: { outlookEventId: response.body.id }
                });
              }
            } else if (response.status === 404 && task.outlookEventId) {
              // Event not found, need to create it - handle in next iteration
              console.log(`[Outlook] Event ${task.outlookEventId} not found, will recreate`);
              // Clear the invalid eventId
              await prisma.deadlineTask.update({
                where: { id: task.id },
                data: { outlookEventId: null }
              });
            } else {
              console.error(`[Outlook] Batch request failed for task ${task.id}:`, response.status, response.body);
            }
          }
        } catch (error) {
          console.error('[Outlook] Batch API error:', error);
          // Fallback to individual sync for this batch
          for (const task of batch) {
            const success = await this.syncDeadlineTaskFast(task, client, calendarId, userId);
            if (success) result.syncedTasks++;
          }
        }

        // Report progress
        if (jobId) {
          await syncJobTracker.updateProgress(jobId, {
            syncedDeadlineTasks: result.syncedTasks
          });
        }

        console.log(`[Outlook] Deadline tasks progress: ${result.syncedTasks}/${deadlineTasks.length}`);
      }

      result.success = result.syncedTasks === result.totalTasks;
      console.log(`[Outlook] Deadline tasks sync completed: ${result.syncedTasks}/${result.totalTasks}`);

      return result;
    } catch (error) {
      console.error('[Outlook] Error syncing deadline tasks:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Clean up orphaned Outlook events (events that no longer exist in database)
   */
  async cleanupOrphanedEvents(userId: string, jobId?: string): Promise<{
    success: boolean;
    deletedEvents: number;
    errors: string[];
  }> {
    const result = {
      success: false,
      deletedEvents: 0,
      errors: [] as string[]
    };

    try {
      console.log(`[Outlook] Starting orphaned events cleanup for user ${userId}`);

      const client = await this.getGraphClient(userId);
      if (!client) {
        result.errors.push('No Graph client available');
        return result;
      }

      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        result.errors.push('Could not get/create Mood Tracker calendar');
        return result;
      }

      // Get all Outlook events
      const events = await client
        .api(`/me/calendars/${calendarId}/events`)
        .select('id,subject')
        .top(999)
        .get();

      const existingEvents = events.value || [];
      console.log(`[Outlook] Found ${existingEvents.length} existing Outlook events`);

      // Get valid event IDs from database
      const [planningTasks, deadlineTasks] = await Promise.all([
        prisma.planningTask.findMany({
          where: { userId },
          select: { outlookEventId: true }
        }),
        prisma.deadlineTask.findMany({
          select: { outlookEventId: true }
        })
      ]);

      const validEventIds = new Set<string>();
      [...planningTasks, ...deadlineTasks].forEach(task => {
        if (task.outlookEventId) {
          validEventIds.add(task.outlookEventId);
        }
      });

      console.log(`[Outlook] Valid event IDs: ${validEventIds.size}`);

      // Find and delete orphans
      const orphanedEvents = existingEvents.filter((e: any) => !validEventIds.has(e.id));
      console.log(`[Outlook] Found ${orphanedEvents.length} orphaned events to delete`);

      if (orphanedEvents.length > 0) {
        await Promise.all(
          orphanedEvents.map((event: any) =>
            client.api(`/me/calendars/${calendarId}/events/${event.id}`).delete()
              .then(() => {
                result.deletedEvents++;
                return true;
              })
              .catch((error: any) => {
                if (error.statusCode !== 404) {
                  console.error(`[Outlook] Error deleting orphan ${event.id}:`, error);
                }
                return false;
              })
          )
        );

        // Report progress
        if (jobId) {
          await syncJobTracker.updateProgress(jobId, {
            deletedEvents: result.deletedEvents
          });
        }
      }

      result.success = true;
      console.log(`[Outlook] Cleanup completed: deleted ${result.deletedEvents} orphaned events`);

      return result;
    } catch (error) {
      console.error('[Outlook] Error cleaning up orphaned events:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }

  /**
   * Legacy method - kept for backwards compatibility
   * Now orchestrates the three separate sync operations
   */
  async syncAllUserTasks(userId: string, jobId?: string): Promise<{
    success: boolean;
    totalTasks: number;
    syncedPlanningTasks: number;
    syncedDeadlineTasks: number;
    deletedEvents: number;
    errors: string[];
  }> {
    const progress = {
      success: false,
      totalTasks: 0,
      syncedPlanningTasks: 0,
      syncedDeadlineTasks: 0,
      deletedEvents: 0,
      errors: [] as string[]
    };

    try {
      // Phase 1: Sync planning tasks
      const planningResult = await this.syncPlanningTasks(userId, jobId);
      progress.totalTasks += planningResult.totalTasks;
      progress.syncedPlanningTasks = planningResult.syncedTasks;
      progress.errors.push(...planningResult.errors);

      // Phase 2: Sync deadline tasks
      const deadlineResult = await this.syncDeadlineTasks(userId, jobId);
      progress.totalTasks += deadlineResult.totalTasks;
      progress.syncedDeadlineTasks = deadlineResult.syncedTasks;
      progress.errors.push(...deadlineResult.errors);

      // Phase 3: Cleanup orphaned events
      const cleanupResult = await this.cleanupOrphanedEvents(userId, jobId);
      progress.deletedEvents = cleanupResult.deletedEvents;
      progress.errors.push(...cleanupResult.errors);

      progress.success = planningResult.success && deadlineResult.success && cleanupResult.success;

      // Mark job as completed
      if (jobId) {
        await syncJobTracker.completeJob(jobId, progress);
      }

      return progress;
    } catch (error) {
      console.error('[Outlook] Error in sync orchestration:', error);
      progress.errors.push(error instanceof Error ? error.message : 'Unknown error');

      if (jobId) {
        await syncJobTracker.failJob(jobId, error instanceof Error ? error.message : 'Unknown error');
      }

      return progress;
    }
  }

}

export const outlookCalendarService = new OutlookCalendarService();
