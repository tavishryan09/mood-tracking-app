import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import {
  getAllUsers,
  inviteUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  uploadAvatar,
} from '../controllers/userController';
import { authenticate, authorizeRoles } from '../middleware/auth';

// Configure multer for memory storage with security constraints
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only allow 1 file upload at a time
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

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

// POST /avatar - Upload avatar (authenticated users can upload their own avatar)
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatar);

// All other routes require authentication and ADMIN role
router.post('/invite', authenticate, authorizeRoles('ADMIN'), inviteUserValidation, inviteUser);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), updateUserValidation, updateUser);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), deleteUser);
router.post('/:id/reset-password', authenticate, authorizeRoles('ADMIN'), resetPasswordValidation, resetUserPassword);

export default router;
