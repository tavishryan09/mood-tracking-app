import jwt, { Secret, SignOptions } from 'jsonwebtoken';

// Validate JWT_SECRET is set and strong
const jwtSecretRaw = process.env.JWT_SECRET;

if (!jwtSecretRaw) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set');
}

if (jwtSecretRaw.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters long for security');
}

// Type-safe JWT secret after validation
const JWT_SECRET: Secret = jwtSecretRaw;

export interface JWTPayload {
  id: string;
  userId: string;
  email: string;
  role: string;
}

export const generateToken = (payload: JWTPayload): string => {
  // Use type assertion to work around jsonwebtoken's strict typing
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256',
    issuer: 'mood-tracker-api',
    audience: 'mood-tracker-client',
  } as SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    // Try verifying with issuer/audience (new tokens)
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'mood-tracker-api',
      audience: 'mood-tracker-client',
    }) as JWTPayload;
  } catch (error: any) {
    // If verification fails due to missing issuer/audience, try without (old tokens)
    if (error.message?.includes('jwt issuer') || error.message?.includes('jwt audience')) {
      console.log('[JWT] Verifying legacy token without issuer/audience claims');
      return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
      }) as JWTPayload;
    }
    // Re-throw other errors
    throw error;
  }
};
