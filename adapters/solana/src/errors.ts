import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  [key: string]: unknown;
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public type: string,
    public title: string,
    message: string,
    public additionalDetails?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toProblemDetails(instance: string): ProblemDetails {
    return {
      type: `https://fanengagement.io/errors/${this.type}`,
      title: this.title,
      status: this.statusCode,
      detail: this.message,
      instance,
      ...this.additionalDetails,
    };
  }
}

export function handleValidationError(error: ZodError, req: Request): ProblemDetails {
  const errors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return {
    type: 'https://fanengagement.io/errors/validation-error',
    title: 'Validation Error',
    status: 400,
    detail: 'One or more validation errors occurred',
    instance: req.path,
    errors,
  };
}

export function handleError(error: unknown, req: Request, res: Response): void {
  // Log error
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });

  // Handle validation errors
  if (error instanceof ZodError) {
    const problemDetails = handleValidationError(error, req);
    res.status(problemDetails.status).json(problemDetails);
    return;
  }

  // Handle application errors
  if (error instanceof AppError) {
    const problemDetails = error.toProblemDetails(req.path);
    res.status(problemDetails.status).json(problemDetails);
    return;
  }

  // Handle generic errors
  const problemDetails: ProblemDetails = {
    type: 'https://fanengagement.io/errors/internal-server-error',
    title: 'Internal Server Error',
    status: 500,
    detail: error instanceof Error ? error.message : 'An unexpected error occurred',
    instance: req.path,
  };

  res.status(500).json(problemDetails);
}

// Common error factories
export const errors = {
  unauthorized: (detail: string = 'Invalid or missing API key') =>
    new AppError(401, 'unauthorized', 'Unauthorized', detail),

  forbidden: (detail: string = 'Access denied') =>
    new AppError(403, 'forbidden', 'Forbidden', detail),

  notFound: (resource: string) =>
    new AppError(404, 'not-found', 'Not Found', `${resource} not found`),

  conflict: (detail: string) =>
    new AppError(409, 'conflict', 'Conflict', detail),

  rateLimit: (retryAfter?: number) =>
    new AppError(
      429,
      'rate-limit-exceeded',
      'Too Many Requests',
      'Rate limit exceeded. Please retry after some time.',
      retryAfter ? { retryAfter } : undefined
    ),

  serviceUnavailable: (detail: string, retryAfter?: number) =>
    new AppError(
      503,
      'service-unavailable',
      'Service Unavailable',
      detail,
      retryAfter ? { retryAfter } : undefined
    ),

  blockchainError: (detail: string, transactionSignature?: string) =>
    new AppError(
      503,
      'blockchain-unavailable',
      'Blockchain Operation Failed',
      detail,
      transactionSignature ? { transactionSignature } : undefined
    ),
};
