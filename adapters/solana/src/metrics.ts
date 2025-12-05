import { register, Counter, Histogram, Gauge } from 'prom-client';

// Transaction metrics
export const transactionsTotal = new Counter({
  name: 'solana_transactions_total',
  help: 'Total number of Solana transactions submitted',
  labelNames: ['operation', 'status'],
});

export const transactionDuration = new Histogram({
  name: 'solana_transaction_duration_seconds',
  help: 'Duration of Solana transactions in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const rpcErrorsTotal = new Counter({
  name: 'solana_rpc_errors_total',
  help: 'Total number of Solana RPC errors',
  labelNames: ['error_type'],
});

export const rpcRequestsTotal = new Counter({
  name: 'solana_rpc_requests_total',
  help: 'Total number of RPC requests',
  labelNames: ['method', 'status'],
});

export const rpcLatency = new Histogram({
  name: 'solana_rpc_latency_seconds',
  help: 'Latency of RPC requests in seconds',
  labelNames: ['method'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

export const healthStatus = new Gauge({
  name: 'solana_adapter_health_status',
  help: 'Health status of the adapter (1 = healthy, 0 = unhealthy)',
});

export const lastBlockNumber = new Gauge({
  name: 'solana_last_block_number',
  help: 'Last observed block number from the Solana network',
});

export function getMetricsRegistry() {
  return register;
}
