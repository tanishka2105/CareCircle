import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import medicationRoutes from './routes/medicationRoutes.js';
import doseRoutes from './routes/doseRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Trust proxy for Render / Cloud deployments
  app.set('trust proxy', 1);

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible CDN / Google font assets
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS
  const allowedOrigins = [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'production') {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed for this origin'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Cron-Secret', 'x-cron-secret'],
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // General rate limiter
  app.use('/api', generalLimiter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      app: 'CareCircle API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  });

  // Mount Public / System Routes first
  app.use('/api/cron', cronRoutes);

  // Mount API Routes
  app.use('/api', authRoutes);
  app.use('/api', memberRoutes);
  app.use('/api', medicationRoutes);
  app.use('/api', doseRoutes);
  app.use('/api', appointmentRoutes);
  app.use('/api', notificationRoutes);

  // Serve static client assets in production
  if (env.NODE_ENV === 'production') {
    const clientDistPath = path.resolve(__dirname, '../../client/dist');
    app.use(express.static(clientDistPath));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Not Found & Error Handlers
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
