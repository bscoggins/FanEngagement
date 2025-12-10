using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FanEngagement.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(x => x.Id);
        builder.Property(x => x.Email).IsRequired().HasMaxLength(256);
        builder.HasIndex(x => x.Email).IsUnique();

        builder.Property(x => x.DisplayName).IsRequired().HasMaxLength(128);
        builder.Property(x => x.PasswordHash).IsRequired().HasMaxLength(256);
        builder.Property(x => x.Role).IsRequired().HasConversion<int>();
        builder.Property(x => x.ThemePreference).IsRequired().HasConversion<int>();
        builder.Property(x => x.CreatedAt).IsRequired();
    }
}
