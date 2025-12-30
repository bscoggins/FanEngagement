import request from 'supertest';
import { app } from '../src/app';
import { Keypair } from '@solana/web3.js';

// Mock @solana/web3.js
jest.mock('@solana/web3.js', () => {
  const originalModule = jest.requireActual('@solana/web3.js');
  return {
    ...originalModule,
    Connection: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn().mockResolvedValue(1000000000), // 1 SOL
      getTransaction: jest.fn().mockResolvedValue({
        slot: 123,
        blockTime: 1234567890,
        meta: { err: null },
        transaction: {
          message: {
            instructions: []
          }
        }
      }),
      getSignatureStatus: jest.fn().mockResolvedValue({
        value: { confirmationStatus: 'confirmed' }
      }),
      getAccountInfo: jest.fn().mockResolvedValue({
        lamports: 1000000000,
        owner: new originalModule.PublicKey('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 0
      }),
      getMinimumBalanceForRentExemption: jest.fn().mockResolvedValue(1000000),
    })),
    sendAndConfirmTransaction: jest.fn().mockResolvedValue('mock-signature'),
  };
});

describe('Solana Adapter API', () => {
  beforeAll(() => {
    process.env.API_KEY = 'test-api-key';
    process.env.SOLANA_PROGRAM_ID = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  });

  it('GET /v1/adapter/health should return status ok', async () => {
    const res = await request(app).get('/v1/adapter/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      network: 'solana',
      rpcUrl: expect.any(String)
    });
  });

  it('GET /v1/adapter/wallet should return wallet info', async () => {
    const res = await request(app).get('/v1/adapter/wallet');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('address');
    expect(res.body).toHaveProperty('balance');
    expect(res.body.currency).toBe('SOL');
  });

  it('POST /v1/adapter/wallets should create a new wallet', async () => {
    const res = await request(app).post('/v1/adapter/wallets');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('address');
    expect(res.body).toHaveProperty('privateKey');
  });

  it('GET /v1/adapter/accounts/:address should return account info', async () => {
    const address = Keypair.generate().publicKey.toBase58();
    const res = await request(app).get(`/v1/adapter/accounts/${address}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('address', address);
    expect(res.body).toHaveProperty('lamports', 1000000000);
  });

  it('GET /v1/adapter/transactions/:signature should return transaction info', async () => {
    const signature = 'mock-signature';
    const res = await request(app).get(`/v1/adapter/transactions/${signature}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('signature', signature);
    expect(res.body).toHaveProperty('slot');
  });

  it('POST /v1/adapter/organizations should create organization log', async () => {
    const res = await request(app)
      .post('/v1/adapter/organizations')
      .set('x-adapter-api-key', 'test-api-key')
      .send({ name: 'Test Org' });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('transactionId', 'mock-signature');
    expect(res.body).toHaveProperty('accountAddress');
  });

  it('POST /v1/adapter/organizations should fail without API key', async () => {
    const res = await request(app)
      .post('/v1/adapter/organizations')
      .send({ name: 'Test Org' });
    
    expect(res.status).toBe(401);
  });
});
