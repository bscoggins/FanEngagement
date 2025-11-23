using FanEngagement.Application.Proposals;
using FanEngagement.Domain.Enums;
using FanEngagement.Domain.Services;
using FanEngagement.Infrastructure.Configuration;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FanEngagement.Infrastructure.BackgroundServices;

/// <summary>
/// Background service that processes proposal lifecycle transitions automatically.
/// - Opens proposals when StartAt time has passed and they are in Draft status
/// - Closes proposals when EndAt time has passed and they are in Open status
/// </summary>
/// <remarks>
/// Lifecycle transitions follow strict state machine rules:
/// - Draft → Open (when StartAt <= now)
/// - Open → Closed (when EndAt <= now)
/// - Finalized transitions are manual only (not handled by this service)
/// </remarks>
public class ProposalLifecycleBackgroundService(
    IServiceProvider serviceProvider,
    IOptions<ProposalLifecycleOptions> options,
    ILogger<ProposalLifecycleBackgroundService> logger) : BackgroundService
{
    private readonly ProposalLifecycleOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "ProposalLifecycleBackgroundService started (polling interval: {Interval}s, max batch: {MaxBatch})",
            _options.PollingIntervalSeconds,
            _options.MaxProposalsPerBatch);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessProposalTransitionsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful cancellation, exit loop
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(ex, "Error processing proposal lifecycle transitions");
            }

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_options.PollingIntervalSeconds), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful cancellation during delay
                break;
            }
        }

        logger.LogInformation("ProposalLifecycleBackgroundService stopped");
    }

    private async Task ProcessProposalTransitionsAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var proposalService = scope.ServiceProvider.GetRequiredService<IProposalService>();

        var now = DateTimeOffset.UtcNow;

        // Find proposals that need to be opened
        var proposalsToOpen = await dbContext.Proposals
            .Where(p => p.Status == ProposalStatus.Draft
                     && p.StartAt.HasValue
                     && p.StartAt.Value <= now)
            .Include(p => p.Options)
            .Take(_options.MaxProposalsPerBatch)
            .ToListAsync(cancellationToken);

        // Find proposals that need to be closed
        var proposalsToClose = await dbContext.Proposals
            .Where(p => p.Status == ProposalStatus.Open
                     && p.EndAt.HasValue
                     && p.EndAt.Value <= now)
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .Take(_options.MaxProposalsPerBatch)
            .ToListAsync(cancellationToken);

        if (proposalsToOpen.Count == 0 && proposalsToClose.Count == 0)
        {
            return;
        }

        logger.LogInformation(
            "Processing proposal lifecycle transitions: {OpenCount} to open, {CloseCount} to close",
            proposalsToOpen.Count,
            proposalsToClose.Count);

        // Process proposals to open
        foreach (var proposal in proposalsToOpen)
        {
            try
            {
                await OpenProposalAsync(dbContext, proposalService, proposal, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Error opening proposal {ProposalId} (Title: {Title})",
                    proposal.Id,
                    proposal.Title);
            }
        }

        // Process proposals to close
        foreach (var proposal in proposalsToClose)
        {
            try
            {
                await CloseProposalAsync(proposalService, proposal, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Error closing proposal {ProposalId} (Title: {Title})",
                    proposal.Id,
                    proposal.Title);
            }
        }
    }

    private async Task OpenProposalAsync(
        FanEngagementDbContext dbContext,
        IProposalService proposalService,
        Domain.Entities.Proposal proposal,
        CancellationToken cancellationToken)
    {
        // Validate using domain service
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanOpen(proposal);
        
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Cannot open proposal {ProposalId} (Title: {Title}): {Reason}",
                proposal.Id,
                proposal.Title,
                validation.ErrorMessage);
            return;
        }

        // Use the service to perform the transition (which handles snapshot and event)
        var result = await proposalService.OpenAsync(proposal.Id, cancellationToken);
        
        if (result != null)
        {
            logger.LogInformation(
                "Automatically opened proposal {ProposalId} (Title: {Title})",
                proposal.Id,
                proposal.Title);
        }
    }

    private async Task CloseProposalAsync(
        IProposalService proposalService,
        Domain.Entities.Proposal proposal,
        CancellationToken cancellationToken)
    {
        // Validate using domain service
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanClose(proposal);
        
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Cannot close proposal {ProposalId} (Title: {Title}): {Reason}",
                proposal.Id,
                proposal.Title,
                validation.ErrorMessage);
            return;
        }

        // Use the service to perform the transition (which computes results and enqueues event)
        var result = await proposalService.CloseAsync(proposal.Id, cancellationToken);
        
        if (result != null)
        {
            logger.LogInformation(
                "Automatically closed proposal {ProposalId} (Title: {Title}, Quorum Met: {QuorumMet})",
                proposal.Id,
                proposal.Title,
                result.QuorumMet);
        }
    }
}
