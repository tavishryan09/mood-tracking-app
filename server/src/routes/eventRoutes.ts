import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  addEventAttendee,
  removeEventAttendee,
  updateAttendeeStatus,
} from '../controllers/eventController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation rules
const eventValidation = [
  body('title').notEmpty().withMessage('Event title is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
];

const attendeeValidation = [
  body('userId').notEmpty().withMessage('User ID is required'),
];

const attendeeStatusValidation = [
  body('status')
    .isIn(['PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE'])
    .withMessage('Invalid status'),
];

// Routes
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.post('/', eventValidation, createEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/attendees', attendeeValidation, addEventAttendee);
router.delete('/:id/attendees/:userId', removeEventAttendee);
router.put('/:id/attendee-status', attendeeStatusValidation, updateAttendeeStatus);

export default router;
