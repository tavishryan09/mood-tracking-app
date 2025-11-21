import { Router, Request, Response, NextFunction } from 'express';
import {
  getAppSettings,
  getSetting,
  setSetting,
  batchSetAppSettings,
  deleteSetting,
  getUserSetting,
  getUserSettings,
  setUserSetting,
  batchSetUserSettings,
  deleteUserSetting,
} from '../controllers/settingsController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

// Middleware to inject key from URL path for specific routes
const injectKey = (key: string) => (req: Request, res: Response, next: NextFunction) => {
  req.params.key = key;
  next();
};

// App-wide settings (admin only)
// GET /app - Get all app settings
router.get('/app', authenticate, getAppSettings);

// GET /app/:key - All authenticated users can read settings
// Note: Specific routes must come BEFORE the catch-all :key route
// Public routes (no authentication required) - loaded before login
router.get('/app/default_custom_theme', injectKey('default_custom_theme'), getSetting);
router.get('/app/default_color_palette', injectKey('default_color_palette'), getSetting);
router.get('/app/custom_color_palettes', injectKey('custom_color_palettes'), getSetting);
router.get('/app/element_color_mapping', injectKey('element_color_mapping'), getSetting);

// Catch-all route for other settings (requires authentication)
router.get('/app/:key', authenticate, getSetting);

// PUT /:key - All users can write their own settings, admins can write any setting
router.put('/app/:key', authenticate, setSetting);

// POST /app/batch - Batch update app settings (admin only)
router.post('/app/batch', authenticate, authorizeRoles('ADMIN'), batchSetAppSettings);

// DELETE /:key - Only admins can delete settings
router.delete('/app/:key', authenticate, authorizeRoles('ADMIN'), deleteSetting);

// User-specific settings
// GET /user - Get all user settings
router.get('/user', authenticate, getUserSettings);

// GET /user/:key - Get a specific user setting
router.get('/user/:key', authenticate, getUserSetting);

// PUT /user/:key - Set a user setting
router.put('/user/:key', authenticate, setUserSetting);

// POST /user/batch - Batch update user settings
router.post('/user/batch', authenticate, batchSetUserSettings);

// DELETE /user/:key - Delete a user setting
router.delete('/user/:key', authenticate, deleteUserSetting);

export default router;
