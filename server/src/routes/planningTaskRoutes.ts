import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllPlanningTasks,
  getPlanningTaskById,
  createPlanningTask,
  updatePlanningTask,
  deletePlanningTask,
} from '../controllers/planningTaskController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const planningTaskValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('projectId').optional({ nullable: true }), // Optional for status events
  body('date').notEmpty().withMessage('Date is required'),
  body('blockIndex')
    .notEmpty()
    .withMessage('Block index is required')
    .isInt({ min: 0, max: 3 })
    .withMessage('Block index must be between 0 and 3'),
];

const planningTaskUpdateValidation = [
  body('projectId').optional({ nullable: true }), // Optional for status events
];

// Routes
router.get('/', getAllPlanningTasks);
router.get('/:id', getPlanningTaskById);
router.post('/', planningTaskValidation, createPlanningTask);
router.put('/:id', planningTaskUpdateValidation, updatePlanningTask);
router.delete('/:id', deletePlanningTask);

export default router;
