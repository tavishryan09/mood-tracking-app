import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllUsers,
  inviteUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from '../controllers/userController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// Validation rules
const inviteUserValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role')
    .optional()
    .isIn(['USER', 'MANAGER', 'ADMIN'])
    .withMessage('Role must be USER, MANAGER, or ADMIN'),
];

const updateUserValidation = [
  body('role')
    .optional()
    .isIn(['USER', 'MANAGER', 'ADMIN'])
    .withMessage('Role must be USER, MANAGER, or ADMIN'),
];

const resetPasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

// GET / - All authenticated users can view the user list (for team planning)
router.get('/', authenticate, getAllUsers);

// All other routes require authentication and ADMIN role
router.post('/invite', authenticate, authorizeRoles('ADMIN'), inviteUserValidation, inviteUser);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), updateUserValidation, updateUser);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteUser);
router.post('/:id/reset-password', authenticate, authorizeRoles('ADMIN'), resetPasswordValidation, resetUserPassword);

export default router;
