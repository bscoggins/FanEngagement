namespace FanEngagement.Application.Exceptions;

/// <summary>
/// Exception thrown when a required wallet address is not found for a user.
/// </summary>
public class WalletAddressNotFoundException : Exception
{
    public Guid UserId { get; }
    public string BlockchainType { get; }

    public WalletAddressNotFoundException(Guid userId, string blockchainType)
        : base($"User {userId} does not have a primary wallet address configured for {blockchainType}.")
    {
        UserId = userId;
        BlockchainType = blockchainType;
    }
}
