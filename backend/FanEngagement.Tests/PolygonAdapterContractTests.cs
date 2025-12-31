using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using FanEngagement.Application.Blockchain;
using FanEngagement.Infrastructure.Blockchain;
using Xunit;

namespace FanEngagement.Tests;

public class PolygonAdapterContractTests
{
    private const string AdapterBaseUrl = "http://localhost/";
    private const string ApiKey = "contract-key";

    [Fact]
    public async Task PolygonAdapter_SendsContractCompatiblePayloads()
    {
        var paths = new List<string>();
        var handler = new ContractRecordingHandler(request =>
        {
            Assert.True(request.Headers.TryGetValues("X-Adapter-API-Key", out var keys));
            Assert.Equal(ApiKey, keys!.First());

            paths.Add(request.RequestUri!.AbsolutePath.Trim('/'));

            var path = request.RequestUri!.AbsolutePath.ToLowerInvariant();
            object payload = path switch
            {
                var p when p.EndsWith("organizations") => new { transactionId = "tx-org", accountAddress = "0xOrg" },
                var p when p.EndsWith("share-types") => new { transactionId = "tx-share", mintAddress = "0xMint" },
                var p when p.EndsWith("share-issuances") => new { transactionId = "tx-issuance", recipientAddress = "0xRecipient" },
                var p when p.EndsWith("proposals") => new { transactionId = "tx-prop", proposalAddress = "0xProposal" },
                var p when p.EndsWith("votes") => new { transactionId = "tx-vote" },
                _ => new { transactionId = "tx-results" }
            };

            return new HttpResponseMessage(HttpStatusCode.Created)
            {
                Content = JsonContent.Create(payload)
            };
        });

        var adapter = CreateAdapter(handler);
        var orgId = Guid.NewGuid();

        var orgResult = await adapter.CreateOrganizationAsync(new CreateOrganizationCommand(orgId, "Polygon Demo", "desc", new OrganizationBrandingMetadata(null, null, null)), CancellationToken.None);
        var shareTypeResult = await adapter.CreateShareTypeAsync(new CreateShareTypeCommand(Guid.NewGuid(), orgId, "Gold", "GLD", 18, 1.0m, null, "desc"), CancellationToken.None);
        var issuanceResult = await adapter.RecordShareIssuanceAsync(new RecordShareIssuanceCommand(Guid.NewGuid(), "0xMint", Guid.NewGuid(), 10m, "0xRecipient", Guid.NewGuid(), "bonus"), CancellationToken.None);
        var proposalResult = await adapter.CreateProposalAsync(new CreateProposalCommand(Guid.NewGuid(), orgId, "Title", "hash", DateTimeOffset.UtcNow, DateTimeOffset.UtcNow.AddDays(1), 100, Guid.NewGuid(), "text", "exp", "opts"), CancellationToken.None);
        var voteResult = await adapter.RecordVoteAsync(new RecordVoteCommand(Guid.NewGuid(), Guid.NewGuid(), orgId, Guid.NewGuid(), Guid.NewGuid(), 1m, "wallet", DateTimeOffset.UtcNow), CancellationToken.None);
        var results = await adapter.CommitProposalResultsAsync(new CommitProposalResultsCommand(Guid.NewGuid(), orgId, "abc123", Guid.NewGuid(), 10, true, DateTimeOffset.UtcNow), CancellationToken.None);

        Assert.Equal("tx-org", orgResult.TransactionId);
        Assert.Equal("tx-share", shareTypeResult.TransactionId);
        Assert.Equal("tx-issuance", issuanceResult.TransactionId);
        Assert.Equal("tx-prop", proposalResult.TransactionId);
        Assert.Equal("tx-vote", voteResult.TransactionId);
        Assert.Equal("tx-results", results.TransactionId);

        Assert.Contains("organizations", paths);
        Assert.Contains("share-types", paths);
        Assert.Contains("share-issuances", paths);
        Assert.Contains("proposals", paths);
        Assert.Contains("votes", paths);
        Assert.Contains("proposal-results", paths);
    }

    [Fact]
    public async Task PolygonAdapter_ThrowsForUnauthorizedRequests()
    {
        var handler = new ContractRecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized));
        var adapter = CreateAdapter(handler);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            adapter.RecordVoteAsync(new RecordVoteCommand(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1m, null, DateTimeOffset.UtcNow), CancellationToken.None));
    }

    [Fact]
    public async Task PolygonAdapter_ConvertsTimeouts()
    {
        var handler = new ThrowingHandler(new TaskCanceledException("simulated timeout"));
        var adapter = CreateAdapter(handler);

        await Assert.ThrowsAsync<TimeoutException>(() =>
            adapter.CreateShareTypeAsync(new CreateShareTypeCommand(Guid.NewGuid(), Guid.NewGuid(), "Gold", "GLD", 18, 1.0m, null, null), CancellationToken.None));
    }

    [Fact]
    public async Task PolygonAdapter_PropagatesAdapterOfflineErrors()
    {
        var handler = new ThrowingHandler(new HttpRequestException("adapter offline"));
        var adapter = CreateAdapter(handler);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            adapter.CreateOrganizationAsync(new CreateOrganizationCommand(Guid.NewGuid(), "Offline", null, null), CancellationToken.None));

        Assert.Contains("adapter offline", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private static PolygonAdapterClient CreateAdapter(HttpMessageHandler handler)
    {
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri(AdapterBaseUrl)
        };

        return new PolygonAdapterClient(new SingleClientFactory(client), BuildConfig());
    }

    private static string BuildConfig() =>
        $"{{\"adapterUrl\":\"{AdapterBaseUrl}\",\"network\":\"amoy\",\"apiKey\":\"{ApiKey}\"}}";

    private sealed class SingleClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public SingleClientFactory(HttpClient client)
        {
            _client = client;
        }

        public HttpClient CreateClient(string name)
        {
            _client.DefaultRequestHeaders.Remove("X-Adapter-API-Key");
            _client.DefaultRequestHeaders.Add("X-Adapter-API-Key", ApiKey);
            return _client;
        }
    }

    private sealed class ContractRecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(responder(request));
        }
    }

    private sealed class ThrowingHandler(Exception ex) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromException<HttpResponseMessage>(ex);
        }
    }
}
