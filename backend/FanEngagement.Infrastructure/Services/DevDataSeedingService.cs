using FanEngagement.Application.Authentication;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class DevDataSeedingService : IDevDataSeedingService
{
    private readonly FanEngagementDbContext _dbContext;
    private readonly IAuthService _authService;
    private readonly ILogger<DevDataSeedingService> _logger;

    public DevDataSeedingService(
        FanEngagementDbContext dbContext,
        IAuthService authService,
        ILogger<DevDataSeedingService> logger)
    {
        _dbContext = dbContext;
        _authService = authService;
        _logger = logger;
    }

    public async Task<DevDataSeedingResult> SeedDevDataAsync(CancellationToken cancellationToken = default)
    {
        var result = new DevDataSeedingResult();

        _logger.LogInformation("Starting dev data seeding...");

        // Seed Organizations
        var org1 = await EnsureOrganizationAsync("Tech Innovators", "A community for tech enthusiasts", cancellationToken);
        var org2 = await EnsureOrganizationAsync("Creative Studios", "Art and design collective", cancellationToken);
        
        if (org1 != null) result.OrganizationsCreated++;
        if (org2 != null) result.OrganizationsCreated++;

        // Seed Users (non-admin)
        var user1 = await EnsureUserAsync("alice@example.com", "Alice Johnson", "Password123!", UserRole.User, cancellationToken);
        var user2 = await EnsureUserAsync("bob@example.com", "Bob Smith", "Password123!", UserRole.User, cancellationToken);
        var user3 = await EnsureUserAsync("charlie@example.com", "Charlie Brown", "Password123!", UserRole.User, cancellationToken);
        
        if (user1 != null) result.UsersCreated++;
        if (user2 != null) result.UsersCreated++;
        if (user3 != null) result.UsersCreated++;

        // Fetch organizations from DB to get their IDs (in case they already existed)
        var techOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Tech Innovators", cancellationToken);
        var creativeOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Creative Studios", cancellationToken);
        
        var alice = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com", cancellationToken);
        var bob = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "bob@example.com", cancellationToken);
        var charlie = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "charlie@example.com", cancellationToken);

        if (techOrg != null && alice != null && bob != null && creativeOrg != null && charlie != null)
        {
            // Seed Memberships
            if (await EnsureMembershipAsync(techOrg.Id, alice.Id, OrganizationRole.OrgAdmin, cancellationToken))
                result.MembershipsCreated++;
            if (await EnsureMembershipAsync(techOrg.Id, bob.Id, OrganizationRole.Member, cancellationToken))
                result.MembershipsCreated++;
            if (await EnsureMembershipAsync(creativeOrg.Id, charlie.Id, OrganizationRole.OrgAdmin, cancellationToken))
                result.MembershipsCreated++;
            if (await EnsureMembershipAsync(creativeOrg.Id, alice.Id, OrganizationRole.Member, cancellationToken))
                result.MembershipsCreated++;

            // Seed Share Types
            var votingShare = await EnsureShareTypeAsync(techOrg.Id, "Voting Share", "VOTE", "Standard voting rights", 1.0m, null, true, cancellationToken);
            var founderShare = await EnsureShareTypeAsync(techOrg.Id, "Founder Share", "FNDR", "Extra voting power for founders", 10.0m, 100, false, cancellationToken);
            var creativeShare = await EnsureShareTypeAsync(creativeOrg.Id, "Creative Token", "CRTV", "Voting token for creative decisions", 1.0m, null, true, cancellationToken);
            
            if (votingShare != null) result.ShareTypesCreated++;
            if (founderShare != null) result.ShareTypesCreated++;
            if (creativeShare != null) result.ShareTypesCreated++;

            // Fetch share types from DB
            var votingShareType = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg.Id && st.Symbol == "VOTE", cancellationToken);
            var founderShareType = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg.Id && st.Symbol == "FNDR", cancellationToken);
            var creativeShareType = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == creativeOrg.Id && st.Symbol == "CRTV", cancellationToken);

            if (votingShareType != null && founderShareType != null && creativeShareType != null)
            {
                // Seed Share Issuances
                if (await EnsureShareIssuanceAsync(votingShareType.Id, alice.Id, 100m, cancellationToken))
                    result.ShareIssuancesCreated++;
                if (await EnsureShareIssuanceAsync(votingShareType.Id, bob.Id, 50m, cancellationToken))
                    result.ShareIssuancesCreated++;
                if (await EnsureShareIssuanceAsync(founderShareType.Id, alice.Id, 10m, cancellationToken))
                    result.ShareIssuancesCreated++;
                if (await EnsureShareIssuanceAsync(creativeShareType.Id, charlie.Id, 200m, cancellationToken))
                    result.ShareIssuancesCreated++;
                if (await EnsureShareIssuanceAsync(creativeShareType.Id, alice.Id, 75m, cancellationToken))
                    result.ShareIssuancesCreated++;

                // Seed Proposals
                var proposal1 = await EnsureProposalAsync(
                    techOrg.Id,
                    alice.Id,
                    "Upgrade Development Infrastructure",
                    "Should we invest in new cloud infrastructure?",
                    ProposalStatus.Open,
                    DateTimeOffset.UtcNow.AddDays(-2),
                    DateTimeOffset.UtcNow.AddDays(5),
                    cancellationToken);
                
                var proposal2 = await EnsureProposalAsync(
                    creativeOrg.Id,
                    charlie.Id,
                    "Annual Art Exhibition",
                    "Vote on the theme for this year's exhibition",
                    ProposalStatus.Draft,
                    null,
                    null,
                    cancellationToken);
                
                if (proposal1 != null) result.ProposalsCreated++;
                if (proposal2 != null) result.ProposalsCreated++;

                // Fetch proposals from DB
                var techProposal = await _dbContext.Proposals
                    .Include(p => p.Options)
                    .FirstOrDefaultAsync(p => p.OrganizationId == techOrg.Id && p.Title == "Upgrade Development Infrastructure", cancellationToken);
                var creativeProposal = await _dbContext.Proposals
                    .Include(p => p.Options)
                    .FirstOrDefaultAsync(p => p.OrganizationId == creativeOrg.Id && p.Title == "Annual Art Exhibition", cancellationToken);

                if (techProposal != null)
                {
                    // Add proposal options if not already present
                    var yesOption = techProposal.Options.FirstOrDefault(o => o.Text == "Yes, upgrade now");
                    var noOption = techProposal.Options.FirstOrDefault(o => o.Text == "No, wait until next quarter");
                    
                    if (yesOption == null)
                    {
                        yesOption = new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = techProposal.Id,
                            Text = "Yes, upgrade now",
                            Description = "Proceed with the infrastructure upgrade immediately"
                        };
                        _dbContext.ProposalOptions.Add(yesOption);
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
                    
                    if (noOption == null)
                    {
                        noOption = new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = techProposal.Id,
                            Text = "No, wait until next quarter",
                            Description = "Defer the upgrade to next quarter"
                        };
                        _dbContext.ProposalOptions.Add(noOption);
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }

                    // Seed some votes
                    if (await EnsureVoteAsync(techProposal.Id, yesOption.Id, alice.Id, 100m, cancellationToken))
                        result.VotesCreated++;
                    if (await EnsureVoteAsync(techProposal.Id, noOption.Id, bob.Id, 50m, cancellationToken))
                        result.VotesCreated++;
                }

                if (creativeProposal != null)
                {
                    // Add proposal options if not already present
                    if (!creativeProposal.Options.Any(o => o.Text == "Nature and Environment"))
                    {
                        _dbContext.ProposalOptions.Add(new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = creativeProposal.Id,
                            Text = "Nature and Environment",
                            Description = "Focus on environmental themes"
                        });
                    }
                    
                    if (!creativeProposal.Options.Any(o => o.Text == "Urban Life"))
                    {
                        _dbContext.ProposalOptions.Add(new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = creativeProposal.Id,
                            Text = "Urban Life",
                            Description = "Explore themes of city living"
                        });
                    }
                    
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
        }

        _logger.LogInformation("Dev data seeding completed. Created: {OrganizationsCreated} orgs, {UsersCreated} users, {MembershipsCreated} memberships, {ShareTypesCreated} share types, {ShareIssuancesCreated} issuances, {ProposalsCreated} proposals, {VotesCreated} votes",
            result.OrganizationsCreated, result.UsersCreated, result.MembershipsCreated, result.ShareTypesCreated, result.ShareIssuancesCreated, result.ProposalsCreated, result.VotesCreated);

        return result;
    }

    private async Task<Organization?> EnsureOrganizationAsync(string name, string description, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == name, cancellationToken);
        if (existing != null)
        {
            _logger.LogDebug("Organization '{Name}' already exists", name);
            return null;
        }

        var org = new Organization
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = description,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Organizations.Add(org);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created organization '{Name}'", name);
        return org;
    }

    private async Task<User?> EnsureUserAsync(string email, string displayName, string password, UserRole role, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (existing != null)
        {
            _logger.LogDebug("User '{Email}' already exists", email);
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            DisplayName = displayName,
            PasswordHash = _authService.HashPassword(password),
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created user '{Email}'", email);
        return user;
    }

    private async Task<bool> EnsureMembershipAsync(Guid organizationId, Guid userId, OrganizationRole role, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.OrganizationMemberships
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, cancellationToken);
        
        if (existing != null)
        {
            _logger.LogDebug("Membership already exists for user {UserId} in org {OrganizationId}", userId, organizationId);
            return false;
        }

        var membership = new OrganizationMembership
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            UserId = userId,
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.OrganizationMemberships.Add(membership);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created membership for user {UserId} in org {OrganizationId}", userId, organizationId);
        return true;
    }

    private async Task<ShareType?> EnsureShareTypeAsync(Guid organizationId, string name, string symbol, string? description, decimal votingWeight, decimal? maxSupply, bool isTransferable, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.ShareTypes
            .FirstOrDefaultAsync(st => st.OrganizationId == organizationId && st.Symbol == symbol, cancellationToken);
        
        if (existing != null)
        {
            _logger.LogDebug("ShareType '{Symbol}' already exists in org {OrganizationId}", symbol, organizationId);
            return null;
        }

        var shareType = new ShareType
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            Name = name,
            Symbol = symbol,
            Description = description,
            VotingWeight = votingWeight,
            MaxSupply = maxSupply,
            IsTransferable = isTransferable,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ShareTypes.Add(shareType);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created share type '{Symbol}' in org {OrganizationId}", symbol, organizationId);
        return shareType;
    }

    private async Task<bool> EnsureShareIssuanceAsync(Guid shareTypeId, Guid userId, decimal quantity, CancellationToken cancellationToken)
    {
        // Check if this exact issuance already exists (same user, share type, quantity)
        var existing = await _dbContext.ShareIssuances
            .FirstOrDefaultAsync(si => si.ShareTypeId == shareTypeId && si.UserId == userId && si.Quantity == quantity, cancellationToken);
        
        if (existing != null)
        {
            _logger.LogDebug("Share issuance already exists for user {UserId}, share type {ShareTypeId}, quantity {Quantity}", userId, shareTypeId, quantity);
            return false;
        }

        var issuance = new ShareIssuance
        {
            Id = Guid.NewGuid(),
            ShareTypeId = shareTypeId,
            UserId = userId,
            Quantity = quantity,
            IssuedAt = DateTimeOffset.UtcNow
        };

        _dbContext.ShareIssuances.Add(issuance);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created share issuance for user {UserId}, quantity {Quantity}", userId, quantity);
        return true;
    }

    private async Task<Proposal?> EnsureProposalAsync(Guid organizationId, Guid createdByUserId, string title, string? description, ProposalStatus status, DateTimeOffset? startAt, DateTimeOffset? endAt, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Proposals
            .FirstOrDefaultAsync(p => p.OrganizationId == organizationId && p.Title == title, cancellationToken);
        
        if (existing != null)
        {
            _logger.LogDebug("Proposal '{Title}' already exists in org {OrganizationId}", title, organizationId);
            return null;
        }

        var proposal = new Proposal
        {
            Id = Guid.NewGuid(),
            OrganizationId = organizationId,
            CreatedByUserId = createdByUserId,
            Title = title,
            Description = description,
            Status = status,
            StartAt = startAt,
            EndAt = endAt,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Proposals.Add(proposal);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created proposal '{Title}' in org {OrganizationId}", title, organizationId);
        return proposal;
    }

    private async Task<bool> EnsureVoteAsync(Guid proposalId, Guid proposalOptionId, Guid userId, decimal votingPower, CancellationToken cancellationToken)
    {
        var existing = await _dbContext.Votes
            .FirstOrDefaultAsync(v => v.ProposalId == proposalId && v.UserId == userId, cancellationToken);
        
        if (existing != null)
        {
            _logger.LogDebug("Vote already exists for user {UserId} on proposal {ProposalId}", userId, proposalId);
            return false;
        }

        var vote = new Vote
        {
            Id = Guid.NewGuid(),
            ProposalId = proposalId,
            ProposalOptionId = proposalOptionId,
            UserId = userId,
            VotingPower = votingPower,
            CastAt = DateTimeOffset.UtcNow
        };

        _dbContext.Votes.Add(vote);
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogDebug("Created vote for user {UserId} on proposal {ProposalId}", userId, proposalId);
        return true;
    }
}
