import {
  ethers,
  Wallet,
  JsonRpcProvider,
  Contract,
  TransactionReceipt,
  TransactionReceiptParams,
  TransactionResponse,
  parseUnits,
  formatUnits,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  blockchainTransactionsTotal,
  blockchainTransactionDuration,
  blockchainRpcErrorsTotal,
  blockchainRpcRequestsTotal,
  blockchainRpcLatencySeconds,
  blockchainLastBlockNumber,
  blockchainGasUsedTotal,
  blockchainGasPriceGwei,
  blockchainPendingTransactions,
  blockchainAdapterHealth,
} from './metrics.js';
import { RpcError, TransactionError } from './errors.js';
import { serializeError } from '../../shared/errors.js';

// Simple Governance Registry contract ABI
const GOVERNANCE_ABI = [
  'function commitProposalResults(bytes32 proposalId, bytes32 resultsHash) public',
  'function getProposalResults(bytes32 proposalId) view returns (bytes32)',
  'event ResultsCommitted(bytes32 indexed proposalId, bytes32 resultsHash)',
];

// Constants
const PROOF_OF_ISSUANCE_AMOUNT = '0.0001'; // MATIC sent as proof of issuance

type FixtureTransaction = { blockNumber: number; gasUsed: string };

export class PolygonService {
  private provider?: JsonRpcProvider;
  private wallet: Wallet;
  private governanceContract?: Contract;
  private readonly useFixtures: boolean;
  private readonly fixtureTransactions = new Map<string, FixtureTransaction>();
  private fixtureBlockNumber = 100_000;
  private chainId = config.polygon.chainId.toString();
  private readonly nonceCacheTtlMs = 30000;
  private lastPendingCount = 0;
  private lastNonceCheckMs = 0;

  constructor(wallet: Wallet) {
    this.useFixtures = config.fixtures.useFixtures;

    if (!this.useFixtures) {
      this.provider = new JsonRpcProvider(config.polygon.rpcUrl);
      this.wallet = wallet.connect(this.provider);
    } else {
      this.wallet = wallet;
    }

    logger.info('PolygonService initialized', {
      network: config.polygon.network,
      rpcUrl: config.polygon.rpcUrl,
      walletAddress: this.wallet.address,
      confirmations: config.polygon.confirmations,
      fixtureMode: this.useFixtures,
    });

    // Initialize governance contract if address is provided
    if (config.polygon.governanceContractAddress) {
      this.governanceContract = new Contract(
        config.polygon.governanceContractAddress,
        GOVERNANCE_ABI,
        this.wallet
      );
      logger.info('Governance contract initialized', {
        address: config.polygon.governanceContractAddress,
      });
    }
  }

  getWalletAddress(): string {
    return this.wallet.address;
  }

