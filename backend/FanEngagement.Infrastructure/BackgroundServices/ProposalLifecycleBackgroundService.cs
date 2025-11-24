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
            .AsNoTracking()
            .Where(p => p.Status == ProposalStatus.Draft
                     && p.StartAt.HasValue
                     && p.StartAt.Value <= now)
            .Take(_options.MaxProposalsPerBatch)
            .ToListAsync(cancellationToken);

        // Find proposals that need to be closed
        var proposalsToClose = await dbContext.Proposals
            .AsNoTracking()
            .Where(p => p.Status == ProposalStatus.Open
                     && p.EndAt.HasValue
                     && p.EndAt.Value <= now)
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
                await OpenProposalAsync(proposalService, proposal, cancellationToken);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex) when (ex is not OutOfMemoryException && ex is not StackOverflowException)
            {
                logger.LogError(
                    ex,
                    "Error opening proposal {ProposalId} (OrgId: {OrganizationId}, Title: {Title})",
                    proposal.Id,
                    proposal.OrganizationId,
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
                    "Error closing proposal {ProposalId} (OrgId: {OrganizationId}, Title: {Title})",
                    proposal.Id,
                    proposal.OrganizationId,
                    proposal.Title);
            }
        }
    }

    private async Task OpenProposalAsync(
        IProposalService proposalService,
        Domain.Entities.Proposal proposal,
        CancellationToken cancellationToken)
    {
        // Call service method directly - it will re-load and validate with fresh data
        // This avoids Time-of-Check-Time-of-Use (TOCTOU) issues with stale entity data
        var result = await proposalService.OpenAsync(proposal.Id, cancellationToken);
        
        if (result != null)
        {
            logger.LogInformation(
                "Automatically opened proposal {ProposalId} (OrgId: {OrganizationId}, Title: {Title})",
                proposal.Id,
                proposal.OrganizationId,
                proposal.Title);
        }
        else
        {
            logger.LogWarning(
                "Failed to automatically open proposal {ProposalId} (OrgId: {OrganizationId}) - proposal not found",
                proposal.Id,
                proposal.OrganizationId);
        }
    }

    private async Task CloseProposalAsync(
        IProposalService proposalService,
        Domain.Entities.Proposal proposal,
        CancellationToken cancellationToken)
    {
        // Call service method directly - it will re-load and validate with fresh data
        // This avoids Time-of-Check-Time-of-Use (TOCTOU) issues with stale entity data
        var result = await proposalService.CloseAsync(proposal.Id, cancellationToken);
        
        if (result != null)
        {
            logger.LogInformation(
                "Automatically closed proposal {ProposalId} (OrgId: {OrganizationId}, Title: {Title}, Quorum Met: {QuorumMet})",
                proposal.Id,
                proposal.OrganizationId,
                proposal.Title,
                result.QuorumMet);
        }
        else
        {
            logger.LogWarning(
                "Failed to automatically close proposal {ProposalId} (OrgId: {OrganizationId}) - proposal not found",
                proposal.Id,
                proposal.OrganizationId);
        }
    }
}
