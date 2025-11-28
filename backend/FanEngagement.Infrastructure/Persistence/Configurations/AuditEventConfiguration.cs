using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("AuditEvents");

        builder.HasKey(e => e.Id);

        builder.Property(e => e.Timestamp)
            .IsRequired();

        builder.Property(e => e.ActorDisplayName)
            .HasMaxLength(200);

        builder.Property(e => e.ActorIpAddress)
            .HasMaxLength(45);

        builder.Property(e => e.ActionType)
            .IsRequired();

        builder.Property(e => e.Outcome)
            .IsRequired();

        builder.Property(e => e.FailureReason)
            .HasMaxLength(1000);

        builder.Property(e => e.ResourceType)
            .IsRequired();

        builder.Property(e => e.ResourceId)
            .IsRequired();

        builder.Property(e => e.ResourceName)
            .HasMaxLength(500);

        builder.Property(e => e.OrganizationName)
            .HasMaxLength(200);

        builder.Property(e => e.Details)
            .HasColumnType("jsonb");

        builder.Property(e => e.CorrelationId)
            .HasMaxLength(100);

        // Indexes for query performance
        builder.HasIndex(e => e.Timestamp)
            .IsDescending();

        builder.HasIndex(e => e.OrganizationId);

        builder.HasIndex(e => e.ActorUserId);

        builder.HasIndex(e => new { e.ResourceType, e.ResourceId });

        builder.HasIndex(e => e.ActionType);
    }
}
