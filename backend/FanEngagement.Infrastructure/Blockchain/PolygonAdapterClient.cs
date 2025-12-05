namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// Blockchain adapter client for Polygon adapter service.
/// </summary>
public class PolygonAdapterClient(IHttpClientFactory httpClientFactory, string? blockchainConfig) 
    : BlockchainAdapterClientBase(httpClientFactory, "PolygonAdapter", blockchainConfig)
{
    protected override string BlockchainName => "Polygon";
}
