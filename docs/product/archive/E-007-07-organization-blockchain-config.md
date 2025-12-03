---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-007-07: Organization Blockchain Selection Configuration"
labels: ["development", "copilot", "backend", "database", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent**.

---

## 1. Summary

Add blockchain selection capability to organizations, allowing OrgAdmins to configure which blockchain (Solana, Polygon, or None) their organization uses for governance transparency. Implement backend routing to appropriate blockchain adapter based on organization configuration.

---

## 2. Requirements

- Add `BlockchainType` enum to codebase (`None`, `Solana`, `Polygon`)
- Add `BlockchainType` and `BlockchainConfig` (JSON) columns to `Organizations` table
- Create EF Core migration for schema change
- Update `CreateOrganizationRequest` and `UpdateOrganizationRequest` DTOs
- Update `OrganizationService` to store and validate blockchain configuration
- Create `IBlockchainAdapterFactory` interface for adapter routing
- Implement `BlockchainAdapterFactory` that routes to correct adapter HTTP client based on org config
- Update organization API to expose blockchain selection
- Add frontend UI for blockchain selection in organization settings (OrgAdmin only)
- Maintain backward compatibility (existing orgs default to `BlockchainType.None`)

---

## 3. Acceptance Criteria (Testable)

- [ ] `BlockchainType` enum created with values: `None`, `Solana`, `Polygon`
- [ ] `Organizations` table updated with columns:
  - `BlockchainType` (enum/string, default: `None`)
  - `BlockchainConfig` (JSON, nullable, stores adapter URL and config)
- [ ] EF Core migration created and applied successfully
- [ ] `CreateOrganizationRequest` includes optional `blockchainType` and `blockchainConfig` fields
- [ ] `UpdateOrganizationRequest` allows updating blockchain configuration
- [ ] `OrganizationService.CreateAsync` validates and stores blockchain config
- [ ] `OrganizationService.UpdateAsync` validates blockchain config changes
- [ ] `IBlockchainAdapterFactory` interface created with method:
  - `Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken ct)`
- [ ] `BlockchainAdapterFactory` implementation:
  - Loads organization's blockchain type
  - Returns appropriate adapter client (Solana, Polygon, or Null)
  - HTTP client configured with adapter base URL from configuration
- [ ] `IBlockchainAdapter` interface defines common operations:
  - `Task<string> CreateOrganizationAsync(...)`
  - `Task<string> CreateShareTypeAsync(...)`
  - `Task<string> RecordVoteAsync(...)`
  - etc. (matching adapter API contract)
- [ ] `NullBlockchainAdapter` implementation (no-op for orgs without blockchain)
- [ ] API endpoints updated:
  - `GET /organizations/{id}` returns blockchain configuration
  - `PUT /organizations/{id}` allows blockchain config update (OrgAdmin only)
- [ ] Frontend organization settings page includes blockchain selection dropdown
- [ ] Frontend validation: blockchain type cannot be changed after shares/proposals exist
- [ ] Unit tests for `BlockchainAdapterFactory`
- [ ] Integration tests for organization creation with blockchain config
- [ ] All tests pass (`dotnet test`, `npm test`)
- [ ] Documentation updated in `docs/architecture.md`

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Database migration must be backward compatible (no data loss)
- Blockchain selection should be immutable once shares or proposals exist (validate before update)
- Use dependency injection with primary constructors
- Include `CancellationToken` in async APIs
- Follow naming and architectural conventions in `.github/copilot-coding-agent-instructions.md`

---

## 5. Technical Notes (Optional)

**Database Schema:**

```sql
-- Migration
ALTER TABLE "Organizations"
ADD COLUMN "BlockchainType" VARCHAR(50) DEFAULT 'None' NOT NULL,
ADD COLUMN "BlockchainConfig" JSONB;

-- Example BlockchainConfig JSON:
{
  "adapterUrl": "http://solana-adapter:3001",
  "network": "devnet",
  "apiKey": "secret-api-key"
}
```

**Backend Architecture:**

```csharp
// Domain enum
public enum BlockchainType
{
    None,
    Solana,
    Polygon
}

// Domain entity update
public class Organization
{
    public BlockchainType BlockchainType { get; set; } = BlockchainType.None;
    public string? BlockchainConfig { get; set; } // JSON string
}

// Application interface
public interface IBlockchainAdapterFactory
{
    Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken ct);
}

// Adapter interface
public interface IBlockchainAdapter
{
    Task<string> CreateOrganizationAsync(Guid orgId, string name, CancellationToken ct);
    Task<string> CreateShareTypeAsync(Guid shareTypeId, ShareTypeDto dto, CancellationToken ct);
    Task<string> RecordVoteAsync(Guid voteId, VoteDto dto, CancellationToken ct);
    // etc.
}

// Infrastructure implementation
public class BlockchainAdapterFactory(AppDbContext db, IHttpClientFactory httpClientFactory) 
    : IBlockchainAdapterFactory
{
    public async Task<IBlockchainAdapter> GetAdapterAsync(Guid organizationId, CancellationToken ct)
    {
        var org = await db.Organizations.FindAsync([organizationId], ct);
        
        return org.BlockchainType switch
        {
            BlockchainType.Solana => new SolanaAdapterClient(httpClientFactory, org.BlockchainConfig),
            BlockchainType.Polygon => new PolygonAdapterClient(httpClientFactory, org.BlockchainConfig),
            BlockchainType.None => new NullBlockchainAdapter(),
            _ => throw new InvalidOperationException($"Unknown blockchain type: {org.BlockchainType}")
        };
    }
}
```

**Frontend UI (Organization Settings):**

```tsx
<FormField label="Blockchain Platform">
  <select
    value={organization.blockchainType}
    onChange={handleBlockchainChange}
    disabled={hasExistingData} // Disable if org has shares/proposals
  >
    <option value="None">None (Off-chain only)</option>
    <option value="Solana">Solana</option>
    <option value="Polygon">Polygon</option>
  </select>
  {hasExistingData && (
    <HelpText>
      Blockchain type cannot be changed after shares or proposals are created.
    </HelpText>
  )}
</FormField>
```

**Configuration (appsettings.json):**

```json
{
  "BlockchainAdapters": {
    "Solana": {
      "BaseUrl": "http://solana-adapter:3001",
      "ApiKey": "secret-solana-key"
    },
    "Polygon": {
      "BaseUrl": "http://polygon-adapter:3002",
      "ApiKey": "secret-polygon-key"
    }
  }
}
```

---

## 6. Desired Agent

- [x] **Default Coding Agent**

---

## 7. Files Allowed to Change

**Backend:**
- `backend/FanEngagement.Domain/Entities/Organization.cs`
- `backend/FanEngagement.Domain/Enums/BlockchainType.cs` (new)
- `backend/FanEngagement.Application/Organizations/CreateOrganizationRequest.cs`
- `backend/FanEngagement.Application/Organizations/UpdateOrganizationRequest.cs`
- `backend/FanEngagement.Application/Blockchain/IBlockchainAdapter.cs` (new)
- `backend/FanEngagement.Application/Blockchain/IBlockchainAdapterFactory.cs` (new)
- `backend/FanEngagement.Infrastructure/Blockchain/BlockchainAdapterFactory.cs` (new)
- `backend/FanEngagement.Infrastructure/Blockchain/SolanaAdapterClient.cs` (new)
- `backend/FanEngagement.Infrastructure/Blockchain/PolygonAdapterClient.cs` (new)
- `backend/FanEngagement.Infrastructure/Blockchain/NullBlockchainAdapter.cs` (new)
- `backend/FanEngagement.Infrastructure/Persistence/Migrations/*.cs` (new migration)
- `backend/FanEngagement.Api/Controllers/OrganizationsController.cs`
- `backend/FanEngagement.Tests/**/*.cs` (tests)

**Frontend:**
- `frontend/src/pages/admin/organizations/OrganizationSettings.tsx`
- `frontend/src/api/organizations.ts`
- `frontend/src/types/organization.ts`

**Documentation:**
- `docs/architecture.md`

---

## 8. Completion Criteria

- Database migration applied successfully
- Backend blockchain adapter routing functional
- Frontend UI for blockchain selection implemented
- All tests pass
- Documentation updated
- Backward compatibility maintained (existing orgs work without blockchain)
