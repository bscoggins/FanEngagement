import { describe, test, expect, beforeAll } from '@jest/globals';
import { ethers, Wallet, JsonRpcProvider } from 'ethers';

/**
 * Integration tests for Polygon adapter
 * 
 * These tests require:
 * 1. A valid Polygon Mumbai testnet RPC URL
 * 2. A wallet with test MATIC (get from https://faucet.polygon.technology/)
 * 3. Environment variables set:
 *    - POLYGON_RPC_URL
 *    - POLYGON_PRIVATE_KEY
 * 
 * To run: npm run test:integration
 */

const RPC_URL = process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com';
const PRIVATE_KEY = process.env.POLYGON_PRIVATE_KEY;

describe('Polygon Adapter Integration Tests', () => {
  let provider: JsonRpcProvider;
  let wallet: Wallet;
  let isRpcAvailable = false;

  beforeAll(async () => {
    // Skip tests if no private key provided
    if (!PRIVATE_KEY) {
      console.warn('POLYGON_PRIVATE_KEY not set, skipping integration tests');
      return;
    }

    try {
      provider = new JsonRpcProvider(RPC_URL);
      wallet = new Wallet(PRIVATE_KEY, provider);

      // Test RPC connectivity
      await provider.getBlockNumber();
      isRpcAvailable = true;

      console.log('Integration tests setup:', {
        rpcUrl: RPC_URL,
        walletAddress: wallet.address,
      });
    } catch (error) {
      console.warn('Failed to connect to Polygon RPC, skipping integration tests:', error);
    }
  });

  test('should connect to Polygon Mumbai testnet', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const blockNumber = await provider.getBlockNumber();
    expect(blockNumber).toBeGreaterThan(0);

    const network = await provider.getNetwork();
    expect(network.chainId).toBe(80001n); // Mumbai testnet chain ID
  });

  test('should check wallet balance', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const balance = await provider.getBalance(wallet.address);
    expect(balance).toBeGreaterThanOrEqual(0n);

    const balanceInMatic = ethers.formatUnits(balance, 'ether');
    console.log(`Wallet balance: ${balanceInMatic} MATIC`);

    // Warn if balance is low
    if (balance < ethers.parseUnits('0.01', 'ether')) {
      console.warn(
        'Warning: Wallet balance is low. Get test MATIC from https://faucet.polygon.technology/'
      );
    }
  });

  test('should get current gas price', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const feeData = await provider.getFeeData();

    expect(feeData.gasPrice).toBeDefined();
    if (feeData.gasPrice) {
      const gasPriceGwei = Number(ethers.formatUnits(feeData.gasPrice, 'gwei'));
      expect(gasPriceGwei).toBeGreaterThan(0);
      console.log(`Current gas price: ${gasPriceGwei.toFixed(2)} GWEI`);
    }

    // EIP-1559 fields (may not be available on all networks)
    if (feeData.maxFeePerGas) {
      const maxFeeGwei = Number(ethers.formatUnits(feeData.maxFeePerGas, 'gwei'));
      console.log(`Max fee per gas: ${maxFeeGwei.toFixed(2)} GWEI`);
    }
  });

  test('should send a simple transaction', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    // Check balance before test
    const balance = await provider.getBalance(wallet.address);
    if (balance < ethers.parseUnits('0.01', 'ether')) {
      console.warn('Skipping transaction test: insufficient balance');
      return;
    }

    // Send a very small amount to self with data
    const testData = ethers.hexlify(ethers.toUtf8Bytes('TEST:PolygonAdapter'));

    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      data: testData,
    });

    expect(tx.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    console.log(`Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait(1);
    expect(receipt).toBeDefined();
    expect(receipt?.status).toBe(1);
    expect(receipt?.gasUsed).toBeGreaterThan(0n);

    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    console.log(`Gas used: ${receipt?.gasUsed.toString()}`);
  }, 60000); // 60 second timeout for transaction confirmation

  test('should estimate gas for transaction', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const testData = ethers.hexlify(ethers.toUtf8Bytes('TEST:GasEstimation'));

    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: wallet.address,
      value: 0,
      data: testData,
    });

    expect(gasEstimate).toBeGreaterThan(0n);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
  });

  test('should get transaction receipt', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    // Get latest block and check for transactions
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);

    if (block && block.transactions.length > 0) {
      const txHash = block.transactions[0];
      const receipt = await provider.getTransactionReceipt(txHash);

      if (receipt) {
        expect(receipt.hash).toBeDefined();
        expect(receipt.blockNumber).toBeDefined();
        expect(receipt.status).toBeDefined();
        console.log(`Got receipt for transaction: ${receipt.hash}`);
      }
    } else {
      console.log('No transactions in latest block to test receipt retrieval');
    }
  });

  test('should handle non-existent transaction gracefully', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const fakeHash = '0x' + '0'.repeat(64);
    const receipt = await provider.getTransactionReceipt(fakeHash);

    expect(receipt).toBeNull();
  });

  test('should get nonce for wallet', async () => {
    if (!isRpcAvailable) {
      console.warn('Skipping test: RPC not available');
      return;
    }

    const nonce = await provider.getTransactionCount(wallet.address);
    expect(nonce).toBeGreaterThanOrEqual(0);
    console.log(`Wallet nonce: ${nonce}`);
  });
});
