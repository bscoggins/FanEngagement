using FanEngagement.Application.Blockchain;
using FanEngagement.Infrastructure.Blockchain;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FanEngagement.Tests;

public class BlockchainTransactionMetadataTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly IHttpClientFactory _httpClientFactory;

    public BlockchainTransactionMetadataTests(TestWebApplicationFactory factory)
    {
        _httpClientFactory = factory.Services.GetRequiredService<IHttpClientFactory>();
    }

    [Fact]
    public async Task PolygonAdapter_IncludesChainAndExplorerMetadata()
    {
        var adapter = new PolygonAdapterClient(_httpClientFactory, BuildConfig("amoy"));

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
        var adapter = new SolanaAdapterClient(_httpClientFactory, BuildConfig("devnet"));

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
}
