using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class VoteConfiguration : IEntityTypeConfiguration<Vote>
{
    public void Configure(EntityTypeBuilder<Vote> builder)
    {
        builder.ToTable("Votes");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.VotingPower).HasColumnType("numeric(20,4)").IsRequired();
        builder.Property(x => x.CastAt).IsRequired();

        builder.HasIndex(x => new { x.ProposalId, x.UserId }).IsUnique();

        builder.HasOne(x => x.Proposal)
            .WithMany(p => p.Votes)
            .HasForeignKey(x => x.ProposalId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.ProposalOption)
            .WithMany(po => po.Votes)
            .HasForeignKey(x => x.ProposalOptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(u => u.Votes)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
