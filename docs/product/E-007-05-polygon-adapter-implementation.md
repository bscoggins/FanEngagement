---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-05: Implement Polygon Adapter Container"
labels: ["development", "copilot", "blockchain", "polygon", "docker", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Implement the Polygon blockchain adapter as a containerized service that implements the OpenAPI contract defined in E-007-03. This adapter handles all Polygon blockchain interactions for FanEngagement organizations that have selected Polygon as their blockchain platform.

---

## 2. Requirements

- Create Dockerfile for Polygon adapter service
- Implement all endpoints from Polygon adapter OpenAPI contract (E-007-03)
- Integrate Polygon/Ethereum RPC client (Ethers.js or Web3.js for Node.js, OR Nethereum for .NET)
- Implement or deploy smart contract for governance operations (if needed for proposal results commitment)
- Deploy smart contract to Polygon Mumbai testnet
- Implement retry logic with exponential backoff for RPC operations
- Implement structured logging (JSON format, log levels)
- Implement Prometheus metrics endpoint (`/metrics`)
- Implement health check endpoint (`/health`)
- Add comprehensive error handling with standard error responses (RFC 7807)
- Add integration tests using Polygon Mumbai testnet
- Create docker-compose.yml for local development

---

## 3. Acceptance Criteria (Testable)

- [ ] Dockerfile created for Polygon adapter
- [ ] All 9 endpoints from OpenAPI contract implemented (matching Solana adapter structure)
- [ ] Polygon RPC client integrated (Ethers.js, Web3.js, or Nethereum)
- [ ] ERC-20 token deployment for ShareTypes implemented
- [ ] Token minting for share issuances implemented
- [ ] Smart contract deployed to Mumbai testnet (if needed for governance)
- [ ] Transaction submission with retry and error handling
- [ ] Gas estimation and gas price tracking implemented
- [ ] Structured logging with transaction hashes, operation types, errors
- [ ] Prometheus metrics exposed at `/metrics`:
  - `polygon_transactions_total{operation,status}`
  - `polygon_transaction_duration_seconds{operation}`
  - `polygon_rpc_errors_total{error_type}`
  - `polygon_gas_used_total{operation}`
- [ ] Health check returns RPC connectivity and wallet validation status
- [ ] Integration tests using Polygon Mumbai testnet
- [ ] docker-compose.yml includes Polygon adapter
- [ ] Documentation created at `docs/blockchain/polygon/polygon-adapter-deployment.md`
- [ ] All tests pass

---

## 4. Constraints

- Must follow same architecture pattern as Solana adapter (E-007-04)
- Use Node.js/TypeScript OR .NET (should match Solana adapter technology)
- Docker image must be optimized (multi-stage build, minimal base image)
- Secrets (private keys) must not be hardcoded; use environment variables
- Must support Mumbai testnet and Polygon mainnet (configurable via env var)
- Stateless service (no local storage; keys from environment or secrets manager)

---

## 5. Technical Notes (Optional)

**Reference Documentation:**
- E-007-03: Polygon adapter OpenAPI contract
- E-007-04: Solana adapter implementation (use as architectural template)
- E-007-06: Polygon documentation (may not exist yet; use online docs)

**Technology Stack (Recommended):**
- **Language:** Node.js 20 with TypeScript (match Solana adapter)
- **Framework:** Express.js or Fastify
- **Ethereum SDK:** `ethers.js` v6
- **Smart Contracts:** Solidity (if custom governance contract needed)
- **Logging:** Winston or Pino (JSON format)
- **Metrics:** `prom-client` (Prometheus client)
- **Validation:** Zod or Joi
- **Testing:** Jest with Mumbai testnet or Hardhat Network

**Key Implementation Details:**

1. **Environment Variables:**
   ```
   POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
   POLYGON_PRIVATE_KEY=0x...
   GOVERNANCE_CONTRACT_ADDRESS=0x...
   API_KEY=secret-api-key-here
   PORT=3002
   LOG_LEVEL=info
   NETWORK=mumbai  # or polygon for mainnet
   ```

2. **ERC-20 Token Deployment (ShareTypes):**
   ```typescript
   const factory = new ethers.ContractFactory(ERC20_ABI, ERC20_BYTECODE, wallet);
   const token = await factory.deploy(name, symbol, decimals, maxSupply);
   await token.waitForDeployment();
   ```

3. **Gas Estimation:**
   ```typescript
   const gasEstimate = await contract.estimateGas.mint(to, amount);
   const gasPrice = await provider.getFeeData();
   ```

4. **Smart Contract Consideration:**
   - For proposal results commitment, may need simple smart contract:
   ```solidity
   contract GovernanceRegistry {
     mapping(bytes32 => bytes32) public proposalResults;
     
     function commitResults(bytes32 proposalId, bytes32 resultsHash) external {
       proposalResults[proposalId] = resultsHash;
       emit ResultsCommitted(proposalId, resultsHash);
     }
   }
   ```
   - Deploy to Mumbai testnet, store contract address in env var

5. **Dockerfile:**
   - Similar to Solana adapter, multi-stage build
   - Expose port 3002 (different from Solana's 3001)

6. **docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     polygon-adapter:
       build: ./polygon-adapter
       ports:
         - "3002:3002"
       environment:
         - POLYGON_RPC_URL=https://rpc-mumbai.maticvigil.com
         - POLYGON_PRIVATE_KEY=${POLYGON_PRIVATE_KEY}
         - API_KEY=dev-api-key
         - NETWORK=mumbai
   ```

**Testing Strategy:**
- Unit tests: Mock ethers provider, test business logic
- Integration tests: Use Mumbai testnet (requires test MATIC from faucet)
- Contract tests: Validate responses match OpenAPI spec

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

**New Files:**
- `adapters/polygon/` (new directory for Polygon adapter code)
- `adapters/polygon/Dockerfile`
- `adapters/polygon/docker-compose.yml`
- `adapters/polygon/package.json`
- `adapters/polygon/src/**/*.ts` (TypeScript source files)
- `adapters/polygon/contracts/**/*.sol` (Solidity smart contracts, if needed)
- `adapters/polygon/tests/**/*.test.ts` (test files)
- `docs/blockchain/polygon/polygon-adapter-deployment.md`

---

## 8. Completion Criteria

- Polygon adapter container builds successfully
- All endpoints functional and tested
- Integration tests pass with Mumbai testnet
- Smart contract deployed and functional (if needed)
- Docker Compose brings up working local environment
- Documentation complete for deployment and operations
- Code follows best practices matching Solana adapter
