# Multi-Chain Blockchain Adapter Platform Architecture

> **Document Type:** Architecture Specification  
> **Epic:** E-007 - Blockchain Adapter Platform — Dockerized API for Multi-Chain Support  
> **Status:** Proposed  
> **Last Updated:** December 2024

## Executive Summary

This document defines the architecture for FanEngagement's multi-chain blockchain adapter platform—a modular system that enables organizations to choose their preferred blockchain network while maintaining a consistent API interface across all supported chains.

**Key Architectural Decisions:**

1. **Isolation via Containers:** Each blockchain (Solana, Polygon, future chains) runs in an isolated Docker container with independent lifecycle, deployment, and scaling
2. **Consistent API Contract:** All blockchain adapters implement the same OpenAPI 3.0 specification, ensuring uniform interfaces for backend integration
3. **Organization Choice:** Organizations select their blockchain type in configuration (`None`, `Solana`, `Polygon`); backend routes requests to appropriate adapter
4. **Graceful Degradation:** Adapter failures are handled via circuit breakers and fallback mechanisms without impacting the main application
5. **Backward Compatibility:** Existing organizations without blockchain configuration continue working unchanged (`BlockchainType.None`)

**Strategic Benefits:**

- **No Vendor Lock-in:** Organizations can select any supported blockchain; new chains added without backend refactoring
- **Independent Scaling:** High-volume organizations scale their blockchain adapter independently of the main application
- **Simplified Testing:** Consistent adapter interface enables easy mocking and contract testing
- **Operational Resilience:** Blockchain network issues isolated from core governance functionality
- **Future-Proof:** Platform prepared for emerging blockchain technologies

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Adapter Container Architecture](#2-adapter-container-architecture)
3. [API Contract Specification](#3-api-contract-specification)
4. [Database Schema Changes](#4-database-schema-changes)
5. [Backend Integration](#5-backend-integration)
6. [Failure Handling Patterns](#6-failure-handling-patterns)
7. [Security Model](#7-security-model)
8. [Deployment Models](#8-deployment-models)
9. [Monitoring and Logging](#9-monitoring-and-logging)
10. [Service Discovery and Routing](#10-service-discovery-and-routing)
11. [API Versioning Strategy](#11-api-versioning-strategy)
12. [Operational Considerations](#12-operational-considerations)
13. [Migration from E-004](#13-migration-from-e-004)
14. [Open Questions and Future Enhancements](#14-open-questions-and-future-enhancements)
15. [References](#15-references)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        FanEngagement Backend API                             │
│                   (.NET 9, PostgreSQL, JWT Authentication)                   │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  Application Layer (Services)                                          │  │
│  │  - OrganizationService, ProposalService, ShareTypeService              │  │
│  │  - VotingService, WebhookService                                       │  │
│  └────────────────────────────┬───────────────────────────────────────────┘  │
│                               │                                              │
│  ┌────────────────────────────▼───────────────────────────────────────────┐  │
│  │  IBlockchainAdapterFactory (Infrastructure Layer)                      │  │
│  │  - Routes requests based on Organization.BlockchainType                │  │
│  │  - Returns: ISolanaAdapter, IPolygonAdapter, or INullAdapter           │  │
│  └────────────────────────────┬───────────────────────────────────────────┘  │
│                               │                                              │
│         ┌─────────────────────┼─────────────────────┐                        │
│         │                     │                     │                        │
│    ┌────▼────────┐    ┌──────▼─────────┐    ┌─────▼─────────┐              │
│    │ Solana      │    │ Polygon        │    │ Null          │              │
│    │ Adapter     │    │ Adapter        │    │ Adapter       │              │
│    │ HTTP Client │    │ HTTP Client    │    │ (No-op)       │              │
│    └────┬────────┘    └──────┬─────────┘    └───────────────┘              │
└─────────┼────────────────────┼────────────────────────────────────────────────┘
          │                    │
          │ HTTP REST          │ HTTP REST
          │ (OpenAPI 3.0)      │ (OpenAPI 3.0)
          │                    │
    ┌─────▼──────────┐   ┌─────▼──────────┐
    │  Solana        │   │  Polygon       │
    │  Adapter       │   │  Adapter       │
    │  Container     │   │  Container     │
    │  (Docker)      │   │  (Docker)      │
    │                │   │                │
    │ - REST API     │   │ - REST API     │
    │ - Health Check │   │ - Health Check │
    │ - Metrics      │   │ - Metrics      │
    │ - Logging      │   │ - Logging      │
    └─────┬──────────┘   └─────┬──────────┘
          │                    │
          │ Web3 RPC           │ JSON-RPC
          │                    │
    ┌─────▼──────────┐   ┌─────▼──────────┐
    │  Solana        │   │  Polygon       │
    │  Network       │   │  Network       │
    │  (Mainnet/     │   │  (Mainnet/     │
    │   Devnet)      │   │   Mumbai)      │
    └────────────────┘   └────────────────┘
```

### 1.2 Component Responsibilities

**FanEngagement Backend API:**
- Manages all governance operations (proposals, votes, share types, organizations)
- Stores authoritative data in PostgreSQL database
- Determines which blockchain adapter to use based on organization configuration
- Handles business logic, authorization, validation, and user workflows
- Maintains consistent state even when blockchain adapters are unavailable

**IBlockchainAdapterFactory:**
- Factory pattern implementation for adapter routing
- Reads `Organization.BlockchainType` from database
- Returns appropriate adapter client implementation
- Caches adapter clients to avoid repeated instantiation
- Provides null adapter for organizations without blockchain integration

**Blockchain Adapter Containers (Solana, Polygon, etc.):**
- Isolated Docker containers per blockchain type
- Expose consistent HTTP REST API defined by OpenAPI contract
- Handle all blockchain-specific RPC interactions
- Manage blockchain keypairs and signing operations
- Implement retry logic, timeout handling, and error recovery
- Provide health checks and metrics for monitoring
- Stateless design (no local database or persistent state)

**Blockchain Networks:**
- External networks (Solana mainnet/devnet, Polygon mainnet/Mumbai testnet)
- Adapters communicate with networks via standard RPC protocols
- FanEngagement backend never directly communicates with blockchain networks

### 1.3 Data Flow Example: Creating a Proposal

```
User → POST /organizations/{orgId}/proposals
     → ProposalService.CreateProposalAsync()
     → Database: INSERT INTO Proposals (...)
     → IBlockchainAdapterFactory.GetAdapter(organizationId)
        ├─ If BlockchainType == Solana → ISolanaAdapter
        ├─ If BlockchainType == Polygon → IPolygonAdapter
        └─ If BlockchainType == None → INullAdapter (no-op)
     → adapter.CreateProposalAsync(proposalData)
        → HTTP POST to adapter container: /v1/adapter/proposals
           → Adapter builds blockchain transaction
           → Adapter signs with managed keypair
           → Adapter submits to blockchain network
           → Adapter waits for confirmation
           → Returns: { transactionId, blockHeight, status }
     → Database: UPDATE Proposals SET BlockchainTransactionId = ...
     → Return proposal to user
```

**Key Points:**
1. Database write happens **before** blockchain operation (ensures data persistence)
2. Blockchain operation is **asynchronous and best-effort** (failure doesn't block user)
3. Transaction ID is stored in database for future verification
4. If adapter fails, circuit breaker prevents repeated failures

---

## 2. Adapter Container Architecture

### 2.1 Container Design Principles

All blockchain adapter containers follow these principles:

**Stateless:**
- No local database or file storage
- All state managed by FanEngagement backend
- Containers can be destroyed and recreated without data loss
- Enables horizontal scaling and rolling deployments

**Isolated:**
- One container per blockchain type
- Independent lifecycle (deploy Solana adapter without touching Polygon adapter)
- Separate resource limits (CPU, memory, network)
- Failure in one adapter does not affect others

**Consistent Interface:**
- All adapters implement identical OpenAPI 3.0 specification
- Same endpoints, same request/response schemas
- Authentication, error handling, and monitoring follow same patterns
- Backend code is blockchain-agnostic (uses IBlockchainAdapter interface)

**Observable:**
- Health check endpoint (`/health`) for liveness probes
- Metrics endpoint (`/metrics`) for Prometheus scraping
- Structured logging (JSON format) to stdout/stderr
- Correlation IDs propagated from backend requests

### 2.2 Adapter Container Components

Each adapter container includes:

```
┌─────────────────────────────────────────────────────┐
│           Blockchain Adapter Container              │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  REST API Server (Express/ASP.NET)            │ │
│  │  - POST /v1/adapter/organizations             │ │
│  │  - POST /v1/adapter/share-types               │ │
│  │  - POST /v1/adapter/proposals                 │ │
│  │  - GET /v1/adapter/transactions/:id           │ │
│  │  - GET /health, /metrics                      │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                               │
│  ┌─────────────────▼─────────────────────────────┐ │
│  │  Blockchain Client (Web3.js/Solnet/Ethers)   │ │
│  │  - RPC connection pooling                     │ │
│  │  - Transaction building                       │ │
│  │  - Signature generation                       │ │
│  │  - Confirmation tracking                      │ │
│  └─────────────────┬─────────────────────────────┘ │
│                    │                               │
│  ┌─────────────────▼─────────────────────────────┐ │
│  │  Retry & Circuit Breaker (Polly/p-retry)     │ │
│  │  - Exponential backoff                        │ │
│  │  - Max retries: 3                             │ │
│  │  - Circuit breaker after 5 failures           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Key Management Service                       │ │
│  │  - Keypair loading from secrets               │ │
│  │  - Signing operations                         │ │
│  │  - Key rotation support                       │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │  Logging & Metrics                            │ │
│  │  - Structured JSON logging                    │ │
│  │  - Prometheus metrics export                  │ │
│  │  - Request tracing                            │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 2.3 Health Checks

Each adapter provides `/health` endpoint:

```http
GET /health
Response: 200 OK
{
  "status": "healthy",
  "blockchain": "solana",
  "checks": {
    "rpc_connection": "healthy",
    "keypair_loaded": "healthy",
    "last_transaction": "2024-12-03T04:00:00Z"
  },
  "version": "1.0.0"
}
```

**Health Check Criteria:**
- **healthy:** Adapter can communicate with blockchain RPC
- **degraded:** Adapter operational but RPC experiencing high latency or rate limiting
- **unhealthy:** Cannot connect to RPC or keypair not loaded

**Kubernetes Integration:**
- Liveness probe: `HTTP GET /health` (failure triggers container restart)
- Readiness probe: `HTTP GET /health` (failure removes from service endpoints)
- Startup probe: `HTTP GET /health` (allows slow container initialization)

### 2.4 Metrics Export

Each adapter provides `/metrics` endpoint in Prometheus format:

```prometheus
# HELP adapter_transactions_total Total number of blockchain transactions submitted
# TYPE adapter_transactions_total counter
adapter_transactions_total{blockchain="solana",operation="create_proposal",status="success"} 142
adapter_transactions_total{blockchain="solana",operation="create_proposal",status="failure"} 3

# HELP adapter_transaction_duration_seconds Transaction processing duration
# TYPE adapter_transaction_duration_seconds histogram
adapter_transaction_duration_seconds_bucket{blockchain="solana",operation="create_proposal",le="0.5"} 45
adapter_transaction_duration_seconds_bucket{blockchain="solana",operation="create_proposal",le="1.0"} 120
adapter_transaction_duration_seconds_bucket{blockchain="solana",operation="create_proposal",le="2.0"} 140

# HELP adapter_rpc_errors_total Total RPC errors encountered
# TYPE adapter_rpc_errors_total counter
adapter_rpc_errors_total{blockchain="solana",error_type="timeout"} 12
adapter_rpc_errors_total{blockchain="solana",error_type="rate_limit"} 5
```

---

## 3. API Contract Specification

### 3.1 OpenAPI Contract Overview

All blockchain adapters implement a standardized OpenAPI 3.0 contract that defines:

- **Base Path:** `/v1/adapter` (versioned for future compatibility)
- **Authentication:** API Key via `X-API-Key` header (or JWT, depending on deployment)
- **Content Type:** `application/json`
- **Error Format:** RFC 7807 Problem Details
- **Idempotency:** All operations accept optional `idempotency-key` header

**Contract Principles:**
1. **Blockchain Agnostic:** Request/response schemas do not expose blockchain-specific details (e.g., no Solana-specific fields)
2. **Extensible:** Custom metadata fields allow blockchain-specific information without breaking contract
3. **Versioned:** `/v1/` prefix allows future v2, v3 without breaking existing clients
4. **Consistent Errors:** All adapters return same error structure for common failure scenarios

### 3.2 Core Endpoints

All blockchain adapters **must** implement these endpoints:

#### 3.2.1 Create Organization On-Chain

```http
POST /v1/adapter/organizations
```

**Purpose:** Create an on-chain representation of a FanEngagement organization.

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Manchester United Supporters Club",
  "metadata": {
    "createdAt": "2024-12-03T04:00:00Z",
    "blockchainConfig": {}
  },
  "idempotencyKey": "org-create-3fa85f64"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "5wHu...3xKj",
  "blockHeight": 245832190,
  "accountAddress": "Fg7...9Km",
  "status": "confirmed",
  "confirmedAt": "2024-12-03T04:00:05Z",
  "networkFee": "0.000005"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid request parameters
- `409 Conflict` - Organization already exists on-chain (idempotency check)
- `503 Service Unavailable` - Blockchain network unavailable

#### 3.2.2 Create Share Type Token Mint

```http
POST /v1/adapter/share-types
```

**Purpose:** Create a token mint representing a ShareType (e.g., SPL token on Solana, ERC-20 on Polygon).

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "shareTypeId": "7c91d8a9-4f23-4e6a-9b12-8f4e5c3d2a1b",
  "name": "Gold Membership Shares",
  "symbol": "MUSC-GOLD",
  "decimals": 0,
  "maxSupply": 10000,
  "metadata": {
    "description": "Premium membership with full voting rights",
    "votingWeight": 10.0
  },
  "idempotencyKey": "sharetype-create-7c91d8a9"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "3nZ9...7mPq",
  "blockHeight": 245832195,
  "mintAddress": "HgK...4Tn",
  "status": "confirmed",
  "confirmedAt": "2024-12-03T04:00:10Z",
  "networkFee": "0.000005"
}
```

#### 3.2.3 Record Share Issuance

```http
POST /v1/adapter/share-issuances
```

**Purpose:** Record issuance of shares to a user (mint tokens to user's account).

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "shareTypeId": "7c91d8a9-4f23-4e6a-9b12-8f4e5c3d2a1b",
  "userId": "9e8d7c6b-5a4f-3e2d-1c0b-9a8f7e6d5c4b",
  "quantity": 100,
  "metadata": {
    "issuedAt": "2024-12-03T04:00:00Z",
    "reason": "Initial allocation"
  },
  "idempotencyKey": "issuance-9e8d7c6b-7c91d8a9-1"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "8pQr...2sWv",
  "blockHeight": 245832200,
  "recipientAddress": "Abc...9Yz",
  "status": "confirmed",
  "confirmedAt": "2024-12-03T04:00:12Z",
  "networkFee": "0.000005"
}
```

#### 3.2.4 Create Proposal On-Chain

```http
POST /v1/adapter/proposals
```

**Purpose:** Record proposal creation on-chain (or create PDA for proposal).

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "proposalId": "c5d4e3f2-1a0b-9c8d-7e6f-5a4b3c2d1e0f",
  "title": "Vote on New Kit Design",
  "contentHash": "QmX...abc123",
  "startAt": "2024-12-03T10:00:00Z",
  "endAt": "2024-12-10T10:00:00Z",
  "metadata": {
    "quorumRequirement": 50.0,
    "eligibleVotingPower": 15000.0
  },
  "idempotencyKey": "proposal-create-c5d4e3f2"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "6mNp...1qRu",
  "blockHeight": 245832205,
  "proposalAddress": "Pqr...8Lm",
  "status": "confirmed",
  "confirmedAt": "2024-12-03T04:00:15Z",
  "networkFee": "0.000005"
}
```

#### 3.2.5 Record Vote On-Chain

```http
POST /v1/adapter/votes
```

**Purpose:** Record a user's vote on-chain (optional MVP feature - can start with off-chain votes).

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "proposalId": "c5d4e3f2-1a0b-9c8d-7e6f-5a4b3c2d1e0f",
  "userId": "9e8d7c6b-5a4f-3e2d-1c0b-9a8f7e6d5c4b",
  "optionId": "option-1",
  "votingPower": 1000.0,
  "metadata": {
    "votedAt": "2024-12-05T15:30:00Z"
  },
  "idempotencyKey": "vote-9e8d7c6b-c5d4e3f2-1"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "4kLm...9pNo",
  "blockHeight": 245900100,
  "voteRecordAddress": "Vte...3Qw",
  "status": "confirmed",
  "confirmedAt": "2024-12-05T15:30:05Z",
  "networkFee": "0.000005"
}
```

**Note:** For MVP, this endpoint may return `501 Not Implemented` if on-chain voting is deferred.

#### 3.2.6 Commit Proposal Results On-Chain

```http
POST /v1/adapter/proposal-results
```

**Purpose:** Commit cryptographic hash of proposal results to blockchain for immutability and verification.

**Request:**
```json
{
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "proposalId": "c5d4e3f2-1a0b-9c8d-7e6f-5a4b3c2d1e0f",
  "resultsHash": "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  "winningOptionId": "option-2",
  "totalVotesCast": 12500.0,
  "quorumMet": true,
  "closedAt": "2024-12-10T10:00:00Z",
  "metadata": {
    "optionResults": [
      {"optionId": "option-1", "votes": 4500},
      {"optionId": "option-2", "votes": 8000}
    ]
  },
  "idempotencyKey": "results-c5d4e3f2"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "9xYz...5wVu",
  "blockHeight": 246010250,
  "status": "confirmed",
  "confirmedAt": "2024-12-10T10:00:05Z",
  "networkFee": "0.000005"
}
```

#### 3.2.7 Query Transaction Status

```http
GET /v1/adapter/transactions/{transactionId}
```

**Purpose:** Check status of a previously submitted blockchain transaction.

**Response (200 OK):**
```json
{
  "transactionId": "9xYz...5wVu",
  "status": "confirmed",
  "blockHeight": 246010250,
  "confirmations": 32,
  "confirmedAt": "2024-12-10T10:00:05Z",
  "networkFee": "0.000005",
  "error": null
}
```

**Possible Status Values:**
- `pending` - Transaction submitted, awaiting confirmation
- `confirmed` - Transaction confirmed on-chain
- `failed` - Transaction failed (e.g., insufficient funds, invalid operation)
- `unknown` - Transaction not found (may have been dropped)

#### 3.2.8 Health Check

```http
GET /health
```

**Purpose:** Container health check for orchestration platforms.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "blockchain": "solana",
  "checks": {
    "rpc_connection": "healthy",
    "keypair_loaded": "healthy",
    "last_transaction": "2024-12-03T04:00:00Z"
  },
  "version": "1.0.0"
}
```

#### 3.2.9 Metrics Export

```http
GET /metrics
```

**Purpose:** Prometheus metrics scraping endpoint.

**Response (200 OK, text/plain):**
```prometheus
# Prometheus metrics format (see Section 2.4)
```

### 3.3 Standard Error Responses

All adapters return RFC 7807 Problem Details for errors:

**400 Bad Request - Invalid Parameters:**
```json
{
  "type": "https://fanengagement.io/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "Missing required field: organizationId",
  "instance": "/v1/adapter/proposals"
}
```

**409 Conflict - Duplicate Operation:**
```json
{
  "type": "https://fanengagement.io/errors/duplicate-operation",
  "title": "Operation Already Completed",
  "status": 409,
  "detail": "Proposal c5d4e3f2 already exists on-chain",
  "instance": "/v1/adapter/proposals",
  "existingTransactionId": "6mNp...1qRu"
}
```

**503 Service Unavailable - Blockchain Network Unavailable:**
```json
{
  "type": "https://fanengagement.io/errors/blockchain-unavailable",
  "title": "Blockchain Network Unavailable",
  "status": 503,
  "detail": "Solana RPC endpoint is currently unavailable. Transaction queued for retry.",
  "instance": "/v1/adapter/proposals",
  "retryAfter": 30
}
```

---

## 4. Database Schema Changes

### 4.1 Organization Blockchain Configuration

Add new columns to the `Organizations` table:

```sql
ALTER TABLE Organizations
ADD COLUMN BlockchainType VARCHAR(50) DEFAULT 'None' NOT NULL,
ADD COLUMN BlockchainConfig JSONB DEFAULT '{}' NOT NULL;

CREATE INDEX idx_organizations_blockchain_type 
ON Organizations(BlockchainType);
```

**BlockchainType Enum Values:**
- `None` - No blockchain integration (default, backward compatible)
- `Solana` - Use Solana adapter
- `Polygon` - Use Polygon adapter
- Future values: `Ethereum`, `Avalanche`, etc.

**BlockchainConfig JSON Structure:**
```json
{
  "adapterEndpoint": "http://solana-adapter:8080",
  "network": "mainnet",
  "rpcEndpoint": "https://api.mainnet-beta.solana.com",
  "explorerBaseUrl": "https://explorer.solana.com",
  "customConfig": {
    "priorityFee": 0.000001
  }
}
```

### 4.2 Blockchain Transaction References

Add columns to store blockchain transaction IDs for audit trail:

**ShareTypes Table:**
```sql
ALTER TABLE ShareTypes
ADD COLUMN BlockchainMintAddress VARCHAR(255),
ADD COLUMN BlockchainMintTransactionId VARCHAR(255),
ADD COLUMN BlockchainMintedAt TIMESTAMP;

CREATE INDEX idx_sharetypes_blockchain_mint 
ON ShareTypes(BlockchainMintAddress);
```

**ShareIssuances Table:**
```sql
ALTER TABLE ShareIssuances
ADD COLUMN BlockchainTransactionId VARCHAR(255),
ADD COLUMN BlockchainConfirmedAt TIMESTAMP;

CREATE INDEX idx_shareissuances_blockchain_tx 
ON ShareIssuances(BlockchainTransactionId);
```

**Proposals Table:**
```sql
ALTER TABLE Proposals
ADD COLUMN BlockchainProposalAddress VARCHAR(255),
ADD COLUMN BlockchainCreateTransactionId VARCHAR(255),
ADD COLUMN BlockchainResultsTransactionId VARCHAR(255),
ADD COLUMN BlockchainResultsHash VARCHAR(128);

CREATE INDEX idx_proposals_blockchain_address 
ON Proposals(BlockchainProposalAddress);
```

**Votes Table:**
```sql
ALTER TABLE Votes
ADD COLUMN BlockchainTransactionId VARCHAR(255),
ADD COLUMN BlockchainConfirmedAt TIMESTAMP;

CREATE INDEX idx_votes_blockchain_tx 
ON Votes(BlockchainTransactionId);
```

### 4.3 Migration Strategy

**Phase 1: Add Columns (Non-Breaking)**
- Add new nullable columns with default values
- Deploy backend with adapter support (adapters optional)
- Existing organizations continue working with `BlockchainType = None`

**Phase 2: Enable Blockchain for New Organizations**
- New organizations can select blockchain type during creation
- Existing organizations remain unchanged

**Phase 3: Optional Migration for Existing Organizations**
- Provide admin UI to configure blockchain for existing organizations
- Historical data remains off-chain
- Future operations recorded on-chain

---

## 5. Backend Integration

### 5.1 IBlockchainAdapter Interface

Define a common interface for all blockchain adapters:

```csharp
public interface IBlockchainAdapter
{
    Task<BlockchainTransactionResult> CreateOrganizationAsync(
        Guid organizationId, 
        string name, 
        Dictionary<string, object> metadata,
        CancellationToken cancellationToken = default);

    Task<BlockchainTokenMintResult> CreateShareTypeAsync(
        Guid organizationId,
        Guid shareTypeId,
        string name,
        string symbol,
        int decimals,
        long? maxSupply,
        Dictionary<string, object> metadata,
        CancellationToken cancellationToken = default);

    Task<BlockchainTransactionResult> RecordShareIssuanceAsync(
        Guid organizationId,
        Guid shareTypeId,
        Guid userId,
        decimal quantity,
        Dictionary<string, object> metadata,
        CancellationToken cancellationToken = default);

    Task<BlockchainTransactionResult> CreateProposalAsync(
        Guid organizationId,
        Guid proposalId,
        string title,
        string contentHash,
        DateTime? startAt,
        DateTime? endAt,
        Dictionary<string, object> metadata,
        CancellationToken cancellationToken = default);

    Task<BlockchainTransactionResult> CommitProposalResultsAsync(
        Guid organizationId,
        Guid proposalId,
        string resultsHash,
        string winningOptionId,
        decimal totalVotesCast,
        bool quorumMet,
        DateTime closedAt,
        Dictionary<string, object> metadata,
        CancellationToken cancellationToken = default);

    Task<BlockchainTransactionStatus> GetTransactionStatusAsync(
        string transactionId,
        CancellationToken cancellationToken = default);
}
```

### 5.2 Adapter Implementations

**Solana Adapter Client:**
```csharp
public class SolanaAdapterClient : IBlockchainAdapter
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<SolanaAdapterClient> _logger;

    public SolanaAdapterClient(
        HttpClient httpClient, 
        ILogger<SolanaAdapterClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<BlockchainTransactionResult> CreateProposalAsync(...)
    {
        var request = new
        {
            organizationId,
            proposalId,
            title,
            contentHash,
            startAt,
            endAt,
            metadata,
            idempotencyKey = $"proposal-create-{proposalId}"
        };

        var response = await _httpClient.PostAsJsonAsync(
            "/v1/adapter/proposals", 
            request, 
            cancellationToken);

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BlockchainTransactionResult>();
    }
}
```

**Null Adapter (No-Op):**
```csharp
public class NullBlockchainAdapter : IBlockchainAdapter
{
    public Task<BlockchainTransactionResult> CreateProposalAsync(...)
    {
        // No-op implementation for organizations without blockchain
        return Task.FromResult(new BlockchainTransactionResult
        {
            TransactionId = null,
            Status = "skipped"
        });
    }

    // All other methods return no-op results
}
```

### 5.3 IBlockchainAdapterFactory Implementation

```csharp
public interface IBlockchainAdapterFactory
{
    Task<IBlockchainAdapter> GetAdapterAsync(
        Guid organizationId, 
        CancellationToken cancellationToken = default);
}

public class BlockchainAdapterFactory : IBlockchainAdapterFactory
{
    private readonly FanEngagementDbContext _dbContext;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<BlockchainAdapterFactory> _logger;
    private readonly ConcurrentDictionary<string, IBlockchainAdapter> _adapterCache;

    public BlockchainAdapterFactory(
        FanEngagementDbContext dbContext,
        IHttpClientFactory httpClientFactory,
        ILogger<BlockchainAdapterFactory> logger)
    {
        _dbContext = dbContext;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _adapterCache = new ConcurrentDictionary<string, IBlockchainAdapter>();
    }

    public async Task<IBlockchainAdapter> GetAdapterAsync(
        Guid organizationId, 
        CancellationToken cancellationToken = default)
    {
        var org = await _dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (org == null)
            throw new ArgumentException($"Organization {organizationId} not found");

        var blockchainType = org.BlockchainType ?? "None";

        return _adapterCache.GetOrAdd(blockchainType, _ => CreateAdapter(blockchainType, org.BlockchainConfig));
    }

    private IBlockchainAdapter CreateAdapter(string blockchainType, string configJson)
    {
        return blockchainType switch
        {
            "Solana" => CreateSolanaAdapter(configJson),
            "Polygon" => CreatePolygonAdapter(configJson),
            "None" or _ => new NullBlockchainAdapter()
        };
    }

    private IBlockchainAdapter CreateSolanaAdapter(string configJson)
    {
        var config = JsonSerializer.Deserialize<BlockchainConfig>(configJson);
        var httpClient = _httpClientFactory.CreateClient("SolanaAdapter");
        httpClient.BaseAddress = new Uri(config.AdapterEndpoint);
        httpClient.DefaultRequestHeaders.Add("X-API-Key", config.ApiKey);
        return new SolanaAdapterClient(httpClient, _logger);
    }

    // Similar methods for other adapters...
}
```

### 5.4 Service Integration Example

**ProposalService Integration:**
```csharp
public class ProposalService : IProposalService
{
    private readonly FanEngagementDbContext _dbContext;
    private readonly IBlockchainAdapterFactory _adapterFactory;
    private readonly ILogger<ProposalService> _logger;

    public async Task<Proposal> CloseProposalAsync(Guid proposalId, CancellationToken cancellationToken)
    {
        var proposal = await _dbContext.Proposals
            .Include(p => p.Organization)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        // Business logic validation...
        
        // Compute results
        var results = ComputeResults(proposal);
        
        // Update database first (source of truth)
        proposal.Status = ProposalStatus.Closed;
        proposal.WinningOptionId = results.WinningOptionId;
        proposal.TotalVotesCast = results.TotalVotesCast;
        proposal.QuorumMet = results.QuorumMet;
        proposal.ClosedAt = DateTime.UtcNow;
        
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Commit to blockchain (best-effort, async)
        _ = CommitResultsToBlockchainAsync(proposal, results, cancellationToken);

        return proposal;
    }

    private async Task CommitResultsToBlockchainAsync(
        Proposal proposal, 
        ProposalResults results,
        CancellationToken cancellationToken)
    {
        try
        {
            var adapter = await _adapterFactory.GetAdapterAsync(
                proposal.OrganizationId, 
                cancellationToken);

            var resultsHash = ComputeResultsHash(results);

            var blockchainResult = await adapter.CommitProposalResultsAsync(
                proposal.OrganizationId,
                proposal.Id,
                resultsHash,
                results.WinningOptionId,
                results.TotalVotesCast,
                results.QuorumMet,
                proposal.ClosedAt.Value,
                new Dictionary<string, object>
                {
                    ["optionResults"] = results.OptionResults
                },
                cancellationToken);

            // Update proposal with blockchain transaction ID
            proposal.BlockchainResultsTransactionId = blockchainResult.TransactionId;
            proposal.BlockchainResultsHash = resultsHash;
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Proposal {ProposalId} results committed to blockchain: {TransactionId}",
                proposal.Id,
                blockchainResult.TransactionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, 
                "Failed to commit proposal {ProposalId} results to blockchain", 
                proposal.Id);
            // Do not throw - blockchain commit is best-effort
        }
    }
}
```

### 5.5 Dependency Injection Configuration

```csharp
// In Program.cs or DependencyInjection.cs

services.AddSingleton<IBlockchainAdapterFactory, BlockchainAdapterFactory>();

// Configure HTTP clients for adapters
services.AddHttpClient("SolanaAdapter")
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    })
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

services.AddHttpClient("PolygonAdapter")
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    })
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => 
            TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30));
}
```

---

## 6. Failure Handling Patterns

### 6.1 Retry Strategy

**Exponential Backoff with Jitter:**
- Initial delay: 1 second
- Max retries: 3
- Backoff formula: `delay = min(initial_delay * 2^retry_count + random(0, 1s), 30s)`

**Retry Scenarios:**
- `503 Service Unavailable` from adapter
- Network timeouts
- `429 Too Many Requests` (rate limiting)
- Transient RPC errors (temporary network issues)

**Non-Retryable Errors:**
- `400 Bad Request` (invalid parameters)
- `401 Unauthorized` / `403 Forbidden` (auth failure)
- `409 Conflict` (idempotency: operation already completed)

### 6.2 Circuit Breaker Pattern

**Circuit States:**
1. **Closed** (Normal Operation)
   - Requests flow to adapter
   - Failure count incremented on errors
   - Threshold: 5 consecutive failures

2. **Open** (Fast Fail)
   - Immediately return error without calling adapter
   - Duration: 30 seconds
   - Allows adapter to recover

3. **Half-Open** (Testing)
   - Allow 1 request through to test if adapter recovered
   - Success → Circuit closes
   - Failure → Circuit opens for another 30 seconds

**Implementation (Polly):**
```csharp
var circuitBreakerPolicy = Policy
    .Handle<HttpRequestException>()
    .Or<TimeoutException>()
    .CircuitBreakerAsync(
        handledEventsAllowedBeforeBreaking: 5,
        durationOfBreak: TimeSpan.FromSeconds(30),
        onBreak: (exception, duration) =>
        {
            _logger.LogWarning(
                "Circuit breaker opened for {Duration}s due to: {Exception}",
                duration.TotalSeconds,
                exception.Message);
        },
        onReset: () =>
        {
            _logger.LogInformation("Circuit breaker reset");
        });
```

### 6.3 Timeout Configuration

**Timeout Hierarchy:**
1. **HTTP Client Timeout:** 30 seconds (overall request timeout)
2. **Blockchain Confirmation Timeout:** 60 seconds (adapter waits for confirmation)
3. **Backend Operation Timeout:** 90 seconds (total operation including retries)

**Timeout Behavior:**
- Backend does not block on blockchain confirmations
- Blockchain operations are fire-and-forget with status polling
- Users receive immediate response; blockchain status updated asynchronously

### 6.4 Fallback and Graceful Degradation

**Fallback Strategies:**

1. **Blockchain Unavailable:**
   - Store operation in database
   - Queue for retry via background worker
   - User sees success immediately
   - Blockchain commit happens asynchronously

2. **Adapter Container Down:**
   - Circuit breaker opens immediately
   - Operations queued for later retry
   - Health checks alert operations team

3. **Persistent Failures:**
   - After max retries, mark operation as "blockchain_pending"
   - Manual intervention may be required
   - Operations team investigates adapter/network issues

**Graceful Degradation Example:**
```csharp
try
{
    await adapter.CreateProposalAsync(...);
}
catch (Exception ex) when (ex is HttpRequestException or TimeoutException)
{
    _logger.LogWarning(ex, "Blockchain adapter unavailable, operation queued");
    
    // Queue for background retry
    await _outboundEventService.EnqueueBlockchainOperationAsync(new BlockchainOperation
    {
        Type = "CreateProposal",
        OrganizationId = proposal.OrganizationId,
        ProposalId = proposal.Id,
        Payload = ...,
        Status = "Pending",
        RetryCount = 0,
        NextRetryAt = DateTime.UtcNow.AddSeconds(60)
    });
}
```

### 6.5 Idempotency Guarantees

**Idempotency Keys:**
- All adapter operations accept `idempotencyKey` parameter
- Format: `{operation}-{entityId}` (e.g., `proposal-create-c5d4e3f2`)
- Adapters track processed keys for 24 hours
- Duplicate requests return original result (no re-execution)

**Backend Idempotency Logic:**
```csharp
var idempotencyKey = $"proposal-create-{proposalId}";

// Check if already committed
if (!string.IsNullOrEmpty(proposal.BlockchainCreateTransactionId))
{
    _logger.LogInformation("Proposal {ProposalId} already on blockchain", proposalId);
    return; // Skip blockchain operation
}

await adapter.CreateProposalAsync(..., idempotencyKey);
```

---

## 7. Security Model

### 7.1 Adapter-to-Backend Authentication

**Option 1: API Keys (Recommended for MVP)**
- Backend includes `X-API-Key` header in requests to adapters
- Adapters validate API key against configured value
- Keys stored in environment variables or secrets management

**Option 2: Mutual TLS (Production)**
- Backend and adapters use client certificates
- TLS handshake authenticates both parties
- More secure but complex setup

**Option 3: Service Mesh (Kubernetes)**
- Service mesh (Istio, Linkerd) handles authentication
- Zero-trust networking between services
- Automatic certificate rotation

**MVP Recommendation:** Start with API keys, migrate to mutual TLS or service mesh for production.

### 7.2 Blockchain Key Management

**Adapter Keypair Storage:**

Each adapter container manages its own blockchain keypairs:

**Development/Local:**
- Keypairs loaded from environment variables or files
- **⚠️ NOT SECURE** - Only for local testing

**Production:**
- Keypairs stored in cloud Key Management Service (KMS):
  - **AWS:** AWS KMS with asymmetric keys
  - **Azure:** Azure Key Vault
  - **GCP:** Google Cloud KMS
  - **HashiCorp Vault:** On-premise or cloud-hosted

**Key Rotation:**
- Adapters support hot-swapping of keypairs
- Old keypair remains valid for N days during transition
- New transactions signed with new keypair

**Backup and Recovery:**
- Keypairs backed up encrypted in secure storage
- Recovery procedures documented in runbook
- Multi-person approval required for key recovery

### 7.3 Secrets Management

**Container Secrets:**

**Docker Compose (Development):**
```yaml
services:
  solana-adapter:
    image: fanengagement/solana-adapter:latest
    environment:
      - API_KEY=${SOLANA_ADAPTER_API_KEY}
    secrets:
      - solana_keypair

secrets:
  solana_keypair:
    file: ./secrets/solana-keypair.json
```

**Kubernetes (Production):**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: solana-adapter-secrets
type: Opaque
data:
  api-key: <base64-encoded-api-key>
  keypair: <base64-encoded-keypair>

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-adapter
spec:
  template:
    spec:
      containers:
      - name: solana-adapter
        image: fanengagement/solana-adapter:latest
        env:
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: solana-adapter-secrets
              key: api-key
        volumeMounts:
        - name: keypair
          mountPath: /secrets
          readOnly: true
      volumes:
      - name: keypair
        secret:
          secretName: solana-adapter-secrets
          items:
          - key: keypair
            path: keypair.json
```

### 7.4 Network Security

**Isolation:**
- Adapter containers run in isolated network (Docker network or Kubernetes namespace)
- Only backend can communicate with adapters
- Adapters cannot communicate with each other
- No public internet access for adapter containers (except blockchain RPC)

**Firewall Rules:**
- Backend → Adapter: Allow (authenticated)
- Adapter → Blockchain RPC: Allow
- Internet → Adapter: Deny
- Adapter → Adapter: Deny

### 7.5 Audit Logging

All blockchain operations logged with:
- Operation type (CreateProposal, CommitResults, etc.)
- Organization ID and user ID (if applicable)
- Request parameters (sanitized, no sensitive data)
- Transaction ID (blockchain reference)
- Timestamp and correlation ID
- Success/failure status

**Example Log Entry:**
```json
{
  "timestamp": "2024-12-03T04:00:15Z",
  "level": "INFO",
  "service": "SolanaAdapter",
  "operation": "CreateProposal",
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "proposalId": "c5d4e3f2-1a0b-9c8d-7e6f-5a4b3c2d1e0f",
  "transactionId": "6mNp...1qRu",
  "blockHeight": 245832205,
  "duration_ms": 2340,
  "status": "success",
  "correlationId": "abc-123-def"
}
```

---

## 8. Deployment Models

### 8.1 Development Environment (Docker Compose)

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    image: fanengagement/backend:latest
    ports:
      - "8080:8080"
    environment:
      - SOLANA_ADAPTER_ENDPOINT=http://solana-adapter:8080
      - POLYGON_ADAPTER_ENDPOINT=http://polygon-adapter:8080
    depends_on:
      - db
      - solana-adapter
      - polygon-adapter

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=fanengagement
      - POSTGRES_USER=fanengagement
      - POSTGRES_PASSWORD=password

  solana-adapter:
    image: fanengagement/solana-adapter:latest
    ports:
      - "8081:8080"
    environment:
      - RPC_ENDPOINT=https://api.devnet.solana.com
      - API_KEY=${SOLANA_ADAPTER_API_KEY}
    secrets:
      - solana_keypair

  polygon-adapter:
    image: fanengagement/polygon-adapter:latest
    ports:
      - "8082:8080"
    environment:
      - RPC_ENDPOINT=https://rpc-mumbai.maticvigil.com
      - API_KEY=${POLYGON_ADAPTER_API_KEY}
    secrets:
      - polygon_keypair

secrets:
  solana_keypair:
    file: ./secrets/solana-keypair.json
  polygon_keypair:
    file: ./secrets/polygon-keypair.json
```

**Local Development Workflow:**
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f solana-adapter

# Run backend integration tests
dotnet test --filter Category=BlockchainIntegration

# Stop services
docker compose down
```

### 8.2 Production Environment (Kubernetes)

**Kubernetes Deployment Architecture:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-adapter
  namespace: fanengagement
spec:
  replicas: 3
  selector:
    matchLabels:
      app: solana-adapter
  template:
    metadata:
      labels:
        app: solana-adapter
    spec:
      containers:
      - name: solana-adapter
        image: fanengagement/solana-adapter:1.0.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: RPC_ENDPOINT
          value: "https://api.mainnet-beta.solana.com"
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: solana-adapter-secrets
              key: api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: solana-adapter
  namespace: fanengagement
spec:
  selector:
    app: solana-adapter
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
  type: ClusterIP

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
  minReplicas: 3
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

**Service Discovery:**
- Backend discovers adapters via Kubernetes service DNS: `http://solana-adapter.fanengagement.svc.cluster.local:8080`
- No external load balancer needed (adapters internal-only)
- Horizontal Pod Autoscaler (HPA) scales based on CPU/memory

**Deployment Strategy:**
- Rolling updates with zero downtime
- MaxUnavailable: 1 pod during updates
- Health checks ensure traffic only routes to healthy pods
- Blue/green deployments for major version changes

### 8.3 Scaling Considerations

**Adapter Scaling Triggers:**
- CPU utilization > 70%
- Memory utilization > 80%
- Request latency > 2 seconds (P95)
- Queue depth > 100 pending transactions

**Backend Scaling:**
- Independent of adapter scaling
- Backend scales based on API traffic, not blockchain operations

**Database Scaling:**
- Blockchain operations are async; minimal database impact
- Read replicas for adapter config lookups

---

## 9. Monitoring and Logging

### 9.1 Metrics Collection

**Adapter Metrics (Prometheus):**

```prometheus
# Transaction Metrics
adapter_transactions_total{blockchain,operation,status}
adapter_transaction_duration_seconds{blockchain,operation}
adapter_transaction_retries_total{blockchain,operation}

# RPC Metrics
adapter_rpc_requests_total{blockchain,endpoint,status}
adapter_rpc_latency_seconds{blockchain,endpoint}
adapter_rpc_errors_total{blockchain,error_type}

# Resource Metrics
adapter_memory_usage_bytes{blockchain}
adapter_cpu_usage_percent{blockchain}
adapter_goroutines_count{blockchain}  # For Go adapters

# Queue Metrics (if queuing enabled)
adapter_queue_depth{blockchain}
adapter_queue_processing_duration_seconds{blockchain}
```

**Backend Metrics:**

```prometheus
# Adapter Client Metrics
blockchain_adapter_requests_total{blockchain,operation,status}
blockchain_adapter_circuit_breaker_state{blockchain}
blockchain_adapter_timeouts_total{blockchain}

# Operation Metrics
blockchain_operations_queued_total{blockchain,operation}
blockchain_operations_completed_total{blockchain,operation,status}
```

### 9.2 Logging Strategy

**Structured Logging Format (JSON):**

```json
{
  "timestamp": "2024-12-03T04:00:15Z",
  "level": "INFO",
  "service": "solana-adapter",
  "version": "1.0.0",
  "correlationId": "abc-123-def",
  "operation": "CreateProposal",
  "organizationId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "transactionId": "6mNp...1qRu",
  "duration_ms": 2340,
  "status": "success",
  "message": "Proposal created on-chain successfully"
}
```

**Log Levels:**
- **ERROR:** Adapter failures, RPC errors, invalid requests
- **WARN:** Retry attempts, circuit breaker opens, high latency
- **INFO:** Successful operations, configuration changes
- **DEBUG:** Detailed transaction data, RPC request/response (dev only)

**Centralized Logging:**
- **Option 1:** Elasticsearch + Logstash + Kibana (ELK Stack)
- **Option 2:** Grafana Loki + Promtail
- **Option 3:** Cloud logging (AWS CloudWatch, Azure Monitor, GCP Cloud Logging)

**Log Retention:**
- Development: 7 days
- Production: 30 days
- Archived: 1 year (compliance)

### 9.3 Alerting Rules

**Critical Alerts (PagerDuty):**
- Adapter container down > 2 minutes
- Circuit breaker open > 5 minutes
- Transaction failure rate > 10% over 5 minutes
- RPC endpoint unreachable > 5 minutes

**Warning Alerts (Slack/Email):**
- Transaction latency > 5 seconds (P95)
- Queue depth > 50 pending operations
- Memory usage > 80%
- Transaction failure rate > 5% over 10 minutes

**Informational Alerts:**
- New adapter deployed
- Configuration changed
- Circuit breaker opened/closed

### 9.4 Dashboards

**Grafana Dashboard - Blockchain Adapters:**

**Panel 1: Transaction Throughput**
- Transactions per second by blockchain
- Success vs. failure rate
- Average transaction latency

**Panel 2: Adapter Health**
- Container status (up/down)
- Circuit breaker state
- RPC connection status

**Panel 3: Resource Usage**
- CPU usage per adapter
- Memory usage per adapter
- Network I/O

**Panel 4: Error Rates**
- Errors by type and blockchain
- Retry attempts
- Timeout occurrences

**Panel 5: Queue Metrics (if applicable)**
- Queue depth over time
- Average processing time
- Oldest pending operation age

---

## 10. Service Discovery and Routing

### 10.1 Environment-Based Configuration

Backend discovers adapters via environment variables:

```bash
# Development
SOLANA_ADAPTER_ENDPOINT=http://localhost:8081
POLYGON_ADAPTER_ENDPOINT=http://localhost:8082

# Docker Compose
SOLANA_ADAPTER_ENDPOINT=http://solana-adapter:8080
POLYGON_ADAPTER_ENDPOINT=http://polygon-adapter:8080

# Kubernetes
SOLANA_ADAPTER_ENDPOINT=http://solana-adapter.fanengagement.svc.cluster.local:8080
POLYGON_ADAPTER_ENDPOINT=http://polygon-adapter.fanengagement.svc.cluster.local:8080
```

**Backend Configuration:**

```csharp
public class BlockchainAdapterConfiguration
{
    public Dictionary<string, string> AdapterEndpoints { get; set; } = new()
    {
        ["Solana"] = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_ENDPOINT") 
            ?? "http://localhost:8081",
        ["Polygon"] = Environment.GetEnvironmentVariable("POLYGON_ADAPTER_ENDPOINT") 
            ?? "http://localhost:8082"
    };

    public Dictionary<string, string> ApiKeys { get; set; } = new()
    {
        ["Solana"] = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_API_KEY") 
            ?? throw new InvalidOperationException("SOLANA_ADAPTER_API_KEY not set"),
        ["Polygon"] = Environment.GetEnvironmentVariable("POLYGON_ADAPTER_API_KEY") 
            ?? throw new InvalidOperationException("POLYGON_ADAPTER_API_KEY not set")
    };
}
```

### 10.2 Service Mesh (Optional - Advanced)

For production Kubernetes deployments, consider a service mesh (Istio or Linkerd):

**Benefits:**
- Automatic mTLS between backend and adapters
- Traffic management (retries, timeouts, circuit breakers at mesh level)
- Observability (automatic tracing, metrics)
- Zero-trust networking

**Istio Example:**

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: solana-adapter
  namespace: fanengagement
spec:
  hosts:
  - solana-adapter
  http:
  - timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
    route:
    - destination:
        host: solana-adapter
        port:
          number: 8080
```

### 10.3 Load Balancing

**Kubernetes Service (ClusterIP):**
- Round-robin load balancing by default
- Kubernetes service distributes requests across healthy pods
- No application-level load balancing needed

**Multiple Adapter Instances:**
- Each blockchain adapter can have multiple pods (replicas)
- Backend sends requests to Kubernetes service
- Service routes to available pod

---

## 11. API Versioning Strategy

### 11.1 Versioning Approach

**URL Path Versioning:**
- Current version: `/v1/adapter/...`
- Future versions: `/v2/adapter/...`, `/v3/adapter/...`

**Version Lifecycle:**
- **Active:** Current version, all new features
- **Deprecated:** Previous version, maintained for 6 months after new version release
- **Sunset:** Version removed after deprecation period

### 11.2 Backward Compatibility

**Breaking Changes (Require New Version):**
- Removing required fields from request
- Changing field types or validation rules
- Removing endpoints

**Non-Breaking Changes (Same Version):**
- Adding optional fields to request
- Adding new fields to response
- Adding new endpoints
- Adding new error codes

### 11.3 Version Detection

**Backend Implementation:**

```csharp
public class SolanaAdapterClient : IBlockchainAdapter
{
    private readonly HttpClient _httpClient;
    private readonly string _apiVersion;

    public SolanaAdapterClient(HttpClient httpClient, string apiVersion = "v1")
    {
        _httpClient = httpClient;
        _apiVersion = apiVersion;
    }

    public async Task<BlockchainTransactionResult> CreateProposalAsync(...)
    {
        var endpoint = $"/{_apiVersion}/adapter/proposals";
        var response = await _httpClient.PostAsJsonAsync(endpoint, request);
        // ...
    }
}
```

**Adapter Version Header:**

```http
GET /v1/adapter/proposals
X-Adapter-Version: 1.2.0
```

Adapters include version in response headers for client validation.

---

## 12. Operational Considerations

### 12.1 Deployment Checklist

**Pre-Deployment:**
- [ ] Adapter Docker images built and pushed to registry
- [ ] Secrets created (API keys, keypairs)
- [ ] Environment variables configured
- [ ] Database migration applied (BlockchainType, BlockchainConfig columns)
- [ ] Health check endpoints verified
- [ ] Metrics endpoints verified

**Deployment:**
- [ ] Deploy adapter containers (Solana, Polygon)
- [ ] Verify adapter health checks pass
- [ ] Deploy backend with adapter integration
- [ ] Run smoke tests (create test org, proposal, close proposal)
- [ ] Verify blockchain transactions confirmed
- [ ] Check metrics and logs

**Post-Deployment:**
- [ ] Configure alerting rules
- [ ] Set up Grafana dashboards
- [ ] Document runbook procedures
- [ ] Train operations team

### 12.2 Troubleshooting Guide

**Issue: Adapter Container Won't Start**
- Check logs: `docker logs solana-adapter` or `kubectl logs -n fanengagement solana-adapter-xxx`
- Verify secrets mounted correctly
- Verify environment variables set
- Check image exists and is pullable

**Issue: Transactions Failing**
- Check adapter logs for RPC errors
- Verify blockchain network is accessible (RPC endpoint)
- Check keypair has sufficient balance (for gas fees)
- Verify transaction parameters are valid

**Issue: High Latency**
- Check RPC provider performance (use alternate RPC if degraded)
- Scale adapter horizontally (increase replicas)
- Check network latency between adapter and blockchain RPC
- Review circuit breaker status (may be in open state)

**Issue: Circuit Breaker Open**
- Check adapter health endpoint
- Review recent error logs
- Verify blockchain RPC is responding
- Wait for circuit breaker to half-open and retry

### 12.3 Disaster Recovery

**Adapter Container Failure:**
- Kubernetes restarts failed containers automatically
- If persistent failure, redeploy adapter with known-good image
- Check recent configuration changes

**Blockchain Network Outage:**
- Circuit breaker prevents cascading failures
- Operations queued for retry when network recovers
- Monitor blockchain network status pages

**Keypair Compromise:**
- Immediately rotate keypairs
- Deploy new adapter with new keypairs
- Review audit logs for unauthorized transactions
- Contact blockchain network security team if needed

**Data Inconsistency (Database vs. Blockchain):**
- Run reconciliation script to compare database state vs. on-chain state
- Identify missing blockchain transactions
- Resubmit missing operations with idempotency keys
- Document discrepancies for audit

### 12.4 Performance Tuning

**Adapter Performance:**
- Use connection pooling for RPC clients
- Implement request batching for bulk operations
- Cache blockchain account data (with TTL)
- Use priority fees during network congestion

**Backend Performance:**
- Cache adapter client instances (avoid repeated instantiation)
- Use async operations (don't block on blockchain confirmations)
- Implement request deduplication
- Monitor HTTP client pool exhaustion

**Database Performance:**
- Index blockchain reference columns (transactionId, mintAddress)
- Use read replicas for blockchain config lookups
- Optimize queries for organization blockchain type lookup

---

## 13. Migration from E-004

### 13.1 Architectural Changes

E-007 supersedes E-004 (direct Solana integration) with a modular adapter platform:

| Aspect | E-004 (Old) | E-007 (New) |
|--------|-------------|-------------|
| **Architecture** | Direct Solana integration in backend | Isolated Docker adapter containers |
| **Blockchain Support** | Solana only | Multi-chain (Solana, Polygon, extensible) |
| **Coupling** | Tight (backend code imports Solana libraries) | Loose (HTTP API, blockchain-agnostic) |
| **Testing** | Complex (requires Solana test validator in backend tests) | Simple (mock adapter HTTP API) |
| **Deployment** | Monolithic (backend + Solana in one container) | Distributed (separate adapter containers) |
| **Scaling** | Coupled (scale entire backend) | Independent (scale adapters separately) |
| **Extensibility** | Hard (add new blockchain = refactor backend) | Easy (implement adapter contract + deploy) |

### 13.2 Reusable E-004 Artifacts

**Solana Research Documentation (Valid and Reused):**
- `/docs/blockchain/solana/solana-capabilities-analysis.md` - Transaction costs, SPL tokens, PDAs
- `/docs/blockchain/solana/governance-models-evaluation.md` - On-chain vs. off-chain voting
- `/docs/blockchain/solana/sharetype-tokenization-strategy.md` - Token minting strategy
- `/docs/blockchain/solana/solana-key-management-security.md` - Key management best practices

**These documents inform the Solana adapter implementation in E-007.**

### 13.3 Migration Path

**No Migration Needed:**
- E-007 is a fresh start with new architecture
- Existing organizations remain unaffected (BlockchainType = None)
- E-004 work archived in `/docs/product/archive/E-004-*.md`

**Deprecation Notice:**
- E-004 stories archived with deprecation notice
- E-004 research documentation retained as reference
- No production E-004 code deployed

---

## 14. Open Questions and Future Enhancements

### 14.1 Open Questions

**Q1: Should adapters support synchronous vs. asynchronous modes?**
- **Synchronous:** Wait for blockchain confirmation before returning (higher latency)
- **Asynchronous:** Return immediately after submission (lower latency, status polling)
- **Recommendation:** Async by default, sync as option for critical operations

**Q2: How to handle blockchain network forks/reorgs?**
- Monitor block confirmations (e.g., wait for 32 confirmations on Solana)
- Implement reorg detection and notification
- Document acceptable risk level per operation type

**Q3: Should adapters cache blockchain state?**
- **Pros:** Reduced RPC calls, lower latency
- **Cons:** Staleness risk, cache invalidation complexity
- **Recommendation:** Cache only immutable data (e.g., mint addresses), TTL < 5 minutes

**Q4: How to handle gas/priority fee optimization?**
- Adapters dynamically adjust fees based on network congestion
- Expose fee estimation endpoint for backend to query
- Consider gas fee sponsorship model for organizations

### 14.2 Future Enhancements

**Phase 2: On-Chain Voting**
- Implement vote recording on blockchain (currently optional)
- Privacy-preserving voting (zero-knowledge proofs, commit-reveal)
- Gas fee optimization for bulk vote submission

**Phase 3: User Wallet Integration**
- Allow users to connect personal wallets (Phantom, MetaMask)
- Transfer share tokens from platform custody to user wallets
- Wallet-based voting (user signs vote with their wallet)

**Phase 4: Cross-Chain Interoperability**
- Bridge adapters to enable cross-chain share transfers
- Multi-chain governance (vote on Solana, execute on Polygon)
- Unified governance dashboard across chains

**Phase 5: Advanced Governance**
- Integrate with existing DAO frameworks (Realms, Snapshot)
- Implement quadratic voting on-chain
- Time-locked proposals and voting schedules

**Phase 6: Marketplace Features**
- Secondary market for share tokens
- DEX integration for token liquidity
- Royalty/fee structure for organizations

---

## 15. References

### 15.1 Internal Documentation

- **FanEngagement Architecture:** `/docs/architecture.md`
- **Solana Capabilities Analysis:** `/docs/blockchain/solana/solana-capabilities-analysis.md`
- **Solana Governance Models:** `/docs/blockchain/solana/governance-models-evaluation.md`
- **Solana ShareType Tokenization:** `/docs/blockchain/solana/sharetype-tokenization-strategy.md`
- **Solana Key Management:** `/docs/blockchain/solana/solana-key-management-security.md`
- **Epic E-007 Definition:** `/docs/product/backlog.md` (E-007 section)
- **E-004 Archive:** `/docs/product/archive/E-004-README.md`

### 15.2 External References

**Solana:**
- Solana Documentation: https://docs.solana.com/
- SPL Token Program: https://spl.solana.com/token
- Anchor Framework: https://www.anchor-lang.com/

**Polygon:**
- Polygon Documentation: https://docs.polygon.technology/
- ERC-20 Token Standard: https://ethereum.org/en/developers/docs/standards/tokens/erc-20/
- Hardhat Development Environment: https://hardhat.org/

**API Standards:**
- OpenAPI Specification 3.0: https://swagger.io/specification/
- RFC 7807 Problem Details: https://datatracker.ietf.org/doc/html/rfc7807

**Resilience Patterns:**
- Polly (C# Resilience Library): https://github.com/App-vNext/Polly
- Circuit Breaker Pattern: https://martinfowler.com/bliki/CircuitBreaker.html

**Container Orchestration:**
- Docker Compose: https://docs.docker.com/compose/
- Kubernetes: https://kubernetes.io/docs/
- Istio Service Mesh: https://istio.io/

**Monitoring:**
- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- OpenTelemetry: https://opentelemetry.io/docs/

---

## Appendix A: Example Adapter Implementation Outline

**Technology Stack Options:**

**Option 1: Node.js/TypeScript**
- **Pros:** Excellent blockchain SDK support (Web3.js, Ethers.js), large ecosystem
- **Cons:** Different tech stack from backend (.NET)

**Option 2: .NET/C#**
- **Pros:** Consistent with backend tech stack, team expertise
- **Cons:** Fewer blockchain SDKs (Solnet for Solana, Nethereum for Ethereum/Polygon)

**Recommendation:** Node.js/TypeScript for MVP (better blockchain ecosystem), consider .NET for future adapters if team preference.

**Solana Adapter (Node.js/Express):**

```typescript
import express from 'express';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

const app = express();
app.use(express.json());

const connection = new Connection(process.env.RPC_ENDPOINT!);
const payer = Keypair.fromSecretKey(loadKeypair());

app.post('/v1/adapter/share-types', async (req, res) => {
  const { organizationId, shareTypeId, name, symbol, decimals, maxSupply } = req.body;

  try {
    // Create SPL token mint
    const mint = await createMint(
      connection,
      payer,
      payer.publicKey,
      null, // freeze authority
      decimals
    );

    const signature = await connection.confirmTransaction(mint);

    res.json({
      transactionId: signature,
      mintAddress: mint.toBase58(),
      status: 'confirmed',
      confirmedAt: new Date().toISOString(),
      networkFee: '0.000005'
    });
  } catch (error) {
    res.status(500).json({
      type: 'https://fanengagement.io/errors/blockchain-error',
      title: 'Blockchain Operation Failed',
      status: 500,
      detail: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    blockchain: 'solana',
    checks: {
      rpc_connection: 'healthy',
      keypair_loaded: 'healthy'
    }
  });
});

app.listen(8080, () => {
  console.log('Solana adapter listening on port 8080');
});
```

---

## Appendix B: Testing Strategy Summary

**Unit Tests:**
- Mock adapter HTTP clients
- Test backend routing logic (IBlockchainAdapterFactory)
- Test failure handling (retries, circuit breaker)

**Integration Tests:**
- Spin up adapter containers with test blockchain networks
- Test full end-to-end flow (create proposal → commit to blockchain)
- Verify idempotency guarantees

**Contract Tests:**
- Validate adapter responses match OpenAPI spec exactly
- Test all error scenarios return correct Problem Details format
- Verify backward compatibility across versions

**Performance Tests:**
- Load test adapters (transactions per second)
- Measure latency under various network conditions
- Test circuit breaker behavior under load

**Chaos Engineering:**
- Kill adapter containers randomly (verify resilience)
- Simulate blockchain network outages
- Test database-blockchain inconsistency scenarios

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-03 | Documentation Specialist | Initial architecture specification for E-007 |

---

**End of Document**
