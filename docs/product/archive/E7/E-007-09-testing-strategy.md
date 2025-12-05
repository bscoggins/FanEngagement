---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-09: Testing Strategy for Blockchain Adapters"
labels: ["development", "copilot", "testing", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **docs-agent** (documentation only) with test harness examples.

---

## 1. Summary

Document comprehensive testing strategy for blockchain adapters, defining unit testing, integration testing, contract testing, and performance testing approaches. Create reusable test harnesses and fixtures to simplify adapter testing.

---

## 2. Requirements

- Document unit testing approach (mock blockchain clients, test business logic)
- Document integration testing approach (test validators, testnets)
- Create test harness for OpenAPI contract validation
- Implement contract testing strategy (Pact or OpenAPI-based)
- Create test data fixtures for common scenarios
- Document local testing setup (solana-test-validator, Mumbai testnet)
- Add performance/load testing strategy for adapters
- Define acceptable latency thresholds per operation
- Create smoke tests for production adapter health

---

## 3. Acceptance Criteria (Testable)

- [ ] Testing strategy document created at `docs/blockchain/adapter-testing.md`
- [ ] Unit testing approach documented:
  - Mock blockchain RPC clients
  - Test business logic in isolation
  - Test error handling and retry logic
- [ ] Integration testing approach documented:
  - Solana: Use `solana-test-validator` for tests
  - Polygon: Use Mumbai testnet or Hardhat Network
  - Test real transactions and confirmations
- [ ] Contract testing approach documented:
  - Validate adapter responses match OpenAPI spec
  - Use OpenAPI Validator or Pact for contract tests
  - Run contract tests in CI
- [ ] Test fixtures created:
  - Sample organization creation request
  - Sample share type creation request
  - Sample vote recording request
  - Expected responses for each operation
- [ ] Performance testing strategy documented:
  - Load testing with k6 or Apache JMeter
  - Target: <2s response time for transaction submission
  - Target: <500ms for health check
  - Measure throughput (transactions per second)
- [ ] Smoke tests documented:
  - Production health check validation
  - RPC connectivity test
  - Adapter authentication test
- [ ] Local testing setup guide:
  - Start solana-test-validator
  - Fund test accounts
  - Run adapter locally
  - Execute tests
- [ ] Example test code provided (TypeScript/JavaScript or C#)

---

## 4. Constraints

- NO production code changes (documentation and examples only)
- Test examples should be runnable (copy-paste ready)
- Follow existing testing patterns in FanEngagement codebase
- Testing must be automatable in CI/CD

---

## 5. Technical Notes (Optional)

**Testing Pyramid:**

```
        ┌───────────────┐
        │  Smoke Tests  │  (Production health checks)
        └───────────────┘
       ┌─────────────────┐
       │ Contract Tests  │  (API contract validation)
       └─────────────────┘
      ┌───────────────────┐
      │ Integration Tests │  (Real blockchain interactions)
      └───────────────────┘
     ┌───────────────────────┐
     │     Unit Tests        │  (Mocked dependencies)
     └───────────────────────┘
```

**Unit Test Example (TypeScript with Jest):**

```typescript
describe('SolanaAdapter', () => {
  let adapter: SolanaAdapter;
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = {
      getLatestBlockhash: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
    } as any;
    
    adapter = new SolanaAdapter(mockConnection, mockKeypair);
  });

  it('should create organization PDA', async () => {
    const orgId = '12345678-1234-1234-1234-123456789012';
    mockConnection.sendTransaction.mockResolvedValue('sig123');
    
    const result = await adapter.createOrganization(orgId, 'Test Org');
    
    expect(result.transactionSignature).toBe('sig123');
    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(1);
  });

  it('should retry on RPC error', async () => {
    mockConnection.sendTransaction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('sig456');
    
    const result = await adapter.createOrganization('org-id', 'Test');
    
    expect(result.transactionSignature).toBe('sig456');
    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(3);
  });
});
```

**Integration Test Example:**

```typescript
describe('SolanaAdapter Integration', () => {
  let adapter: SolanaAdapter;
  let connection: Connection;

  beforeAll(async () => {
    // Assumes solana-test-validator is running on localhost:8899
    connection = new Connection('http://localhost:8899', 'confirmed');
    const keypair = Keypair.generate();
    
    // Airdrop SOL for test transactions
    const airdropSig = await connection.requestAirdrop(
      keypair.publicKey,
      LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);
    
    adapter = new SolanaAdapter(connection, keypair);
  });

  it('should create organization on-chain', async () => {
    const orgId = uuid();
    const result = await adapter.createOrganization(orgId, 'Integration Test Org');
    
    expect(result.transactionSignature).toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/);
    
    // Verify transaction on-chain
    const tx = await connection.getTransaction(result.transactionSignature);
    expect(tx).not.toBeNull();
  }, 30000); // 30s timeout for blockchain interaction
});
```

**Contract Test Example (OpenAPI Validator):**

```typescript
import { validateAgainstOpenAPI } from 'openapi-validator-middleware';
import swaggerSpec from './solana-adapter-api.yaml';

describe('Solana Adapter Contract Tests', () => {
  beforeAll(() => {
    validateAgainstOpenAPI.init(swaggerSpec, {
      formats: [{ name: 'uuid', pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i }]
    });
  });

  it('POST /v1/adapter/organizations matches OpenAPI spec', async () => {
    const response = await request(app)
      .post('/v1/adapter/organizations')
      .send({
        organizationId: '12345678-1234-1234-1234-123456789012',
        name: 'Test Organization'
      })
      .expect(201);
    
    // Validate response schema against OpenAPI spec
    expect(response.body).toMatchSchema('CreateOrganizationResponse');
    expect(response.body.transactionSignature).toBeDefined();
    expect(response.body.accountAddress).toBeDefined();
  });
});
```

**Performance Test Example (k6):**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 10, // 10 virtual users
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
  },
};

