import { afterAll, describe, expect, jest, test } from '@jest/globals';
import { Wallet } from 'ethers';
import { PolygonService } from '../src/polygon-service.js';
import { config } from '../src/config.js';
import { TransactionError, RpcError } from '../src/errors.js';

describe('PolygonService reliability', () => {
  const originalBaseDelay = config.retry.baseDelayMs;

  afterAll(() => {
    config.retry.baseDelayMs = originalBaseDelay;
  });

  test('waitForTransaction retries on transient failure', async () => {
    config.retry.baseDelayMs = 5;
    jest.useFakeTimers();

    const wallet = Wallet.createRandom();
    const service = new PolygonService(new Wallet(wallet.privateKey));
    const receipt = {
      hash: '0xtx',
      blockNumber: 1,
      gasUsed: BigInt(1),
      status: 1,
    } as any;

    const wait = jest.fn(async () => receipt);
    wait.mockRejectedValueOnce(new Error('temporary nonce issue'));

    const tx = { hash: '0xtx', wait } as any;

    const promise = (service as any).waitForTransaction(tx, 'test_op');
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(wait).toHaveBeenCalledTimes(2);
    expect(result).toBe(receipt);

    jest.useRealTimers();
  });

  test('classifies nonce and gas errors correctly', () => {
    const wallet = Wallet.createRandom();
    const service = new PolygonService(new Wallet(wallet.privateKey));

    expect(() => (service as any).handleBlockchainError(new Error('Nonce too low'), 'op')).toThrow(
      TransactionError
    );
    expect(() => (service as any).handleBlockchainError(new Error('gas required exceeds'), 'op')).toThrow(
      TransactionError
    );
    expect(() => (service as any).handleBlockchainError(new Error('network timeout'), 'op')).toThrow(
      RpcError
    );
  });
});
