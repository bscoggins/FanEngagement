using System.Text.Json;
using FanEngagement.Application.Common;
using FanEngagement.Application.OutboundEvents;
using FanEngagement.Application.Proposals;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Domain.Services;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class ProposalService(FanEngagementDbContext dbContext, IOutboundEventService outboundEventService) : IProposalService
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

        return MapToDto(proposal);
    }

    public async Task<IReadOnlyList<ProposalDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var proposals = await dbContext.Proposals
            .AsNoTracking()
            .Where(p => p.OrganizationId == organizationId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        return proposals.Select(MapToDto).ToList();
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
            Items = proposals.Select(MapToDto).ToList(),
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

        if (request.Title is not null)
        {
            proposal.Title = request.Title;
        }

        if (request.Description is not null)
        {
            proposal.Description = request.Description;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToDto(proposal);
    }

    public async Task<ProposalDto?> OpenAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanOpen(proposal);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Capture eligible voting power snapshot
        var votingPowerCalc = new VotingPowerCalculator();
        var allBalances = await dbContext.ShareBalances
            .AsNoTracking()
            .Include(b => b.ShareType)
            .Where(b => b.ShareType != null && b.ShareType.OrganizationId == proposal.OrganizationId)
            .ToListAsync(cancellationToken);
        
        proposal.EligibleVotingPowerSnapshot = votingPowerCalc.CalculateTotalEligibleVotingPower(allBalances);
        proposal.Status = ProposalStatus.Open;
        
        await dbContext.SaveChangesAsync(cancellationToken);

        // Enqueue outbound event
        await EnqueueProposalEventAsync(proposal, "ProposalOpened", cancellationToken);

        return MapToDto(proposal);
    }

    public async Task<ProposalDto?> CloseAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanClose(proposal);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Compute results using domain service
        var results = governanceService.ComputeResults(proposal);
        
        // Update proposal with computed results
        proposal.Status = ProposalStatus.Closed;
        proposal.WinningOptionId = results.WinningOptionId;
        proposal.QuorumMet = results.QuorumMet;
        proposal.TotalVotesCast = results.TotalVotingPowerCast;
        proposal.ClosedAt = DateTimeOffset.UtcNow;
        
        await dbContext.SaveChangesAsync(cancellationToken);

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
            return null;
        }

        // Use domain service for validation
        var governanceService = new ProposalGovernanceService();
        var validation = governanceService.ValidateCanFinalize(proposal);
        if (!validation.IsValid)
        {
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        proposal.Status = ProposalStatus.Finalized;
        
        await dbContext.SaveChangesAsync(cancellationToken);

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

        dbContext.ProposalOptions.Remove(option);
        await dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<VoteDto?> CastVoteAsync(Guid proposalId, CastVoteRequest request, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Verify the option belongs to this proposal
        if (!proposal.Options.Any(o => o.Id == request.ProposalOptionId))
        {
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
            throw new InvalidOperationException(validation.ErrorMessage);
        }

        // Verify user exists
        var userExists = await dbContext.Users
            .AnyAsync(u => u.Id == request.UserId, cancellationToken);
        
        if (!userExists)
        {
            throw new InvalidOperationException($"User with ID {request.UserId} does not exist.");
        }

        // Calculate voting power from user's share balances
        var votingPower = await CalculateVotingPowerAsync(proposal.OrganizationId, request.UserId, cancellationToken);

        // Check eligibility using domain service
        var votingPowerCalc = new VotingPowerCalculator();
        if (!votingPowerCalc.IsEligibleToVote(votingPower))
        {
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
        await dbContext.SaveChangesAsync(cancellationToken);

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

    private static ProposalDto MapToDto(Proposal proposal)
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
            EligibleVotingPowerSnapshot = proposal.EligibleVotingPowerSnapshot
        };
    }
}
