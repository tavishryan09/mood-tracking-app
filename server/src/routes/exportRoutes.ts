import { Router } from 'express';
import {
  exportProjectSummary,
  exportTravelReport,
  exportPlannerSummary,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/project-summary', exportProjectSummary);
router.get('/travel-report', exportTravelReport);
router.get('/planner-summary/:quarter', exportPlannerSummary);

export default router;
