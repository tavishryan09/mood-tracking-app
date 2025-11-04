import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const projectValidation = [
  body('name').notEmpty().withMessage('Project name is required'),
  body('clientId').notEmpty().withMessage('Client ID is required'),
];

const projectMemberValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

// Routes
router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', projectValidation, createProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/members', projectMemberValidation, addProjectMember);
router.put('/:id/members/:memberId', updateProjectMember);
router.delete('/:id/members/:memberId', removeProjectMember);

export default router;
