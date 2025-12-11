import { 
  Commitment,
  Connection, 
  Keypair, 
  PublicKey, 
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { Buffer } from 'node:buffer';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import { config } from './config.js';
import { logger } from './logger.js';
import { 
  transactionsTotal, 
  transactionDuration, 
  rpcErrorsTotal,
  rpcRequestsTotal,
  rpcLatency,
  lastBlockNumber,
} from './metrics.js';
import { serializeError } from '../../shared/errors.js';
import {
  buildProposalMemo,
  buildProposalResultMemo,
  buildVoteMemo,
} from './memo-payload.js';


export class SolanaService {
  private connection: Connection;
  private keypair: Keypair;
  private programId: PublicKey;
  private rentExemptionCache = new Map<number, number>();
  private static readonly memoProgramId = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

  constructor(keypair: Keypair) {
    this.connection = this.createConnection();
    this.keypair = keypair;
    
    // TODO: Replace with actual deployed Solana program ID
    // Using system program as placeholder for development
    // In production, deploy custom program and update this ID
    this.programId = new PublicKey('11111111111111111111111111111111');
    
    logger.info('SolanaService initialized', {
      network: config.solana.network,
      rpcUrl: config.solana.rpcUrl,
      commitment: config.solana.commitment,
      publicKey: this.keypair.publicKey.toBase58(),
      programId: this.programId.toBase58(),
    });
  }

  /**
   * Create organization account (Program Derived Address)
   */
  async createOrganization(
    organizationId: string,
    name: string,
    _description?: string
  ): Promise<{ transactionSignature: string; accountAddress: string }> {
    const startTime = Date.now();
    const operation = 'create_organization';

    try {
      logger.info('Creating organization on Solana', { organizationId, name });

      // Derive PDA from organization UUID
      const [pda, bump] = await this.findOrganizationPDA(organizationId);

      logger.debug('Organization PDA derived', {
        organizationId,
        pda: pda.toBase58(),
        bump,
      });

      const rentLamports = await this.getRentExemptionLamports();

      // Create a memo transaction to record organization creation
      // In production, this would call a deployed Solana program
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.keypair.publicKey,
          toPubkey: pda,
          lamports: rentLamports,
        })
      );

      const signature = await this.submitTransaction(transaction, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Organization created successfully', {
        organizationId,
        signature,
        accountAddress: pda.toBase58(),
      });

      return {
        transactionSignature: signature,
        accountAddress: pda.toBase58(),
      };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to create organization', { organizationId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Create SPL token mint for ShareType
   */
  async createShareType(
    shareTypeId: string,
    organizationId: string,
    name: string,
    symbol: string,
    decimals: number
  ): Promise<{ transactionSignature: string; mintAddress: string }> {
    const startTime = Date.now();
    const operation = 'create_share_type';

    try {
      logger.info('Creating share type token mint', {
        shareTypeId,
        organizationId,
        name,
        symbol,
        decimals,
      });

      // Create SPL token mint
      const mintAddress = await this.retryWithBackoff(async () => {
        return await createMint(
          this.connection,
          this.keypair,
          this.keypair.publicKey, // mint authority
          this.keypair.publicKey, // freeze authority
          decimals
        );
      }, operation);

      // Get the transaction signature from recent transactions
      // Note: createMint doesn't return signature, so we need to query it
      // Retry fetching the signature to handle RPC propagation delays
      const signatures = await this.retryWithBackoff(async () => {
        const sigs = await this.connection.getSignaturesForAddress(
          mintAddress,
          { limit: 1 }
        );
        if (!sigs || sigs.length === 0) {
          throw new Error('Signature not yet available');
        }
        return sigs;
      }, 'get_mint_signature');

      const signature = signatures[0].signature;

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Share type created successfully', {
        shareTypeId,
        mintAddress: mintAddress.toBase58(),
        signature,
      });

      return {
        transactionSignature: signature,
        mintAddress: mintAddress.toBase58(),
      };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to create share type', { shareTypeId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Record share issuance (mint tokens)
   */
  async recordShareIssuance(
    issuanceId: string,
    shareTypeId: string,
    userId: string,
    quantity: number,
    recipientAddress?: string
  ): Promise<{ transactionSignature: string; recipientAddress: string }> {
    const startTime = Date.now();
    const operation = 'record_share_issuance';

    try {
      logger.info('Recording share issuance', {
        issuanceId,
        shareTypeId,
        userId,
        quantity,
      });

      // Parse mint address from shareTypeId (in production, look up from database)
      const mintAddress = new PublicKey(shareTypeId);

      // Create or get recipient's associated token account
      const recipientPublicKey = recipientAddress 
        ? new PublicKey(recipientAddress)
        : this.keypair.publicKey; // Default to adapter wallet if no address provided

      const tokenAccount = await this.retryWithBackoff(async () => {
        return await getOrCreateAssociatedTokenAccount(
          this.connection,
          this.keypair,
          mintAddress,
          recipientPublicKey
        );
      }, operation);

      // Mint tokens to recipient
      const signature = await this.retryWithBackoff(async () => {
        return await mintTo(
          this.connection,
          this.keypair,
          mintAddress,
          tokenAccount.address,
          this.keypair.publicKey,
          quantity
        );
      }, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Share issuance recorded successfully', {
        issuanceId,
        signature,
        recipientAddress: tokenAccount.address.toBase58(),
      });

      return {
        transactionSignature: signature,
        recipientAddress: tokenAccount.address.toBase58(),
      };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to record share issuance', { issuanceId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Create proposal on-chain
   */
  async createProposal(
    proposalId: string,
    organizationId: string,
    title: string,
    contentHash: string,
    startAt: Date,
    endAt: Date,
    metadata?: {
      createdByUserId?: string;
      proposalTextHash?: string;
      expectationsHash?: string;
      votingOptionsHash?: string;
      eligibleVotingPower?: number;
    }
  ): Promise<{ transactionSignature: string; proposalAddress: string }> {
    const startTime = Date.now();
    const operation = 'create_proposal';

    try {
      logger.info('Creating proposal', { proposalId, organizationId, title });

      // Derive PDA for proposal
      const [proposalPda] = await this.findProposalPDA(proposalId);

      // Create memo transaction with proposal data
      // In production, this would call a deployed Solana program
        const rentLamports = await this.getRentExemptionLamports();
      const memoInstruction = this.createMemoInstruction(buildProposalMemo({
          organizationId,
          proposalId,
          title,
          contentHash,
          proposalTextHash: metadata?.proposalTextHash,
          expectationsHash: metadata?.expectationsHash,
          votingOptionsHash: metadata?.votingOptionsHash,
          createdByUserId: metadata?.createdByUserId,
          eligibleVotingPower: metadata?.eligibleVotingPower,
          startAt,
          endAt,
        }));

      const transaction = new Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: this.keypair.publicKey,
            toPubkey: proposalPda,
            lamports: rentLamports,
          })
        )
        .add(memoInstruction);

      const signature = await this.submitTransaction(transaction, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Proposal created successfully', {
        proposalId,
        signature,
        proposalAddress: proposalPda.toBase58(),
      });

      return {
        transactionSignature: signature,
        proposalAddress: proposalPda.toBase58(),
      };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to create proposal', { proposalId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Record vote on-chain
   */
  async recordVote(
    voteId: string,
    proposalId: string,
    organizationId: string,
    userId: string,
    optionId: string,
    votingPower: number,
    metadata?: {
      voterAddress?: string;
      castAt?: Date;
    }
  ): Promise<{ transactionSignature: string }> {
    const startTime = Date.now();
    const operation = 'record_vote';

    try {
      logger.info('Recording vote', { voteId, proposalId, organizationId, userId, optionId, votingPower });

      // Derive PDA for vote
      const [votePda] = await this.findVotePDA(voteId);

      // Create memo transaction with vote data
        const rentLamports = await this.getRentExemptionLamports();
      const memoInstruction = this.createMemoInstruction(buildVoteMemo({
          organizationId,
          proposalId,
          voteId,
          userId,
          optionId,
          votingPower,
          voterAddress: metadata?.voterAddress,
          castAt: metadata?.castAt,
        }));

      const transaction = new Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: this.keypair.publicKey,
            toPubkey: votePda,
            lamports: rentLamports,
          })
        )
        .add(memoInstruction);

      const signature = await this.submitTransaction(transaction, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Vote recorded successfully', { voteId, signature });

      return { transactionSignature: signature };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to record vote', { voteId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Commit proposal results on-chain
   */
  async commitProposalResults(
    proposalId: string,
    organizationId: string,
    resultsHash: string,
    winningOptionId: string,
    totalVotesCast: number,
    metadata?: {
      quorumMet?: boolean;
      closedAt?: Date;
    }
  ): Promise<{ transactionSignature: string }> {
    const startTime = Date.now();
    const operation = 'commit_proposal_results';

    try {
      logger.info('Committing proposal results', { proposalId, organizationId, resultsHash, winningOptionId, totalVotesCast });

      // Derive PDA for proposal results
      const [resultsPda] = await this.findProposalResultsPDA(proposalId);

      // Create memo transaction with results hash
        const rentLamports = await this.getRentExemptionLamports();
      const memoInstruction = this.createMemoInstruction(buildProposalResultMemo({
          organizationId,
          proposalId,
          resultsHash,
          winningOptionId,
          totalVotesCast,
          quorumMet: metadata?.quorumMet,
          closedAt: metadata?.closedAt,
        }));

      const transaction = new Transaction()
        .add(
          SystemProgram.transfer({
            fromPubkey: this.keypair.publicKey,
            toPubkey: resultsPda,
            lamports: rentLamports,
          })
        )
        .add(memoInstruction);

      const signature = await this.submitTransaction(transaction, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      logger.info('Proposal results committed successfully', { proposalId, signature });

      return { transactionSignature: signature };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'failed' });
      logger.error('Failed to commit proposal results', { proposalId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(
    transactionId: string
  ): Promise<{
    transactionId: string;
    status: string;
    confirmations?: number;
    blockNumber?: number;
    timestamp?: number;
  }> {
    const startTime = Date.now();

    try {
      logger.debug('Getting transaction status', { transactionId });

      const parsedTx = await this.retryWithBackoff(async () => {
        return await this.connection.getParsedTransaction(transactionId, {
          maxSupportedTransactionVersion: 0,
        });
      }, 'get_transaction_status');

      rpcLatency.observe({ method: 'getParsedTransaction' }, (Date.now() - startTime) / 1000);

      if (!parsedTx) {
        return {
          transactionId,
          status: 'not_found',
        };
      }

      // Determine status based on transaction confirmation
      let status = 'pending';
      if (parsedTx.meta?.err) {
        status = 'failed';
      } else if (parsedTx.blockTime) {
        status = 'confirmed';
      }

      // Get current slot for confirmation calculation
      const currentSlot = await this.connection.getSlot();
      const confirmations = parsedTx.slot ? currentSlot - parsedTx.slot : undefined;

      return {
        transactionId,
        status,
        confirmations,
        blockNumber: parsedTx.slot,
        timestamp: parsedTx.blockTime || undefined,
      };
    } catch (error) {
      rpcErrorsTotal.inc({ error_type: 'get_transaction_status' });
      logger.error('Failed to get transaction status', { transactionId, error: serializeError(error) });
      throw error;
    }
  }

  /**
   * Check health of Solana connection
   */
  async checkHealth(): Promise<{
    status: string;
    rpcStatus: string;
    network: string;
    lastBlockNumber?: number;
    keypairValid: boolean;
    errorMessage?: string;
  }> {
    try {
      // Check RPC connection by getting slot with retry to smooth transient RPC blips
      const slot = await this.retryWithBackoff(
        () => this.connection.getSlot(),
        'health_check_get_slot'
      );

      // Update metrics
      lastBlockNumber.set(slot);

      return {
        status: 'healthy',
        rpcStatus: 'connected',
        network: config.solana.network,
        lastBlockNumber: slot,
        keypairValid: true,
      };
    } catch (error) {
      logger.error('Health check failed', { error: serializeError(error) });
      this.refreshConnection();
      return {
        status: 'unhealthy',
        rpcStatus: 'disconnected',
        network: config.solana.network,
        keypairValid: true,
        errorMessage: serializeError(error).message,
      };
    }
  }

  private createConnection(): Connection {
    return new Connection(config.solana.rpcUrl, {
      commitment: config.solana.commitment as Commitment,
      confirmTransactionInitialTimeout: config.solana.confirmTimeout,
    });
  }

  private refreshConnection(): void {
    logger.info('Refreshing Solana RPC connection', { rpcUrl: config.solana.rpcUrl });
    this.connection = this.createConnection();
  }

  /**
   * Helper: Find organization PDA
   */
  private async findOrganizationPDA(organizationId: string): Promise<[PublicKey, number]> {
    const orgIdBuffer = Buffer.from(organizationId.replace(/-/g, ''), 'hex');
    return await PublicKey.findProgramAddress(
      [Buffer.from('organization'), orgIdBuffer],
      this.programId
    );
  }

  /**
   * Helper: Find proposal PDA
   */
  private async findProposalPDA(proposalId: string): Promise<[PublicKey, number]> {
    const proposalIdBuffer = Buffer.from(proposalId.replace(/-/g, ''), 'hex');
    return await PublicKey.findProgramAddress(
      [Buffer.from('proposal'), proposalIdBuffer],
      this.programId
    );
  }

  /**
   * Helper: Find vote PDA
   */
  private async findVotePDA(voteId: string): Promise<[PublicKey, number]> {
    const voteIdBuffer = Buffer.from(voteId.replace(/-/g, ''), 'hex');
    return await PublicKey.findProgramAddress(
      [Buffer.from('vote'), voteIdBuffer],
      this.programId
    );
  }

  /**
   * Helper: Find proposal results PDA
   */
  private async findProposalResultsPDA(proposalId: string): Promise<[PublicKey, number]> {
    const proposalIdBuffer = Buffer.from(proposalId.replace(/-/g, ''), 'hex');
    return await PublicKey.findProgramAddress(
      [Buffer.from('proposal_results'), proposalIdBuffer],
      this.programId
    );
  }

  private createMemoInstruction(memo: string): TransactionInstruction {
    return new TransactionInstruction({
      programId: SolanaService.memoProgramId,
      keys: [
        {
          pubkey: this.keypair.publicKey,
          isSigner: true,
          isWritable: false
        }
      ],
      data: Buffer.from(memo, 'utf8')
    });
  }

  /**
   * Helper: Get rent exemption lamports for an account with the given space.
   * Caches results to minimize RPC calls.
   * 
   * Note: Node.js is single-threaded, so Map operations are atomic.
   * No additional synchronization is needed for concurrent access.
   */
  private async getRentExemptionLamports(space = 0): Promise<number> {
    if (!this.rentExemptionCache.has(space)) {
      const lamports = await this.connection.getMinimumBalanceForRentExemption(space);
      this.rentExemptionCache.set(space, lamports);
    }

    // Map.get is safe due to guard above
    return this.rentExemptionCache.get(space)!;
  }

  /**
   * Helper: Submit transaction with retry logic
   */
  private async submitTransaction(
    transaction: Transaction,
    operation: string
  ): Promise<TransactionSignature> {
    return await this.retryWithBackoff(async () => {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.keypair],
        {
          commitment: config.solana.commitment as Commitment,
        }
      );
      return signature;
    }, operation);
  }

  /**
   * Helper: Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    attempt: number = 0
  ): Promise<T> {
    try {
      const startTime = Date.now();
      const result = await operation();
      
      rpcRequestsTotal.inc({ method: operationName, status: 'success' });
      rpcLatency.observe({ method: operationName }, (Date.now() - startTime) / 1000);
      
      return result;
    } catch (error) {
      rpcRequestsTotal.inc({ method: operationName, status: 'failed' });
      
      const shouldRetry = this.shouldRetryError(error);
      const maxAttempts = config.retry.maxAttempts;

      if (shouldRetry && attempt < maxAttempts - 1) {
        const delayMs = config.retry.baseDelayMs * Math.pow(2, attempt);
        
        logger.warn('Retrying operation after error', {
          operation: operationName,
          attempt: attempt + 1,
          maxAttempts,
          delayMs,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        rpcErrorsTotal.inc({ error_type: 'retryable' });

        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.retryWithBackoff(operation, operationName, attempt + 1);
      }

      rpcErrorsTotal.inc({ error_type: 'non_retryable' });
      logger.error('Operation failed after retries', {
        operation: operationName,
        attempts: attempt + 1,
        error: serializeError(error),
      });

      throw error;
    }
  }

  /**
   * Helper: Determine if error should be retried
   */
  private shouldRetryError(error: unknown): boolean {
    if (!error) return false;

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Retry on connection/network errors
    const retryablePatterns = [
      'timeout',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      '429', // Rate limit
      '503', // Service unavailable
      '504', // Gateway timeout
    ];

    return retryablePatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}
