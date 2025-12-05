# Polygon Adapter Deployment Guide

> **Document Type:** Operational Documentation  
> **Epic:** E-007 - Blockchain Platform Integration  
> **Component:** Polygon Adapter (E-007-05)  
> **Status:** Complete  
> **Last Updated:** December 2024

## Overview

This document provides comprehensive deployment and operational guidance for the Polygon blockchain adapter service. The adapter enables FanEngagement organizations to use Polygon for governance operations including share tokenization (ERC-20), proposals, voting, and result commitment.

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Local Development Setup](#3-local-development-setup)
4. [Docker Deployment](#4-docker-deployment)
5. [Production Deployment](#5-production-deployment)
6. [Configuration Reference](#6-configuration-reference)
7. [Monitoring and Observability](#7-monitoring-and-observability)
8. [Troubleshooting](#8-troubleshooting)
9. [Security Considerations](#9-security-considerations)
10. [Maintenance and Operations](#10-maintenance-and-operations)

---

## 1. Architecture

### 1.1 System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                     FanEngagement Backend                         │
│                   (Main Application Server)                       │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             │ REST API (HTTP/JSON)
                             │ Port 3002
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Polygon Adapter Service                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  API Layer (Express.js)                                    │  │
│  │  - Authentication (API Key)                                │  │
│  │  - Request Validation (Zod)                                │  │
│  │  - Error Handling (RFC 7807)                               │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │  Business Logic (PolygonService)                           │  │
│  │  - Transaction Building                                    │  │
│  │  - Gas Estimation                                          │  │
│  │  - Retry Logic                                             │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│  ┌───────────────────────────▼────────────────────────────────┐  │
│  │  Blockchain Client (ethers.js v6)                          │  │
│  │  - JSON-RPC Provider                                       │  │
│  │  - Wallet Management                                       │  │
│  │  - Transaction Signing                                     │  │
│  └───────────────────────────┬────────────────────────────────┘  │
└──────────────────────────────┼─────────────────────────────────┘
                               │
                               │ JSON-RPC
                               │ (HTTPS)
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Polygon Network                             │
│                                                                   │
│  Amoy Testnet:     https://rpc-amoy.polygon.technology           │
│  Mumbai Testnet:   https://rpc-mumbai.maticvigil.com (deprecated)│
│  Polygon Mainnet:  https://polygon-rpc.com                       │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

- **Runtime:** Node.js 20 LTS
- **Language:** TypeScript 5.7
- **Web Framework:** Express.js 4.21
- **Blockchain SDK:** ethers.js 6.13
- **Validation:** Zod 3.24
- **Logging:** Winston 3.17 (JSON structured logs)
- **Metrics:** prom-client 15.1 (Prometheus)
- **Container:** Docker (Alpine Linux base)

### 1.3 Key Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| API Routes | HTTP endpoint handlers | Express Router |
| PolygonService | Blockchain operations | ethers.js |
| Wallet Manager | Private key management | ethers Wallet |
| Metrics Collector | Prometheus metrics | prom-client |
| Logger | Structured logging | Winston |
| Middleware | Auth, validation, errors | Express middleware |

---

## 2. Prerequisites

### 2.1 Required Tools

- **Node.js:** Version 20.x or higher
- **npm:** Version 10.x or higher
- **Docker:** Version 24.x or higher (for containerized deployment)
- **Docker Compose:** Version 2.x or higher

### 2.2 Polygon Wallet

You need a Polygon wallet with:

1. **Private Key:** 64 hex characters (without 0x prefix)
2. **MATIC Balance:** For gas fees
   - Mumbai testnet: Get free test MATIC from https://faucet.polygon.technology/
   - Polygon mainnet: Purchase MATIC on exchanges

### 2.3 RPC Endpoint

Choose an RPC provider:

**Mumbai Testnet (Free):**
- https://rpc-mumbai.maticvigil.com
- https://polygon-mumbai-bor-rpc.publicnode.com
- https://rpc.ankr.com/polygon_mumbai

**Polygon Mainnet:**
- https://polygon-rpc.com (public, rate limited)
- Alchemy: https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY
- Infura: https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
- QuickNode: Custom URL

> **Production Note:** Use a dedicated RPC provider (Alchemy, Infura, QuickNode) for production deployments to avoid rate limits and ensure reliability.

---

## 3. Local Development Setup

### 3.1 Clone and Install

```bash
cd /path/to/FanEngagement/adapters/polygon
npm install
```

### 3.2 Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Server
PORT=3002
LOG_LEVEL=debug
NODE_ENV=development

# Polygon
POLYGON_NETWORK=amoy
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CONFIRMATIONS=6
POLYGON_TX_TIMEOUT=120000

# Authentication
API_KEY=dev-api-key
REQUIRE_AUTH=true

# Private Key (without 0x prefix)
POLYGON_PRIVATE_KEY=your_private_key_here

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000
```

### 3.3 Build and Run

```bash
# Build TypeScript
npm run build

# Run in development mode (auto-reload)
npm run dev

# Run in production mode
npm start
```

### 3.4 Verify Service

```bash
# Health check
curl http://localhost:3002/v1/adapter/health

# Expected response:
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

---

## 4. Docker Deployment

### 4.1 Build Docker Image

```bash
cd /path/to/FanEngagement/adapters/polygon

# Build TypeScript first
npm install
npm run build

# Build Docker image
docker build -t fanengagement-polygon-adapter:latest .
```

### 4.2 Run with Docker Compose

Create `.env` file in the polygon adapter directory:

```bash
POLYGON_PRIVATE_KEY=your_private_key_here
API_KEY=your_secure_api_key_here
```

Start the service:

```bash
docker-compose up -d
```

Check logs:

```bash
docker-compose logs -f polygon-adapter
```

Stop the service:

```bash
docker-compose down
```

### 4.3 Run with Docker CLI

```bash
docker run -d \
  --name polygon-adapter \
  -p 3002:3002 \
  -e POLYGON_NETWORK=amoy \
  -e POLYGON_RPC_URL=https://rpc-amoy.polygon.technology \
  -e POLYGON_PRIVATE_KEY=your_private_key_here \
  -e API_KEY=your_api_key_here \
  fanengagement-polygon-adapter:latest
```

---

## 5. Production Deployment

### 5.1 Kubernetes Deployment

**ConfigMap (polygon-adapter-config.yaml):**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: polygon-adapter-config
  namespace: fanengagement
data:
  PORT: "3002"
  LOG_LEVEL: "info"
  NODE_ENV: "production"
  POLYGON_NETWORK: "polygon"
  POLYGON_RPC_URL: "https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
  POLYGON_CONFIRMATIONS: "12"
  POLYGON_TX_TIMEOUT: "180000"
  REQUIRE_AUTH: "true"
  RETRY_MAX_ATTEMPTS: "5"
  RETRY_BASE_DELAY_MS: "2000"
```

**Secret (polygon-adapter-secret.yaml):**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: polygon-adapter-secret
  namespace: fanengagement
type: Opaque
stringData:
  POLYGON_PRIVATE_KEY: "your_private_key_here"
  API_KEY: "your_secure_api_key_here"
```

**Deployment (polygon-adapter-deployment.yaml):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polygon-adapter
  namespace: fanengagement
spec:
  replicas: 2
  selector:
    matchLabels:
      app: polygon-adapter
  template:
    metadata:
      labels:
        app: polygon-adapter
    spec:
      containers:
      - name: polygon-adapter
        image: fanengagement/polygon-adapter:1.0.0
        ports:
        - containerPort: 3002
          name: http
        envFrom:
        - configMapRef:
            name: polygon-adapter-config
        - secretRef:
            name: polygon-adapter-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3002
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
```

**Service (polygon-adapter-service.yaml):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: polygon-adapter
  namespace: fanengagement
spec:
  selector:
    app: polygon-adapter
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3002
  type: ClusterIP
```

Apply:

```bash
kubectl apply -f polygon-adapter-config.yaml
kubectl apply -f polygon-adapter-secret.yaml
kubectl apply -f polygon-adapter-deployment.yaml
kubectl apply -f polygon-adapter-service.yaml
```

### 5.2 AWS ECS Deployment

**Task Definition (polygon-adapter-task.json):**

```json
{
  "family": "polygon-adapter",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "polygon-adapter",
      "image": "YOUR_ECR_REPO/polygon-adapter:latest",
      "portMappings": [
        {
          "containerPort": 3002,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "3002"},
        {"name": "LOG_LEVEL", "value": "info"},
        {"name": "NODE_ENV", "value": "production"},
        {"name": "POLYGON_NETWORK", "value": "polygon"},
        {"name": "POLYGON_RPC_URL", "value": "https://polygon-rpc.com"},
        {"name": "POLYGON_CONFIRMATIONS", "value": "12"},
        {"name": "REQUIRE_AUTH", "value": "true"}
      ],
      "secrets": [
        {
          "name": "POLYGON_PRIVATE_KEY",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:polygon-private-key"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:polygon-api-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/polygon-adapter",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:3002/v1/adapter/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 10
      }
    }
  ]
}
```

---

## 6. Configuration Reference

### 6.1 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **Server** ||||
| PORT | No | 3002 | HTTP server port |
| LOG_LEVEL | No | info | Logging level (debug, info, warn, error) |
| NODE_ENV | No | production | Environment (development, production) |
| **Polygon** ||||
| POLYGON_NETWORK | Yes | mumbai | Network (mumbai, polygon) |
| POLYGON_RPC_URL | Yes | - | RPC endpoint URL |
| POLYGON_CONFIRMATIONS | No | 6 | Block confirmations to wait |
| POLYGON_TX_TIMEOUT | No | 120000 | Transaction timeout (ms) |
| POLYGON_PRIVATE_KEY | Yes* | - | Private key (hex, no 0x) |
| POLYGON_PRIVATE_KEY_PATH | Yes* | - | Path to private key file |
| GOVERNANCE_CONTRACT_ADDRESS | No | - | Governance contract address |
| **Authentication** ||||
| API_KEY | Yes** | - | API key for authentication |
| REQUIRE_AUTH | No | true | Enable authentication |
| **Retry** ||||
| RETRY_MAX_ATTEMPTS | No | 4 | Max retry attempts |
| RETRY_BASE_DELAY_MS | No | 1000 | Base delay for exponential backoff |
| **Gas** ||||
| GAS_LIMIT_MULTIPLIER | No | 1.2 | Gas limit safety multiplier |
| MAX_FEE_PER_GAS_GWEI | No | - | Max fee per gas (GWEI) |
| MAX_PRIORITY_FEE_PER_GAS_GWEI | No | - | Max priority fee (GWEI) |

\* Either POLYGON_PRIVATE_KEY or POLYGON_PRIVATE_KEY_PATH required  
\** Required when REQUIRE_AUTH=true

---

## 7. Monitoring and Observability

### 7.1 Health Check Endpoint

**Endpoint:** `GET /v1/adapter/health`

**Response:**
```json
{
  "status": "healthy",
  "blockchain": "polygon",
  "network": "amoy",
  "rpcStatus": "connected",
  "lastBlockNumber": 12345678,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "walletBalance": "5.234 MATIC",
  "timestamp": "2024-12-05T00:00:00.000Z"
}
```

### 7.2 Prometheus Metrics

**Endpoint:** `GET /v1/adapter/metrics`

**Available Metrics:**

```promql
# Transaction metrics
polygon_transactions_total{operation="create_organization",status="success"} 42
polygon_transaction_duration_seconds{operation="create_share_type"} 2.5
polygon_gas_used_total{operation="record_vote"} 145000

# RPC metrics
polygon_rpc_errors_total{error_type="timeout"} 3
polygon_rpc_requests_total{method="getBlockNumber",status="success"} 1250
polygon_rpc_latency_seconds{method="getTransaction"} 0.15

# Health metrics
polygon_health_status 1
polygon_last_block_number 45678901
polygon_gas_price_gwei 50.5
```

### 7.3 Grafana Dashboard

Example queries:

```promql
# Transaction success rate
rate(polygon_transactions_total{status="success"}[5m]) /
rate(polygon_transactions_total[5m])

# Average transaction duration by operation
avg(polygon_transaction_duration_seconds) by (operation)

# RPC error rate
rate(polygon_rpc_errors_total[5m])

# Current gas price
polygon_gas_price_gwei
```

### 7.4 Alerting Rules

```yaml
groups:
- name: polygon_adapter
  rules:
  - alert: PolygonAdapterDown
    expr: polygon_health_status == 0
    for: 2m
    annotations:
      summary: "Polygon adapter is unhealthy"
  
  - alert: HighRPCErrorRate
    expr: rate(polygon_rpc_errors_total[5m]) > 0.1
    for: 5m
    annotations:
      summary: "High RPC error rate detected"
  
  - alert: LowWalletBalance
    expr: polygon_wallet_balance_matic < 0.1
    for: 10m
    annotations:
      summary: "Wallet balance is low"
```

---

## 8. Troubleshooting

### 8.1 Common Issues

**Issue: Insufficient MATIC balance**

```
Error: insufficient funds for gas * price + value
```

**Solution:**
- Check wallet balance: `curl http://localhost:3002/v1/adapter/health`
- For Mumbai testnet: Get test MATIC from https://faucet.polygon.technology/
- For mainnet: Add MATIC to your wallet

**Issue: RPC timeout**

```
Error: RPC timeout or network error
```

**Solution:**
- Try alternative RPC endpoints
- Increase POLYGON_TX_TIMEOUT
- Check network connectivity

**Issue: Nonce too low/high**

```
Error: nonce has already been used
```

**Solution:**
- Wait for pending transactions to confirm
- Restart the adapter service to reset nonce tracking

**Issue: Gas estimation failed**

```
Error: cannot estimate gas; transaction may fail
```

**Solution:**
- Check recipient address is valid
- Ensure sufficient MATIC balance
- Review transaction parameters

### 8.2 Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
npm start
```

---

## 9. Security Considerations

### 9.1 Private Key Management

**Never:**
- Commit private keys to version control
- Share private keys via email or chat
- Store private keys in plain text
- Use the same key for test and production

**Always:**
- Use environment variables or secret management
- Use hardware wallets for production mainnet
- Rotate keys periodically
- Monitor wallet activity

### 9.2 API Key Security

- Generate strong, random API keys
- Rotate API keys regularly
- Use different keys for each environment
- Implement rate limiting

### 9.3 Network Security

- Use HTTPS for RPC connections
- Whitelist IP addresses
- Implement firewall rules
- Use VPC/private subnets in production

---

## 10. Maintenance and Operations

### 10.1 Wallet Balance Monitoring

Set up alerts when balance falls below threshold:

```bash
# Check balance
curl http://localhost:3002/v1/adapter/health | jq '.walletBalance'
```

### 10.2 Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions carefully
npm install ethers@latest
```

### 10.3 Backup and Recovery

**Backup:**
- Private key (secure offline storage)
- Configuration files
- Smart contract addresses

**Recovery:**
- Restore private key from backup
- Redeploy with same configuration
- Verify contract addresses

### 10.4 Performance Tuning

**For high transaction volume:**
- Increase `RETRY_MAX_ATTEMPTS`
- Decrease `POLYGON_CONFIRMATIONS` (with caution)
- Use dedicated RPC endpoint
- Consider multiple wallet accounts

---

## Conclusion

This guide covers the complete deployment and operations of the Polygon adapter. For additional support, contact the FanEngagement platform team.

**Quick Links:**
- Polygon Documentation: https://docs.polygon.technology/
- Mumbai Faucet: https://faucet.polygon.technology/
- PolygonScan (Mainnet): https://polygonscan.com/
- Mumbai Explorer: https://mumbai.polygonscan.com/
