using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class WebhookEndpointConfiguration : IEntityTypeConfiguration<WebhookEndpoint>
{
    public void Configure(EntityTypeBuilder<WebhookEndpoint> builder)
    {
        builder.ToTable("WebhookEndpoints");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Url).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.EncryptedSecret).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.SubscribedEvents).IsRequired().HasMaxLength(1000);
        builder.Property(x => x.IsActive).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasOne(x => x.Organization)
            .WithMany(o => o.WebhookEndpoints)
            .HasForeignKey(x => x.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