  /**
   * Create organization by deploying a simple registry contract
   * In production, this would deploy a more sophisticated governance contract
   */
  async createOrganization(
    organizationId: string,
    name: string,
    description?: string,
    metadata?: { logoUrl?: string; colors?: { primary?: string; secondary?: string } }
  ): Promise<{ transactionHash: string; contractAddress: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'create_organization';

    try {
      logger.info('Creating organization on Polygon', { organizationId, name });

      if (this.useFixtures) {
        const receipt = this.createFixtureReceipt(operation);
        blockchainTransactionsTotal.inc({ operation, status: 'success' });
        blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);
        return {
          transactionHash: receipt.hash,
          contractAddress: this.wallet.address,
          gasUsed: receipt.gasUsed.toString(),
        };
      }

      // For MVP, we'll just send a transaction with the org data in the transaction data
      // In production, deploy an actual organization registry contract using CREATE2
      // for deterministic deployment based on organizationId
      const orgData = JSON.stringify({ organizationId, name, description, metadata });

      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address, // Send to self as placeholder
        value: 0,
        data: ethers.hexlify(toUtf8Bytes(`ORG:${orgData}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Organization created successfully', {
        organizationId,
        transactionHash: receipt.hash,
        contractAddress: this.wallet.address,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        contractAddress: this.wallet.address, // Placeholder
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Deploy ERC-20 token contract for a ShareType
   */
  async createShareType(
    shareTypeId: string,
    organizationId: string,
    name: string,
    symbol: string,
    decimals: number = 18,
    maxSupply?: number | string,
    metadata?: { description?: string; votingWeight?: number }
  ): Promise<{ transactionHash: string; tokenAddress: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'create_share_type';

    try {
      logger.info('Creating ShareType token on Polygon', {
        shareTypeId,
        organizationId,
        name,
        symbol,
        decimals,
      });

      // For MVP, we'll use a simple factory pattern
      // In production, deploy actual ERC-20 contracts using ContractFactory
      
      // Simplified: Just record the token creation in a transaction
      const tokenData = JSON.stringify({
        shareTypeId,
        organizationId,
        name,
        symbol,
        decimals,
        maxSupply,
        metadata,
      });

      let receipt: TransactionReceipt;
      if (this.useFixtures) {
        receipt = this.createFixtureReceipt(operation);
      } else {
        const tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          value: 0,
          data: ethers.hexlify(toUtf8Bytes(`TOKEN:${tokenData}`)),
        });

        receipt = await this.waitForTransaction(tx, operation);
      }

      // Generate deterministic token address from shareTypeId
      const tokenAddress = this.deriveTokenAddress(shareTypeId);

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('ShareType token created successfully', {
        shareTypeId,
        transactionHash: receipt.hash,
        tokenAddress,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        tokenAddress,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Mint tokens to a recipient (share issuance)
   */
  async recordShareIssuance(
    issuanceId: string,
    shareTypeId: string,
    userId: string,
    quantity: string,
    recipientAddress?: string,
    tokenAddress?: string,
    metadata?: { reason?: string; issuedBy?: string }
  ): Promise<{ transactionHash: string; gasUsed: string; recipientAddress: string }> {
    const startTime = Date.now();
    const operation = 'record_share_issuance';

    try {
      logger.info('Recording share issuance on Polygon', {
        issuanceId,
        shareTypeId,
        userId,
        quantity,
        recipientAddress,
        tokenAddress,
      });

      // In production, this would call the actual ERC-20 mint function
      // For MVP, we'll record the issuance in a transaction
      const resolvedTokenAddress =
        tokenAddress ?? (shareTypeId.startsWith('0x') ? shareTypeId : undefined);
      const targetRecipient = recipientAddress || this.wallet.address;

      if (!recipientAddress) {
        logger.warn('No recipientAddress provided; using service wallet for issuance proof');
      }

      const issuanceData = JSON.stringify({
        issuanceId,
        shareTypeId,
        userId,
        quantity,
        recipientAddress: targetRecipient,
        tokenAddress: resolvedTokenAddress ?? shareTypeId,
        metadata,
      });

      let receipt: TransactionReceipt;
      if (this.useFixtures) {
        receipt = this.createFixtureReceipt(operation);
      } else {
        const tx = await this.wallet.sendTransaction({
          to: targetRecipient,
          value: parseUnits(PROOF_OF_ISSUANCE_AMOUNT, 'ether'),
          data: ethers.hexlify(toUtf8Bytes(`ISSUANCE:${issuanceData}`)),
        });

        receipt = await this.waitForTransaction(tx, operation);
      }

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Share issuance recorded successfully', {
        issuanceId,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        recipientAddress: targetRecipient,
      });

      return {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        recipientAddress: targetRecipient,
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Create a proposal record on-chain
   */
  async createProposal(
    proposalId: string,
    organizationId: string,
    title: string,
    contentHash: string,
    startAt: Date,
    endAt: Date,
    metadata?: {
      eligibleVotingPower?: number;
      createdByUserId?: string;
      proposalTextHash?: string;
      expectationsHash?: string;
      votingOptionsHash?: string;
    }
  ): Promise<{ transactionHash: string; proposalAddress: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'create_proposal';

    try {
      logger.info('Creating proposal on Polygon', {
        proposalId,
        organizationId,
        title,
        contentHash,
      });

      const proposalData = JSON.stringify({
        proposalId,
        organizationId,
        title,
        contentHash,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        metadata,
      });

      let receipt: TransactionReceipt;
      if (this.useFixtures) {
        receipt = this.createFixtureReceipt(operation);
      } else {
        const tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          value: 0,
          data: ethers.hexlify(toUtf8Bytes(`PROPOSAL:${proposalData}`)),
        });

        receipt = await this.waitForTransaction(tx, operation);
      }

      const proposalAddress = this.deriveProposalAddress(proposalId);

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Proposal created successfully', {
        proposalId,
        transactionHash: receipt.hash,
        proposalAddress,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        proposalAddress,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Record a vote on-chain
   */
  async recordVote(
    voteId: string,
    proposalId: string,
    organizationId: string,
    userId: string,
    optionId: string,
    votingPower: string,
    metadata?: { voterAddress?: string; castAt?: Date }
  ): Promise<{ transactionHash: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'record_vote';

    try {
      logger.info('Recording vote on Polygon', {
        voteId,
        proposalId,
        userId,
        optionId,
        votingPower,
      });

      const voteData = JSON.stringify({
        voteId,
        proposalId,
        organizationId,
        userId,
        optionId,
        votingPower,
        metadata,
      });

      let receipt: TransactionReceipt;
      if (this.useFixtures) {
        receipt = this.createFixtureReceipt(operation);
      } else {
        const tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          value: 0,
          data: ethers.hexlify(toUtf8Bytes(`VOTE:${voteData}`)),
        });

        receipt = await this.waitForTransaction(tx, operation);
      }

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Vote recorded successfully', {
        voteId,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Commit proposal results to blockchain
   */
  async commitProposalResults(
    proposalId: string,
    organizationId: string,
    resultsHash: string,
    winningOptionId: string,
    totalVotesCast: number,
    metadata?: { quorumMet?: boolean; closedAt?: Date }
  ): Promise<{ transactionHash: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'commit_proposal_results';

    try {
      logger.info('Committing proposal results on Polygon', {
        proposalId,
        organizationId,
        resultsHash,
        winningOptionId,
        totalVotesCast,
        metadata,
      });

      let tx: TransactionResponse;

      if (this.useFixtures) {
        const receipt = this.createFixtureReceipt(operation);
        return {
          transactionHash: receipt.hash,
          gasUsed: receipt.gasUsed.toString(),
        };
      }

      // Use governance contract if available
      if (this.governanceContract) {
        const proposalIdBytes32 = keccak256(toUtf8Bytes(proposalId));
        const resultsHashBytes32 = '0x' + resultsHash;

        tx = await this.governanceContract.commitProposalResults(
          proposalIdBytes32,
          resultsHashBytes32
        );
      } else {
        // Fallback: record in transaction data
        const resultsData = JSON.stringify({
          proposalId,
          organizationId,
          resultsHash,
          winningOptionId,
          totalVotesCast,
          metadata,
        });

        tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          value: 0,
          data: ethers.hexlify(toUtf8Bytes(`RESULTS:${resultsData}`)),
        });
      }

      const receipt = await this.waitForTransaction(tx, operation);

      blockchainTransactionsTotal.inc({ operation, status: 'success' });
      blockchainTransactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        blockchainGasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Proposal results committed successfully', {
        proposalId,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainTransactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<{
    transactionId: string;
    status: string;
    confirmations: number;
    blockNumber?: number;
    timestamp?: number;
    gasUsed?: string;
  }> {
    const startTime = Date.now();

    try {
      if (this.useFixtures) {
        const fixtureTx = this.fixtureTransactions.get(txHash);
        return {
          transactionId: txHash,
          status: fixtureTx ? 'confirmed' : 'pending',
          confirmations: fixtureTx ? 6 : 0,
          blockNumber: fixtureTx?.blockNumber,
          timestamp: fixtureTx ? Math.floor(Date.now() / 1000) : undefined,
          gasUsed: fixtureTx?.gasUsed,
        };
      }

      logger.debug('Getting transaction status', { txHash });

      blockchainRpcRequestsTotal.inc({ method: 'getTransaction', status: 'pending' });

      const receipt = await this.provider!.getTransactionReceipt(txHash);

      blockchainRpcLatencySeconds.observe(
        { method: 'getTransaction' },
        (Date.now() - startTime) / 1000
      );
      blockchainRpcRequestsTotal.inc({ method: 'getTransaction', status: 'success' });

      if (!receipt) {
        return {
          transactionId: txHash,
          status: 'pending',
          confirmations: 0,
        };
      }

      const currentBlock = await this.provider!.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      const block = await this.provider!.getBlock(receipt.blockNumber);

      return {
        transactionId: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      blockchainRpcErrorsTotal.inc({ error_type: 'get_transaction' });
      blockchainRpcRequestsTotal.inc({ method: 'getTransaction', status: 'error' });
      this.handleBlockchainError(error, 'get_transaction_status');
      throw error;
    }
  }

  /**
   * Check health of the Polygon RPC connection
   */
  async checkHealth(): Promise<{
    status: string;
    network: string;
    rpcStatus: string;
    lastBlockNumber?: number;
    walletAddress: string;
    walletBalance?: string;
    chainId?: number;
    pendingTransactions?: number;
    rpcLatencyMs?: number;
  }> {
    try {
      if (this.useFixtures) {
        blockchainAdapterHealth.set({ chain_id: this.chainId }, 1);
        blockchainLastBlockNumber.set({ chain_id: this.chainId }, this.fixtureBlockNumber);
        blockchainPendingTransactions.set(
          { wallet_address: this.wallet.address, chain_id: this.chainId },
          0
        );
        return {
          status: 'healthy',
          network: config.polygon.network,
          rpcStatus: 'fixture',
          lastBlockNumber: this.fixtureBlockNumber,
          walletAddress: this.wallet.address,
          walletBalance: '1.0 MATIC',
          chainId: Number(this.chainId),
          pendingTransactions: 0,
          rpcLatencyMs: 0,
        };
      }

      const startTime = Date.now();

      // Check RPC connectivity and capture metadata
      const [networkInfo, blockNumber] = await Promise.all([
        this.provider!.getNetwork(),
        this.provider!.getBlockNumber(),
      ]);

      this.chainId = networkInfo.chainId.toString();
      blockchainLastBlockNumber.set({ chain_id: this.chainId }, blockNumber);

      // Check wallet balance
      const balance = await this.provider!.getBalance(this.wallet.address);

      // Pending transaction backlog (wallet level)
      let pendingCount = this.lastPendingCount;
      const now = Date.now();
      if (now - this.lastNonceCheckMs > this.nonceCacheTtlMs) {
        this.lastNonceCheckMs = now;
        this.refreshPendingCount().catch(() => {
          /* background refresh errors are logged in refreshPendingCount */
        });
      }
      blockchainPendingTransactions.set(
        { wallet_address: this.wallet.address, chain_id: this.chainId },
        pendingCount
      );

      // Get current gas price
      const feeData = await this.provider!.getFeeData();
      if (feeData.gasPrice) {
        const gasPriceInGwei = Number(formatUnits(feeData.gasPrice, 'gwei'));
        blockchainGasPriceGwei.set({ chain_id: this.chainId }, gasPriceInGwei);
      }

      const latency = Date.now() - startTime;

      blockchainAdapterHealth.set({ chain_id: this.chainId }, 1);
      blockchainRpcLatencySeconds.observe({ method: 'health_check' }, latency / 1000);
      blockchainRpcRequestsTotal.inc({ method: 'health_check', status: 'success' });

      logger.debug('Health check completed', {
        blockNumber,
        balance: formatUnits(balance, 'ether'),
        latency,
        chainId: this.chainId,
        pendingCount,
      });

      return {
        status: 'healthy',
        network: config.polygon.network,
        rpcStatus: 'connected',
        lastBlockNumber: blockNumber,
        walletAddress: this.wallet.address,
        walletBalance: formatUnits(balance, 'ether') + ' MATIC',
        chainId: Number(this.chainId),
        pendingTransactions: pendingCount,
        rpcLatencyMs: latency,
      };
    } catch (error) {
      blockchainAdapterHealth.set({ chain_id: this.chainId }, 0);
      blockchainRpcRequestsTotal.inc({ method: 'health_check', status: 'error' });
      logger.error('Health check failed', {
        error: serializeError(error),
        chainId: this.chainId,
      });

      return {
        status: 'unhealthy',
        network: config.polygon.network,
        rpcStatus: 'error',
        walletAddress: this.wallet.address,
        chainId: Number(this.chainId),
      };
    }
  }

  private async refreshPendingCount(): Promise<void> {
    try {
      if (this.useFixtures) {
        this.lastPendingCount = 0;
        blockchainPendingTransactions.set(
          { wallet_address: this.wallet.address, chain_id: this.chainId },
          0
        );
        return;
      }

      const [pendingNonce, confirmedNonce] = await Promise.all([
        this.provider!.getTransactionCount(this.wallet.address, 'pending'),
        this.provider!.getTransactionCount(this.wallet.address, 'latest'),
      ]);
      const pendingCount = Math.max(pendingNonce - confirmedNonce, 0);
      this.lastPendingCount = pendingCount;
      blockchainPendingTransactions.set(
        { wallet_address: this.wallet.address, chain_id: this.chainId },
        pendingCount
      );
    } catch (error) {
      logger.warn('Unable to refresh pending transaction backlog', {
        error: serializeError(error),
        chainId: this.chainId,
      });
    }
  }

  /**
   * Wait for transaction confirmation with retry logic
   */
  private async waitForTransaction(
    tx: TransactionResponse,
    operation: string
  ): Promise<TransactionReceipt> {
    if (this.useFixtures) {
      return this.createFixtureReceipt(operation);
    }

    logger.debug('Waiting for transaction confirmation', {
      hash: tx.hash,
      operation,
    });

    let attempt = 0;
    const maxAttempts = config.retry.maxAttempts;

    while (attempt < maxAttempts) {
      try {
        const receipt = await tx.wait(config.polygon.confirmations);

        if (!receipt) {
          throw new TransactionError('Transaction receipt is null');
        }

        if (receipt.status === 0) {
          throw new TransactionError('Transaction failed on-chain', receipt.hash);
        }

        logger.debug('Transaction confirmed', {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        });

        return receipt;
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw new TransactionError(
            `Transaction confirmation failed after ${maxAttempts} attempts`,
            serializeError(error).message
          );
        }

        const delay = config.retry.baseDelayMs * Math.pow(2, attempt - 1);
        logger.warn('Transaction confirmation attempt failed, retrying...', {
          hash: tx.hash,
          attempt,
          maxAttempts,
          delay,
        });

        await this.sleep(delay);
      }
    }

    throw new TransactionError('Transaction confirmation failed');
  }

  /**
   * Handle blockchain errors and convert to appropriate error types
   */
  private handleBlockchainError(error: unknown, operation: string): void {
    const serialized = serializeError(error);
    
    logger.error('Blockchain operation failed', {
      operation,
      error: serialized,
    });

    blockchainRpcErrorsTotal.inc({ error_type: operation });

    const message = serialized.message.toLowerCase();

    if (message.includes('timeout') || message.includes('network')) {
      throw new RpcError('RPC timeout or network error', serialized.message);
    }

    if (message.includes('insufficient funds') || message.includes('balance')) {
      throw new TransactionError('Insufficient MATIC balance for gas fees', serialized.message);
    }

    if (message.includes('nonce')) {
      throw new TransactionError('Nonce error, transaction may be pending', serialized.message);
    }

    if (message.includes('gas')) {
      throw new TransactionError('Gas estimation or execution error', serialized.message);
    }
    // Re-throw as generic RpcError if no specific pattern matches
    throw new RpcError('Blockchain operation failed', serialized.message);
  }

  private createFixtureReceipt(operation: string): TransactionReceipt {
    const blockNumber = this.fixtureBlockNumber++;
    const hash = keccak256(toUtf8Bytes(`${operation}:${blockNumber}`));
    const gasUsed = BigInt(65_000);
    const gasPrice = parseUnits('1', 'gwei');

    const params: TransactionReceiptParams = {
      to: this.wallet.address,
      from: this.wallet.address,
      contractAddress: this.wallet.address,
      hash,
      index: 0,
      blockHash: hash,
      blockNumber,
      logsBloom: '0x',
      logs: [],
      gasUsed,
      cumulativeGasUsed: gasUsed,
      gasPrice,
      blobGasUsed: null,
      blobGasPrice: null,
      effectiveGasPrice: gasPrice,
      type: 0,
      status: 1,
      root: null,
    };

    const provider = this.provider ?? new JsonRpcProvider('http://localhost:0');
    const receipt = new TransactionReceipt(params, provider);

    Object.defineProperty(receipt, 'confirmations', { value: async () => 1, writable: false });

    this.fixtureTransactions.set(hash, { blockNumber, gasUsed: gasUsed.toString() });

    return receipt;
  }

  /**
   * Derive deterministic token address from shareTypeId
   */
  private deriveTokenAddress(shareTypeId: string): string {
    // In production, use actual CREATE2 deterministic deployment
    // For MVP, generate a deterministic address from the ID
    const hash = keccak256(toUtf8Bytes(shareTypeId));
    return '0x' + hash.slice(26); // Take last 40 hex chars (20 bytes) for address
  }

  /**
   * Derive deterministic proposal address from proposalId
   */
  private deriveProposalAddress(proposalId: string): string {
    const hash = keccak256(toUtf8Bytes(proposalId));
    return '0x' + hash.slice(26);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
