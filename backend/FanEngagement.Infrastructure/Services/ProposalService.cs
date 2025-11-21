using FanEngagement.Application.Proposals;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class ProposalService(FanEngagementDbContext dbContext) : IProposalService
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
            Status = ProposalStatus.Open,
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

        // Only allow updates if proposal is in Draft or Open state
        if (proposal.Status != ProposalStatus.Draft && proposal.Status != ProposalStatus.Open)
        {
            throw new InvalidOperationException($"Cannot update proposal in {proposal.Status} state.");
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

    public async Task<ProposalDto?> CloseAsync(Guid proposalId, CancellationToken cancellationToken = default)
    {
        var proposal = await dbContext.Proposals
            .Include(p => p.Votes)
            .ThenInclude(v => v.ProposalOption)
            .FirstOrDefaultAsync(p => p.Id == proposalId, cancellationToken);

        if (proposal is null)
        {
            return null;
        }

        // Cannot close an already closed or finalized proposal
        if (proposal.Status == ProposalStatus.Closed || proposal.Status == ProposalStatus.Finalized)
        {
            throw new InvalidOperationException($"Proposal is already {proposal.Status}.");
        }

        proposal.Status = ProposalStatus.Closed;
        await dbContext.SaveChangesAsync(cancellationToken);

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

        // Only allow adding options if proposal is in Draft or Open state
        if (proposal.Status != ProposalStatus.Draft && proposal.Status != ProposalStatus.Open)
        {
            throw new InvalidOperationException($"Cannot add options to proposal in {proposal.Status} state.");
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

        // Only allow deleting options if proposal is in Draft state
        if (proposal.Status != ProposalStatus.Draft)
        {
            throw new InvalidOperationException($"Cannot delete options from proposal in {proposal.Status} state.");
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
        
        if (hasVotes)
        {
            throw new InvalidOperationException("Cannot delete option that has votes.");
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

        // Can only vote on Open proposals
        if (proposal.Status != ProposalStatus.Open)
        {
            throw new InvalidOperationException($"Cannot vote on proposal in {proposal.Status} state.");
        }

        // Verify the option belongs to this proposal
        if (!proposal.Options.Any(o => o.Id == request.ProposalOptionId))
        {
            throw new InvalidOperationException("Invalid proposal option.");
        }

        // Check if user has already voted
        var hasVoted = await dbContext.Votes
            .AnyAsync(v => v.ProposalId == proposalId && v.UserId == request.UserId, cancellationToken);
        
        if (hasVoted)
        {
            throw new InvalidOperationException("User has already voted on this proposal.");
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

        if (votingPower <= 0)
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
            TotalVotingPower = totalVotingPower
        };
    }

    private async Task<decimal> CalculateVotingPowerAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken)
    {
        var balances = await dbContext.ShareBalances
            .AsNoTracking()
            .Include(b => b.ShareType)
            .Where(b => b.UserId == userId && b.ShareType!.OrganizationId == organizationId)
            .ToListAsync(cancellationToken);

        return balances.Sum(b => b.Balance * b.ShareType!.VotingWeight);
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
            CreatedAt = proposal.CreatedAt
        };
    }
}
