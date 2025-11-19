using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class OutboundEventConfiguration : IEntityTypeConfiguration<OutboundEvent>
{
    public void Configure(EntityTypeBuilder<OutboundEvent> builder)
    {
        builder.ToTable("OutboundEvents");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.EventType).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Payload).IsRequired();
        builder.Property(x => x.Status).IsRequired();
        builder.Property(x => x.AttemptCount).IsRequired();
        builder.Property(x => x.LastAttemptAt);
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasOne(x => x.Organization)
            .WithMany(o => o.OutboundEvents)
            .HasForeignKey(x => x.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.WebhookEndpoint)
            .WithMany(wh => wh.OutboundEvents)
            .HasForeignKey(x => x.WebhookEndpointId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(x => new { x.OrganizationId, x.Status, x.CreatedAt });
    }
}
