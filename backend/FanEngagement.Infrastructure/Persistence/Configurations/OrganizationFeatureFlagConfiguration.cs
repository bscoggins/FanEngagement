using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class OrganizationFeatureFlagConfiguration : IEntityTypeConfiguration<OrganizationFeatureFlag>
{
    public void Configure(EntityTypeBuilder<OrganizationFeatureFlag> builder)
    {
        builder.ToTable("OrganizationFeatureFlags");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Feature)
            .IsRequired()
            .HasConversion<string>()
            .HasMaxLength(100);

        builder.Property(x => x.IsEnabled)
            .IsRequired();

        builder.Property(x => x.EnabledAt);
        builder.Property(x => x.EnabledByUserId);

        builder.HasIndex(x => new { x.OrganizationId, x.Feature })
            .IsUnique();

        builder.HasOne(x => x.Organization)
            .WithMany(o => o.FeatureFlags)
            .HasForeignKey(x => x.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
