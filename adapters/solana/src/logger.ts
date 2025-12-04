import winston from 'winston';
import { config } from './config.js';

const { combine, timestamp, json, errors, printf } = winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

// Production format (structured JSON)
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json()
);

const logger = winston.createLogger({
  level: config.server.logLevel,
  format: process.env.NODE_ENV === 'production' ? prodFormat : combine(timestamp(), devFormat),
  defaultMeta: { service: 'solana-adapter' },
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? prodFormat : combine(timestamp(), devFormat),
    }),
  ],
});

export { logger };
