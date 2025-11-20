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
                // Seed Share Issuances (batch) - collect all issuances to create
                var issuanceSpecs = new[]
                {
                    (ShareTypeId: votingShareType.Id, UserId: alice.Id, Quantity: 100m),
                    (ShareTypeId: votingShareType.Id, UserId: bob.Id, Quantity: 50m),
                    (ShareTypeId: founderShareType.Id, UserId: alice.Id, Quantity: 10m),
                    (ShareTypeId: creativeShareType.Id, UserId: charlie.Id, Quantity: 200m),
                    (ShareTypeId: creativeShareType.Id, UserId: alice.Id, Quantity: 75m)
                };

                var issuancesToAdd = new List<ShareIssuance>();
                var balanceUpdates = new Dictionary<(Guid ShareTypeId, Guid UserId), decimal>();

                foreach (var spec in issuanceSpecs)
                {
                    var exists = await _dbContext.ShareIssuances
                        .AnyAsync(si => si.ShareTypeId == spec.ShareTypeId && si.UserId == spec.UserId && si.Quantity == spec.Quantity, cancellationToken);
                    
                    if (!exists)
                    {
                        issuancesToAdd.Add(new ShareIssuance
                        {
                            Id = Guid.NewGuid(),
                            ShareTypeId = spec.ShareTypeId,
                            UserId = spec.UserId,
                            Quantity = spec.Quantity,
                            IssuedAt = DateTimeOffset.UtcNow
                        });
                        
                        // Track balance updates
                        var key = (spec.ShareTypeId, spec.UserId);
                        if (balanceUpdates.ContainsKey(key))
                        {
                            balanceUpdates[key] += spec.Quantity;
                        }
                        else
                        {
                            balanceUpdates[key] = spec.Quantity;
                        }
                        
                        result.ShareIssuancesCreated++;
                        _logger.LogDebug("Prepared share issuance for user {UserId}, quantity {Quantity}", spec.UserId, spec.Quantity);
                    }
                }

                if (issuancesToAdd.Count > 0)
                {
                    _dbContext.ShareIssuances.AddRange(issuancesToAdd);
                    
                    // Update or create ShareBalances for the issuances
                    foreach (var kvp in balanceUpdates)
                    {
                        var (shareTypeId, userId) = kvp.Key;
                        var quantity = kvp.Value;
                        
                        var balance = await _dbContext.ShareBalances
                            .FirstOrDefaultAsync(sb => sb.ShareTypeId == shareTypeId && sb.UserId == userId, cancellationToken);
                        
                        if (balance == null)
                        {
                            _dbContext.ShareBalances.Add(new ShareBalance
                            {
                                Id = Guid.NewGuid(),
                                ShareTypeId = shareTypeId,
                                UserId = userId,
                                Balance = quantity,
                                UpdatedAt = DateTimeOffset.UtcNow
                            });
                            _logger.LogDebug("Created share balance for user {UserId}, balance {Balance}", userId, quantity);
                        }
                        else
                        {
                            balance.Balance += quantity;
                            balance.UpdatedAt = DateTimeOffset.UtcNow;
                            _logger.LogDebug("Updated share balance for user {UserId}, new balance {Balance}", userId, balance.Balance);
                        }
                    }
                    
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                // Seed Proposals (batch) - collect all proposals to create
                var proposalSpecs = new[]
                {
                    new
                    {
                        OrganizationId = techOrg.Id,
                        CreatedByUserId = alice.Id,
                        Title = "Upgrade Development Infrastructure",
                        Description = "Should we invest in new cloud infrastructure?",
                        Status = ProposalStatus.Open,
                        StartAt = (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(-2),
                        EndAt = (DateTimeOffset?)DateTimeOffset.UtcNow.AddDays(5)
                    },
                    new
                    {
                        OrganizationId = creativeOrg.Id,
                        CreatedByUserId = charlie.Id,
                        Title = "Annual Art Exhibition",
                        Description = "Vote on the theme for this year's exhibition",
                        Status = ProposalStatus.Draft,
                        StartAt = (DateTimeOffset?)null,
                        EndAt = (DateTimeOffset?)null
                    }
                };

                var proposalsToAdd = new List<Proposal>();
                foreach (var spec in proposalSpecs)
                {
                    var exists = await _dbContext.Proposals
                        .AnyAsync(p => p.OrganizationId == spec.OrganizationId && p.Title == spec.Title, cancellationToken);
                    
                    if (!exists)
                    {
                        proposalsToAdd.Add(new Proposal
                        {
                            Id = Guid.NewGuid(),
                            OrganizationId = spec.OrganizationId,
                            CreatedByUserId = spec.CreatedByUserId,
                            Title = spec.Title,
                            Description = spec.Description,
                            Status = spec.Status,
                            StartAt = spec.StartAt,
                            EndAt = spec.EndAt,
                            CreatedAt = DateTimeOffset.UtcNow
                        });
                        result.ProposalsCreated++;
                        _logger.LogDebug("Prepared proposal '{Title}' in org {OrganizationId}", spec.Title, spec.OrganizationId);
                    }
                }

                if (proposalsToAdd.Count > 0)
                {
                    _dbContext.Proposals.AddRange(proposalsToAdd);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                // Fetch proposals from DB (without eager loading options to avoid performance overhead)
                var techProposal = await _dbContext.Proposals
                    .FirstOrDefaultAsync(p => p.OrganizationId == techOrg.Id && p.Title == "Upgrade Development Infrastructure", cancellationToken);
                var creativeProposal = await _dbContext.Proposals
                    .FirstOrDefaultAsync(p => p.OrganizationId == creativeOrg.Id && p.Title == "Annual Art Exhibition", cancellationToken);

                // Seed Proposal Options (batch)
                var optionsToAdd = new List<ProposalOption>();
                ProposalOption? yesOption = null;
                ProposalOption? noOption = null;

                if (techProposal != null)
                {
                    // Check existing options
                    var existingOptions = await _dbContext.ProposalOptions
                        .Where(o => o.ProposalId == techProposal.Id)
                        .ToListAsync(cancellationToken);
                    
                    yesOption = existingOptions.FirstOrDefault(o => o.Text == "Yes, upgrade now");
                    noOption = existingOptions.FirstOrDefault(o => o.Text == "No, wait until next quarter");
                    
                    if (yesOption == null)
                    {
                        yesOption = new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = techProposal.Id,
                            Text = "Yes, upgrade now",
                            Description = "Proceed with the infrastructure upgrade immediately"
                        };
                        optionsToAdd.Add(yesOption);
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
                        optionsToAdd.Add(noOption);
                    }
                }

                if (creativeProposal != null)
                {
                    var existingOptions = await _dbContext.ProposalOptions
                        .Where(o => o.ProposalId == creativeProposal.Id)
                        .ToListAsync(cancellationToken);
                    
                    if (!existingOptions.Any(o => o.Text == "Nature and Environment"))
                    {
                        optionsToAdd.Add(new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = creativeProposal.Id,
                            Text = "Nature and Environment",
                            Description = "Focus on environmental themes"
                        });
                    }
                    
                    if (!existingOptions.Any(o => o.Text == "Urban Life"))
                    {
                        optionsToAdd.Add(new ProposalOption
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = creativeProposal.Id,
                            Text = "Urban Life",
                            Description = "Explore themes of city living"
                        });
                    }
                }

                if (optionsToAdd.Count > 0)
                {
                    _dbContext.ProposalOptions.AddRange(optionsToAdd);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }

                // Seed Votes (batch)
                if (techProposal != null && yesOption != null && noOption != null)
                {
                    var votesToAdd = new List<Vote>();
                    
                    var aliceVoteExists = await _dbContext.Votes
                        .AnyAsync(v => v.ProposalId == techProposal.Id && v.UserId == alice.Id, cancellationToken);
                    if (!aliceVoteExists)
                    {
                        votesToAdd.Add(new Vote
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = techProposal.Id,
                            ProposalOptionId = yesOption.Id,
                            UserId = alice.Id,
                            VotingPower = 100m,
                            CastAt = DateTimeOffset.UtcNow
                        });
                        result.VotesCreated++;
                    }
                    
                    var bobVoteExists = await _dbContext.Votes
                        .AnyAsync(v => v.ProposalId == techProposal.Id && v.UserId == bob.Id, cancellationToken);
                    if (!bobVoteExists)
                    {
                        votesToAdd.Add(new Vote
                        {
                            Id = Guid.NewGuid(),
                            ProposalId = techProposal.Id,
                            ProposalOptionId = noOption.Id,
                            UserId = bob.Id,
                            VotingPower = 50m,
                            CastAt = DateTimeOffset.UtcNow
                        });
                        result.VotesCreated++;
                    }
                    
                    if (votesToAdd.Count > 0)
                    {
                        _dbContext.Votes.AddRange(votesToAdd);
                        await _dbContext.SaveChangesAsync(cancellationToken);
                    }
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
}
