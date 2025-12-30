import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { AdapterError, AuthenticationError, handleError } from './errors.js';
import { ZodError } from 'zod';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const publicPaths = new Set(['/health', '/metrics', '/v1/adapter/health', '/v1/adapter/metrics']);
  // Skip auth for health and metrics endpoints
  if (publicPaths.has(req.path)) {
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

  // Use constant-time comparison to prevent timing attacks
  const expectedKey = Buffer.from(config.auth.apiKey);
  const providedKey = Buffer.from(apiKey);

  if (expectedKey.length !== providedKey.length || !timingSafeEqual(expectedKey, providedKey)) {
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
  // Defensive guard for errors bubbling past route-level handlers (non-POST endpoints or middleware)
  if (error instanceof AdapterError || error instanceof ZodError) {
    handleError(error, req, res);
    return;
  }

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
