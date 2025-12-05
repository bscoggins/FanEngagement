import { Request, Response, NextFunction } from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { AuthenticationError } from './errors.js';

// Extend Express Request type to include userId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Skip auth for health and metrics endpoints
  if (req.path === '/v1/adapter/health' || req.path === '/v1/adapter/metrics') {
    return next();
  }

  // Skip auth if not required (development mode)
  if (!config.auth.requireAuth) {
    return next();
  }

  const apiKey = req.headers['x-adapter-api-key'] as string;

  if (!apiKey) {
    return next(new AuthenticationError('API key required', 'Provide X-Adapter-API-Key header'));
  }

  if (apiKey !== config.auth.apiKey) {
    return next(new AuthenticationError('Invalid API key', 'The provided API key is invalid'));
  }

  next();
}

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error('Unhandled error in middleware', {
    error: error.message,
    stack: error.stack,
    path: req.path,
  });

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    type: 'https://fanengagement.io/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: error.message,
    instance: req.path,
  });
}
