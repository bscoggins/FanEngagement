using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.ToTable("Organizations");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Description).HasMaxLength(2000);
        builder.Property(x => x.CreatedAt).IsRequired();
        
        // Branding configuration
        builder.Property(x => x.LogoUrl).HasMaxLength(2048);
        builder.Property(x => x.PrimaryColor).HasMaxLength(50);
        builder.Property(x => x.SecondaryColor).HasMaxLength(50);

        // Blockchain configuration
        builder.Property(x => x.BlockchainType)
            .IsRequired()
            .HasDefaultValue(BlockchainType.None)
            .HasConversion<string>()
            .HasMaxLength(50);
        builder.Property(x => x.BlockchainConfig)
            .HasColumnType("jsonb");
        builder.Property(x => x.BlockchainAccountAddress)
            .HasMaxLength(128);
    }
}
