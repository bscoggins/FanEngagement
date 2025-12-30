using FanEngagement.Application.Audit;
using FanEngagement.Application.Blockchain;
using FanEngagement.Application.Exceptions;
using FanEngagement.Application.FeatureFlags;
using FanEngagement.Application.ShareIssuances;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FanEngagement.Infrastructure.Services;

public class ShareIssuanceService(
    FanEngagementDbContext dbContext,
    IAuditService auditService,
    ILogger<ShareIssuanceService> logger,
    IBlockchainAdapterFactory blockchainAdapterFactory,
    IFeatureFlagService featureFlagService) : IShareIssuanceService
{
    public async Task<ShareIssuanceDto> CreateAsync(Guid organizationId, CreateShareIssuanceRequest request, Guid actorUserId, string actorDisplayName, CancellationToken cancellationToken = default)
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

        // Get organization for audit context and blockchain behavior
        var organization = await dbContext.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == organizationId, cancellationToken)
            ?? throw new InvalidOperationException($"Organization with ID {organizationId} not found.");

        // Use transaction for relational databases to prevent race conditions
        // In-memory database doesn't support transactions but automatically handles atomicity
        var isInMemory = dbContext.Database.ProviderName == "Microsoft.EntityFrameworkCore.InMemory";
        var transaction = isInMemory ? null : await dbContext.Database.BeginTransactionAsync(cancellationToken);
        string? blockchainChainId = null;
        string? blockchainExplorerUrl = null;
        
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
                IssuedAt = DateTimeOffset.UtcNow,
                IssuedByUserId = actorUserId,
                Reason = request.Reason
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

            if (organization.BlockchainType != BlockchainType.None)
            {
                var blockchainEnabled = await featureFlagService.IsEnabledAsync(organizationId, OrganizationFeature.BlockchainIntegration, cancellationToken);
                if (blockchainEnabled)
                {
                    if (string.IsNullOrWhiteSpace(shareType.BlockchainMintAddress))
                    {
                        throw new InvalidOperationException("Share type does not have a blockchain mint address configured.");
                    }

                    var adapter = await blockchainAdapterFactory.GetAdapterAsync(organizationId, cancellationToken);
                    var recipientWalletAddress = await GetPrimaryWalletAddressAsync(request.UserId, organizationId, organization.BlockchainType, cancellationToken);

                    var onChainResult = await adapter.RecordShareIssuanceAsync(
                        new RecordShareIssuanceCommand(
                            issuance.Id,
                            shareType.BlockchainMintAddress,
                            request.UserId,
                            issuance.Quantity,
                            recipientWalletAddress,
                            actorUserId,
                            request.Reason),
                        cancellationToken);

                    issuance.BlockchainTransactionId = onChainResult.TransactionId;
                    blockchainChainId = onChainResult.ChainId;
                    blockchainExplorerUrl = onChainResult.ExplorerUrl;
                    await dbContext.SaveChangesAsync(cancellationToken);

                    logger.LogInformation(
                        "Share issuance {IssuanceId} recorded on {Blockchain} with transaction {TransactionId}",
                        issuance.Id,
                        organization.BlockchainType,
                        onChainResult.TransactionId);
                }
                else
                {
                    logger.LogInformation(
                        "Share issuance {IssuanceId} for organization {OrganizationId} skipped on-chain recording because BlockchainIntegration feature flag is disabled",
                        issuance.Id,
                        organizationId);
                }
            }

            if (transaction != null)
            {
                await transaction.CommitAsync(cancellationToken);
            }

            // Audit after successful commit
            try
            {
                var totalVotingPowerAdded = request.Quantity * shareType.VotingWeight;

                await auditService.LogAsync(
                    new AuditEventBuilder()
                        .WithActor(actorUserId, actorDisplayName)
                        .WithAction(AuditActionType.Created)
                        .WithResource(AuditResourceType.ShareIssuance, issuance.Id)
                        .WithOrganization(organizationId, organization?.Name)
                        .WithDetails(new
                        {
                            RecipientUserId = user.Id,
                            RecipientName = user.DisplayName,
                            RecipientEmail = user.Email,
                            ShareTypeId = shareType.Id,
                            ShareTypeName = shareType.Name,
                            ShareTypeSymbol = shareType.Symbol,
                            Quantity = request.Quantity,
                            VotingWeightPerShare = shareType.VotingWeight,
                            TotalVotingPowerAdded = totalVotingPowerAdded,
                            IssuerId = actorUserId,
                            IssuerName = actorDisplayName
                        })
                        .AsSuccess(),
                    cancellationToken);
            }
            catch (Exception ex)
            {
                // Audit failures should not fail issuance operations
                logger.LogWarning(ex, "Failed to audit share issuance for {IssuanceId} in organization {OrganizationId}", issuance.Id, organizationId);
            }

            // Get user display name for response
            var userDisplayName = await dbContext.Users
                .Where(u => u.Id == request.UserId)
                .Select(u => u.DisplayName)
                .FirstOrDefaultAsync(cancellationToken) ?? "Unknown User";

            return new ShareIssuanceDto
            {
                Id = issuance.Id,
                ShareTypeId = issuance.ShareTypeId,
                ShareTypeName = shareType.Name,
                ShareTypeSymbol = shareType.Symbol,
                UserId = issuance.UserId,
                UserDisplayName = userDisplayName,
                Quantity = issuance.Quantity,
                IssuedAt = issuance.IssuedAt,
                IssuedByUserId = issuance.IssuedByUserId,
                IssuedByUserDisplayName = actorDisplayName,
                Reason = issuance.Reason,
                BlockchainTransactionId = issuance.BlockchainTransactionId,
                BlockchainChainId = blockchainChainId,
                BlockchainExplorerUrl = blockchainExplorerUrl
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
            .Include(si => si.ShareType)
            .Include(si => si.User)
            .Where(si => si.ShareType!.OrganizationId == organizationId)
            .OrderByDescending(si => si.IssuedAt)
            .Select(si => new 
            {
                si,
                ShareTypeName = si.ShareType!.Name,
                ShareTypeSymbol = si.ShareType!.Symbol,
                UserDisplayName = si.User!.DisplayName,
                IssuedByUserDisplayName = dbContext.Users
                    .Where(u => u.Id == si.IssuedByUserId)
                    .Select(u => u.DisplayName)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return issuances.Select(x => new ShareIssuanceDto
        {
            Id = x.si.Id,
            ShareTypeId = x.si.ShareTypeId,
            ShareTypeName = x.ShareTypeName,
            ShareTypeSymbol = x.ShareTypeSymbol,
            UserId = x.si.UserId,
            UserDisplayName = x.UserDisplayName,
            Quantity = x.si.Quantity,
            IssuedAt = x.si.IssuedAt,
            IssuedByUserId = x.si.IssuedByUserId,
            IssuedByUserDisplayName = x.IssuedByUserDisplayName ?? "System",
            Reason = x.si.Reason,
            BlockchainTransactionId = x.si.BlockchainTransactionId
        }).ToList();
    }

    public async Task<IReadOnlyList<ShareIssuanceDto>> GetByUserAsync(Guid organizationId, Guid userId, CancellationToken cancellationToken = default)
    {
        var issuances = await dbContext.ShareIssuances
            .AsNoTracking()
            .Include(si => si.ShareType)
            .Include(si => si.User)
            .Where(si => si.UserId == userId && si.ShareType!.OrganizationId == organizationId)
            .OrderByDescending(si => si.IssuedAt)
            .Select(si => new 
            {
                si,
                ShareTypeName = si.ShareType!.Name,
                ShareTypeSymbol = si.ShareType!.Symbol,
                UserDisplayName = si.User!.DisplayName,
                IssuedByUserDisplayName = dbContext.Users
                    .Where(u => u.Id == si.IssuedByUserId)
                    .Select(u => u.DisplayName)
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        return issuances.Select(x => new ShareIssuanceDto
        {
            Id = x.si.Id,
            ShareTypeId = x.si.ShareTypeId,
            ShareTypeName = x.ShareTypeName,
            ShareTypeSymbol = x.ShareTypeSymbol,
            UserId = x.si.UserId,
            UserDisplayName = x.UserDisplayName,
            Quantity = x.si.Quantity,
            IssuedAt = x.si.IssuedAt,
            IssuedByUserId = x.si.IssuedByUserId,
            IssuedByUserDisplayName = x.IssuedByUserDisplayName ?? "System",
            Reason = x.si.Reason,
            BlockchainTransactionId = x.si.BlockchainTransactionId
        }).ToList();
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

    private async Task<string> GetPrimaryWalletAddressAsync(Guid userId, Guid organizationId, BlockchainType blockchainType, CancellationToken cancellationToken)
    {
        var address = await dbContext.UserWalletAddresses
            .AsNoTracking()
            .Where(w => w.UserId == userId && w.BlockchainType == blockchainType && w.IsPrimary)
            .Select(w => w.Address)
            .FirstOrDefaultAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(address))
        {
            return address;
        }

        // If no address found, create one automatically (Custodial Wallet)
        try 
        {
            var adapter = await blockchainAdapterFactory.GetAdapterAsync(organizationId, cancellationToken);
            var walletResult = await adapter.CreateWalletAsync(cancellationToken);
            
            var newWallet = new UserWalletAddress
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                BlockchainType = blockchainType,
                Address = walletResult.Address,
                EncryptedPrivateKey = walletResult.PrivateKey, // Storing as-is for now (demo), should be encrypted
                IsPrimary = true,
                Label = "Default Custodial Wallet",
                CreatedAt = DateTimeOffset.UtcNow
            };

            // We need a new context or transaction scope if we are inside another transaction?
            // The caller (CreateAsync) already has a transaction. We can just add to the context.
            // However, CreateAsync uses 'transaction' variable.
            // Let's just add to dbContext.
            
            dbContext.UserWalletAddresses.Add(newWallet);
            await dbContext.SaveChangesAsync(cancellationToken);
            
            return newWallet.Address;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to auto-create wallet for user {UserId}", userId);
            throw new WalletAddressNotFoundException(userId, blockchainType.ToString());
        }
    }
}
