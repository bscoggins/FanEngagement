# Polygon Blockchain Adapter

A containerized service that provides blockchain functionality for FanEngagement organizations using the Polygon network.

## Overview

The Polygon adapter implements the FanEngagement blockchain adapter API specification for Polygon (formerly Matic Network), an Ethereum Layer 2 scaling solution. It handles:

- Organization account creation
- ERC-20 token deployment for ShareTypes
- Token minting for share issuances
- Proposal creation and management
- Vote recording
- Result commitment for verifiability

## Features

- ✅ All 9 OpenAPI endpoints implemented
- ✅ Ethereum/Polygon RPC integration with ethers.js v6
- ✅ Transaction retry logic with exponential backoff
- ✅ Structured JSON logging with Winston
- ✅ Prometheus metrics at `/metrics`
- ✅ Health check at `/health`
- ✅ RFC 7807 error responses
- ✅ Docker containerization
- ✅ Support for Amoy testnet and Polygon mainnet
- ✅ API key authentication
- ✅ Comprehensive test coverage

## Architecture

```
┌─────────────────────┐
│ FanEngagement       │
│ Backend             │
└──────────┬──────────┘
           │
           │ REST API
           │ (JSON over HTTP)
           │
           ▼
┌─────────────────────┐
│ Polygon Adapter     │
│ (This Service)      │
└──────────┬──────────┘
           │
           │ JSON-RPC
           │ (ethers.js)
           │
           ▼
┌─────────────────────┐
│ Polygon Network     │
│ (Mumbai/Mainnet)    │
└─────────────────────┘
```

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for containerized deployment)
- Polygon wallet with private key
- Test MATIC (for Mumbai testnet): https://faucet.polygon.technology/

## Installation

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Build TypeScript
npm run build

# Run tests
npm test

# Start service
npm start
```

### Docker Deployment

```bash
# Build Docker image
docker build -t polygon-adapter .

# Run with docker-compose
docker-compose up -d
```

## Configuration

Environment variables (see `.env.example`):

### Server Configuration
- `PORT`: Server port (default: 3002)
- `LOG_LEVEL`: Logging level (default: info)
- `NODE_ENV`: Environment (development/production)

### Polygon Configuration
- `POLYGON_NETWORK`: Network name (mumbai/polygon)
- `POLYGON_RPC_URL`: RPC endpoint URL
- `POLYGON_CONFIRMATIONS`: Block confirmations to wait (default: 6)
- `POLYGON_TX_TIMEOUT`: Transaction timeout in ms (default: 120000)

### Authentication
- `API_KEY`: API key for authentication
- `REQUIRE_AUTH`: Enable/disable auth (default: true)

### Private Key (choose one)
- `POLYGON_PRIVATE_KEY`: Private key as hex string
- `POLYGON_PRIVATE_KEY_PATH`: Path to private key file

### Smart Contracts (optional)
- `GOVERNANCE_CONTRACT_ADDRESS`: Deployed governance contract address

### Retry Configuration
- `RETRY_MAX_ATTEMPTS`: Max retry attempts (default: 4)
- `RETRY_BASE_DELAY_MS`: Base delay for exponential backoff (default: 1000)

## API Endpoints

All endpoints require `X-Adapter-API-Key` header (except health and metrics).

### Organizations
- `POST /v1/adapter/organizations` - Create organization

### ShareTypes (ERC-20 Tokens)
- `POST /v1/adapter/share-types` - Deploy ERC-20 token

### Share Issuances
- `POST /v1/adapter/share-issuances` - Mint tokens to recipient

### Proposals
- `POST /v1/adapter/proposals` - Create proposal

### Voting
- `POST /v1/adapter/votes` - Record vote

### Results
- `POST /v1/adapter/proposal-results` - Commit proposal results

### Transactions
- `GET /v1/adapter/transactions/:txId` - Get transaction status

### Monitoring
- `GET /v1/adapter/health` - Health check
- `GET /v1/adapter/metrics` - Prometheus metrics

## Development

```bash
# Watch mode (auto-reload)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Run unit tests
npm test

# Run integration tests (requires Mumbai RPC and test MATIC)
npm run test:integration
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests

Requires:
1. Mumbai testnet RPC URL
2. Wallet with test MATIC

```bash
export POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
export POLYGON_PRIVATE_KEY=your_private_key_here
npm run test:integration
```

Get test MATIC from: https://faucet.polygon.technology/

## Monitoring

### Health Check

```bash
curl http://localhost:3002/v1/adapter/health
```

Response:
```json
{
  "status": "healthy",
  "blockchain": "polygon",
  "network": "mumbai",
  "rpcStatus": "connected",
  "lastBlockNumber": 12345678,
  "walletAddress": "0x...",
  "walletBalance": "0.5 MATIC",
  "timestamp": "2024-12-05T00:00:00.000Z"
}
```

### Prometheus Metrics

```bash
curl http://localhost:3002/v1/adapter/metrics
```

Available metrics:
- `polygon_transactions_total{operation,status}`
- `polygon_transaction_duration_seconds{operation}`
- `polygon_rpc_errors_total{error_type}`
- `polygon_gas_used_total{operation}`
- `polygon_rpc_requests_total{method,status}`
- `polygon_rpc_latency_seconds{method}`
- `polygon_last_block_number`
- `polygon_health_status`
- `polygon_gas_price_gwei`

## Security

⚠️ **Important Security Notes:**

1. **Never commit private keys** to version control
2. Use environment variables or secret management systems
3. Keep test and production keys separate
4. Use hardware wallets for production mainnet keys
5. Implement rate limiting in production
6. Keep dependencies updated for security patches
7. Review and audit smart contracts before deployment

## Troubleshooting

### Common Issues

**Issue: "Insufficient MATIC balance for gas fees"**
- Solution: Get test MATIC from https://faucet.polygon.technology/

**Issue: "RPC timeout or network error"**
- Solution: Try alternative RPC endpoints (see .env.example)

**Issue: "Nonce error, transaction may be pending"**
- Solution: Wait for pending transactions to confirm, or restart service

**Issue: Transaction taking too long**
- Solution: Increase `POLYGON_CONFIRMATIONS` or `POLYGON_TX_TIMEOUT`

**Issue: High gas costs**
- Solution: Check network congestion, adjust `MAX_FEE_PER_GAS_GWEI`

## Production Deployment

1. Use production RPC endpoint (not public testnet RPC)
2. Implement proper secret management (AWS Secrets Manager, HashiCorp Vault)
3. Set up monitoring and alerting
4. Configure log aggregation
5. Implement rate limiting
6. Use load balancer for high availability
7. Set up automated backups
8. Monitor gas prices and wallet balance

## License

Proprietary - FanEngagement Platform

## Support

For issues and questions, contact: platform@fanengagement.io
