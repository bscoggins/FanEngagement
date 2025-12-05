namespace FanEngagement.Application.Blockchain;

/// <summary>
/// Factory for creating blockchain adapters based on organization configuration.
/// </summary>
public interface IBlockchainAdapterFactory
{
    /// <summary>
    /// Gets the appropriate blockchain adapter for the specified organization.
    /// </summary>
    Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken cancellationToken);
}
