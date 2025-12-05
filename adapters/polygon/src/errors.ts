import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class AdapterError extends Error {
  constructor(
    public statusCode: number,
    public type: string,
    public title: string,
    message: string,
    public detail?: string
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}

export class ValidationError extends AdapterError {
  constructor(message: string, detail?: string) {
    super(400, 'https://fanengagement.io/errors/validation-error', 'Validation Error', message, detail);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AdapterError {
  constructor(message: string = 'Authentication required', detail?: string) {
    super(401, 'https://fanengagement.io/errors/authentication-error', 'Authentication Error', message, detail);
    this.name = 'AuthenticationError';
  }
}

export class RpcError extends AdapterError {
  constructor(message: string, detail?: string) {
    super(503, 'https://fanengagement.io/errors/rpc-error', 'RPC Error', message, detail);
    this.name = 'RpcError';
  }
}

export class TransactionError extends AdapterError {
  constructor(message: string, detail?: string) {
    super(500, 'https://fanengagement.io/errors/transaction-error', 'Transaction Error', message, detail);
    this.name = 'TransactionError';
  }
}

export function handleError(error: unknown, req: Request, res: Response): void {
  if (error instanceof AdapterError) {
    logger.error('Adapter error', {
      error: error.message,
      type: error.type,
      statusCode: error.statusCode,
      path: req.path,
    });

    res.status(error.statusCode).json({
      type: error.type,
      title: error.title,
      status: error.statusCode,
      detail: error.detail || error.message,
      instance: req.path,
    });
  } else if (error instanceof ZodError) {
    logger.error('Validation error', {
      error: error.message,
      issues: error.issues,
      path: req.path,
    });

    res.status(400).json({
      type: 'https://fanengagement.io/errors/validation-error',
      title: 'Validation Error',
      status: 400,
      detail: 'Request validation failed',
      instance: req.path,
      errors: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  } else {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unexpected error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      path: req.path,
    });

    res.status(500).json({
      type: 'https://fanengagement.io/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail: errorMessage,
      instance: req.path,
    });
  }
}
