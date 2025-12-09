# Blockchain Adapter Testing Playbook

> **Document Type:** Testing Playbook & Quick Reference  
> **Epic:** E-007 - Blockchain Adapter Platform  
> **Audience:** Developers, QA Engineers, DevOps  
> **Last Updated:** December 2024

## Purpose

This playbook provides a **repeatable checklist** for testing Solana and Polygon blockchain adapters. Any developer can follow these steps to:

✅ Generate and securely store blockchain wallet credentials  
✅ Fund test accounts on devnet/testnet networks  
✅ Validate adapter functionality with smoke tests  
✅ Troubleshoot common errors without tribal knowledge  
✅ Verify adapter health and transaction submission  

**Key Principles:**

- **Self-Service:** Complete workflows without asking for help
- **Security-First:** Never reuse test credentials in production
- **Repeatable:** Same steps work every time
- **Comprehensive:** Covers local dev, CI/CD, and manual QA

---

## Table of Contents

1. [Quick Start Matrix](#1-quick-start-matrix)
2. [Prerequisites](#2-prerequisites)
3. [Solana Adapter Testing](#3-solana-adapter-testing)
4. [Polygon Adapter Testing](#4-polygon-adapter-testing)
5. [Environment Configuration](#5-environment-configuration)
6. [Smoke Test Suite](#6-smoke-test-suite)
7. [CI/CD Testing](#7-cicd-testing)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Security Best Practices](#9-security-best-practices)
10. [Quick Reference](#10-quick-reference)

---

## 1. Quick Start Matrix

| Task | Solana | Polygon |
|------|--------|---------|
| **Generate Credentials** | `solana-keygen new` | OpenSSL or Node.js script |
| **Network for Testing** | Devnet | Amoy testnet (Mumbai deprecated) |
| **Funding Method** | `solana airdrop` command | Polygon faucet website |
| **RPC Endpoint** | `https://api.devnet.solana.com` | `https://rpc-amoy.polygon.technology` |
| **Explorer** | [Solana Explorer](https://explorer.solana.com/?cluster=devnet) | [PolygonScan Amoy](https://amoy.polygonscan.com/) |
| **Adapter Port** | 3001 | 3002 |
| **Health Check** | `GET /v1/adapter/health` | `GET /v1/adapter/health` |
| **Min Balance** | 2 SOL (devnet) | 0.5 MATIC (Amoy) |

---

## 2. Prerequisites

### 2.1 Required Tools

Install these tools before starting:

```bash
# Node.js and npm
node --version  # Requires v20+
npm --version   # Requires v10+

# Docker and Docker Compose
docker --version        # Requires v24+
docker-compose --version # Requires v2+

# Solana CLI (for Solana adapter)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
solana --version

# Git
git --version
```

### 2.2 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 10 GB free | 20 GB free |
| Network | Stable internet | Broadband connection |

### 2.3 Repository Setup

```bash
# Clone repository
git clone https://github.com/bscoggins/FanEngagement.git
cd FanEngagement

# Verify adapter directories exist
ls -la adapters/
# Expected: solana/, polygon/, shared/
```

---

## 3. Solana Adapter Testing

### 3.1 Generate Solana Keypair

**Step 1: Generate a new keypair**

```bash
# Create directory for test keys (outside repository)
mkdir -p ~/.fanengagement/keys

# Generate keypair (no passphrase for testing)
solana-keygen new --outfile ~/.fanengagement/keys/solana-devnet-keypair.json --no-bip39-passphrase

# Output example:
# Generating a new keypair
# Wrote new keypair to /Users/you/.fanengagement/keys/solana-devnet-keypair.json
# ================================================================================
# pubkey: 7xK2kF3xM9pQwX5hN4vB6sT8dC1gR2yU3zE9jS4mL5nP
# ================================================================================
# Save this seed phrase and your BIP39 passphrase to recover your new keypair:
# (seed phrase will be displayed here)
# ================================================================================
```

**Step 2: View public key**

```bash
solana-keygen pubkey ~/.fanengagement/keys/solana-devnet-keypair.json

# Copy this public key - you'll need it for funding
```

**⚠️ SECURITY WARNING:**
- **NEVER commit this keypair file to Git**
- This is for devnet testing ONLY
- Generate a new keypair for mainnet with hardware wallet backup

### 3.2 Configure Solana Network

**Step 1: Set Solana CLI to devnet**

```bash
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get

# Expected output:
# Config File: /Users/you/.config/solana/cli/config.yml
# RPC URL: https://api.devnet.solana.com
# WebSocket URL: wss://api.devnet.solana.com/ (computed)
# Keypair Path: ~/.fanengagement/keys/solana-devnet-keypair.json
# Commitment: confirmed
```

**Step 2: Set default keypair (optional)**

```bash
solana config set --keypair ~/.fanengagement/keys/solana-devnet-keypair.json
```

### 3.3 Fund Devnet Account

**Step 1: Request airdrop**

```bash
# Request 2 SOL (maximum per airdrop)
solana airdrop 2 ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Alternative: use public key directly
solana airdrop 2 7xK2kF3xM9pQwX5hN4vB6sT8dC1gR2yU3zE9jS4mL5nP --url https://api.devnet.solana.com
```

**Step 2: Verify balance**

```bash
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Expected: 2 SOL (or close to it after small transaction fees)
```

**Step 3: Request more if needed**

```bash
# Wait 30 seconds between airdrops to avoid rate limits
sleep 30
solana airdrop 2 ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Check new balance
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com
```

**💡 TIP:** Keep at least 2 SOL in your devnet account for continuous testing.

### 3.4 Configure Solana Adapter

**Step 1: Navigate to adapter directory**

```bash
cd adapters/solana
```

**Step 2: Create environment file**

```bash
cp .env.example .env
```

**Step 3: Edit `.env` file**

```bash
# Server Configuration
PORT=3001
LOG_LEVEL=debug
NODE_ENV=development

# Solana Network Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
SOLANA_CONFIRM_TIMEOUT=30000

# Authentication
API_KEY=dev-api-key-change-in-production
REQUIRE_AUTH=true

# Keypair (choose one method)
# Method 1: File path (recommended)
SOLANA_KEYPAIR_PATH=/Users/you/.fanengagement/keys/solana-devnet-keypair.json

# Method 2: JSON array (alternative, less secure)
# SOLANA_PRIVATE_KEY=[1,2,3,4,...]  # Full keypair array

# Retry Configuration
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000
```

**⚠️ IMPORTANT:** Update `SOLANA_KEYPAIR_PATH` with your actual path.

### 3.5 Start Solana Adapter

**Option A: Docker Compose (Recommended)**

```bash
# From FanEngagement root directory
docker-compose up -d solana-adapter

# View logs
docker-compose logs -f solana-adapter

# Expected log output:
# solana-adapter | {"timestamp":"2024-12-09T00:00:00.000Z","level":"info","message":"Solana Adapter starting..."}
# solana-adapter | {"timestamp":"2024-12-09T00:00:00.100Z","level":"info","message":"Connected to Solana devnet"}
# solana-adapter | {"timestamp":"2024-12-09T00:00:00.200Z","level":"info","message":"Server listening on port 3001"}
```

**Option B: Local Node.js**

```bash
cd adapters/solana

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start adapter
npm run dev  # Development mode with auto-reload

# Or run production build
npm start
```

### 3.6 Verify Solana Adapter Health

**Step 1: Health check**

```bash
curl http://localhost:3001/v1/adapter/health

# Expected response:
{
  "status": "healthy",
  "blockchain": "solana",
  "network": "devnet",
  "rpcStatus": "connected",
  "lastBlockNumber": 287654321,
  "timestamp": "2024-12-09T00:00:00.000Z"
}
```

**Step 2: Check wallet address in logs**

```bash
docker-compose logs solana-adapter | grep "publicKey\|wallet"

# Should show your public key
```

**Step 3: Verify balance via adapter**

The health endpoint does not expose balance for security, but you can verify via Solana CLI:

```bash
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com
```

### 3.7 Solana Smoke Tests

See [Section 6: Smoke Test Suite](#6-smoke-test-suite) for detailed test procedures.

**Quick validation:**

```bash
# Test 1: Create organization
curl -X POST http://localhost:3001/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test DAO",
    "description": "Smoke test organization"
  }'

# Expected response:
{
  "transactionId": "5j8s9KfGpnVCwmAjWBfnN4mKR8sT3pQwX9HvLyE2dNkM...",
  "accountAddress": "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS",
  "status": "confirmed",
  "timestamp": "2024-12-09T00:00:00.000Z"
}

# Test 2: Verify transaction on explorer
# Copy transactionId and visit:
# https://explorer.solana.com/tx/<transactionId>?cluster=devnet
```

---

## 4. Polygon Adapter Testing

### 4.1 Generate Polygon Private Key

**Method 1: Using OpenSSL (Linux/macOS)**

```bash
# Create directory for test keys
mkdir -p ~/.fanengagement/keys

# Generate private key (hex format)
openssl rand -hex 32 > ~/.fanengagement/keys/polygon-amoy-private-key.txt

# View private key
cat ~/.fanengagement/keys/polygon-amoy-private-key.txt

# Example output:
# a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**Method 2: Using Node.js**

```javascript
// Save as generate-polygon-key.js
const crypto = require('crypto');
const fs = require('fs');

// Generate 32 random bytes as hex
const privateKey = crypto.randomBytes(32).toString('hex');

// Save to file
fs.writeFileSync(
  `${process.env.HOME}/.fanengagement/keys/polygon-amoy-private-key.txt`,
  privateKey
);

console.log('Private key generated:');
console.log(privateKey);
console.log('\nSaved to: ~/.fanengagement/keys/polygon-amoy-private-key.txt');
```

Run the script:

```bash
node generate-polygon-key.js
rm generate-polygon-key.js  # Clean up after use
```

**Method 3: Using ethers.js (Node.js REPL)**

```bash
node
```

```javascript
const { Wallet } = require('ethers');

// Generate random wallet
const wallet = Wallet.createRandom();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);  // Includes '0x' prefix

// Copy private key (remove '0x' prefix for .env file)
```

**⚠️ SECURITY WARNING:**
- **NEVER commit private keys to Git**
- This is for Amoy testnet ONLY
- Generate a new key for mainnet and store in hardware wallet or KMS

### 4.2 Derive Polygon Address

**Step 1: Get wallet address from private key**

```bash
cd adapters/polygon
node
```

```javascript
const { Wallet } = require('ethers');

// Load private key (without 0x prefix)
const privateKey = require('fs').readFileSync(
  process.env.HOME + '/.fanengagement/keys/polygon-amoy-private-key.txt',
  'utf8'
).trim();

// Create wallet
const wallet = new Wallet('0x' + privateKey);

console.log('Wallet Address:', wallet.address);
// Example: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

// Exit Node.js REPL
process.exit();
```

**Step 2: Save address for reference**

```bash
echo "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" > ~/.fanengagement/keys/polygon-amoy-address.txt
```

### 4.3 Fund Amoy Testnet Account

**Step 1: Visit Polygon Faucet**

Go to: **https://faucet.polygon.technology/**

**Step 2: Request test MATIC**

1. Select network: **Polygon Amoy**
2. Enter your wallet address (from previous step)
3. Complete CAPTCHA
4. Click **Submit**
5. Wait 1-2 minutes for transaction confirmation

**Alternative faucets:**
- https://www.alchemy.com/faucets/polygon-amoy
- https://faucet.quicknode.com/polygon/amoy

**Step 3: Verify balance**

```bash
cd adapters/polygon
node
```

```javascript
const { JsonRpcProvider, Wallet } = require('ethers');

// Connect to Amoy RPC
const provider = new JsonRpcProvider('https://rpc-amoy.polygon.technology');

// Load private key
const privateKey = require('fs').readFileSync(
  process.env.HOME + '/.fanengagement/keys/polygon-amoy-private-key.txt',
  'utf8'
).trim();

const wallet = new Wallet('0x' + privateKey, provider);

// Check balance
(async () => {
  const balance = await provider.getBalance(wallet.address);
  const balanceInMatic = Number(balance) / 1e18;
  console.log(`Address: ${wallet.address}`);
  console.log(`Balance: ${balanceInMatic.toFixed(4)} MATIC`);
})();
```

**Expected output:**
```
Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Balance: 0.5000 MATIC
```

**💡 TIP:** Keep at least 0.5 MATIC in your Amoy account for continuous testing.

### 4.4 Configure Polygon Adapter

**Step 1: Navigate to adapter directory**

```bash
cd adapters/polygon
```

**Step 2: Create environment file**

```bash
cp .env.example .env
```

**Step 3: Edit `.env` file**

```bash
# Server Configuration
PORT=3002
LOG_LEVEL=debug
NODE_ENV=development

# Polygon Network Configuration
POLYGON_NETWORK=amoy
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CONFIRMATIONS=6
POLYGON_TX_TIMEOUT=120000

# Authentication
API_KEY=dev-api-key-change-in-production
REQUIRE_AUTH=true

# Private Key (choose one method)
# Method 1: Direct value (without 0x prefix)
POLYGON_PRIVATE_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Method 2: File path (alternative)
# POLYGON_PRIVATE_KEY_PATH=/Users/you/.fanengagement/keys/polygon-amoy-private-key.txt

# Optional: Governance Contract
# GOVERNANCE_CONTRACT_ADDRESS=0x...

# Retry Configuration
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000

# Gas Configuration (optional)
# GAS_LIMIT_MULTIPLIER=1.2
# MAX_FEE_PER_GAS_GWEI=50
# MAX_PRIORITY_FEE_PER_GAS_GWEI=2
```

**⚠️ IMPORTANT:** Update `POLYGON_PRIVATE_KEY` with your actual private key (without 0x prefix).

### 4.5 Start Polygon Adapter

**Option A: Docker Compose (Recommended)**

```bash
# From FanEngagement root directory
docker-compose up -d polygon-adapter

# View logs
docker-compose logs -f polygon-adapter

# Expected log output:
# polygon-adapter | {"timestamp":"2024-12-09T00:00:00.000Z","level":"info","message":"Polygon Adapter starting..."}
# polygon-adapter | {"timestamp":"2024-12-09T00:00:00.100Z","level":"info","message":"Connected to Polygon amoy"}
# polygon-adapter | {"timestamp":"2024-12-09T00:00:00.200Z","level":"info","message":"Server listening on port 3002"}
```

**Option B: Local Node.js**

```bash
cd adapters/polygon

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start adapter
npm run dev  # Development mode with auto-reload

# Or run production build
npm start
```

### 4.6 Verify Polygon Adapter Health

**Step 1: Health check**

```bash
curl http://localhost:3002/v1/adapter/health

# Expected response:
{
  "status": "healthy",
  "blockchain": "polygon",
  "network": "amoy",
  "rpcStatus": "connected",
  "lastBlockNumber": 12345678,
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "walletBalance": "0.5000 MATIC",
  "timestamp": "2024-12-09T00:00:00.000Z"
}
```

**Step 2: Verify wallet address matches**

Compare `walletAddress` in health response with your generated address.

**Step 3: Verify balance is sufficient**

Balance should show at least 0.5 MATIC for testing.

### 4.7 Polygon Smoke Tests

See [Section 6: Smoke Test Suite](#6-smoke-test-suite) for detailed test procedures.

**Quick validation:**

```bash
# Test 1: Create organization
curl -X POST http://localhost:3002/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Test DAO",
    "description": "Smoke test organization"
  }'

# Expected response:
{
  "transactionId": "0x5a3b...",
  "accountAddress": "0x9876...",
  "status": "confirmed",
  "timestamp": "2024-12-09T00:00:00.000Z"
}

# Test 2: Verify transaction on explorer
# Copy transactionId and visit:
# https://amoy.polygonscan.com/tx/<transactionId>
```

---

## 5. Environment Configuration

### 5.1 Solana Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| **Server** ||||
| `PORT` | No | `3001` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |
| `NODE_ENV` | No | `development` | Environment: development, production |
| **Network** ||||
| `SOLANA_NETWORK` | Yes | `devnet` | Network: localnet, devnet, testnet, mainnet-beta |
| `SOLANA_RPC_URL` | Yes | `https://api.devnet.solana.com` | RPC endpoint URL |
| `SOLANA_COMMITMENT` | No | `confirmed` | Commitment: processed, confirmed, finalized |
| `SOLANA_CONFIRM_TIMEOUT` | No | `30000` | Transaction confirmation timeout (ms) |
| **Authentication** ||||
| `API_KEY` | Yes | `dev-api-key-change-in-production` | API key for requests |
| `REQUIRE_AUTH` | No | `true` | Enable authentication (true/false) |
| **Keypair** ||||
| `SOLANA_KEYPAIR_PATH` | Yes* | `~/.fanengagement/keys/solana-devnet-keypair.json` | Path to keypair JSON file |
| `SOLANA_PRIVATE_KEY` | Yes* | `[1,2,3,...]` | Keypair as JSON array (alternative) |
| **Retry** ||||
| `RETRY_MAX_ATTEMPTS` | No | `4` | Maximum retry attempts for failed operations |
| `RETRY_BASE_DELAY_MS` | No | `1000` | Base delay for exponential backoff (ms) |

\* Either `SOLANA_KEYPAIR_PATH` or `SOLANA_PRIVATE_KEY` required.

### 5.2 Polygon Environment Variables

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| **Server** ||||
| `PORT` | No | `3002` | HTTP server port |
| `LOG_LEVEL` | No | `info` | Log level: debug, info, warn, error |
| `NODE_ENV` | No | `development` | Environment: development, production |
| **Network** ||||
| `POLYGON_NETWORK` | Yes | `amoy` | Network: amoy, mumbai (deprecated), polygon |
| `POLYGON_RPC_URL` | Yes | `https://rpc-amoy.polygon.technology` | RPC endpoint URL |
| `POLYGON_CONFIRMATIONS` | No | `6` | Block confirmations to wait |
| `POLYGON_TX_TIMEOUT` | No | `120000` | Transaction timeout (ms) |
| **Authentication** ||||
| `API_KEY` | Yes | `dev-api-key-change-in-production` | API key for requests |
| `REQUIRE_AUTH` | No | `true` | Enable authentication (true/false) |
| **Private Key** ||||
| `POLYGON_PRIVATE_KEY` | Yes* | `a1b2c3d4e5f6...` | Private key (hex, no 0x prefix) |
| `POLYGON_PRIVATE_KEY_PATH` | Yes* | `~/.fanengagement/keys/polygon-amoy-private-key.txt` | Path to private key file |
| **Optional** ||||
| `GOVERNANCE_CONTRACT_ADDRESS` | No | `0x...` | Governance contract address |
| **Retry** ||||
| `RETRY_MAX_ATTEMPTS` | No | `4` | Maximum retry attempts |
| `RETRY_BASE_DELAY_MS` | No | `1000` | Base delay for exponential backoff (ms) |
| **Gas** ||||
| `GAS_LIMIT_MULTIPLIER` | No | `1.2` | Gas limit safety multiplier |
| `MAX_FEE_PER_GAS_GWEI` | No | `50` | Maximum fee per gas (GWEI) |
| `MAX_PRIORITY_FEE_PER_GAS_GWEI` | No | `2` | Maximum priority fee (GWEI) |

\* Either `POLYGON_PRIVATE_KEY` or `POLYGON_PRIVATE_KEY_PATH` required.

### 5.3 Loading Environment Files

**Local Development (.env files):**

```bash
# Adapters automatically load .env from their directory
cd adapters/solana
npm run dev  # Loads .env automatically

cd adapters/polygon
npm run dev  # Loads .env automatically
```

**Docker Compose:**

```bash
# Loads .env from adapter directories
docker-compose up -d solana-adapter polygon-adapter
```

**Kubernetes (ConfigMaps and Secrets):**

```bash
# Create from .env file
kubectl create configmap solana-adapter-config --from-env-file=.env -n fanengagement
kubectl create secret generic solana-adapter-secret --from-env-file=.env -n fanengagement
```

### 5.4 Network-Specific Configurations

**Solana Networks:**

| Network | RPC URL | Use Case | Funding |
|---------|---------|----------|---------|
| **Localnet** | `http://localhost:8899` | Local development with test validator | `solana airdrop` (unlimited) |
| **Devnet** | `https://api.devnet.solana.com` | Integration testing | `solana airdrop` (2 SOL max, rate limited) |
| **Testnet** | `https://api.testnet.solana.com` | Staging/pre-production | `solana airdrop` (limited) |
| **Mainnet** | `https://api.mainnet-beta.solana.com` | Production | Purchase SOL on exchanges |

**Polygon Networks:**

| Network | RPC URL | Chain ID | Use Case | Funding |
|---------|---------|----------|----------|---------|
| **Amoy** | `https://rpc-amoy.polygon.technology` | 80002 | Testing (recommended) | https://faucet.polygon.technology/ |
| **Mumbai** | `https://rpc-mumbai.maticvigil.com` | 80001 | Testing (deprecated) | https://faucet.polygon.technology/ |
| **Polygon** | `https://polygon-rpc.com` | 137 | Production | Purchase MATIC on exchanges |

---

## 6. Smoke Test Suite

### 6.1 Overview

Smoke tests validate core adapter functionality with minimal API calls:

| Test | Purpose | Expected Result |
|------|---------|-----------------|
| **Health Check** | Verify adapter is running and connected | Status: healthy, RPC: connected |
| **Create Organization** | Test organization PDA/account creation | Transaction ID + account address returned |
| **Transaction Lookup** | Query transaction status | Transaction status: confirmed |
| **Explorer Verification** | Verify transaction on blockchain explorer | Transaction visible and confirmed |

### 6.2 Solana Smoke Tests

**Test 1: Health Check**

```bash
curl http://localhost:3001/v1/adapter/health | jq

# ✅ Pass criteria:
# - status: "healthy"
# - blockchain: "solana"
# - network: "devnet"
# - rpcStatus: "connected"
# - lastBlockNumber: > 0
```

**Test 2: Create Organization**

```bash
curl -X POST http://localhost:3001/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "11111111-1111-1111-1111-111111111111",
    "name": "Smoke Test DAO",
    "description": "Organization created for smoke testing"
  }' | jq

# ✅ Pass criteria:
# - transactionId: Base58 string (~88 chars)
# - accountAddress: Base58 string (~44 chars)
# - status: "confirmed"
# - timestamp: ISO 8601 format

# Save transaction ID for next test
export SOLANA_TX_ID="<transactionId from response>"
```

**Test 3: Transaction Lookup**

```bash
curl "http://localhost:3001/v1/adapter/transactions/${SOLANA_TX_ID}" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" | jq

# ✅ Pass criteria:
# - transactionId: Matches $SOLANA_TX_ID
# - status: "confirmed"
# - confirmations: >= 1
# - blockNumber: > 0
# - explorerUrl: Contains explorer.solana.com
```

**Test 4: Explorer Verification**

```bash
# Visit Solana Explorer
echo "https://explorer.solana.com/tx/${SOLANA_TX_ID}?cluster=devnet"

# Manual verification:
# ✅ Transaction found
# ✅ Status: Success (green checkmark)
# ✅ Block number matches adapter response
# ✅ Signature matches transaction ID
```

**Test 5: Create Share Type (Token Mint)**

```bash
curl -X POST http://localhost:3001/v1/adapter/share-types \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "shareTypeId": "22222222-2222-2222-2222-222222222222",
    "organizationId": "11111111-1111-1111-1111-111111111111",
    "name": "Voting Token",
    "symbol": "VOTE",
    "decimals": 0,
    "maxSupply": 1000000
  }' | jq

# ✅ Pass criteria:
# - transactionId: Valid Base58 string
# - mintAddress: Valid Solana address
# - status: "confirmed"
```

### 6.3 Polygon Smoke Tests

**Test 1: Health Check**

```bash
curl http://localhost:3002/v1/adapter/health | jq

# ✅ Pass criteria:
# - status: "healthy"
# - blockchain: "polygon"
# - network: "amoy"
# - rpcStatus: "connected"
# - lastBlockNumber: > 0
# - walletAddress: Valid Ethereum address (0x...)
# - walletBalance: Contains "MATIC"
```

**Test 2: Create Organization**

```bash
curl -X POST http://localhost:3002/v1/adapter/organizations \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "organizationId": "33333333-3333-3333-3333-333333333333",
    "name": "Smoke Test DAO",
    "description": "Organization created for smoke testing"
  }' | jq

# ✅ Pass criteria:
# - transactionId: Hex string starting with 0x (66 chars)
# - accountAddress: Ethereum address starting with 0x (42 chars)
# - status: "confirmed"
# - timestamp: ISO 8601 format

# Save transaction ID for next test
export POLYGON_TX_ID="<transactionId from response>"
```

**Test 3: Transaction Lookup**

```bash
curl "http://localhost:3002/v1/adapter/transactions/${POLYGON_TX_ID}" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" | jq

# ✅ Pass criteria:
# - transactionId: Matches $POLYGON_TX_ID
# - status: "confirmed"
# - confirmations: >= 6
# - blockNumber: > 0
# - explorerUrl: Contains amoy.polygonscan.com
```

**Test 4: Explorer Verification**

```bash
# Visit PolygonScan Amoy
echo "https://amoy.polygonscan.com/tx/${POLYGON_TX_ID}"

# Manual verification:
# ✅ Transaction found
# ✅ Status: Success (green checkmark)
# ✅ Block number matches adapter response
# ✅ Transaction hash matches transaction ID
# ✅ From address matches wallet address from health check
```

**Test 5: Create Share Type (ERC-20 Token)**

```bash
curl -X POST http://localhost:3002/v1/adapter/share-types \
  -H "Content-Type: application/json" \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production" \
  -d '{
    "shareTypeId": "44444444-4444-4444-4444-444444444444",
    "organizationId": "33333333-3333-3333-3333-333333333333",
    "name": "Voting Token",
    "symbol": "VOTE",
    "decimals": 18,
    "maxSupply": 1000000
  }' | jq

# ✅ Pass criteria:
# - transactionId: Valid hex string (0x...)
# - tokenAddress: Valid Ethereum address (0x...)
# - status: "confirmed"
```

### 6.4 Automated Smoke Test Script

Save as `smoke-tests.sh` in repository root:

```bash
#!/bin/bash

set -e  # Exit on error

echo "🔥 Blockchain Adapter Smoke Tests"
echo "=================================="
echo ""

# Configuration
SOLANA_PORT=${SOLANA_PORT:-3001}
POLYGON_PORT=${POLYGON_PORT:-3002}
API_KEY=${API_KEY:-dev-api-key-change-in-production}

# Test Solana
echo "Testing Solana Adapter (port $SOLANA_PORT)..."
SOLANA_HEALTH=$(curl -s http://localhost:$SOLANA_PORT/v1/adapter/health)
SOLANA_STATUS=$(echo $SOLANA_HEALTH | jq -r '.status')

if [ "$SOLANA_STATUS" = "healthy" ]; then
  echo "✅ Solana adapter is healthy"
else
  echo "❌ Solana adapter is not healthy"
  echo $SOLANA_HEALTH | jq
  exit 1
fi

# Test Polygon
echo "Testing Polygon Adapter (port $POLYGON_PORT)..."
POLYGON_HEALTH=$(curl -s http://localhost:$POLYGON_PORT/v1/adapter/health)
POLYGON_STATUS=$(echo $POLYGON_HEALTH | jq -r '.status')

if [ "$POLYGON_STATUS" = "healthy" ]; then
  echo "✅ Polygon adapter is healthy"
else
  echo "❌ Polygon adapter is not healthy"
  echo $POLYGON_HEALTH | jq
  exit 1
fi

echo ""
echo "🎉 All smoke tests passed!"
```

Run the script:

```bash
chmod +x smoke-tests.sh
./smoke-tests.sh
```

---

## 7. CI/CD Testing

### 7.1 Prerequisites for CI/CD

**Required Secrets:**

| Secret Name | Description | Format |
|-------------|-------------|--------|
| `SOLANA_PRIVATE_KEY_DEVNET` | Solana devnet keypair | JSON array: `[1,2,3,...]` |
| `POLYGON_PRIVATE_KEY_AMOY` | Polygon Amoy private key | Hex string (no 0x): `a1b2c3d4...` |
| `ADAPTER_API_KEY_CI` | API key for CI tests | Random string: `ci-test-key-12345` |

**Setup in GitHub Actions:**

1. Go to repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with proper values
4. Save secrets

### 7.2 CI/CD Workflow Components

The CI/CD pipeline (`.github/workflows/blockchain-adapters.yml`) includes:

**Build Stage:**
- Multi-stage Docker builds
- Unit tests run in container
- TypeScript compilation

**Security Stage:**
- Trivy vulnerability scanning
- SARIF report generation
- Failure on CRITICAL/HIGH vulnerabilities

**Test Stage:**
- Health check validation (currently disabled pending credentials)
- Smoke tests (planned)

**Deploy Stage:**
- Push to GitHub Container Registry (ghcr.io)
- Tagged with commit SHA and `latest`

### 7.3 Local CI Simulation

**Test with Docker:**

```bash
# Build with same process as CI
docker build --target test -t solana-adapter:ci ./adapters/solana
docker build --target test -t polygon-adapter:ci ./adapters/polygon

# Run security scan
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image solana-adapter:ci

docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image polygon-adapter:ci
```

**Test health checks:**

```bash
# Start adapters with CI configuration
docker run -d --name solana-ci \
  -e SOLANA_PRIVATE_KEY=$SOLANA_PRIVATE_KEY_DEVNET \
  -e API_KEY=$ADAPTER_API_KEY_CI \
  -p 3001:3001 \
  solana-adapter:ci

# Wait for startup
sleep 10

# Test health
curl http://localhost:3001/v1/adapter/health

# Cleanup
docker stop solana-ci && docker rm solana-ci
```

### 7.4 Manual QA Prerequisites

**Required Resources:**

| Resource | Solana | Polygon |
|----------|--------|---------|
| **Funded Wallet** | ≥ 5 SOL on devnet | ≥ 2 MATIC on Amoy |
| **RPC Endpoint** | Devnet public or dedicated | Amoy public or dedicated |
| **Test Duration** | ~30 minutes for full suite | ~30 minutes for full suite |
| **Rate Limits** | 40 req/10s (public devnet) | 100 req/10s (public Amoy) |

**Rate Limit Considerations:**

- **Public RPC endpoints** have strict rate limits
- **Dedicated RPC providers** (Alchemy, Infura, QuickNode) recommended for continuous testing
- **Add delays** between rapid-fire test requests to avoid 429 errors
- **Exponential backoff** is built into adapters for automatic retry

**Expected Confirmation Times:**

| Network | Average | Maximum |
|---------|---------|---------|
| Solana Devnet | 500ms - 2s | 5s |
| Polygon Amoy | 2s - 5s | 30s |

---

## 8. Troubleshooting Guide

### 8.1 Common Errors - Solana

#### Error: "Insufficient funds for transaction"

**Symptom:**
```
Error: Attempt to debit an account but found no record of a prior credit
```

**Cause:** Keypair has no SOL for transaction fees.

**Solution:**
```bash
# Check balance
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Request airdrop
solana airdrop 2 ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Wait 30 seconds and verify
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com
```

#### Error: "Failed to load Solana keypair"

**Symptom:**
```
Error: Failed to load Solana keypair: ENOENT: no such file or directory
```

**Cause:** `SOLANA_KEYPAIR_PATH` points to non-existent file.

**Solution:**
```bash
# Verify file exists
ls -la ~/.fanengagement/keys/solana-devnet-keypair.json

# Verify path in .env matches
grep SOLANA_KEYPAIR_PATH adapters/solana/.env

# Generate new keypair if lost
solana-keygen new --outfile ~/.fanengagement/keys/solana-devnet-keypair.json --no-bip39-passphrase
```

#### Error: "RPC timeout" or "Network error"

**Symptom:**
```
Error: 504 Gateway Timeout
Error: ECONNREFUSED
```

**Cause:** RPC endpoint unreachable or rate limited.

**Solution:**
```bash
# Test RPC connectivity
curl https://api.devnet.solana.com -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'

# Expected response:
{"jsonrpc":"2.0","result":{"solana-core":"1.18.22"},"id":1}

# If timeout, try alternative RPC:
# - https://api.devnet.solana.com
# - https://rpc.ankr.com/solana_devnet
# - Alchemy/QuickNode dedicated endpoint

# Update .env with working RPC
vim adapters/solana/.env
# SOLANA_RPC_URL=https://rpc.ankr.com/solana_devnet
```

#### Error: "Transaction simulation failed"

**Symptom:**
```
Error: Transaction simulation failed: Blockhash not found
Error: Transaction simulation failed: Invalid account data
```

**Cause:** Recent blockhash expired or invalid transaction.

**Solution:**
- Retry the request (adapter has exponential backoff)
- Check account addresses are valid
- Verify transaction parameters
- Increase `SOLANA_CONFIRM_TIMEOUT` if network is slow

#### Error: Stale keypair format

**Symptom:**
```
Error: Invalid seed phrase
Error: Unable to parse keypair JSON
```

**Cause:** Keypair file uses old format or is corrupted.

**Solution:**
```bash
# Regenerate keypair with current Solana CLI
solana-keygen new --outfile ~/.fanengagement/keys/solana-devnet-keypair.json --no-bip39-passphrase --force

# Fund new keypair
solana airdrop 2 ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com
```

### 8.2 Common Errors - Polygon

#### Error: "Insufficient funds for gas"

**Symptom:**
```
Error: insufficient funds for gas * price + value
```

**Cause:** Wallet has no MATIC for gas fees.

**Solution:**
```bash
# Check balance via adapter health
curl http://localhost:3002/v1/adapter/health | jq '.walletBalance'

# Get MATIC from faucet
# Visit: https://faucet.polygon.technology/
# Select: Polygon Amoy
# Enter: Your wallet address (from health check)
# Wait: 1-2 minutes
# Verify: curl health endpoint again
```

#### Error: "Invalid private key format"

**Symptom:**
```
Error: invalid private key
Error: private key must be 32 bytes
```

**Cause:** Private key has 0x prefix or wrong length.

**Solution:**
```bash
# Private key must be 64 hex characters WITHOUT 0x prefix

# Correct format:
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Incorrect formats:
0xa1b2c3d4...  # Remove 0x prefix
a1b2c3       # Too short (must be 64 chars)

# Update .env:
POLYGON_PRIVATE_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

#### Error: "Nonce too low" or "Nonce too high"

**Symptom:**
```
Error: nonce has already been used
Error: nonce too high. Expected nonce to be X but got Y
```

**Cause:** Transaction nonce out of sync.

**Solution:**
```bash
# Option 1: Wait for pending transactions to confirm
sleep 60

# Option 2: Restart adapter to reset nonce tracking
docker-compose restart polygon-adapter

# Option 3: Check pending transactions on explorer
# https://amoy.polygonscan.com/address/<your-wallet-address>
```

#### Error: "Gas estimation failed"

**Symptom:**
```
Error: cannot estimate gas; transaction may fail or may require manual gas limit
```

**Cause:** Transaction will fail on-chain (invalid params or insufficient balance).

**Solution:**
```bash
# Check wallet balance
curl http://localhost:3002/v1/adapter/health | jq '.walletBalance'

# Verify recipient address is valid
# Check transaction parameters (UUID format, etc.)
# Review adapter logs for detailed error

docker-compose logs polygon-adapter | tail -50
```

#### Error: "RPC throttled" (429)

**Symptom:**
```
Error: Too Many Requests (429)
Error: Rate limit exceeded
```

**Cause:** Public RPC endpoint rate limit reached.

**Solution:**
```bash
# Option 1: Use dedicated RPC provider
# Sign up: https://www.alchemy.com/ or https://infura.io/
# Get API key
# Update .env:
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR-API-KEY

# Option 2: Add delay between requests
sleep 2  # Wait 2 seconds between smoke tests

# Option 3: Try alternative public RPC
POLYGON_RPC_URL=https://rpc.ankr.com/polygon_amoy
```

### 8.3 Docker and Container Issues

#### Error: "Cannot connect to Docker daemon"

**Symptom:**
```
ERROR: Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Solution:**
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker

# Verify Docker is running
docker ps
```

#### Error: "Port already in use"

**Symptom:**
```
Error: bind: address already in use
```

**Solution:**
```bash
# Find process using port
lsof -i :3001  # For Solana
lsof -i :3002  # For Polygon

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3011  # For Solana
PORT=3012  # For Polygon
```

#### Error: "Container exits immediately"

**Symptom:**
Container starts but exits within seconds.

**Solution:**
```bash
# View container logs
docker-compose logs solana-adapter
docker-compose logs polygon-adapter

# Common causes:
# - Missing environment variables
# - Invalid keypair/private key
# - Invalid RPC URL

# Check environment variables are set
docker-compose config
```

### 8.4 API Request Issues

#### Error: "401 Unauthorized"

**Symptom:**
```json
{
  "type": "https://fanengagement.io/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Missing or invalid API key"
}
```

**Solution:**
```bash
# Ensure API key header is included
curl http://localhost:3001/v1/adapter/health \
  -H "X-Adapter-API-Key: dev-api-key-change-in-production"

# Or use Authorization header
curl http://localhost:3001/v1/adapter/health \
  -H "Authorization: Bearer dev-api-key-change-in-production"

# Verify API_KEY in .env matches request header
grep API_KEY adapters/solana/.env
```

#### Error: "400 Bad Request"

**Symptom:**
```json
{
  "type": "https://fanengagement.io/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "organizationId must be a valid UUID"
}
```

**Solution:**
- Check request body matches OpenAPI schema
- Verify UUIDs are valid format (8-4-4-4-12)
- Ensure required fields are present
- Check Content-Type header is `application/json`

### 8.5 Getting Help

**Resources:**

| Issue Type | Resource | Link |
|------------|----------|------|
| **Solana RPC** | Solana Status | https://status.solana.com/ |
| **Polygon RPC** | Polygon Status | https://status.polygon.technology/ |
| **Adapter Logs** | Docker logs | `docker-compose logs -f <service>` |
| **Blockchain Explorer** | Solana | https://explorer.solana.com/?cluster=devnet |
| **Blockchain Explorer** | Polygon | https://amoy.polygonscan.com/ |
| **Faucets** | Solana | Built into Solana CLI (`solana airdrop`) |
| **Faucets** | Polygon | https://faucet.polygon.technology/ |

---

## 9. Security Best Practices

### 9.1 Wallet Separation

**NEVER mix test and production credentials!**

| Environment | Wallet Usage | Storage |
|-------------|--------------|---------|
| **Local Dev** | Generate new keypair/key per developer | Local filesystem (excluded from Git) |
| **CI/CD** | Dedicated test wallet | GitHub Secrets |
| **Staging** | Separate staging wallet | Kubernetes Secrets / KMS |
| **Production** | Production wallet with hardware backup | Cloud KMS (AWS/Azure/GCP) or Hardware Security Module |

### 9.2 Key Storage Rules

**DO:**
- ✅ Store keys outside repository (e.g., `~/.fanengagement/keys/`)
- ✅ Use environment variables or secure secret management
- ✅ Add key files to `.gitignore`
- ✅ Rotate keys regularly
- ✅ Use hardware wallets for mainnet
- ✅ Encrypt key backups

**DON'T:**
- ❌ Commit keys to Git (even in private repos)
- ❌ Share keys via email, Slack, or screenshots
- ❌ Store keys in plain text on shared drives
- ❌ Reuse faucet-funded keys in production
- ❌ Leave keys in terminal history

### 9.3 Funding Safety

**Devnet/Testnet Wallets:**
- Only use testnet/devnet tokens (no real value)
- Faucets provide free test tokens
- Safe to share public addresses for funding

**Mainnet Wallets:**
- **NEVER** request real tokens in public channels
- Use secure purchase methods (exchanges)
- Start with small amounts for testing
- Verify recipient address multiple times before large transfers

### 9.4 Access Control

**API Keys:**
- Generate unique keys per environment
- Rotate keys on schedule (quarterly recommended)
- Revoke keys immediately if compromised
- Use least-privilege principle

**Private Keys:**
- Limit access to absolute minimum personnel
- Use separate keys for different applications
- Implement multi-signature for high-value operations

### 9.5 Monitoring and Auditing

**Track:**
- Wallet balances (alert on low balance or unexpected depletion)
- Transaction patterns (alert on unusual activity)
- Failed authentication attempts
- Key rotation dates

**Tools:**
- Prometheus metrics from adapters
- Blockchain explorer notifications
- Cloud KMS audit logs

---

## 10. Quick Reference

### 10.1 Command Cheat Sheet

**Solana:**

```bash
# Generate keypair
solana-keygen new --outfile ~/.fanengagement/keys/solana-devnet-keypair.json --no-bip39-passphrase

# View public key
solana-keygen pubkey ~/.fanengagement/keys/solana-devnet-keypair.json

# Configure network
solana config set --url https://api.devnet.solana.com

# Check balance
solana balance ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Request airdrop
solana airdrop 2 ~/.fanengagement/keys/solana-devnet-keypair.json --url https://api.devnet.solana.com

# Health check
curl http://localhost:3001/v1/adapter/health
```

**Polygon:**

```bash
# Generate private key
openssl rand -hex 32 > ~/.fanengagement/keys/polygon-amoy-private-key.txt

# Derive address (Node.js)
node -e "const {Wallet}=require('ethers'); const pk=require('fs').readFileSync(process.env.HOME+'/.fanengagement/keys/polygon-amoy-private-key.txt','utf8').trim(); console.log(new Wallet('0x'+pk).address);"

# Check balance (Node.js)
node -e "const {JsonRpcProvider,Wallet}=require('ethers'); const provider=new JsonRpcProvider('https://rpc-amoy.polygon.technology'); const pk=require('fs').readFileSync(process.env.HOME+'/.fanengagement/keys/polygon-amoy-private-key.txt','utf8').trim(); (async()=>{const w=new Wallet('0x'+pk,provider); const b=await provider.getBalance(w.address); console.log(w.address+': '+(Number(b)/1e18).toFixed(4)+' MATIC');})();"

# Get faucet MATIC
# Visit: https://faucet.polygon.technology/

# Health check
curl http://localhost:3002/v1/adapter/health
```

**Docker:**

```bash
# Start adapters
docker-compose up -d solana-adapter polygon-adapter

# View logs
docker-compose logs -f solana-adapter
docker-compose logs -f polygon-adapter

# Restart adapters
docker-compose restart solana-adapter polygon-adapter

# Stop adapters
docker-compose down
```

### 10.2 Useful URLs

**Faucets:**
- Solana Devnet: Built into CLI (`solana airdrop`)
- Polygon Amoy: https://faucet.polygon.technology/
- Polygon Amoy (Alchemy): https://www.alchemy.com/faucets/polygon-amoy

**Explorers:**
- Solana Devnet: https://explorer.solana.com/?cluster=devnet
- Solana Testnet: https://explorer.solana.com/?cluster=testnet
- Polygon Amoy: https://amoy.polygonscan.com/
- Mumbai (deprecated): https://mumbai.polygonscan.com/

**RPC Endpoints:**
- Solana Devnet: https://api.devnet.solana.com
- Solana Testnet: https://api.testnet.solana.com
- Polygon Amoy: https://rpc-amoy.polygon.technology
- Alternative Amoy: https://rpc.ankr.com/polygon_amoy

**Documentation:**
- Solana: https://docs.solana.com/
- Polygon: https://docs.polygon.technology/
- ethers.js: https://docs.ethers.org/

### 10.3 Environment Templates

**Solana `.env` template:**

```bash
# Server
PORT=3001
LOG_LEVEL=info
NODE_ENV=development

# Network
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_COMMITMENT=confirmed
SOLANA_CONFIRM_TIMEOUT=30000

# Auth
API_KEY=dev-api-key-change-in-production
REQUIRE_AUTH=true

# Keypair
SOLANA_KEYPAIR_PATH=/Users/you/.fanengagement/keys/solana-devnet-keypair.json

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000
```

**Polygon `.env` template:**

```bash
# Server
PORT=3002
LOG_LEVEL=info
NODE_ENV=development

# Network
POLYGON_NETWORK=amoy
POLYGON_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_CONFIRMATIONS=6
POLYGON_TX_TIMEOUT=120000

# Auth
API_KEY=dev-api-key-change-in-production
REQUIRE_AUTH=true

# Private Key (hex, no 0x prefix)
POLYGON_PRIVATE_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456

# Retry
RETRY_MAX_ATTEMPTS=4
RETRY_BASE_DELAY_MS=1000
```

### 10.4 Smoke Test Checklist

**Solana:**
- [ ] Keypair generated and saved
- [ ] Account funded with ≥ 2 SOL on devnet
- [ ] `.env` configured with correct keypair path
- [ ] Adapter started (Docker or local)
- [ ] Health check returns `status: "healthy"`
- [ ] Create organization succeeds
- [ ] Transaction appears on Solana Explorer
- [ ] Transaction lookup returns confirmed status

**Polygon:**
- [ ] Private key generated and saved
- [ ] Wallet address derived
- [ ] Account funded with ≥ 0.5 MATIC on Amoy
- [ ] `.env` configured with correct private key
- [ ] Adapter started (Docker or local)
- [ ] Health check returns `status: "healthy"` with balance
- [ ] Create organization succeeds
- [ ] Transaction appears on PolygonScan Amoy
- [ ] Transaction lookup returns confirmed status

---

## Appendices

### Appendix A: Troubleshooting Decision Tree

```
Issue: Transaction fails
├─ Error: "insufficient funds"
│  └─ Solution: Fund wallet (see section 3.3 or 4.3)
├─ Error: "nonce too low/high"
│  └─ Solution: Restart adapter or wait for pending txs
├─ Error: "timeout" or "RPC error"
│  └─ Solution: Try alternative RPC endpoint
└─ Other error
   └─ Solution: Check adapter logs, review section 8

Issue: Adapter won't start
├─ Error: "cannot find keypair/key"
│  └─ Solution: Check file path in .env
├─ Error: "port in use"
│  └─ Solution: Kill process or change PORT
├─ Error: "Docker daemon not running"
│  └─ Solution: Start Docker
└─ Other error
   └─ Solution: Review adapter logs, check environment variables

Issue: Health check fails
├─ Status: "unhealthy"
│  └─ Solution: Check RPC connectivity, review logs
├─ HTTP: 401 Unauthorized
│  └─ Solution: Check API_KEY header
├─ HTTP: Connection refused
│  └─ Solution: Verify adapter is running, check port
└─ Other error
   └─ Solution: Review section 8.4
```

### Appendix B: Rate Limits

**Solana Devnet (Public RPC):**
- 40 requests per 10 seconds
- Airdrop: 2 SOL per request, ~1 request per 30 seconds per IP

**Polygon Amoy (Public RPC):**
- ~100 requests per 10 seconds (varies by provider)
- Faucet: 0.5 MATIC per request, 1 request per 24 hours per address

**Dedicated RPC Providers:**
- Alchemy Free Tier: 300M compute units/month
- Infura Free Tier: 100k requests/day
- QuickNode: Varies by plan

### Appendix C: Related Documentation

- [Adapter Testing Strategy](./adapter-testing.md) - Comprehensive testing guide
- [Adapter Platform Architecture](./adapter-platform-architecture.md) - System design
- [Solana Adapter Deployment](./solana/solana-adapter-deployment.md) - Deployment guide
- [Polygon Adapter Deployment](./polygon/polygon-adapter-deployment.md) - Deployment guide
- [Adapter CI/CD](./adapter-cicd.md) - Continuous integration
- [Solana Adapter README](../../adapters/solana/README.md) - Quick start
- [Polygon Adapter README](../../adapters/polygon/README.md) - Quick start

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-09 | Documentation Specialist | Initial playbook created |

---

**End of Playbook**

**Questions or Issues?**  
Contact: FanEngagement Platform Team  
Repository: https://github.com/bscoggins/FanEngagement
