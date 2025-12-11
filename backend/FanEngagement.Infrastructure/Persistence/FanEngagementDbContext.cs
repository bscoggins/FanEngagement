using FanEngagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Persistence;

public class FanEngagementDbContext(DbContextOptions<FanEngagementDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMembership> OrganizationMemberships => Set<OrganizationMembership>();
    public DbSet<ShareType> ShareTypes => Set<ShareType>();
    public DbSet<ShareIssuance> ShareIssuances => Set<ShareIssuance>();
    public DbSet<ShareBalance> ShareBalances => Set<ShareBalance>();
    public DbSet<Proposal> Proposals => Set<Proposal>();
    public DbSet<ProposalOption> ProposalOptions => Set<ProposalOption>();
    public DbSet<Vote> Votes => Set<Vote>();
    public DbSet<UserWalletAddress> UserWalletAddresses => Set<UserWalletAddress>();
    public DbSet<WebhookEndpoint> WebhookEndpoints => Set<WebhookEndpoint>();
    public DbSet<OutboundEvent> OutboundEvents => Set<OutboundEvent>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(FanEngagementDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