export default function () {
  const url = 'http://localhost:3001/v1/adapter/organizations';
  const payload = JSON.stringify({
    organizationId: '12345678-1234-1234-1234-123456789012',
    name: 'Load Test Org',
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'test-api-key',
    },
  };
  
  let res = http.post(url, payload, params);
  
  check(res, {
    'status is 201': (r) => r.status === 201,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

**Test Fixtures (JSON):**

```json
// fixtures/create-organization.json
{
  "request": {
    "organizationId": "12345678-1234-1234-1234-123456789012",
    "name": "Manchester United FC",
    "description": "Official fan governance"
  },
  "expectedResponse": {
    "transactionSignature": "<solana-signature>",
    "accountAddress": "<solana-address>"
  }
}
```

**Local Testing Setup Guide:**

```markdown
## Running Tests Locally

### Prerequisites
- Docker
- Node.js 20+ (for Solana adapter)
- Solana CLI installed

### Start Solana Test Validator
\`\`\`bash
# Terminal 1
solana-test-validator --reset
\`\`\`

### Start Solana Adapter
\`\`\`bash
# Terminal 2
cd adapters/solana
npm install
npm run dev
\`\`\`

### Run Tests
\`\`\`bash
# Terminal 3
cd adapters/solana
npm test                  # Unit tests
npm run test:integration  # Integration tests
npm run test:contract     # Contract tests
\`\`\`

### Performance Testing
\`\`\`bash
k6 run performance-tests/solana-load-test.js
\`\`\`
```

---

## 6. Desired Agent

- [x] **docs-agent** (documentation with code examples)

---

## 7. Files Allowed to Change

**Documentation:**
- `docs/blockchain/adapter-testing.md` (primary deliverable)

**Test Fixtures (examples):**
- `docs/blockchain/test-fixtures/create-organization.json`
- `docs/blockchain/test-fixtures/create-share-type.json`
- `docs/blockchain/test-fixtures/record-vote.json`

---

## 8. Completion Criteria

- Comprehensive testing strategy documented
- All testing types covered (unit, integration, contract, performance, smoke)
- Example test code provided and runnable
- Test fixtures created
- Local testing setup guide complete
- Performance thresholds defined
- Ready for developers to implement adapters with confidence
