import express from 'express';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { loadKeypair, validateKeypair } from './keypair.js';
import { SolanaService } from './solana-service.js';
import { createRoutes } from './routes.js';
import { authMiddleware, loggingMiddleware, errorMiddleware } from './middleware.js';
import { healthStatus } from './metrics.js';

async function main() {
  try {
    logger.info('Starting Solana Adapter Service...');

    // Validate configuration
    validateConfig();
    logger.info('Configuration validated');

    // Load and validate keypair
    const keypair = loadKeypair();
    if (!validateKeypair(keypair)) {
      throw new Error('Invalid keypair');
    }
    logger.info('Keypair loaded successfully', {
      publicKey: keypair.publicKey.toBase58(),
    });

    // Initialize Solana service
    const solanaService = new SolanaService(keypair);

    // Check initial health
    const health = await solanaService.checkHealth();
    logger.info('Initial health check', health);

    // Create Express app
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(loggingMiddleware);
    app.use(authMiddleware);

    // Routes
    app.use(createRoutes(solanaService));

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
      logger.info('Solana Adapter Service started', {
        port: config.server.port,
        network: config.solana.network,
        rpcUrl: config.solana.rpcUrl,
        commitment: config.solana.commitment,
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
    logger.error('Failed to start Solana Adapter Service', { error });
    healthStatus.set(0);
    process.exit(1);
  }
}

main();
