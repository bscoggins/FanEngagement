---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-03: Define Polygon Adapter API Contract (OpenAPI)"
labels: ["development", "copilot", "blockchain", "polygon", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent** (documentation only).

---

## 1. Summary

Define the OpenAPI 3.0 specification for the Polygon blockchain adapter, mirroring the structure of the Solana adapter (E-007-02) to ensure consistency across blockchain implementations.

---

## 2. Requirements

- Create OpenAPI 3.0 specification for Polygon adapter
- Ensure endpoint structure matches Solana adapter contract
- Define Polygon-specific parameters (gas estimation, network selection: Mumbai testnet vs. Polygon mainnet)
- Define request/response schemas aligned with Solana adapter
- Document authentication mechanism (consistent with Solana adapter)
- Include example requests/responses for each endpoint
- Validate OpenAPI spec with validator tools

---

## 3. Acceptance Criteria (Testable)

- [ ] OpenAPI 3.0 specification created at `docs/blockchain/polygon/polygon-adapter-api.yaml`
- [ ] All endpoints defined (matching Solana adapter structure):
  - `POST /v1/adapter/organizations`
  - `POST /v1/adapter/share-types`
  - `POST /v1/adapter/share-issuances`
  - `POST /v1/adapter/proposals`
  - `POST /v1/adapter/votes`
  - `POST /v1/adapter/proposal-results`
  - `GET /v1/adapter/transactions/{txId}`
  - `GET /v1/adapter/health`
  - `GET /v1/adapter/metrics`
- [ ] Request/response schemas match Solana adapter (with Polygon-specific fields where needed)
- [ ] Polygon-specific fields documented:
  - `gasEstimate` (estimated gas for transaction)
  - `gasPrice` (current gas price in GWEI)
  - `network` (mumbai, polygon)
  - `contractAddress` (ERC-20 token or governance contract address)
- [ ] Error responses follow RFC 7807 Problem Details format
- [ ] Authentication scheme matches Solana adapter (API Key)
- [ ] Example requests/responses included for each endpoint
- [ ] OpenAPI spec validates successfully (Swagger Editor)
- [ ] Referenced by E-007 epic in `docs/product/backlog.md`

---

## 4. Constraints

- NO production code changes (OpenAPI spec only)
- Must maintain consistency with Solana adapter API structure (E-007-02)
- Polygon-specific fields should be clearly marked and documented
- Follow OpenAPI 3.0 best practices

---

## 5. Technical Notes (Optional)

**Reference:**
- E-007-02 Solana adapter API specification (use as template)
- E-007-01 adapter architecture document
- Future E-007-06 Polygon documentation (may not exist yet; use Polygon docs online)

**Key Polygon Differences from Solana:**

1. **Transaction Model:**
   - Polygon: EVM-based, uses transaction hash (0x...) instead of signature
   - Gas fees: estimated gas and gas price (dynamic)
   - Confirmations: block confirmations (6+ for finality)

2. **Token Standard:**
   - Polygon: ERC-20 tokens instead of SPL tokens
   - Token address: Ethereum-style address (0x...)
   - Decimals: typically 18 (vs. Solana's variable decimals)

3. **Smart Contracts:**
   - May require custom smart contract deployment for proposal results commitment
   - Contract address returned in responses

4. **Network Selection:**
   - Request should include `network` parameter: `mumbai` (testnet) or `polygon` (mainnet)

**Example Polygon-Specific Response:**

```yaml
CreateShareTypeResponse:
  type: object
  required:
    - transactionHash
    - tokenAddress
    - gasUsed
  properties:
    transactionHash:
      type: string
      description: Ethereum-style transaction hash
      example: "0x5e8f..."
    tokenAddress:
      type: string
      description: ERC-20 token contract address
      example: "0x7a2b..."
    gasUsed:
      type: integer
      description: Actual gas consumed by transaction
      example: 145000
    blockNumber:
      type: integer
      description: Block number where transaction was included
```

---

## 6. Desired Agent

- [x] **docs-agent** (documentation only, OpenAPI spec creation)

---

## 7. Files Allowed to Change

**New Files:**
- `docs/blockchain/polygon/polygon-adapter-api.yaml` (primary deliverable)

**Optional:**
- Create `docs/blockchain/polygon/` directory if it doesn't exist

---

## 8. Completion Criteria

- Complete OpenAPI 3.0 specification in YAML format
- All 9 endpoints defined with Polygon-specific adaptations
- Consistency with Solana adapter API structure maintained
- Polygon-specific fields (gas, network, contract addresses) documented
- Specification validates successfully
- Ready for Polygon adapter implementation (E-007-05)
