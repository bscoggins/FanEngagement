---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-02: Define Solana Adapter API Contract (OpenAPI)"
labels: ["development", "copilot", "blockchain", "solana", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent** (documentation only).  
> This is an API specification task with NO production code changes.

---

## 1. Summary

Define the OpenAPI 3.0 specification for the Solana blockchain adapter. This contract defines all endpoints, request/response schemas, authentication, and error handling that the Solana adapter container must implement.

---

## 2. Requirements

- Create OpenAPI 3.0 specification for Solana adapter
- Define all required endpoints (organization creation, token minting, proposal management, voting)
- Define request/response schemas with validation rules (required fields, types, constraints)
- Define error responses and status codes (4xx, 5xx with Problem Details format)
- Document authentication mechanism (API key, JWT, or mutual TLS)
- Include example requests/responses for each endpoint
- Validate OpenAPI spec with validator tools (Swagger Editor or openapi-generator)
- Leverage existing Solana research from `/docs/blockchain/solana/` to inform endpoint design

---

## 3. Acceptance Criteria (Testable)

- [ ] OpenAPI 3.0 specification created at `docs/blockchain/solana/solana-adapter-api.yaml`
- [ ] All endpoints defined:
  - `POST /v1/adapter/organizations`
  - `POST /v1/adapter/share-types`
  - `POST /v1/adapter/share-issuances`
  - `POST /v1/adapter/proposals`
  - `POST /v1/adapter/votes`
  - `POST /v1/adapter/proposal-results`
  - `GET /v1/adapter/transactions/{txId}`
  - `GET /v1/adapter/health`
  - `GET /v1/adapter/metrics`
- [ ] Request schemas defined with required fields, types, and validation
- [ ] Response schemas defined (success 2xx, error 4xx/5xx)
- [ ] Error responses follow RFC 7807 Problem Details format
- [ ] Authentication/security scheme documented (API Key, OAuth2, or mutual TLS)
- [ ] Example requests/responses included for each endpoint
- [ ] OpenAPI spec validates successfully (no errors in Swagger Editor)
- [ ] Referenced by E-007 epic in `docs/product/backlog.md`
- [ ] Links to Solana-specific documentation where appropriate

---

## 4. Constraints

- NO production code changes (OpenAPI spec only)
- Must align with adapter architecture from E-007-01
- Endpoint structure should be blockchain-agnostic where possible (enable Polygon adapter consistency)
- Follow OpenAPI 3.0 best practices (components, schemas, reusable definitions)
- Solana-specific fields should be clearly documented (e.g., transaction signatures, blockhash)

---

## 5. Technical Notes (Optional)

**Reference Existing Documentation:**
- `/docs/blockchain/solana/solana-capabilities-analysis.md` - Transaction costs, SPL tokens
- `/docs/blockchain/solana/governance-models-evaluation.md` - On-chain vs. off-chain voting
- `/docs/blockchain/solana/sharetype-tokenization-strategy.md` - Token minting, metadata
- `/docs/blockchain/solana/solana-key-management-security.md` - Key management, PDAs
- E-007-01 adapter architecture (once complete)

**Endpoint Design Guidance:**

1. **POST /v1/adapter/organizations**
   - Request: `{ organizationId: uuid, name: string, description?: string }`
   - Response: `{ transactionSignature: string, accountAddress: string }`
   - Creates Program Derived Address (PDA) for organization on Solana

2. **POST /v1/adapter/share-types**
   - Request: `{ shareTypeId: uuid, organizationId: uuid, name: string, symbol: string, votingWeight: number, maxSupply?: number, isTransferable: boolean }`
   - Response: `{ transactionSignature: string, mintAddress: string }`
   - Creates SPL token mint for the ShareType

3. **POST /v1/adapter/share-issuances**
   - Request: `{ issuanceId: uuid, shareTypeId: uuid, userId: uuid, quantity: number, walletAddress?: string }`
   - Response: `{ transactionSignature: string, tokenAccountAddress: string }`
   - Mints SPL tokens to user's wallet or associated token account

4. **POST /v1/adapter/proposals**
   - Request: `{ proposalId: uuid, organizationId: uuid, title: string, description: string, startAt: datetime, endAt: datetime, eligibleShareTypeIds: uuid[] }`
   - Response: `{ transactionSignature: string, proposalAccountAddress: string }`
   - Creates on-chain proposal account (or memo transaction if off-chain voting)

5. **POST /v1/adapter/votes**
   - Request: `{ voteId: uuid, proposalId: uuid, userId: uuid, optionId: uuid, votingPower: number }`
   - Response: `{ transactionSignature: string }`
   - Records vote on-chain (or skips if off-chain voting model)

6. **POST /v1/adapter/proposal-results**
   - Request: `{ proposalId: uuid, resultsHash: string, winningOptionId: uuid, totalVotes: number }`
   - Response: `{ transactionSignature: string }`
   - Commits proposal results hash to Solana (verifiable commitment)

7. **GET /v1/adapter/transactions/{txId}**
   - Response: `{ signature: string, status: 'pending' | 'confirmed' | 'finalized' | 'failed', blockTime?: number, confirmations: number, error?: string }`
   - Queries Solana transaction status

8. **GET /v1/adapter/health**
   - Response: `{ status: 'healthy' | 'degraded' | 'unhealthy', checks: { rpc: boolean, keypair: boolean }, timestamp: datetime }`
   - Health check for adapter service

9. **GET /v1/adapter/metrics**
   - Response: Prometheus text format
   - Metrics: `solana_transactions_total`, `solana_transaction_duration_seconds`, `solana_rpc_errors_total`

**Authentication:**

Consider API Key in header:
```yaml
securitySchemes:
  ApiKeyAuth:
    type: apiKey
    in: header
    name: X-API-Key
```

**Error Response Schema (RFC 7807):**

```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      required:
        - type
        - title
        - status
      properties:
        type:
          type: string
          format: uri
          description: URI identifying the problem type
        title:
          type: string
          description: Short human-readable summary
        status:
          type: integer
          description: HTTP status code
        detail:
          type: string
          description: Human-readable explanation
        instance:
          type: string
          description: URI identifying the specific occurrence
        transactionSignature:
          type: string
          description: Solana transaction signature (if applicable)
```

**Example OpenAPI Structure:**

```yaml
openapi: 3.0.3
info:
  title: Solana Blockchain Adapter API
  version: 1.0.0
  description: |
    API specification for the Solana blockchain adapter container.
    This adapter provides blockchain functionality for FanEngagement organizations
    that have selected Solana as their blockchain platform.

servers:
  - url: http://localhost:3001/v1
    description: Local development
  - url: https://solana-adapter.fanengagement.io/v1
    description: Production

security:
  - ApiKeyAuth: []

paths:
  /adapter/organizations:
    post:
      summary: Create organization on Solana
      operationId: createOrganization
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateOrganizationRequest'
      responses:
        '201':
          description: Organization created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateOrganizationResponse'
        '400':
          description: Bad request
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'
        '503':
          description: Solana RPC unavailable
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProblemDetails'

components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      
  schemas:
    CreateOrganizationRequest:
      type: object
      required:
        - organizationId
        - name
      properties:
        organizationId:
          type: string
          format: uuid
          description: FanEngagement organization UUID
        name:
          type: string
          minLength: 1
          maxLength: 100
        description:
          type: string
          maxLength: 500
          
    CreateOrganizationResponse:
      type: object
      required:
        - transactionSignature
        - accountAddress
      properties:
        transactionSignature:
          type: string
          description: Solana transaction signature
          example: "5J8..." 
        accountAddress:
          type: string
          description: Solana account address (PDA)
          example: "7xK..."
```

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only, OpenAPI spec creation)

---

## 7. Files Allowed to Change

**New Files:**
- `docs/blockchain/solana/solana-adapter-api.yaml` (primary deliverable)

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Complete OpenAPI 3.0 specification in YAML format
- All 9 endpoints fully defined with request/response schemas
- Authentication scheme documented
- Error responses following RFC 7807 Problem Details
- Example requests/responses for key endpoints
- Specification validates successfully in Swagger Editor
- No linting errors or warnings
- Solana-specific fields and concepts clearly documented
- Ready for developer review and Solana adapter implementation (E-007-04)
