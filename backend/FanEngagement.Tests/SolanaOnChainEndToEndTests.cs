using System;
using System.Buffers.Binary;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.Proposals;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FanEngagement.Tests;

public class SolanaOnChainEndToEndTests : IClassFixture<SolanaOnChainTestWebApplicationFactory>, IDisposable
{
    private readonly HttpClient _client;
    private readonly SolanaOnChainTestWebApplicationFactory _factory;
    private readonly SolanaRpcClient _solanaRpcClient;
    private readonly string _adapterApiKey;
    private readonly string _adapterBaseUrl;

    public SolanaOnChainEndToEndTests(SolanaOnChainTestWebApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
        var rpcUrl = Environment.GetEnvironmentVariable("SOLANA_ON_CHAIN_RPC_URL") ?? "http://localhost:8899";
        _solanaRpcClient = new SolanaRpcClient(rpcUrl);
        _adapterApiKey = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_API_KEY") ?? "dev-api-key-change-in-production";
        _adapterBaseUrl = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_BASE_URL") ?? "http://localhost:3001/v1/adapter/";
    }

    public void Dispose()
    {
        _solanaRpcClient.Dispose();
        _client.Dispose();
    }

    [SolanaOnChainFact]
    public async Task ProposalAndVoteFlow_IsVerifiableOnChain()
    {
        var (adminUserId, adminToken) = await TestAuthenticationHelper.CreateAuthenticatedAdminAsync(_factory);
        _client.AddAuthorizationHeader(adminToken);
        var adapterPubkey = Environment.GetEnvironmentVariable("SOLANA_ADAPTER_PUBKEY")
            ?? throw new InvalidOperationException("SOLANA_ADAPTER_PUBKEY must be set by the test harness to verify token balances.");

        var organization = await CreateOrganizationAsync();
        var shareType = await CreateShareTypeAsync(organization.Id);
        Assert.False(string.IsNullOrWhiteSpace(shareType.BlockchainMintAddress));

        const decimal issuedQuantity = 100m;
        var mintAddress = shareType.BlockchainMintAddress!;
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(150));
        var mintInfoBeforeIssuance = await _solanaRpcClient.WaitForMintInfoAsync(mintAddress, cts.Token);
        Assert.Equal(shareType.TokenDecimals, mintInfoBeforeIssuance.Decimals);
        Assert.True(mintInfoBeforeIssuance.IsInitialized);

        var voter = await _factory.CreateTestUserDirectlyAsync(new CreateUserRequest
        {
            Email = $"voter-{Guid.NewGuid()}@example.com",
            DisplayName = "On-chain voter",
            Password = "VoterPassword123!"
        });

        await AddPrimarySolanaWalletAsync(voter.Id, adapterPubkey);

        await AddMembershipAsync(organization.Id, voter.Id);
        await IssueSharesAsync(organization.Id, voter.Id, shareType.Id);

        var expectedSupply = mintInfoBeforeIssuance.Supply + ToScaledQuantity(issuedQuantity, shareType.TokenDecimals);
        var mintSupplyAfterIssuance = await _solanaRpcClient.WaitForTokenSupplyAsync(mintAddress, expectedSupply, cts.Token);
        Assert.Equal(expectedSupply, mintSupplyAfterIssuance);
        var voterTokenBalance = await _solanaRpcClient.WaitForTokenBalanceAsync(adapterPubkey, mintAddress, ToScaledQuantity(issuedQuantity, shareType.TokenDecimals), cts.Token);
        Assert.Equal(ToScaledQuantity(issuedQuantity, shareType.TokenDecimals), voterTokenBalance);

        var proposal = await CreateProposalAsync(organization.Id, adminUserId);
        var approveOption = await AddProposalOptionAsync(proposal.Id, "Approve Budget");
        await AddProposalOptionAsync(proposal.Id, "Reject Budget");
        var openedProposal = await OpenProposalAsync(proposal.Id);
        var vote = await CastVoteAsync(proposal.Id, approveOption.Id, voter.Id);

        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var persistedProposal = await dbContext.Proposals.AsNoTracking().FirstAsync(p => p.Id == proposal.Id);
        var persistedVote = await dbContext.Votes.AsNoTracking().FirstAsync(v => v.Id == vote.Id);

