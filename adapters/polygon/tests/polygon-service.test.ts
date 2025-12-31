import { describe, expect, jest, test } from '@jest/globals';
import { Wallet } from 'ethers';
import { PolygonService } from '../src/polygon-service.js';
import { config } from '../src/config.js';
import { RpcError } from '../src/errors.js';

describe('PolygonService reliability', () => {
  test('waitForTransaction retries on transient failure', async () => {
    const originalBaseDelay = config.retry.baseDelayMs;
    jest.useFakeTimers();

    try {
      config.retry.baseDelayMs = 5;

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
    } finally {
      config.retry.baseDelayMs = originalBaseDelay;
      jest.useRealTimers();
    }
  });

  test('classifies nonce and gas errors correctly', () => {
    const wallet = Wallet.createRandom();
    const service = new PolygonService(new Wallet(wallet.privateKey));

    expect(() =>
      (service as any).handleBlockchainError(new Error('Nonce too low'), 'op')
    ).toThrow(/Nonce error/);
    expect(() =>
      (service as any).handleBlockchainError(new Error('gas required exceeds'), 'op')
    ).toThrow(/Gas estimation or execution error/);
    expect(() =>
      (service as any).handleBlockchainError(new Error('network timeout'), 'op')
    ).toThrow(RpcError);
  });

  test('health keeps configured chainId and refreshes pending count on each call', async () => {
    const wallet = Wallet.createRandom();
    const service = new PolygonService(new Wallet(wallet.privateKey));

    const providerMock = {
      getNetwork: async () => ({ chainId: 80002 }),
      getBlockNumber: async () => 123,
      getBalance: async () => BigInt(0),
      getFeeData: async () => ({ gasPrice: BigInt(0) }),
    } as unknown as import('ethers').JsonRpcProvider;
    (service as any).provider = providerMock;

    const refreshSpy = jest
      .spyOn(service as any, 'refreshPendingCount')
      .mockResolvedValue(2);

    const result = await service.checkHealth();

    expect(refreshSpy).toHaveBeenCalled();
    expect((service as any).chainId).toBe(config.polygon.chainId.toString());
    expect(result.chainId).toBe(config.polygon.chainId);
  });
});
