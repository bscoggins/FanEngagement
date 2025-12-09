import { describe, test, expect } from '@jest/globals';
import { PublicKey } from '@solana/web3.js';

describe('Solana Adapter Unit Tests', () => {
  describe('PDA Derivation', () => {
    test('should derive consistent PDA for organization', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const organizationId = '550e8400-e29b-41d4-a716-446655440000';
      const orgIdBuffer = Buffer.from(organizationId.replace(/-/g, ''), 'hex');

      const [pda1, bump1] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), orgIdBuffer],
        programId
      );

      const [pda2, bump2] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), orgIdBuffer],
        programId
      );

      // PDA should be deterministic
      expect(pda1.toBase58()).toBe(pda2.toBase58());
      expect(bump1).toBe(bump2);
      expect(pda1).toBeInstanceOf(PublicKey);
      expect(bump1).toBeGreaterThanOrEqual(0);
      expect(bump1).toBeLessThanOrEqual(255);
    });

    test('should derive different PDAs for different organizations', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      
      const org1Id = '550e8400-e29b-41d4-a716-446655440000';
      const org2Id = '550e8400-e29b-41d4-a716-446655440001';

      const org1Buffer = Buffer.from(org1Id.replace(/-/g, ''), 'hex');
      const org2Buffer = Buffer.from(org2Id.replace(/-/g, ''), 'hex');

      const [pda1] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), org1Buffer],
        programId
      );

      const [pda2] = await PublicKey.findProgramAddress(
        [Buffer.from('organization'), org2Buffer],
        programId
      );

      // Different organizations should have different PDAs
      expect(pda1.toBase58()).not.toBe(pda2.toBase58());
    });

    test('should derive PDA for proposal', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const proposalId = '660e8400-e29b-41d4-a716-446655440000';
      const proposalBuffer = Buffer.from(proposalId.replace(/-/g, ''), 'hex');

      const [pda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('proposal'), proposalBuffer],
        programId
      );

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });

    test('should derive PDA for vote', async () => {
      const programId = new PublicKey('11111111111111111111111111111111');
      const voteId = '770e8400-e29b-41d4-a716-446655440000';
      const voteBuffer = Buffer.from(voteId.replace(/-/g, ''), 'hex');

      const [pda, bump] = await PublicKey.findProgramAddress(
        [Buffer.from('vote'), voteBuffer],
        programId
      );

      expect(pda).toBeInstanceOf(PublicKey);
      expect(bump).toBeGreaterThanOrEqual(0);
      expect(bump).toBeLessThanOrEqual(255);
    });
  });

  describe('UUID Processing', () => {
    test('should correctly remove hyphens from UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const expected = '550e8400e29b41d4a716446655440000';
      const result = uuid.replace(/-/g, '');
      expect(result).toBe(expected);
    });

    test('should create valid buffer from UUID', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const buffer = Buffer.from(uuid.replace(/-/g, ''), 'hex');
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBe(16); // UUID is 16 bytes
    });
  });
});
