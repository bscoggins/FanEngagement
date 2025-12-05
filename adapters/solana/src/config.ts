import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  solana: {
    network: process.env.SOLANA_NETWORK || 'devnet',
    rpcUrl: process.env.SOLANA_RPC_URL || 'http://localhost:8899',
    commitment: (process.env.SOLANA_COMMITMENT || 'confirmed') as 'processed' | 'confirmed' | 'finalized',
    confirmTimeout: parseInt(process.env.SOLANA_CONFIRM_TIMEOUT || '30000', 10),
  },
  authentication: {
    apiKey: process.env.API_KEY || '',
    requireAuth: process.env.REQUIRE_AUTH !== 'false',
  },
  keypair: {
    path: process.env.SOLANA_KEYPAIR_PATH || '',
    privateKeyEnv: process.env.SOLANA_PRIVATE_KEY || '',
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '4', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
  },
};

export function validateConfig(): void {
  if (config.authentication.requireAuth && !config.authentication.apiKey) {
    throw new Error('API_KEY is required when REQUIRE_AUTH is true');
  }

  if (!config.keypair.path && !config.keypair.privateKeyEnv) {
    throw new Error('Either SOLANA_KEYPAIR_PATH or SOLANA_PRIVATE_KEY must be provided');
  }

  if (!config.solana.rpcUrl) {
    throw new Error('SOLANA_RPC_URL is required');
  }
}
