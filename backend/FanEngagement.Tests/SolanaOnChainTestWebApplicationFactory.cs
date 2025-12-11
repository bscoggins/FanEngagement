using System;
using Microsoft.Extensions.DependencyInjection;

namespace FanEngagement.Tests;

/// <summary>
/// Specialized factory that routes Solana adapter HTTP calls to a live adapter instance.
/// </summary>
public class SolanaOnChainTestWebApplicationFactory : TestWebApplicationFactory
{
    private const string DefaultAdapterBaseUrl = "http://localhost:3001/v1/adapter/";
    private const string DefaultApiKey = "dev-api-key-change-in-production";

    protected override void ConfigureSolanaAdapterClient(IServiceCollection services)
    {
        var adapterBaseUrl = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_BASE_URL") ?? DefaultAdapterBaseUrl;
        if (!Uri.TryCreate(adapterBaseUrl, UriKind.Absolute, out var baseUri))
        {
            throw new InvalidOperationException($"SOLANA_ADAPTER_BASE_URL '{adapterBaseUrl}' is not a valid absolute URI.");
        }

        var apiKey = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_API_KEY") ?? DefaultApiKey;

        services.AddHttpClient("SolanaAdapter")
            .ConfigureHttpClient(client =>
            {
                client.BaseAddress = baseUri;
                client.DefaultRequestHeaders.Remove("X-Adapter-API-Key");
                client.DefaultRequestHeaders.Add("X-Adapter-API-Key", apiKey);
            });
    }
}
