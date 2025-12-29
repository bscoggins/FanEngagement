import { Router, Request, Response } from 'express';
import { PolygonService } from './polygon-service.js';
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

export function createRoutes(polygonService: PolygonService): Router {
  const router = Router();

  // POST /v1/adapter/organizations
  router.post(
    '/v1/adapter/organizations',
    createPostHandler({
      schema: createOrganizationSchema,
      execute: (data) =>
        polygonService.createOrganization(
          data.organizationId,
          data.name,
          data.description
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionHash,
        accountAddress: result.contractAddress,
        gasUsed: result.gasUsed,
        status: 'confirmed',
        network: config.polygon.network,
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
        polygonService.createShareType(
          data.shareTypeId,
          data.organizationId,
          data.name,
          data.symbol,
          data.decimals,
          data.maxSupply,
          data.metadata
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionHash,
        mintAddress: result.tokenAddress,
        gasUsed: result.gasUsed,
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
        polygonService.recordShareIssuance(
          data.issuanceId,
          data.shareTypeId,
          data.userId,
          data.quantity,
          data.recipientAddress,
          undefined,
          data.metadata
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionHash,
        gasUsed: result.gasUsed,
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
        polygonService.createProposal(
          data.proposalId,
          data.organizationId,
          data.title,
          data.contentHash,
          new Date(data.startAt),
          new Date(data.endAt),
          {
            eligibleVotingPower: data.eligibleVotingPower,
            createdByUserId: data.createdByUserId,
            proposalTextHash: data.proposalTextHash,
            expectationsHash: data.expectationsHash,
            votingOptionsHash: data.votingOptionsHash,
          }
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionHash,
        proposalAddress: result.proposalAddress,
        gasUsed: result.gasUsed,
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
        polygonService.recordVote(
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
        transactionId: result.transactionHash,
        gasUsed: result.gasUsed,
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
        polygonService.commitProposalResults(
          data.proposalId,
          data.organizationId,
          data.resultsHash,
          data.winningOptionId || '',
          data.totalVotesCast,
          {
            quorumMet: data.quorumMet,
            closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
          }
        ),
      buildResponse: (result) => ({
        transactionId: result.transactionHash,
        gasUsed: result.gasUsed,
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

      const result = await polygonService.getTransactionStatus(txId);

      // Determine block explorer URL based on network
      let explorerUrl: string;
      if (config.polygon.blockExplorerUrl) {
        explorerUrl = `${config.polygon.blockExplorerUrl}/tx/${txId}`;
      } else if (config.polygon.network === 'amoy') {
        explorerUrl = `https://amoy.polygonscan.com/tx/${txId}`;
      } else if (config.polygon.network === 'mumbai') {
        explorerUrl = `https://mumbai.polygonscan.com/tx/${txId}`;
      } else {
        explorerUrl = `https://polygonscan.com/tx/${txId}`;
      }

      res.status(200).json({
        transactionId: result.transactionId,
        status: result.status,
        confirmations: result.confirmations,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
        timestamp: result.timestamp ? new Date(result.timestamp * 1000).toISOString() : undefined,
        explorerUrl,
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  const healthHandler = async (_req: Request, res: Response) => {
    try {
      const health = await polygonService.checkHealth();

      // Update health metrics
      healthStatus.set(health.status === 'healthy' ? 1 : 0);

      const statusCode = health.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        status: health.status,
        blockchain: 'polygon',
        network: health.network,
        rpcStatus: health.rpcStatus,
        lastBlockNumber: health.lastBlockNumber,
        walletAddress: health.walletAddress,
        walletBalance: health.walletBalance,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      healthStatus.set(0);
      res.status(503).json({
        status: 'unhealthy',
        blockchain: 'polygon',
        network: config.polygon.network,
        rpcStatus: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // GET /v1/adapter/health
  router.get('/v1/adapter/health', healthHandler);
  // GET /health
  router.get('/health', healthHandler);

  const metricsHandler = async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', getMetricsRegistry().contentType);
      const metrics = await getMetricsRegistry().metrics();
      res.send(metrics);
    } catch (error) {
      handleError(error, req, res);
    }
  };

  // GET /v1/adapter/metrics
  router.get('/v1/adapter/metrics', metricsHandler);
  // GET /metrics
  router.get('/metrics', metricsHandler);

  return router;
}
