import {
  ethers,
  Wallet,
  JsonRpcProvider,
  Contract,
  TransactionReceipt,
  TransactionResponse,
  parseUnits,
  formatUnits,
  keccak256,
  toUtf8Bytes,
} from 'ethers';
import { config } from './config.js';
import { logger } from './logger.js';
import {
  transactionsTotal,
  transactionDuration,
  rpcErrorsTotal,
  rpcRequestsTotal,
  rpcLatency,
  lastBlockNumber,
  gasUsedTotal,
  gasPriceGwei,
} from './metrics.js';
import { RpcError, TransactionError } from './errors.js';

// Simple Governance Registry contract ABI
const GOVERNANCE_ABI = [
  'function commitProposalResults(bytes32 proposalId, bytes32 resultsHash) public',
  'function getProposalResults(bytes32 proposalId) view returns (bytes32)',
  'event ResultsCommitted(bytes32 indexed proposalId, bytes32 resultsHash)',
];

// Constants
const PROOF_OF_ISSUANCE_AMOUNT = '0.0001'; // MATIC sent as proof of issuance

export class PolygonService {
  private provider: JsonRpcProvider;
  private wallet: Wallet;
  private governanceContract?: Contract;

  constructor(wallet: Wallet) {
    this.provider = new JsonRpcProvider(config.polygon.rpcUrl);
    this.wallet = wallet.connect(this.provider);

    logger.info('PolygonService initialized', {
      network: config.polygon.network,
      rpcUrl: config.polygon.rpcUrl,
      walletAddress: this.wallet.address,
      confirmations: config.polygon.confirmations,
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

  /**
   * Create organization by deploying a simple registry contract
   * In production, this would deploy a more sophisticated governance contract
   */
  async createOrganization(
    organizationId: string,
    name: string,
    _description?: string
  ): Promise<{ transactionHash: string; contractAddress: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'create_organization';

    try {
      logger.info('Creating organization on Polygon', { organizationId, name });

      // For MVP, we'll just send a transaction with the org data in the transaction data
      // In production, deploy an actual organization registry contract using CREATE2
      // for deterministic deployment based on organizationId
      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address, // Send to self as placeholder
        value: 0,
        data: ethers.hexlify(toUtf8Bytes(`ORG:${organizationId}:${name}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
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
      transactionsTotal.inc({ operation, status: 'error' });
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
    decimals: number = 18
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
      });

      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address,
        value: 0,
        data: ethers.hexlify(toUtf8Bytes(`TOKEN:${tokenData}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      // Generate deterministic token address from shareTypeId
      const tokenAddress = this.deriveTokenAddress(shareTypeId);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
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
      transactionsTotal.inc({ operation, status: 'error' });
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
    recipientAddress: string,
    tokenAddress: string
  ): Promise<{ transactionHash: string; gasUsed: string }> {
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
      const issuanceData = JSON.stringify({
        issuanceId,
        shareTypeId,
        userId,
        quantity,
        recipientAddress,
        tokenAddress,
      });

      const tx = await this.wallet.sendTransaction({
        to: recipientAddress,
        value: parseUnits(PROOF_OF_ISSUANCE_AMOUNT, 'ether'), // Send tiny amount as proof of issuance
        data: ethers.hexlify(toUtf8Bytes(`ISSUANCE:${issuanceData}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
      }

      logger.info('Share issuance recorded successfully', {
        issuanceId,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      });

      return {
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      transactionsTotal.inc({ operation, status: 'error' });
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
    endAt: Date
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
      });

      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address,
        value: 0,
        data: ethers.hexlify(toUtf8Bytes(`PROPOSAL:${proposalData}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      const proposalAddress = this.deriveProposalAddress(proposalId);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
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
      transactionsTotal.inc({ operation, status: 'error' });
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
    userId: string,
    optionId: string,
    votingPower: string
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
        userId,
        optionId,
        votingPower,
      });

      const tx = await this.wallet.sendTransaction({
        to: this.wallet.address,
        value: 0,
        data: ethers.hexlify(toUtf8Bytes(`VOTE:${voteData}`)),
      });

      const receipt = await this.waitForTransaction(tx, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
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
      transactionsTotal.inc({ operation, status: 'error' });
      this.handleBlockchainError(error, operation);
      throw error;
    }
  }

  /**
   * Commit proposal results to blockchain
   */
  async commitProposalResults(
    proposalId: string,
    resultsHash: string,
    winningOptionId: string,
    totalVotesCast: number
  ): Promise<{ transactionHash: string; gasUsed: string }> {
    const startTime = Date.now();
    const operation = 'commit_proposal_results';

    try {
      logger.info('Committing proposal results on Polygon', {
        proposalId,
        resultsHash,
        winningOptionId,
        totalVotesCast,
      });

      let tx: TransactionResponse;

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
          resultsHash,
          winningOptionId,
          totalVotesCast,
        });

        tx = await this.wallet.sendTransaction({
          to: this.wallet.address,
          value: 0,
          data: ethers.hexlify(toUtf8Bytes(`RESULTS:${resultsData}`)),
        });
      }

      const receipt = await this.waitForTransaction(tx, operation);

      transactionsTotal.inc({ operation, status: 'success' });
      transactionDuration.observe({ operation }, (Date.now() - startTime) / 1000);

      if (receipt.gasUsed) {
        gasUsedTotal.inc({ operation }, Number(receipt.gasUsed));
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
      transactionsTotal.inc({ operation, status: 'error' });
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
      logger.debug('Getting transaction status', { txHash });

      rpcRequestsTotal.inc({ method: 'getTransaction', status: 'pending' });

      const receipt = await this.provider.getTransactionReceipt(txHash);

      rpcLatency.observe({ method: 'getTransaction' }, (Date.now() - startTime) / 1000);
      rpcRequestsTotal.inc({ method: 'getTransaction', status: 'success' });

      if (!receipt) {
        return {
          transactionId: txHash,
          status: 'pending',
          confirmations: 0,
        };
      }

      const currentBlock = await this.provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber + 1;

      const block = await this.provider.getBlock(receipt.blockNumber);

      return {
        transactionId: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        confirmations,
        blockNumber: receipt.blockNumber,
        timestamp: block?.timestamp,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      rpcErrorsTotal.inc({ error_type: 'get_transaction' });
      rpcRequestsTotal.inc({ method: 'getTransaction', status: 'error' });
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
  }> {
    try {
      const startTime = Date.now();

      // Check RPC connectivity
      const blockNumber = await this.provider.getBlockNumber();
      lastBlockNumber.set(blockNumber);

      // Check wallet balance
      const balance = await this.provider.getBalance(this.wallet.address);

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      if (feeData.gasPrice) {
        const gasPriceInGwei = Number(formatUnits(feeData.gasPrice, 'gwei'));
        gasPriceGwei.set(gasPriceInGwei);
      }

      const latency = Date.now() - startTime;

      logger.debug('Health check completed', {
        blockNumber,
        balance: formatUnits(balance, 'ether'),
        latency,
      });

      return {
        status: 'healthy',
        network: config.polygon.network,
        rpcStatus: 'connected',
        lastBlockNumber: blockNumber,
        walletAddress: this.wallet.address,
        walletBalance: formatUnits(balance, 'ether') + ' MATIC',
      };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        status: 'unhealthy',
        network: config.polygon.network,
        rpcStatus: 'error',
        walletAddress: this.wallet.address,
      };
    }
  }

  /**
   * Wait for transaction confirmation with retry logic
   */
  private async waitForTransaction(
    tx: TransactionResponse,
    operation: string
  ): Promise<TransactionReceipt> {
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
            error instanceof Error ? error.message : 'Unknown error'
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
    logger.error('Blockchain operation failed', {
      operation,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    rpcErrorsTotal.inc({ error_type: operation });

    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('timeout') || message.includes('network')) {
        throw new RpcError('RPC timeout or network error', error.message);
      }

      if (message.includes('insufficient funds') || message.includes('balance')) {
        throw new TransactionError('Insufficient MATIC balance for gas fees', error.message);
      }

      if (message.includes('nonce')) {
        throw new TransactionError('Nonce error, transaction may be pending', error.message);
      }

      if (message.includes('gas')) {
        throw new TransactionError('Gas estimation or execution error', error.message);
      }
    }
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
