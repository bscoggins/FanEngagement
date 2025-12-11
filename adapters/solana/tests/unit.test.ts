import { describe, test, expect } from '@jest/globals';
import { PublicKey } from '@solana/web3.js';
import {
  MAX_MEMO_BYTES,
  buildProposalMemo,
  buildProposalResultMemo,
  buildVoteMemo,
} from '../src/memo-payload.js';

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

  describe('Memo Payloads', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const proposalId = '5b3c4ec1-b0e8-4d68-9ac8-9f7150be8390';
    const voteId = '770e8400-e29b-41d4-a716-446655440000';

    test('should build proposal memo within size limit', () => {
      const memo = buildProposalMemo({
        organizationId: orgId,
        proposalId,
        title: 'Budget Refresh FY25',
        contentHash: 'a'.repeat(64),
        proposalTextHash: 'b'.repeat(64),
        createdByUserId: '3cf4e768-b7ca-42cc-97f6-7f2fa41ced10',
        eligibleVotingPower: 4200,
        startAt: new Date('2025-01-10T00:00:00Z'),
        endAt: new Date('2025-01-17T00:00:00Z'),
      });

      const parsed = JSON.parse(memo);
      expect(parsed.type).toBe('proposal');
      expect(parsed.org).toBe(orgId);
      expect(parsed.contentHash).toBe('a'.repeat(64));
      expect(parsed.textHash).toBe('b'.repeat(64));
      expect(Buffer.byteLength(memo, 'utf8')).toBeLessThanOrEqual(MAX_MEMO_BYTES);
    });

    test('should build vote memo with weight as string', () => {
      const memo = buildVoteMemo({
        organizationId: orgId,
        proposalId,
        voteId,
        userId: '8dcb59b2-35af-4f5f-8d2b-2db41e75e6df',
        optionId: '9e093e63-1f5d-4c6e-83cd-6af448068f3a',
        votingPower: 123.45,
        voterAddress: '4teK8CLqwgbYzMsDcVHTHBp8oJ1z4fV2FwJweGbpw8Xs',
        castAt: new Date('2025-01-12T12:00:00Z'),
      });

      const parsed = JSON.parse(memo);
      expect(parsed.type).toBe('vote');
      expect(parsed.weight).toBe('123.45');
      expect(parsed.voterAddress).toBeDefined();
    });

    test('should throw when memo payload exceeds limit', () => {
      const longTitle = 'M'.repeat(700); // Oversized title to force payload beyond 566 bytes
      const realisticHash = 'a'.repeat(64); // Valid hash so size check is reached before hash validation

      expect(() =>
        buildProposalMemo({
          organizationId: orgId,
          proposalId,
          title: longTitle,
          contentHash: realisticHash,
          proposalTextHash: realisticHash,
          expectationsHash: realisticHash,
          votingOptionsHash: realisticHash,
          startAt: new Date(),
          endAt: new Date(),
        })
      ).toThrow(/Memo payload exceeds/i);
    });

    test('should build result memo with quorum metadata', () => {
      const memo = buildProposalResultMemo({
        organizationId: orgId,
        proposalId,
        resultsHash: 'f'.repeat(64),
        totalVotesCast: 9876,
        winningOptionId: 'ea9ab8e6-356b-4a93-b3bf-f6716b4c89fd',
        quorumMet: true,
        closedAt: new Date('2025-01-20T18:30:00Z'),
      });

      const parsed = JSON.parse(memo);
      expect(parsed.type).toBe('result');
      expect(parsed.quorumMet).toBe(true);
      expect(parsed.totalVotesCast).toBe(9876);
    });
  });
});
