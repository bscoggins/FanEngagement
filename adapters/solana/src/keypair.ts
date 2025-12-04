import { Keypair } from '@solana/web3.js';
import fs from 'fs';
import { config } from './config.js';
import { logger } from './logger.js';

export function loadKeypair(): Keypair {
  try {
    // Option 1: Load from file (Docker secret mounted)
    if (config.keypair.path) {
      logger.info('Loading keypair from file', { filename: config.keypair.path.split('/').pop() });
      const keypairData = fs.readFileSync(config.keypair.path, 'utf-8');
      const secretKey = JSON.parse(keypairData);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    }

    // Option 2: Load from environment variable (development)
    if (config.keypair.privateKeyEnv) {
      logger.info('Loading keypair from environment variable');
      const secretKey = JSON.parse(config.keypair.privateKeyEnv);
      return Keypair.fromSecretKey(Uint8Array.from(secretKey));
    }

    throw new Error('No valid keypair configuration found');
  } catch (error) {
    logger.error('Failed to load keypair', { error });
    throw new Error(`Failed to load Solana keypair: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function validateKeypair(keypair: Keypair): boolean {
  try {
    // Verify the keypair is valid by checking public key
    const publicKey = keypair.publicKey.toBase58();
    logger.info('Keypair validated', { publicKey });
    return publicKey.length > 0;
  } catch (error) {
    logger.error('Keypair validation failed', { error });
    return false;
  }
}
