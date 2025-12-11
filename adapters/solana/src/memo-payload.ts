import { Buffer } from 'node:buffer';

const MEMO_SCHEMA_VERSION = 1;
const MAX_MEMO_BYTES = 566;
const MAX_TITLE_LENGTH = 120;

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
