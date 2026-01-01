import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { config } from './config.js';

// Create a Registry to register the metrics
const register = new Registry();

register.setDefaultLabels({
  adapter: 'polygon',
  network: config.polygon.network,
  instance: config.server.instanceId,
});

// Define metrics following shared blockchain dashboard conventions
export const blockchainTransactionsTotal = new Counter({
  name: 'blockchain_transactions_total',
  help: 'Total number of blockchain transactions by operation and status',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const blockchainTransactionDuration = new Histogram({
  name: 'blockchain_transaction_duration_seconds',
  help: 'Transaction duration in seconds by operation',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const blockchainRpcErrorsTotal = new Counter({
  name: 'blockchain_rpc_errors_total',
  help: 'Total number of RPC errors by error type',
  labelNames: ['error_type'],
  registers: [register],
});

export const blockchainGasUsedTotal = new Counter({
  name: 'blockchain_gas_used_total',
  help: 'Total gas used by operation',
  labelNames: ['operation'],
  registers: [register],
});

export const blockchainRpcRequestsTotal = new Counter({
  name: 'blockchain_rpc_requests_total',
  help: 'Total number of RPC requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

export const blockchainRpcLatencySeconds = new Histogram({
  name: 'blockchain_rpc_latency_seconds',
  help: 'RPC request latency in seconds',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const blockchainLastBlockNumber = new Gauge({
  name: 'blockchain_last_block_number',
  help: 'Last observed block number',
  labelNames: ['chain_id'],
  registers: [register],
});

export const blockchainAdapterHealth = new Gauge({
  name: 'blockchain_adapter_health',
  help: 'Health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['chain_id'],
  registers: [register],
});

export const blockchainGasPriceGwei = new Gauge({
  name: 'blockchain_gas_price_gwei',
  help: 'Current gas price in GWEI',
  labelNames: ['chain_id'],
  registers: [register],
});

export const blockchainPendingTransactions = new Gauge({
  name: 'blockchain_pending_transactions',
  help: 'Pending transaction backlog for adapter wallet',
  labelNames: ['wallet_address', 'chain_id'],
  registers: [register],
});

// Export the register
export function getMetricsRegistry(): Registry {
  return register;
}
