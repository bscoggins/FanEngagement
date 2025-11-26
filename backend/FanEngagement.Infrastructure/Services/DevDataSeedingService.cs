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
            // Seed Memberships (batch)
            var membershipSpecs = new[]
            {
                (OrgId: techOrg.Id, UserId: alice.Id, Role: OrganizationRole.OrgAdmin),
                (OrgId: techOrg.Id, UserId: bob.Id, Role: OrganizationRole.Member),
                (OrgId: creativeOrg.Id, UserId: charlie.Id, Role: OrganizationRole.OrgAdmin),
                (OrgId: creativeOrg.Id, UserId: alice.Id, Role: OrganizationRole.Member)
            };

            // Load all existing memberships for these users and orgs
            var orgIds = new[] { techOrg.Id, creativeOrg.Id };
            var userIds = new[] { alice.Id, bob.Id, charlie.Id };
            var existingMemberships = await _dbContext.OrganizationMemberships
                .Where(m => orgIds.Contains(m.OrganizationId) && userIds.Contains(m.UserId))
                .ToListAsync(cancellationToken);

            var membershipsToAdd = new List<OrganizationMembership>();
            foreach (var spec in membershipSpecs)
            {
                var alreadyExists = existingMemberships.Any(m => m.OrganizationId == spec.OrgId && m.UserId == spec.UserId);
                if (!alreadyExists)
                {
                    membershipsToAdd.Add(new OrganizationMembership
                    {
                        Id = Guid.NewGuid(),
                        OrganizationId = spec.OrgId,
                        UserId = spec.UserId,
                        Role = spec.Role,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                    result.MembershipsCreated++;
                    _logger.LogDebug("Prepared membership for user {UserId} in org {OrganizationId}", spec.UserId, spec.OrgId);
                }
            }

            if (membershipsToAdd.Count > 0)
            {
                _dbContext.OrganizationMemberships.AddRange(membershipsToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            // Seed Share Types (batch)
            var shareTypeSpecs = new[]
            {
                new { OrganizationId = techOrg.Id, Name = "Voting Share", Symbol = "VOTE", Description = "Standard voting rights", VotingWeight = 1.0m, MaxSupply = (decimal?)null, IsTransferable = true },
                new { OrganizationId = techOrg.Id, Name = "Founder Share", Symbol = "FNDR", Description = "Extra voting power for founders", VotingWeight = 10.0m, MaxSupply = (decimal?)100, IsTransferable = false },
                new { OrganizationId = creativeOrg.Id, Name = "Creative Token", Symbol = "CRTV", Description = "Voting token for creative decisions", VotingWeight = 1.0m, MaxSupply = (decimal?)null, IsTransferable = true }
            };

            var shareTypeOrgIds = shareTypeSpecs.Select(s => s.OrganizationId).Distinct().ToList();
            var symbols = shareTypeSpecs.Select(s => s.Symbol).Distinct().ToList();
            var existingShareTypes = await _dbContext.ShareTypes
                .Where(st => shareTypeOrgIds.Contains(st.OrganizationId) && symbols.Contains(st.Symbol))
                .ToListAsync(cancellationToken);

            var shareTypesToAdd = new List<ShareType>();
            foreach (var spec in shareTypeSpecs)
            {
                var alreadyExists = existingShareTypes.Any(st => st.OrganizationId == spec.OrganizationId && st.Symbol == spec.Symbol);
                if (!alreadyExists)
                {
                    shareTypesToAdd.Add(new ShareType
                    {
                        Id = Guid.NewGuid(),
                        OrganizationId = spec.OrganizationId,
                        Name = spec.Name,
                        Symbol = spec.Symbol,
                        Description = spec.Description,
                        VotingWeight = spec.VotingWeight,
                        MaxSupply = spec.MaxSupply,
                        IsTransferable = spec.IsTransferable,
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                    result.ShareTypesCreated++;
                    _logger.LogDebug("Prepared share type '{Symbol}' in org {OrganizationId}", spec.Symbol, spec.OrganizationId);
                }
            }

            if (shareTypesToAdd.Count > 0)
            {
                _dbContext.ShareTypes.AddRange(shareTypesToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

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

                // Load all potentially existing issuances at once using Contains
                var shareTypeIds = issuanceSpecs.Select(s => s.ShareTypeId).Distinct().ToList();
                var issuanceUserIds = issuanceSpecs.Select(s => s.UserId).Distinct().ToList();
                var existingIssuances = await _dbContext.ShareIssuances
                    .Where(si => shareTypeIds.Contains(si.ShareTypeId) && issuanceUserIds.Contains(si.UserId))
                    .ToListAsync(cancellationToken);

                var issuancesToAdd = new List<ShareIssuance>();
                var balanceUpdates = new Dictionary<(Guid ShareTypeId, Guid UserId), decimal>();

                foreach (var spec in issuanceSpecs)
                {
                    var exists = existingIssuances.Any(si => 
                        si.ShareTypeId == spec.ShareTypeId && 
                        si.UserId == spec.UserId && 
                        si.Quantity == spec.Quantity);
                    
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
                        
                        // Track balance updates using ternary operator
                        var key = (spec.ShareTypeId, spec.UserId);
                        balanceUpdates[key] = (balanceUpdates.TryGetValue(key, out var existingQuantity) ? existingQuantity : 0) + spec.Quantity;
                        
                        result.ShareIssuancesCreated++;
                        _logger.LogDebug("Prepared share issuance for user {UserId}, quantity {Quantity}", spec.UserId, spec.Quantity);
                    }
                }

                if (issuancesToAdd.Count > 0)
                {
                    _dbContext.ShareIssuances.AddRange(issuancesToAdd);
                    
                    // Load all relevant balances at once using Contains
                    var balanceShareTypeIds = balanceUpdates.Keys.Select(k => k.ShareTypeId).Distinct().ToList();
                    var balanceUserIds = balanceUpdates.Keys.Select(k => k.UserId).Distinct().ToList();
                    var existingBalances = await _dbContext.ShareBalances
                        .Where(sb => balanceShareTypeIds.Contains(sb.ShareTypeId) && balanceUserIds.Contains(sb.UserId))
                        .ToListAsync(cancellationToken);
                    
                    // Update or create ShareBalances for the issuances
                    foreach (var kvp in balanceUpdates)
                    {
                        var (shareTypeId, userId) = kvp.Key;
                        var quantity = kvp.Value;
                        
                        var balance = existingBalances.FirstOrDefault(sb => sb.ShareTypeId == shareTypeId && sb.UserId == userId);
                        
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

                // Batch existence check for proposals
                var proposalOrgIds = proposalSpecs.Select(s => s.OrganizationId).Distinct().ToList();
                var proposalTitles = proposalSpecs.Select(s => s.Title).Distinct().ToList();
                var existingProposals = await _dbContext.Proposals
                    .Where(p => proposalOrgIds.Contains(p.OrganizationId) && proposalTitles.Contains(p.Title))
                    .ToListAsync(cancellationToken);

                var proposalsToAdd = new List<Proposal>();
                foreach (var spec in proposalSpecs)
                {
                    var exists = existingProposals.Any(p =>
                        p.OrganizationId == spec.OrganizationId && p.Title == spec.Title);
                    
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
                    // Batch vote existence check
                    var voteUserIds = new[] { alice.Id, bob.Id };
                    var existingVotes = await _dbContext.Votes
                        .Where(v => v.ProposalId == techProposal.Id && voteUserIds.Contains(v.UserId))
                        .ToListAsync(cancellationToken);

                    var votesToAdd = new List<Vote>();
                    
                    if (!existingVotes.Any(v => v.UserId == alice.Id))
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
                    
                    if (!existingVotes.Any(v => v.UserId == bob.Id))
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

    public async Task<E2eCleanupResult> CleanupE2eDataAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting E2E test data cleanup...");

        // Identify organizations created by E2E tests (by naming convention)
        var e2eOrgs = await _dbContext.Organizations
            .Where(o => EF.Functions.Like(o.Name, "E2E %") || EF.Functions.Like(o.Name, "E2E%"))
            .ToListAsync(cancellationToken);

        var deletedOrgs = e2eOrgs.Count;
        if (deletedOrgs > 0)
        {
            _dbContext.Organizations.RemoveRange(e2eOrgs);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("E2E cleanup completed. Deleted organizations: {Count}", deletedOrgs);
        return new E2eCleanupResult { OrganizationsDeleted = deletedOrgs };
    }

    public async Task<TestDataResetResult> ResetToSeedDataAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting full reset to original seed data...");

        await using var tx = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        // 1) Delete all organizations (cascades remove related data)
        var allOrgs = await _dbContext.Organizations.ToListAsync(cancellationToken);
        var orgsDeleted = allOrgs.Count;
        if (orgsDeleted > 0)
        {
            _dbContext.Organizations.RemoveRange(allOrgs);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // 2) Delete all users except the seeded admin account
        var adminEmail = "admin@example.com";
        var usersToDelete = await _dbContext.Users
            .Where(u => u.Email != adminEmail)
            .ToListAsync(cancellationToken);
        var usersDeleted = usersToDelete.Count;
        if (usersDeleted > 0)
        {
            _dbContext.Users.RemoveRange(usersToDelete);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // 3) Re-seed development data to original state
        var seedResult = await SeedDevDataAsync(cancellationToken);

        await tx.CommitAsync(cancellationToken);

        _logger.LogInformation("Full reset completed. Orgs deleted: {OrgsDeleted}, Users deleted (non-admin): {UsersDeleted}", orgsDeleted, usersDeleted);
        return new TestDataResetResult
        {
            OrganizationsDeleted = orgsDeleted,
            NonAdminUsersDeleted = usersDeleted,
            SeedResult = seedResult
        };
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
}
