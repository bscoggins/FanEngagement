import { Registry, Counter, Histogram, Gauge } from 'prom-client';

// Create a Registry to register the metrics
const register = new Registry();

// Define metrics
export const transactionsTotal = new Counter({
  name: 'polygon_transactions_total',
  help: 'Total number of Polygon transactions by operation and status',
  labelNames: ['operation', 'status'],
  registers: [register],
});

export const transactionDuration = new Histogram({
  name: 'polygon_transaction_duration_seconds',
  help: 'Transaction duration in seconds by operation',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const rpcErrorsTotal = new Counter({
  name: 'polygon_rpc_errors_total',
  help: 'Total number of Polygon RPC errors by error type',
  labelNames: ['error_type'],
  registers: [register],
});

export const gasUsedTotal = new Counter({
  name: 'polygon_gas_used_total',
  help: 'Total gas used by operation',
  labelNames: ['operation'],
  registers: [register],
});

export const rpcRequestsTotal = new Counter({
  name: 'polygon_rpc_requests_total',
  help: 'Total number of RPC requests',
  labelNames: ['method', 'status'],
  registers: [register],
});

export const rpcLatency = new Histogram({
  name: 'polygon_rpc_latency_seconds',
  help: 'RPC request latency in seconds',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const lastBlockNumber = new Gauge({
  name: 'polygon_last_block_number',
  help: 'Last observed block number',
  registers: [register],
});

export const healthStatus = new Gauge({
  name: 'polygon_health_status',
  help: 'Health status (1 = healthy, 0 = unhealthy)',
  registers: [register],
});

export const gasPriceGwei = new Gauge({
  name: 'polygon_gas_price_gwei',
  help: 'Current gas price in GWEI',
  registers: [register],
});

// Export the register
export function getMetricsRegistry(): Registry {
  return register;
}
