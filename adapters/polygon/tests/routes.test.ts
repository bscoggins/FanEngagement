import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import { AddressInfo } from 'net';
import { RpcError, TransactionError } from '../src/errors.js';
import { blockchainAdapterHealth } from '../src/metrics.js';

let server: any;
let baseUrl: string;
let polygonService: any;
let runtimeConfig: any;

describe('Polygon adapter routes', () => {
  beforeAll(async () => {
    process.env.API_KEY = 'test-key';
    process.env.REQUIRE_AUTH = 'true';
    process.env.POLYGON_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.POLYGON_RPC_URL = 'http://localhost:8545';
    process.env.POLYGON_NETWORK = 'amoy';
    process.env.ADAPTER_INSTANCE = 'test-polygon-instance';

    const { config } = await import('../src/config.js');
    runtimeConfig = config;
    config.auth.apiKey = 'test-key';
    config.auth.requireAuth = true;

    const { createRoutes } = await import('../src/routes.js');
    const { authMiddleware, loggingMiddleware, errorMiddleware } = await import('../src/middleware.js');

    polygonService = {
      createOrganization: jest.fn(async () => ({
        transactionHash: '0xorg',
        contractAddress: '0x0000000000000000000000000000000000000001',
        gasUsed: '21000',
      })),
      createShareType: jest.fn(async () => ({
        transactionHash: '0xshare',
        tokenAddress: '0x0000000000000000000000000000000000000002',
        gasUsed: '35000',
      })),
      recordShareIssuance: jest.fn(async () => ({
        transactionHash: '0xissuance',
        gasUsed: '50000',
        recipientAddress: '0x0000000000000000000000000000000000000003',
      })),
      createProposal: jest.fn(async () => ({
        transactionHash: '0xproposal',
        proposalAddress: '0x0000000000000000000000000000000000000004',
        gasUsed: '42000',
      })),
      recordVote: jest.fn(async () => ({
        transactionHash: '0xvote',
        gasUsed: '25000',
      })),
      commitProposalResults: jest.fn(async () => ({
        transactionHash: '0xresults',
        gasUsed: '26000',
      })),
      getTransactionStatus: jest.fn(async () => ({
        transactionId: '0xstatus',
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '1234',
        timestamp: 1710000000,
      })),
      checkHealth: jest.fn(async () => {
        blockchainAdapterHealth.set({ chain_id: String(runtimeConfig.polygon.chainId) }, 1);
        return {
          status: 'healthy',
          network: 'amoy',
          rpcStatus: 'connected',
          lastBlockNumber: 100,
          walletAddress: '0x0000000000000000000000000000000000000005',
          walletBalance: '1.0 MATIC',
          chainId: runtimeConfig.polygon.chainId,
          pendingTransactions: 0,
          rpcLatencyMs: 1,
        };
      }),
      getWalletAddress: jest.fn(() => '0x0000000000000000000000000000000000000006'),
      getChainId: jest.fn(() => runtimeConfig.polygon.chainId),
    };

    const app = express();
    app.use(express.json());
    app.use(loggingMiddleware);
    app.use(authMiddleware);
    app.use(createRoutes(polygonService as any));
    app.use(errorMiddleware);

    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      if (server) {
        server.close(resolve);
      } else {
        resolve();
      }
    });
  });

  test('requires API key for write endpoints', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/organizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Org',
      }),
    });

    expect(response.status).toBe(401);
  });

  test('rejects invalid API key', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'wrong-key',
      },
      body: JSON.stringify({
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Org',
      }),
    });

    expect(response.status).toBe(401);
    const payload = (await response.json()) as any;
    expect(payload.type).toContain('authentication-error');
  });

  test('returns contract-compatible payloads', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/share-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        shareTypeId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Gold',
        symbol: 'GLD',
        decimals: 18,
        metadata: {
          description: 'Voting token',
          votingWeight: 1,
        },
      }),
    });

    expect(response.status).toBe(201);
    const payload = (await response.json()) as any;
    expect(payload.transactionId).toBe('0xshare');
    expect(payload.mintAddress).toBe('0x0000000000000000000000000000000000000002');
    expect(payload.status).toBe('confirmed');
    expect(payload.timestamp).toBeDefined();
    expect(payload.gasUsed).toBeDefined();
    expect(payload.adapter).toBe('polygon');
    expect(payload.adapterInstance).toBe(runtimeConfig.server.instanceId);
    expect(payload.chainId).toBe(runtimeConfig.polygon.chainId);
    expect(polygonService.createShareType).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174000',
      '550e8400-e29b-41d4-a716-446655440000',
      'Gold',
      'GLD',
      18,
      undefined,
      expect.objectContaining({ description: 'Voting token', votingWeight: 1 })
    );
  });

  test('propagates share issuance parameters and returns recipient address', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/share-issuances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        issuanceId: '123e4567-e89b-12d3-a456-426614174999',
        shareTypeId: '0x0000000000000000000000000000000000000007',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        quantity: '10',
        recipientAddress: '0x0000000000000000000000000000000000000008',
        metadata: { reason: 'bonus' },
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.recordShareIssuance).toHaveBeenCalledWith(
      '123e4567-e89b-12d3-a456-426614174999',
      '0x0000000000000000000000000000000000000007',
      '550e8400-e29b-41d4-a716-446655440000',
      '10',
      '0x0000000000000000000000000000000000000008',
      undefined,
      expect.objectContaining({ reason: 'bonus' })
    );

    const payload = (await response.json()) as any;
    expect(payload.recipientAddress).toBe('0x0000000000000000000000000000000000000003');
  });

  test('propagates proposal creation parameters', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/proposals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        title: 'Upgrade',
        contentHash: 'a'.repeat(64),
        startAt: new Date().toISOString(),
        endAt: new Date(Date.now() + 1000).toISOString(),
        eligibleVotingPower: 100,
        createdByUserId: '550e8400-e29b-41d4-a716-446655440003',
        proposalTextHash: 'b'.repeat(64),
        expectationsHash: 'c'.repeat(64),
        votingOptionsHash: 'd'.repeat(64),
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.createProposal).toHaveBeenCalled();
    const args = polygonService.createProposal.mock.calls[0];
    expect(args[0]).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(args[1]).toBe('550e8400-e29b-41d4-a716-446655440002');
    expect(args[2]).toBe('Upgrade');
    expect(args[3]).toBe('a'.repeat(64));
    expect(args[6]).toMatchObject({
      eligibleVotingPower: 100,
      createdByUserId: '550e8400-e29b-41d4-a716-446655440003',
      proposalTextHash: 'b'.repeat(64),
      expectationsHash: 'c'.repeat(64),
      votingOptionsHash: 'd'.repeat(64),
    });
  });

  test('propagates vote recording parameters with stringified votingPower', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        voteId: '550e8400-e29b-41d4-a716-446655440004',
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440005',
        optionId: '550e8400-e29b-41d4-a716-446655440006',
        votingPower: 5,
        voterAddress: '0x0000000000000000000000000000000000000009',
        timestamp: new Date().toISOString(),
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.recordVote).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440004',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440005',
      '550e8400-e29b-41d4-a716-446655440006',
      '5',
      expect.objectContaining({ voterAddress: '0x0000000000000000000000000000000000000009' })
    );
  });

  test('accepts vote payload without optional timestamp', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        voteId: '550e8400-e29b-41d4-a716-446655440007',
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440008',
        optionId: '550e8400-e29b-41d4-a716-446655440006',
        votingPower: '3',
        voterAddress: '0x0000000000000000000000000000000000000009',
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.recordVote).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440007',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440008',
      '550e8400-e29b-41d4-a716-446655440006',
      '3',
      expect.objectContaining({
        voterAddress: '0x0000000000000000000000000000000000000009',
        castAt: undefined,
      })
    );
  });

  test('accepts vote payload with timestamp explicitly null', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        voteId: '550e8400-e29b-41d4-a716-446655440009',
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440010',
        optionId: '550e8400-e29b-41d4-a716-446655440006',
        votingPower: '4',
        voterAddress: '0x0000000000000000000000000000000000000009',
        timestamp: null,
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.recordVote).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440009',
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440010',
      '550e8400-e29b-41d4-a716-446655440006',
      '4',
      expect.objectContaining({
        voterAddress: '0x0000000000000000000000000000000000000009',
        castAt: undefined,
      })
    );
  });

  test('propagates proposal results parameters including metadata', async () => {
    const response = await fetch(`${baseUrl}/v1/adapter/proposal-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        resultsHash: 'e'.repeat(64),
        winningOptionId: '550e8400-e29b-41d4-a716-446655440006',
        totalVotesCast: 10,
        quorumMet: true,
        closedAt: new Date().toISOString(),
      }),
    });

    expect(response.status).toBe(201);
    expect(polygonService.commitProposalResults).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      'e'.repeat(64),
      '550e8400-e29b-41d4-a716-446655440006',
      10,
      expect.objectContaining({ quorumMet: true })
    );
  });

  test('returns transaction error when gas estimation fails', async () => {
    (polygonService.createShareType as jest.Mock).mockImplementationOnce(() => {
      throw new TransactionError('Gas estimation or execution error');
    });

    const response = await fetch(`${baseUrl}/v1/adapter/share-types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        shareTypeId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Gold',
        symbol: 'GLD',
        decimals: 18,
      }),
    });

    expect(response.status).toBe(500);
    const payload = (await response.json()) as any;
    expect(payload.type).toContain('transaction-error');
  });

  test('returns rpc error when network times out', async () => {
    (polygonService.recordVote as jest.Mock).mockImplementationOnce(() => {
      throw new RpcError('RPC timeout or network error');
    });

    const response = await fetch(`${baseUrl}/v1/adapter/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        voteId: '550e8400-e29b-41d4-a716-446655440004',
        proposalId: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: '550e8400-e29b-41d4-a716-446655440002',
        userId: '550e8400-e29b-41d4-a716-446655440005',
        optionId: '550e8400-e29b-41d4-a716-446655440006',
        votingPower: 5,
        voterAddress: '0x0000000000000000000000000000000000000009',
        timestamp: new Date().toISOString(),
      }),
    });

    expect(response.status).toBe(503);
    const payload = (await response.json()) as any;
    expect(payload.type).toContain('rpc-error');
  });

  test('returns internal error when adapter is unreachable', async () => {
    (polygonService.createOrganization as jest.Mock).mockImplementationOnce(() => {
      throw new Error('adapter unreachable');
    });

    const response = await fetch(`${baseUrl}/v1/adapter/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-adapter-api-key': 'test-key',
      },
      body: JSON.stringify({
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Org',
      }),
    });

    expect(response.status).toBe(500);
    const payload = (await response.json()) as any;
    expect(payload.type).toContain('internal-error');
  });

  test('exposes health and metrics without authentication', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    const healthPayload = (await health.json()) as any;
    expect(healthPayload.status).toBe('healthy');
    expect(healthPayload.chainId).toBe(runtimeConfig.polygon.chainId);
    expect(healthPayload.adapterInstance).toBe(runtimeConfig.server.instanceId);

    const metrics = await fetch(`${baseUrl}/metrics`);
    expect(metrics.status).toBe(200);
    expect(metrics.headers.get('content-type')).toContain('text/plain');
    const metricsBody = await metrics.text();
    expect(metricsBody).toContain('blockchain_adapter_health');
    expect(metricsBody).toContain('adapter="polygon"');
    expect(metricsBody).toContain(`instance="${runtimeConfig.server.instanceId}"`);
    expect(metricsBody).toContain(`chain_id="${runtimeConfig.polygon.chainId}"`);
  });
});
