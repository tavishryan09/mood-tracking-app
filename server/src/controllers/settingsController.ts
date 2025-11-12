import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';

// Get all app settings
export const getAppSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.appSetting.findMany();
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Get a setting by key
export const getSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    console.log('[getSetting] Fetching setting:', key);

    const setting = await prisma.appSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      console.log('[getSetting] Setting not found:', key);
      return res.status(404).json({ error: 'Setting not found' });
    }

    console.log('[getSetting] Found setting:', key, 'Value type:', typeof setting.value);

    res.json(setting);
  } catch (error) {
    console.error('[getSetting] Error fetching setting:', key, error);
    next(error);
  }
};

// Save or update a setting
export const setSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    if (!value) {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Check if user has permission to update this setting
    const isUserSpecificSetting =
      key.startsWith('planning_user_order_') ||
      key.startsWith('planning_visible_users_') ||
      key === 'planning_colors';

    const isOwnSetting = key.includes(`_${userId}`);

    // Allow if:
    // 1. User is admin (can update any setting)
    // 2. User is updating their own user-specific setting
    // 3. User is updating planning_colors (shared setting)
    if (userRole !== 'ADMIN' && !isOwnSetting && key !== 'planning_colors') {
      return res.status(403).json({ error: 'You do not have permission to update this setting' });
    }

    const setting = await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json(setting);
  } catch (error) {
    next(error);
  }
};

// Batch update app settings (admin only)
export const batchSetAppSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can batch update app settings' });
    }

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    // Use a transaction to update all settings atomically
    const result = await prisma.$transaction(
      settings.map(({ key, value }) =>
        prisma.appSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Delete a setting (admin only)
export const deleteSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;

    await prisma.appSetting.delete({
      where: { key },
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get a user-specific setting by key
export const getUserSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    next(error);
  }
};

// Get all user settings
export const getUserSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settings = await prisma.userSetting.findMany({
      where: { userId },
    });

    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// Save or update a user-specific setting
export const setUserSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user?.userId;

    console.log('[setUserSetting] Received request:', { userId, key, valueType: typeof value, hasValue: value !== undefined });

    if (!userId) {
      console.log('[setUserSetting] ERROR: No userId');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (value === undefined) {
      console.log('[setUserSetting] ERROR: Value is undefined');
      return res.status(400).json({ error: 'Value is required' });
    }

    console.log('[setUserSetting] Attempting upsert...');
    const setting = await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      update: { value },
      create: {
        userId,
        key,
        value,
      },
    });

    console.log('[setUserSetting] SUCCESS: Saved setting');
    res.json(setting);
  } catch (error) {
    console.error('[setUserSetting] ERROR:', error);
    next(error);
  }
};

// Batch update user settings
export const batchSetUserSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    // Use a transaction to update all settings atomically
    const result = await prisma.$transaction(
      settings.map(({ key, value }) =>
        prisma.userSetting.upsert({
          where: {
            userId_key: {
              userId,
              key,
            },
          },
          update: { value },
          create: {
            userId,
            key,
            value,
          },
        })
      )
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

// Delete a user setting
export const deleteUserSetting = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await prisma.userSetting.delete({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });

    res.json({ message: 'Setting deleted successfully' });
  } catch (error) {
    next(error);
  }
};
