# Multi-Chain Blockchain Adapter Platform Architecture

> **Document Type:** Architecture Specification  
> **Epic:** E-007 - Blockchain Adapter Platform  
> **Status:** Design Complete  
> **Last Updated:** December 2024

## Executive Summary

This document defines the architecture for FanEngagement's multi-chain blockchain adapter platform. The platform enables organizations to select their preferred blockchain (Solana, Polygon, or future additions) while maintaining a consistent API interface and isolating blockchain-specific logic in independent Docker containers.

**Key Design Principles:**

1. **Isolation** - Each blockchain adapter runs in its own Docker container with independent lifecycle
2. **Consistency** - All adapters implement the same OpenAPI contract
3. **Flexibility** - Organizations select blockchain via database configuration; backend routes requests to appropriate adapter
4. **Resilience** - Adapter failures handled gracefully; main application remains operational
5. **Extensibility** - New blockchains added by implementing adapter contract and deploying container

**Benefits:**

- **For Organizations:** Choose blockchain aligned with values, costs, and technical preferences
- **For Platform:** Blockchain issues isolated from main application; easier testing with standardized interfaces
- **For Developers:** Clean separation of blockchain logic; consistent API reduces learning curve

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Adapter Container Architecture](#2-adapter-container-architecture)
3. [OpenAPI Contract Specification](#3-openapi-contract-specification)
4. [Organization Blockchain Selection](#4-organization-blockchain-selection)
5. [Adapter Discovery and Routing](#5-adapter-discovery-and-routing)
6. [Failure Handling and Circuit Breaker](#6-failure-handling-and-circuit-breaker)
7. [Security Model](#7-security-model)
8. [Deployment Models](#8-deployment-models)
9. [Monitoring and Logging Strategy](#9-monitoring-and-logging-strategy)
10. [Testing Strategy](#10-testing-strategy)
11. [Migration from E-004 Direct Integration](#11-migration-from-e-004-direct-integration)
12. [References](#12-references)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  FanEngagement Backend API                      │
│                   (.NET 9, PostgreSQL)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Organization Service                                    │   │
│  │  - Stores BlockchainType (enum: None, Solana, Polygon)  │   │
│  │  - Stores BlockchainConfig (JSON: adapter URL, keys)    │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│  ┌─────────────────────▼───────────────────────────────────┐   │
│  │  IBlockchainAdapterFactory                              │   │
│  │  - GetAdapter(organizationId) → IBlockchainAdapter      │   │
│  │  - Routes to correct adapter based on org config        │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│         ┌──────────────┼──────────────┐                        │
│         │              │              │                        │
│    ┌────▼────┐    ┌────▼────┐   ┌────▼────┐                  │
│    │ Solana  │    │ Polygon │   │  Null   │                  │
│    │ Adapter │    │ Adapter │   │ Adapter │                  │
│    │ Client  │    │ Client  │   │ (no-op) │                  │
│    │ (HTTP)  │    │ (HTTP)  │   │         │                  │
│    └────┬────┘    └────┬────┘   └─────────┘                  │
└─────────┼──────────────┼──────────────────────────────────────┘
          │              │
          │ HTTP/REST    │ HTTP/REST
          │              │
    ┌─────▼──────┐  ┌────▼───────┐
    │  Solana    │  │  Polygon   │
    │  Adapter   │  │  Adapter   │
    │  Container │  │  Container │
    │  (Docker)  │  │  (Docker)  │
    └─────┬──────┘  └────┬───────┘
          │              │
          ▼              ▼
      Solana          Polygon
      Network         Network
   (RPC Provider)  (RPC Provider)
```

### 1.2 Component Responsibilities

| Component | Responsibility | Technology |
|-----------|----------------|------------|
| **FanEngagement Backend** | Business logic, authorization, data persistence | .NET 9, PostgreSQL |
| **Organization Service** | Manages org blockchain config; stores selection | EF Core, Domain Services |
| **IBlockchainAdapterFactory** | Routes requests to appropriate adapter | Dependency Injection |
| **Adapter Clients** | HTTP clients wrapping adapter API calls | HttpClient, Polly (retry/circuit breaker) |
| **Solana Adapter Container** | Solana-specific blockchain operations | Node.js/TypeScript, Docker |
| **Polygon Adapter Container** | Polygon-specific blockchain operations | Node.js/TypeScript, Docker |
| **Null Adapter** | No-op implementation for orgs without blockchain | C# in-process |

### 1.3 Key Architectural Decisions

| Decision | Rationale | Trade-offs |
|----------|-----------|------------|
| **Docker containers per blockchain** | Isolation, independent scaling, technology flexibility | Operational complexity, network latency |
| **Consistent OpenAPI contract** | Simplifies backend integration, enables testing with mocks | May not leverage blockchain-specific features fully |
| **HTTP/REST communication** | Universal compatibility, easy debugging | Higher latency than in-process; requires serialization |
| **Organization-level blockchain selection** | Flexibility for orgs; simplifies multi-tenant isolation | Cannot mix blockchains within one organization |
| **Factory pattern for routing** | Clean separation of concerns, testable | Requires database query per adapter retrieval |

---

## 2. Adapter Container Architecture

### 2.1 Container Design Principles

Each blockchain adapter container follows these principles:

- **Stateless:** No local storage of private keys or blockchain state in container
- **Single Responsibility:** One blockchain type per container
- **Standard HTTP API:** Exposes REST endpoints matching OpenAPI contract
- **Health & Metrics:** Provides `/health` and `/metrics` endpoints for monitoring
- **Secure:** API authentication required; blockchain keys stored in secrets management

### 2.2 Container Internal Architecture

```
┌─────────────────────────────────────────────────────┐
│       Adapter Container (e.g., Solana Adapter)      │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  HTTP API Layer (Express/Koa/ASP.NET)      │   │
│  │  - Endpoint handlers (POST /adapter/...)   │   │
│  │  - Request validation (OpenAPI spec)       │   │
│  │  - Authentication middleware (API key/JWT) │   │
│  └────────────────┬───────────────────────────┘   │
│                   │                                │
│  ┌────────────────▼───────────────────────────┐   │
│  │  Blockchain Service Layer                  │   │
│  │  - Transaction building                    │   │
│  │  - Signing operations                      │   │
│  │  - Retry logic (exponential backoff)       │   │
│  │  - Error mapping to standard responses     │   │
│  └────────────────┬───────────────────────────┘   │
│                   │                                │
│  ┌────────────────▼───────────────────────────┐   │
│  │  Blockchain RPC Client                     │   │
│  │  - Solana Web3.js / Ethers.js              │   │
│  │  - Connection pooling                      │   │
│  │  - Rate limiting                           │   │
│  └────────────────┬───────────────────────────┘   │
│                   │                                │
│  ┌────────────────▼───────────────────────────┐   │
│  │  Key Management                            │   │
│  │  - Load keypair from environment/secrets   │   │
│  │  - Sign transactions                       │   │
│  │  - Never expose private keys via API       │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                     │
                     ▼
            Blockchain Network
         (via RPC endpoint URL)
```

### 2.3 Adapter Container Requirements

All adapters must meet these requirements:

| Requirement | Description | Enforcement |
|-------------|-------------|-------------|
| **OpenAPI Compliance** | Implement all required endpoints from contract | Contract testing in CI |
| **Stateless Operations** | No persistent state within container | Architecture review |
| **Health Check** | `GET /health` returns 200 if adapter is operational | Kubernetes liveness probe |
| **Metrics Export** | `GET /metrics` exposes Prometheus-compatible metrics | Monitoring dashboard |
| **Structured Logging** | JSON logs with standard fields (timestamp, level, message, context) | Log aggregation compatibility |
| **Authentication** | Validate API key or JWT on all non-health endpoints | Security review |
| **Timeout Handling** | Blockchain operations timeout after configurable duration (default 30s) | Polly timeout policy |
| **Error Mapping** | Blockchain errors mapped to RFC 7807 ProblemDetails responses | Integration tests |

---

## 3. OpenAPI Contract Specification

### 3.1 Core Principles

- **Versioned:** All endpoints under `/v1/adapter/`
- **Consistent:** Same contract for all blockchain adapters
- **Extensible:** Version updates allow new features without breaking changes
- **Documented:** OpenAPI 3.0 spec with descriptions and examples

### 3.2 Required Endpoints

All blockchain adapters must implement these endpoints:

#### 3.2.1 Organization Operations

**`POST /v1/adapter/organizations`**

Creates on-chain representation of an organization.

**Request:**
```json
{
  "organizationId": "uuid",
  "name": "string",
  "description": "string",
  "metadata": {
    "logoUrl": "string",
    "colors": {
      "primary": "#hex",
      "secondary": "#hex"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "accountAddress": "blockchain-specific-account-address",
  "status": "confirmed",
  "timestamp": "2024-12-03T00:00:00Z"
}
```

#### 3.2.2 Share Type Operations

**`POST /v1/adapter/share-types`**

Creates token mint for a ShareType.

**Request:**
```json
{
  "shareTypeId": "uuid",
  "organizationId": "uuid",
  "name": "string",
  "symbol": "string",
  "decimals": 0,
  "maxSupply": 1000000,
  "metadata": {
    "description": "string",
    "votingWeight": 1.0
  }
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "mintAddress": "blockchain-specific-mint-address",
  "status": "confirmed",
  "timestamp": "2024-12-03T00:00:00Z"
}
```

#### 3.2.3 Share Issuance Operations

**`POST /v1/adapter/share-issuances`**

Records share issuance on-chain (mints tokens).

**Request:**
```json
{
  "issuanceId": "uuid",
  "shareTypeId": "uuid",
  "userId": "uuid",
  "quantity": 100,
  "recipientAddress": "blockchain-specific-address",
  "metadata": {
    "reason": "Initial allocation",
    "issuedBy": "admin-user-id"
  }
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "recipientAddress": "blockchain-specific-address",
  "status": "confirmed",
  "timestamp": "2024-12-03T00:00:00Z"
}
```

#### 3.2.4 Proposal Operations

**`POST /v1/adapter/proposals`**

Creates on-chain proposal record.

**Request:**
```json
{
  "proposalId": "uuid",
  "organizationId": "uuid",
  "title": "string",
  "contentHash": "sha256-hash-of-proposal-content",
  "startAt": "2024-12-03T00:00:00Z",
  "endAt": "2024-12-10T00:00:00Z",
  "eligibleVotingPower": 10000
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "proposalAddress": "blockchain-specific-address",
  "status": "confirmed",
  "timestamp": "2024-12-03T00:00:00Z"
}
```

#### 3.2.5 Voting Operations

**`POST /v1/adapter/votes`**

Records vote on-chain.

**Request:**
```json
{
  "voteId": "uuid",
  "proposalId": "uuid",
  "userId": "uuid",
  "optionId": "uuid",
  "votingPower": 100,
  "voterAddress": "blockchain-specific-address",
  "timestamp": "2024-12-03T12:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "status": "confirmed",
  "timestamp": "2024-12-03T12:00:01Z"
}
```

#### 3.2.6 Proposal Results

**`POST /v1/adapter/proposal-results`**

Commits proposal results hash on-chain.

**Request:**
```json
{
  "proposalId": "uuid",
  "resultsHash": "sha256-hash-of-results",
  "winningOptionId": "uuid",
  "totalVotesCast": 5000,
  "quorumMet": true,
  "closedAt": "2024-12-10T00:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "status": "confirmed",
  "timestamp": "2024-12-10T00:00:01Z"
}
```

#### 3.2.7 Transaction Query

**`GET /v1/adapter/transactions/{txId}`**

Queries transaction status.

**Response (200 OK):**
```json
{
  "transactionId": "blockchain-specific-tx-id",
  "status": "confirmed|pending|failed",
  "confirmations": 32,
  "blockNumber": 123456789,
  "timestamp": "2024-12-03T12:00:01Z",
  "explorerUrl": "https://explorer.example.com/tx/{txId}"
}
```

#### 3.2.8 Health Check

**`GET /v1/adapter/health`**

Health check endpoint for monitoring.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "blockchain": "solana",
  "network": "devnet",
  "rpcStatus": "connected",
  "lastBlockNumber": 123456789,
  "timestamp": "2024-12-03T12:00:00Z"
}
```

#### 3.2.9 Metrics

**`GET /v1/adapter/metrics`**

Prometheus metrics endpoint.

**Response (200 OK, text/plain):**
```
# HELP adapter_transactions_total Total number of transactions submitted
# TYPE adapter_transactions_total counter
adapter_transactions_total{status="success",operation="vote"} 1234
adapter_transactions_total{status="failed",operation="vote"} 12

# HELP adapter_transaction_duration_seconds Transaction duration in seconds
# TYPE adapter_transaction_duration_seconds histogram
adapter_transaction_duration_seconds_bucket{operation="vote",le="1"} 1000
adapter_transaction_duration_seconds_bucket{operation="vote",le="2"} 1200
```

### 3.3 Standard Error Responses

All adapters must return RFC 7807 ProblemDetails for errors:

**400 Bad Request:**
```json
{
  "type": "https://fanengagement.io/errors/invalid-request",
  "title": "Invalid Request",
  "status": 400,
  "detail": "Field 'organizationId' is required",
  "instance": "/v1/adapter/organizations"
}
```

**503 Service Unavailable:**
```json
{
  "type": "https://fanengagement.io/errors/blockchain-unavailable",
  "title": "Blockchain Unavailable",
  "status": 503,
  "detail": "Solana RPC endpoint is currently unavailable. Transaction queued for retry.",
  "instance": "/v1/adapter/votes",
  "retryAfter": 30
}
```

### 3.4 Authentication

All non-health/metrics endpoints require authentication via HTTP header:

```
Authorization: Bearer <api-key-or-jwt>
```

Or:

```
X-Adapter-API-Key: <api-key>
```

---

## 4. Organization Blockchain Selection

### 4.1 Database Schema

Add fields to `Organizations` table:

```sql
ALTER TABLE "Organizations"
ADD COLUMN "BlockchainType" VARCHAR(50) DEFAULT 'None' NOT NULL,
ADD COLUMN "BlockchainConfig" JSONB;

-- Example values:
-- BlockchainType: 'None' | 'Solana' | 'Polygon'
-- BlockchainConfig: { "adapterUrl": "http://solana-adapter:3001", "network": "devnet", "apiKey": "..." }
```

### 4.2 Domain Model

**Enum:**
```csharp
public enum BlockchainType
{
    None = 0,
    Solana = 1,
    Polygon = 2
}
```

**Entity:**
```csharp
public class Organization
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    
    // Blockchain configuration
    public BlockchainType BlockchainType { get; set; } = BlockchainType.None;
    public string? BlockchainConfig { get; set; } // JSON string
    
    // Navigation properties
    public ICollection<OrganizationMembership> Memberships { get; set; } = [];
    public ICollection<ShareType> ShareTypes { get; set; } = [];
    public ICollection<Proposal> Proposals { get; set; } = [];
}
```

**Configuration Object (deserialized from JSON):**
```csharp
public class BlockchainConfiguration
{
    public string AdapterUrl { get; set; } = string.Empty;
    public string Network { get; set; } = string.Empty; // "devnet", "mainnet", etc.
    public string? ApiKey { get; set; }
    public Dictionary<string, string>? AdditionalConfig { get; set; }
}
```

### 4.3 Selection Rules

| Rule | Enforcement | Rationale |
|------|-------------|-----------|
| **Immutability after data** | Cannot change blockchain type if org has shares, proposals, or votes | Prevents data inconsistency across blockchains |
| **Default to None** | New organizations default to `BlockchainType.None` | Backward compatibility; opt-in blockchain usage |
| **OrgAdmin only** | Only OrgAdmins can configure blockchain | Administrative decision with infrastructure implications |
| **Validation** | Validate `adapterUrl` and `network` are valid | Prevent misconfigurations causing runtime errors |

### 4.4 Configuration UI Flow

1. **Organization Creation:** OrgAdmin creates org, optionally selects blockchain type
2. **Settings Page:** OrgAdmin navigates to `/admin/organizations/:orgId/settings`
3. **Blockchain Section:** Dropdown shows available blockchain options
4. **Disabled after Data:** If org has shares or proposals, dropdown is disabled with explanation
5. **Save Configuration:** API validates and stores blockchain configuration

---

## 5. Adapter Discovery and Routing

### 5.1 Factory Pattern

The backend uses a factory pattern to route blockchain operations to the correct adapter.

**Interface:**
```csharp
public interface IBlockchainAdapterFactory
{
    Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken ct);
}
```

**Implementation:**
```csharp
public class BlockchainAdapterFactory(
    FanEngagementDbContext dbContext,
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    ILogger<BlockchainAdapterFactory> logger) : IBlockchainAdapterFactory
{
    public async Task<IBlockchainAdapter> GetAdapterAsync(
        Guid organizationId, 
        CancellationToken ct)
    {
        var org = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, ct);
        
        if (org == null)
        {
            throw new NotFoundException($"Organization {organizationId} not found");
        }
        
        return org.BlockchainType switch
        {
            BlockchainType.Solana => CreateSolanaAdapter(org.BlockchainConfig),
            BlockchainType.Polygon => CreatePolygonAdapter(org.BlockchainConfig),
            BlockchainType.None => new NullBlockchainAdapter(),
            _ => throw new InvalidOperationException(
                $"Unknown blockchain type: {org.BlockchainType}")
        };
    }
    
    private IBlockchainAdapter CreateSolanaAdapter(string? configJson)
    {
        var config = ParseConfig(configJson);
        var httpClient = httpClientFactory.CreateClient("SolanaAdapter");
        httpClient.BaseAddress = new Uri(config.AdapterUrl);
        httpClient.DefaultRequestHeaders.Add("X-Adapter-API-Key", config.ApiKey);
        
        return new SolanaAdapterClient(httpClient, logger);
    }
    
    // Similar for Polygon...
}
```

### 5.2 Adapter Interface

Common interface for all blockchain adapters:

```csharp
public interface IBlockchainAdapter
{
    Task<TransactionResult> CreateOrganizationAsync(
        Guid organizationId, string name, string? description, 
        CancellationToken ct);
    
    Task<TransactionResult> CreateShareTypeAsync(
        Guid shareTypeId, Guid organizationId, string name, string symbol, 
        int decimals, long? maxSupply, CancellationToken ct);
    
    Task<TransactionResult> RecordShareIssuanceAsync(
        Guid issuanceId, Guid shareTypeId, Guid userId, decimal quantity, 
        CancellationToken ct);
    
    Task<TransactionResult> CreateProposalAsync(
        Guid proposalId, Guid organizationId, string title, string contentHash,
        DateTime? startAt, DateTime? endAt, decimal eligibleVotingPower,
        CancellationToken ct);
    
    Task<TransactionResult> RecordVoteAsync(
        Guid voteId, Guid proposalId, Guid userId, Guid optionId, 
        decimal votingPower, CancellationToken ct);
    
    Task<TransactionResult> CommitProposalResultsAsync(
        Guid proposalId, string resultsHash, Guid? winningOptionId, 
        decimal totalVotesCast, bool quorumMet, DateTime closedAt,
        CancellationToken ct);
    
    Task<TransactionStatus> GetTransactionStatusAsync(
        string transactionId, CancellationToken ct);
}

public record TransactionResult(
    string TransactionId,
    string? AccountAddress,
    string Status,
    DateTime Timestamp,
    string? ExplorerUrl = null);

public record TransactionStatus(
    string TransactionId,
    string Status,
    int? Confirmations,
    long? BlockNumber,
    DateTime? Timestamp,
    string? ExplorerUrl);
```

### 5.3 Null Adapter (No-Op)

Organizations with `BlockchainType.None` use a null adapter that immediately returns success:

```csharp
public class NullBlockchainAdapter : IBlockchainAdapter
{
    public Task<TransactionResult> CreateOrganizationAsync(..., CancellationToken ct)
    {
        return Task.FromResult(new TransactionResult(
            TransactionId: "null-adapter-no-op",
            AccountAddress: null,
            Status: "skipped",
            Timestamp: DateTime.UtcNow));
    }
    
    // All other methods return similar no-op results
}
```

### 5.4 Service Discovery

**Development (Docker Compose):**
- Adapters exposed on `http://solana-adapter:3001` and `http://polygon-adapter:3002`
- Configured via `docker-compose.yml` service names
- Backend resolves via Docker DNS

**Production (Kubernetes):**
- Adapters deployed as separate Deployments with Services
- Service discovery via Kubernetes DNS: `http://solana-adapter.default.svc.cluster.local:80`
- Configured via environment variables or ConfigMap
- Optional: Service mesh (Istio, Linkerd) for advanced routing

---

## 6. Failure Handling and Circuit Breaker

### 6.1 Failure Scenarios

| Failure Scenario | Impact | Mitigation |
|------------------|--------|------------|
| **Adapter container down** | Blockchain operations fail; main app operational | Circuit breaker opens; return graceful error |
| **Blockchain RPC timeout** | Slow/failed transactions | Timeout policy (30s); retry with backoff |
| **Blockchain network congestion** | High latency or dropped transactions | Exponential backoff; queue for later retry |
| **Invalid request (400)** | Immediate failure | Return error to user; do not retry |
| **Rate limit (429)** | Temporary failure | Backoff and retry after rate limit window |

### 6.2 Polly Resilience Policies

Use Polly library for retry, timeout, and circuit breaker:

```csharp
// In DependencyInjection.cs
services.AddHttpClient("SolanaAdapter")
    .AddPolicyHandler(GetRetryPolicy())
    .AddPolicyHandler(GetCircuitBreakerPolicy())
    .AddPolicyHandler(GetTimeoutPolicy());

// Retry policy: 3 retries with exponential backoff
static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .OrResult(msg => msg.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
            onRetry: (outcome, timespan, retryAttempt, context) =>
            {
                logger.LogWarning(
                    "Retry {RetryAttempt} after {Delay}s due to {StatusCode}",
                    retryAttempt, timespan.TotalSeconds, outcome.Result?.StatusCode);
            });
}

// Circuit breaker: Open after 5 failures, half-open after 30s
static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30),
            onBreak: (outcome, breakDelay) =>
            {
                logger.LogError(
                    "Circuit breaker opened due to {FailureCount} failures. Break duration: {BreakDelay}s",
                    5, breakDelay.TotalSeconds);
            },
            onReset: () =>
            {
                logger.LogInformation("Circuit breaker reset");
            },
            onHalfOpen: () =>
            {
                logger.LogInformation("Circuit breaker half-open, testing...");
            });
}

// Timeout policy: 30s default
static IAsyncPolicy<HttpResponseMessage> GetTimeoutPolicy()
{
    return Policy.TimeoutAsync<HttpResponseMessage>(TimeSpan.FromSeconds(30));
}
```

### 6.3 Fallback Strategy

When blockchain operations fail:

1. **Log Structured Error:** Include correlation ID, org ID, operation type, error details
2. **Return User-Friendly Error:** RFC 7807 ProblemDetails with retry guidance
3. **Main App Continues:** Blockchain failure does not crash or block main application
4. **Optional:** Queue operation for background retry (similar to webhook delivery)

**Example Error Response:**
```json
{
  "type": "https://fanengagement.io/errors/blockchain-unavailable",
  "title": "Blockchain Operation Failed",
  "status": 503,
  "detail": "Solana adapter is temporarily unavailable. Your governance action was recorded in the database. Blockchain verification will be attempted in the background.",
  "instance": "/proposals/123/votes",
  "correlationId": "abc-123-def"
}
```

### 6.4 Background Retry Queue (Optional Future Enhancement)

Similar to webhook delivery pattern:

- Create `BlockchainOperation` table to queue failed operations
- Background service polls queue and retries operations
- Status: `Pending`, `Success`, `Failed`
- Include retry count and last error message
- Admin UI to view and manually retry failed operations

---

## 7. Security Model

### 7.1 Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|----------------|
| **API Key (Shared Secret)** | Dev/staging; simple authentication | Adapter validates `X-Adapter-API-Key` header |
| **JWT (Signed Token)** | Production; scoped permissions | Backend signs JWT; adapter validates signature |
| **Mutual TLS (mTLS)** | Production; highest security | Both backend and adapter present certificates |
| **Service Mesh Auth** | Kubernetes with Istio/Linkerd | Service mesh handles authentication; adapter trusts mesh |

**Recommendation:** Start with API key for MVP; migrate to JWT or mTLS for production.

### 7.2 API Key Authentication Flow

```
┌──────────┐                     ┌──────────┐                     ┌──────────┐
│ Backend  │                     │ Adapter  │                     │ Blockchain│
│   API    │                     │Container │                     │ Network  │
└────┬─────┘                     └────┬─────┘                     └────┬─────┘
     │                                │                                │
     │  POST /v1/adapter/votes        │                                │
     │  X-Adapter-API-Key: secret123  │                                │
     ├───────────────────────────────>│                                │
     │                                │                                │
     │                           ┌────▼────┐                           │
     │                           │ Validate │                           │
     │                           │ API Key  │                           │
     │                           └────┬────┘                           │
     │                                │                                │
     │                                │  Submit transaction            │
     │                                ├───────────────────────────────>│
     │                                │                                │
     │                                │<───────────────────────────────┤
     │                                │  Transaction ID                │
     │                                │                                │
     │<───────────────────────────────┤                                │
     │  200 OK { transactionId: ... } │                                │
     │                                │                                │
```

### 7.3 Blockchain Private Key Management

**Critical Security Requirements:**

- Private keys **NEVER** stored in backend database
- Private keys **NEVER** transmitted via API
- Private keys stored in adapter containers using secure methods
- Each adapter manages its own signing keys

**Key Storage Options:**

| Option | Security Level | Complexity | Cost |
|--------|----------------|------------|------|
| **Environment Variable** | Low (dev only) | Very Low | Free |
| **Docker Secrets** | Medium (staging) | Low | Free |
| **Kubernetes Secrets** | Medium (prod) | Medium | Free |
| **Cloud KMS (AWS/Azure/GCP)** | High (prod) | High | Paid |
| **HashiCorp Vault** | Very High (enterprise) | Very High | Paid/Self-hosted |

**Recommended Approach:**

- **Development:** Environment variable (acceptable for local/dev)
- **Staging:** Docker/Kubernetes Secrets with RBAC
- **Production:** Cloud KMS (AWS KMS, Azure Key Vault, Google Secret Manager)

**Implementation Example (Adapter):**
```typescript
// Solana Adapter - Key Loading
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';

function loadKeypair(): Keypair {
  // Option 1: Load from environment (dev only)
  if (process.env.SOLANA_PRIVATE_KEY) {
    const secretKey = JSON.parse(process.env.SOLANA_PRIVATE_KEY);
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }
  
  // Option 2: Load from file (Docker secret mounted)
  if (process.env.SOLANA_KEYPAIR_FILE) {
    const keypairData = fs.readFileSync(process.env.SOLANA_KEYPAIR_FILE, 'utf-8');
    const secretKey = JSON.parse(keypairData);
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  }
  
  // Option 3: Load from KMS (production)
  if (process.env.AWS_KMS_KEY_ID) {
    // Use AWS KMS to decrypt and retrieve key
    // Implementation depends on KMS SDK
  }
  
  throw new Error('No valid keypair configuration found');
}
```

### 7.4 Network Security

- **Private Network:** Adapters communicate with backend on private network (Docker network or Kubernetes cluster network)
- **Firewall Rules:** Adapters not exposed to public internet; only accessible from backend
- **TLS Termination:** Optional TLS between backend and adapters for added confidentiality
- **Rate Limiting:** Adapters enforce rate limits per API key to prevent abuse

---

## 8. Deployment Models

### 8.1 Development (Docker Compose)

**File:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8080:80"
    environment:
      - ConnectionStrings__DefaultConnection=Host=db;Database=fanengagement;Username=postgres;Password=postgres
      - BlockchainAdapters__Solana__BaseUrl=http://solana-adapter:3001
      - BlockchainAdapters__Polygon__BaseUrl=http://polygon-adapter:3002
    depends_on:
      - db
      - solana-adapter
      - polygon-adapter
    networks:
      - fanengagement-network

  solana-adapter:
    build: ./adapters/solana
    ports:
      - "3001:3001"
    environment:
      - SOLANA_NETWORK=devnet
      - SOLANA_RPC_URL=https://api.devnet.solana.com
      - SOLANA_PRIVATE_KEY=${SOLANA_PRIVATE_KEY}
      - API_KEY=${SOLANA_ADAPTER_API_KEY}
    networks:
      - fanengagement-network

  polygon-adapter:
    build: ./adapters/polygon
    ports:
      - "3002:3002"
    environment:
      - POLYGON_NETWORK=mumbai
      - POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
      - POLYGON_PRIVATE_KEY=${POLYGON_PRIVATE_KEY}
      - API_KEY=${POLYGON_ADAPTER_API_KEY}
    networks:
      - fanengagement-network

  db:
    image: postgres:16
    environment:
      - POSTGRES_DB=fanengagement
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - fanengagement-network

networks:
  fanengagement-network:
    driver: bridge

volumes:
  postgres-data:
```

**Usage:**
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f solana-adapter

# Stop services
docker compose down
```

### 8.2 Production (Kubernetes)

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                          Kubernetes Cluster                     │
│                                                                 │
│  ┌──────────────────┐       ┌──────────────────┐               │
│  │  Backend         │       │  Ingress         │               │
│  │  Deployment      │       │  (nginx/traefik) │               │
│  │  - Replicas: 3   │<──────┤  - TLS           │               │
│  │  - Service       │       │  - Routing       │               │
│  └────────┬─────────┘       └──────────────────┘               │
│           │                                                     │
│           ├──────────┬──────────┬──────────────┐               │
│           │          │          │              │               │
│  ┌────────▼────┐  ┌──▼──────┐  ┌──▼────────┐  ┌▼──────────┐   │
│  │ Solana      │  │ Polygon │  │ PostgreSQL│  │ Redis     │   │
│  │ Adapter     │  │ Adapter │  │ StatefulSet│  │ (cache)   │   │
│  │ Deployment  │  │ Deploy  │  │ - PV       │  │           │   │
│  │ - Replicas:2│  │ - Rep:2 │  │ - Backup   │  │           │   │
│  │ - Service   │  │ - Svc   │  └────────────┘  └───────────┘   │
│  └─────────────┘  └─────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fanengagement-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fanengagement-backend
  template:
    metadata:
      labels:
        app: fanengagement-backend
    spec:
      containers:
      - name: backend
        image: fanengagement/backend:latest
        ports:
        - containerPort: 80
        env:
        - name: ConnectionStrings__DefaultConnection
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: connection-string
        - name: BlockchainAdapters__Solana__BaseUrl
          value: "http://solana-adapter.default.svc.cluster.local"
        - name: BlockchainAdapters__Solana__ApiKey
          valueFrom:
            secretKeyRef:
              name: adapter-secrets
              key: solana-api-key
        - name: BlockchainAdapters__Polygon__BaseUrl
          value: "http://polygon-adapter.default.svc.cluster.local"
        - name: BlockchainAdapters__Polygon__ApiKey
          valueFrom:
            secretKeyRef:
              name: adapter-secrets
              key: polygon-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 80
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: fanengagement-backend
spec:
  selector:
    app: fanengagement-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: ClusterIP
```

**Solana Adapter Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: solana-adapter
spec:
  replicas: 2
  selector:
    matchLabels:
      app: solana-adapter
  template:
    metadata:
      labels:
        app: solana-adapter
    spec:
      containers:
      - name: adapter
        image: fanengagement/solana-adapter:latest
        ports:
        - containerPort: 3001
        env:
        - name: SOLANA_NETWORK
          value: "mainnet-beta"
        - name: SOLANA_RPC_URL
          value: "https://api.mainnet-beta.solana.com"
        - name: SOLANA_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: solana-keypair
              key: private-key
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: adapter-secrets
              key: solana-api-key
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3001
          initialDelaySeconds: 20
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /v1/adapter/health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: solana-adapter
spec:
  selector:
    app: solana-adapter
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: ClusterIP
```

### 8.3 Scaling Strategy

| Scenario | Scaling Approach | Implementation |
|----------|------------------|----------------|
| **High proposal volume** | Scale backend horizontally | Increase `replicas` in backend Deployment |
| **High blockchain transaction volume** | Scale adapter horizontally | Increase `replicas` in adapter Deployment |
| **Specific blockchain congestion** | Scale only affected adapter | Independent scaling per adapter |
| **Database bottleneck** | Vertical scaling or read replicas | Increase PostgreSQL resources or add read replicas |
| **Cost optimization** | Scale down during low-traffic periods | HorizontalPodAutoscaler based on CPU/memory |

**HorizontalPodAutoscaler Example:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: solana-adapter-hpa
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

---

## 9. Monitoring and Logging Strategy

### 9.1 Metrics (Prometheus)

**Adapter Metrics:**

Each adapter exposes Prometheus metrics at `/v1/adapter/metrics`:

```
# Transaction metrics
adapter_transactions_total{status="success|failed", operation="vote|proposal|..."}
adapter_transaction_duration_seconds{operation="vote|proposal|..."}
adapter_rpc_requests_total{status="success|failed"}
adapter_rpc_latency_seconds

# Health metrics
adapter_health_status{blockchain="solana|polygon"}
adapter_last_successful_transaction_timestamp_seconds
```

**Backend Metrics:**

Extend existing `FanEngagementMetrics` service:

```csharp
public class FanEngagementMetrics
{
    private readonly Counter<long> _blockchainOperationsTotal;
    private readonly Histogram<double> _blockchainOperationDuration;
    private readonly Counter<long> _blockchainErrorsTotal;
    
    public FanEngagementMetrics(IMeterFactory meterFactory)
    {
        var meter = meterFactory.Create("FanEngagement");
        
        _blockchainOperationsTotal = meter.CreateCounter<long>(
            "blockchain_operations_total",
            description: "Total blockchain operations by adapter and status");
        
        _blockchainOperationDuration = meter.CreateHistogram<double>(
            "blockchain_operation_duration_seconds",
            description: "Duration of blockchain operations in seconds");
        
        _blockchainErrorsTotal = meter.CreateCounter<long>(
            "blockchain_errors_total",
            description: "Total blockchain errors by adapter and error type");
    }
    
    public void RecordBlockchainOperation(
        string adapterType, string operation, string status, double durationSeconds)
    {
        _blockchainOperationsTotal.Add(1, 
            new KeyValuePair<string, object?>("adapter", adapterType),
            new KeyValuePair<string, object?>("operation", operation),
            new KeyValuePair<string, object?>("status", status));
        
        _blockchainOperationDuration.Record(durationSeconds,
            new KeyValuePair<string, object?>("adapter", adapterType),
            new KeyValuePair<string, object?>("operation", operation));
    }
}
```

### 9.2 Logging (Structured)

**Log Format:**

All adapters and backend use structured JSON logging:

```json
{
  "timestamp": "2024-12-03T12:00:00.123Z",
  "level": "info",
  "message": "Transaction submitted successfully",
  "context": {
    "adapter": "solana",
    "operation": "vote",
    "transactionId": "5j7s9...",
    "organizationId": "uuid",
    "proposalId": "uuid",
    "durationMs": 1234,
    "correlationId": "abc-123"
  }
}
```

**Log Aggregation:**

- **Development:** Console output (Docker Compose logs)
- **Production:** Centralized logging (Loki, Elasticsearch, CloudWatch)
- **Search:** Query by `correlationId`, `organizationId`, `adapter`, `operation`

**Log Levels:**

| Level | Usage | Examples |
|-------|-------|----------|
| **TRACE** | Detailed debugging | RPC request/response bodies |
| **DEBUG** | Development diagnostics | Retry attempts, timeout warnings |
| **INFO** | Normal operations | Transaction submitted, confirmed |
| **WARN** | Recoverable issues | Rate limit hit, retrying |
| **ERROR** | Failures requiring attention | Circuit breaker opened, transaction failed |
| **FATAL** | Critical failures | Adapter startup failed, key not found |

### 9.3 Dashboards (Grafana)

**Adapter Health Dashboard:**

- **Panels:**
  - Transaction success rate (by adapter, operation)
  - Average transaction latency (by adapter)
  - RPC error rate (by adapter)
  - Circuit breaker status (open/closed/half-open)
  - Active connections to blockchain networks

**Governance Operations Dashboard:**

- **Panels:**
  - Proposals created (by organization, by blockchain)
  - Votes recorded (by blockchain)
  - Blockchain vs. database consistency check
  - Failed operations requiring manual retry

### 9.4 Alerting

**Critical Alerts:**

| Alert | Condition | Action |
|-------|-----------|--------|
| **Adapter Down** | Health check fails for >2 minutes | Page on-call engineer |
| **High Error Rate** | >5% transaction failures over 5 minutes | Investigate RPC provider, blockchain congestion |
| **Circuit Breaker Open** | Circuit breaker opened | Check adapter health, RPC status |
| **Slow Transactions** | P95 latency >10s | Check network congestion, RPC performance |
| **Key Expiration** | API key or blockchain key expiring <7 days | Rotate keys |

**Prometheus Alert Rules:**

```yaml
groups:
- name: blockchain_adapters
  interval: 30s
  rules:
  - alert: AdapterDown
    expr: up{job="solana-adapter"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Solana adapter is down"
      description: "Solana adapter has been unreachable for 2 minutes"

  - alert: HighErrorRate
    expr: |
      (rate(adapter_transactions_total{status="failed"}[5m]) 
       / rate(adapter_transactions_total[5m])) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High blockchain transaction error rate"
      description: "Adapter {{ $labels.adapter }} has >5% error rate"

  - alert: CircuitBreakerOpen
    expr: circuit_breaker_state{state="open"} == 1
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Circuit breaker opened for {{ $labels.adapter }}"
      description: "Circuit breaker protecting {{ $labels.adapter }} is open"
```

---

## 10. Testing Strategy

### 10.1 Unit Testing

**Adapter Clients:**

- Mock HTTP responses from adapter API
- Test factory routing logic (correct adapter for blockchain type)
- Test error handling and retry logic
- Test Polly policies (circuit breaker, timeout)

**Example:**
```csharp
[Fact]
public async Task GetAdapterAsync_SolanaOrg_ReturnsSolanaAdapter()
{
    // Arrange
    var org = new Organization 
    { 
        Id = Guid.NewGuid(), 
        BlockchainType = BlockchainType.Solana,
        BlockchainConfig = "{\"adapterUrl\":\"http://solana-adapter:3001\"}"
    };
    var dbContext = CreateInMemoryDbContext();
    await dbContext.Organizations.AddAsync(org);
    await dbContext.SaveChangesAsync();
    
    var factory = new BlockchainAdapterFactory(dbContext, httpClientFactory, config, logger);
    
    // Act
    var adapter = await factory.GetAdapterAsync(org.Id, CancellationToken.None);
    
    // Assert
    Assert.IsType<SolanaAdapterClient>(adapter);
}
```

### 10.2 Integration Testing

**Adapter Contract Tests:**

- Validate adapter implements OpenAPI contract exactly
- Use contract testing tools (Pact, Postman, OpenAPI validators)
- Run against real adapter containers in test environment

**Example:**
```bash
# Run Solana adapter contract tests
docker compose -f docker-compose.test.yml up -d solana-adapter
npx @apidevtools/swagger-cli validate adapters/solana/openapi.yaml
newman run adapters/solana/tests/contract-tests.postman_collection.json
```

**Backend Integration Tests:**

- Use `WebApplicationFactory` with real HTTP calls to adapters
- Mock adapters with WireMock or test doubles
- Test end-to-end: Create proposal → backend → adapter → verify transaction

### 10.3 Load Testing

**Scenarios:**

| Scenario | Target Load | Success Criteria |
|----------|-------------|------------------|
| **Vote Surge** | 1000 votes/minute | <5% error rate, P95 latency <5s |
| **Proposal Creation** | 100 proposals/minute | <1% error rate, P95 latency <10s |
| **Mixed Operations** | 500 ops/minute (mixed types) | <5% error rate, P95 latency <5s |

**Tools:**

- **k6** or **Gatling** for load generation
- **Prometheus** for metrics collection during load tests
- **Grafana** for visualization of performance under load

### 10.4 Chaos Engineering

Test resilience by injecting failures:

- **Kill Adapter Container:** Verify circuit breaker opens, graceful degradation
- **Slow RPC Responses:** Inject latency, verify timeout policy
- **Network Partition:** Disconnect adapter from blockchain, verify error handling
- **Invalid API Keys:** Test authentication failure handling

---

## 11. Migration from E-004 Direct Integration

### 11.1 Differences from E-004

| Aspect | E-004 (Direct Integration) | E-007 (Adapter Platform) |
|--------|---------------------------|--------------------------|
| **Architecture** | Solana client in backend process | Isolated Docker containers |
| **Blockchain Support** | Solana only | Multi-chain (Solana, Polygon, extensible) |
| **Coupling** | Tight coupling with backend code | Loose coupling via API contract |
| **Extensibility** | Requires backend refactor for new chains | Deploy new adapter container |
| **Testing** | Complex (needs Solana test validator in backend tests) | Simpler (mock adapter HTTP API) |
| **Operations** | Backend and blockchain tightly coupled | Independent scaling and deployment |
| **Key Management** | Keys in backend secrets | Keys isolated in adapter containers |

### 11.2 Preserved E-004 Research

The following E-004 deliverables remain valid and inform E-007:

- **Solana Capabilities Analysis:** `/docs/blockchain/solana/solana-capabilities-analysis.md`
- **Governance Models Evaluation:** `/docs/blockchain/solana/governance-models-evaluation.md`
- **ShareType Tokenization Strategy:** `/docs/blockchain/solana/sharetype-tokenization-strategy.md`
- **Key Management Security:** `/docs/blockchain/solana/solana-key-management-security.md`

These documents guide the implementation of the Solana adapter within the new architecture.

### 11.3 Superseded E-004 Stories

The following E-004 stories are superseded by E-007 stories:

- **E-004-10 (Backend Service Architecture)** → **E-007-01 (Adapter Platform Architecture)**
- **E-004-13 (Integrate Solana RPC Client)** → **E-007-04 (Implement Solana Adapter Container)**
- **E-004-19 (Backend Service Wrapping)** → **E-007-04 (Solana Adapter) + E-007-05 (Polygon Adapter)**

All archived E-004 stories in `/docs/product/archive/E-004-*.md` are marked as superseded.

---

## 12. References

### 12.1 Internal Documentation

- **Architecture:** `/docs/architecture.md`
- **Solana Research:**
  - `/docs/blockchain/solana/solana-capabilities-analysis.md`
  - `/docs/blockchain/solana/governance-models-evaluation.md`
  - `/docs/blockchain/solana/sharetype-tokenization-strategy.md`
  - `/docs/blockchain/solana/solana-key-management-security.md`
- **Epic Backlog:** `/docs/product/backlog.md` (E-007)
- **E-004 Archived Stories:** `/docs/product/archive/E-004-*.md`

### 12.2 External References

- **OpenAPI Specification 3.0:** https://spec.openapis.org/oas/v3.0.0
- **RFC 7807 (Problem Details):** https://tools.ietf.org/html/rfc7807
- **Polly Resilience Library:** https://github.com/App-vNext/Polly
- **Prometheus Metrics:** https://prometheus.io/docs/concepts/metric_types/
- **Kubernetes Best Practices:** https://kubernetes.io/docs/concepts/
- **Docker Compose:** https://docs.docker.com/compose/

### 12.3 Blockchain-Specific References

**Solana:**
- Solana Web3.js: https://solana-labs.github.io/solana-web3.js/
- Solana RPC API: https://docs.solana.com/developing/clients/jsonrpc-api
- SPL Token Program: https://spl.solana.com/token

**Polygon:**
- Polygon RPC: https://docs.polygon.technology/
- Ethers.js: https://docs.ethers.io/
- ERC-20 Token Standard: https://eips.ethereum.org/EIPS/eip-20

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-03 | Documentation Agent | Initial architecture specification |

---

## Appendices

### Appendix A: Sample OpenAPI Specification

See: `/docs/blockchain/solana/solana-adapter-api.yaml` (to be created in E-007-02)

### Appendix B: Configuration Examples

**Backend `appsettings.json`:**
```json
{
  "BlockchainAdapters": {
    "Solana": {
      "BaseUrl": "http://solana-adapter:3001",
      "ApiKey": "${SOLANA_ADAPTER_API_KEY}",
      "Timeout": "00:00:30",
      "RetryCount": 3,
      "CircuitBreakerThreshold": 5
    },
    "Polygon": {
      "BaseUrl": "http://polygon-adapter:3002",
      "ApiKey": "${POLYGON_ADAPTER_API_KEY}",
      "Timeout": "00:00:30",
      "RetryCount": 3,
      "CircuitBreakerThreshold": 5
    }
  }
}
```

**Solana Adapter `config.json`:**
```json
{
  "server": {
    "port": 3001,
    "logLevel": "info"
  },
  "blockchain": {
    "network": "devnet",
    "rpcUrl": "https://api.devnet.solana.com",
    "commitment": "confirmed"
  },
  "authentication": {
    "apiKey": "${API_KEY}",
    "requireAuth": true
  },
  "keypair": {
    "source": "environment",
    "envVar": "SOLANA_PRIVATE_KEY"
  }
}
```

### Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Adapter** | Docker container implementing blockchain operations via consistent API |
| **Circuit Breaker** | Pattern that prevents cascading failures by opening when error threshold reached |
| **Factory Pattern** | Design pattern for creating objects; used to route to correct adapter |
| **Null Adapter** | No-op implementation for organizations not using blockchain |
| **OpenAPI Contract** | Standard API specification defining endpoints, schemas, and responses |
| **PDA (Program Derived Address)** | Solana-specific deterministic account address pattern |
| **Polly** | .NET library for resilience policies (retry, circuit breaker, timeout) |
| **RPC Provider** | Service providing JSON-RPC interface to blockchain network |
| **SPL Token** | Solana Program Library token standard for fungible tokens |
| **ERC-20** | Ethereum Request for Comment 20, fungible token standard |

---

**End of Document**
