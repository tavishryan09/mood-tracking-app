// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
// import mongoSanitize from 'express-mongo-sanitize'; // Temporarily disabled due to compatibility issue
import hpp from 'hpp';
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import projectRoutes from './routes/projectRoutes';
import eventRoutes from './routes/eventRoutes';
import travelRoutes from './routes/travelRoutes';
import exportRoutes from './routes/exportRoutes';
import userRoutes from './routes/userRoutes';
import planningTaskRoutes from './routes/planningTaskRoutes';
import settingsRoutes from './routes/settingsRoutes';
import deadlineTaskRoutes from './routes/deadlineTaskRoutes';
import outlookOAuthRoutes from './routes/outlookOAuth';

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Security Headers - Helmet middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React Native Web
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL || "*"],
      fontSrc: ["'self'", "data:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false, // Disable for React Native compatibility
}));

// Rate Limiting - General API limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (increased for development)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login/register attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Compression middleware - compresses all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
}));

// Session middleware for OAuth state management
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutes (only needed for OAuth flow)
    sameSite: 'lax',
  },
}));

// Serve static files from public directory (for avatars)
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
// Temporarily disabled due to compatibility issue with current Node version
// app.use(mongoSanitize({
//   replaceWith: '_', // Replace prohibited characters with underscore
// }));

// Prevent HTTP Parameter Pollution attacks
app.use(hpp({
  whitelist: ['sort', 'fields'], // Allow these params to appear multiple times
}));

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost origins
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.match(/http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/)) {
      return callback(null, true);
    }

    // Allow production origin if set
    if (process.env.CORS_ORIGIN) {
      const allowedOrigins = process.env.CORS_ORIGIN.split(',');
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
    }

    // Reject all other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};
app.use(cors(corsOptions));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes - Apply rate limiting
app.use('/api/', apiLimiter); // General rate limit for all API routes
app.use('/api/auth', authLimiter, authRoutes); // Strict rate limit for auth routes
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/planning-tasks', planningTaskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/deadline-tasks', deadlineTaskRoutes);
app.use('/api/outlook', outlookOAuthRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health\n`);
});

export default app;
