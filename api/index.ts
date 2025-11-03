import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from '../server/src/routes/authRoutes';
import clientRoutes from '../server/src/routes/clientRoutes';
import projectRoutes from '../server/src/routes/projectRoutes';
import timeEntryRoutes from '../server/src/routes/timeEntryRoutes';
import eventRoutes from '../server/src/routes/eventRoutes';
import travelRoutes from '../server/src/routes/travelRoutes';
import exportRoutes from '../server/src/routes/exportRoutes';
import userRoutes from '../server/src/routes/userRoutes';
import planningTaskRoutes from '../server/src/routes/planningTaskRoutes';

// Load environment variables
dotenv.config();

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration for Vercel
const allowedOrigins = [
  'http://localhost:8081',
  'http://localhost:19006',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
  'https://*.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*.', '');
        return origin.endsWith(pattern);
      }
      return origin === allowed;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/time-entries', timeEntryRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/travel', travelRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/planning-tasks', planningTaskRoutes);

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

// Export for Vercel serverless function
export default app;
