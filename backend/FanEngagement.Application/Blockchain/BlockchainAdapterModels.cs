namespace FanEngagement.Application.Blockchain;

public record CreateOrganizationCommand(
    Guid OrganizationId,
    string Name,
    string? Description,
    OrganizationBrandingMetadata? Branding);

public record OrganizationBrandingMetadata(string? LogoUrl, string? PrimaryColor, string? SecondaryColor);

public record CreateOrganizationResult(string TransactionId, string AccountAddress);

public record CreateShareTypeCommand(
    Guid ShareTypeId,
    Guid OrganizationId,
    string Name,
    string Symbol,
    int Decimals,
    decimal VotingWeight,
    decimal? MaxSupply,
    string? Description);

public record CreateShareTypeResult(string TransactionId, string MintAddress);

public record RecordShareIssuanceCommand(
    Guid IssuanceId,
    string ShareTypeAddress,
    Guid UserId,
    decimal Quantity,
    string? RecipientAddress,
    Guid? IssuedByUserId,
    string? Reason);

public record RecordShareIssuanceResult(string TransactionId, string RecipientAddress);

public record CreateProposalCommand(
    Guid ProposalId,
    Guid OrganizationId,
    string Title,
    string ContentHash,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    decimal EligibleVotingPower,
    Guid? CreatedByUserId,
    string? ProposalTextHash,
    string? ExpectationsHash,
    string? VotingOptionsHash);

public record CreateProposalResult(string TransactionId, string ProposalAddress);

public record RecordVoteCommand(
    Guid VoteId,
    Guid ProposalId,
    Guid OrganizationId,
    Guid UserId,
    Guid OptionId,
    decimal VotingPower,
    string? VoterAddress,
    DateTimeOffset CastAt);

public record CommitProposalResultsCommand(
    Guid ProposalId,
    Guid OrganizationId,
    string ResultsHash,
    Guid? WinningOptionId,
    decimal TotalVotesCast,
    bool QuorumMet,
    DateTimeOffset ClosedAt);

public record BlockchainTransactionResult(string TransactionId);
