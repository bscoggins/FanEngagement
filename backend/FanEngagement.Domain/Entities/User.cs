using FanEngagement.Domain.Enums;

namespace FanEngagement.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string DisplayName { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public UserRole Role { get; set; } = UserRole.User;
    public UserThemePreference ThemePreference { get; set; } = UserThemePreference.Light;
    public DateTimeOffset CreatedAt { get; set; }

    // MFA Properties
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }
    public string? MfaBackupCodesHash { get; set; }

    public ICollection<OrganizationMembership> Memberships { get; set; } = new List<OrganizationMembership>();
    public ICollection<ShareIssuance> ShareIssuances { get; set; } = new List<ShareIssuance>();
    public ICollection<ShareBalance> ShareBalances { get; set; } = new List<ShareBalance>();
    public ICollection<Vote> Votes { get; set; } = new List<Vote>();
    public ICollection<Proposal> CreatedProposals { get; set; } = new List<Proposal>();
    public ICollection<UserWalletAddress> WalletAddresses { get; set; } = new List<UserWalletAddress>();
}
