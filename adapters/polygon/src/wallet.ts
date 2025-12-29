import { Wallet } from 'ethers';
import { readFileSync } from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Load the wallet from environment configuration
 */
export function loadWallet(): Wallet {
  logger.info('Loading wallet...');

  let privateKey: string;

  const isPlaceholderKey = (key?: string): boolean => {
    if (!key) {
      return true;
    }
    const normalized = key.trim().toLowerCase();
    const placeholders = new Set(['dev-key-change-in-production', 'auto-generate', 'generate']);
    return placeholders.has(normalized);
  };

  // Try loading from path first
  if (config.polygon.privateKeyPath) {
    logger.info('Loading private key from file', { path: config.polygon.privateKeyPath });
    try {
      privateKey = readFileSync(config.polygon.privateKeyPath, 'utf-8').trim();
    } catch (error) {
      throw new Error(
        `Failed to load private key from ${config.polygon.privateKeyPath}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  } else if (config.polygon.privateKey && !isPlaceholderKey(config.polygon.privateKey)) {
    logger.info('Loading private key from environment variable');
    privateKey = config.polygon.privateKey;
  } else {
    throw new Error(
      'No usable Polygon private key provided. Set POLYGON_PRIVATE_KEY or POLYGON_PRIVATE_KEY_PATH with a funded test key; placeholder values are not auto-generated.'
    );
  }

  // Ensure the private key has 0x prefix
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  try {
    const wallet = new Wallet(privateKey);
    logger.info('Wallet loaded successfully', {
      address: wallet.address,
    });
    return wallet;
  } catch (error) {
    throw new Error(
      `Failed to create wallet from private key: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

/**
 * Validate that the wallet is properly configured
 */
export function validateWallet(wallet: Wallet): boolean {
  try {
    // Check that address is valid
    if (!wallet.address || !wallet.address.startsWith('0x')) {
      logger.error('Invalid wallet address', { address: wallet.address });
      return false;
    }

    // Check that private key is accessible
    if (!wallet.privateKey) {
      logger.error('Wallet private key not accessible');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Wallet validation failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}
