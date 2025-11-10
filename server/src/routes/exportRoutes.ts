import { Router } from 'express';
import {
  exportProjectSummary,
  exportTravelReport,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/project-summary', exportProjectSummary);
router.get('/travel-report', exportTravelReport);

export default router;
