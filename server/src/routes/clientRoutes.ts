import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
} from '../controllers/clientController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const clientValidation = [
  body('name').notEmpty().withMessage('Client name is required'),
  // Email validation removed - now handled via contacts array
  // Contacts are validated separately in the controller
];

// Routes
router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', clientValidation, createClient);
router.put('/:id', clientValidation, updateClient);
router.delete('/:id', deleteClient);

export default router;
