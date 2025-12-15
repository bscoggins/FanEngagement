using FanEngagement.Application.Blockchain;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// Factory for creating blockchain adapters based on organization configuration.
/// </summary>
public class BlockchainAdapterFactory(FanEngagementDbContext dbContext, IHttpClientFactory httpClientFactory) : IBlockchainAdapterFactory
{
    public async Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken cancellationToken)
    {
        var organization = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken);

        if (organization == null)
        {
            throw new InvalidOperationException($"Organization {organizationId} not found");
        }

        return organization.BlockchainType switch
        {
            BlockchainType.Solana => new SolanaAdapterClient(httpClientFactory, organization.BlockchainConfig),
            BlockchainType.Polygon => new PolygonAdapterClient(httpClientFactory, organization.BlockchainConfig),
            BlockchainType.None => new NullBlockchainAdapter(),
            _ => throw new InvalidOperationException($"Unknown blockchain type: {organization.BlockchainType}")
        };
    }

    public IBlockchainAdapter GetAdapter(BlockchainType blockchainType)
    {
        return blockchainType switch
        {
            BlockchainType.Solana => new SolanaAdapterClient(httpClientFactory, null),
            BlockchainType.Polygon => new PolygonAdapterClient(httpClientFactory, null),
            BlockchainType.None => new NullBlockchainAdapter(),
            _ => throw new InvalidOperationException($"Unknown blockchain type: {blockchainType}")
        };
    }
}
