using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace FanEngagement.Tests;

/// <summary>
/// HTTP message handler that simulates successful blockchain adapter responses during tests.
/// Prevents outbound HTTP calls while ensuring the application still exercises adapter logic.
/// </summary>
internal sealed class TestBlockchainAdapterHandler : HttpMessageHandler
{
    private readonly string _adapterName;

    public TestBlockchainAdapterHandler(string adapterName)
    {
        _adapterName = adapterName;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Verify API Key is present
        if (!request.Headers.Contains("X-Adapter-API-Key"))
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.Unauthorized)
            {
                Content = new StringContent("Missing API Key")
            });
        }

        var path = request.RequestUri?.AbsolutePath?.TrimEnd('/')?.ToLowerInvariant() ?? string.Empty;
        var responsePayload = path switch
        {
            var p when p.EndsWith("/organizations") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}",
                accountAddress = $"{_adapterName}-OrgAcct-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/share-types") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}",
                mintAddress = $"{_adapterName}-Mint-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/share-issuances") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}",
                recipientAddress = $"{_adapterName}-Wallet-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/proposals") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}",
                proposalAddress = $"{_adapterName}-Proposal-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/votes") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/proposal-results") => JsonSerializer.Serialize(new
            {
                transactionId = $"{_adapterName}-tx-{Guid.NewGuid():N}"
            }),
            _ => "{}"
        };

        // HttpResponseMessage is disposed by HttpClient after SendAsync completes.
        // This is the standard pattern for HttpMessageHandler implementations.
#pragma warning disable CA2000 // Dispose objects before losing scope
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responsePayload, Encoding.UTF8, "application/json")
        };
#pragma warning restore CA2000

        return Task.FromResult(response);
    }
}
