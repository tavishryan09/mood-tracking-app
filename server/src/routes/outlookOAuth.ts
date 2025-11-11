import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  initiateOutlookAuth,
  handleOutlookCallback,
  disconnectOutlook,
  getOutlookStatus,
  syncAllTasks,
  getSyncStatus
} from '../controllers/outlookOAuthController';

const router = express.Router();

// Get Outlook connection status
router.get('/status', authenticate, getOutlookStatus);

// Initiate Outlook OAuth flow
router.post('/connect', authenticate, initiateOutlookAuth);

// Handle OAuth callback (no auth middleware - uses state parameter)
router.get('/callback', handleOutlookCallback);

// Disconnect Outlook calendar
router.post('/disconnect', authenticate, disconnectOutlook);

// Manually sync all tasks (returns job ID immediately)
router.post('/sync', authenticate, syncAllTasks);

// Get sync job status (for polling)
router.get('/sync/:jobId', authenticate, getSyncStatus);

export default router;
