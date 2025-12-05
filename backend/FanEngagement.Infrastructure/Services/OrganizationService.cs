using FanEngagement.Application.Audit;
using FanEngagement.Application.Common;
using FanEngagement.Application.Organizations;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class OrganizationService(FanEngagementDbContext dbContext, IAuditService auditService, ILogger<OrganizationService> logger) : IOrganizationService
{
    public async Task<Organization> CreateAsync(CreateOrganizationRequest request, Guid creatorUserId, CancellationToken cancellationToken = default)
    {
        // Validate that the creator user exists
        var userExists = await dbContext.Users
            .AsNoTracking()
            .AnyAsync(u => u.Id == creatorUserId, cancellationToken);

        if (!userExists)
        {
            throw new InvalidOperationException($"User {creatorUserId} not found");
        }

        var organization = new Organization
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl,
            PrimaryColor = string.IsNullOrWhiteSpace(request.PrimaryColor) ? null : request.PrimaryColor,
            SecondaryColor = string.IsNullOrWhiteSpace(request.SecondaryColor) ? null : request.SecondaryColor,
            BlockchainType = request.BlockchainType ?? Domain.Enums.BlockchainType.None,
            BlockchainConfig = string.IsNullOrWhiteSpace(request.BlockchainConfig) ? null : request.BlockchainConfig,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Organizations.Add(organization);

        // Automatically create OrgAdmin membership for the creator
        var membership = new OrganizationMembership
        {
            Id = Guid.NewGuid(),
            OrganizationId = organization.Id,
            UserId = creatorUserId,
            Role = OrganizationRole.OrgAdmin,
            CreatedAt = DateTimeOffset.UtcNow
        };

        dbContext.OrganizationMemberships.Add(membership);

        // Save both in a single transaction
        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful commit
        try
        {
            await auditService.LogAsync(
                new AuditEventBuilder()
                    .WithAction(AuditActionType.Created)
                    .WithResource(AuditResourceType.Organization, organization.Id, organization.Name)
                    .WithOrganization(organization.Id, organization.Name)
                    .WithActor(creatorUserId, string.Empty) // TODO: DisplayName not available here; consider fetching from User entity if needed for completeness
                    .WithDetails(new
                    {
                        organization.Name,
                        organization.Description,
                        creatorUserId,
                        branding = new
                        {
                            organization.LogoUrl,
                            organization.PrimaryColor,
                            organization.SecondaryColor
                        }
                    })
                    .AsSuccess(),
                cancellationToken);
        }
        catch (Exception ex)
        {
            // Audit failures should not fail organization operations
            logger.LogWarning(ex, "Failed to audit organization creation for {OrganizationId}", organization.Id);
        }

        return organization;
    }

    public async Task<IReadOnlyList<Organization>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var organizations = await dbContext.Organizations
            .AsNoTracking()
            .OrderBy(o => o.Name)
            .ToListAsync(cancellationToken);

        return organizations;
    }

    public async Task<PagedResult<Organization>> GetAllAsync(int page, int pageSize, string? search = null, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Organizations.AsNoTracking();

        // Apply search filter if provided (case-insensitive using EF.Functions.Like with LOWER)
        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchPattern = $"%{search}%";
            query = query.Where(o => EF.Functions.Like(o.Name.ToLower(), searchPattern.ToLower()));
        }

        // Get total count
        var totalCount = await query.CountAsync(cancellationToken);

        // Apply pagination
        var organizations = await query
            .OrderBy(o => o.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<Organization>
        {
            Items = organizations,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<Organization?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        return await dbContext.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
    }

    public async Task<Organization?> UpdateAsync(Guid id, UpdateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        var organization = await dbContext.Organizations.FirstOrDefaultAsync(o => o.Id == id, cancellationToken);
        
        if (organization == null)
        {
            return null;
        }

        // Capture original values for audit
        var originalName = organization.Name;
        var originalDescription = organization.Description;
        var originalLogoUrl = organization.LogoUrl;
        var originalPrimaryColor = organization.PrimaryColor;
        var originalSecondaryColor = organization.SecondaryColor;
        var originalBlockchainType = organization.BlockchainType;
        var originalBlockchainConfig = organization.BlockchainConfig;

        // Validate blockchain type change
        if (request.BlockchainType.HasValue && request.BlockchainType.Value != originalBlockchainType)
        {
            // Check if organization has any shares or proposals
            var hasShareTypes = await dbContext.ShareTypes
                .AnyAsync(st => st.OrganizationId == id, cancellationToken);
            var hasProposals = await dbContext.Proposals
                .AnyAsync(p => p.OrganizationId == id, cancellationToken);

            if (hasShareTypes || hasProposals)
            {
                throw new InvalidOperationException("Cannot change blockchain type after shares or proposals have been created");
            }
        }

        organization.Name = request.Name;
        organization.Description = request.Description;
        organization.LogoUrl = string.IsNullOrWhiteSpace(request.LogoUrl) ? null : request.LogoUrl;
        organization.PrimaryColor = string.IsNullOrWhiteSpace(request.PrimaryColor) ? null : request.PrimaryColor;
        organization.SecondaryColor = string.IsNullOrWhiteSpace(request.SecondaryColor) ? null : request.SecondaryColor;
        
        if (request.BlockchainType.HasValue)
        {
            organization.BlockchainType = request.BlockchainType.Value;
        }
        
        if (request.BlockchainConfig != null)
        {
            organization.BlockchainConfig = string.IsNullOrWhiteSpace(request.BlockchainConfig) ? null : request.BlockchainConfig;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        // Audit after successful update
        var changedFields = new List<string>();
        var details = new Dictionary<string, object>();
        var brandingChanged = false;

        if (originalName != organization.Name)
        {
            changedFields.Add("Name");
            details["oldName"] = originalName;
            details["newName"] = organization.Name;
        }

        if (originalDescription != organization.Description)
        {
            changedFields.Add("Description");
            details["oldDescription"] = originalDescription ?? string.Empty;
            details["newDescription"] = organization.Description ?? string.Empty;
        }

        if (originalLogoUrl != organization.LogoUrl)
        {
            changedFields.Add("LogoUrl");
            details["oldLogoUrl"] = originalLogoUrl ?? string.Empty;
            details["newLogoUrl"] = organization.LogoUrl ?? string.Empty;
            brandingChanged = true;
        }

        if (originalPrimaryColor != organization.PrimaryColor)
        {
            changedFields.Add("PrimaryColor");
            details["oldPrimaryColor"] = originalPrimaryColor ?? string.Empty;
            details["newPrimaryColor"] = organization.PrimaryColor ?? string.Empty;
            brandingChanged = true;
        }

        if (originalSecondaryColor != organization.SecondaryColor)
        {
            changedFields.Add("SecondaryColor");
            details["oldSecondaryColor"] = originalSecondaryColor ?? string.Empty;
            details["newSecondaryColor"] = organization.SecondaryColor ?? string.Empty;
            brandingChanged = true;
        }

        if (originalBlockchainType != organization.BlockchainType)
        {
            changedFields.Add("BlockchainType");
            details["oldBlockchainType"] = originalBlockchainType.ToString();
            details["newBlockchainType"] = organization.BlockchainType.ToString();
        }

        if (originalBlockchainConfig != organization.BlockchainConfig)
        {
            changedFields.Add("BlockchainConfig");
            details["blockchainConfigChanged"] = true;
        }

        // Log audit event if any changes were made
        if (changedFields.Count > 0)
        {
            details["changedFields"] = changedFields;
            details["brandingChanged"] = brandingChanged;

            try
            {
                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithAction(AuditActionType.Updated)
                        .WithResource(AuditResourceType.Organization, organization.Id, organization.Name)
                        .WithOrganization(organization.Id, organization.Name)
                        .WithDetails(details)
                        .AsSuccess(),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Audit failures should not fail organization operations
                logger.LogWarning(ex, "Failed to audit organization update for {OrganizationId}", organization.Id);
            }
        }

        return organization;
    }
}
