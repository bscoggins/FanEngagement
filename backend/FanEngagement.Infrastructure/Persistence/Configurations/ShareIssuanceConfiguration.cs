using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class ShareIssuanceConfiguration : IEntityTypeConfiguration<ShareIssuance>
{
    public void Configure(EntityTypeBuilder<ShareIssuance> builder)
    {
        builder.ToTable("ShareIssuances");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.Quantity).HasColumnType("numeric(20,4)").IsRequired();
        builder.Property(x => x.IssuedAt).IsRequired();

        builder.HasOne(x => x.ShareType)
            .WithMany(st => st.Issuances)
            .HasForeignKey(x => x.ShareTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(u => u.ShareIssuances)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
