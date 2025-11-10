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
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  const options: SignOptions = {
    expiresIn,
    algorithm: 'HS256', // Explicitly set secure algorithm
    issuer: 'mood-tracker-api', // Add issuer claim
    audience: 'mood-tracker-client', // Add audience claim
  };
  return jwt.sign(payload, JWT_SECRET, options);
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
