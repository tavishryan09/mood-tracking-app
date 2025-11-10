import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import prisma from '../config/database';
import { generateToken } from '../utils/jwt';
import {
  getMicrosoftAuthUrl,
  getMicrosoftTokens,
  getMicrosoftUserProfile,
} from '../services/microsoftOAuth';

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
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
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Check if user has a password (not OAuth only)
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password - passwordHash is guaranteed non-null here
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash as string);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Microsoft OAuth: Initiate login
 */
export const microsoftAuth = async (req: Request & { session?: any }, res: Response) => {
  try {
    // Generate and store CSRF state token for OAuth flow
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in session for validation
    if (!req.session) {
      req.session = {};
    }
    req.session.oauthState = state;

    const authUrl = await getMicrosoftAuthUrl(state);
    res.json({ authUrl });
  } catch (error) {
    console.error('[Microsoft OAuth] Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate Microsoft login URL' });
  }
};

/**
 * Microsoft OAuth: Callback handler
 */
export const microsoftCallback = async (req: Request & { session?: any }, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    // Validate state parameter to prevent CSRF attacks
    const storedState = req.session?.oauthState;
    if (!state || state !== storedState) {
      console.error('[Microsoft OAuth] Invalid state parameter - possible CSRF attack');
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';
      return res.redirect(`${clientUrl}/auth/callback?error=invalid_state`);
    }

    // Clear the used state
    if (req.session) {
      delete req.session.oauthState;
    }

    // Exchange code for tokens
    const tokenResponse = await getMicrosoftTokens(code);

    if (!tokenResponse || !tokenResponse.accessToken) {
      return res.status(400).json({ error: 'Failed to obtain access token' });
    }

    // Get user profile from Microsoft
    const microsoftProfile = await getMicrosoftUserProfile(
      tokenResponse.accessToken
    );

    // Check if user exists by Microsoft ID or email
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { microsoftId: microsoftProfile.id },
          { email: microsoftProfile.email },
        ],
      },
    });

    let user;

    if (existingUser) {
      // Update existing user with Microsoft ID and refresh token
      // Note: Microsoft Graph API doesn't return refresh tokens in the typical OAuth flow
      // Refresh tokens are only available during certain consent scenarios
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          microsoftId: microsoftProfile.id,
          authProvider: 'microsoft',
          // Refresh token handling would go here if available from the token response
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: microsoftProfile.email,
          firstName: microsoftProfile.firstName,
          lastName: microsoftProfile.lastName,
          microsoftId: microsoftProfile.id,
          authProvider: 'microsoft',
          role: 'USER',
          // Refresh token handling would go here if available from the token response
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          avatarUrl: true,
        },
      });
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Redirect to client with token
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';
    res.redirect(`${clientUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('[Microsoft OAuth] Callback error:', error);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8081';
    res.redirect(`${clientUrl}/auth/callback?error=authentication_failed`);
  }
};
