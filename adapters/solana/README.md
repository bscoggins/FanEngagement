# Solana Blockchain Adapter

Solana blockchain adapter for FanEngagement platform. This service provides blockchain functionality for organizations that have selected Solana as their blockchain platform.

## Features

- **Organization Management**: Create Program Derived Addresses (PDAs) for organizations
- **SPL Token Minting**: Create and manage SPL tokens for ShareTypes
- **Token Issuance**: Mint tokens to members
- **Proposal Management**: Create and manage on-chain proposals
- **Vote Recording**: Record votes on the Solana blockchain
- **Result Commitment**: Commit proposal results for verifiability
- **Transaction Queries**: Query transaction status
- **Health Monitoring**: Health checks and Prometheus metrics
- **Retry Logic**: Exponential backoff for RPC operations
- **Structured Logging**: JSON formatted logs with Winston

## Prerequisites

- Node.js 20+ and npm 10+
- Docker and Docker Compose (for containerized deployment)
- Solana CLI tools (for generating keypairs)

## Quick Start

### 1. Generate Keypair

Generate a Solana keypair for the adapter:

```bash
# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate keypair
solana-keygen new --outfile keypair.json

# View public key
solana-keygen pubkey keypair.json
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set:

- `API_KEY`: Secure API key for authentication
- `SOLANA_KEYPAIR_PATH` or `SOLANA_PRIVATE_KEY`: Path to keypair or keypair JSON
- `SOLANA_RPC_URL`: Solana RPC endpoint (devnet, testnet, or mainnet)
- `SOLANA_NETWORK`: Network name (devnet, testnet, mainnet-beta)

### 3. Run with Docker Compose (Recommended)

Start the adapter with local Solana test validator:

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f solana-adapter

# Check health
curl http://localhost:3001/v1/adapter/health

# Stop services
docker-compose down
```

### 4. Run Locally (Development)

Install dependencies and run:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode with hot reload
npm run dev

# Or run built version
npm start
```

## API Endpoints

### Base URL
- Local: `http://localhost:3001`
- Development: `https://solana-adapter-dev.fanengagement.io`
- Production: `https://solana-adapter.fanengagement.io`

### Authentication

All endpoints except `/health` and `/metrics` require API key authentication:

```
X-Adapter-API-Key: your-api-key
```

Or:

```
Authorization: Bearer your-api-key
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/adapter/organizations` | Create organization on Solana |
| POST | `/v1/adapter/share-types` | Create SPL token mint for ShareType |
| POST | `/v1/adapter/share-issuances` | Mint tokens to members |
| POST | `/v1/adapter/proposals` | Create proposal on-chain |
| POST | `/v1/adapter/votes` | Record vote on-chain |
| POST | `/v1/adapter/proposal-results` | Commit proposal results |
| GET | `/v1/adapter/transactions/:txId` | Get transaction status |
| GET | `/v1/adapter/health` | Health check |
| GET | `/v1/adapter/metrics` | Prometheus metrics |

### Example: Create Organization

```bash
curl -X POST http://localhost:3001/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Example DAO",
    "description": "An example organization"
  }'
```

Response:

```json
{
  "transactionId": "5j8s9...",
  "accountAddress": "7xK...",
  "status": "confirmed",
  "timestamp": "2024-12-04T22:00:00.000Z"
}
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

Integration tests require a running Solana test validator:

```bash
# Start test validator with Docker Compose
docker-compose up -d solana-test-validator

# Run integration tests
npm run test:integration

