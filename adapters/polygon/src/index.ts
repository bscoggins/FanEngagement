import express from 'express';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { loadWallet, validateWallet } from './wallet.js';
import { PolygonService } from './polygon-service.js';
import { createRoutes } from './routes.js';
import { authMiddleware, loggingMiddleware, errorMiddleware } from './middleware.js';
import { healthStatus } from './metrics.js';

async function main() {
  try {
    logger.info('Starting Polygon Adapter Service...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Load and validate wallet
    const wallet = loadWallet();
    if (!validateWallet(wallet)) {
      throw new Error('Invalid wallet');
    }
    logger.info('Wallet loaded successfully', {
      address: wallet.address,
    });

    // Initialize Polygon service
    const polygonService = new PolygonService(wallet);

    // Check initial health
    const health = await polygonService.checkHealth();
    logger.info('Initial health check', health);

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(loggingMiddleware);
    app.use(authMiddleware);

    // Routes
    app.use(createRoutes(polygonService));

    // Error handling
    app.use(errorMiddleware);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        type: 'https://fanengagement.io/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Endpoint ${req.method} ${req.path} not found`,
        instance: req.path,
      });
    });

    // Start server
    const server = app.listen(config.server.port, () => {
      logger.info('Polygon Adapter Service started', {
        port: config.server.port,
        network: config.polygon.network,
        rpcUrl: config.polygon.rpcUrl,
        confirmations: config.polygon.confirmations,
      });
      healthStatus.set(1);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      healthStatus.set(0);

      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start Polygon Adapter Service', { error });
    healthStatus.set(0);
    process.exit(1);
  }
}

main();
