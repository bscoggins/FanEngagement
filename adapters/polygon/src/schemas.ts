import { z } from 'zod';

// Base schemas
const uuidSchema = z.string().uuid();
const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
const sha256HexSchema = z
  .string()
  .regex(/^[a-fA-F0-9]{64}$/u, 'Invalid SHA-256 hash');

// Create Organization Request
export const createOrganizationSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  network: z.enum(['mumbai', 'amoy', 'polygon']).optional(),
  metadata: z
    .object({
      logoUrl: z.string().url().optional(),
      colors: z
        .object({
          primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
          secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        })
        .optional(),
    })
    .optional(),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;

// Create Share Type Request
export const createShareTypeSchema = z.object({
  shareTypeId: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(10),
  decimals: z.number().int().min(0).max(18).default(18),
  maxSupply: z
    .union([
      z.number().int().positive(),
      z.string().regex(/^[1-9][0-9]*$/u, 'maxSupply must be a positive non-zero integer'),
    ])
    .optional()
    .describe(
      'Maximum supply for this share type. Must be a positive, non-zero integer when provided. If omitted, supply is unlimited.'
    ),
  metadata: z
    .object({
      description: z.string().max(500).optional(),
      votingWeight: z.number().positive().optional(),
    })
    .optional(),
});

export type CreateShareTypeRequest = z.infer<typeof createShareTypeSchema>;

// Record Share Issuance Request
export const recordShareIssuanceSchema = z.object({
  issuanceId: uuidSchema,
  shareTypeId: z.union([uuidSchema, ethereumAddressSchema]),
  userId: uuidSchema,
  quantity: z.union([
    z.string().regex(/^(0|[1-9][0-9]*)$/u, 'Quantity must be a non-negative integer string'),
    z.number().int().nonnegative(),
  ]),
  recipientAddress: ethereumAddressSchema.optional(),
  metadata: z
    .object({
      reason: z.string().max(500).optional(),
      issuedBy: uuidSchema.optional(),
    })
    .optional(),
});

export type RecordShareIssuanceRequest = z.infer<typeof recordShareIssuanceSchema>;

// Create Proposal Request
export const createProposalSchema = z.object({
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  title: z.string().min(1).max(200),
  contentHash: sha256HexSchema,
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  eligibleVotingPower: z.number().nonnegative(),
  createdByUserId: uuidSchema.optional(),
  proposalTextHash: sha256HexSchema.optional(),
  expectationsHash: sha256HexSchema.optional(),
  votingOptionsHash: sha256HexSchema.optional(),
});

export type CreateProposalRequest = z.infer<typeof createProposalSchema>;

// Record Vote Request
export const recordVoteSchema = z.object({
  voteId: uuidSchema,
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  optionId: z.string().uuid(),
  votingPower: z.union([
    z.number().int().positive(),
    z
      .string()
      .regex(/^[1-9][0-9]*$/u, 'votingPower must be a positive, non-zero integer string'),
  ]).describe('Voting power expressed as a positive, non-zero integer (string or number). Fractions are not accepted.'),
  voterAddress: ethereumAddressSchema.optional(),
  timestamp: z.string().datetime().nullable().optional(),
});

export type RecordVoteRequest = z.infer<typeof recordVoteSchema>;

// Commit Proposal Results Request
export const commitProposalResultsSchema = z.object({
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  resultsHash: sha256HexSchema,
  winningOptionId: z.string().uuid().optional(),
  totalVotesCast: z.number().int().min(0),
  quorumMet: z.boolean(),
  closedAt: z.string().datetime(),
});

export type CommitProposalResultsRequest = z.infer<typeof commitProposalResultsSchema>;
