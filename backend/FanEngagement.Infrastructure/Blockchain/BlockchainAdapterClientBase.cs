using System.Net.Http.Json;
using System.Text.Json;
using FanEngagement.Application.Blockchain;

namespace FanEngagement.Infrastructure.Blockchain;

/// <summary>
/// Base class for blockchain adapter clients that communicate with external blockchain adapter services via HTTP.
/// </summary>
public abstract class BlockchainAdapterClientBase : IBlockchainAdapter
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _namedClient;
    private readonly string? _blockchainConfig;

    protected BlockchainAdapterClientBase(IHttpClientFactory httpClientFactory, string namedClient, string? blockchainConfig)
    {
        _httpClientFactory = httpClientFactory;
        _namedClient = namedClient;
        _blockchainConfig = blockchainConfig;
    }

    protected abstract string BlockchainName { get; }

    private HttpClient CreateHttpClient()
    {
        var client = _httpClientFactory.CreateClient(_namedClient);
        return client;
    }

    private string? GetAdapterUrl()
    {
        if (string.IsNullOrWhiteSpace(_blockchainConfig))
        {
            return null;
        }

        try
        {
            var config = JsonSerializer.Deserialize<BlockchainConfigDto>(_blockchainConfig);
            return config?.AdapterUrl;
        }
        catch (JsonException)
        {
            // If config parsing fails, use default from named client
            return null;
        }
    }

    private string BuildUrl(string path)
    {
        var adapterUrl = GetAdapterUrl();
        if (!string.IsNullOrWhiteSpace(adapterUrl))
        {
            // If org-specific URL is configured, use it
            return new Uri(new Uri(adapterUrl), path).ToString();
        }
        // Otherwise use relative path with named client's BaseAddress
        return path;
    }

    public async Task<string> CreateOrganizationAsync(Guid organizationId, string name, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("/organizations");
            var response = await client.PostAsJsonAsync(url, new
            {
                organizationId,
                name
            }, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
            return result?.TransactionId ?? string.Empty;
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to create organization on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while creating organization.", ex);
        }
    }

    public async Task<string> CreateShareTypeAsync(Guid shareTypeId, string name, string symbol, decimal votingWeight, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("/share-types");
            var response = await client.PostAsJsonAsync(url, new
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
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to create share type on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while creating share type.", ex);
        }
    }

    public async Task<string> RecordVoteAsync(Guid voteId, Guid proposalId, Guid userId, decimal votingPower, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("/votes");
            var response = await client.PostAsJsonAsync(url, new
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
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to record vote on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while recording vote.", ex);
        }
    }

    private record BlockchainConfigDto(string? AdapterUrl, string? Network, string? ApiKey);
    private record TransactionResponse(string? TransactionId);
}
