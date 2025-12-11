import { z } from 'zod';

// Common schemas
const uuidSchema = z.string().uuid();
const timestampSchema = z.string().datetime();
const sha256HexSchema = z
  .string()
  .regex(/^(0x)?[a-fA-F0-9]{64}$/u, 'Invalid SHA-256 hash');

// Organization schemas
export const createOrganizationSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  metadata: z.object({
    logoUrl: z.string().url().optional(),
    colors: z.object({
      primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    }).optional(),
  }).optional(),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;

// ShareType schemas
export const createShareTypeSchema = z.object({
  shareTypeId: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  decimals: z.number().int().min(0).max(9),
  maxSupply: z.number().positive().optional(),
  metadata: z.object({
    description: z.string().max(500).optional(),
    votingWeight: z.number().positive().optional(),
  }).optional(),
});

export type CreateShareTypeRequest = z.infer<typeof createShareTypeSchema>;

// Share Issuance schemas
export const recordShareIssuanceSchema = z.object({
  issuanceId: uuidSchema,
  shareTypeId: z.string().min(1), // Can be UUID or Solana address
  userId: uuidSchema,
  quantity: z.number().positive(),
  recipientAddress: z.string().optional(),
  metadata: z.object({
    reason: z.string().max(500).optional(),
    issuedBy: uuidSchema.optional(),
  }).optional(),
});

export type RecordShareIssuanceRequest = z.infer<typeof recordShareIssuanceSchema>;

// Proposal schemas
export const createProposalSchema = z.object({
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  title: z.string().min(1).max(200),
  contentHash: sha256HexSchema,
  startAt: timestampSchema,
  endAt: timestampSchema,
  eligibleVotingPower: z.number().nonnegative(),
  createdByUserId: uuidSchema.optional(),
  proposalTextHash: sha256HexSchema.optional(),
  expectationsHash: sha256HexSchema.optional(),
  votingOptionsHash: sha256HexSchema.optional(),
});

export type CreateProposalRequest = z.infer<typeof createProposalSchema>;

// Vote schemas
export const recordVoteSchema = z.object({
  voteId: uuidSchema,
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  optionId: uuidSchema,
  votingPower: z.number().positive(),
  voterAddress: z.string().optional(),
  timestamp: timestampSchema.optional(),
});

export type RecordVoteRequest = z.infer<typeof recordVoteSchema>;

// Proposal Results schemas
export const commitProposalResultsSchema = z.object({
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  resultsHash: sha256HexSchema,
  winningOptionId: uuidSchema.optional(),
  totalVotesCast: z.number().nonnegative(),
  quorumMet: z.boolean(),
  closedAt: timestampSchema,
});

export type CommitProposalResultsRequest = z.infer<typeof commitProposalResultsSchema>;
