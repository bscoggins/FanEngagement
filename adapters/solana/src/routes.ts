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

export function createRoutes(solanaService: SolanaService): Router {
  const router = Router();

  // POST /v1/adapter/organizations
  router.post('/v1/adapter/organizations', async (req: Request, res: Response) => {
    try {
      const data = createOrganizationSchema.parse(req.body);
      
      const result = await solanaService.createOrganization(
        data.organizationId,
        data.name,
        data.description
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        accountAddress: result.accountAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // POST /v1/adapter/share-types
  router.post('/v1/adapter/share-types', async (req: Request, res: Response) => {
    try {
      const data = createShareTypeSchema.parse(req.body);
      
      const result = await solanaService.createShareType(
        data.shareTypeId,
        data.organizationId,
        data.name,
        data.symbol,
        data.decimals
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        mintAddress: result.mintAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // POST /v1/adapter/share-issuances
  router.post('/v1/adapter/share-issuances', async (req: Request, res: Response) => {
    try {
      const data = recordShareIssuanceSchema.parse(req.body);
      
      const result = await solanaService.recordShareIssuance(
        data.issuanceId,
        data.shareTypeId,
        data.userId,
        data.quantity,
        data.recipientAddress
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        recipientAddress: result.recipientAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // POST /v1/adapter/proposals
  router.post('/v1/adapter/proposals', async (req: Request, res: Response) => {
    try {
      const data = createProposalSchema.parse(req.body);
      
      const result = await solanaService.createProposal(
        data.proposalId,
        data.organizationId,
        data.title,
        data.contentHash,
        new Date(data.startAt),
        new Date(data.endAt)
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        proposalAddress: result.proposalAddress,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // POST /v1/adapter/votes
  router.post('/v1/adapter/votes', async (req: Request, res: Response) => {
    try {
      const data = recordVoteSchema.parse(req.body);
      
      const result = await solanaService.recordVote(
        data.voteId,
        data.proposalId,
        data.userId,
        data.optionId,
        data.votingPower
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

  // POST /v1/adapter/proposal-results
  router.post('/v1/adapter/proposal-results', async (req: Request, res: Response) => {
    try {
      const data = commitProposalResultsSchema.parse(req.body);
      
      const result = await solanaService.commitProposalResults(
        data.proposalId,
        data.resultsHash,
        data.winningOptionId || '',
        data.totalVotesCast
      );

      res.status(201).json({
        transactionId: result.transactionSignature,
        status: 'confirmed',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      handleError(error, req, res);
    }
  });

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

      res.status(statusCode).json({
        status: health.status,
        blockchain: 'solana',
        network: health.network,
        rpcStatus: health.rpcStatus,
        lastBlockNumber: health.lastBlockNumber,
        timestamp: new Date().toISOString(),
      });
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
