import { afterAll, beforeAll, describe, expect, jest, test } from '@jest/globals';
import express from 'express';
import { AddressInfo } from 'net';

let server: any;
let baseUrl: string;

describe('Polygon adapter routes', () => {
  beforeAll(async () => {
    process.env.API_KEY = 'test-key';
    process.env.REQUIRE_AUTH = 'true';
    process.env.POLYGON_PRIVATE_KEY = '0x' + '1'.repeat(64);
    process.env.POLYGON_RPC_URL = 'http://localhost:8545';
    process.env.POLYGON_NETWORK = 'amoy';

    const { createRoutes } = await import('../src/routes.js');
    const { authMiddleware, loggingMiddleware, errorMiddleware } = await import('../src/middleware.js');

    const polygonService: any = {
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
      checkHealth: jest.fn(async () => ({
        status: 'healthy',
        network: 'amoy',
        rpcStatus: 'connected',
        lastBlockNumber: 100,
        walletAddress: '0x0000000000000000000000000000000000000005',
        walletBalance: '1.0 MATIC',
      })),
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

  afterAll(() => {
    server?.close();
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
  });

  test('exposes health and metrics without authentication', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    const healthPayload = (await health.json()) as any;
    expect(healthPayload.status).toBe('healthy');

    const metrics = await fetch(`${baseUrl}/metrics`);
    expect(metrics.status).toBe(200);
    expect(metrics.headers.get('content-type')).toContain('text/plain');
  });
});
