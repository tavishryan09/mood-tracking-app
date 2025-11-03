import { Router } from 'express';
import {
  exportTimeReport,
  exportProjectSummary,
  exportTravelReport,
} from '../controllers/exportController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Routes
router.get('/time-report', exportTimeReport);
router.get('/project-summary', exportProjectSummary);
router.get('/travel-report', exportTravelReport);

export default router;