        Assert.False(string.IsNullOrWhiteSpace(persistedProposal.BlockchainProposalAddress));
        Assert.Equal(vote.ProposalId, persistedVote.ProposalId);

        var proposalTransactionId = openedProposal.BlockchainTransactionId
            ?? throw new InvalidOperationException("Proposal blockchain transaction id missing.");
        var proposalMemo = await _solanaRpcClient.WaitForMemoBySignatureAsync(
            proposalTransactionId,
            memo => IsMatchingMemo(memo, "proposal", proposal.Id, proposal.OrganizationId),
            cts.Token,
            expectedKeys: new[] { "type", "proposal", "org", "title" });

        Assert.Equal(proposal.Id.ToString(), proposalMemo.GetProperty("proposal").GetString());
        Assert.Equal(organization.Id.ToString(), proposalMemo.GetProperty("org").GetString());
        Assert.Equal(proposal.Title, proposalMemo.GetProperty("title").GetString());

        var voteTransactionId = vote.BlockchainTransactionId
            ?? throw new InvalidOperationException("Vote blockchain transaction id missing.");
        var voteMemo = await _solanaRpcClient.WaitForMemoBySignatureAsync(
            voteTransactionId,
            memo => memo.TryGetProperty("type", out var type)
                && type.GetString() == "vote"
                && memo.TryGetProperty("vote", out var voteIdElement)
                && string.Equals(voteIdElement.GetString(), vote.Id.ToString(), StringComparison.OrdinalIgnoreCase),
            cts.Token,
            expectedKeys: new[] { "type", "vote", "user", "choice" });

