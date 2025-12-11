using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FanEngagement.Application.Audit;
using FanEngagement.Application.Blockchain;
using FanEngagement.Application.Common;
using FanEngagement.Application.Exceptions;
using FanEngagement.Application.OutboundEvents;
using FanEngagement.Application.Proposals;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Domain.Services;
using FanEngagement.Infrastructure.Metrics;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

/// <summary>
/// Service for managing proposals and their lifecycle.
/// 
/// Note on Audit Actor IDs: Currently, Update/Open/Close/Finalize/AddOption/DeleteOption methods
/// log audit events with Guid.Empty for actor IDs due to the constraint of maintaining
/// existing method signatures. The CreateAsync method captures the actor from CreatedByUserId.
/// Future enhancement: Pass current user ID through method parameters or use IHttpContextAccessor
/// to capture actor information for all operations (see E-005-12 follow-up).
/// </summary>
public class ProposalService(
    FanEngagementDbContext dbContext, 
    IOutboundEventService outboundEventService,
    IAuditService auditService,
    FanEngagementMetrics metrics,
    ILogger<ProposalService> logger,
    IBlockchainAdapterFactory blockchainAdapterFactory) : IProposalService
{
    public async Task<ProposalDto> CreateAsync(Guid organizationId, CreateProposalRequest request, CancellationToken cancellationToken = default)
    {
        // Verify organization exists
        var organizationExists = await dbContext.Organizations
            .AnyAsync(o => o.Id == organizationId, cancellationToken);
        
        if (!organizationExists)
        {
            throw new InvalidOperationException($"Organization with ID {organizationId} does not exist.");
        }

        // Verify user exists
        var userExists = await dbContext.Users
            .AnyAsync(u => u.Id == request.CreatedByUserId, cancellationToken);
        
        if (!userExists)
        {
            throw new InvalidOperationException($"User with ID {request.CreatedByUserId} does not exist.");
        }

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Title = request.Title,
            Description = request.Description,
            Status = ProposalStatus.Draft,  // Start in Draft status
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            QuorumRequirement = request.QuorumRequirement,
            CreatedByUserId = request.CreatedByUserId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Proposals.Add(proposal);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            var organization = await dbContext.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
                    .WithOrganization(organizationId, organization?.Name)
                    .WithActor(request.CreatedByUserId, string.Empty)
                    .WithDetails(new
                    {
                        proposal.Title,
                        proposal.Description,
                        proposal.OrganizationId,
                        CreatedByUserId = request.CreatedByUserId,
                        proposal.StartAt,
                        proposal.EndAt,
                        proposal.QuorumRequirement,
                        InitialStatus = proposal.Status.ToString()
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal creation for {ProposalId}", proposal.Id);
        }

        return MapToDto(proposal);
    }

    public async Task<IReadOnlyList<ProposalDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var proposals = await dbContext.Proposals
            .AsNoTracking()
            .Where(p => p.OrganizationId == organizationId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return proposals.Select(p => MapToDto(p)).ToList();
    }

    public async Task<PagedResult<ProposalDto>> GetByOrganizationAsync(
        Guid organizationId, 
        int page, 
        int pageSize, 
        ProposalStatus? status = null, 
        string? search = null, 
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Proposals
            .AsNoTracking()
            .Where(p => p.OrganizationId == organizationId);

        // Apply status filter if provided
        if (status.HasValue)
        {
            query = query.Where(p => p.Status == status.Value);
        }

        // Apply search filter if provided (case-insensitive using EF.Functions.Like with LOWER)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{search}%";
            query = query.Where(p => EF.Functions.Like(p.Title.ToLower(), searchPattern.ToLower()));
        }

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination
        var proposals = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<ProposalDto>
        {
            Items = proposals.Select(p => MapToDto(p)).ToList(),
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ProposalDetailsDto?> GetByIdAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .AsNoTracking()
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        return new ProposalDetailsDto
        {
            Id = proposal.Id,
            OrganizationId = proposal.OrganizationId,
            Title = proposal.Title,
            Description = proposal.Description,
            Status = proposal.Status,
            StartAt = proposal.StartAt,
            EndAt = proposal.EndAt,
            QuorumRequirement = proposal.QuorumRequirement,
            CreatedByUserId = proposal.CreatedByUserId,
            CreatedAt = proposal.CreatedAt,
            WinningOptionId = proposal.WinningOptionId,
            QuorumMet = proposal.QuorumMet,
            TotalVotesCast = proposal.TotalVotesCast,
            ClosedAt = proposal.ClosedAt,
            EligibleVotingPowerSnapshot = proposal.EligibleVotingPowerSnapshot,
            Options = proposal.Options.Select(o => new ProposalOptionDto
            {
                Id = o.Id,
                ProposalId = o.ProposalId,
                Text = o.Text,
                Description = o.Description
            }).ToList()
        };
    }

    public async Task<ProposalDto?> UpdateAsync(Guid proposalId, UpdateProposalRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanUpdate(proposal);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Track changed fields for audit
        var changedFields = new Dictionary<string, object>();

        if (request.Title is not null && !string.Equals(request.Title, proposal.Title, StringComparison.Ordinal))
        {
            changedFields["Title"] = new { Old = proposal.Title, New = request.Title };
            proposal.Title = request.Title;
        }

        if (request.Description is not null && !string.Equals(request.Description, proposal.Description, StringComparison.Ordinal))
        {
            changedFields["Description"] = new { Old = proposal.Description, New = request.Description };
            proposal.Description = request.Description;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit (only if there were changes)
        if (changedFields.Count > 0)
        {
            try
            {
                var organization = await dbContext.Organizations
                    .AsNoTracking()
                    .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken);

                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithAction(AuditActionType.Updated)
                        .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
                        .WithOrganization(proposal.OrganizationId, organization?.Name)
                        .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                        .WithDetails(new
                        {
                            ProposalId = proposal.Id,
                            ChangedFields = changedFields
                        })
                        .AsSuccess(),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Audit failures should not fail proposal operations
                logger.LogWarning(ex, "Failed to audit proposal update for {ProposalId}", proposal.Id);
            }
        }

        return MapToDto(proposal);
    }

    public async Task<ProposalDto?> OpenAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            logger.LogWarning("Proposal {ProposalId} not found for opening", proposalId);
            return null;
        }

        var organizationDetails = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken)
            ?? throw new InvalidOperationException($"Organization {proposal.OrganizationId} not found.");

        var oldStatus = proposal.Status;

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanOpen(proposal);
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Cannot open proposal {ProposalId} (OrgId: {OrganizationId}): {ValidationError}",
                proposal.Id,
                proposal.OrganizationId,
                validation.ErrorMessage);
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        var isInMemoryProvider = dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemoryProvider ? null : await dbContext.Database.BeginTransactionAsync(cancellationToken);
        string? blockchainTransactionId = null;

        try
        {
            // Capture eligible voting power snapshot
            var votingPowerCalc = new VotingPowerCalculator();
            var allBalances = await dbContext.ShareBalances
                .AsNoTracking()
                .Include(b => b.ShareType)
                .Where(b => b.ShareType != null && b.ShareType.OrganizationId == proposal.OrganizationId)
                .ToListAsync(cancellationToken);

            proposal.EligibleVotingPowerSnapshot = votingPowerCalc.CalculateTotalEligibleVotingPower(allBalances);
            proposal.Status = ProposalStatus.Open;

            if (organizationDetails.BlockchainType != BlockchainType.None)
            {
                var adapter = await blockchainAdapterFactory.GetAdapterAsync(proposal.OrganizationId, cancellationToken);
                var startAt = proposal.StartAt ?? DateTimeOffset.UtcNow;
                var endAt = proposal.EndAt ?? startAt.AddDays(7);
                var eligibleVotingPower = proposal.EligibleVotingPowerSnapshot ?? 0;
                var contentHash = ComputeProposalContentHash(proposal);
                var optionsHash = ComputeVotingOptionsHash(proposal);
                var descriptionHash = ComputeProposalDescriptionHash(proposal);

                var onChainResult = await adapter.CreateProposalAsync(
                    new CreateProposalCommand(
                        proposal.Id,
                        proposal.OrganizationId,
                        proposal.Title,
                        contentHash,
                        startAt,
                        endAt,
                        eligibleVotingPower,
                        proposal.CreatedByUserId,
                        descriptionHash,
                        null,
                        optionsHash),
                    cancellationToken);

                proposal.BlockchainProposalAddress = onChainResult.ProposalAddress;
                proposal.LatestContentHash = contentHash;
                blockchainTransactionId = onChainResult.TransactionId;

                logger.LogInformation(
                    "Proposal {ProposalId} recorded on {Blockchain} with transaction {TransactionId}",
                    proposal.Id,
                    organizationDetails.BlockchainType,
                    onChainResult.TransactionId);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            throw;
        }
        finally
        {
            transaction?.Dispose();
        }

        // Log structured transition
        logger.LogInformation(
            "Proposal lifecycle transition: {ProposalId} (OrgId: {OrganizationId}, Title: {Title}) transitioned from {OldStatus} to {NewStatus}, EligibleVotingPower: {EligibleVotingPower}",
            proposal.Id,
            proposal.OrganizationId,
            proposal.Title,
            oldStatus,
            proposal.Status,
            proposal.EligibleVotingPowerSnapshot);

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.StatusChanged)
                    .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
                    .WithOrganization(proposal.OrganizationId, organizationDetails.Name)
                    .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                    .WithDetails(new
                    {
                        ProposalId = proposal.Id,
                        FromStatus = oldStatus.ToString(),
                        ToStatus = proposal.Status.ToString(),
                        EligibleVotingPowerSnapshot = proposal.EligibleVotingPowerSnapshot
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal open for {ProposalId}", proposal.Id);
        }

        // Record metrics
        metrics.RecordProposalTransition(oldStatus.ToString(), proposal.Status.ToString(), proposal.OrganizationId);

        // Enqueue outbound event
        await EnqueueProposalEventAsync(proposal, "ProposalOpened", cancellationToken);

        return MapToDto(proposal, blockchainTransactionId);
    }

    public async Task<ProposalDto?> CloseAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            logger.LogWarning("Proposal {ProposalId} not found for closing", proposalId);
            return null;
        }

        var organizationDetails = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken)
            ?? throw new InvalidOperationException($"Organization {proposal.OrganizationId} not found.");

        var oldStatus = proposal.Status;

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanClose(proposal);
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Cannot close proposal {ProposalId} (OrgId: {OrganizationId}): {ValidationError}",
                proposal.Id,
                proposal.OrganizationId,
                validation.ErrorMessage);
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        var isInMemoryProvider = dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemoryProvider ? null : await dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            // Compute results using domain service
            var results = governanceService.ComputeResults(proposal);

            // Update proposal with computed results
            proposal.Status = ProposalStatus.Closed;
            proposal.WinningOptionId = results.WinningOptionId;
            proposal.QuorumMet = results.QuorumMet;
            proposal.TotalVotesCast = results.TotalVotingPowerCast;
            proposal.ClosedAt = DateTimeOffset.UtcNow;

            if (organizationDetails.BlockchainType != BlockchainType.None)
            {
                var adapter = await blockchainAdapterFactory.GetAdapterAsync(proposal.OrganizationId, cancellationToken);
                var resultsHash = ComputeProposalResultsHash(proposal, results);
                var onChainResult = await adapter.CommitProposalResultsAsync(
                    new CommitProposalResultsCommand(
                        proposal.Id,
                        proposal.OrganizationId,
                        resultsHash,
                        proposal.WinningOptionId,
                        proposal.TotalVotesCast ?? 0,
                        proposal.QuorumMet ?? false,
                        proposal.ClosedAt ?? DateTimeOffset.UtcNow),
                    cancellationToken);

                proposal.LatestResultsHash = resultsHash;

                logger.LogInformation(
                    "Proposal results for {ProposalId} recorded on {Blockchain} with transaction {TransactionId}",
                    proposal.Id,
                    organizationDetails.BlockchainType,
                    onChainResult.TransactionId);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            throw;
        }
        finally
        {
            transaction?.Dispose();
        }

        // Log structured transition with results
        logger.LogInformation(
            "Proposal lifecycle transition: {ProposalId} (OrgId: {OrganizationId}, Title: {Title}) transitioned from {OldStatus} to {NewStatus}, QuorumMet: {QuorumMet}, TotalVotesCast: {TotalVotesCast}, WinningOptionId: {WinningOptionId}",
            proposal.Id,
            proposal.OrganizationId,
            proposal.Title,
            oldStatus,
            proposal.Status,
            proposal.QuorumMet,
            proposal.TotalVotesCast,
            proposal.WinningOptionId);

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.StatusChanged)
                    .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
                    .WithOrganization(proposal.OrganizationId, organizationDetails.Name)
                    .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                    .WithDetails(new
                    {
                        ProposalId = proposal.Id,
                        FromStatus = oldStatus.ToString(),
                        ToStatus = proposal.Status.ToString(),
                        WinningOptionId = proposal.WinningOptionId,
                        TotalVotesCast = proposal.TotalVotesCast,
                        QuorumMet = proposal.QuorumMet,
                        ClosedAt = proposal.ClosedAt
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal close for {ProposalId}", proposal.Id);
        }

        // Record metrics
        metrics.RecordProposalTransition(oldStatus.ToString(), proposal.Status.ToString(), proposal.OrganizationId);

        // Enqueue outbound event
        await EnqueueProposalEventAsync(proposal, "ProposalClosed", cancellationToken);

        return MapToDto(proposal);
    }

    public async Task<ProposalDto?> FinalizeAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            logger.LogWarning("Proposal {ProposalId} not found for finalizing", proposalId);
            return null;
        }

        var oldStatus = proposal.Status;

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanFinalize(proposal);
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Cannot finalize proposal {ProposalId} (OrgId: {OrganizationId}): {ValidationError}",
                proposal.Id,
                proposal.OrganizationId,
                validation.ErrorMessage);
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        proposal.Status = ProposalStatus.Finalized;
        
        await dbContext.SaveChangesAsync(cancellationToken);

        // Log structured transition
        logger.LogInformation(
            "Proposal lifecycle transition: {ProposalId} (OrgId: {OrganizationId}, Title: {Title}) transitioned from {OldStatus} to {NewStatus} (final state)",
            proposal.Id,
            proposal.OrganizationId,
            proposal.Title,
            oldStatus,
            proposal.Status);

        // Audit after successful commit
        try
        {
            var organization = await dbContext.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken);

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.StatusChanged)
                    .WithResource(AuditResourceType.Proposal, proposal.Id, proposal.Title)
                    .WithOrganization(proposal.OrganizationId, organization?.Name)
                    .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                    .WithDetails(new
                    {
                        ProposalId = proposal.Id,
                        FromStatus = oldStatus.ToString(),
                        ToStatus = proposal.Status.ToString(),
                        FinalizedAt = DateTimeOffset.UtcNow
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal finalize for {ProposalId}", proposal.Id);
        }

        // Record metrics
        metrics.RecordProposalTransition(oldStatus.ToString(), proposal.Status.ToString(), proposal.OrganizationId);

        // Enqueue outbound event
        await EnqueueProposalEventAsync(proposal, "ProposalFinalized", cancellationToken);

        return MapToDto(proposal);
    }

    public async Task<ProposalOptionDto?> AddOptionAsync(Guid proposalId, AddProposalOptionRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanAddOption(proposal);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        var option = new ProposalOption
        {
            Id = Guid.NewGuid(),
            ProposalId = proposalId,
            Text = request.Text,
            Description = request.Description
        };

        dbContext.ProposalOptions.Add(option);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            var organization = await dbContext.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken);

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.ProposalOption, option.Id, option.Text)
                    .WithOrganization(proposal.OrganizationId, organization?.Name)
                    .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                    .WithDetails(new
                    {
                        ProposalId = proposalId,
                        OptionId = option.Id,
                        OptionText = option.Text,
                        OptionDescription = option.Description
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal option addition for {ProposalId}", proposalId);
        }

        return new ProposalOptionDto
        {
            Id = option.Id,
            ProposalId = option.ProposalId,
            Text = option.Text,
            Description = option.Description
        };
    }

    public async Task<bool> DeleteOptionAsync(Guid proposalId, Guid optionId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return false;
        }

        var option = await dbContext.ProposalOptions
            .FirstOrDefaultAsync(o => o.Id == optionId && o.ProposalId == proposalId, cancellationToken);

        if (option is null)
        {
            return false;
        }

        // Check if any votes exist for this option
        var hasVotes = await dbContext.Votes
            .AnyAsync(v => v.ProposalOptionId == optionId, cancellationToken);

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanDeleteOption(proposal, hasVotes);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Store option details before deletion for audit
        var optionText = option.Text;
        var optionDescription = option.Description;

        dbContext.ProposalOptions.Remove(option);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            var organization = await dbContext.Organizations
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken);

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Deleted)
                    .WithResource(AuditResourceType.ProposalOption, optionId, optionText)
                    .WithOrganization(proposal.OrganizationId, organization?.Name)
                    .WithActor(Guid.Empty, string.Empty) // TODO: Actor needs to be passed from controller
                    .WithDetails(new
                    {
                        ProposalId = proposalId,
                        OptionId = optionId,
                        OptionText = optionText,
                        OptionDescription = optionDescription,
                        Reason = hasVotes ? "Deleted despite having votes" : "Deleted before any votes"
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail proposal operations
            logger.LogWarning(ex, "Failed to audit proposal option deletion for {ProposalId}", proposalId);
        }

        return true;
    }

    public async Task<VoteDto?> CastVoteAsync(Guid proposalId, CastVoteRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            logger.LogWarning("Proposal {ProposalId} not found for voting", proposalId);
            return null;
        }

        var organizationDetails = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == proposal.OrganizationId, cancellationToken)
            ?? throw new InvalidOperationException($"Organization {proposal.OrganizationId} not found.");

        // Verify the option belongs to this proposal
        if (!proposal.Options.Any(o => o.Id == request.ProposalOptionId))
        {
            logger.LogWarning(
                "Invalid proposal option {ProposalOptionId} for proposal {ProposalId}",
                request.ProposalOptionId,
                proposalId);
            throw new InvalidOperationException("Invalid proposal option.");
        }

        // Check if user has already voted
        var hasVoted = await dbContext.Votes
            .AnyAsync(v => v.ProposalId == proposalId && v.UserId == request.UserId, cancellationToken);
        
        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanVote(proposal, hasVoted);
        if (!validation.IsValid)
        {
            logger.LogWarning(
                "Vote validation failed for user {UserId} on proposal {ProposalId} (OrgId: {OrganizationId}): {ValidationError}",
                request.UserId,
                proposalId,
                proposal.OrganizationId,
                validation.ErrorMessage);
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Verify user exists and get user details for audit logging
        var voter = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        
        if (voter is null)
        {
            logger.LogWarning("User {UserId} not found for voting", request.UserId);
            throw new InvalidOperationException($"User with ID {request.UserId} does not exist.");
        }

        // Calculate voting power from user's share balances
        var votingPower = await CalculateVotingPowerAsync(proposal.OrganizationId, request.UserId, cancellationToken);

        // Check eligibility using domain service
        var votingPowerCalc = new VotingPowerCalculator();
        if (!votingPowerCalc.IsEligibleToVote(votingPower))
        {
            logger.LogWarning(
                "User {UserId} has no voting power in organization {OrganizationId} for proposal {ProposalId}",
                request.UserId,
                proposal.OrganizationId,
                proposalId);
            throw new InvalidOperationException("User has no voting power in this organization.");
        }

        var vote = new Vote
        {
            Id = Guid.NewGuid(),
            ProposalId = proposalId,
            ProposalOptionId = request.ProposalOptionId,
            UserId = request.UserId,
            VotingPower = votingPower,
            CastAt = DateTimeOffset.UtcNow
        };

        dbContext.Votes.Add(vote);

        var isInMemoryProvider = dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemoryProvider ? null : await dbContext.Database.BeginTransactionAsync(cancellationToken);
        string? voteTransactionId = null;

        try
        {
            if (organizationDetails.BlockchainType != BlockchainType.None)
            {
                var adapter = await blockchainAdapterFactory.GetAdapterAsync(proposal.OrganizationId, cancellationToken);
                var voterAddress = await GetPrimaryWalletAddressAsync(request.UserId, organizationDetails.BlockchainType, cancellationToken);
                
                var onChainResult = await adapter.RecordVoteAsync(
                    new RecordVoteCommand(
                        vote.Id,
                        proposal.Id,
                        proposal.OrganizationId,
                        request.UserId,
                        request.ProposalOptionId,
                        votingPower,
                        voterAddress,
                        vote.CastAt),
                    cancellationToken);
                voteTransactionId = onChainResult.TransactionId;

                logger.LogInformation(
                    "Vote {VoteId} recorded on {Blockchain} with transaction {TransactionId}",
                    vote.Id,
                    organizationDetails.BlockchainType,
                    onChainResult.TransactionId);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }

            // Detach entity from context to prevent issues on retry
            dbContext.Entry(vote).State = Microsoft.EntityFrameworkCore.EntityState.Detached;

            throw;
        }
        finally
        {
            transaction?.Dispose();
        }

        // Log vote cast (minimal PII)
        logger.LogInformation(
            "Vote cast: ProposalId: {ProposalId}, OrgId: {OrganizationId}, OptionId: {ProposalOptionId}, VotingPower: {VotingPower}",
            proposalId,
            proposal.OrganizationId,
            request.ProposalOptionId,
            votingPower);

        // Audit after successful commit
        try
        {
            // Get selected option from already-loaded proposal
            var selectedOption = proposal.Options.FirstOrDefault(o => o.Id == request.ProposalOptionId);

            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.Vote, vote.Id, $"Vote on {proposal.Title}")
                    .WithOrganization(proposal.OrganizationId, organizationDetails.Name)
                    .WithActor(request.UserId, voter.DisplayName ?? string.Empty)
                    .WithDetails(new
                    {
                        ProposalId = proposal.Id,
                        ProposalTitle = proposal.Title,
                        SelectedOptionId = selectedOption?.Id,
                        SelectedOptionText = selectedOption?.Text,
                        VotingPowerUsed = votingPower,
                        PrivacyNote = "Vote records voter identity for transparency. Future enhancement: organization-configurable anonymization."
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail vote operations
            logger.LogWarning(ex, "Failed to audit vote cast for {ProposalId} by user {UserId}", proposalId, request.UserId);
        }

        // Record metrics
        metrics.RecordVoteCast(proposalId, proposal.OrganizationId);

        return new VoteDto
        {
            Id = vote.Id,
            ProposalId = vote.ProposalId,
            ProposalOptionId = vote.ProposalOptionId,
            UserId = vote.UserId,
            VotingPower = vote.VotingPower,
            CastAt = vote.CastAt,
            BlockchainTransactionId = voteTransactionId
        };
    }

    public async Task<VoteDto?> GetUserVoteAsync(Guid proposalId, Guid userId, CancellationToken cancellationToken = default)
    {
        var vote = await dbContext.Votes
            .AsNoTracking()
            .FirstOrDefaultAsync(v => v.ProposalId == proposalId && v.UserId == userId, cancellationToken);

        if (vote is null)
        {
            return null;
        }

        return new VoteDto
        {
            Id = vote.Id,
            ProposalId = vote.ProposalId,
            ProposalOptionId = vote.ProposalOptionId,
            UserId = vote.UserId,
            VotingPower = vote.VotingPower,
            CastAt = vote.CastAt
        };
    }

    public async Task<ProposalResultsDto?> GetResultsAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .AsNoTracking()
            .Include(p => p.Options)
            .ThenInclude(o => o.Votes)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        var optionResults = proposal.Options.Select(o => new OptionResultDto
        {
            OptionId = o.Id,
            OptionText = o.Text,
            VoteCount = o.Votes.Count,
            TotalVotingPower = o.Votes.Sum(v => v.VotingPower)
        }).ToList();

        var totalVotingPower = optionResults.Sum(r => r.TotalVotingPower);

        return new ProposalResultsDto
        {
            ProposalId = proposalId,
            OptionResults = optionResults,
            TotalVotingPower = totalVotingPower,
            QuorumMet = proposal.QuorumMet,
            EligibleVotingPower = proposal.EligibleVotingPowerSnapshot,
            WinningOptionId = proposal.WinningOptionId
        };
    }

    private async Task<decimal> CalculateVotingPowerAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        var balances = await dbContext.ShareBalances
            .AsNoTracking()
            .Include(b => b.ShareType)
            .Where(b => b.UserId == userId && b.ShareType!.OrganizationId == organizationId)
            .ToListAsync(cancellationToken);

        var calculator = new VotingPowerCalculator();
        return calculator.CalculateVotingPower(balances);
    }

    private async Task EnqueueProposalEventAsync(Proposal proposal, string eventType, CancellationToken cancellationToken)
    {
        var payload = new
        {
            proposalId = proposal.Id,
            organizationId = proposal.OrganizationId,
            title = proposal.Title,
            status = proposal.Status.ToString(),
            winningOptionId = proposal.WinningOptionId,
            quorumMet = proposal.QuorumMet,
            totalVotesCast = proposal.TotalVotesCast,
            closedAt = proposal.ClosedAt
        };

        var payloadJson = JsonSerializer.Serialize(payload);
        await outboundEventService.EnqueueEventAsync(proposal.OrganizationId, eventType, payloadJson, cancellationToken);
    }

    private static ProposalDto MapToDto(Proposal proposal, string? blockchainTransactionId = null)
    {
        return new ProposalDto
        {
            Id = proposal.Id,
            OrganizationId = proposal.OrganizationId,
            Title = proposal.Title,
            Description = proposal.Description,
            Status = proposal.Status,
            StartAt = proposal.StartAt,
            EndAt = proposal.EndAt,
            QuorumRequirement = proposal.QuorumRequirement,
            CreatedByUserId = proposal.CreatedByUserId,
            CreatedAt = proposal.CreatedAt,
            WinningOptionId = proposal.WinningOptionId,
            QuorumMet = proposal.QuorumMet,
            TotalVotesCast = proposal.TotalVotesCast,
            ClosedAt = proposal.ClosedAt,
            EligibleVotingPowerSnapshot = proposal.EligibleVotingPowerSnapshot,
            BlockchainTransactionId = blockchainTransactionId
        };
    }

    private async Task<string> GetPrimaryWalletAddressAsync(Guid userId, BlockchainType blockchainType, CancellationToken cancellationToken)
    {
        var address = await dbContext.UserWalletAddresses
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.BlockchainType == blockchainType && w.IsPrimary)
            .Select(w => w.Address)
            .FirstOrDefaultAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new WalletAddressNotFoundException(userId, blockchainType.ToString());
        }

        return address;
    }

    private static readonly JsonSerializerOptions HashSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static string ComputeProposalContentHash(Proposal proposal)
    {
        var payload = new
        {
            proposalId = proposal.Id,
            organizationId = proposal.OrganizationId,
            title = proposal.Title,
            description = proposal.Description ?? string.Empty,
            options = proposal.Options
                .OrderBy(o => o.Text)
                .Select(o => new { optionId = o.Id, text = o.Text, description = o.Description ?? string.Empty })
        };

        return ComputeSha256Hex(payload);
    }

    private static string? ComputeProposalDescriptionHash(Proposal proposal)
    {
        if (string.IsNullOrWhiteSpace(proposal.Description))
        {
            return null;
        }

        return ComputeSha256Hex(proposal.Description);
    }

    private static string? ComputeVotingOptionsHash(Proposal proposal)
    {
        if (proposal.Options.Count == 0)
        {
            return null;
        }

        var payload = new
        {
            proposalId = proposal.Id,
            options = proposal.Options
                .OrderBy(o => o.Text)
                .Select(o => new { optionId = o.Id, text = o.Text, description = o.Description ?? string.Empty })
        };

        return ComputeSha256Hex(payload);
    }

    private static string ComputeProposalResultsHash(Proposal proposal, ProposalResultComputation results)
    {
        var payload = new
        {
            proposalId = proposal.Id,
            organizationId = proposal.OrganizationId,
            totalVotesCast = results.TotalVotingPowerCast,
            quorumMet = results.QuorumMet,
            winningOptionId = results.WinningOptionId,
            options = results.OptionResults
                .OrderBy(r => r.OptionId)
                .Select(r => new
                {
                    optionId = r.OptionId,
                    optionText = r.OptionText,
                    voteCount = r.VoteCount,
                    totalVotingPower = r.TotalVotingPower
                })
        };

        return ComputeSha256Hex(payload);
    }

    private static string ComputeSha256Hex(object payload)
    {
        var json = JsonSerializer.Serialize(payload, HashSerializerOptions);
        return ComputeSha256Hex(json);
    }

    private static string ComputeSha256Hex(string payload)
    {
        var bytes = Encoding.UTF8.GetBytes(payload);
        var hash = SHA256.HashData(bytes);
        
        // Hash normalization: lowercase hex string without "0x" prefix
        // IMPORTANT: This must stay synchronized with the adapter's normalizeHash function
        // in memo-payload.ts, which also uses .toLowerCase() and strips "0x" prefix.
        // Any changes to this normalization logic must be reflected in both systems.
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
