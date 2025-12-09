import type { Request, Response } from 'express';
import type { ZodTypeAny, TypeOf } from 'zod';

export interface HandlerOptions<TSchema extends ZodTypeAny, TResult> {
  schema: TSchema;
  execute: (data: TypeOf<TSchema>) => Promise<TResult>;
  buildResponse: (result: TResult, data: TypeOf<TSchema>) => Record<string, unknown>;
  status?: number;
  onError: (error: unknown, req: Request, res: Response) => void;
}

export declare function createPostHandler<TSchema extends ZodTypeAny, TResult>(
  options: HandlerOptions<TSchema, TResult>
): (req: Request, res: Response) => Promise<void>;
