using FanEngagement.Application.Validators;
using Xunit;

namespace FanEngagement.Tests;

public class BlockchainConfigValidationHelpersTests
{
    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_WithValidConfig_ReturnsNoErrors(string chain)
    {
        var config = @"{""adapterUrl"":""http://localhost:3000/v1/adapter/"",""network"":""devnet"",""apiKey"":""test-key""}";

        var errors = Validate(chain, config);

        Assert.Empty(errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_MissingConfig_ReturnsRequiredError(string chain)
    {
        var errors = Validate(chain, null);

        Assert.Contains($"{chain} blockchain requires BlockchainConfig with adapterUrl, network, and apiKey.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_InvalidJson_ReturnsJsonError(string chain)
    {
        var errors = Validate(chain, "{not-json");

        Assert.Contains($"{chain} blockchain config must be valid JSON with adapterUrl, network, and apiKey.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_MissingAdapterUrl_ReturnsError(string chain)
    {
        var config = @"{""network"":""devnet"",""apiKey"":""key""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires adapterUrl.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_EmptyAdapterUrl_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":"""",""network"":""devnet"",""apiKey"":""key""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires adapterUrl.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_InvalidAdapterUrl_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":""not-a-url"",""network"":""devnet"",""apiKey"":""key""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} adapterUrl must be an absolute http/https URL.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_MissingNetwork_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":""http://localhost"",""apiKey"":""key""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires network.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_EmptyNetwork_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":""http://localhost"",""network"":"""",""apiKey"":""key""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires network.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_MissingApiKey_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":""http://localhost"",""network"":""devnet""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires apiKey.", errors);
    }

    [Theory]
    [InlineData("Polygon")]
    [InlineData("Solana")]
    public void ValidateConfig_EmptyApiKey_ReturnsError(string chain)
    {
        var config = @"{""adapterUrl"":""http://localhost"",""network"":""devnet"",""apiKey"":""""}";

        var errors = Validate(chain, config);

        Assert.Contains($"{chain} blockchain requires apiKey.", errors);
    }

    private static IReadOnlyList<string> Validate(string chain, string? config) =>
        chain == "Polygon"
            ? BlockchainConfigValidationHelpers.ValidatePolygonConfig(config)
            : BlockchainConfigValidationHelpers.ValidateSolanaConfig(config);
}
