import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from './config.js';
import { errors } from './errors.js';
import { logger } from './logger.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip authentication for health and metrics endpoints
  if (req.path === '/v1/adapter/health' || req.path === '/v1/adapter/metrics') {
    next();
    return;
  }

  // Check if authentication is required
  if (!config.authentication.requireAuth) {
    next();
    return;
  }

  // Check for API key in X-Adapter-API-Key header
  const apiKey = req.headers['x-adapter-api-key'] as string | undefined;
  
  // Also check Authorization header for Bearer token
  const authHeader = req.headers['authorization'] as string | undefined;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;

  const providedKey = apiKey || bearerToken;

  if (!providedKey) {
    logger.warn('Missing API key', {
      path: req.path,
      ip: req.ip,
    });
    const error = errors.unauthorized('Missing API key. Provide X-Adapter-API-Key header or Authorization: Bearer <token>');
    res.status(error.statusCode).json(error.toProblemDetails(req.path));
    return;
  }

  // Use constant-time comparison to prevent timing attacks
  const providedKeyBuffer = Buffer.from(providedKey);
  const expectedKeyBuffer = Buffer.from(config.authentication.apiKey);

  // Ensure both buffers are same length to prevent length-based timing attacks
  if (providedKeyBuffer.length !== expectedKeyBuffer.length) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    const error = errors.unauthorized('Invalid API key');
    res.status(error.statusCode).json(error.toProblemDetails(req.path));
    return;
  }

  if (!crypto.timingSafeEqual(providedKeyBuffer, expectedKeyBuffer)) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    const error = errors.unauthorized('Invalid API key');
    res.status(error.statusCode).json(error.toProblemDetails(req.path));
    return;
  }

  next();
}

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
}

export function errorMiddleware(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    type: 'https://fanengagement.io/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.path,
  });
}
