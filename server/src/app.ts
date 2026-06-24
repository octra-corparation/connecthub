import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import apiRoutes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiters';
import { sanitizeBody } from './middleware/sanitize';
import { issueCsrfToken, verifyCsrfToken } from './middleware/csrf';

export function createApp() {
  const app = express();

  // Trust the first proxy hop (needed for correct client IPs behind nginx/Render/Heroku/etc.)
  app.set('trust proxy', 1);

  // ── Security headers ──
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow Cloudinary images to load cross-origin
    })
  );

  // ── CORS: only the configured client origin, with credentials for cookies ──
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // ── Body parsing ──
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // ── HTTP Parameter Pollution protection ──
  app.use(hpp());

  // ── XSS sanitization of incoming JSON bodies ──
  app.use(sanitizeBody);

  // ── CSRF protection (double-submit cookie; Bearer-authenticated requests are exempt) ──
  app.use(issueCsrfToken);
  app.use('/api', verifyCsrfToken);

  // ── Rate limiting (general; stricter limiters applied per-route for auth) ──
  app.use('/api', generalLimiter);

  // ── Routes ──
  app.use('/api', apiRoutes);

  // ── 404 + error handling ──
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
