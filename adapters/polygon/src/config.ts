import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  server: {
    port: number;
    nodeEnv: string;
    logLevel: string;
  };
  polygon: {
    network: string;
    rpcUrl: string;
    confirmations: number;
    txTimeout: number;
    privateKey?: string;
    privateKeyPath?: string;
    governanceContractAddress?: string;
  };
  auth: {
    apiKey: string;
    requireAuth: boolean;
  };
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
  };
  gas: {
    limitMultiplier: number;
    maxFeePerGasGwei?: number;
    maxPriorityFeePerGasGwei?: number;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3002', 10),
    nodeEnv: process.env.NODE_ENV || 'production',
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  polygon: {
    network: process.env.POLYGON_NETWORK || 'mumbai',
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com',
    confirmations: parseInt(process.env.POLYGON_CONFIRMATIONS || '6', 10),
    txTimeout: parseInt(process.env.POLYGON_TX_TIMEOUT || '120000', 10),
    privateKey: process.env.POLYGON_PRIVATE_KEY,
    privateKeyPath: process.env.POLYGON_PRIVATE_KEY_PATH,
    governanceContractAddress: process.env.GOVERNANCE_CONTRACT_ADDRESS,
  },
  auth: {
    apiKey: process.env.API_KEY || '',
    requireAuth: process.env.REQUIRE_AUTH !== 'false',
  },
  retry: {
    maxAttempts: parseInt(process.env.RETRY_MAX_ATTEMPTS || '4', 10),
    baseDelayMs: parseInt(process.env.RETRY_BASE_DELAY_MS || '1000', 10),
  },
  gas: {
    limitMultiplier: parseFloat(process.env.GAS_LIMIT_MULTIPLIER || '1.2'),
    maxFeePerGasGwei: process.env.MAX_FEE_PER_GAS_GWEI
      ? parseFloat(process.env.MAX_FEE_PER_GAS_GWEI)
      : undefined,
    maxPriorityFeePerGasGwei: process.env.MAX_PRIORITY_FEE_PER_GAS_GWEI
      ? parseFloat(process.env.MAX_PRIORITY_FEE_PER_GAS_GWEI)
      : undefined,
  },
};

export function validateConfig(): void {
  const errors: string[] = [];

  // Validate server config
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // Validate polygon config
  if (!config.polygon.rpcUrl) {
    errors.push('POLYGON_RPC_URL is required');
  }

  if (!config.polygon.network || !['mumbai', 'polygon'].includes(config.polygon.network)) {
    errors.push('POLYGON_NETWORK must be either "mumbai" or "polygon"');
  }

  if (config.polygon.confirmations < 0) {
    errors.push('POLYGON_CONFIRMATIONS must be non-negative');
  }

  if (!config.polygon.privateKey && !config.polygon.privateKeyPath) {
    errors.push('Either POLYGON_PRIVATE_KEY or POLYGON_PRIVATE_KEY_PATH must be provided');
  }

  // Validate auth config
  if (config.auth.requireAuth && !config.auth.apiKey) {
    errors.push('API_KEY is required when REQUIRE_AUTH is true');
  }

  // Validate retry config
  if (config.retry.maxAttempts < 1) {
    errors.push('RETRY_MAX_ATTEMPTS must be at least 1');
  }

  if (config.retry.baseDelayMs < 0) {
    errors.push('RETRY_BASE_DELAY_MS must be non-negative');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
