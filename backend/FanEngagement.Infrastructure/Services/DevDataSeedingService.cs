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

    private static readonly IReadOnlyList<SeedScenarioInfo> AvailableScenarios = new List<SeedScenarioInfo>
    {
        new() { Scenario = SeedScenario.BasicDemo, Name = "Basic Demo", Description = "Basic demo data with 2 organizations, 3 users, share types, and sample proposals. Good for general development and testing." },
        new() { Scenario = SeedScenario.HeavyProposals, Name = "Heavy Proposals", Description = "Extended data with 50+ proposals across multiple organizations. Useful for pagination testing and performance validation." },
        new() { Scenario = SeedScenario.WebhookFailures, Name = "Webhook Failures", Description = "Creates webhook endpoints and outbound events with various statuses including failures. Useful for testing observability and retry mechanisms." }
    };

    public DevDataSeedingService(
        FanEngagementDbContext dbContext,
        IAuthService authService,
        ILogger<DevDataSeedingService> logger)
    {
        _dbContext = dbContext;
        _authService = authService;
        _logger = logger;
    }

    public IReadOnlyList<SeedScenarioInfo> GetAvailableScenarios() => AvailableScenarios;

    public Task<DevDataSeedingResult> SeedDevDataAsync(CancellationToken cancellationToken = default)
        => SeedDevDataAsync(SeedScenario.BasicDemo, cancellationToken);

    public async Task<DevDataSeedingResult> SeedDevDataAsync(SeedScenario scenario, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting dev data seeding with scenario {Scenario}...", scenario);

        var result = scenario switch
        {
            SeedScenario.BasicDemo => await SeedBasicDemoAsync(cancellationToken),
            SeedScenario.HeavyProposals => await SeedHeavyProposalsAsync(cancellationToken),
            SeedScenario.WebhookFailures => await SeedWebhookFailuresAsync(cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(scenario), scenario, "Unknown seed scenario")
        };

        result.Scenario = scenario.ToString();
        return result;
    }

    private async Task<DevDataSeedingResult> SeedBasicDemoAsync(CancellationToken cancellationToken)
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

        _logger.LogInformation("Basic demo seeding completed. Created: {OrganizationsCreated} orgs, {UsersCreated} users, {MembershipsCreated} memberships, {ShareTypesCreated} share types, {ShareIssuancesCreated} issuances, {ProposalsCreated} proposals, {VotesCreated} votes",
            result.OrganizationsCreated, result.UsersCreated, result.MembershipsCreated, result.ShareTypesCreated, result.ShareIssuancesCreated, result.ProposalsCreated, result.VotesCreated);

        return result;
    }

    /// <summary>
    /// Seeds the HeavyProposals scenario: many proposals for pagination/performance testing.
    /// First seeds basic demo data, then adds additional organizations with many proposals.
    /// </summary>
    private async Task<DevDataSeedingResult> SeedHeavyProposalsAsync(CancellationToken cancellationToken)
    {
        // First, seed basic demo data
        var result = await SeedBasicDemoAsync(cancellationToken);

        _logger.LogInformation("Adding heavy proposals scenario data...");

        // Create an additional organization for heavy proposals testing
        var heavyOrg = await EnsureOrganizationAsync("Performance Test Org", "Organization with many proposals for pagination testing", cancellationToken);
        if (heavyOrg != null) result.OrganizationsCreated++;

        // Fetch the org
        var performanceOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Performance Test Org", cancellationToken);
        var alice = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com", cancellationToken);

        if (performanceOrg != null && alice != null)
        {
            // Add Alice as OrgAdmin for this org if not already
            var existingMembership = await _dbContext.OrganizationMemberships
                .FirstOrDefaultAsync(m => m.OrganizationId == performanceOrg.Id && m.UserId == alice.Id, cancellationToken);

            if (existingMembership == null)
            {
                _dbContext.OrganizationMemberships.Add(new OrganizationMembership
                {
                    Id = Guid.NewGuid(),
                    OrganizationId = performanceOrg.Id,
                    UserId = alice.Id,
                    Role = OrganizationRole.OrgAdmin,
                    CreatedAt = DateTimeOffset.UtcNow
                });
                result.MembershipsCreated++;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            // Add a share type for this org
            var existingShareType = await _dbContext.ShareTypes
                .FirstOrDefaultAsync(st => st.OrganizationId == performanceOrg.Id && st.Symbol == "PERF", cancellationToken);

            if (existingShareType == null)
            {
                _dbContext.ShareTypes.Add(new ShareType
                {
                    Id = Guid.NewGuid(),
                    OrganizationId = performanceOrg.Id,
                    Name = "Performance Token",
                    Symbol = "PERF",
                    Description = "Token for performance testing",
                    VotingWeight = 1.0m,
                    IsTransferable = true,
                    CreatedAt = DateTimeOffset.UtcNow
                });
                result.ShareTypesCreated++;
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            // Create 50 proposals with various statuses
            var existingProposalTitles = await _dbContext.Proposals
                .Where(p => p.OrganizationId == performanceOrg.Id)
                .Select(p => p.Title)
                .ToListAsync(cancellationToken);

            var proposalsToAdd = new List<Proposal>();
            var statuses = new[] { ProposalStatus.Draft, ProposalStatus.Open, ProposalStatus.Closed, ProposalStatus.Finalized };

            for (var i = 1; i <= 50; i++)
            {
                var title = $"Performance Test Proposal {i:D3}";
                if (existingProposalTitles.Contains(title)) continue;

                var status = statuses[i % statuses.Length];
                var proposal = new Proposal
                {
                    Id = Guid.NewGuid(),
                    OrganizationId = performanceOrg.Id,
                    CreatedByUserId = alice.Id,
                    Title = title,
                    Description = $"Test proposal {i} for pagination and performance testing. This is a sample proposal with some descriptive text to make it more realistic.",
                    Status = status,
                    StartAt = status != ProposalStatus.Draft ? DateTimeOffset.UtcNow.AddDays(-i) : null,
                    EndAt = status == ProposalStatus.Open ? DateTimeOffset.UtcNow.AddDays(30 - i) : (status != ProposalStatus.Draft ? DateTimeOffset.UtcNow.AddDays(-1) : null),
                    CreatedAt = DateTimeOffset.UtcNow.AddDays(-i - 10)
                };

                proposalsToAdd.Add(proposal);
                result.ProposalsCreated++;
            }

            if (proposalsToAdd.Count > 0)
            {
                _dbContext.Proposals.AddRange(proposalsToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Add 2 options to each proposal
                var optionsToAdd = new List<ProposalOption>();
                foreach (var proposal in proposalsToAdd)
                {
                    optionsToAdd.Add(new ProposalOption
                    {
                        Id = Guid.NewGuid(),
                        ProposalId = proposal.Id,
                        Text = "Approve",
                        Description = "Approve this proposal"
                    });
                    optionsToAdd.Add(new ProposalOption
                    {
                        Id = Guid.NewGuid(),
                        ProposalId = proposal.Id,
                        Text = "Reject",
                        Description = "Reject this proposal"
                    });
                }

                _dbContext.ProposalOptions.AddRange(optionsToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        _logger.LogInformation("Heavy proposals scenario seeding completed. Total proposals: {ProposalsCreated}", result.ProposalsCreated);
        return result;
    }

    /// <summary>
    /// Seeds the WebhookFailures scenario: webhook endpoints and outbound events with various statuses.
    /// First seeds basic demo data, then adds webhook configurations and sample events.
    /// </summary>
    private async Task<DevDataSeedingResult> SeedWebhookFailuresAsync(CancellationToken cancellationToken)
    {
        // First, seed basic demo data
        var result = await SeedBasicDemoAsync(cancellationToken);

        _logger.LogInformation("Adding webhook failures scenario data...");

        // Get the Tech Innovators org for webhook setup
        var techOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Tech Innovators", cancellationToken);

        if (techOrg != null)
        {
            // Create webhook endpoints
            var webhookEndpointsToAdd = new List<WebhookEndpoint>();

            var existingWebhooks = await _dbContext.WebhookEndpoints
                .Where(w => w.OrganizationId == techOrg.Id)
                .Select(w => w.Url)
                .ToListAsync(cancellationToken);

            var webhookSpecs = new[]
            {
                new { Url = "https://example.com/webhooks/success", SubscribedEvents = "*" },
                new { Url = "https://example.com/webhooks/failure", SubscribedEvents = "ProposalCreated,ProposalOpened" },
                new { Url = "https://example.com/webhooks/timeout", SubscribedEvents = "VoteCast" }
            };

            foreach (var spec in webhookSpecs)
            {
                if (existingWebhooks.Contains(spec.Url)) continue;

                var webhook = new WebhookEndpoint
                {
                    Id = Guid.NewGuid(),
                    OrganizationId = techOrg.Id,
                    Url = spec.Url,
                    Secret = Guid.NewGuid().ToString("N"),
                    SubscribedEvents = spec.SubscribedEvents,
                    IsActive = true,
                    CreatedAt = DateTimeOffset.UtcNow
                };
                webhookEndpointsToAdd.Add(webhook);
                result.WebhookEndpointsCreated++;
            }

            if (webhookEndpointsToAdd.Count > 0)
            {
                _dbContext.WebhookEndpoints.AddRange(webhookEndpointsToAdd);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }

            // Get all webhook endpoints for this org
            var webhooks = await _dbContext.WebhookEndpoints
                .Where(w => w.OrganizationId == techOrg.Id)
                .ToListAsync(cancellationToken);

            if (webhooks.Count > 0)
            {
                // Create sample outbound events with various statuses
                var eventsToAdd = new List<OutboundEvent>();

                var existingEventTypes = await _dbContext.OutboundEvents
                    .Where(e => e.OrganizationId == techOrg.Id)
                    .Select(e => new { e.WebhookEndpointId, e.EventType, e.Status })
                    .ToListAsync(cancellationToken);

                // Define sample events with their expected statuses and error messages
                var sampleEvents = new[]
                {
                    (EventType: "ProposalCreated", Status: OutboundEventStatus.Pending, AttemptCount: 0, Error: (string?)null),
                    (EventType: "ProposalOpened", Status: OutboundEventStatus.Delivered, AttemptCount: 1, Error: (string?)null),
                    (EventType: "ProposalClosed", Status: OutboundEventStatus.Failed, AttemptCount: 3, Error: "Connection refused: endpoint unreachable"),
                    (EventType: "VoteCast", Status: OutboundEventStatus.Failed, AttemptCount: 3, Error: "HTTP 500: Internal Server Error")
                };

                for (var i = 0; i < webhooks.Count; i++)
                {
                    var webhook = webhooks[i];

                    for (var j = 0; j < sampleEvents.Length; j++)
                    {
                        var sample = sampleEvents[j];
                        
                        // Check if similar event already exists
                        var alreadyExists = existingEventTypes.Any(e => 
                            e.WebhookEndpointId == webhook.Id && 
                            e.EventType == sample.EventType && 
                            e.Status == sample.Status);

                        if (alreadyExists) continue;

                        var hasAttempted = sample.Status != OutboundEventStatus.Pending;
                        var evt = new OutboundEvent
                        {
                            Id = Guid.NewGuid(),
                            OrganizationId = techOrg.Id,
                            WebhookEndpointId = webhook.Id,
                            EventType = sample.EventType,
                            Payload = $"{{\"type\":\"{sample.EventType}\",\"data\":{{\"sample\":true}}}}",
                            Status = sample.Status,
                            AttemptCount = sample.AttemptCount,
                            LastAttemptAt = hasAttempted ? DateTimeOffset.UtcNow.AddMinutes(-j * 5) : null,
                            LastError = sample.Error,
                            CreatedAt = DateTimeOffset.UtcNow.AddHours(-j - i)
                        };
                        eventsToAdd.Add(evt);
                        result.OutboundEventsCreated++;
                    }
                }

                if (eventsToAdd.Count > 0)
                {
                    _dbContext.OutboundEvents.AddRange(eventsToAdd);
                    await _dbContext.SaveChangesAsync(cancellationToken);
                }
            }
        }

        _logger.LogInformation("Webhook failures scenario seeding completed. Webhooks: {WebhooksCreated}, Events: {EventsCreated}",
            result.WebhookEndpointsCreated, result.OutboundEventsCreated);
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
