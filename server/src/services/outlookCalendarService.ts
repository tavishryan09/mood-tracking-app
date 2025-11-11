import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import prisma from '../config/database';

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
   * Sync a planning task to Outlook calendar
   */
  async syncPlanningTask(taskId: string, userId: string): Promise<boolean> {
    console.log('================================================================================');
    console.log(`[Outlook] syncPlanningTask CALLED - taskId: ${taskId}, userId: ${userId}`);
    console.log('================================================================================');
    try {
      console.log('[Outlook] Step 1: Getting Graph client...');
      const client = await this.getGraphClient(userId);
      if (!client) {
        console.error('[Outlook] ERROR: No Graph client available - cannot sync planning task');
        return false;
      }
      console.log('[Outlook] Step 1: SUCCESS - Graph client obtained');

      // Get or create the Mood Tracker calendar
      console.log('[Outlook] Step 2: Getting/creating Mood Tracker calendar...');
      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        console.error('[Outlook] ERROR: Could not get/create Mood Tracker calendar');
        return false;
      }
      console.log(`[Outlook] Step 2: SUCCESS - Mood Tracker calendar ID: ${calendarId}`);

      console.log('[Outlook] Graph client obtained, fetching task from database...');
      const task = await prisma.planningTask.findUnique({
        where: { id: taskId },
        include: { project: true }
      });

      console.log('[Outlook] Task fetched:', task ? `project: ${task.project?.name}, task: ${task.task}` : 'null');

      if (!task) {
        console.log('[Outlook] Task not found, returning false');
        return false;
      }

      // Create as all-day event
      // IMPORTANT: For all-day events, use local date string (YYYY-MM-DD) format
      // DO NOT use setUTCHours() as it causes timezone shifts!
      const taskDate = new Date(task.date);
      const year = taskDate.getFullYear();
      const month = String(taskDate.getMonth() + 1).padStart(2, '0');
      const day = String(taskDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      // For all-day events, Outlook requires end date to be the next day
      const taskEndDate = new Date(taskDate);
      taskEndDate.setDate(taskEndDate.getDate() + 1);
      const endYear = taskEndDate.getFullYear();
      const endMonth = String(taskEndDate.getMonth() + 1).padStart(2, '0');
      const endDay = String(taskEndDate.getDate()).padStart(2, '0');
      const endDateString = `${endYear}-${endMonth}-${endDay}`;

      // Determine the event subject and category based on task type
      let subject: string;
      let category: string;
      let bodyContent: string;

      // Check if this is a status event (no project, status stored in task field)
      const isStatusEvent = !task.projectId;

      if (isStatusEvent) {
        // Status events: Time Off, Unavailable, Out of Office (without project)
        console.log('[Outlook] Processing status event, task field:', task.task);
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
          // Unknown status type, log warning but continue
          console.log('[Outlook] Warning: Unknown status type in task field:', statusName);
          subject = statusName || 'Status Event';
          category = 'Project Task';
          bodyContent = `${statusName}\n\nAdded by MoodTracker`;
        }
      } else if (!task.project) {
        // Task has projectId but project not found - data inconsistency
        console.log('[Outlook] Error: Task has projectId but project not loaded, returning false');
        return false;
      } else {
        // Regular project task or project with Out of Office marker
        const commonName = task.project.description || task.project.name;

        // Check for special status events
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
          // Regular project task
          subject = commonName;
          category = 'Project Task';
          bodyContent = task.task
            ? `Project: ${commonName}\nTask: ${task.task}\n\nAdded by MoodTracker`
            : `Project: ${commonName}\n\nAdded by MoodTracker`;
        }
      }

      const event: OutlookEvent = {
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

      let eventId = task.outlookEventId;
      console.log('[Outlook] Task outlookEventId:', eventId || 'null (will create new event)');

      if (eventId) {
        // Try to update the event in the Mood Tracker calendar first
        // If it doesn't exist there, delete from default calendar and create new one
        console.log('[Outlook] Checking if event exists in Mood Tracker calendar:', eventId);
        try {
          // Try to get the event from Mood Tracker calendar
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).get();
          // If we get here, event exists in Mood Tracker calendar, so update it
          console.log('[Outlook] Event found in Mood Tracker calendar, updating...');
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).update(event);
          console.log(`[Outlook] Successfully updated planning task event: ${eventId}`);
        } catch (error: any) {
          // Event doesn't exist in Mood Tracker calendar
          console.log('[Outlook] Event not in Mood Tracker calendar, migrating from default calendar...');

          // Try to delete from default calendar
          try {
            await client.api(`/me/events/${eventId}`).delete();
            console.log('[Outlook] Successfully deleted old event from default calendar');
          } catch (deleteError: any) {
            // If event doesn't exist anywhere (404), that's fine
            if (deleteError.statusCode !== 404) {
              console.log('[Outlook] Error deleting old event:', deleteError.statusCode, deleteError.message);
            }
          }

          // Create new event in Mood Tracker calendar
          console.log('[Outlook] Creating new event in Mood Tracker calendar...');
          const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
          eventId = createdEvent.id;
          await prisma.planningTask.update({
            where: { id: taskId },
            data: { outlookEventId: eventId }
          });
          console.log(`[Outlook] Created new planning task event in Mood Tracker calendar: ${eventId}`);
        }
      } else {
        // Create new event
        console.log('[Outlook] Creating new Outlook event...');
        console.log('[Outlook] Event data:', JSON.stringify(event, null, 2));
        const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
        console.log('[Outlook] Event created successfully. Event ID:', createdEvent.id);
        eventId = createdEvent.id;

        console.log('[Outlook] Updating task in database with Outlook event ID...');
        await prisma.planningTask.update({
          where: { id: taskId },
          data: { outlookEventId: eventId }
        });
        console.log(`[Outlook] Database updated. Created planning task event: ${eventId}`);
      }

      console.log('[Outlook] syncPlanningTask completed successfully, returning true');
      return true;
    } catch (error) {
      console.error('[Outlook] Error syncing planning task:', error);
      console.error('[Outlook] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }

  /**
   * Sync a deadline task to Outlook calendar
   */
  async syncDeadlineTask(taskId: string, userId: string): Promise<boolean> {
    try {
      const client = await this.getGraphClient(userId);
      if (!client) return false;

      // Get or create the Mood Tracker calendar
      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        console.log('[Outlook] Could not get/create Mood Tracker calendar');
        return false;
      }

      const task = await prisma.deadlineTask.findUnique({
        where: { id: taskId },
        include: { client: true, project: true }
      });

      if (!task) return false;

      const deadlineDate = new Date(task.date);
      // For all-day events, Outlook requires the time to be set to midnight
      deadlineDate.setUTCHours(0, 0, 0, 0);
      // For all-day events, Outlook requires end date to be at least 24 hours after start
      const deadlineEndDate = new Date(deadlineDate);
      deadlineEndDate.setDate(deadlineEndDate.getDate() + 1);

      // Use project common name
      const commonName = task.project?.description || task.project?.name || 'Unknown';

      // Format title and category based on deadline type
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

      const event: OutlookEvent = {
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

      let eventId = task.outlookEventId;

      if (eventId) {
        // Try to update the event in the Mood Tracker calendar first
        // If it doesn't exist there, delete from default calendar and create new one
        console.log('[Outlook] Checking if deadline event exists in Mood Tracker calendar:', eventId);
        try {
          // Try to get the event from Mood Tracker calendar
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).get();
          // If we get here, event exists in Mood Tracker calendar, so update it
          console.log('[Outlook] Deadline event found in Mood Tracker calendar, updating...');
          await client.api(`/me/calendars/${calendarId}/events/${eventId}`).update(event);
          console.log(`[Outlook] Successfully updated deadline task event: ${eventId}`);
        } catch (error: any) {
          // Event doesn't exist in Mood Tracker calendar
          console.log('[Outlook] Deadline event not in Mood Tracker calendar, migrating from default calendar...');

          // Try to delete from default calendar
          try {
            await client.api(`/me/events/${eventId}`).delete();
            console.log('[Outlook] Successfully deleted old deadline event from default calendar');
          } catch (deleteError: any) {
            // If event doesn't exist anywhere (404), that's fine
            if (deleteError.statusCode !== 404) {
              console.log('[Outlook] Error deleting old deadline event:', deleteError.statusCode, deleteError.message);
            }
          }

          // Create new event in Mood Tracker calendar
          console.log('[Outlook] Creating new deadline event in Mood Tracker calendar...');
          const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
          eventId = createdEvent.id;
          await prisma.deadlineTask.update({
            where: { id: taskId },
            data: { outlookEventId: eventId }
          });
          console.log(`[Outlook] Created new deadline task event in Mood Tracker calendar: ${eventId}`);
        }
      } else{
        // Create new event
        const createdEvent = await client.api(`/me/calendars/${calendarId}/events`).post(event);
        eventId = createdEvent.id;
        await prisma.deadlineTask.update({
          where: { id: taskId },
          data: { outlookEventId: eventId }
        });
        console.log(`[Outlook] Created deadline task event: ${eventId}`);
      }

      return true;
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
   * This function is smart about what to sync - it clears all existing events first,
   * then syncs only the current tasks from the database
   *
   * @returns Sync progress information
   */
  async syncAllUserTasks(userId: string): Promise<{
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
      console.log(`[Outlook] Starting bulk sync for user ${userId}`);

      const client = await this.getGraphClient(userId);
      if (!client) {
        console.log('[Outlook] No Graph client available - cannot sync');
        progress.errors.push('No Graph client available');
        return progress;
      }

      // Get or create the Mood Tracker calendar
      const calendarId = await this.getMoodTrackerCalendar(client);
      if (!calendarId) {
        console.log('[Outlook] Could not get/create Mood Tracker calendar');
        progress.errors.push('Could not get/create Mood Tracker calendar');
        return progress;
      }

      // First, ensure all master categories exist
      await this.ensureMasterCategories(userId);

      // Step 1: Get all existing events from Outlook Mood Tracker calendar
      console.log(`[Outlook] Fetching all existing Outlook events from Mood Tracker calendar...`);
      const events = await client
        .api(`/me/calendars/${calendarId}/events`)
        .select('id,subject,categories')
        .top(999)
        .get();

      const existingOutlookEvents = events.value || [];
      console.log(`[Outlook] Found ${existingOutlookEvents.length} existing Outlook events`);

      // Step 2: Delete ALL existing events from Outlook to ensure clean slate
      console.log(`[Outlook] Deleting all existing events to ensure clean slate...`);
      for (const event of existingOutlookEvents) {
        try {
          await client.api(`/me/calendars/${calendarId}/events/${event.id}`).delete();
          progress.deletedEvents++;
        } catch (error: any) {
          if (error.statusCode !== 404) {
            console.error(`[Outlook] Error deleting event ${event.id}:`, error);
            progress.errors.push(`Failed to delete event ${event.id}`);
          }
        }
      }
      console.log(`[Outlook] Deleted ${progress.deletedEvents} existing events`);

      // Step 3: Clear all outlookEventId fields in database to force fresh sync
      console.log(`[Outlook] Clearing outlookEventId fields in database...`);
      await prisma.planningTask.updateMany({
        where: { userId },
        data: { outlookEventId: null }
      });
      await prisma.deadlineTask.updateMany({
        data: { outlookEventId: null }
      });

      // Step 4: Get all planning tasks for the user from database
      // Include both project tasks AND status events (Time Off, Unavailable, Out of Office)
      const planningTasks = await prisma.planningTask.findMany({
        where: {
          userId
        }
      });

      console.log(`[Outlook] Found ${planningTasks.length} planning tasks to sync`);

      // Step 5: Get ALL deadline tasks (deadline tasks should be visible to all users)
      const deadlineTasks = await prisma.deadlineTask.findMany({});

      console.log(`[Outlook] Found ${deadlineTasks.length} deadline tasks to sync`);

      progress.totalTasks = planningTasks.length + deadlineTasks.length;

      // Step 6: Sync planning tasks (this will create new events and update outlookEventId)
      console.log(`[Outlook] Syncing ${planningTasks.length} planning tasks...`);
      for (const task of planningTasks) {
        const result = await this.syncPlanningTask(task.id, userId);
        if (result) {
          progress.syncedPlanningTasks++;
        } else {
          console.log(`[Outlook] Warning: Failed to sync planning task ${task.id}`);
          progress.errors.push(`Failed to sync planning task ${task.id}`);
        }
      }
      console.log(`[Outlook] Finished syncing all planning tasks`);

      // Step 7: Sync deadline tasks (this will create new events and update outlookEventId)
      console.log(`[Outlook] Syncing ${deadlineTasks.length} deadline tasks...`);
      for (const task of deadlineTasks) {
        const result = await this.syncDeadlineTask(task.id, userId);
        if (result) {
          progress.syncedDeadlineTasks++;
        } else {
          console.log(`[Outlook] Warning: Failed to sync deadline task ${task.id}`);
          progress.errors.push(`Failed to sync deadline task ${task.id}`);
        }
      }
      console.log(`[Outlook] Finished syncing all deadline tasks`);

      progress.success = progress.syncedPlanningTasks + progress.syncedDeadlineTasks === progress.totalTasks;
      console.log(`[Outlook] Bulk sync completed for user ${userId}`, progress);
      return progress;
    } catch (error) {
      console.error('[Outlook] Error in bulk sync:', error);
      progress.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return progress;
    }
  }

}

export const outlookCalendarService = new OutlookCalendarService();
