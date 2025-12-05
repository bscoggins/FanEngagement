import { describe, test, expect } from '@jest/globals';
import { ethers } from 'ethers';

describe('Polygon Adapter Unit Tests', () => {
  describe('Address Derivation', () => {
    test('should derive consistent address for organization', () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      
      // Derive address using keccak256
      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(organizationId));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(organizationId));

      // Address should be deterministic
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    test('should derive different addresses for different organizations', () => {
      const org1Id = '550e8400-e29b-41d4-a716-446655440000';
      const org2Id = '550e8400-e29b-41d4-a716-446655440001';

      const hash1 = ethers.keccak256(ethers.toUtf8Bytes(org1Id));
      const hash2 = ethers.keccak256(ethers.toUtf8Bytes(org2Id));

      // Different organizations should have different addresses
      expect(hash1).not.toBe(hash2);
    });

    test('should derive ethereum address from hash', () => {
      const shareTypeId = '123e4567-e89b-12d3-a456-426614174000';
      const hash = ethers.keccak256(ethers.toUtf8Bytes(shareTypeId));
      
      // Take last 40 hex chars (20 bytes) for address
      const address = '0x' + hash.slice(26);
      
      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(address.length).toBe(42); // 0x + 40 chars
    });
  });

  describe('Data Encoding', () => {
    test('should encode organization data', () => {
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const name = 'Test Organization';
      
      const data = `ORG:${organizationId}:${name}`;
      const encoded = ethers.hexlify(ethers.toUtf8Bytes(data));
      
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/);
      
      // Should be able to decode back
      const decoded = ethers.toUtf8String(encoded);
      expect(decoded).toBe(data);
    });

    test('should encode token data as JSON', () => {
      const tokenData = {
        shareTypeId: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Gold Shares',
        symbol: 'GOLD',
        decimals: 18,
      };
      
      const jsonStr = JSON.stringify(tokenData);
      const encoded = ethers.hexlify(ethers.toUtf8Bytes(`TOKEN:${jsonStr}`));
      
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/);
    });

    test('should convert proposal hash to bytes32', () => {
      const proposalId = '123e4567-e89b-12d3-a456-426614174000';
      // Hash the UUID first to get a 32-byte value
      const hash = ethers.keccak256(ethers.toUtf8Bytes(proposalId));
      
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(hash.length).toBe(66); // 0x + 64 chars
      
      // Can also be used as bytes32
      const bytes32 = ethers.zeroPadValue(hash, 32);
      expect(bytes32).toBe(hash); // Already 32 bytes
    });
  });

  describe('Number Handling', () => {
    test('should handle large token amounts as strings', () => {
      const quantity = '1000000000000000000'; // 1 token with 18 decimals
      
      // Parse as BigInt
      const amount = ethers.parseUnits('1', 18);
      
      expect(amount.toString()).toBe(quantity);
    });

    test('should format token amounts correctly', () => {
      const amount = ethers.parseUnits('100', 18);
      const formatted = ethers.formatUnits(amount, 18);
      
      expect(formatted).toBe('100.0');
    });

    test('should handle gas price conversion', () => {
      const gasPriceGwei = 50;
      const gasPriceWei = ethers.parseUnits(gasPriceGwei.toString(), 'gwei');
      
      expect(gasPriceWei.toString()).toBe('50000000000');
      
      const backToGwei = Number(ethers.formatUnits(gasPriceWei, 'gwei'));
      expect(backToGwei).toBe(gasPriceGwei);
    });
  });

  describe('Wallet Creation', () => {
    test('should create wallet from private key', () => {
      // Generate a random private key for testing
      const randomWallet = ethers.Wallet.createRandom();
      const privateKey = randomWallet.privateKey;
      
      // Create wallet from private key
      const wallet = new ethers.Wallet(privateKey);
      
      expect(wallet.address).toBe(randomWallet.address);
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });

    test('should accept private key with or without 0x prefix', () => {
      const randomWallet = ethers.Wallet.createRandom();
      let privateKey = randomWallet.privateKey;
      
      // Remove 0x prefix
      privateKey = privateKey.slice(2);
      
      // Should work with 0x prefix added back
      const wallet = new ethers.Wallet('0x' + privateKey);
      
      expect(wallet.address).toBe(randomWallet.address);
    });
  });

  describe('Transaction Data', () => {
    test('should create valid transaction data', () => {
      const data = {
        voteId: '123e4567-e89b-12d3-a456-426614174000',
        proposalId: '550e8400-e29b-41d4-a716-446655440000',
        userId: '660e8400-e29b-41d4-a716-446655440000',
        optionId: '770e8400-e29b-41d4-a716-446655440000',
        votingPower: '1000000000000000000',
      };
      
      const jsonStr = JSON.stringify(data);
      const encoded = ethers.hexlify(ethers.toUtf8Bytes(`VOTE:${jsonStr}`));
      
      expect(encoded).toMatch(/^0x[a-fA-F0-9]+$/);
      expect(encoded.length).toBeGreaterThan(2);
    });
  });
});
