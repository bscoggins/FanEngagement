import winston from 'winston';
import { config } from './config.js';

const SECRET_KEYS = [
  'api-key',
  'apikey',
  'api_key',
  'authorization',
  'privatekey',
  'private_key',
  'token',
  'password',
  'credential',
  'secret',
  'key',
];

const containsSecret = (value: any): boolean => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (containsSecret(entry)) {
        return true;
      }
    }
    return false;
  }

  for (const [key, val] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (SECRET_KEYS.some(secretKey => lower.includes(secretKey))) {
      return true;
    }
    if (val && typeof val === 'object' && containsSecret(val)) {
      return true;
    }
  }

  return false;
};

const sanitizeLogData = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(entry => sanitizeLogData(entry));
  }

  if (value && typeof value === 'object') {
    const sanitized: Record<string | symbol, any> = {};
    for (const [key, val] of Object.entries(value)) {
      const lower = key.toLowerCase();
      sanitized[key] = SECRET_KEYS.some(secretKey => lower.includes(secretKey))
        ? '[REDACTED]'
        : sanitizeLogData(val);
    }
    for (const symbol of Object.getOwnPropertySymbols(value)) {
      sanitized[symbol] = (value as any)[symbol];
    }
    return sanitized;
  }

  return value;
};

const redactSecrets = winston.format((info) => {
  if (!containsSecret(info)) {
    return info;
  }
  return sanitizeLogData(info);
});

const logFormat = winston.format.combine(
  redactSecrets(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const redactLogInfoForTest = (info: any) => redactSecrets().transform?.(info);

export const logger = winston.createLogger({
  level: config.server.logLevel,
  format: logFormat,
  defaultMeta: { service: 'polygon-adapter' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        redactSecrets(),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

// Override console methods to use winston
if (config.server.nodeEnv === 'production') {
  console.log = (...args: unknown[]) => logger.info(args.join(' '));
  console.error = (...args: unknown[]) => logger.error(args.join(' '));
  console.warn = (...args: unknown[]) => logger.warn(args.join(' '));
  console.info = (...args: unknown[]) => logger.info(args.join(' '));
  console.debug = (...args: unknown[]) => logger.debug(args.join(' '));
}
