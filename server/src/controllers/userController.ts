import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { sendInviteEmail, sendPasswordResetEmail } from '../services/emailService';
import { avatarStorageService } from '../services/avatarStorageService';

// Admin-only: Get all users
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        defaultHourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin-only: Invite/create new user
export const inviteUser = async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role, defaultHourlyRate } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Validate role
    const validRoles = ['USER', 'MANAGER', 'ADMIN'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be USER, MANAGER, or ADMIN' });
    }

    // Hash password with 12 salt rounds (OWASP recommended)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'USER',
        defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        defaultHourlyRate: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Send invite email
    try {
      await sendInviteEmail(email, firstName, lastName, password, role || 'USER');
      console.log(`Invite email sent to ${email}`);
    } catch (emailError) {
      console.error('Failed to send invite email:', emailError);
      // Don't fail the request if email fails - user was already created
    }

    res.status(201).json({
      message: 'User invited successfully',
      user,
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin-only: Update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role, isActive, defaultHourlyRate } = req.body;

    // Validate role if provided
    if (role) {
      const validRoles = ['USER', 'MANAGER', 'ADMIN'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be USER, MANAGER, or ADMIN' });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(role && { role }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(defaultHourlyRate !== undefined && {
          defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null
        }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        defaultHourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'User updated successfully',
      user,
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin-only: Delete user
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.userId;

    // Prevent deleting self
    if (id === currentUserId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin-only: Reset user password
export const resetUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password and get user details
    const user = await prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, user.firstName, newPassword);
      console.log(`Password reset email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Don't fail the request if email fails - password was already reset
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload avatar image
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image format. Allowed: JPEG, PNG, GIF, WebP' });
    }

    // Upload avatar using storage service (optimizes and saves as file)
    const avatarUrl = await avatarStorageService.uploadAvatar(req.file.buffer, req.file.mimetype);

    // Delete old avatar if exists
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { avatarUrl: true }
    });

    if (currentUser?.avatarUrl && !currentUser.avatarUrl.startsWith('data:')) {
      await avatarStorageService.deleteAvatar(currentUser.avatarUrl);
    }

    // Update user's avatar URL (now just a path, not base64!)
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
    });

    console.log(`[Avatar] Uploaded avatar for user ${req.user!.userId}: ${avatarUrl}`);
    res.json({
      message: 'Avatar uploaded successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
};
