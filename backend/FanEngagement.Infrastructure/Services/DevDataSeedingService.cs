using System.Text.Json;
using FanEngagement.Application.Authentication;
using FanEngagement.Application.DevDataSeeding;
using FanEngagement.Application.Encryption;
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
    private readonly IEncryptionService _encryptionService;
    private readonly ILogger<DevDataSeedingService> _logger;

    private static readonly IReadOnlyList<SeedScenarioInfo> AvailableScenarios = new List<SeedScenarioInfo>
    {
        new() { Scenario = SeedScenario.BasicDemo, Name = "Basic Demo", Description = "Comprehensive demo data with 3 organizations, 8 users (including platform admins), share types, proposals in various states, and sample votes. Good for general development and testing." },
        new() { Scenario = SeedScenario.HeavyProposals, Name = "Heavy Proposals", Description = "Extended data with 50+ proposals across multiple organizations. Useful for pagination testing and performance validation." },
        new() { Scenario = SeedScenario.WebhookFailures, Name = "Webhook Failures", Description = "Creates webhook endpoints and outbound events with various statuses including failures. Useful for testing observability and retry mechanisms." }
    };

    public DevDataSeedingService(
        FanEngagementDbContext dbContext,
        IAuthService authService,
        IEncryptionService encryptionService,
        ILogger<DevDataSeedingService> logger)
    {
        _dbContext = dbContext;
        _authService = authService;
        _encryptionService = encryptionService;
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

        await SeedSampleAuditEventsAsync(cancellationToken);

        result.Scenario = scenario.ToString();
        return result;
    }

    private async Task<DevDataSeedingResult> SeedBasicDemoAsync(CancellationToken cancellationToken)
    {
        var result = new DevDataSeedingResult();

        _logger.LogInformation("Starting comprehensive dev data seeding...");

        // ========== SEED PLATFORM ADMIN USERS ==========
        var platformAdminSpecs = new[]
        {
            ("root_admin@platform.local", "Root Administrator", "RootAdm1n!"),
            ("platform_admin@fanengagement.dev", "Platform Admin", "PlatAdm1n!")
        };

        foreach (var (email, displayName, password) in platformAdminSpecs)
        {
            var user = await EnsureUserAsync(email, displayName, password, UserRole.Admin, cancellationToken);
            if (user != null) result.UsersCreated++;
        }

        // ========== SEED REGULAR USERS ==========
        var userSpecs = new[]
        {
            ("alice@example.com", "Alice Johnson", "UserDemo1!"),
            ("bob@abefroman.net", "Bob Smith", "UserDemo1!"),
            ("carlos@demo.co", "Carlos Garcia", "UserDemo2!"),
            ("dana@sample.io", "Dana Miller", "UserDemo2!"),
            ("erika@cityfc.support", "Erika Chen", "UserDemo3!"),
            ("frank@cityfc.support", "Frank Wilson", "UserDemo3!")
        };

        foreach (var (email, displayName, password) in userSpecs)
        {
            var user = await EnsureUserAsync(email, displayName, password, UserRole.User, cancellationToken);
            if (user != null) result.UsersCreated++;
        }

        // ========== SEED ORGANIZATIONS ==========
        var orgSpecs = new[]
        {
            ("Tech Innovators", "A community for tech enthusiasts focused on innovation and digital transformation"),
            ("Green Energy United", "A sustainability-focused organization advocating for renewable energy solutions"),
            ("City FC Supporters Trust", "The official supporters' trust for City Football Club fans")
        };

        foreach (var (name, description) in orgSpecs)
        {
            var org = await EnsureOrganizationAsync(name, description, cancellationToken);
            if (org != null) result.OrganizationsCreated++;
        }

        // ========== FETCH ENTITIES FROM DB ==========
        var techOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Tech Innovators", cancellationToken);
        var greenOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "Green Energy United", cancellationToken);
        var cityFcOrg = await _dbContext.Organizations.FirstOrDefaultAsync(o => o.Name == "City FC Supporters Trust", cancellationToken);

        var alice = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "alice@example.com", cancellationToken);
        var bob = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "bob@abefroman.net", cancellationToken);
        var carlos = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "carlos@demo.co", cancellationToken);
        var dana = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "dana@sample.io", cancellationToken);
        var erika = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "erika@cityfc.support", cancellationToken);
        var frank = await _dbContext.Users.FirstOrDefaultAsync(u => u.Email == "frank@cityfc.support", cancellationToken);

        if (techOrg == null || greenOrg == null || cityFcOrg == null ||
            alice == null || bob == null || carlos == null || dana == null || erika == null || frank == null)
        {
            _logger.LogWarning("Some entities were not found after seeding. Aborting membership/share seeding.");
            return result;
        }

        // ========== SEED MEMBERSHIPS ==========
        // Tech Innovators: alice (OrgAdmin), bob (Member)
        // Green Energy United: carlos (OrgAdmin), erika (OrgAdmin), alice (Member), dana (Member)
        // City FC Supporters Trust: erika (OrgAdmin), dana (Member), frank (Member)
        var membershipSpecs = new[]
        {
            (OrgId: techOrg.Id, UserId: alice.Id, Role: OrganizationRole.OrgAdmin),
            (OrgId: techOrg.Id, UserId: bob.Id, Role: OrganizationRole.Member),
            (OrgId: greenOrg.Id, UserId: carlos.Id, Role: OrganizationRole.OrgAdmin),
            (OrgId: greenOrg.Id, UserId: erika.Id, Role: OrganizationRole.OrgAdmin),
            (OrgId: greenOrg.Id, UserId: alice.Id, Role: OrganizationRole.Member),
            (OrgId: greenOrg.Id, UserId: dana.Id, Role: OrganizationRole.Member),
            (OrgId: cityFcOrg.Id, UserId: erika.Id, Role: OrganizationRole.OrgAdmin),
            (OrgId: cityFcOrg.Id, UserId: dana.Id, Role: OrganizationRole.Member),
            (OrgId: cityFcOrg.Id, UserId: frank.Id, Role: OrganizationRole.Member)
        };

        var allOrgIds = new[] { techOrg.Id, greenOrg.Id, cityFcOrg.Id };
        var allUserIds = new[] { alice.Id, bob.Id, carlos.Id, dana.Id, erika.Id, frank.Id };
        var existingMemberships = await _dbContext.OrganizationMemberships
            .Where(m => allOrgIds.Contains(m.OrganizationId) && allUserIds.Contains(m.UserId))
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

        // ========== SEED SHARE TYPES ==========
        // Each org gets: Standard Voting Share (weight 1) and Premium Voting Share (weight 5)
        var shareTypeSpecs = new[]
        {
            new { OrganizationId = techOrg.Id, Name = "Standard Voting Share", Symbol = "STDV", Description = "Standard voting rights - 1 vote per share", VotingWeight = 1.0m, MaxSupply = (decimal?)null, IsTransferable = true },
            new { OrganizationId = techOrg.Id, Name = "Premium Voting Share", Symbol = "PRMV", Description = "Premium voting rights - 5 votes per share", VotingWeight = 5.0m, MaxSupply = (decimal?)1000, IsTransferable = false },
            new { OrganizationId = greenOrg.Id, Name = "Standard Voting Share", Symbol = "STDV", Description = "Standard voting rights - 1 vote per share", VotingWeight = 1.0m, MaxSupply = (decimal?)null, IsTransferable = true },
            new { OrganizationId = greenOrg.Id, Name = "Premium Voting Share", Symbol = "PRMV", Description = "Premium voting rights - 5 votes per share", VotingWeight = 5.0m, MaxSupply = (decimal?)1000, IsTransferable = false },
            new { OrganizationId = cityFcOrg.Id, Name = "Standard Voting Share", Symbol = "STDV", Description = "Standard voting rights - 1 vote per share", VotingWeight = 1.0m, MaxSupply = (decimal?)null, IsTransferable = true },
            new { OrganizationId = cityFcOrg.Id, Name = "Premium Voting Share", Symbol = "PRMV", Description = "Premium voting rights - 5 votes per share", VotingWeight = 5.0m, MaxSupply = (decimal?)1000, IsTransferable = false }
        };

        var existingShareTypes = await _dbContext.ShareTypes
            .Where(st => allOrgIds.Contains(st.OrganizationId))
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

        // ========== FETCH SHARE TYPES FROM DB ==========
        var techStdShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg.Id && st.Symbol == "STDV", cancellationToken);
        var techPrmShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == techOrg.Id && st.Symbol == "PRMV", cancellationToken);
        var greenStdShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == greenOrg.Id && st.Symbol == "STDV", cancellationToken);
        var greenPrmShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == greenOrg.Id && st.Symbol == "PRMV", cancellationToken);
        var cityFcStdShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == cityFcOrg.Id && st.Symbol == "STDV", cancellationToken);
        var cityFcPrmShare = await _dbContext.ShareTypes.FirstOrDefaultAsync(st => st.OrganizationId == cityFcOrg.Id && st.Symbol == "PRMV", cancellationToken);

        if (techStdShare == null || techPrmShare == null || greenStdShare == null || greenPrmShare == null || cityFcStdShare == null || cityFcPrmShare == null)
        {
            _logger.LogWarning("Some share types were not found after seeding. Aborting issuance seeding.");
            return result;
        }

        // ========== SEED SHARE ISSUANCES ==========
        var issuanceSpecs = new[]
        {
            // Tech Innovators
            (ShareTypeId: techStdShare.Id, UserId: alice.Id, Quantity: 100m),
            (ShareTypeId: techStdShare.Id, UserId: bob.Id, Quantity: 50m),
            (ShareTypeId: techPrmShare.Id, UserId: alice.Id, Quantity: 20m),
            // Green Energy United
            (ShareTypeId: greenStdShare.Id, UserId: carlos.Id, Quantity: 150m),
            (ShareTypeId: greenStdShare.Id, UserId: erika.Id, Quantity: 100m),
            (ShareTypeId: greenStdShare.Id, UserId: alice.Id, Quantity: 50m),
            (ShareTypeId: greenStdShare.Id, UserId: dana.Id, Quantity: 75m),
            (ShareTypeId: greenPrmShare.Id, UserId: carlos.Id, Quantity: 30m),
            // City FC Supporters Trust
            (ShareTypeId: cityFcStdShare.Id, UserId: erika.Id, Quantity: 200m),
            (ShareTypeId: cityFcStdShare.Id, UserId: dana.Id, Quantity: 100m),
            (ShareTypeId: cityFcStdShare.Id, UserId: frank.Id, Quantity: 80m),
            (ShareTypeId: cityFcPrmShare.Id, UserId: erika.Id, Quantity: 25m)
        };

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
                
                var key = (spec.ShareTypeId, spec.UserId);
                balanceUpdates[key] = (balanceUpdates.TryGetValue(key, out var existingQuantity) ? existingQuantity : 0) + spec.Quantity;
                
                result.ShareIssuancesCreated++;
                _logger.LogDebug("Prepared share issuance for user {UserId}, quantity {Quantity}", spec.UserId, spec.Quantity);
            }
        }

        if (issuancesToAdd.Count > 0)
        {
            _dbContext.ShareIssuances.AddRange(issuancesToAdd);
            
            var balanceShareTypeIds = balanceUpdates.Keys.Select(k => k.ShareTypeId).Distinct().ToList();
            var balanceUserIds = balanceUpdates.Keys.Select(k => k.UserId).Distinct().ToList();
            var existingBalances = await _dbContext.ShareBalances
                .Where(sb => balanceShareTypeIds.Contains(sb.ShareTypeId) && balanceUserIds.Contains(sb.UserId))
                .ToListAsync(cancellationToken);
            
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
                }
                else
                {
                    balance.Balance += quantity;
                    balance.UpdatedAt = DateTimeOffset.UtcNow;
                }
            }
            
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // ========== SEED PROPOSALS ==========
        // Each org gets: 1 Open, 1 Closed, 1 Scheduled (future StartAt)
        var now = DateTimeOffset.UtcNow;
        var proposalSpecs = new[]
        {
            // Tech Innovators - Open proposal
            new
            {
                OrganizationId = techOrg.Id,
                CreatedByUserId = alice.Id,
                Title = "Should we launch the new fan rewards program?",
                Description = "Vote on whether to implement a new loyalty rewards program for our tech community members.",
                Status = ProposalStatus.Open,
                StartAt = (DateTimeOffset?)now.AddDays(-2),
                EndAt = (DateTimeOffset?)now.AddDays(5),
                QuorumRequirement = (decimal?)0.25m,
                EligibleVotingPowerSnapshot = (decimal?)250m, // alice: 100*1 + 20*5 = 200, bob: 50*1 = 50 -> total 250
                Options = new[] { ("Yes", "Launch the rewards program"), ("No", "Do not launch") }
            },
            // Tech Innovators - Closed proposal with results
            new
            {
                OrganizationId = techOrg.Id,
                CreatedByUserId = alice.Id,
                Title = "Approve 2025 fan engagement budget",
                Description = "Vote to approve the proposed budget for fan engagement initiatives in 2025.",
                Status = ProposalStatus.Closed,
                StartAt = (DateTimeOffset?)now.AddDays(-14),
                EndAt = (DateTimeOffset?)now.AddDays(-7),
                QuorumRequirement = (decimal?)0.20m,
                EligibleVotingPowerSnapshot = (decimal?)250m, // total eligible voting power for Tech Innovators
                Options = new[] { ("Approve", "Approve the budget as proposed"), ("Reject", "Reject the budget") }
            },
            // Tech Innovators - Scheduled proposal (future start)
            new
            {
                OrganizationId = techOrg.Id,
                CreatedByUserId = alice.Id,
                Title = "Adopt new community guidelines",
                Description = "Vote on adopting updated community guidelines for all members.",
                Status = ProposalStatus.Draft,
                StartAt = (DateTimeOffset?)now.AddDays(1),
                EndAt = (DateTimeOffset?)now.AddDays(8),
                QuorumRequirement = (decimal?)0.30m,
                EligibleVotingPowerSnapshot = (decimal?)null,
                Options = new[] { ("Accept", "Accept new guidelines"), ("Revise", "Request revisions") }
            },
            // Green Energy United - Open proposal
            new
            {
                OrganizationId = greenOrg.Id,
                CreatedByUserId = carlos.Id,
                Title = "Solar panel installation for community center",
                Description = "Should we fund solar panel installation on the community center roof?",
                Status = ProposalStatus.Open,
                StartAt = (DateTimeOffset?)now.AddDays(-3),
                EndAt = (DateTimeOffset?)now.AddDays(4),
                QuorumRequirement = (decimal?)0.25m,
                EligibleVotingPowerSnapshot = (decimal?)525m,
                Options = new[] { ("Fund", "Approve funding"), ("Postpone", "Postpone to next year") }
            },
            // Green Energy United - Closed proposal
            new
            {
                OrganizationId = greenOrg.Id,
                CreatedByUserId = erika.Id,
                Title = "Annual sustainability report publication",
                Description = "Vote to approve and publish the annual sustainability report.",
                Status = ProposalStatus.Closed,
                StartAt = (DateTimeOffset?)now.AddDays(-21),
                EndAt = (DateTimeOffset?)now.AddDays(-14),
                QuorumRequirement = (decimal?)0.20m,
                EligibleVotingPowerSnapshot = (decimal?)525m,
                Options = new[] { ("Publish", "Publish the report"), ("Defer", "Defer publication") }
            },
            // Green Energy United - Scheduled proposal
            new
            {
                OrganizationId = greenOrg.Id,
                CreatedByUserId = carlos.Id,
                Title = "Electric vehicle charging stations proposal",
                Description = "Proposal to install EV charging stations at member locations.",
                Status = ProposalStatus.Draft,
                StartAt = (DateTimeOffset?)now.AddDays(2),
                EndAt = (DateTimeOffset?)now.AddDays(9),
                QuorumRequirement = (decimal?)0.25m,
                EligibleVotingPowerSnapshot = (decimal?)null,
                Options = new[] { ("Approve", "Approve installation"), ("Reject", "Reject proposal") }
            },
            // City FC Supporters Trust - Open proposal
            new
            {
                OrganizationId = cityFcOrg.Id,
                CreatedByUserId = erika.Id,
                Title = "New season ticket pricing structure",
                Description = "Vote on the proposed new pricing structure for season tickets.",
                Status = ProposalStatus.Open,
                StartAt = (DateTimeOffset?)now.AddDays(-1),
                EndAt = (DateTimeOffset?)now.AddDays(6),
                QuorumRequirement = (decimal?)0.30m,
                EligibleVotingPowerSnapshot = (decimal?)505m,
                Options = new[] { ("Accept", "Accept new pricing"), ("Negotiate", "Request renegotiation") }
            },
            // City FC Supporters Trust - Closed proposal
            new
            {
                OrganizationId = cityFcOrg.Id,
                CreatedByUserId = erika.Id,
                Title = "Away travel subsidy program",
                Description = "Vote to establish a subsidy program for away game travel.",
                Status = ProposalStatus.Closed,
                StartAt = (DateTimeOffset?)now.AddDays(-10),
                EndAt = (DateTimeOffset?)now.AddDays(-3),
                QuorumRequirement = (decimal?)0.20m,
                EligibleVotingPowerSnapshot = (decimal?)480m,
                Options = new[] { ("Establish", "Establish the program"), ("Decline", "Decline the proposal") }
            },
            // City FC Supporters Trust - Scheduled proposal
            new
            {
                OrganizationId = cityFcOrg.Id,
                CreatedByUserId = erika.Id,
                Title = "Stadium naming rights consultation",
                Description = "Vote on whether the trust should participate in stadium naming rights discussions.",
                Status = ProposalStatus.Draft,
                StartAt = (DateTimeOffset?)now.AddDays(3),
                EndAt = (DateTimeOffset?)now.AddDays(10),
                QuorumRequirement = (decimal?)0.35m,
                EligibleVotingPowerSnapshot = (decimal?)null,
                Options = new[] { ("Participate", "Participate in discussions"), ("Abstain", "Abstain from discussions") }
            }
        };

        var proposalOrgIds = proposalSpecs.Select(s => s.OrganizationId).Distinct().ToList();
        var proposalTitles = proposalSpecs.Select(s => s.Title).Distinct().ToList();
        var existingProposals = await _dbContext.Proposals
            .Where(p => proposalOrgIds.Contains(p.OrganizationId) && proposalTitles.Contains(p.Title))
            .ToListAsync(cancellationToken);

        var proposalsToAdd = new List<Proposal>();
        var proposalOptionsMap = new Dictionary<string, (Proposal Proposal, (string Text, string Description)[] Options)>();

        foreach (var spec in proposalSpecs)
        {
            var exists = existingProposals.Any(p =>
                p.OrganizationId == spec.OrganizationId && p.Title == spec.Title);
            
            if (!exists)
            {
                var proposal = new Proposal
                {
                    Id = Guid.NewGuid(),
                    OrganizationId = spec.OrganizationId,
                    CreatedByUserId = spec.CreatedByUserId,
                    Title = spec.Title,
                    Description = spec.Description,
                    Status = spec.Status,
                    StartAt = spec.StartAt,
                    EndAt = spec.EndAt,
                    QuorumRequirement = spec.QuorumRequirement,
                    EligibleVotingPowerSnapshot = spec.EligibleVotingPowerSnapshot,
                    CreatedAt = DateTimeOffset.UtcNow,
                    ClosedAt = spec.Status == ProposalStatus.Closed ? spec.EndAt : null
                };
                proposalsToAdd.Add(proposal);
                proposalOptionsMap[spec.Title] = (proposal, spec.Options);
                result.ProposalsCreated++;
                _logger.LogDebug("Prepared proposal '{Title}' in org {OrganizationId}", spec.Title, spec.OrganizationId);
            }
        }

        if (proposalsToAdd.Count > 0)
        {
            _dbContext.Proposals.AddRange(proposalsToAdd);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // ========== SEED PROPOSAL OPTIONS ==========
        var allProposals = await _dbContext.Proposals
            .Where(p => proposalOrgIds.Contains(p.OrganizationId) && proposalTitles.Contains(p.Title))
            .Include(p => p.Options)
            .ToListAsync(cancellationToken);

        var optionsToAdd = new List<ProposalOption>();
        foreach (var spec in proposalSpecs)
        {
            var proposal = allProposals.FirstOrDefault(p => p.Title == spec.Title && p.OrganizationId == spec.OrganizationId);
            if (proposal == null) continue;

            foreach (var (text, description) in spec.Options)
            {
                if (!proposal.Options.Any(o => o.Text == text))
                {
                    optionsToAdd.Add(new ProposalOption
                    {
                        Id = Guid.NewGuid(),
                        ProposalId = proposal.Id,
                        Text = text,
                        Description = description
                    });
                }
            }
        }

        if (optionsToAdd.Count > 0)
        {
            _dbContext.ProposalOptions.AddRange(optionsToAdd);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        // ========== SEED VOTES ==========
        // Seed votes for closed proposals and some for open proposals
        await SeedVotesAsync(techOrg.Id, "Approve 2025 fan engagement budget", new[]
        {
            (UserId: alice.Id, OptionText: "Approve", VotingPower: 200m), // alice voted approve
            (UserId: bob.Id, OptionText: "Approve", VotingPower: 50m)    // bob voted approve
        }, result, cancellationToken);

        await SeedVotesAsync(greenOrg.Id, "Annual sustainability report publication", new[]
        {
            (UserId: carlos.Id, OptionText: "Publish", VotingPower: 300m),
            (UserId: erika.Id, OptionText: "Publish", VotingPower: 100m),
            (UserId: dana.Id, OptionText: "Defer", VotingPower: 75m)
        }, result, cancellationToken);

        await SeedVotesAsync(cityFcOrg.Id, "Away travel subsidy program", new[]
        {
            (UserId: erika.Id, OptionText: "Establish", VotingPower: 325m),
            (UserId: dana.Id, OptionText: "Establish", VotingPower: 100m),
            (UserId: frank.Id, OptionText: "Decline", VotingPower: 80m)
        }, result, cancellationToken);

        // Seed some votes for open proposals (partial voting)
        await SeedVotesAsync(techOrg.Id, "Should we launch the new fan rewards program?", new[]
        {
            (UserId: alice.Id, OptionText: "Yes", VotingPower: 200m) // Only alice voted so far
        }, result, cancellationToken);

        await SeedVotesAsync(greenOrg.Id, "Solar panel installation for community center", new[]
        {
            (UserId: carlos.Id, OptionText: "Fund", VotingPower: 300m),
            (UserId: alice.Id, OptionText: "Fund", VotingPower: 50m)
            // dana and erika haven't voted yet
        }, result, cancellationToken);

        // Update closed proposals with winning options and results
        await UpdateClosedProposalResultsAsync(cancellationToken);

        _logger.LogInformation("Basic demo seeding completed. Created: {OrganizationsCreated} orgs, {UsersCreated} users, {MembershipsCreated} memberships, {ShareTypesCreated} share types, {ShareIssuancesCreated} issuances, {ProposalsCreated} proposals, {VotesCreated} votes",
            result.OrganizationsCreated, result.UsersCreated, result.MembershipsCreated, result.ShareTypesCreated, result.ShareIssuancesCreated, result.ProposalsCreated, result.VotesCreated);

        return result;
    }

    private async Task SeedSampleAuditEventsAsync(CancellationToken cancellationToken)
    {
        var orgIdsWithEvents = await _dbContext.AuditEvents
            .Where(a => a.OrganizationId != null)
            .Select(a => a.OrganizationId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        var organizationsNeedingEvents = await _dbContext.Organizations
            .Where(o => !orgIdsWithEvents.Contains(o.Id))
            .ToListAsync(cancellationToken);

        if (organizationsNeedingEvents.Count == 0)
        {
            _logger.LogDebug("Skipping audit event seeding because all organizations already have audit history.");
            return;
        }

        var targetOrgIds = organizationsNeedingEvents.Select(o => o.Id).ToList();

        var memberships = await _dbContext.OrganizationMemberships
            .Include(m => m.User)
            .Where(m => targetOrgIds.Contains(m.OrganizationId))
            .ToListAsync(cancellationToken);

        var shareTypes = await _dbContext.ShareTypes
            .Where(st => targetOrgIds.Contains(st.OrganizationId))
            .ToListAsync(cancellationToken);

        var proposals = await _dbContext.Proposals
            .Where(p => targetOrgIds.Contains(p.OrganizationId))
            .OrderBy(p => p.CreatedAt)
            .ToListAsync(cancellationToken);

        var eventsToInsert = new List<AuditEvent>();

        foreach (var organization in organizationsNeedingEvents)
        {
            var adminMembership = memberships
                .Where(m => m.OrganizationId == organization.Id && m.Role == OrganizationRole.OrgAdmin)
                .OrderBy(m => m.CreatedAt)
                .FirstOrDefault();

            if (adminMembership == null)
            {
                _logger.LogWarning("Skipping audit event seeding for org {OrganizationId} because no OrgAdmin membership exists.", organization.Id);
                continue;
            }

            var actorDisplayName = adminMembership.User?.DisplayName ?? adminMembership.User?.Email ?? "Org Admin";
            var actorUserId = adminMembership.UserId;
            var correlationId = Guid.NewGuid().ToString("N");
            var baseTimestamp = DateTimeOffset.UtcNow.AddMinutes(-45);

            eventsToInsert.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = baseTimestamp,
                ActorUserId = actorUserId,
                ActorDisplayName = actorDisplayName,
                ActorIpAddress = "10.0.0.5",
                ActionType = AuditActionType.Created,
                Outcome = AuditOutcome.Success,
                ResourceType = AuditResourceType.Organization,
                ResourceId = organization.Id,
                ResourceName = organization.Name,
                OrganizationId = organization.Id,
                OrganizationName = organization.Name,
                Details = JsonSerializer.Serialize(new
                {
                    organization.Name,
                    organization.Description
                }),
                CorrelationId = correlationId
            });

            eventsToInsert.Add(new AuditEvent
            {
                Id = Guid.NewGuid(),
                Timestamp = baseTimestamp.AddMinutes(5),
                ActorUserId = actorUserId,
                ActorDisplayName = actorDisplayName,
                ActorIpAddress = "10.0.0.5",
                ActionType = AuditActionType.RoleChanged,
                Outcome = AuditOutcome.Success,
                ResourceType = AuditResourceType.Membership,
                ResourceId = adminMembership.Id,
                ResourceName = actorDisplayName,
                OrganizationId = organization.Id,
                OrganizationName = organization.Name,
                Details = JsonSerializer.Serialize(new
                {
                    role = adminMembership.Role.ToString(),
                    grantedBy = actorDisplayName
                }),
                CorrelationId = correlationId
            });

            var shareType = shareTypes.FirstOrDefault(st => st.OrganizationId == organization.Id);
            if (shareType != null)
            {
                eventsToInsert.Add(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = baseTimestamp.AddMinutes(10),
                    ActorUserId = actorUserId,
                    ActorDisplayName = actorDisplayName,
                    ActorIpAddress = "10.0.0.5",
                    ActionType = AuditActionType.Created,
                    Outcome = AuditOutcome.Success,
                    ResourceType = AuditResourceType.ShareType,
                    ResourceId = shareType.Id,
                    ResourceName = shareType.Name,
                    OrganizationId = organization.Id,
                    OrganizationName = organization.Name,
                    Details = JsonSerializer.Serialize(new
                    {
                        shareType.Name,
                        shareType.Symbol,
                        shareType.VotingWeight
                    }),
                    CorrelationId = correlationId
                });
            }

            var proposalForCreate = proposals.FirstOrDefault(p => p.OrganizationId == organization.Id);
            if (proposalForCreate != null)
            {
                eventsToInsert.Add(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = baseTimestamp.AddMinutes(15),
                    ActorUserId = actorUserId,
                    ActorDisplayName = actorDisplayName,
                    ActorIpAddress = "10.0.0.5",
                    ActionType = AuditActionType.Created,
                    Outcome = AuditOutcome.Success,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = proposalForCreate.Id,
                    ResourceName = proposalForCreate.Title,
                    OrganizationId = organization.Id,
                    OrganizationName = organization.Name,
                    Details = JsonSerializer.Serialize(new
                    {
                        proposalForCreate.Title,
                        proposalForCreate.Status,
                        proposalForCreate.StartAt,
                        proposalForCreate.EndAt
                    }),
                    CorrelationId = correlationId
                });
            }

            var proposalForStatus = proposals
                .Where(p => p.OrganizationId == organization.Id)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefault();

            if (proposalForStatus != null)
            {
                eventsToInsert.Add(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = baseTimestamp.AddMinutes(20),
                    ActorUserId = actorUserId,
                    ActorDisplayName = actorDisplayName,
                    ActorIpAddress = "10.0.0.5",
                    ActionType = AuditActionType.StatusChanged,
                    Outcome = AuditOutcome.Success,
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = proposalForStatus.Id,
                    ResourceName = proposalForStatus.Title,
                    OrganizationId = organization.Id,
                    OrganizationName = organization.Name,
                    Details = JsonSerializer.Serialize(new
                    {
                        proposalId = proposalForStatus.Id,
                        newStatus = proposalForStatus.Status.ToString()
                    }),
                    CorrelationId = correlationId
                });

                eventsToInsert.Add(new AuditEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = baseTimestamp.AddMinutes(25),
                    ActorUserId = actorUserId,
                    ActorDisplayName = actorDisplayName,
                    ActorIpAddress = "10.0.0.5",
                    ActionType = AuditActionType.AuthorizationDenied,
                    Outcome = AuditOutcome.Denied,
                    FailureReason = "Member attempted to close proposal without sufficient privileges.",
                    ResourceType = AuditResourceType.Proposal,
                    ResourceId = proposalForStatus.Id,
                    ResourceName = proposalForStatus.Title,
                    OrganizationId = organization.Id,
                    OrganizationName = organization.Name,
                    Details = JsonSerializer.Serialize(new
                    {
                        attemptedAction = "CloseProposal",
                        proposalId = proposalForStatus.Id
                    }),
                    CorrelationId = correlationId
                });
            }
        }

        if (eventsToInsert.Count == 0)
        {
            return;
        }

        _dbContext.AuditEvents.AddRange(eventsToInsert);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var orgsSeeded = eventsToInsert
            .Select(e => e.OrganizationId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .Distinct()
            .Count();

        _logger.LogInformation(
            "Seeded {EventCount} sample audit events across {OrganizationCount} organizations to unblock audit log UI flows.",
            eventsToInsert.Count,
            orgsSeeded);
    }

    private async Task SeedVotesAsync(Guid organizationId, string proposalTitle, (Guid UserId, string OptionText, decimal VotingPower)[] voteSpecs, DevDataSeedingResult result, CancellationToken cancellationToken)
    {
        var proposal = await _dbContext.Proposals
            .Include(p => p.Options)
            .FirstOrDefaultAsync(p => p.OrganizationId == organizationId && p.Title == proposalTitle, cancellationToken);

        if (proposal == null) return;

        var existingVotes = await _dbContext.Votes
            .Where(v => v.ProposalId == proposal.Id)
            .ToListAsync(cancellationToken);

        var votesToAdd = new List<Vote>();
        foreach (var (userId, optionText, votingPower) in voteSpecs)
        {
            if (existingVotes.Any(v => v.UserId == userId)) continue;

            var option = proposal.Options.FirstOrDefault(o => o.Text == optionText);
            if (option == null) continue;

            votesToAdd.Add(new Vote
            {
                Id = Guid.NewGuid(),
                ProposalId = proposal.Id,
                ProposalOptionId = option.Id,
                UserId = userId,
                VotingPower = votingPower,
                CastAt = DateTimeOffset.UtcNow.AddDays(-1)
            });
            result.VotesCreated++;
        }

        if (votesToAdd.Count > 0)
        {
            _dbContext.Votes.AddRange(votesToAdd);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task UpdateClosedProposalResultsAsync(CancellationToken cancellationToken)
    {
        var closedProposals = await _dbContext.Proposals
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .Where(p => p.Status == ProposalStatus.Closed && p.WinningOptionId == null)
            .ToListAsync(cancellationToken);

        foreach (var proposal in closedProposals)
        {
            if (!proposal.Options.Any() || !proposal.Votes.Any()) continue;

            // Calculate total votes cast
            var totalVotesCast = proposal.Votes.Sum(v => v.VotingPower);
            proposal.TotalVotesCast = totalVotesCast;

            // Calculate quorum
            if (proposal.EligibleVotingPowerSnapshot.HasValue && proposal.QuorumRequirement.HasValue)
            {
                var requiredVotes = proposal.EligibleVotingPowerSnapshot.Value * proposal.QuorumRequirement.Value;
                proposal.QuorumMet = totalVotesCast >= requiredVotes;
            }
            else
            {
                proposal.QuorumMet = true;
            }

            // Find winning option
            var optionVotes = proposal.Options
                .Select(o => new { Option = o, TotalPower = proposal.Votes.Where(v => v.ProposalOptionId == o.Id).Sum(v => v.VotingPower) })
                .OrderByDescending(x => x.TotalPower)
                .ToList();

            if (optionVotes.Any())
            {
                proposal.WinningOptionId = optionVotes.First().Option.Id;
            }
        }

        if (closedProposals.Any())
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
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
                    EncryptedSecret = _encryptionService.Encrypt(Guid.NewGuid().ToString("N")),
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
