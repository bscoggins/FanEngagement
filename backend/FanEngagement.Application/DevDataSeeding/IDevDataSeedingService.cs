namespace FanEngagement.Application.DevDataSeeding;

/// <summary>
/// Available dev data seeding scenarios.
/// </summary>
public enum SeedScenario
{
    /// <summary>
    /// Basic demo data: 2 orgs, 3 users, basic share types and proposals.
    /// Default scenario that matches original seeding behavior.
    /// </summary>
    BasicDemo,

    /// <summary>
    /// Heavy proposals scenario: Many proposals for pagination/performance testing.
    /// Creates additional organizations with numerous proposals in various states.
    /// </summary>
    HeavyProposals,

    /// <summary>
    /// Webhook failures scenario: Creates webhook endpoints and outbound events
    /// with various statuses including failed deliveries for observability testing.
    /// </summary>
    WebhookFailures
}

public interface IDevDataSeedingService
{
    /// <summary>
    /// Seeds dev data using the default BasicDemo scenario.
    /// </summary>
    Task<DevDataSeedingResult> SeedDevDataAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Seeds dev data using the specified scenario.
    /// Seeding is idempotent - running the same scenario multiple times will not create duplicates.
    /// </summary>
    Task<DevDataSeedingResult> SeedDevDataAsync(SeedScenario scenario, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the list of available seeding scenarios with descriptions.
    /// </summary>
    IReadOnlyList<SeedScenarioInfo> GetAvailableScenarios();

    Task<E2eCleanupResult> CleanupE2eDataAsync(CancellationToken cancellationToken = default);
    Task<TestDataResetResult> ResetToSeedDataAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Information about a seeding scenario.
/// </summary>
public class SeedScenarioInfo
{
    public SeedScenario Scenario { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class DevDataSeedingResult
{
    public string Scenario { get; set; } = string.Empty;
    public int OrganizationsCreated { get; set; }
    public int UsersCreated { get; set; }
    public int MembershipsCreated { get; set; }
    public int ShareTypesCreated { get; set; }
    public int ShareIssuancesCreated { get; set; }
    public int ProposalsCreated { get; set; }
    public int VotesCreated { get; set; }
    public int WebhookEndpointsCreated { get; set; }
    public int OutboundEventsCreated { get; set; }
}

public class E2eCleanupResult
{
    public int OrganizationsDeleted { get; set; }
}

public class TestDataResetResult
{
    public int OrganizationsDeleted { get; set; }
    public int NonAdminUsersDeleted { get; set; }
    public DevDataSeedingResult SeedResult { get; set; } = new();
}
