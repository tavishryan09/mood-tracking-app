import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { outlookCalendarService } from '../services/outlookCalendarService';

/**
 * Initiate Outlook OAuth flow
 */
export const initiateOutlookAuth = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Outlook Auth] API_URL from env:', process.env.API_URL);
    console.log('[Outlook Auth] NODE_ENV:', process.env.NODE_ENV);
    console.log('[Outlook Auth] VERCEL_URL:', process.env.VERCEL_URL);
    console.log('[Outlook Auth] VERCEL_ENV:', process.env.VERCEL_ENV);

    // Determine the base URL with the following priority:
    // 1. API_URL (if set)
    // 2. Stable production URL if in production environment
    // 3. VERCEL_URL (current deployment URL)
    // 4. localhost for development
    let baseUrl = process.env.API_URL;

    if (!baseUrl && process.env.VERCEL_ENV === 'production') {
      // Use stable production URL for OAuth callback
      baseUrl = 'https://moodtracker-tavish-ryans-projects.vercel.app';
    } else if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }

    const redirectUri = `${baseUrl}/api/outlook/callback`;
    console.log('[Outlook Auth] Generated redirectUri:', redirectUri);

    // Validate redirect URI
    if (!redirectUri || !redirectUri.startsWith('http')) {
      console.error('[Outlook Auth] Invalid redirect URI:', redirectUri);
      return res.status(500).json({
        error: 'Failed to generate redirect URI',
        debug: {
          baseUrl,
          redirectUri,
          API_URL: process.env.API_URL,
          VERCEL_ENV: process.env.VERCEL_ENV,
          VERCEL_URL: process.env.VERCEL_URL
        }
      });
    }

    const authUrl = outlookCalendarService.getAuthorizationUrl(redirectUri);
    console.log('[Outlook Auth] Final authUrl:', authUrl);

    // Store userId in session or temp storage for callback
    // For now, we'll pass it as state parameter (in production, use proper session management)
    const stateParam = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const authUrlWithState = `${authUrl}&state=${stateParam}`;

    res.json({ authUrl: authUrlWithState });
  } catch (error) {
    console.error('Error initiating Outlook auth:', error);
    res.status(500).json({ error: 'Failed to initiate Outlook authentication' });
  }
};

/**
 * Handle Outlook OAuth callback
 */
export const handleOutlookCallback = async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).send('Missing authorization code');
    }

    // Decode state to get userId
    let userId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      userId = stateData.userId;
    } catch (error) {
      return res.status(400).send('Invalid state parameter');
    }

    // Determine the base URL - must match the one used in initiateOutlookAuth
    let baseUrl = process.env.API_URL;

    if (!baseUrl && process.env.VERCEL_ENV === 'production') {
      baseUrl = 'https://moodtracker-tavish-ryans-projects.vercel.app';
    } else if (!baseUrl && process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }

    const redirectUri = `${baseUrl}/api/outlook/callback`;
    const refreshToken = await outlookCalendarService.exchangeCodeForTokens(code, redirectUri);

    if (!refreshToken) {
      return res.status(500).send('Failed to exchange authorization code for tokens');
    }

    // Save refresh token to user
    await prisma.user.update({
      where: { id: userId },
      data: {
        outlookRefreshToken: refreshToken,
        outlookCalendarEnabled: true
      }
    });

    // Trigger bulk sync of all existing tasks (non-blocking)
    outlookCalendarService.syncAllUserTasks(userId).catch((error) => {
      console.error('[Outlook] Failed to bulk sync tasks:', error);
    });

    // Redirect back to the app
    const appUrl = process.env.CLIENT_URL || 'http://localhost:8081';
    res.redirect(`${appUrl}/?outlook=connected`);
  } catch (error) {
    console.error('Error handling Outlook callback:', error);
    res.status(500).send('Failed to complete Outlook authentication');
  }
};

/**
 * Disconnect Outlook calendar
 */
export const disconnectOutlook = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        outlookRefreshToken: null,
        outlookCalendarEnabled: false
      }
    });

    // Clear Outlook event IDs from all tasks
    await prisma.planningTask.updateMany({
      where: { userId },
      data: { outlookEventId: null }
    });

    await prisma.deadlineTask.updateMany({
      where: { createdBy: userId },
      data: { outlookEventId: null }
    });

    res.json({ message: 'Outlook calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Outlook:', error);
    res.status(500).json({ error: 'Failed to disconnect Outlook calendar' });
  }
};

/**
 * Get Outlook connection status
 */
export const getOutlookStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { outlookCalendarEnabled: true }
    });

    res.json({
      connected: user?.outlookCalendarEnabled || false
    });
  } catch (error) {
    console.error('Error getting Outlook status:', error);
    res.status(500).json({ error: 'Failed to get Outlook status' });
  }
};

/**
 * Manually trigger sync of all tasks
 */
export const syncAllTasks = async (req: AuthRequest, res: Response) => {
  console.log('==============================================');
  console.log('[Outlook] SYNC ENDPOINT HIT - START');
  console.log('[Outlook] User ID:', req.user?.id);
  console.log('==============================================');

  try {
    const userId = req.user?.id;
    if (!userId) {
      console.log('[Outlook] ERROR: No user ID found');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[Outlook] About to call syncAllUserTasks for user:', userId);

    // Trigger sync (non-blocking)
    outlookCalendarService.syncAllUserTasks(userId).catch((error) => {
      console.error('[Outlook] Failed to sync tasks:', error);
    });

    console.log('[Outlook] Returning success response to client');
    res.json({ message: 'Sync started. Your tasks will be synced to Outlook calendar shortly.' });
  } catch (error) {
    console.error('[Outlook] Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
};
