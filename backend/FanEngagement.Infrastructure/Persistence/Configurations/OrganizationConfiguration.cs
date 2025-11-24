using FanEngagement.Domain.Entities;
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
    }
}
