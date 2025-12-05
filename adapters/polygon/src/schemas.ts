import { z } from 'zod';

// Base schemas
const uuidSchema = z.string().uuid();
const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

// Create Organization Request
export const createOrganizationSchema = z.object({
  organizationId: uuidSchema,
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  network: z.enum(['mumbai', 'polygon']).optional(),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationSchema>;

// Create Share Type Request
export const createShareTypeSchema = z.object({
  shareTypeId: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().min(1).max(100),
  symbol: z.string().min(1).max(20),
  decimals: z.number().int().min(0).max(18).default(18),
  maxSupply: z.string().optional(), // As string to handle large numbers
});

export type CreateShareTypeRequest = z.infer<typeof createShareTypeSchema>;

// Record Share Issuance Request
export const recordShareIssuanceSchema = z.object({
  issuanceId: uuidSchema,
  shareTypeId: uuidSchema,
  userId: uuidSchema,
  quantity: z.string(), // As string to handle large numbers
  recipientAddress: ethereumAddressSchema,
  tokenAddress: ethereumAddressSchema,
});

export type RecordShareIssuanceRequest = z.infer<typeof recordShareIssuanceSchema>;

// Create Proposal Request
export const createProposalSchema = z.object({
  proposalId: uuidSchema,
  organizationId: uuidSchema,
  title: z.string().min(1).max(200),
  contentHash: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Invalid content hash (SHA-256)'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});

export type CreateProposalRequest = z.infer<typeof createProposalSchema>;

// Record Vote Request
export const recordVoteSchema = z.object({
  voteId: uuidSchema,
  proposalId: uuidSchema,
  userId: uuidSchema,
  optionId: z.string().uuid(),
  votingPower: z.string(), // As string to handle large numbers
});

export type RecordVoteRequest = z.infer<typeof recordVoteSchema>;

// Commit Proposal Results Request
export const commitProposalResultsSchema = z.object({
  proposalId: uuidSchema,
  resultsHash: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Invalid results hash (SHA-256)'),
  winningOptionId: z.string().uuid().optional(),
  totalVotesCast: z.number().int().min(0),
});

export type CommitProposalResultsRequest = z.infer<typeof commitProposalResultsSchema>;
