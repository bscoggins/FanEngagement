using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class UserWalletAddressConfiguration : IEntityTypeConfiguration<UserWalletAddress>
{
    public void Configure(EntityTypeBuilder<UserWalletAddress> builder)
    {
        builder.ToTable("UserWalletAddresses");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.BlockchainType)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.Property(x => x.Address)
            .IsRequired()
            .HasMaxLength(128);
        builder.Property(x => x.Label)
            .HasMaxLength(100);
        builder.Property(x => x.IsPrimary)
            .HasDefaultValue(false);
        builder.Property(x => x.CreatedAt).IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired();

        builder.HasIndex(x => x.Address).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.BlockchainType });
        builder.HasIndex(x => new { x.UserId, x.BlockchainType })
            .HasFilter("\"IsPrimary\" = TRUE")
            .IsUnique()
            .HasDatabaseName("IX_UserWalletAddresses_User_Blockchain_Primary");

        builder.HasOne(x => x.User)
            .WithMany(u => u.WalletAddresses)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
