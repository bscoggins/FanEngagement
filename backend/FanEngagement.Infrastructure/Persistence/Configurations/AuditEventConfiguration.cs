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

        // Indexes for query performance (matching data model specification)
        
        // Primary access pattern: Date range queries (most common)
        builder.HasIndex(e => e.Timestamp)
            .IsDescending(true)
            .HasDatabaseName("IX_AuditEvents_Timestamp");

        // Composite index: OrganizationId + Timestamp (DESC), partial (OrganizationId IS NOT NULL)
        builder.HasIndex(e => new { e.OrganizationId, e.Timestamp })
            .IsDescending(false, true)
            .HasDatabaseName("IX_AuditEvents_OrganizationId_Timestamp")
            .HasFilter("\"OrganizationId\" IS NOT NULL");

        // Composite index: ActorUserId + Timestamp (DESC), partial (ActorUserId IS NOT NULL)
        builder.HasIndex(e => new { e.ActorUserId, e.Timestamp })
            .IsDescending(false, true)
            .HasDatabaseName("IX_AuditEvents_ActorUserId_Timestamp")
            .HasFilter("\"ActorUserId\" IS NOT NULL");

        // Composite index: ResourceType + ResourceId + Timestamp (DESC)
        builder.HasIndex(e => new { e.ResourceType, e.ResourceId, e.Timestamp })
            .IsDescending(false, false, true)
            .HasDatabaseName("IX_AuditEvents_ResourceType_ResourceId_Timestamp");

        // Composite index: ActionType + Timestamp (DESC)
        builder.HasIndex(e => new { e.ActionType, e.Timestamp })
            .IsDescending(false, true)
            .HasDatabaseName("IX_AuditEvents_ActionType_Timestamp");

        // Composite index: Outcome + Timestamp (DESC), partial (Failure or Denied only)
        builder.HasIndex(e => new { e.Outcome, e.Timestamp })
            .IsDescending(false, true)
            .HasDatabaseName("IX_AuditEvents_Outcome_Timestamp")
            .HasFilter("\"Outcome\" IN (2, 3)");

        // Partial index: CorrelationId (when not null)
        builder.HasIndex(e => e.CorrelationId)
            .HasDatabaseName("IX_AuditEvents_CorrelationId")
            .HasFilter("\"CorrelationId\" IS NOT NULL");
    }
}
