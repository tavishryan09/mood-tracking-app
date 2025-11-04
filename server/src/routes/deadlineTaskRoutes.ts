import { Router } from 'express';
import {
  getDeadlineTasks,
  createDeadlineTask,
  updateDeadlineTask,
  deleteDeadlineTask,
  syncProjectDueDates,
} from '../controllers/deadlineTaskController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get deadline tasks for a date range
router.get('/', getDeadlineTasks);

// Create a new deadline task
router.post('/', createDeadlineTask);

// Update a deadline task
router.put('/:id', updateDeadlineTask);

// Delete a deadline task
router.delete('/:id', deleteDeadlineTask);

// Sync project due dates as deadline tasks
router.post('/sync-due-dates', syncProjectDueDates);

export default router;
