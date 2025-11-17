using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class ShareBalanceConfiguration : IEntityTypeConfiguration<ShareBalance>
{
    public void Configure(EntityTypeBuilder<ShareBalance> builder)
    {
        builder.ToTable("ShareBalances");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Balance).HasColumnType("numeric(20,4)").IsRequired();
        builder.Property(x => x.UpdatedAt).IsRequired();

        builder.HasIndex(x => new { x.ShareTypeId, x.UserId }).IsUnique();

        builder.HasOne(x => x.ShareType)
            .WithMany(st => st.Balances)
            .HasForeignKey(x => x.ShareTypeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(x => x.User)
            .WithMany(u => u.ShareBalances)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
