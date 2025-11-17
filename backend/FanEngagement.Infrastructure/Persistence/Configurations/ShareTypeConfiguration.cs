using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class ShareTypeConfiguration : IEntityTypeConfiguration<ShareType>
{
    public void Configure(EntityTypeBuilder<ShareType> builder)
    {
        builder.ToTable("ShareTypes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Name).IsRequired().HasMaxLength(200);
        builder.Property(x => x.Symbol).IsRequired().HasMaxLength(32);
        builder.Property(x => x.Description).HasMaxLength(1000);
        builder.Property(x => x.VotingWeight).HasColumnType("numeric(20,4)").IsRequired();
        builder.Property(x => x.MaxSupply).HasColumnType("numeric(20,4)");
        builder.Property(x => x.IsTransferable).IsRequired();
        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasIndex(x => new { x.OrganizationId, x.Symbol }).IsUnique();

        builder.HasOne(x => x.Organization)
            .WithMany(o => o.ShareTypes)
            .HasForeignKey(x => x.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
