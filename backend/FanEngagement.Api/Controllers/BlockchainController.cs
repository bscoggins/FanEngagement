using FanEngagement.Application.Blockchain;
using FanEngagement.Application.Common;
using FanEngagement.Domain.Entities;
using FanEngagement.Domain.Enums;
using FanEngagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FanEngagement.Api.Controllers;

[ApiController]
[Route("admin/blockchain")]
[Authorize(Policy = "GlobalAdmin")]
public class BlockchainController(
    FanEngagementDbContext dbContext,
    IBlockchainAdapterFactory blockchainAdapterFactory) : ControllerBase
{
    [HttpGet("transactions")]
    public async Task<ActionResult<PagedResult<BlockchainRecordDto>>> GetTransactions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? organizationId = null,
        [FromQuery] string? type = null,
        CancellationToken cancellationToken = default)
    {
        var records = new List<BlockchainRecordDto>();

        // 1. Organizations
        if (string.IsNullOrEmpty(type) || type.Equals("Organization", StringComparison.OrdinalIgnoreCase))
        {
            var query = dbContext.Organizations.AsNoTracking()
                .Where(o => o.BlockchainType != BlockchainType.None && o.BlockchainAccountAddress != null);
            
            if (organizationId.HasValue)
            {
                query = query.Where(o => o.Id == organizationId.Value);
            }

            var orgs = await query.ToListAsync(cancellationToken);
            records.AddRange(orgs.Select(o => new BlockchainRecordDto
            {
                EntityId = o.Id,
                OrganizationId = o.Id,
                OrganizationName = o.Name,
                EntityType = "Organization",
                EntityName = o.Name,
                TransactionId = null, // We store Account Address, not Transaction ID for Org
                OnChainAddress = o.BlockchainAccountAddress,
                Timestamp = o.CreatedAt,
                Status = "Recorded"
            }));
        }

        // 2. Proposals
        if (string.IsNullOrEmpty(type) || type.Equals("Proposal", StringComparison.OrdinalIgnoreCase))
        {
            var query = dbContext.Proposals.AsNoTracking()
                .Include(p => p.Organization) // To get Org Name
                .Where(p => p.BlockchainProposalAddress != null);

            if (organizationId.HasValue)
            {
                query = query.Where(p => p.OrganizationId == organizationId.Value);
            }

            var proposals = await query.ToListAsync(cancellationToken);
            records.AddRange(proposals.Select(p => new BlockchainRecordDto
            {
                EntityId = p.Id,
                OrganizationId = p.OrganizationId,
                OrganizationName = p.Organization?.Name ?? "Unknown",
                EntityType = "Proposal",
                EntityName = p.Title,
                TransactionId = null, // We store Proposal Address
                OnChainAddress = p.BlockchainProposalAddress,
                Timestamp = p.CreatedAt,
                Status = "Recorded"
            }));
        }

        // 3. Votes
        if (string.IsNullOrEmpty(type) || type.Equals("Vote", StringComparison.OrdinalIgnoreCase))
        {
            var query = dbContext.Votes.AsNoTracking()
                .Include(v => v.Proposal)
                .ThenInclude(p => p!.Organization)
                .Where(v => v.BlockchainTransactionId != null);

            if (organizationId.HasValue)
            {
                query = query.Where(v => v.Proposal!.OrganizationId == organizationId.Value);
            }

            // Limit votes fetch because there could be many
            // Ideally we should do pagination at DB level, but unioning different types makes it hard.
            // For now, we fetch a reasonable amount if filtering by type, or rely on in-memory pagination (not ideal for large datasets).
            // Given this is an admin tool, maybe acceptable for MVP.
            
            var votes = await query.OrderByDescending(v => v.CastAt).Take(500).ToListAsync(cancellationToken);
            records.AddRange(votes.Select(v => new BlockchainRecordDto
            {
                EntityId = v.Id,
                OrganizationId = v.Proposal!.OrganizationId,
                OrganizationName = v.Proposal.Organization?.Name ?? "Unknown",
                EntityType = "Vote",
                EntityName = $"Vote on {v.Proposal.Title}",
                TransactionId = v.BlockchainTransactionId,
                OnChainAddress = null,
                Timestamp = v.CastAt,
                Status = "Recorded"
            }));
        }

        // 4. Share Issuances
        if (string.IsNullOrEmpty(type) || type.Equals("ShareIssuance", StringComparison.OrdinalIgnoreCase))
        {
            var query = dbContext.ShareIssuances.AsNoTracking()
                .Include(si => si.ShareType)
                .ThenInclude(st => st!.Organization)
                .Where(si => si.BlockchainTransactionId != null);

            if (organizationId.HasValue)
            {
                query = query.Where(si => si.ShareType!.OrganizationId == organizationId.Value);
            }

            var issuances = await query.OrderByDescending(si => si.IssuedAt).Take(500).ToListAsync(cancellationToken);
            records.AddRange(issuances.Select(si => new BlockchainRecordDto
            {
                EntityId = si.Id,
                OrganizationId = si.ShareType!.OrganizationId,
                OrganizationName = si.ShareType.Organization?.Name ?? "Unknown",
                EntityType = "ShareIssuance",
                EntityName = $"Issuance of {si.Quantity} {si.ShareType.Symbol}",
                TransactionId = si.BlockchainTransactionId,
                OnChainAddress = null,
                Timestamp = si.IssuedAt,
                Status = "Recorded"
            }));
        }

        // Sort and Paginate in memory
        var totalCount = records.Count;
        var pagedRecords = records
            .OrderByDescending(r => r.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<BlockchainRecordDto>
        {
            Items = pagedRecords,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    [HttpGet("verify/{entityType}/{entityId}")]
    public async Task<ActionResult<BlockchainVerificationDto>> VerifyRecord(string entityType, Guid entityId, CancellationToken cancellationToken)
    {
        // Fetch the entity from the database
        object? dbEntity = null;
        string? transactionId = null;
        string? onChainAddress = null;
        Guid? targetOrganizationId = null;

        switch (entityType)
        {
            case "Organization":
                var org = await dbContext.Organizations.FindAsync([entityId], cancellationToken);
                if (org != null)
                {
                    // Find the creator from audit logs
                    var creationEvent = await dbContext.AuditEvents
                        .Where(e => e.ResourceType == AuditResourceType.Organization && 
                                    e.ResourceId == entityId && 
                                    e.ActionType == AuditActionType.Created)
                        .OrderBy(e => e.Timestamp)
                        .FirstOrDefaultAsync(cancellationToken);

                    var createdBy = creationEvent?.ActorDisplayName ?? "Unknown";

                    dbEntity = new { org.Name, org.BlockchainAccountAddress, CreatedBy = createdBy };
                    onChainAddress = org.BlockchainAccountAddress;
                    targetOrganizationId = org.Id;
                }
                break;
            case "Proposal":
                var proposal = await dbContext.Proposals.FindAsync([entityId], cancellationToken);
                if (proposal != null)
                {
                    dbEntity = new { proposal.Title, proposal.BlockchainProposalAddress };
                    onChainAddress = proposal.BlockchainProposalAddress;
                    targetOrganizationId = proposal.OrganizationId;
                }
                break;
            case "Vote":
                var vote = await dbContext.Votes
                    .Include(v => v.User)
                    .Include(v => v.ProposalOption)
                    .Include(v => v.Proposal)
                    .FirstOrDefaultAsync(v => v.Id == entityId, cancellationToken);

                if (vote != null)
                {
                    dbEntity = new 
                    { 
                        vote.ProposalOptionId, 
                        Option = vote.ProposalOption?.Text ?? "Unknown",
                        vote.VotingPower, 
                        vote.BlockchainTransactionId,
                        User = vote.User?.DisplayName ?? "Unknown"
                    };
                    transactionId = vote.BlockchainTransactionId;
                    targetOrganizationId = vote.Proposal?.OrganizationId;
                }
                break;
            case "ShareIssuance":
                var issuance = await dbContext.ShareIssuances
                    .Include(s => s.User)
                    .Include(s => s.ShareType)
                    .FirstOrDefaultAsync(s => s.Id == entityId, cancellationToken);

                if (issuance != null)
                {
                    string issuerName = "System";
                    if (issuance.IssuedByUserId.HasValue)
                    {
                        var issuer = await dbContext.Users.FindAsync([issuance.IssuedByUserId.Value], cancellationToken);
                        if (issuer != null)
                        {
                            issuerName = issuer.DisplayName;
                        }
                    }

                    dbEntity = new 
                    { 
                        issuance.Quantity, 
                        issuance.UserId, 
                        User = issuance.User?.DisplayName ?? "Unknown",
                        issuance.BlockchainTransactionId,
                        IssuedBy = issuerName
                    };
                    transactionId = issuance.BlockchainTransactionId;
                    targetOrganizationId = issuance.ShareType?.OrganizationId;
                }
                break;
        }

        if (dbEntity == null)
        {
            return NotFound("Entity not found");
        }

        object? chainData = null;
        if (!string.IsNullOrEmpty(transactionId))
        {
            if (targetOrganizationId.HasValue)
            {
                var adapter = await blockchainAdapterFactory.GetAdapterAsync(targetOrganizationId.Value, cancellationToken);
                chainData = await adapter.GetTransactionAsync(transactionId, cancellationToken);
            }
            else
            {
                // Fallback if we somehow missed the ID
                var firstOrg = await dbContext.Organizations.FirstOrDefaultAsync(cancellationToken);
                if (firstOrg != null)
                {
                    var adapter = await blockchainAdapterFactory.GetAdapterAsync(firstOrg.Id, cancellationToken);
                    chainData = await adapter.GetTransactionAsync(transactionId, cancellationToken);
                }
            }
        }
        else if (!string.IsNullOrEmpty(onChainAddress))
        {
            if (targetOrganizationId.HasValue)
            {
                var adapter = await blockchainAdapterFactory.GetAdapterAsync(targetOrganizationId.Value, cancellationToken);
                chainData = await adapter.GetAccountAsync(onChainAddress, cancellationToken);
            }
            else
            {
                var firstOrg = await dbContext.Organizations.FirstOrDefaultAsync(cancellationToken);
                if (firstOrg != null)
                {
                    var adapter = await blockchainAdapterFactory.GetAdapterAsync(firstOrg.Id, cancellationToken);
                    chainData = await adapter.GetAccountAsync(onChainAddress, cancellationToken);
                }
            }
        }
        
        var isVerified = chainData != null;
        
        return Ok(new BlockchainVerificationDto
        {
            IsVerified = isVerified,
            Message = isVerified ? "Record verified on blockchain." : "No blockchain record found.",
            DatabaseValue = dbEntity,
            BlockchainValue = chainData
        });
    }
    [HttpGet("wallet")]
    public async Task<ActionResult<PlatformWalletDto>> GetPlatformWallet(
        [FromQuery] string blockchain = "Solana",
        CancellationToken cancellationToken = default)
    {
        if (!Enum.TryParse<BlockchainType>(blockchain, true, out var type))
        {
            return BadRequest($"Invalid blockchain type: {blockchain}");
        }

        if (type == BlockchainType.None)
        {
            return BadRequest("Blockchain type cannot be None");
        }

        try
        {
            var adapter = blockchainAdapterFactory.GetAdapter(type);
            var wallet = await adapter.GetPlatformWalletAsync(cancellationToken);
            return Ok(wallet);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class BlockchainRecordDto
{
    public Guid EntityId { get; set; }
    public Guid OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string? OnChainAddress { get; set; }
    public DateTimeOffset Timestamp { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class BlockchainVerificationDto
{
    public bool IsVerified { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? DatabaseValue { get; set; }
    public object? BlockchainValue { get; set; }
}
