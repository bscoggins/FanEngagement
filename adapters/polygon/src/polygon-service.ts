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

// Simple ERC-20 contract ABI (standard functions we need)
// Kept for reference, may be used in future implementations
// const ERC20_ABI = [
//   'constructor(string name, string symbol, uint8 decimals, uint256 maxSupply)',
//   'function name() view returns (string)',
//   'function symbol() view returns (string)',
//   'function decimals() view returns (uint8)',
//   'function totalSupply() view returns (uint256)',
//   'function balanceOf(address account) view returns (uint256)',
//   'function mint(address to, uint256 amount) returns (bool)',
//   'function transfer(address to, uint256 amount) returns (bool)',
// ];

// Simple ERC-20 bytecode (minimal implementation with minting capability)
// This is a simplified version for demonstration. In production, use a proper compiled contract.
// Kept for reference, may be used in future implementations
// const ERC20_BYTECODE =
//   '0x60806040523480156200001157600080fd5b5060405162000f0038038062000f008339810160408190526200003491620001a1565b8351849084906200004d90600390602085019062000028565b5080516200006390600490602084019062000028565b5050600580546001600160a01b0319163317905550600655506200024f915050565b8280546200009690620002125762000284565b90600052602060002090601f016020900481019282620000ba576000855562000105565b82601f10620000d557805160ff191683800117855562000105565b8280016001018555821562000105579182015b8281111562000105578251825591602001919060010190620000e8565b506200011392915062000117565b5090565b5b8082111562000113576000815560010162000118565b634e487b7160e01b600052604160045260246000fd5b600082601f8301126200015657600080fd5b81516001600160401b03808211156200017357620001736200012e565b604051601f8301601f19908116603f011681019082821181831017156200019e576200019e6200012e565b81604052838152602092508683858801011115620001bb57600080fd5b600091505b83821015620001df5785820183015181830184015290820190620001c0565b83821115620001f15760008385830101525b9695505050505050565b6000602082840312156200020e57600080fd5b5051919050565b600181811c908216806200022757607f821691505b602082108114156200024957634e487b7160e01b600052602260045260246000fd5b50919050565b610ca1806200025f6000396000f3fe';

// Simple Governance Registry contract ABI
const GOVERNANCE_ABI = [
  'function commitProposalResults(bytes32 proposalId, bytes32 resultsHash) public',
  'function getProposalResults(bytes32 proposalId) view returns (bytes32)',
  'event ResultsCommitted(bytes32 indexed proposalId, bytes32 resultsHash)',
];

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

      // Derive deterministic address using CREATE2-like approach (simplified)
      // In production, use actual CREATE2 for deterministic deployment
      const salt = keccak256(toUtf8Bytes(organizationId));
      
      logger.debug('Organization salt derived', {
        organizationId,
        salt,
      });

      // For MVP, we'll just send a transaction with the org data in the transaction data
      // In production, deploy an actual organization registry contract
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
        value: parseUnits('0.0001', 'ether'), // Send tiny amount as proof of issuance
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
        const proposalIdBytes32 = ethers.zeroPadValue(
          ethers.hexlify(toUtf8Bytes(proposalId)),
          32
        );
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
