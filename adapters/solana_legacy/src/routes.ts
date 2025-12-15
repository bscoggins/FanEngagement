import { Router, Request, Response } from 'express';
import { SolanaService } from './solana-service.js';
import { 
  createOrganizationSchema,
  createShareTypeSchema,
  recordShareIssuanceSchema,
  createProposalSchema,
  recordVoteSchema,
  commitProposalResultsSchema,
} from './schemas.js';
import { handleError } from './errors.js';
import { getMetricsRegistry } from './metrics.js';
import { healthStatus } from './metrics.js';
import { config } from './config.js';
import { createPostHandler } from '../../shared/http.js';

export function createRoutes(solanaService: SolanaService): Router {
  const router = Router();

  // POST /v1/adapter/organizations
  router.post(
    '/v1/adapter/organizations',
    createPostHandler({
      schema: createOrganizationSchema,
      execute: (data) =>
        solanaService.createOrganization(
          data.organizationId,
          data.name,
          data.description
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        accountAddress: result.accountAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // POST /v1/adapter/share-types
  router.post(
    '/v1/adapter/share-types',
    createPostHandler({
      schema: createShareTypeSchema,
      execute: (data) =>
        solanaService.createShareType(
          data.shareTypeId,
          data.organizationId,
          data.name,
          data.symbol,
          data.decimals
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        mintAddress: result.mintAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // POST /v1/adapter/share-issuances
  router.post(
    '/v1/adapter/share-issuances',
    createPostHandler({
      schema: recordShareIssuanceSchema,
      execute: (data) =>
        solanaService.recordShareIssuance(
          data.issuanceId,
          data.shareTypeId,
          data.userId,
          data.quantity,
          data.recipientAddress
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        recipientAddress: result.recipientAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // POST /v1/adapter/proposals
  router.post(
    '/v1/adapter/proposals',
    createPostHandler({
      schema: createProposalSchema,
      execute: (data) =>
        solanaService.createProposal(
          data.proposalId,
          data.organizationId,
          data.title,
          data.contentHash,
          new Date(data.startAt),
          new Date(data.endAt),
          {
            createdByUserId: data.createdByUserId,
            proposalTextHash: data.proposalTextHash,
            expectationsHash: data.expectationsHash,
            votingOptionsHash: data.votingOptionsHash,
            eligibleVotingPower: data.eligibleVotingPower,
          }
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        proposalAddress: result.proposalAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // POST /v1/adapter/votes
  router.post(
    '/v1/adapter/votes',
    createPostHandler({
      schema: recordVoteSchema,
      execute: (data) =>
        solanaService.recordVote(
          data.voteId,
          data.proposalId,
          data.organizationId,
          data.userId,
          data.optionId,
          data.votingPower,
          {
            voterAddress: data.voterAddress,
            castAt: data.timestamp ? new Date(data.timestamp) : undefined,
          }
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // POST /v1/adapter/proposal-results
  router.post(
    '/v1/adapter/proposal-results',
    createPostHandler({
      schema: commitProposalResultsSchema,
      execute: (data) =>
        solanaService.commitProposalResults(
          data.proposalId,
          data.organizationId,
          data.resultsHash,
          data.winningOptionId || '',
          data.totalVotesCast,
          {
            quorumMet: data.quorumMet,
            closedAt: new Date(data.closedAt),
          }
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionSignature,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      }),
      onError: handleError,
    })
  );

  // GET /v1/adapter/transactions/:txId
  router.get('/v1/adapter/transactions/:txId', async (req: Request, res: Response) => {
    try {
      const { txId } = req.params;
      
      const result = await solanaService.getTransactionStatus(txId);

      res.status(200).json({
        transactionId: result.transactionId,
        status: result.status,
        confirmations: result.confirmations,
        blockNumber: result.blockNumber,
        timestamp: result.timestamp ? new Date(result.timestamp * 1000).toISOString() : undefined,
        explorerUrl: `https://explorer.solana.com/tx/${txId}?cluster=${config.solana.network}`,
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // GET /v1/adapter/health
  router.get('/v1/adapter/health', async (_req: Request, res: Response) => {
    try {
      const health = await solanaService.checkHealth();
      
      // Update health metrics
      healthStatus.set(health.status === 'healthy' ? 1 : 0);

      const statusCode = health.status === 'healthy' ? 200 : 503;

      const payload: {
        status: string;
        blockchain: string;
        network: string;
        rpcStatus: string;
        lastBlockNumber?: number;
        timestamp: string;
        errorMessage?: string;
      } = {
        status: health.status,
        blockchain: 'solana',
        network: health.network,
        rpcStatus: health.rpcStatus,
        lastBlockNumber: health.lastBlockNumber,
        timestamp: new Date().toISOString(),
      };

      if (health.errorMessage) {
        payload.errorMessage = health.errorMessage;
      }

      res.status(statusCode).json(payload);
    } catch (error) {
      healthStatus.set(0);
      res.status(503).json({
        status: 'unhealthy',
        blockchain: 'solana',
        network: process.env.SOLANA_NETWORK || 'unknown',
        rpcStatus: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // GET /v1/adapter/metrics
  router.get('/v1/adapter/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', getMetricsRegistry().contentType);
      const metrics = await getMetricsRegistry().metrics();
      res.send(metrics);
    } catch (error) {
      handleError(error, req, res);
    }
  });

  return router;
}
