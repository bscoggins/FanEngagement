using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
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
    private static readonly JsonSerializerOptions SerializerOptions;

    static BlockchainAdapterClientBase()
    {
        SerializerOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        SerializerOptions.Converters.Add(new UtcDateTimeOffsetJsonConverter());
    }

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
        var config = TryGetBlockchainConfig();
        if (!string.IsNullOrWhiteSpace(config?.ApiKey))
        {
            if (client.DefaultRequestHeaders.Contains("X-Adapter-API-Key"))
            {
                client.DefaultRequestHeaders.Remove("X-Adapter-API-Key");
            }
            client.DefaultRequestHeaders.Add("X-Adapter-API-Key", config.ApiKey!);
        }
        return client;
    }

    private BlockchainConfigDto? TryGetBlockchainConfig()
    {
        if (string.IsNullOrWhiteSpace(_blockchainConfig))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<BlockchainConfigDto>(_blockchainConfig, SerializerOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private string BuildUrl(string path)
    {
        var adapterUrl = TryGetBlockchainConfig()?.AdapterUrl;
        if (!string.IsNullOrWhiteSpace(adapterUrl))
        {
            var trimmedPath = path.TrimStart('/');
            var normalizedBase = adapterUrl.EndsWith('/') ? adapterUrl : string.Concat(adapterUrl, "/");
            return new Uri(new Uri(normalizedBase), trimmedPath).ToString();
        }
        // Otherwise use relative path with named client's BaseAddress
        return path;
    }

    public async Task<CreateOrganizationResult> CreateOrganizationAsync(CreateOrganizationCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("organizations");
            var payload = BuildOrganizationPayload(command);
            var response = await client.PostAsJsonAsync(url, payload, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<OrganizationResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new CreateOrganizationResult(
                transactionId,
                result?.AccountAddress ?? string.Empty,
                GetChainId(),
                BuildExplorerUrl(transactionId));
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

    public async Task<CreateShareTypeResult> CreateShareTypeAsync(CreateShareTypeCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("share-types");
            var response = await client.PostAsJsonAsync(url, new
            {
                shareTypeId = command.ShareTypeId,
                organizationId = command.OrganizationId,
                name = command.Name,
                symbol = command.Symbol,
                decimals = command.Decimals,
                maxSupply = command.MaxSupply,
                metadata = new
                {
                    description = command.Description,
                    votingWeight = command.VotingWeight
                }
            }, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<ShareTypeResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new CreateShareTypeResult(
                transactionId,
                result?.MintAddress ?? string.Empty,
                GetChainId(),
                BuildExplorerUrl(transactionId));
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

    public async Task<RecordShareIssuanceResult> RecordShareIssuanceAsync(RecordShareIssuanceCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("share-issuances");
            var response = await client.PostAsJsonAsync(url, new
            {
                issuanceId = command.IssuanceId,
                shareTypeId = command.ShareTypeAddress,
                userId = command.UserId,
                quantity = command.Quantity,
                recipientAddress = command.RecipientAddress,
                metadata = new
                {
                    reason = command.Reason,
                    issuedBy = command.IssuedByUserId
                }
            }, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<ShareIssuanceResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new RecordShareIssuanceResult(
                transactionId,
                result?.RecipientAddress ?? string.Empty,
                GetChainId(),
                BuildExplorerUrl(transactionId));
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to record share issuance on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while recording share issuance.", ex);
        }
    }

    public async Task<CreateProposalResult> CreateProposalAsync(CreateProposalCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("proposals");
            var response = await client.PostAsJsonAsync(url, new
            {
                proposalId = command.ProposalId,
                organizationId = command.OrganizationId,
                title = command.Title,
                contentHash = command.ContentHash,
                startAt = command.StartAt,
                endAt = command.EndAt,
                eligibleVotingPower = command.EligibleVotingPower,
                createdByUserId = command.CreatedByUserId,
                proposalTextHash = command.ProposalTextHash,
                expectationsHash = command.ExpectationsHash,
                votingOptionsHash = command.VotingOptionsHash
            }, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<ProposalResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new CreateProposalResult(
                transactionId,
                result?.ProposalAddress ?? string.Empty,
                GetChainId(),
                BuildExplorerUrl(transactionId));
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to create proposal on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while creating proposal.", ex);
        }
    }

    public async Task<BlockchainTransactionResult> RecordVoteAsync(RecordVoteCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("votes");
            var response = await client.PostAsJsonAsync(url, new
            {
                voteId = command.VoteId,
                proposalId = command.ProposalId,
                organizationId = command.OrganizationId,
                userId = command.UserId,
                optionId = command.OptionId,
                votingPower = command.VotingPower,
                voterAddress = command.VoterAddress,
                timestamp = command.CastAt
            }, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new BlockchainTransactionResult(
                transactionId,
                GetChainId(),
                BuildExplorerUrl(transactionId));
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

    public async Task<BlockchainTransactionResult> CommitProposalResultsAsync(CommitProposalResultsCommand command, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("proposal-results");
            var response = await client.PostAsJsonAsync(url, new
            {
                proposalId = command.ProposalId,
                organizationId = command.OrganizationId,
                resultsHash = command.ResultsHash,
                winningOptionId = command.WinningOptionId,
                totalVotesCast = command.TotalVotesCast,
                quorumMet = command.QuorumMet,
                closedAt = command.ClosedAt
            }, SerializerOptions, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<TransactionResponse>(cancellationToken);
            var transactionId = result?.TransactionId ?? string.Empty;
            return new BlockchainTransactionResult(
                transactionId,
                GetChainId(),
                BuildExplorerUrl(transactionId));
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to commit proposal results on {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while committing proposal results.", ex);
        }
    }

    public async Task<object?> GetTransactionAsync(string transactionId, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            // Temporary logging for debugging
            Console.WriteLine($"[BlockchainAdapter] Fetching transaction {transactionId} from {client.BaseAddress}");
            
            var url = BuildUrl($"transactions/{transactionId}");
            var response = await client.GetAsync(url, cancellationToken);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                Console.WriteLine($"[BlockchainAdapter] Transaction {transactionId} not found (404)");
                return null;
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<object>(cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BlockchainAdapter] Error fetching transaction {transactionId}: {ex}");
            return null;
        }
    }

    public async Task<object?> GetAccountAsync(string address, CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl($"accounts/{address}");
            var response = await client.GetAsync(url, cancellationToken);

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return null;
            }

            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<object>(cancellationToken);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public async Task<CreateWalletResult> CreateWalletAsync(CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("wallets");
            var response = await client.PostAsync(url, null, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<CreateWalletResult>(cancellationToken);
            return result ?? throw new InvalidOperationException("Failed to create wallet: Empty response");
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to create wallet on {BlockchainName} blockchain: {ex.Message}", ex);
        }
    }

    public async Task<PlatformWalletDto> GetPlatformWalletAsync(CancellationToken cancellationToken)
    {
        try
        {
            var client = CreateHttpClient();
            var url = BuildUrl("wallet");
            var response = await client.GetAsync(url, cancellationToken);

            response.EnsureSuccessStatusCode();
            var result = await response.Content.ReadFromJsonAsync<PlatformWalletDto>(cancellationToken);
            return result ?? new PlatformWalletDto(string.Empty, 0, string.Empty);
        }
        catch (HttpRequestException ex)
        {
            throw new InvalidOperationException($"Failed to get platform wallet info from {BlockchainName} blockchain: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"Request to {BlockchainName} blockchain adapter timed out while getting wallet info.", ex);
        }
    }

    private static Dictionary<string, object?> BuildOrganizationPayload(CreateOrganizationCommand command)
    {
        var payload = new Dictionary<string, object?>
        {
            ["organizationId"] = command.OrganizationId,
            ["name"] = command.Name
        };

        if (command.Description is not null)
        {
            payload["description"] = command.Description;
        }

        var metadata = BuildBrandingMetadata(command.Branding);
        if (metadata is not null)
        {
            payload["metadata"] = metadata;
        }

        return payload;
    }

    private static Dictionary<string, object?>? BuildBrandingMetadata(OrganizationBrandingMetadata? branding)
    {
        if (branding is null)
        {
            return null;
        }

        var metadata = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(branding.LogoUrl))
        {
            metadata["logoUrl"] = branding.LogoUrl;
        }

        var colors = new Dictionary<string, object?>();

        if (!string.IsNullOrWhiteSpace(branding.PrimaryColor))
        {
            colors["primary"] = branding.PrimaryColor;
        }

        if (!string.IsNullOrWhiteSpace(branding.SecondaryColor))
        {
            colors["secondary"] = branding.SecondaryColor;
        }

        if (colors.Count > 0)
        {
            metadata["colors"] = colors;
        }

        return metadata.Count > 0 ? metadata : null;
    }

    private string? GetChainId()
    {
        var network = TryGetBlockchainConfig()?.Network?.ToLowerInvariant();

        if (string.Equals(BlockchainName, "Polygon", StringComparison.OrdinalIgnoreCase))
        {
            return network switch
            {
                "amoy" => "80002",
                "mumbai" => "80001",
                "mainnet" => "137",
                "polygon" => "137",
                _ => null
            };
        }

        // For other chains, return the network identifier when available.
        return network;
    }

    private string? BuildExplorerUrl(string? transactionId)
    {
        if (string.IsNullOrWhiteSpace(transactionId))
        {
            return null;
        }

        var network = TryGetBlockchainConfig()?.Network?.ToLowerInvariant();

        if (string.Equals(BlockchainName, "Polygon", StringComparison.OrdinalIgnoreCase))
        {
            return network switch
            {
                "amoy" => $"https://amoy.polygonscan.com/tx/{transactionId}",
                "mumbai" => $"https://mumbai.polygonscan.com/tx/{transactionId}",
                _ => $"https://polygonscan.com/tx/{transactionId}"
            };
        }

        return null;
    }

    private sealed class UtcDateTimeOffsetJsonConverter : JsonConverter<DateTimeOffset>
    {
        public override DateTimeOffset Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            return reader.GetDateTimeOffset();
        }

        public override void Write(Utf8JsonWriter writer, DateTimeOffset value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.UtcDateTime.ToString("O", CultureInfo.InvariantCulture));
        }
    }

    private record BlockchainConfigDto(string? AdapterUrl, string? Network, string? ApiKey);
    private record TransactionResponse(string? TransactionId);
    private record OrganizationResponse(string? TransactionId, string? AccountAddress);
    private record ShareTypeResponse(string? TransactionId, string? MintAddress);
    private record ShareIssuanceResponse(string? TransactionId, string? RecipientAddress);
    private record ProposalResponse(string? TransactionId, string? ProposalAddress);
}
