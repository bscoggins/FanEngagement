import { app } from './app';
import winston from 'winston';

const port = process.env.PORT || 3001;

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

app.listen(port, () => {
  logger.info(`Solana Adapter listening on port ${port}`);
});
