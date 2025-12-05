using FanEngagement.Application.Blockchain;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Blockchain;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace FanEngagement.Tests;

public class BlockchainAdapterFactoryTests : IClassFixture<TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public BlockchainAdapterFactoryTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetAdapterAsync_WithNoneBlockchainType_ReturnsNullAdapter()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            BlockchainType = BlockchainType.None,
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync();

        var factory = new BlockchainAdapterFactory(dbContext, httpClientFactory);

        // Act
        var adapter = await factory.GetAdapterAsync(organization.Id, CancellationToken.None);

        // Assert
        Assert.NotNull(adapter);
        Assert.IsType<NullBlockchainAdapter>(adapter);
    }

    [Fact]
    public async Task GetAdapterAsync_WithSolanaBlockchainType_ReturnsSolanaAdapter()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            BlockchainType = BlockchainType.Solana,
            BlockchainConfig = "{\"adapterUrl\":\"http://localhost:3001\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync();

        var factory = new BlockchainAdapterFactory(dbContext, httpClientFactory);

        // Act
        var adapter = await factory.GetAdapterAsync(organization.Id, CancellationToken.None);

        // Assert
        Assert.NotNull(adapter);
        Assert.IsType<SolanaAdapterClient>(adapter);
    }

    [Fact]
    public async Task GetAdapterAsync_WithPolygonBlockchainType_ReturnsPolygonAdapter()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        
        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = "Test Org",
            BlockchainType = BlockchainType.Polygon,
            BlockchainConfig = "{\"adapterUrl\":\"http://localhost:3002\"}",
            CreatedAt = DateTimeOffset.UtcNow
        };
        dbContext.Organizations.Add(organization);
        await dbContext.SaveChangesAsync();

        var factory = new BlockchainAdapterFactory(dbContext, httpClientFactory);

        // Act
        var adapter = await factory.GetAdapterAsync(organization.Id, CancellationToken.None);

        // Assert
        Assert.NotNull(adapter);
        Assert.IsType<PolygonAdapterClient>(adapter);
    }

    [Fact]
    public async Task GetAdapterAsync_WithNonExistentOrganization_ThrowsInvalidOperationException()
    {
        // Arrange
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<FanEngagementDbContext>();
        var httpClientFactory = scope.ServiceProvider.GetRequiredService<IHttpClientFactory>();
        
        var factory = new BlockchainAdapterFactory(dbContext, httpClientFactory);
        var nonExistentOrgId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await factory.GetAdapterAsync(nonExistentOrgId, CancellationToken.None));
    }
}
