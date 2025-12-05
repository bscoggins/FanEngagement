namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// Blockchain adapter client for Solana adapter service.
/// </summary>
public class SolanaAdapterClient(IHttpClientFactory httpClientFactory, string? blockchainConfig) 
    : BlockchainAdapterClientBase(httpClientFactory, "SolanaAdapter", blockchainConfig)
{
    protected override string BlockchainName => "Solana";
}
