namespace FanEngagement.Application.DevDataSeeding;

public interface IDevDataSeedingService
{
    Task<DevDataSeedingResult> SeedDevDataAsync(CancellationToken cancellationToken = default);
}

public class DevDataSeedingResult
{
    public int OrganizationsCreated { get; set; }
    public int UsersCreated { get; set; }
    public int MembershipsCreated { get; set; }
    public int ShareTypesCreated { get; set; }
    public int ShareIssuancesCreated { get; set; }
    public int ProposalsCreated { get; set; }
    public int VotesCreated { get; set; }
}
