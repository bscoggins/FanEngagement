---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-01: Design Multi-Chain Adapter Architecture"
labels: ["development", "copilot", "blockchain", "architecture", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent** (documentation only).  
> This is an architecture/design task with NO production code changes.

---

## 1. Summary

Design the multi-chain adapter architecture for FanEngagement, defining how isolated Docker containers will provide blockchain functionality through consistent APIs. This is a foundational architecture specification that guides all subsequent adapter implementation stories.

---

## 2. Requirements

- Document adapter container architecture (Docker, API gateway pattern)
- Define OpenAPI contract structure for blockchain adapter interface
- Design organization blockchain selection mechanism (database schema additions)
- Define adapter discovery and routing strategy in backend
- Design failure handling and circuit breaker patterns
- Document adapter-to-backend communication security
- Define adapter deployment model (Kubernetes, Docker Compose, or both)
- Consider service mesh, API versioning, monitoring, and logging aggregation

---

## 3. Acceptance Criteria (Testable)

- [ ] Architecture document created at `docs/blockchain/adapter-platform-architecture.md`
- [ ] Document includes system architecture diagram (ASCII or reference to diagram tool)
- [ ] OpenAPI contract structure defined (endpoints, schemas, authentication)
- [ ] Database schema changes specified for organization blockchain selection
- [ ] Adapter routing strategy documented (factory pattern, service discovery)
- [ ] Failure handling patterns documented (circuit breaker, fallback, timeouts)
- [ ] Security model documented (API keys, mutual TLS, or service mesh auth)
- [ ] Deployment models documented (Docker Compose for dev, Kubernetes for prod)
- [ ] Monitoring and logging strategy documented
- [ ] Document follows existing FanEngagement documentation style
- [ ] Referenced by E-007 epic in `docs/product/backlog.md`

---

## 4. Constraints

- NO production code changes (documentation only)
- Follow FanEngagement architectural principles (layered architecture, DI, async)
- Align with existing backend patterns (service interfaces, background workers)
- Must support multiple blockchain types (Solana, Polygon, future additions)
- Must enable independent adapter deployment and scaling
- Must maintain backward compatibility (organizations without blockchain continue working)

---

## 5. Technical Notes (Optional)

**Reference Existing Documentation:**
- `/docs/architecture.md` - Current FanEngagement architecture
- `/docs/blockchain/solana/` - Solana research and capabilities
- E-004 archived stories in `/docs/product/archive/E-004-*.md`

**Key Design Considerations:**

1. **Adapter Container Architecture:**
   - One container per blockchain type
   - Exposes HTTP REST API (consistent contract)
   - Stateless (no local storage of keys in container)
   - Health check and metrics endpoints

2. **Backend Integration:**
   - `Organization.BlockchainType` enum field
   - `IBlockchainAdapterFactory` for routing requests
   - HTTP client with retry, timeout, circuit breaker (Polly library)
   - Async operations with cancellation token

3. **API Contract:**
   - OpenAPI 3.0 specification
   - Versioned endpoints (`/v1/adapter/...`)
   - Standard error responses (RFC 7807 Problem Details)
   - Authentication header (API key or JWT)

4. **Security:**
   - Adapter-to-backend authentication (mutual TLS or API keys)
   - Blockchain private keys stored in adapter (not in main backend)
   - Secrets management (Docker secrets, Kubernetes secrets, or cloud KMS)

5. **Failure Handling:**
   - Circuit breaker: Trip after N failures, half-open retry
   - Fallback: Degrade gracefully (blockchain unavailable, operations queued)
   - Timeout: 30s default for blockchain operations
   - Retry: Exponential backoff for transient failures

6. **Deployment:**
   - Docker Compose: Dev/local testing (all containers on same network)
   - Kubernetes: Production (separate deployments, services, ingress)
   - Adapter discovery: Environment variables or service discovery

**Architecture Diagram (Suggested):**

```
┌─────────────────────────────────────────────────────────────────┐
│                  FanEngagement Backend API                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Organization Service                                    │   │
│  │  - Stores BlockchainType (enum: None, Solana, Polygon)  │   │
│  │  - Stores BlockchainConfig (JSON: RPC URLs, keys)       │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│  ┌─────────────────────▼───────────────────────────────────┐   │
│  │  IBlockchainAdapterFactory                              │   │
│  │  - GetAdapter(organizationId) → IBlockchainAdapter      │   │
│  └─────────────────────┬───────────────────────────────────┘   │
│                        │                                        │
│         ┌──────────────┼──────────────┐                        │
│         │              │              │                        │
│    ┌────▼────┐    ┌────▼────┐   ┌────▼────┐                  │
│    │ Solana  │    │ Polygon │   │  Null   │                  │
│    │ Adapter │    │ Adapter │   │ Adapter │                  │
│    │ Client  │    │ Client  │   │ (no-op) │                  │
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
```

**Suggested OpenAPI Endpoints (all adapters must implement):**

- `POST /v1/adapter/organizations` - Create on-chain org representation
- `POST /v1/adapter/share-types` - Create token mint for ShareType
- `POST /v1/adapter/share-issuances` - Record share issuance on-chain
- `POST /v1/adapter/proposals` - Create on-chain proposal
- `POST /v1/adapter/votes` - Record vote on-chain
- `POST /v1/adapter/proposal-results` - Commit proposal results hash on-chain
- `GET /v1/adapter/transactions/{txId}` - Query transaction status
- `GET /v1/adapter/health` - Health check
- `GET /v1/adapter/metrics` - Prometheus metrics

**Error Handling Strategy:**

```json
{
  "type": "https://fanengagement.io/errors/blockchain-unavailable",
  "title": "Blockchain Adapter Unavailable",
  "status": 503,
  "detail": "Solana adapter is currently unavailable. Transaction queued for retry.",
  "instance": "/organizations/123/proposals/456",
  "transactionId": "abc-123-def"
}
```

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only, no code changes)

---

## 7. Files Allowed to Change

**New Files:**
- `docs/blockchain/adapter-platform-architecture.md` (primary deliverable)

**Optional Updates:**
- `docs/architecture.md` (add reference to adapter platform)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Comprehensive architecture document in Markdown
- System architecture diagrams (ASCII art or PlantUML/Mermaid)
- Clear API contract specification
- Database schema changes specified
- Failure handling and security patterns documented
- Deployment model documented (dev and prod)
- Monitoring and operational considerations addressed
- Document is ready for architect review and approval
