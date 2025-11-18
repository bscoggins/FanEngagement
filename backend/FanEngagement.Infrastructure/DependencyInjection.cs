using FanEngagement.Application.Memberships;
using FanEngagement.Application.Organizations;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Application.ShareTypes;
using FanEngagement.Application.Users;
using FanEngagement.Infrastructure.Persistence;
using FanEngagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FanEngagement.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<FanEngagementDbContext>(options =>
        {
            options.UseNpgsql(connectionString);
        });

        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IShareTypeService, ShareTypeService>();
        services.AddScoped<IShareIssuanceService, ShareIssuanceService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IMembershipService, MembershipService>();

        return services;
    }
}