# Stop test validator
docker-compose down
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/v1/adapter/health
```

Response:

```json
{
  "status": "healthy",
  "blockchain": "solana",
  "network": "devnet",
  "rpcStatus": "connected",
  "lastBlockNumber": 123456,
  "timestamp": "2024-12-04T22:00:00.000Z"
}
```

### Prometheus Metrics

```bash
curl http://localhost:3001/v1/adapter/metrics
```

Available metrics:

- `solana_transactions_total{operation, status}`: Total transactions by operation and status
- `solana_transaction_duration_seconds{operation}`: Transaction duration histogram
- `solana_rpc_errors_total{error_type}`: Total RPC errors by type
- `solana_rpc_requests_total{method, status}`: Total RPC requests
- `solana_rpc_latency_seconds{method}`: RPC latency histogram
- `solana_adapter_health_status`: Health status (1=healthy, 0=unhealthy)
- `solana_last_block_number`: Last observed block number

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `LOG_LEVEL` | No | `info` | Logging level (debug, info, warn, error) |
| `NODE_ENV` | No | `development` | Environment (development, production) |
| `SOLANA_NETWORK` | No | `devnet` | Network name (devnet, testnet, mainnet-beta) |
| `SOLANA_RPC_URL` | Yes | - | Solana RPC endpoint URL |
| `SOLANA_COMMITMENT` | No | `confirmed` | Commitment level (processed, confirmed, finalized) |
| `SOLANA_CONFIRM_TIMEOUT` | No | `30000` | Transaction confirmation timeout (ms) |
| `SOLANA_KEYPAIR_PATH` | Yes* | - | Path to keypair JSON file |
| `SOLANA_PRIVATE_KEY` | Yes* | - | Keypair as JSON array (dev only) |
| `API_KEY` | Yes | - | API key for authentication |
| `REQUIRE_AUTH` | No | `true` | Enable authentication |
| `RETRY_MAX_ATTEMPTS` | No | `4` | Maximum retry attempts |
| `RETRY_BASE_DELAY_MS` | No | `1000` | Base delay for exponential backoff (ms) |

*Either `SOLANA_KEYPAIR_PATH` or `SOLANA_PRIVATE_KEY` must be provided.

## Deployment

### Docker

Build TypeScript locally first, then build Docker image:

```bash
# Build TypeScript
npm run build

# Build Docker image
docker build -t fanengagement/solana-adapter:latest .

# Run container
docker run -d \
  --name solana-adapter \
  -p 3001:3001 \
  -e SOLANA_RPC_URL=https://api.devnet.solana.com \
  -e SOLANA_NETWORK=devnet \
  -e SOLANA_PRIVATE_KEY='[1,2,3,...]' \
  -e API_KEY=your-api-key \
  fanengagement/solana-adapter:latest
```

### Kubernetes

See deployment documentation at `/docs/blockchain/solana/solana-adapter-deployment.md`.

## Architecture

```
┌─────────────────────────────────────┐
│   Solana Adapter Container          │
│                                     │
│  ┌────────────────────────────┐    │
│  │  Express HTTP API           │    │
│  │  - Routes                   │    │
│  │  - Middleware (auth, logs)  │    │
│  │  - Validation (Zod)         │    │
│  └────────┬───────────────────┘    │
│           │                         │
│  ┌────────▼───────────────────┐    │
│  │  SolanaService              │    │
│  │  - Transaction building     │    │
│  │  - PDA derivation           │    │
│  │  - SPL token operations     │    │
│  │  - Retry logic              │    │
│  └────────┬───────────────────┘    │
│           │                         │
│  ┌────────▼───────────────────┐    │
│  │  Solana Web3.js             │    │
│  │  - RPC client               │    │
│  │  - Connection pooling       │    │
│  └────────┬───────────────────┘    │
└───────────┼─────────────────────────┘
            │
            ▼
    Solana Network
    (RPC endpoint)
```

## Security

### Best Practices

1. **Never commit keypairs**: Keypairs should never be committed to version control
2. **Use environment variables**: Store sensitive data in environment variables or secrets managers
3. **Enable authentication**: Always require API key authentication in production
4. **Use HTTPS**: Enable TLS for production deployments
5. **Rotate keys regularly**: Rotate API keys and Solana keypairs periodically
6. **Limit RPC access**: Use firewall rules to restrict RPC endpoint access
7. **Monitor logs**: Monitor logs for suspicious activity

### Keypair Management

- **Development**: Use `SOLANA_PRIVATE_KEY` environment variable
- **Staging**: Use Docker secrets or Kubernetes secrets
- **Production**: Use cloud KMS (AWS KMS, Azure Key Vault, Google Secret Manager) or HashiCorp Vault

## Troubleshooting

### Adapter won't start

Check logs for errors:

```bash
docker-compose logs solana-adapter
```

Common issues:

- Missing or invalid keypair
- Invalid RPC URL
- Missing API key
- Network connectivity issues

### Transactions failing

Check:

1. Keypair has sufficient SOL for transaction fees
2. RPC endpoint is reachable and responding
3. Network is not congested
4. Transaction parameters are valid

### Health check failing

Check:

1. RPC endpoint is accessible
2. Network configuration is correct
3. Solana network is operational

## Contributing

See `/docs/blockchain/solana/solana-adapter-deployment.md` for contribution guidelines.

## License

Proprietary - FanEngagement Platform

## Support

For issues or questions, contact the FanEngagement Platform Team.
