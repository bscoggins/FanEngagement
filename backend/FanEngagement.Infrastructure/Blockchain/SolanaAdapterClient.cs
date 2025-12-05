using System.Net.Http.Json;
using System.Text.Json;
using FanEngagement.Application.Blockchain;

namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// Blockchain adapter client for Solana adapter service.
/// </summary>
public class SolanaAdapterClient(IHttpClientFactory httpClientFactory, string? blockchainConfig) : IBlockchainAdapter
{
    private readonly HttpClient _httpClient = CreateHttpClient(httpClientFactory, blockchainConfig);

    private static HttpClient CreateHttpClient(IHttpClientFactory httpClientFactory, string? blockchainConfig)
    {
        var client = httpClientFactory.CreateClient("SolanaAdapter");
        
        if (!string.IsNullOrWhiteSpace(blockchainConfig))
        {
            try
            {
                var config = JsonSerializer.Deserialize<BlockchainConfigDto>(blockchainConfig);
                if (config?.AdapterUrl != null)
                {
                    client.BaseAddress = new Uri(config.AdapterUrl);
                }
            }
            catch (JsonException)
            {
                // If config parsing fails, use default from named client
            }
        }
        
        return client;
    }

    public async Task<string> CreateOrganizationAsync(Guid organizationId, string name, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync("/organizations", new
        {
            organizationId,
            name
        }, cancellationToken);

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
        return result?.TransactionId ?? string.Empty;
    }

    public async Task<string> CreateShareTypeAsync(Guid shareTypeId, string name, string symbol, decimal votingWeight, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync("/share-types", new
        {
            shareTypeId,
            name,
            symbol,
            votingWeight
        }, cancellationToken);

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
        return result?.TransactionId ?? string.Empty;
    }

    public async Task<string> RecordVoteAsync(Guid voteId, Guid proposalId, Guid userId, decimal votingPower, CancellationToken cancellationToken)
    {
        var response = await _httpClient.PostAsJsonAsync("/votes", new
        {
            voteId,
            proposalId,
            userId,
            votingPower
        }, cancellationToken);

        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
        return result?.TransactionId ?? string.Empty;
    }

    private record BlockchainConfigDto(string? AdapterUrl, string? Network, string? ApiKey);
    private record TransactionResponse(string? TransactionId);
}
