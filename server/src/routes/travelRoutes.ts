import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllTravelEntries,
  getTravelEntryById,
  createTravelEntry,
  updateTravelEntry,
  deleteTravelEntry,
} from '../controllers/travelController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const travelValidation = [
  body('purpose').notEmpty().withMessage('Purpose is required'),
  body('destination').notEmpty().withMessage('Destination is required'),
  body('startDate').notEmpty().withMessage('Start date is required'),
  body('endDate').notEmpty().withMessage('End date is required'),
];

// Routes
router.get('/', getAllTravelEntries);
router.get('/:id', getTravelEntryById);
router.post('/', travelValidation, createTravelEntry);
router.put('/:id', updateTravelEntry);
router.delete('/:id', deleteTravelEntry);

export default router;
