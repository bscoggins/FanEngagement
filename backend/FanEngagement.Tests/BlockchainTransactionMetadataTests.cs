using FanEngagement.Application.Blockchain;
using FanEngagement.Infrastructure.Blockchain;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FanEngagement.Tests;

public class BlockchainTransactionMetadataTests
{
    [Fact]
    public async Task PolygonAdapter_IncludesChainAndExplorerMetadata()
    {
        var adapter = new PolygonAdapterClient(CreateTestHttpClientFactory("Polygon"), BuildConfig("amoy"));

        var result = await adapter.RecordVoteAsync(CreateVoteCommand(), CancellationToken.None);

        Assert.False(string.IsNullOrWhiteSpace(result.TransactionId));
        Assert.Equal("80002", result.ChainId);
        Assert.False(string.IsNullOrWhiteSpace(result.ExplorerUrl));
        Assert.Contains(result.TransactionId, result.ExplorerUrl);
        Assert.Contains("polygonscan.com", result.ExplorerUrl, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SolanaAdapter_ReturnsNetworkIdentifierWithoutExplorer()
    {
        var adapter = new SolanaAdapterClient(CreateTestHttpClientFactory("Solana"), BuildConfig("devnet"));

        var result = await adapter.RecordVoteAsync(CreateVoteCommand(), CancellationToken.None);

        Assert.False(string.IsNullOrWhiteSpace(result.TransactionId));
        Assert.Equal("devnet", result.ChainId);
        Assert.Null(result.ExplorerUrl);
    }

    [Fact]
    public async Task NullAdapter_ReturnsEmptyMetadata()
    {
        var adapter = new NullBlockchainAdapter();

        var result = await adapter.RecordVoteAsync(CreateVoteCommand(), CancellationToken.None);

        Assert.Equal(string.Empty, result.TransactionId);
        Assert.Null(result.ChainId);
        Assert.Null(result.ExplorerUrl);
    }

    private static RecordVoteCommand CreateVoteCommand()
    {
        return new RecordVoteCommand(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            1m,
            "TestVoter",
            DateTimeOffset.UtcNow);
    }

    private static string BuildConfig(string network) =>
        $"{{\"adapterUrl\":\"http://localhost/\",\"network\":\"{network}\",\"apiKey\":\"test-api-key\"}}";

    private static IHttpClientFactory CreateTestHttpClientFactory(string adapterName)
    {
        var handler = new TestBlockchainAdapterHandler(adapterName);
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost/")
        };
        client.DefaultRequestHeaders.Add("X-Adapter-API-Key", "test-api-key");

        return new SingleClientFactory(client);
    }

    private sealed class SingleClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public SingleClientFactory(HttpClient client)
        {
            _client = client;
        }

        public HttpClient CreateClient(string name) => _client;
    }
}
