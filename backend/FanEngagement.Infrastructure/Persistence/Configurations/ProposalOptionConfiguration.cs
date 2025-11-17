using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class ProposalOptionConfiguration : IEntityTypeConfiguration<ProposalOption>
{
    public void Configure(EntityTypeBuilder<ProposalOption> builder)
    {
        builder.ToTable("ProposalOptions");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Text).IsRequired().HasMaxLength(500);
        builder.Property(x => x.Description).HasMaxLength(2000);

        builder.HasOne(x => x.Proposal)
            .WithMany(p => p.Options)
            .HasForeignKey(x => x.ProposalId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
