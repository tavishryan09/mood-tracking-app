import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  initiateOutlookAuth,
  handleOutlookCallback,
  disconnectOutlook,
  getOutlookStatus,
  syncAllTasks
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

// Manually sync all tasks
router.post('/sync', authenticate, syncAllTasks);

export default router;
