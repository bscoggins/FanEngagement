using FanEngagement.Application.ShareIssuances;
using FanEngagement.Domain.Entities;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Infrastructure.Services;

public class ShareIssuanceService(FanEngagementDbContext dbContext) : IShareIssuanceService
{
    public async Task<ShareIssuanceDto> CreateAsync(Guid organizationId, CreateShareIssuanceRequest request, CancellationToken cancellationToken = default)
    {
        // Validate quantity
        if (request.Quantity <= 0)
        {
            throw new InvalidOperationException("Quantity must be positive");
        }

        // Validate ShareType exists and belongs to organization
        var shareType = await dbContext.ShareTypes
            .FirstOrDefaultAsync(st => st.Id == request.ShareTypeId && st.OrganizationId == organizationId, cancellationToken);

        if (shareType is null)
        {
            throw new InvalidOperationException($"ShareType {request.ShareTypeId} not found in organization {organizationId}");
        }

        // Validate User exists
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
        {
            throw new InvalidOperationException($"User {request.UserId} not found");
        }

        // Check if user is member of organization
        var membership = await dbContext.OrganizationMemberships
            .FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == request.UserId, cancellationToken);

        if (membership is null)
        {
            throw new InvalidOperationException($"User {request.UserId} is not a member of organization {organizationId}");
        }

        // Use transaction for relational databases to prevent race conditions
        // In-memory database doesn't support transactions but automatically handles atomicity
        var isInMemory = dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemory ? null : await dbContext.Database.BeginTransactionAsync(cancellationToken);
        
        try
        {
            // Check MaxSupply constraint
            if (shareType.MaxSupply.HasValue)
            {
                var totalIssued = await dbContext.ShareIssuances
                    .Where(si => si.ShareTypeId == request.ShareTypeId)
                    .SumAsync(si => si.Quantity, cancellationToken);

                if (totalIssued + request.Quantity > shareType.MaxSupply.Value)
                {
                    throw new InvalidOperationException($"Issuance would exceed MaxSupply of {shareType.MaxSupply.Value} for ShareType {shareType.Name}");
                }
            }

            // Create issuance
            var issuance = new ShareIssuance
            {
                Id = Guid.NewGuid(),
                ShareTypeId = request.ShareTypeId,
                UserId = request.UserId,
                Quantity = request.Quantity,
                IssuedAt = DateTimeOffset.UtcNow
            };

            dbContext.ShareIssuances.Add(issuance);

            // Update or create ShareBalance
            var balance = await dbContext.ShareBalances
                .FirstOrDefaultAsync(sb => sb.ShareTypeId == request.ShareTypeId && sb.UserId == request.UserId, cancellationToken);

            if (balance is null)
            {
                balance = new ShareBalance
                {
                    Id = Guid.NewGuid(),
                    ShareTypeId = request.ShareTypeId,
                    UserId = request.UserId,
                    Balance = request.Quantity,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                dbContext.ShareBalances.Add(balance);
            }
            else
            {
                balance.Balance += request.Quantity;
                balance.UpdatedAt = DateTimeOffset.UtcNow;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            
            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            return new ShareIssuanceDto
            {
                Id = issuance.Id,
                ShareTypeId = issuance.ShareTypeId,
                UserId = issuance.UserId,
                Quantity = issuance.Quantity,
                IssuedAt = issuance.IssuedAt
            };
        }
        catch
        {
            if (transaction != null)
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            throw;
        }
        finally
        {
            transaction?.Dispose();
        }
    }

    public async Task<IReadOnlyList<ShareIssuanceDto>> GetByOrganizationAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        var issuances = await dbContext.ShareIssuances
            .AsNoTracking()
            .Join(
                dbContext.ShareTypes,
                si => si.ShareTypeId,
                st => st.Id,
                (si, st) => new { si, st }
            )
            .Where(x => x.st.OrganizationId == organizationId)
            .OrderByDescending(x => x.si.IssuedAt)
            .Select(x => new ShareIssuanceDto
            {
                Id = x.si.Id,
                ShareTypeId = x.si.ShareTypeId,
                UserId = x.si.UserId,
                Quantity = x.si.Quantity,
                IssuedAt = x.si.IssuedAt
            })
            .ToListAsync(cancellationToken);

        return issuances;
    }

    public async Task<IReadOnlyList<ShareIssuanceDto>> GetByUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var issuances = await dbContext.ShareIssuances
            .AsNoTracking()
            .Join(
                dbContext.ShareTypes,
                si => si.ShareTypeId,
                st => st.Id,
                (si, st) => new { si, st }
            )
            .Where(x => x.si.UserId == userId && x.st.OrganizationId == organizationId)
            .OrderByDescending(x => x.si.IssuedAt)
            .Select(x => new ShareIssuanceDto
            {
                Id = x.si.Id,
                ShareTypeId = x.si.ShareTypeId,
                UserId = x.si.UserId,
                Quantity = x.si.Quantity,
                IssuedAt = x.si.IssuedAt
            })
            .ToListAsync(cancellationToken);

        return issuances;
    }

    public async Task<IReadOnlyList<ShareBalanceDto>> GetBalancesByUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var balances = await dbContext.ShareBalances
            .AsNoTracking()
            .Include(sb => sb.ShareType)
            .Where(sb => sb.UserId == userId && sb.ShareType!.OrganizationId == organizationId)
            .OrderBy(sb => sb.ShareType!.Name)
            .Select(sb => new ShareBalanceDto
            {
                ShareTypeId = sb.ShareTypeId,
                ShareTypeName = sb.ShareType!.Name,
                ShareTypeSymbol = sb.ShareType!.Symbol,
                Balance = sb.Balance,
                UpdatedAt = sb.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return balances;
    }
}
