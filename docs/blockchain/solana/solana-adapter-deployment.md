# Solana Adapter Deployment Guide

> **Document Type:** Deployment and Operations Guide  
> **Epic:** E-007 - Blockchain Adapter Platform  
> **Component:** Solana Adapter Container  
> **Last Updated:** December 2024

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Configuration](#configuration)
7. [Security](#security)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Troubleshooting](#troubleshooting)
10. [Operational Procedures](#operational-procedures)

---

## Overview

The Solana Adapter is a containerized service that provides blockchain functionality for FanEngagement organizations using Solana. It implements the standard blockchain adapter API contract and handles:

- Organization account creation (Program Derived Addresses)
- SPL token minting for ShareTypes
- Token issuance to members
- Proposal creation and management
- Vote recording
- Proposal result commitment

**Architecture:**

```
┌──────────────────┐       HTTPS       ┌──────────────────┐       RPC        ┌──────────────┐
│  FanEngagement   │ ──────────────────> │ Solana Adapter   │ ───────────────> │   Solana     │
│  Backend API     │    REST API        │   Container      │   JSON-RPC       │   Network    │
└──────────────────┘                    └──────────────────┘                  └──────────────┘
```

### Transparency Payloads

Every proposal, vote, and result transaction now carries a memo (≤566 bytes) that encodes the minimum transparency data needed for public verification. The FanEngagement backend **must** supply the following fields when calling the adapter so these memos stay deterministic:

- **Proposals**: `contentHash` (SHA-256), optional `proposalTextHash`, `expectationsHash`, `votingOptionsHash`, and the `createdByUserId` that initiated the proposal.
- **Votes**: `organizationId`, `proposalId`, `voteId`, `userId`, `optionId`, `votingPower`, plus optional `voterAddress` and ISO `timestamp`.
- **Proposal results**: `organizationId`, `resultsHash` (SHA-256), `totalVotesCast`, `quorumMet`, and optional `winningOptionId`.

Hash any large/free-form blobs (proposal text, expectation statements, ballot definitions) with SHA-256 before invoking the adapter. After a transaction settles, observers can query Solana Explorer or `getTransaction` to read the memo JSON and confirm it matches the backend’s data.

---

## Prerequisites

### Required Software

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 20+ (for local development)
- **Solana CLI**: Latest stable (for keypair generation)

### Required Resources

| Environment | CPU | Memory | Storage |
|-------------|-----|--------|---------|
| Development | 0.5 core | 512 MB | 1 GB |
| Staging | 1 core | 1 GB | 5 GB |
| Production | 2 cores | 2 GB | 10 GB |

### Network Requirements

- Outbound HTTPS to Solana RPC endpoints (devnet: `https://api.devnet.solana.com`, mainnet: `https://api.mainnet-beta.solana.com`)
- Inbound HTTP/HTTPS on port 3001 (from backend API)

---

## Local Development Setup

### Quick on-chain E2E test (backend + adapter)

Run the full Solana on-chain integration in one command from the repo root:

```bash
./scripts/run-solana-onchain-tests.sh
```

What it does: ensures the `solana-adapter` is running (connected to Devnet), waits for health, and runs `SolanaOnChainEndToEndTests` against the backend.

**Note:** You must ensure the adapter wallet is funded on Devnet before running these tests.

Key env overrides (optional):

- `SOLANA_TEST_KEYPAIR` – path to the keypair JSON array (defaults to `test-keypair.json`).
- `SOLANA_ADAPTER_BASE_URL` – adapter base URL (default `http://localhost:3001/v1/adapter/`).
- `SOLANA_ON_CHAIN_RPC_URL` – validator RPC URL (default `https://api.devnet.solana.com`).
- `SOLANA_ADAPTER_API_KEY` – adapter API key (default `dev-api-key-change-in-production`).

### 1. Generate Keypair

Generate a Solana keypair for the adapter:

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate new keypair
solana-keygen new --outfile /tmp/solana-keypair.json

# View public key
solana-keygen pubkey /tmp/solana-keypair.json
```

**IMPORTANT**: Never commit keypairs to version control!

### 2. Configure Environment

```bash
cd adapters/solana
cp .env.example .env
```

Edit `.env`:

```bash
# Server
PORT=3001
LOG_LEVEL=debug
NODE_ENV=development

# Solana (local test validator)
SOLANA_NETWORK=localnet
SOLANA_RPC_URL=http://localhost:8899
SOLANA_COMMITMENT=confirmed
SOLANA_CONFIRM_TIMEOUT=30000

# Authentication
API_KEY=dev-api-key-change-in-production
REQUIRE_AUTH=true

# Keypair
SOLANA_KEYPAIR_PATH=/tmp/solana-keypair.json
# Or use SOLANA_PRIVATE_KEY=[1,2,3,...] for JSON array

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000
```

### 3. Run with Docker Compose

```bash
# Start services (adapter + test validator)
docker-compose up -d

# View logs
docker-compose logs -f solana-adapter

# Check health
curl http://localhost:3001/v1/adapter/health

# Test API
curl -X POST http://localhost:3001/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test DAO",
    "description": "Test organization"
  }'

# Stop services
docker-compose down
```

### 4. Run Locally (Without Docker)

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start adapter
npm start

# Or run in dev mode with hot reload
npm run dev
```

---

## Docker Deployment

### Build Image

```bash
cd adapters/solana

# Build image
docker build -t fanengagement/solana-adapter:latest .

# Tag for registry
docker tag fanengagement/solana-adapter:latest \
  ghcr.io/bscoggins/fanengagement-solana-adapter:v1.0.0

# Push to registry
docker push ghcr.io/bscoggins/fanengagement-solana-adapter:v1.0.0
```

### Run Container

```bash
# Create keypair file
echo '[1,2,3,...]' > /secrets/keypair.json

# Run container
docker run -d \
  --name solana-adapter \
  -p 3001:3001 \
  -e SOLANA_RPC_URL=https://api.devnet.solana.com \
  -e SOLANA_NETWORK=devnet \
  -e SOLANA_KEYPAIR_PATH=/secrets/keypair.json \
  -e API_KEY=your-secure-api-key \
  -v /secrets:/secrets:ro \
  fanengagement/solana-adapter:latest

# Check logs
docker logs -f solana-adapter

# Check health
docker exec solana-adapter wget -q -O- http://localhost:3001/v1/adapter/health
```

---

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster 1.24+
- kubectl configured
- Helm 3+ (optional)
- cert-manager for TLS certificates

### 1. Create Namespace

```bash
kubectl create namespace fanengagement
```

### 2. Create Secrets

```bash
# Create API key secret
kubectl create secret generic solana-adapter-secrets \
  --from-literal=api-key=your-secure-api-key \
  -n fanengagement

# Create keypair secret
kubectl create secret generic solana-keypair \
  --from-file=keypair.json=/path/to/keypair.json \
  -n fanengagement
```

### 3. Deploy Adapter

Create `solana-adapter-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-adapter
  namespace: fanengagement
  labels:
    app: solana-adapter
    version: v1.0.0
spec:
  replicas: 2
  selector:
    matchLabels:
      app: solana-adapter
  template:
    metadata:
      labels:
        app: solana-adapter
        version: v1.0.0
    spec:
      containers:
      - name: adapter
        image: ghcr.io/bscoggins/fanengagement-solana-adapter:v1.0.0
        ports:
        - containerPort: 3001
          name: http
        env:
        - name: PORT
          value: "3001"
        - name: LOG_LEVEL
          value: "info"
        - name: NODE_ENV
          value: "production"
        - name: SOLANA_NETWORK
          value: "mainnet-beta"
        - name: SOLANA_RPC_URL
          value: "https://api.mainnet-beta.solana.com"
        - name: SOLANA_COMMITMENT
          value: "confirmed"
        - name: SOLANA_CONFIRM_TIMEOUT
          value: "30000"
        - name: SOLANA_KEYPAIR_PATH
          value: "/secrets/keypair.json"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: solana-adapter-secrets
              key: api-key
        - name: REQUIRE_AUTH
          value: "true"
        - name: RETRY_MAX_ATTEMPTS
          value: "4"
        - name: RETRY_BASE_DELAY_MS
          value: "1000"
        volumeMounts:
        - name: keypair
          mountPath: /secrets
          readOnly: true
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
      volumes:
      - name: keypair
        secret:
          secretName: solana-keypair
          items:
          - key: keypair.json
            path: keypair.json
---
apiVersion: v1
kind: Service
metadata:
  name: solana-adapter
  namespace: fanengagement
  labels:
    app: solana-adapter
spec:
  type: ClusterIP
  selector:
    app: solana-adapter
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
    name: http
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: solana-adapter-hpa
  namespace: fanengagement
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: solana-adapter
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

Apply deployment:

```bash
kubectl apply -f solana-adapter-deployment.yaml
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n fanengagement -l app=solana-adapter

# Check logs
kubectl logs -n fanengagement -l app=solana-adapter --tail=100

# Port forward for testing
kubectl port-forward -n fanengagement svc/solana-adapter 3001:80

# Test health
curl http://localhost:3001/v1/adapter/health
```

---

## Configuration

### Environment Variables

See [README.md](./README.md#configuration) for complete list of environment variables.

### RPC Endpoints

| Network | RPC URL | Use Case |
|---------|---------|----------|
| Localnet | `http://localhost:8899` | Local development |
| Devnet | `https://api.devnet.solana.com` | Development/testing |
| Testnet | `https://api.testnet.solana.com` | Staging |
| Mainnet | `https://api.mainnet-beta.solana.com` | Production |

**Production RPC Providers:**

For production, use a dedicated RPC provider for better performance and reliability:

- **Helius**: https://www.helius.dev/
- **Alchemy**: https://www.alchemy.com/solana
- **QuickNode**: https://www.quicknode.com/chains/sol

---

## Security

### Keypair Management

**CRITICAL**: Solana keypairs control funds and signing authority. Protect them carefully!

#### Development

Store keypair in environment variable or file outside repository:

```bash
# Generate keypair
solana-keygen new --outfile /tmp/dev-keypair.json

# Use in .env
SOLANA_KEYPAIR_PATH=/tmp/dev-keypair.json
```

#### Production

Use one of these secure methods:

#### Option 1: Kubernetes Secrets

```bash
# Create secret from file
kubectl create secret generic solana-keypair \
  --from-file=keypair.json=/secure/path/keypair.json \
  -n fanengagement

# Reference in deployment
volumeMounts:
- name: keypair
  mountPath: /secrets
  readOnly: true
```

#### Option 2: AWS Secrets Manager

```bash
# Store keypair
aws secretsmanager create-secret \
  --name fanengagement/solana/keypair \
  --secret-string file:///path/to/keypair.json

# Retrieve in adapter startup
# (requires AWS SDK and IAM permissions)
```

#### Option 3: HashiCorp Vault

```bash
# Store keypair
vault kv put secret/fanengagement/solana/keypair \
  keypair=@/path/to/keypair.json

# Retrieve with Vault agent or init container
```

### API Key Rotation

Rotate API keys regularly:

```bash
# Generate new key
NEW_KEY=$(openssl rand -base64 32)

# Update secret
kubectl create secret generic solana-adapter-secrets \
  --from-literal=api-key=$NEW_KEY \
  --dry-run=client -o yaml | kubectl apply -n fanengagement -f -

# Restart pods to pick up new secret
kubectl rollout restart deployment/solana-adapter -n fanengagement

# Update backend configuration
```

### Network Security

- Use private Kubernetes networks for adapter communication
- Enable TLS/HTTPS for all traffic
- Restrict RPC endpoint access with firewall rules
- Monitor for suspicious activity

---

## Monitoring and Logging

### Health Checks

```bash
# Health endpoint
curl http://solana-adapter:3001/v1/adapter/health

# Expected response
{
  "status": "healthy",
  "blockchain": "solana",
  "network": "mainnet-beta",
  "rpcStatus": "connected",
  "lastBlockNumber": 123456789,
  "timestamp": "2024-12-04T22:00:00.000Z"
}
```

### Prometheus Metrics

```bash
# Metrics endpoint
curl http://solana-adapter:3001/v1/adapter/metrics
```

**Key Metrics:**

- `solana_transactions_total{operation, status}`: Transaction counts
- `solana_transaction_duration_seconds{operation}`: Transaction latency
- `solana_rpc_errors_total{error_type}`: RPC error counts
- `solana_adapter_health_status`: Health status (1=healthy, 0=unhealthy)

### Grafana Dashboards

Create dashboards to monitor:

1. **Transaction Success Rate**: % of successful transactions by operation
2. **Transaction Latency**: P50, P95, P99 latency by operation
3. **RPC Health**: Error rate, latency, availability
4. **Resource Usage**: CPU, memory, network

### Logging

Logs are structured JSON format:

```json
{
  "timestamp": "2024-12-04T22:00:00.000Z",
  "level": "info",
  "message": "Transaction submitted successfully",
  "service": "solana-adapter",
  "operation": "create_organization",
  "transactionId": "5j8s9...",
  "organizationId": "550e8400-e29b-41d4-a716-446655440000",
  "durationMs": 1234
}
```

**Log Aggregation:**

- **Development**: Docker logs (`docker-compose logs`)
- **Production**: Centralized logging (Loki, Elasticsearch, CloudWatch)

---

## Troubleshooting

### Adapter Won't Start

**Symptom**: Container exits immediately or restarts repeatedly

**Diagnosis:**

```bash
# Check logs
kubectl logs -n fanengagement -l app=solana-adapter --tail=50

# Common errors
- "Failed to load Solana keypair": Keypair missing or invalid
- "API_KEY is required": Missing API_KEY environment variable
- "SOLANA_RPC_URL is required": Missing RPC URL
```

**Solutions:**

1. Verify secrets are created and mounted correctly
2. Check environment variables are set
3. Validate keypair JSON format
4. Test RPC URL accessibility

### Transactions Failing

**Symptom**: Transactions return errors or timeout

**Diagnosis:**

```bash
# Check RPC connectivity
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Check adapter logs for errors
kubectl logs -n fanengagement -l app=solana-adapter | grep -i error
```

**Solutions:**

1. **Insufficient SOL**: Fund keypair with SOL for transaction fees

    ```bash
    solana airdrop 1 <PUBLIC_KEY> --url devnet
    ```

2. **RPC Rate Limit**: Use dedicated RPC provider or increase limits

3. **Network Congestion**: Increase `SOLANA_CONFIRM_TIMEOUT` or retry logic

4. **Invalid Transaction**: Check transaction parameters and signatures

### High Latency

**Symptom**: Transactions taking >10 seconds

**Diagnosis:**

- Check Prometheus metrics for `solana_transaction_duration_seconds`
- Check RPC provider status
- Check network bandwidth

**Solutions:**

1. Use dedicated RPC provider (Helius, Alchemy, QuickNode)
2. Increase `RETRY_MAX_ATTEMPTS` and adjust backoff
3. Scale adapter horizontally (increase replicas)
4. Use faster commitment level (`processed` vs `finalized`)

---

## Operational Procedures

### Deployment

```bash
# Build and push new version
docker build -t ghcr.io/bscoggins/fanengagement-solana-adapter:v1.1.0 .
docker push ghcr.io/bscoggins/fanengagement-solana-adapter:v1.1.0

# Update deployment
kubectl set image deployment/solana-adapter \
  adapter=ghcr.io/bscoggins/fanengagement-solana-adapter:v1.1.0 \
  -n fanengagement

# Monitor rollout
kubectl rollout status deployment/solana-adapter -n fanengagement
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/solana-adapter -n fanengagement

# Rollback to specific revision
kubectl rollout undo deployment/solana-adapter --to-revision=2 -n fanengagement
```

### Scaling

```bash
# Manual scaling
kubectl scale deployment/solana-adapter --replicas=5 -n fanengagement

# Update HPA
kubectl patch hpa solana-adapter-hpa -n fanengagement \
  -p '{"spec":{"minReplicas":3,"maxReplicas":15}}'
```

### Key Rotation

```bash
# Generate new keypair
solana-keygen new --outfile /tmp/new-keypair.json

# Update secret
kubectl create secret generic solana-keypair \
  --from-file=keypair.json=/tmp/new-keypair.json \
  --dry-run=client -o yaml | kubectl apply -n fanengagement -f -

# Restart deployment
kubectl rollout restart deployment/solana-adapter -n fanengagement

# Cleanup
rm /tmp/new-keypair.json
```

### Backup and Recovery

**Keypair Backup:**

```bash
# Backup keypair
kubectl get secret solana-keypair -n fanengagement -o jsonpath='{.data.keypair\.json}' | \
  base64 -d > keypair-backup-$(date +%Y%m%d).json

# Encrypt backup
gpg -c keypair-backup-$(date +%Y%m%d).json

# Store in secure location (not in repository)
```

**Recovery:**

```bash
# Restore from backup
gpg -d keypair-backup-20241204.json.gpg > keypair.json

# Recreate secret
kubectl create secret generic solana-keypair \
  --from-file=keypair.json=keypair.json \
  -n fanengagement --dry-run=client -o yaml | kubectl apply -f -

# Cleanup
rm keypair.json
```

---

## References

- [Solana Adapter API Specification](../solana-adapter-api.yaml)
- [Solana Capabilities Analysis](../solana-capabilities-analysis.md)
- [Adapter Platform Architecture](../../adapter-platform-architecture.md)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

---

**Last Updated**: December 2024  
**Maintained By**: FanEngagement Platform Team
