import winston from 'winston';
import { config } from './config.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.server.logLevel,
  format: logFormat,
  defaultMeta: { service: 'polygon-adapter' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
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
