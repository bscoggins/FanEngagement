---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-04: Implement Solana Adapter Container"
labels: ["development", "copilot", "blockchain", "solana", "docker", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement the Solana blockchain adapter as a containerized service that implements the OpenAPI contract defined in E-007-02. This adapter handles all Solana blockchain interactions for FanEngagement organizations that have selected Solana as their blockchain platform.

---

## 2. Requirements

- Create Dockerfile for Solana adapter service
- Implement all endpoints from Solana adapter OpenAPI contract (E-007-02)
- Integrate Solana RPC client (Solana Web3.js for Node.js OR Solnet for .NET)
- Implement retry logic with exponential backoff for RPC operations
- Implement structured logging (JSON format, log levels)
- Implement Prometheus metrics endpoint (`/metrics`)
- Implement health check endpoint (`/health`)
- Add comprehensive error handling with standard error responses (RFC 7807)
- Add integration tests using Solana test validator
- Create docker-compose.yml for local development

---

## 3. Acceptance Criteria (Testable)

- [ ] Dockerfile created for Solana adapter
- [ ] All 9 endpoints from OpenAPI contract implemented:
  - `POST /v1/adapter/organizations`
  - `POST /v1/adapter/share-types`
  - `POST /v1/adapter/share-issuances`
  - `POST /v1/adapter/proposals`
  - `POST /v1/adapter/votes`
  - `POST /v1/adapter/proposal-results`
  - `GET /v1/adapter/transactions/{txId}`
  - `GET /v1/adapter/health`
  - `GET /v1/adapter/metrics`
- [ ] Solana RPC client integrated (Web3.js or Solnet)
- [ ] PDA (Program Derived Address) generation for organizations implemented
- [ ] SPL token mint creation for ShareTypes implemented
- [ ] Token minting for share issuances implemented
- [ ] Transaction submission with retry and error handling
- [ ] Structured logging with transaction signatures, operation types, errors
- [ ] Prometheus metrics exposed at `/metrics`:
  - `solana_transactions_total{operation,status}`
  - `solana_transaction_duration_seconds{operation}`
  - `solana_rpc_errors_total{error_type}`
- [ ] Health check returns RPC connectivity and keypair validation status
- [ ] Integration tests using `solana-test-validator`
- [ ] docker-compose.yml includes Solana adapter and test validator
- [ ] Documentation created at `docs/blockchain/solana/solana-adapter-deployment.md`
- [ ] All tests pass

---

## 4. Constraints

- Must follow backend layering principles where applicable
- Use Node.js/TypeScript OR .NET (recommend Node.js for Solana ecosystem)
- Docker image must be optimized (multi-stage build, minimal base image)
- Secrets (keypairs) must not be hardcoded; use environment variables
- Must support Solana devnet, testnet, and mainnet-beta (configurable via env var)
- Stateless service (no local storage; keys from environment or secrets manager)

---

## 5. Technical Notes (Optional)

**Reference Documentation:**
- E-007-02: Solana adapter OpenAPI contract
- `/docs/blockchain/solana/solana-capabilities-analysis.md`
- `/docs/blockchain/solana/sharetype-tokenization-strategy.md`
- `/docs/blockchain/solana/solana-key-management-security.md`

**Technology Stack (Recommended):**
- **Language:** Node.js 20 with TypeScript
- **Framework:** Express.js or Fastify
- **Solana SDK:** `@solana/web3.js` and `@solana/spl-token`
- **Logging:** Winston or Pino (JSON format)
- **Metrics:** `prom-client` (Prometheus client)
- **Validation:** Zod or Joi for request validation
- **Testing:** Jest with Solana test validator

**Key Implementation Details:**

1. **Environment Variables:**
   ```
   SOLANA_RPC_URL=http://localhost:8899  # or devnet/mainnet
   SOLANA_KEYPAIR_PATH=/secrets/keypair.json
   API_KEY=secret-api-key-here
   PORT=3001
   LOG_LEVEL=info
   ```

2. **PDA Derivation (Organizations):**
   ```typescript
   const [orgPda, bump] = await PublicKey.findProgramAddress(
     [
       Buffer.from("organization"),
       Buffer.from(organizationId.replace(/-/g, ''), 'hex')
     ],
     PROGRAM_ID
   );
   ```

3. **SPL Token Mint Creation (ShareTypes):**
   ```typescript
   const mint = await createMint(
     connection,
     payer,
     mintAuthority,
     freezeAuthority,
     decimals
   );
   ```

4. **Retry Logic:**
   - Use exponential backoff: 1s, 2s, 4s, 8s
   - Retry on RPC errors: connection timeout, rate limit (429)
   - Don't retry on: invalid parameters (400)

5. **Dockerfile (Multi-Stage Build):**
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:20-alpine
   WORKDIR /app
   COPY --from=builder /app/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   EXPOSE 3001
   CMD ["node", "dist/index.js"]
   ```

6. **docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     solana-test-validator:
       image: solanalabs/solana:latest
       command: solana-test-validator --no-bpf-jit --reset
       ports:
         - "8899:8899"
     
     solana-adapter:
       build: ./solana-adapter
       ports:
         - "3001:3001"
       environment:
         - SOLANA_RPC_URL=http://solana-test-validator:8899
         - SOLANA_KEYPAIR_PATH=/app/keypair.json
         - API_KEY=dev-api-key
       depends_on:
         - solana-test-validator
   ```

**Testing Strategy:**
- Unit tests: Mock Solana connection, test business logic
- Integration tests: Use `solana-test-validator`, test real transactions
- Contract tests: Validate responses match OpenAPI spec

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

**New Files:**
- `adapters/solana/` (new directory for Solana adapter code)
- `adapters/solana/Dockerfile`
- `adapters/solana/docker-compose.yml`
- `adapters/solana/package.json`
- `adapters/solana/src/**/*.ts` (TypeScript source files)
- `adapters/solana/tests/**/*.test.ts` (test files)
- `docs/blockchain/solana/solana-adapter-deployment.md`

---

## 8. Completion Criteria

- Solana adapter container builds successfully
- All endpoints functional and tested
- Integration tests pass with solana-test-validator
- Docker Compose brings up working local environment
- Documentation complete for deployment and operations
- Code follows best practices (error handling, logging, security)
