import { Buffer } from 'node:buffer';

const MEMO_SCHEMA_VERSION = 1;
const MAX_MEMO_BYTES = 566;
const MAX_TITLE_LENGTH = 120;
// Regex pattern for validating SHA-256 hashes: exactly 64 lowercase hexadecimal characters
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;

export interface ProposalMemoInput {
  organizationId: string;
  proposalId: string;
  title: string;
  contentHash?: string;
  proposalTextHash?: string;
  expectationsHash?: string;
  votingOptionsHash?: string;
  createdByUserId?: string;
  eligibleVotingPower?: number;
  startAt: Date;
  endAt: Date;
  recordedAt?: Date;
}

export interface VoteMemoInput {
  organizationId: string;
  proposalId: string;
  voteId: string;
  userId: string;
  optionId: string;
  votingPower: number;
  voterAddress?: string;
  castAt?: Date;
}

export interface ProposalResultMemoInput {
  organizationId: string;
  proposalId: string;
  resultsHash: string;
  winningOptionId?: string;
  totalVotesCast: number;
  quorumMet?: boolean;
  closedAt?: Date;
}

export function buildProposalMemo(input: ProposalMemoInput): string {
  // Pre-flight validation: Validate all hash inputs before constructing the memo.
  // This prevents wasting transaction fees on malformed data.
  validateHash(input.contentHash, 'contentHash');
  validateHash(input.proposalTextHash, 'proposalTextHash');
  validateHash(input.expectationsHash, 'expectationsHash');
  validateHash(input.votingOptionsHash, 'votingOptionsHash');

  const payload = {
    v: MEMO_SCHEMA_VERSION,
    type: 'proposal' as const,
    org: input.organizationId,
    proposal: input.proposalId,
    title: truncate(input.title, MAX_TITLE_LENGTH),
    creator: input.createdByUserId,
    contentHash: normalizeHash(input.contentHash),
    textHash: normalizeHash(input.proposalTextHash),
    expectationsHash: normalizeHash(input.expectationsHash),
    optionsHash: normalizeHash(input.votingOptionsHash),
    start: toIsoString(input.startAt),
    end: toIsoString(input.endAt),
    eligiblePower: input.eligibleVotingPower,
    ts: toIsoString(input.recordedAt),
  };

  return buildMemoPayload(payload);
}

export function buildVoteMemo(input: VoteMemoInput): string {
  const payload = {
    v: MEMO_SCHEMA_VERSION,
    type: 'vote' as const,
    org: input.organizationId,
    proposal: input.proposalId,
    vote: input.voteId,
    user: input.userId,
    choice: input.optionId,
    weight: input.votingPower.toString(),
    voterAddress: input.voterAddress,
    ts: toIsoString(input.castAt),
  };

  return buildMemoPayload(payload);
}

export function buildProposalResultMemo(input: ProposalResultMemoInput): string {
  // Pre-flight validation: Validate resultsHash before constructing the memo.
  validateHash(input.resultsHash, 'resultsHash');

  const payload = {
    v: MEMO_SCHEMA_VERSION,
    type: 'result' as const,
    org: input.organizationId,
    proposal: input.proposalId,
    resultsHash: normalizeHash(input.resultsHash),
    winningOptionId: input.winningOptionId,
    totalVotesCast: input.totalVotesCast,
    quorumMet: input.quorumMet,
    ts: toIsoString(input.closedAt),
  };

  return buildMemoPayload(payload);
}

export function buildMemoPayload(payload: Record<string, unknown>): string {
  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

  const memoString = JSON.stringify(sanitizedPayload);
  const byteLength = Buffer.byteLength(memoString, 'utf8');

  if (byteLength > MAX_MEMO_BYTES) {
    throw new Error(`Memo payload exceeds ${MAX_MEMO_BYTES} bytes (received ${byteLength})`);
  }

  return memoString;
}

/**
 * Validate that a hash string is a valid SHA-256 hash.
 * Throws an error if the hash is invalid.
 */
function validateHash(value: string | undefined, fieldName: string): void {
  if (!value) {
    return; // Optional hashes are allowed
  }

  // Normalize first: remove 0x prefix and convert to lowercase
  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  
  if (!SHA256_HEX_PATTERN.test(normalized)) {
    throw new Error(
      `Invalid SHA-256 hash for ${fieldName}: must be 64 hex characters (got: ${value}). ` +
      `Ensure hash is correctly formatted before submitting to avoid wasting transaction fees.`
    );
  }
}

/**
 * Normalize a hash string to lowercase hex without "0x" prefix.
 * 
 * IMPORTANT: This normalization must stay synchronized with the backend's
 * ComputeSha256Hex method in ProposalService.cs, which also uses .toLowerCase()
 * and never includes "0x" prefix. Any changes to this normalization logic
 * must be reflected in both systems to ensure hash verification works correctly.
 */
function normalizeHash(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.startsWith('0x') ? value.slice(2) : value;
  return normalized.toLowerCase();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function toIsoString(value?: Date): string | undefined {
  if (!value) {
    return undefined;
  }
  const iso = value.toISOString();
  return iso.replace(/\.\d{3}Z$/, 'Z');
}

export { MEMO_SCHEMA_VERSION, MAX_MEMO_BYTES };
