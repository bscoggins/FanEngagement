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
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var path = request.RequestUri?.AbsolutePath?.TrimEnd('/')?.ToLowerInvariant() ?? string.Empty;
        var responsePayload = path switch
        {
            var p when p.EndsWith("/organizations") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString(),
                accountAddress = $"OrgAcct-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/share-types") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString(),
                mintAddress = $"Mint-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/share-issuances") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString(),
                recipientAddress = $"Wallet-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/proposals") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString(),
                proposalAddress = $"Proposal-{Guid.NewGuid():N}"
            }),
            var p when p.EndsWith("/votes") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString()
            }),
            var p when p.EndsWith("/proposal-results") => JsonSerializer.Serialize(new
            {
                transactionId = Guid.NewGuid().ToString()
            }),
            _ => "{}"
        };

        // HttpResponseMessage is disposed by the caller (HttpClient)
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(responsePayload, Encoding.UTF8, "application/json")
        };

        return Task.FromResult(response);
    }
}
