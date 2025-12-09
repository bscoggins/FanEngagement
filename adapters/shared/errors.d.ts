export interface SerializedError {
  message: string;
  stack?: string;
  name?: string;
}

export declare function serializeError(error: unknown): SerializedError;
