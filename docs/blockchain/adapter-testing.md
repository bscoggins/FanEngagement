# Blockchain Adapter Testing Strategy

> **Document Type:** Testing Strategy and Guide  
> **Epic:** E-007 - Blockchain Adapter Platform  
> **Issue:** E-007-09 - Testing Strategy for Blockchain Adapters  
> **Status:** Complete  
> **Last Updated:** December 2024

## Executive Summary

This document defines the comprehensive testing strategy for FanEngagement's blockchain adapters. It covers unit testing, integration testing, contract testing, performance testing, and smoke tests to ensure adapters are reliable, performant, and conform to the OpenAPI contract specification.

**Key Testing Principles:**

1. **Test Pyramid Approach** - More unit tests, fewer integration tests, minimal end-to-end tests
2. **Fast Feedback** - Unit tests run in <5 seconds; integration tests in <2 minutes
3. **Isolation** - Each test is independent and can run in any order
4. **Repeatability** - Tests produce consistent results across environments
5. **Clarity** - Test names clearly describe what is being tested and expected behavior

**Testing Goals:**

- **Correctness:** Adapters implement OpenAPI contract accurately
- **Reliability:** Adapters handle blockchain errors and retries gracefully
- **Performance:** Adapters meet latency and throughput targets
- **Security:** Adapters validate inputs and protect sensitive data
- **Maintainability:** Tests are easy to understand and modify

---

## Table of Contents

