import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllTimeEntries,
  getTimeEntryById,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  stopTimer,
  getRunningTimer,
} from '../controllers/timeEntryController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const timeEntryValidation = [
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
];

// Routes
router.get('/', getAllTimeEntries);
router.get('/running', getRunningTimer);
router.get('/:id', getTimeEntryById);
router.post('/', timeEntryValidation, createTimeEntry);
router.put('/:id', updateTimeEntry);
router.post('/:id/stop', stopTimer);
router.delete('/:id', deleteTimeEntry);

export default router;
