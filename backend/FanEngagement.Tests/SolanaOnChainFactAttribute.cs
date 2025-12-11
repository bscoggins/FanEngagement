using System;
using Xunit;

namespace FanEngagement.Tests;

/// <summary>
/// Executes the decorated test only when RUN_SOLANA_ON_CHAIN_TESTS=true.
/// Helps keep the regular test suite fast while still enabling opt-in on-chain verification.
/// </summary>
public sealed class SolanaOnChainFactAttribute : FactAttribute
{
    private const string FlagName = "RUN_SOLANA_ON_CHAIN_TESTS";

    public SolanaOnChainFactAttribute()
    {
        if (!string.Equals(Environment.GetEnvironmentVariable(FlagName), "true", StringComparison.OrdinalIgnoreCase))
        {
            Skip = $"Set {FlagName}=true to run Solana on-chain tests.";
        }
    }
}