1. [Testing Pyramid](#1-testing-pyramid)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [Contract Testing](#4-contract-testing)
5. [Performance Testing](#5-performance-testing)
6. [Smoke Tests](#6-smoke-tests)
7. [Local Testing Setup](#7-local-testing-setup)
8. [CI/CD Integration](#8-cicd-integration)
9. [Test Data and Fixtures](#9-test-data-and-fixtures)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Testing Pyramid

The testing pyramid illustrates the distribution of test types, with more tests at the base (fast, isolated) and fewer at the top (slow, integrated).

```
        ┌───────────────┐
        │  Smoke Tests  │  (5-10 tests: Production health validation)
        └───────────────┘
       ┌─────────────────┐
       │ Performance Tests│  (10-20 tests: Load and stress testing)
       └─────────────────┘
      ┌───────────────────┐
      │ Contract Tests    │  (20-30 tests: API spec validation)
      └───────────────────┘
     ┌───────────────────────┐
     │ Integration Tests     │  (30-50 tests: Real blockchain ops)
     └───────────────────────┘
    ┌───────────────────────────┐
    │     Unit Tests            │  (100+ tests: Business logic, mocks)
    └───────────────────────────┘
```

### 1.1 Test Type Characteristics

| Test Type | Purpose | Speed | Dependencies | Frequency |
|-----------|---------|-------|--------------|-----------|
| **Unit Tests** | Verify business logic in isolation | <1s per test | Mocked blockchain clients | Every commit |
| **Integration Tests** | Verify real blockchain operations | 5-30s per test | Test validator or testnet | Every PR |
| **Contract Tests** | Verify API conforms to OpenAPI spec | 1-5s per test | Running adapter container | Every PR |
| **Performance Tests** | Measure throughput and latency | 30s-5min | Running adapter + blockchain | Nightly or on-demand |
| **Smoke Tests** | Verify production health | <5s per test | Production adapter | After deployment |

### 1.2 When to Use Each Test Type

**Use Unit Tests when:**
- Testing business logic (PDA derivation, data transformation)
- Testing error handling and retry logic
- Testing input validation
- Testing helper functions and utilities
- Mocking blockchain RPC calls

**Use Integration Tests when:**
- Testing real blockchain transactions
- Verifying on-chain state changes
- Testing transaction confirmation logic
- Testing end-to-end flows with test validators

**Use Contract Tests when:**
- Validating API request/response schemas
- Ensuring backward compatibility
- Verifying error response formats
- Testing API versioning

**Use Performance Tests when:**
- Measuring throughput (transactions per second)
- Identifying latency bottlenecks
- Testing under load and stress conditions
- Validating performance SLAs

**Use Smoke Tests when:**
- Verifying production deployment success
- Monitoring adapter health
- Testing critical paths post-deployment
- Alerting on connectivity issues

---

## 2. Unit Testing

Unit tests verify business logic in isolation with mocked dependencies. They are fast, reliable, and form the foundation of the testing pyramid.

### 2.1 Mocking Strategy

**Mock Blockchain Clients:**

All blockchain RPC clients (`Connection` for Solana, `JsonRpcProvider` for Polygon) should be mocked in unit tests to eliminate network dependencies.

**TypeScript (Jest) Example:**

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaService } from '../src/solana-service';

// NOTE: These examples use the actual SolanaService class from the adapter implementation.
// The test structure demonstrates mocking patterns that can be adapted for your specific adapter methods.

describe('SolanaService Unit Tests', () => {
  let adapter: SolanaService;
  let mockConnection: jest.Mocked<Connection>;
  let mockKeypair: Keypair;

  beforeEach(() => {
    // Create mock connection with jest.fn() for RPC methods
    mockConnection = {
      getLatestBlockhash: jest.fn(),
      sendTransaction: jest.fn(),
      confirmTransaction: jest.fn(),
      getAccountInfo: jest.fn(),
      getTransaction: jest.fn(),
    } as any;

    // Use a real keypair for signing (not sensitive in tests)
    mockKeypair = Keypair.generate();

    // NOTE: SolanaService constructor creates its own Connection internally.
    // For actual implementation, you may need to mock the Connection via dependency injection
    // or use a test-specific configuration. This example shows the conceptual approach.
    adapter = new SolanaService(mockKeypair);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create organization PDA with correct seeds', async () => {
    // Arrange
    const orgId = '12345678-1234-1234-1234-123456789012';
    const orgName = 'Test Organization';

    // NOTE: This test demonstrates the conceptual approach.
    // The actual SolanaService implementation may not expose this exact method signature.
    // Adapt this to match your actual adapter's public API.

    mockConnection.getLatestBlockhash.mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000,
    });
    mockConnection.sendTransaction.mockResolvedValue('sig123');
    mockConnection.confirmTransaction.mockResolvedValue({
      value: { err: null },
    });

    // Act
    const result = await adapter.createOrganization(orgId, orgName);

    // Assert
    expect(result.transactionId).toBe('sig123');
    expect(result.status).toBe('confirmed');
    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(1);
    expect(mockConnection.confirmTransaction).toHaveBeenCalledWith('sig123');
  });

  it('should derive PDA from organization ID consistently', () => {
    // Arrange
    const orgId = '12345678-1234-1234-1234-123456789012';

    // NOTE: The actual SolanaService implementation may not expose a deriveOrganizationPDA method.
    // This is a conceptual example showing how you would test PDA derivation if it were exposed.
    // Use PublicKey.findProgramAddress directly in your tests if needed.

    // Act - Using Solana's PDA derivation directly for this example
    const [pda1] = PublicKey.findProgramAddressSync(
      [Buffer.from('organization'), Buffer.from(orgId.replace(/-/g, ''), 'hex')],
      new PublicKey('11111111111111111111111111111111')
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [Buffer.from('organization'), Buffer.from(orgId.replace(/-/g, ''), 'hex')],
      new PublicKey('11111111111111111111111111111111')
    );

    // Assert
    expect(pda1.toBase58()).toEqual(pda2.toBase58());
    expect(pda1).toBeInstanceOf(PublicKey);
  });
});
```

### 2.2 Testing Error Handling

**Test retry logic with exponential backoff:**

```typescript
describe('SolanaAdapter Retry Logic', () => {
  let adapter: SolanaAdapter;
  let mockConnection: jest.Mocked<Connection>;

  beforeEach(() => {
    mockConnection = {
      sendTransaction: jest.fn(),
      getLatestBlockhash: jest.fn(),
      confirmTransaction: jest.fn(),
    } as any;

    mockConnection.getLatestBlockhash.mockResolvedValue({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000,
    });

    adapter = new SolanaAdapter(mockConnection, Keypair.generate());
  });

  it('should retry on transient network errors', async () => {
    // Arrange: First two calls fail, third succeeds
    mockConnection.sendTransaction
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce('sig456');

    mockConnection.confirmTransaction.mockResolvedValue({
      value: { err: null },
    });

    // Act
    const result = await adapter.createOrganization(
      'test-org-id',
      'Test Org'
    );

    // Assert
    expect(result.transactionId).toBe('sig456');
    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    // Arrange: All calls fail
    mockConnection.sendTransaction.mockRejectedValue(
      new Error('Persistent network error')
    );

    // Act & Assert
    await expect(
      adapter.createOrganization('test-org-id', 'Test Org')
    ).rejects.toThrow('Persistent network error');

    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(3); // Max retries
  });

  it('should not retry on validation errors', async () => {
    // Arrange: Invalid request error (400-like)
    mockConnection.sendTransaction.mockRejectedValue(
      new Error('Invalid transaction: missing signature')
    );

    // Act & Assert
    await expect(
      adapter.createOrganization('', '') // Invalid input
    ).rejects.toThrow('Invalid transaction');

    expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(1); // No retry
  });
});
```

### 2.3 Testing Input Validation

```typescript
describe('SolanaAdapter Input Validation', () => {
  let adapter: SolanaAdapter;

  beforeEach(() => {
    const mockConnection = {} as any;
    adapter = new SolanaAdapter(mockConnection, Keypair.generate());
  });

  it('should reject invalid organization ID format', async () => {
    await expect(
      adapter.createOrganization('not-a-uuid', 'Test Org')
    ).rejects.toThrow('Invalid organization ID format');
  });

  it('should reject empty organization name', async () => {
    await expect(
      adapter.createOrganization(
        '12345678-1234-1234-1234-123456789012',
        ''
      )
    ).rejects.toThrow('Organization name cannot be empty');
  });

  it('should reject organization name exceeding max length', async () => {
    const longName = 'A'.repeat(256);
    await expect(
      adapter.createOrganization(
        '12345678-1234-1234-1234-123456789012',
        longName
      )
    ).rejects.toThrow('Organization name exceeds maximum length');
  });
});
```

### 2.4 Test Structure Best Practices

**Use AAA (Arrange-Act-Assert) Pattern:**

```typescript
it('should calculate voting power correctly', () => {
  // Arrange
  const shares = 100;
  const shareType = { votingWeight: 1.5 };

  // Act
  const votingPower = calculateVotingPower(shares, shareType);

  // Assert
  expect(votingPower).toBe(150);
});
```

**Use Descriptive Test Names:**

- ✅ `should retry transaction on network timeout`
- ✅ `should throw error when organization ID is invalid`
- ❌ `test1`
- ❌ `it works`

**Group Related Tests:**

```typescript
describe('VotingPowerCalculator', () => {
  describe('calculateVotingPower', () => {
    it('should multiply shares by voting weight', () => { /* ... */ });
    it('should return zero for zero shares', () => { /* ... */ });
    it('should handle decimal voting weights', () => { /* ... */ });
  });

  describe('validateVotingPower', () => {
    it('should accept valid voting power', () => { /* ... */ });
    it('should reject negative voting power', () => { /* ... */ });
  });
});
```

### 2.5 Running Unit Tests

**Command:**

```bash
# Run all unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/adapters/__tests__/solana-adapter.test.ts

# Run in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run tests matching pattern
npm test -- --testNamePattern="retry"
```

**Expected Output:**

```
PASS  src/adapters/__tests__/solana-adapter.test.ts
  SolanaAdapter Unit Tests
    ✓ should create organization PDA with correct seeds (8ms)
    ✓ should derive PDA from organization ID consistently (2ms)
  SolanaAdapter Retry Logic
    ✓ should retry on transient network errors (15ms)
    ✓ should fail after max retries (10ms)
    ✓ should not retry on validation errors (5ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Time:        2.156s
```

---

## 3. Integration Testing

Integration tests verify adapter behavior with real blockchain interactions using test validators or testnets. These tests are slower but provide confidence that the adapter works end-to-end.

### 3.1 Solana Integration Tests (solana-test-validator)

**Prerequisites:**

- Solana CLI installed (`solana-install init`)
- `solana-test-validator` running locally

**Setup:**

```typescript
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SolanaService } from '../src/solana-service';

// NOTE: These integration tests use the actual SolanaService from the adapter.
// Ensure solana-test-validator is running before executing these tests.

describe('SolanaService Integration Tests', () => {
  let adapter: SolanaService;
  let connection: Connection;
  let payerKeypair: Keypair;

  beforeAll(async () => {
    // Connect to local test validator
    connection = new Connection('http://localhost:8899', 'confirmed');

    // Generate test keypair
    payerKeypair = Keypair.generate();

    // Airdrop SOL for transaction fees
    const airdropSig = await connection.requestAirdrop(
      payerKeypair.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);

    // Initialize adapter with real connection
    adapter = new SolanaService(payerKeypair);
  }, 30000); // 30s timeout for setup

  afterAll(async () => {
    // Cleanup if needed
  });

  it('should create organization on-chain', async () => {
    // Arrange
    const orgId = '12345678-1234-1234-1234-123456789012';
    const orgName = 'Integration Test Organization';

    // Act
    const result = await adapter.createOrganization(orgId, orgName);

    // Assert
    expect(result.transactionId).toMatch(/^[1-9A-HJ-NP-Za-km-z]{87,88}$/); // Base58 signature
    expect(result.accountAddress).toBeDefined();
    expect(result.status).toBe('confirmed');

    // Verify transaction on-chain
    const tx = await connection.getTransaction(result.transactionId, {
      commitment: 'confirmed',
    });
    expect(tx).not.toBeNull();
    expect(tx?.meta?.err).toBeNull(); // Transaction succeeded
  }, 30000); // 30s timeout for blockchain interaction

  it('should retrieve organization account data', async () => {
    // Arrange
    const orgId = '87654321-4321-4321-4321-210987654321';
    await adapter.createOrganization(orgId, 'Test Org for Retrieval');

    // Act
    const pda = adapter.deriveOrganizationPDA(orgId);
    const accountInfo = await connection.getAccountInfo(pda);

    // Assert
    expect(accountInfo).not.toBeNull();
    expect(accountInfo?.data).toBeDefined();
    // Verify account data contains organization name (if stored on-chain)
  }, 30000);

  it('should handle concurrent transactions', async () => {
    // Arrange
    const orgIds = [
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      '33333333-3333-3333-3333-333333333333',
    ];

    // Act
    const results = await Promise.all(
      orgIds.map(id => adapter.createOrganization(id, `Org ${id}`))
    );

    // Assert
    results.forEach((result, index) => {
      expect(result.transactionId).toBeDefined();
      expect(result.status).toBe('confirmed');
    });
  }, 60000); // 60s timeout for multiple transactions
});
```

### 3.2 Polygon Integration Tests (Hardhat Network)

**Alternative to Mumbai Testnet (faster, no rate limits):**

```typescript
import { ethers } from 'ethers';
import { PolygonService } from '../src/polygon-service';

// NOTE: These integration tests use the actual PolygonService from the adapter.
// Ensure Hardhat Network is running before executing these tests.

describe('PolygonService Integration Tests (Hardhat)', () => {
  let adapter: PolygonService;
  let provider: ethers.JsonRpcProvider;
  let wallet: ethers.Wallet;

  beforeAll(async () => {
    // Start Hardhat network: npx hardhat node
    provider = new ethers.JsonRpcProvider('http://localhost:8545');

    // NOTE: This is Hardhat's public test account #0 - safe for local testing only.
    //       Never use this private key for real funds or production deployments.
    // Use Hardhat default account
    wallet = new ethers.Wallet(
      '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      provider
    );

    adapter = new PolygonService(wallet);
  });

  it('should deploy organization contract', async () => {
    // Arrange
    const orgId = '12345678-1234-1234-1234-123456789012';
    const orgName = 'Integration Test DAO';

    // Act
    const result = await adapter.createOrganization(orgId, orgName);

    // Assert
    expect(result.transactionId).toMatch(/^0x[0-9a-fA-F]{64}$/); // Ethereum tx hash
    expect(result.accountAddress).toMatch(/^0x[0-9a-fA-F]{40}$/); // Contract address
    expect(result.status).toBe('confirmed');

    // Verify contract deployed
    const code = await provider.getCode(result.accountAddress);
    expect(code).not.toBe('0x'); // Contract has code
  }, 30000);

  it('should mint ERC-20 tokens for share type', async () => {
    // Arrange
    const shareTypeId = '87654321-4321-4321-4321-210987654321';
    const orgId = '12345678-1234-1234-1234-123456789012';

    // Act
    const result = await adapter.createShareType(
      shareTypeId,
      orgId,
      'Voting Token',
      'VOTE',
      0,
      1000000
    );

    // Assert
    expect(result.mintAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);

    // Verify token contract
    const tokenContract = new ethers.Contract(
      result.mintAddress,
      ['function name() view returns (string)', 'function symbol() view returns (string)'],
      provider
    );
    const name = await tokenContract.name();
    const symbol = await tokenContract.symbol();

    expect(name).toBe('Voting Token');
    expect(symbol).toBe('VOTE');
  }, 30000);
});
```

### 3.3 Integration Test Best Practices

**Use Longer Timeouts:**

```typescript
// Blockchain operations are slow
it('should confirm transaction', async () => {
  // ...
}, 30000); // 30 second timeout
```

**Cleanup Test Data:**

```typescript
afterEach(async () => {
  // Reset test validator state if needed
  // Or use fresh accounts for each test
});
```

**Use Unique IDs:**

```typescript
import { v4 as uuidv4 } from 'uuid';

it('should create unique organizations', async () => {
  const orgId = uuidv4(); // Generate unique UUID per test
  await adapter.createOrganization(orgId, 'Test Org');
});
```

**Check Balance Before Tests:**

```typescript
beforeAll(async () => {
  const balance = await connection.getBalance(payerKeypair.publicKey);
  expect(balance).toBeGreaterThan(LAMPORTS_PER_SOL); // Ensure sufficient SOL
});
```

### 3.4 Running Integration Tests

**Start Test Validator:**

```bash
# Terminal 1: Start Solana test validator
solana-test-validator --reset --quiet

# Terminal 2: Start Hardhat network (for Polygon)
npx hardhat node
```

**Run Integration Tests:**

```bash
# Run integration tests only
npm run test:integration

# Run with verbose output
npm run test:integration -- --verbose

# Run specific integration test file
npm run test:integration -- tests/integration/solana.test.ts
```

**Expected Output:**

```
PASS  tests/integration/solana.test.ts (30.156s)
  SolanaAdapter Integration Tests
    ✓ should create organization on-chain (2845ms)
    ✓ should retrieve organization account data (1932ms)
    ✓ should handle concurrent transactions (8756ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        30.156s
```

---

## 4. Contract Testing

Contract tests validate that the adapter API conforms exactly to the OpenAPI specification. This ensures API consumers can rely on consistent request/response formats.

### 4.1 OpenAPI Schema Validation

**Install Dependencies:**

```bash
npm install --save-dev openapi-validator-middleware
npm install --save-dev @apidevtools/swagger-parser
```

**Contract Test Example:**

```typescript
import request from 'supertest';
import swaggerParser from '@apidevtools/swagger-parser';
import { validateAgainstOpenAPI } from 'openapi-validator-middleware';
import app from '../src/app'; // Express app instance

describe('Solana Adapter Contract Tests', () => {
  let apiSpec: any;

  beforeAll(async () => {
    // Load and validate OpenAPI spec
    apiSpec = await swaggerParser.validate('./openapi/solana-adapter-api.yaml');

    // Initialize OpenAPI validator
    validateAgainstOpenAPI.init(apiSpec, {
      formats: [
        {
          name: 'uuid',
          pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        },
      ],
    });
  });

  it('POST /v1/adapter/organizations matches OpenAPI spec', async () => {
    // Arrange
    const requestBody = {
      organizationId: '12345678-1234-1234-1234-123456789012',
      name: 'Contract Test Organization',
      description: 'Test description',
    };

    // Act
    const response = await request(app)
      .post('/v1/adapter/organizations')
      .set('X-API-Key', 'test-api-key')
      .send(requestBody)
      .expect(201);

    // Assert: Validate response schema
    expect(response.body).toHaveProperty('transactionId');
    expect(response.body).toHaveProperty('accountAddress');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');

    // Validate against OpenAPI schema
    expect(response.body.transactionId).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(response.body.accountAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(['pending', 'confirmed', 'failed']).toContain(response.body.status);
  });

  it('GET /v1/adapter/health matches OpenAPI spec', async () => {
    // Act
    const response = await request(app)
      .get('/v1/adapter/health')
      .expect(200);

    // Assert
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('blockchain');
    expect(response.body).toHaveProperty('network');
    expect(response.body).toHaveProperty('rpcStatus');
    expect(response.body).toHaveProperty('timestamp');

    expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    expect(response.body.blockchain).toBe('solana');
  });

  it('POST /v1/adapter/votes returns 400 for invalid request', async () => {
    // Arrange: Invalid request (missing required field)
    const invalidRequest = {
      proposalId: '98765432-8765-8765-8765-876543210987',
      // Missing voteId, userId, optionId, votingPower
    };

    // Act
    const response = await request(app)
      .post('/v1/adapter/votes')
      .set('X-API-Key', 'test-api-key')
      .send(invalidRequest)
      .expect(400);

    // Assert: Validate error response matches RFC 7807 ProblemDetails
    expect(response.body).toHaveProperty('type');
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('detail');
    expect(response.body.status).toBe(400);
  });

  it('POST /v1/adapter/organizations returns 401 without API key', async () => {
    // Arrange
    const requestBody = {
      organizationId: '12345678-1234-1234-1234-123456789012',
      name: 'Test Organization',
    };

    // Act
    const response = await request(app)
      .post('/v1/adapter/organizations')
      .send(requestBody)
      .expect(401);

    // Assert
    expect(response.body.status).toBe(401);
    expect(response.body.detail).toContain('authentication');
  });
});
```

### 4.2 JSON Schema Validation

**Using Ajv for schema validation:**

```typescript
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

describe('Response Schema Validation', () => {
  let ajv: Ajv;

  beforeAll(() => {
    ajv = new Ajv();
    addFormats(ajv);
  });

  const organizationResponseSchema = {
    type: 'object',
    properties: {
      transactionId: { type: 'string', minLength: 1 },
      accountAddress: { type: 'string', minLength: 1 },
      status: { type: 'string', enum: ['pending', 'confirmed', 'failed'] },
      timestamp: { type: 'string', format: 'date-time' },
    },
    required: ['transactionId', 'accountAddress', 'status', 'timestamp'],
    additionalProperties: true,
  };

  it('should validate organization creation response', () => {
    const response = {
      transactionId: '5j7s9KfGpnVCwmAjWBfnN4mKR8sT3pQwX9HvLyE2dNkM',
      accountAddress: 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS',
      status: 'confirmed',
      timestamp: '2024-12-05T19:00:00.123Z',
    };

    const validate = ajv.compile(organizationResponseSchema);
    const valid = validate(response);

    expect(valid).toBe(true);
    expect(validate.errors).toBeNull();
  });
});
```

### 4.3 Backward Compatibility Tests

**Ensure API changes don't break existing clients:**

```typescript
describe('API Backward Compatibility', () => {
  it('should accept legacy request format (v1.0)', async () => {
    // Arrange: Old request format without new optional fields
    const legacyRequest = {
      organizationId: '12345678-1234-1234-1234-123456789012',
      name: 'Legacy Org',
      // No 'description' or 'metadata' fields (added in v1.1)
    };

    // Act
    const response = await request(app)
      .post('/v1/adapter/organizations')
      .set('X-API-Key', 'test-api-key')
      .send(legacyRequest)
      .expect(201);

    // Assert: New API still accepts old format
    expect(response.body.transactionId).toBeDefined();
  });

  it('should include all v1.0 response fields in v1.1', async () => {
    // Ensure new API version includes all old fields
    const response = await request(app)
      .get('/v1/adapter/health')
      .expect(200);

    // Assert: Old clients expect these fields
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('timestamp');
  });
});
```

### 4.4 Running Contract Tests

```bash
# Run contract tests
npm run test:contract

# Run with OpenAPI spec validation
npm run test:contract -- --verbose
```

---

## 5. Performance Testing

Performance tests measure adapter throughput, latency, and behavior under load. These tests identify bottlenecks and validate SLA compliance.

### 5.1 Performance Targets

| Operation | Target Latency (P95) | Target Throughput | Notes |
|-----------|----------------------|-------------------|-------|
| **Health Check** | <500ms | 100+ req/s | Should be very fast |
| **Create Organization** | <2s | 10+ req/s | Blockchain confirmation time |
| **Create Share Type** | <2s | 10+ req/s | Token mint operation |
| **Record Vote** | <2s | 50+ req/s | High concurrency expected |
| **Commit Proposal Results** | <3s | 5+ req/s | Less frequent operation |
| **Get Transaction Status** | <1s | 100+ req/s | Read-only, should be fast |

### 5.2 Load Testing with k6

**Install k6:**

```bash
# macOS
brew install k6

# Linux
sudo apt-get install k6

# Or download from https://k6.io/
```

**k6 Load Test Script:**

```javascript
// performance-tests/solana-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],     // <5% error rate
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_KEY = __ENV.API_KEY || 'test-api-key';

export default function () {
  // Test: Health Check
  let healthRes = http.get(`${BASE_URL}/v1/adapter/health`);
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
    'health check < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test: Create Organization
  const orgPayload = JSON.stringify({
    organizationId: `${__VU}-${__ITER}-${Date.now()}`, // Unique ID per VU and iteration
    name: `Load Test Org ${__VU}-${__ITER}`,
    description: 'Performance test organization',
  });

  const orgRes = http.post(`${BASE_URL}/v1/adapter/organizations`, orgPayload, {
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
  });

  check(orgRes, {
    'create org status 201': (r) => r.status === 201,
    'create org < 2s': (r) => r.timings.duration < 2000,
    'create org has transactionId': (r) => {
      const body = JSON.parse(r.body);
      return body.transactionId !== undefined;
    },
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'performance-report.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
```

**Run k6 Load Test:**

```bash
# Run basic load test
k6 run performance-tests/solana-load-test.js

# Run with custom parameters
k6 run --vus 50 --duration 5m performance-tests/solana-load-test.js

# Run against different environment
BASE_URL=https://staging-adapter.example.com k6 run performance-tests/solana-load-test.js
```

**Expected Output:**

```
          /\      |‾‾| /‾‾/   /‾‾/   
     /\  /  \     |  |/  /   /  /    
    /  \/    \    |     (   /   ‾‾\  
   /          \   |  |\  \ |  (‾)  | 
  / __________ \  |__| \__\ \_____/ .io

  execution: local
     script: performance-tests/solana-load-test.js
     output: -

  scenarios: (100.00%) 1 scenario, 20 max VUs, 4m30s max duration

     ✓ health check status 200
     ✓ health check < 500ms
     ✓ create org status 201
     ✓ create org < 2s
     ✓ create org has transactionId

     checks.........................: 100.00% ✓ 1500      ✗ 0
     data_received..................: 2.1 MB  12 kB/s
     data_sent......................: 1.5 MB  8.3 kB/s
     errors.........................: 0.00%   ✓ 0        ✗ 300
     http_req_blocked...............: avg=1.23ms   min=1µs     med=4µs     max=45.67ms  p(90)=9µs     p(95)=12.34ms 
     http_req_duration..............: avg=876.45ms min=123.45ms med=745.23ms max=1987.65ms p(90)=1234.56ms p(95)=1567.89ms
     http_req_failed................: 0.00%   ✓ 0        ✗ 900
     http_reqs......................: 900     5/s

     ✓ http_req_duration <= 2000ms (P95)
     ✓ http_req_failed < 5%
```

### 5.3 Stress Testing

**Stress test to find breaking point:**

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp to 50 users
    { duration: '5m', target: 50 },   // Stay at 50
    { duration: '2m', target: 100 },  // Ramp to 100 users
    { duration: '5m', target: 100 },  // Stay at 100
    { duration: '2m', target: 200 },  // Ramp to 200 users (stress)
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // Relaxed threshold for stress
    http_req_failed: ['rate<0.10'],    // Allow 10% error rate
  },
};
```

### 5.4 Spike Testing

**Test recovery from sudden load spike:**

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Normal load
    { duration: '10s', target: 100 },  // Sudden spike
    { duration: '1m', target: 100 },   // Sustained spike
    { duration: '30s', target: 10 },   // Back to normal
  ],
};
```

### 5.5 Analyzing Performance Results

**Identify Bottlenecks:**

- **High P95/P99 Latency:** RPC provider slow or rate-limited
- **High Error Rate:** Adapter overloaded or blockchain congestion
- **Increasing Latency Over Time:** Memory leak or connection pool exhaustion

**Optimization Strategies:**

1. **Connection Pooling:** Reuse HTTP connections to RPC providers
2. **Request Batching:** Batch multiple blockchain queries
3. **Caching:** Cache frequently accessed data (health checks, transaction status)
4. **Rate Limiting:** Implement client-side rate limiting to avoid 429 errors
5. **Horizontal Scaling:** Deploy multiple adapter replicas

---

## 6. Smoke Tests

Smoke tests are minimal tests run in production to verify critical functionality after deployment. They detect immediate issues without extensive test coverage.

### 6.1 Production Health Check

**Smoke Test Script:**

```typescript
import axios from 'axios';

describe('Production Smoke Tests', () => {
  const ADAPTER_URL = process.env.ADAPTER_URL || 'https://solana-adapter.example.com';
  const API_KEY = process.env.API_KEY;

  it('should return healthy status', async () => {
    const response = await axios.get(`${ADAPTER_URL}/v1/adapter/health`);

    expect(response.status).toBe(200);
    expect(response.data.status).toBe('healthy');
    expect(response.data.blockchain).toBeDefined();
    expect(response.data.rpcStatus).toBe('connected');
  });

  it('should require authentication for protected endpoints', async () => {
    try {
      await axios.post(`${ADAPTER_URL}/v1/adapter/organizations`, {
        organizationId: '12345678-1234-1234-1234-123456789012',
        name: 'Test Org',
      });
      fail('Expected 401 error');
    } catch (error: any) {
      expect(error.response.status).toBe(401);
    }
  });

  it('should connect to blockchain RPC', async () => {
    const response = await axios.get(
      `${ADAPTER_URL}/v1/adapter/health`,
      { headers: { 'X-API-Key': API_KEY } }
    );

    expect(response.data.rpcStatus).toBe('connected');
    expect(response.data.lastBlockNumber).toBeGreaterThan(0);
  });

  it('should expose Prometheus metrics', async () => {
    const response = await axios.get(`${ADAPTER_URL}/v1/adapter/metrics`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.data).toContain('adapter_transactions_total');
  });
});
```

### 6.2 Automated Smoke Test Execution

**Run After Deployment:**

```bash
# CI/CD pipeline step
ADAPTER_URL=https://prod-solana-adapter.example.com \
API_KEY=$PROD_API_KEY \
npm run test:smoke

# Expected: All tests pass in <10 seconds
```

**Kubernetes Liveness Probe (Automated):**

```yaml
livenessProbe:
  httpGet:
    path: /v1/adapter/health
    port: 3001
    scheme: HTTPS
  initialDelaySeconds: 15
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3
```

### 6.3 Monitoring Integration

**Alert on Smoke Test Failure:**

```yaml
# Prometheus alert rule
groups:
- name: smoke_tests
  interval: 1m
  rules:
  - alert: AdapterSmokeTestFailing
    expr: probe_success{job="adapter-smoke-test"} == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Adapter smoke test failing"
      description: "Adapter at {{ $labels.instance }} failed smoke test"
```

---

## 7. Local Testing Setup

This section provides step-by-step instructions for running all test types locally.

### 7.1 Prerequisites

**System Requirements:**

- **Docker:** Latest version
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **Solana CLI:** Latest version (for Solana adapter)
- **Git:** For cloning repository

**Install Solana CLI:**

```bash
# macOS/Linux
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
solana --version
```

**Install Node.js (if needed):**

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version  # Should be v20.x.x
npm --version   # Should be v10.x.x
```

### 7.2 Repository Setup

**Clone and Install Dependencies:**

```bash
# Clone repository
git clone https://github.com/bscoggins/FanEngagement.git
cd FanEngagement

# Navigate to adapter directory
cd adapters/solana  # or adapters/polygon

# Install dependencies
npm install

# Verify tests exist
ls -la tests/
# Should see: unit.test.ts, integration.test.ts
```

### 7.3 Running Solana Tests Locally

**Step 1: Start Solana Test Validator**

```bash
# Terminal 1
solana-test-validator --reset --quiet

# Expected output:
# Ledger location: test-ledger
# Log: test-ledger/validator.log
# Identity: EhvKVTWTHEjXxPRDxFKBudJgzxWrTdMtRg2Vze8SqFjk
# Genesis Hash: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY
# Version: 1.18.22
# Shred Version: 50093
```

**Step 2: Start Adapter (Dev Mode)**

```bash
# Terminal 2 (in adapters/solana directory)
cp .env.example .env

# Edit .env with test configuration
# SOLANA_NETWORK=devnet
# SOLANA_RPC_URL=http://localhost:8899
# PORT=3001

npm run dev

# Expected output:
# Solana Adapter starting...
# Connected to Solana devnet at http://localhost:8899
# Server listening on port 3001
```

**Step 3: Run Unit Tests**

```bash
# Terminal 3 (in adapters/solana directory)
npm test

# Expected: All unit tests pass in <5 seconds
```

**Step 4: Fund Test Account (For Integration Tests)**

```bash
# Generate test keypair
solana-keygen new --outfile test-keypair.json --no-bip39-passphrase

# Airdrop SOL
solana airdrop 2 $(solana-keygen pubkey test-keypair.json) --url http://localhost:8899

# Verify balance
solana balance $(solana-keygen pubkey test-keypair.json) --url http://localhost:8899
# Should show: 2 SOL
```

**Step 5: Run Integration Tests**

```bash
# Set environment variable for test keypair
export SOLANA_KEYPAIR_FILE=./test-keypair.json

npm run test:integration

# Expected: Integration tests pass in 30-60 seconds
```

### 7.4 Running Polygon Tests Locally

**Step 1: Start Hardhat Network**

```bash
# Terminal 1 (in adapters/polygon directory)
npx hardhat node

# Expected output:
# Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
# Accounts: (20 accounts with 10000 ETH each)
```

**Step 2: Start Adapter**

```bash
# Terminal 2 (in adapters/polygon directory)
cp .env.example .env

# Edit .env
# POLYGON_NETWORK=localhost
# POLYGON_RPC_URL=http://localhost:8545
# PORT=3002

npm run dev
```

**Step 3: Run Tests**

```bash
# Terminal 3
npm test                  # Unit tests
npm run test:integration  # Integration tests
```

### 7.5 Running Tests in Docker

**Build and Test in Container:**

```bash
# Build Docker image (includes test stage)
docker build --target test -t solana-adapter:test ./adapters/solana

# Run tests in container
docker run --rm solana-adapter:test

# Run integration tests (requires test validator)
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 7.6 Troubleshooting Local Tests

**Problem: Solana test validator not starting**

```bash
# Check if port 8899 is in use
lsof -i :8899

# Kill conflicting process
kill -9 <PID>

# Clean ledger and restart
rm -rf test-ledger
solana-test-validator --reset
```

**Problem: Integration tests timing out**

- Ensure test validator is running: `solana cluster-version --url http://localhost:8899`
- Increase test timeout: `it('test', async () => { /* ... */ }, 60000);`
- Check RPC URL in adapter config matches validator URL

**Problem: Unit tests failing with "Cannot find module"**

```bash
# Rebuild TypeScript
npm run build

# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Problem: "Insufficient funds" in integration tests**

```bash
# Check balance
solana balance <address> --url http://localhost:8899

# Airdrop more SOL
solana airdrop 5 <address> --url http://localhost:8899
```

**Problem: Port already in use**

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3010
```

---

## 8. CI/CD Integration

Tests should run automatically in CI/CD pipelines to catch regressions early.

### 8.1 GitHub Actions Workflow

**Existing CI Workflow (`.github/workflows/blockchain-adapters.yml`):**

The CI/CD pipeline already runs unit tests during Docker builds:

```yaml
- name: Build Docker Image
  uses: docker/build-push-action@v5
  with:
    context: ./adapters/${{ matrix.adapter }}
    file: ./adapters/${{ matrix.adapter }}/Dockerfile
    target: production
    # Unit tests run in 'test' stage before production build
```

**Add Integration Tests to CI:**

```yaml
# Add to blockchain-adapters.yml
integration-tests:
  runs-on: ubuntu-latest
  needs: build
  strategy:
    matrix:
      adapter: [solana, polygon]
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install Solana CLI
      if: matrix.adapter == 'solana'
      run: |
        sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
        echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

    - name: Start Test Validator
      if: matrix.adapter == 'solana'
      run: |
        solana-test-validator --quiet &
        sleep 10  # Wait for validator to start

    - name: Start Hardhat Network
      if: matrix.adapter == 'polygon'
      run: |
        cd adapters/polygon
        npx hardhat node &
        sleep 5

    - name: Install Dependencies
      working-directory: adapters/${{ matrix.adapter }}
      run: npm ci

    - name: Run Integration Tests
      working-directory: adapters/${{ matrix.adapter }}
      run: npm run test:integration
      env:
        SOLANA_RPC_URL: http://localhost:8899
        POLYGON_RPC_URL: http://localhost:8545
```

### 8.2 Contract Tests in CI

```yaml
contract-tests:
  runs-on: ubuntu-latest
  needs: build
  steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'

    - name: Install Dependencies
      working-directory: adapters/solana
      run: npm ci

    - name: Start Adapter
      working-directory: adapters/solana
      run: |
        npm run start &
        sleep 10  # Wait for adapter to start

    - name: Run Contract Tests
      working-directory: adapters/solana
      run: npm run test:contract
```

### 8.3 Performance Tests in CI (Nightly)

```yaml
# .github/workflows/performance-tests.yml
name: Nightly Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run at 2 AM daily
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start Adapter
        run: |
          docker compose up -d solana-adapter
          sleep 10

      - name: Run Performance Tests
        run: k6 run performance-tests/solana-load-test.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-report
          path: performance-report.json
```

---

## 9. Test Data and Fixtures

### 9.1 Test Fixtures Location

Test fixtures are located in `/docs/blockchain/test-fixtures/`:

- `create-organization.json`
- `create-share-type.json`
- `create-proposal.json`
- `record-vote.json`
- `commit-proposal-results.json`

### 9.2 Using Fixtures in Tests

**Load Fixture in TypeScript:**

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

function loadFixture(filename: string) {
  const fixturePath = join(__dirname, '../../docs/blockchain/test-fixtures', filename);
  return JSON.parse(readFileSync(fixturePath, 'utf-8'));
}

describe('Organization Creation', () => {
  it('should match expected response format', async () => {
    // Arrange
    const fixture = loadFixture('create-organization.json');
    const { request, expectedResponse } = fixture;

    // Act
    const response = await adapter.createOrganization(
      request.organizationId,
      request.name,
      request.description
    );

    // Assert
    expect(response).toMatchObject({
      transactionId: expect.any(String),
      accountAddress: expect.any(String),
      status: expectedResponse.status,
      timestamp: expect.any(String),
    });
  });
});
```

### 9.3 Generating Test Data

**Helper Function for Random Test Data:**

```typescript
import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

export function generateOrganizationRequest() {
  return {
    organizationId: uuidv4(),
    name: faker.company.name(),
    description: faker.company.catchPhrase(),
    metadata: {
      logoUrl: faker.image.url(),
      colors: {
        primary: faker.internet.color(),
        secondary: faker.internet.color(),
      },
    },
  };
}

export function generateVoteRequest(proposalId: string) {
  return {
    voteId: uuidv4(),
    proposalId,
    userId: uuidv4(),
    optionId: `option-${faker.number.int({ min: 1, max: 5 })}`,
    votingPower: faker.number.int({ min: 1, max: 1000 }),
    voterAddress: faker.finance.ethereumAddress(),
    timestamp: new Date().toISOString(),
  };
}

// Usage in tests
it('should record multiple votes', async () => {
  const proposalId = uuidv4();
  const votes = Array.from({ length: 10 }, () => generateVoteRequest(proposalId));

  for (const vote of votes) {
    const result = await adapter.recordVote(vote);
    expect(result.status).toBe('confirmed');
  }
});
```

---

## 10. Troubleshooting

### 10.1 Common Test Failures

**Problem: "Connection refused" in integration tests**

**Cause:** Test validator not running or wrong RPC URL

**Solution:**
```bash
# Verify test validator is running
solana cluster-version --url http://localhost:8899

# Check adapter RPC URL configuration
grep SOLANA_RPC_URL .env
```

**Problem: "Insufficient funds for transaction"**

**Cause:** Test account has no SOL

**Solution:**
```bash
# Airdrop SOL to test account
solana airdrop 5 <address> --url http://localhost:8899

# Verify balance
solana balance <address> --url http://localhost:8899
```

**Problem: "Test timeout" in integration tests**

**Cause:** Blockchain confirmation taking longer than expected

**Solution:**
```typescript
// Increase test timeout
it('should confirm transaction', async () => {
  // ...
}, 60000); // 60 second timeout

// Or reduce commitment level in tests
const connection = new Connection(RPC_URL, 'processed'); // Faster than 'confirmed'
```

**Problem: "Transaction simulation failed"**

**Cause:** Invalid transaction or insufficient compute budget

**Solution:**
```typescript
// Add compute budget instruction
const computeBudgetIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 300_000,
});

transaction.add(computeBudgetIx);
```

### 10.2 Debugging Tips

**Enable Verbose Logging:**

```typescript
// In adapter code
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug', // Set to 'debug' for tests
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});
```

**Print Transaction Logs:**

```typescript
it('should create organization', async () => {
  const result = await adapter.createOrganization('test-id', 'Test Org');

  // Fetch and print transaction details
  const tx = await connection.getTransaction(result.transactionId, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });

  console.log('Transaction logs:', tx?.meta?.logMessages);
  console.log('Transaction error:', tx?.meta?.err);
});
```

**Use Jest's `.only` for Focused Testing:**

```typescript
describe.only('Focus on this test suite', () => {
  it.only('Focus on this single test', () => {
    // Only this test will run
  });
});
```

**Snapshot Testing for Response Validation:**

```typescript
it('should match response snapshot', () => {
  const response = {
    transactionId: '5j7s9...',
    accountAddress: 'Fg6Pa...',
    status: 'confirmed',
    timestamp: '2024-12-05T19:00:00.123Z',
  };

  expect(response).toMatchSnapshot({
    transactionId: expect.any(String),
    accountAddress: expect.any(String),
    timestamp: expect.any(String),
  });
});
```

### 10.3 CI/CD Debugging

**Access CI Logs:**

```bash
# GitHub Actions
# Navigate to: Repository → Actions → Select workflow run → View logs

# Look for:
# - Build errors in Docker stage
# - Test failures with stack traces
# - Timeout issues (increase timeout in workflow YAML)
```

**Run CI Tests Locally:**

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run workflow locally
act -j integration-tests
```

---

## Appendices

### Appendix A: Test Coverage Goals

| Category | Target Coverage | Notes |
|----------|----------------|-------|
| **Unit Tests** | >80% line coverage | Focus on business logic |
| **Integration Tests** | All critical paths | Real blockchain operations |
| **Contract Tests** | 100% of OpenAPI endpoints | Complete API coverage |
| **Performance Tests** | Key operations | Throughput and latency |
| **Smoke Tests** | Critical production paths | Minimal, fast validation |

### Appendix B: Testing Tools Reference

| Tool | Purpose | Documentation |
|------|---------|---------------|
| **Jest** | Unit & integration testing | https://jestjs.io/ |
| **Supertest** | HTTP API testing | https://github.com/ladjs/supertest |
| **k6** | Load & performance testing | https://k6.io/docs/ |
| **OpenAPI Validator** | Contract testing | https://github.com/kogosoftwarellc/open-api |
| **Ajv** | JSON schema validation | https://ajv.js.org/ |
| **solana-test-validator** | Local Solana testing | https://docs.solana.com/cli/test-validator |
| **Hardhat** | Local Ethereum testing | https://hardhat.org/ |

### Appendix C: Example Test Command Reference

```bash
# Unit Tests
npm test                                    # Run all unit tests
npm test -- --coverage                      # With coverage report
npm test -- --watch                         # Watch mode
npm test -- src/adapters/solana.test.ts     # Specific file

# Integration Tests
npm run test:integration                    # All integration tests
npm run test:integration -- --verbose       # Verbose output
npm run test:integration -- --maxWorkers=1  # Serial execution

# Contract Tests
npm run test:contract                       # API contract validation

# Performance Tests
k6 run performance-tests/solana-load-test.js
k6 run --vus 50 --duration 5m performance-tests/solana-load-test.js

# Smoke Tests
npm run test:smoke                          # Production health checks

# Docker Tests
docker build --target test -t adapter:test .
docker run --rm adapter:test

# CI/CD
docker compose -f docker-compose.test.yml up --abort-on-container-exit
```

### Appendix D: Related Documentation

- **Adapter Architecture:** `/docs/blockchain/adapter-platform-architecture.md`
- **CI/CD Pipeline:** `/docs/blockchain/adapter-cicd.md`
- **Solana Deployment:** `/docs/blockchain/solana/solana-adapter-deployment.md`
- **Polygon Deployment:** `/docs/blockchain/polygon/polygon-adapter-deployment.md`
- **OpenAPI Specification:** (To be created in E-007-02 and E-007-03)

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-05 | Documentation Agent | Initial testing strategy document created |

---

**End of Document**