        Assert.Equal(vote.Id.ToString(), voteMemo.GetProperty("vote").GetString());
        Assert.Equal(voter.Id.ToString(), voteMemo.GetProperty("user").GetString());
        Assert.Equal(approveOption.Id.ToString(), voteMemo.GetProperty("choice").GetString());
    }

    private async Task AddPrimarySolanaWalletAsync(Guid userId, string address)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var now = DateTimeOffset.UtcNow;

        var walletAddress = new UserWalletAddress
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            BlockchainType = BlockchainType.Solana,
            Address = address,
            Label = "Test Solana Wallet",
            IsPrimary = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.UserWalletAddresses.Add(walletAddress);
        await dbContext.SaveChangesAsync();
    }

    private static bool IsMatchingMemo(JsonElement memo, string expectedType, Guid proposalId, Guid organizationId)
    {
        if (!memo.TryGetProperty("type", out var typeProperty) || !string.Equals(typeProperty.GetString(), expectedType, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return memo.TryGetProperty("proposal", out var proposalElement)
            && string.Equals(proposalElement.GetString(), proposalId.ToString(), StringComparison.OrdinalIgnoreCase)
            && memo.TryGetProperty("org", out var orgElement)
            && string.Equals(orgElement.GetString(), organizationId.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    private async Task<Organization> CreateOrganizationAsync()
    {
        var request = new CreateOrganizationRequest
        {
            Name = $"Solana Org {Guid.NewGuid():N}",
            Description = "End-to-end Solana test org",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = JsonSerializer.Serialize(new
            {
                adapterUrl = _adapterBaseUrl,
                apiKey = _adapterApiKey
            })
        };

        var response = await _client.PostAsJsonAsync("/organizations", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<Organization>()
            ?? throw new InvalidOperationException("Organization response could not be parsed.");
    }

    private async Task<ShareType> CreateShareTypeAsync(Guid organizationId)
    {
        var request = new CreateShareTypeRequest
        {
            Name = "Voting Token",
            Symbol = "VTKN",
            Description = "Token used for governance votes",
            VotingWeight = 1m,
            MaxSupply = 1_000_000m,
            IsTransferable = true,
            TokenDecimals = 0
        };

        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/share-types", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ShareType>()
            ?? throw new InvalidOperationException("Share type response could not be parsed.");
    }

    private async Task AddMembershipAsync(Guid organizationId, Guid userId)
    {
        var request = new CreateMembershipRequest
        {
            UserId = userId,
            Role = OrganizationRole.Member
        };

        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/memberships", request);
        response.EnsureSuccessStatusCode();
    }

    private async Task IssueSharesAsync(Guid organizationId, Guid userId, Guid shareTypeId)
    {
        var request = new CreateShareIssuanceRequest
        {
            UserId = userId,
            ShareTypeId = shareTypeId,
            Quantity = 100m,
            Reason = "Seed voting power"
        };

        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/share-issuances", request);
        response.EnsureSuccessStatusCode();
    }

    private async Task<ProposalDto> CreateProposalAsync(Guid organizationId, Guid createdByUserId)
    {
        var request = new CreateProposalRequest
        {
            Title = "Approve annual supporter budget",
            Description = "Allocate funds to supporter engagement initiatives",
            CreatedByUserId = createdByUserId,
            StartAt = DateTimeOffset.UtcNow.AddMinutes(-1),
            EndAt = DateTimeOffset.UtcNow.AddDays(7),
            QuorumRequirement = 0.5m
        };

        var response = await _client.PostAsJsonAsync($"/organizations/{organizationId}/proposals", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProposalDto>()
            ?? throw new InvalidOperationException("Proposal response could not be parsed.");
    }

    private async Task<ProposalOptionDto> AddProposalOptionAsync(Guid proposalId, string text)
    {
        var request = new AddProposalOptionRequest
        {
            Text = text,
            Description = text
        };

        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/options", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProposalOptionDto>()
            ?? throw new InvalidOperationException("Proposal option response could not be parsed.");
    }

    private async Task<ProposalDto> OpenProposalAsync(Guid proposalId)
    {
        var response = await _client.PostAsync($"/proposals/{proposalId}/open", content: null);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProposalDto>()
            ?? throw new InvalidOperationException("Open proposal response could not be parsed.");
    }

    private async Task<VoteDto> CastVoteAsync(Guid proposalId, Guid optionId, Guid userId)
    {
        var request = new CastVoteRequest
        {
            ProposalOptionId = optionId,
            UserId = userId
        };

        var response = await _client.PostAsJsonAsync($"/proposals/{proposalId}/votes", request);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<VoteDto>()
            ?? throw new InvalidOperationException("Vote response could not be parsed.");
    }

    private sealed class SolanaRpcClient : IDisposable
    {
        private const string MemoProgramId = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
        private const int MaxTransactionWaitRetries = 60; // Maximum number of retry attempts
        private const int InitialRetryDelayMs = 500; // Start with 500ms delay
        private const int MaxRetryDelayMs = 10000; // Cap at 10 seconds
        private const double JitterRange = 0.4; // ±20% jitter (0.4 total range)
        private const double JitterOffset = 0.2; // Center jitter around 0 (-0.2 to +0.2)
        private readonly HttpClient _httpClient;
        private int _requestId;

        /// <summary>
        /// Calculate exponential backoff delay with jitter to handle varying network conditions.
        /// </summary>
        private static TimeSpan CalculateRetryDelay(int attemptNumber)
        {
            // Exponential backoff: delay = min(maxDelay, initialDelay * 2^attempt)
            var exponentialDelay = Math.Min(
                MaxRetryDelayMs,
                InitialRetryDelayMs * Math.Pow(2, attemptNumber)
            );
            
            // Add jitter (±20%) to prevent thundering herd
            var jitter = Random.Shared.NextDouble() * JitterRange - JitterOffset; // -0.2 to +0.2
            var delayWithJitter = exponentialDelay * (1 + jitter);
            
            return TimeSpan.FromMilliseconds(Math.Max(InitialRetryDelayMs, delayWithJitter));
        }

        public SolanaRpcClient(string rpcUrl)
        {
            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(rpcUrl)
            };
        }

        public void Dispose()
        {
            _httpClient.Dispose();
        }

        public async Task<JsonElement> WaitForMemoBySignatureAsync(
            string signature,
            Func<JsonElement, bool> predicate,
            CancellationToken cancellationToken,
            string[]? expectedKeys = null)
        {
            var attempts = 0;
            
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                
                if (attempts >= MaxTransactionWaitRetries)
                {
                    throw new TimeoutException(
                        $"Transaction {signature} was not found or did not match predicate after {attempts} attempts.");
                }

                var transaction = await TryGetTransactionAsync(signature, cancellationToken);
                if (transaction is not null && transaction.RootElement.TryGetProperty("result", out var resultElement) && resultElement.ValueKind != JsonValueKind.Null)
                {
                    var memoPayload = TryExtractMemo(resultElement);
                    if (memoPayload is not null)
                    {
                        using var doc = JsonDocument.Parse(memoPayload);
                        var memo = doc.RootElement.Clone();

                        if (expectedKeys is not null)
                        {
                            foreach (var required in expectedKeys.Where(k => !memo.TryGetProperty(k, out _)))
                            {
                                throw new InvalidOperationException($"Memo for transaction {signature} missing required field '{required}'.");
                            }
                        }

                        if (predicate(memo))
                        {
                            EnsureMemoInstructionPresent(resultElement, signature);
                            EnsureTransactionFinalized(resultElement, signature);
                            return memo;
                        }
                    }
                }

                attempts++;
                var delay = CalculateRetryDelay(attempts);
                await Task.Delay(delay, cancellationToken);
            }
        }

        public async Task<ulong> GetTokenSupplyAsync(string mintAddress, CancellationToken cancellationToken)
        {
            using var doc = await SendRpcAsync(
                "getTokenSupply",
                new object[] { mintAddress },
                cancellationToken);

            var result = doc.RootElement.GetProperty("result");
            var value = result.GetProperty("value");
            var amountString = value.GetProperty("amount").GetString();

            if (!ulong.TryParse(amountString, out var supply))
            {
                throw new InvalidOperationException($"Unable to parse token supply for mint {mintAddress} (value: {amountString}).");
            }

            return supply;
        }

        public async Task<ulong> WaitForTokenSupplyAsync(string mintAddress, ulong expectedSupply, CancellationToken cancellationToken)
        {
            var attempts = 0;
            
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (attempts >= MaxTransactionWaitRetries)
                {
                    throw new TimeoutException(
                        $"Token supply for mint {mintAddress} did not reach {expectedSupply} after {attempts} attempts.");
                }

                try
                {
                    var supply = await GetTokenSupplyAsync(mintAddress, cancellationToken);
                    if (supply >= expectedSupply)
                    {
                        return supply;
                    }
                }
                catch (InvalidOperationException)
                {
                    // ignore transient parsing issues and retry
                }

                attempts++;
                var delay = CalculateRetryDelay(attempts);
                await Task.Delay(delay, cancellationToken);
            }
        }

        public async Task<ulong> WaitForTokenBalanceAsync(string ownerAddress, string mintAddress, ulong expectedBalance, CancellationToken cancellationToken)
        {
            var attempts = 0;
            
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();

                if (attempts >= MaxTransactionWaitRetries)
                {
                    throw new TimeoutException(
                        $"Token balance for owner {ownerAddress} and mint {mintAddress} did not reach {expectedBalance} after {attempts} attempts.");
                }

                try
                {
                    using var doc = await SendRpcAsync(
                        "getTokenAccountsByOwner",
                        new object[]
                        {
                            ownerAddress,
                            new { mint = mintAddress },
                            new { encoding = "jsonParsed", commitment = "confirmed" }
                        },
                        cancellationToken);

                    if (doc.RootElement.TryGetProperty("result", out var result) &&
                        result.TryGetProperty("value", out var valueElement) &&
                        valueElement.ValueKind == JsonValueKind.Array &&
                        valueElement.GetArrayLength() > 0)
                    {
                        var account = valueElement[0];
                        if (account.TryGetProperty("account", out var accountObj) &&
                            accountObj.TryGetProperty("data", out var dataObj) &&
                            dataObj.TryGetProperty("parsed", out var parsed) &&
                            parsed.TryGetProperty("info", out var info) &&
                            info.TryGetProperty("tokenAmount", out var tokenAmount))
                        {
                            var amountString = tokenAmount.GetProperty("amount").GetString();
                            if (ulong.TryParse(amountString, out var amount) && amount >= expectedBalance)
                            {
                                return amount;
                            }
                        }
                    }
                }
                catch (InvalidOperationException)
                {
                    // ignore and retry
                }

                attempts++;
                var delay = CalculateRetryDelay(attempts);
                await Task.Delay(delay, cancellationToken);
            }
        }

        public async Task<MintInfo> GetMintInfoAsync(string mintAddress, CancellationToken cancellationToken)
        {
            using var doc = await SendRpcAsync(
                "getAccountInfo",
                new object[]
                {
                    mintAddress,
                    new { encoding = "base64" }
                },
                cancellationToken);

            var result = doc.RootElement.GetProperty("result");
            var value = result.GetProperty("value");
            if (value.ValueKind == JsonValueKind.Null)
            {
                throw new InvalidOperationException($"Mint account {mintAddress} not found.");
            }

            var dataArray = value.GetProperty("data");
            if (dataArray.ValueKind != JsonValueKind.Array || dataArray.GetArrayLength() == 0)
            {
                throw new InvalidOperationException($"Mint account {mintAddress} missing data payload.");
            }

            var base64Data = dataArray[0].GetString();
            if (string.IsNullOrWhiteSpace(base64Data))
            {
                throw new InvalidOperationException($"Mint account {mintAddress} returned empty data.");
            }

            byte[] raw;
            try
            {
                raw = Convert.FromBase64String(base64Data);
            }
            catch (FormatException ex)
            {
                throw new InvalidOperationException($"Mint account {mintAddress} contained invalid base64 data.", ex);
            }

            if (raw.Length < 45)
            {
                throw new InvalidOperationException($"Mint account {mintAddress} data too short ({raw.Length} bytes).");
            }

            // SPL Token mint layout: supply at offset 36 (u64 LE), decimals at offset 44 (u8), initialized flag at offset 45 (bool)
            var supply = BinaryPrimitives.ReadUInt64LittleEndian(raw.AsSpan(36, 8));
            var decimals = raw[44];
            var isInitialized = raw[45] != 0;

            return new MintInfo(supply, decimals, isInitialized);
        }

        public async Task<MintInfo> WaitForMintInfoAsync(string mintAddress, CancellationToken cancellationToken)
        {
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();

                try
                {
                    return await GetMintInfoAsync(mintAddress, cancellationToken);
                }
                catch (InvalidOperationException)
                {
                    await Task.Delay(TimeSpan.FromSeconds(1), cancellationToken);
                }
            }
        }

        private async Task<JsonDocument?> TryGetTransactionAsync(string signature, CancellationToken cancellationToken)
        {
            try
            {
                return await SendRpcAsync(
                    "getTransaction",
                    new object[]
                    {
                        signature,
                        new
                        {
                            encoding = "jsonParsed",
                            commitment = "confirmed",
                            maxSupportedTransactionVersion = 0
                        }
                    },
                    cancellationToken);
            }
            catch (HttpRequestException)
            {
                return null;
            }
        }

        private async Task<JsonDocument> SendRpcAsync(string method, object[] parameters, CancellationToken cancellationToken)
        {
            var request = new RpcRequest
            {
                JsonRpc = "2.0",
                Id = Interlocked.Increment(ref _requestId),
                Method = method,
                Params = parameters
            };

            using var response = await _httpClient.PostAsJsonAsync(string.Empty, request, cancellationToken);
            response.EnsureSuccessStatusCode();
            var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            return await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        }

        private static string? TryExtractMemo(JsonElement result)
        {
            if (!TryGetProperty(result, "transaction", out var transaction) ||
                !TryGetProperty(transaction, "message", out var message) ||
                !TryGetProperty(message, "instructions", out var instructions) ||
                instructions.ValueKind != JsonValueKind.Array)
            {
                return null;
            }

            foreach (var instruction in instructions.EnumerateArray())
            {
                if (!IsMemoInstruction(instruction))
                {
                    continue;
                }

                if (instruction.TryGetProperty("parsed", out var parsed))
                {
                    if (parsed.ValueKind == JsonValueKind.Object &&
                        parsed.TryGetProperty("info", out var info) &&
                        info.TryGetProperty("memo", out var memoElement))
                    {
                        return memoElement.GetString();
                    }

                    if (parsed.ValueKind == JsonValueKind.String)
                    {
                        return parsed.GetString();
                    }
                }

                if (instruction.TryGetProperty("data", out var dataElement))
                {
                    var raw = dataElement.GetString();
                    if (!string.IsNullOrWhiteSpace(raw))
                    {
                        try
                        {
                            var decoded = Convert.FromBase64String(raw);
                            return Encoding.UTF8.GetString(decoded);
                        }
                        catch (Exception ex)
                        {
                            // Log malformed base64 data but continue processing
                            Debug.WriteLine($"Failed to decode base64 memo data: {ex.Message}");
                        }
                    }
                }
            }

            return null;
        }

        private static void EnsureMemoInstructionPresent(JsonElement result, string signature)
        {
            if (!TryGetProperty(result, "transaction", out var transaction) ||
                !TryGetProperty(transaction, "message", out var message) ||
                !TryGetProperty(message, "instructions", out var instructions) ||
                instructions.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException($"Transaction {signature} missing instructions block.");
            }

            if (!instructions.EnumerateArray().Any(i => IsMemoInstruction(i)))
            {
                throw new InvalidOperationException($"Transaction {signature} does not contain a memo instruction.");
            }
        }

        private static void EnsureTransactionFinalized(JsonElement result, string signature)
        {
            if (TryGetProperty(result, "meta", out var meta) && meta.TryGetProperty("err", out var err) && err.ValueKind != JsonValueKind.Null)
            {
                throw new InvalidOperationException($"Transaction {signature} has error state: {err}.");
            }
        }

        private static bool TryGetProperty(JsonElement element, string name, out JsonElement value)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out value))
            {
                return true;
            }

            value = default;
            return false;
        }

        private static bool IsMemoInstruction(JsonElement instruction)
        {
            if (instruction.TryGetProperty("program", out var program) &&
                string.Equals(program.GetString(), "spl-memo", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (instruction.TryGetProperty("programId", out var programIdElement) &&
                string.Equals(programIdElement.GetString(), MemoProgramId, StringComparison.Ordinal))
            {
                return true;
            }

            return false;
        }

        private sealed class RpcRequest
        {
            [JsonPropertyName("jsonrpc")]
            public string JsonRpc { get; set; } = "2.0";

            [JsonPropertyName("method")]
            public string Method { get; set; } = string.Empty;

            [JsonPropertyName("params")]
            public object[] Params { get; set; } = Array.Empty<object>();

            [JsonPropertyName("id")]
            public int Id { get; set; }
        }

        public sealed record MintInfo(ulong Supply, byte Decimals, bool IsInitialized);
    }

    private static ulong ToScaledQuantity(decimal quantity, int decimals)
    {
        // Use decimal.Parse to create exact multiplier, avoiding floating-point precision issues
        var multiplier = decimal.Parse("1" + new string('0', decimals));
        var scaled = quantity * multiplier;
        return checked((ulong)scaled);
    }

}
