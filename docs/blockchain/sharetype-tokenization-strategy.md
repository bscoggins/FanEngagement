# ShareType Tokenization Strategy

> **Document Type:** Research / Design Specification  
> **Epic:** E-004 - Blockchain Integration Initiative (Solana)  
> **Issue:** E-004-03  
> **Status:** Complete  
> **Last Updated:** November 2024

## Executive Summary

This document defines the tokenization strategy for representing FanEngagement ShareTypes as SPL tokens on Solana. It establishes the model for how organization shares are represented on-chain, including mint creation workflows, metadata structure, authority management, issuance synchronization, supply enforcement, and burn mechanics.

**Key Decisions:**

1. **One SPL Token Mint per ShareType** - Each ShareType in an organization becomes a distinct token mint
2. **Token-2022 program preferred** - Leverage extensions for non-transferable tokens and native metadata
3. **Platform-controlled mint authority (MVP)** - Single program-controlled authority with migration path to multisig
4. **Hybrid supply enforcement** - MaxSupply enforced at application level, validated on-chain
5. **Event-driven synchronization** - Database changes trigger on-chain minting via event queue

---

## Table of Contents

1. [ShareType to SPL Token Mapping](#1-sharetype-to-spl-token-mapping)
2. [SPL Token Mint Creation Workflow](#2-spl-token-mint-creation-workflow)
3. [Token Metadata Structure](#3-token-metadata-structure)
4. [Mint Authority Management](#4-mint-authority-management)
5. [Token Issuance Workflow](#5-token-issuance-workflow)
6. [MaxSupply Enforcement](#6-maxsupply-enforcement)
7. [Burn Mechanics for Share Revocation](#7-burn-mechanics-for-share-revocation)
8. [Token Program Selection](#8-token-program-selection)
9. [Implementation Phases](#9-implementation-phases)
10. [Security Considerations](#10-security-considerations)
11. [References](#11-references)

---

## 1. ShareType to SPL Token Mapping

### 1.1 Domain Model Alignment

The FanEngagement ShareType entity maps directly to SPL token concepts:

| ShareType Field | SPL Token Equivalent | Notes |
|-----------------|---------------------|-------|
| `Id` (Guid) | PDA seed | Used to derive deterministic mint address |
| `OrganizationId` (Guid) | PDA seed component | Scopes token to organization |
| `Name` | Token metadata name | Stored in Metaplex metadata |
| `Symbol` | Token symbol | 1-10 characters, stored in metadata |
| `Description` | Token metadata description | Stored off-chain (URI) |
| `VotingWeight` | Custom metadata attribute | Governance-specific, stored in metadata URI |
| `MaxSupply` | Application-level constraint | Not natively enforced by SPL Token |
| `IsTransferable` | Token-2022 Non-Transferable extension | Protocol-level transfer control |
| `CreatedAt` | On-chain timestamp | Stored in token metadata |

### 1.2 Token Architecture

Each organization's share structure is represented as a collection of token mints:

```text
Organization: "Manchester United FC" (org_uuid: abc123...)
├── ShareType: "Season Ticket Holder"
│   ├── FanEngagement DB: { Id: st_001, Symbol: "MUFC-STH", VotingWeight: 1.0, IsTransferable: true }
│   └── Solana Token Mint: 7xKW...pQm (SPL Token - tradeable)
│
├── ShareType: "Founding Member"  
│   ├── FanEngagement DB: { Id: st_002, Symbol: "MUFC-FM", VotingWeight: 10.0, IsTransferable: false }
│   └── Solana Token Mint: 9aRt...xYz (Token-2022 - non-transferable)
│
└── ShareType: "Gold Member"
    ├── FanEngagement DB: { Id: st_003, Symbol: "MUFC-GOLD", VotingWeight: 5.0, IsTransferable: true }
    └── Solana Token Mint: 3bCd...wVu (Token-2022 - with transfer hook)
```

### 1.3 PDA Derivation for Token Mints

Token mint addresses are derived deterministically using Program Derived Addresses (PDAs):

```typescript
// Mint PDA derivation
const [mintPda, mintBump] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("share_mint"),
    organizationUuid.toBuffer(),  // 16 bytes
    shareTypeUuid.toBuffer(),     // 16 bytes
  ],
  FAN_GOVERNANCE_PROGRAM_ID
);
```

**Benefits of PDA-based mints:**
- **Deterministic**: Same ShareType always maps to same mint address
- **Verifiable**: Anyone can derive the address given the UUIDs
- **Linkable**: Easy to map between off-chain and on-chain data
- **Unique**: Guaranteed uniqueness per organization/share type combination

---

## 2. SPL Token Mint Creation Workflow

### 2.1 Trigger Events

Token mints are created in response to ShareType lifecycle events:

| Trigger | Action | Timing |
|---------|--------|--------|
| ShareType created in DB | Create token mint on Solana | Async (event queue) |
| ShareType `IsTransferable` changed | Update token extensions or create new mint | May require migration |
| ShareType deleted | Optionally close mint authority | Only if no tokens issued |

### 2.2 Creation Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Token Mint Creation Workflow                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. ShareType Created in Database                                       │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ POST /organizations/{orgId}/share-types                         │    │
│  │ → Creates ShareType record                                      │    │
│  │ → Enqueues "ShareTypeCreated" outbound event                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  2. Blockchain Sync Service Processes Event                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ BlockchainSyncService picks up event from queue                 │    │
│  │ → Derives mint PDA from org_uuid + share_type_uuid              │    │
│  │ → Checks if mint already exists on-chain                        │    │
│  │ → If not exists, proceeds to creation                           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  3. Prepare Token Mint Transaction                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Build transaction with:                                         │    │
│  │ → CreateMint instruction (Token-2022 or SPL Token)              │    │
│  │ → Initialize extensions (if Token-2022):                        │    │
│  │   • Non-Transferable (if IsTransferable = false)                │    │
│  │   • MetadataPointer                                             │    │
│  │ → CreateMetadata instruction (Metaplex or native)               │    │
│  │ → Set mint authority to platform PDA                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  4. Submit and Confirm Transaction                                      │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Sign with platform authority keypair                          │    │
│  │ → Submit to Solana network                                      │    │
│  │ → Wait for confirmation (finalized)                             │    │
│  │ → Retry with exponential backoff on failure                     │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  5. Update Database with On-Chain Reference                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Store mint address in ShareType.MintAddress field             │    │
│  │ → Store creation transaction signature                          │    │
│  │ → Update sync status to "Synced"                                │    │
│  │ → Mark outbound event as processed                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Who Triggers Mint Creation

| Actor | Method | Authorization |
|-------|--------|---------------|
| **OrgAdmin** | Creates ShareType via API | Must be OrgAdmin for the organization |
| **Global Admin** | Creates ShareType via Admin API | Platform administrator |
| **Blockchain Sync Service** | Executes on-chain transaction | Uses platform authority keypair |

**Note:** End users never directly create token mints. All mint creation is controlled by the platform through the sync service.

### 2.4 Idempotency and Error Handling

The mint creation process must be idempotent:

```typescript
async function createOrGetMint(shareType: ShareType): Promise<PublicKey> {
  // Derive expected mint address
  const [mintPda] = deriveMintPda(shareType.organizationId, shareType.id);
  
  // Check if mint already exists
  const mintAccount = await connection.getAccountInfo(mintPda);
  if (mintAccount !== null) {
    // Mint already exists, verify it matches expected configuration
    await verifyMintConfiguration(mintPda, shareType);
    return mintPda;
  }
  
  // Create new mint
  return await createTokenMint(shareType, mintPda);
}
```

**Error recovery:**
- Transient failures: Retry with exponential backoff (3 attempts)
- Permanent failures: Mark event as failed, alert operators
- Partial failures: Check on-chain state before retrying

---

## 3. Token Metadata Structure

### 3.1 Metaplex Token Metadata Standard

For maximum ecosystem compatibility, ShareType tokens use the Metaplex Token Metadata standard:

#### On-Chain Metadata

```rust
pub struct Metadata {
    pub key: Key,                          // Account type discriminator
    pub update_authority: Pubkey,          // Can update metadata
    pub mint: Pubkey,                       // Associated token mint
    pub data: Data {
        pub name: String,                  // ShareType.Name (max 32 chars)
        pub symbol: String,                // ShareType.Symbol (max 10 chars)
        pub uri: String,                   // Link to off-chain JSON (max 200 chars)
        pub seller_fee_basis_points: u16,  // 0 for governance tokens
        pub creators: Option<Vec<Creator>>, // Platform as creator
    },
    pub primary_sale_happened: bool,       // false for governance tokens
    pub is_mutable: bool,                  // true to allow updates
    pub edition_nonce: Option<u8>,         // None for fungible tokens
    pub token_standard: Option<TokenStandard>, // Fungible
    pub collection: Option<Collection>,    // Organization collection
    pub uses: Option<Uses>,                // None
}
```

#### Off-Chain Metadata (JSON at URI)

```json
{
  "name": "Season Ticket Holder Share",
  "symbol": "MUFC-STH",
  "description": "Governance share for Manchester United FC season ticket holders. Grants voting rights on club decisions.",
  "image": "https://cdn.fanengagement.io/orgs/mufc/share-types/sth-logo.png",
  "external_url": "https://fanengagement.io/orgs/mufc/shares/sth",
  "attributes": [
    {
      "trait_type": "Organization",
      "value": "Manchester United FC"
    },
    {
      "trait_type": "Organization ID",
      "value": "abc123-def456-..."
    },
    {
      "trait_type": "Share Type ID",
      "value": "st_001-..."
    },
    {
      "trait_type": "Voting Weight",
      "value": 1.0,
      "display_type": "number"
    },
    {
      "trait_type": "Max Supply",
      "value": 10000,
      "display_type": "number"
    },
    {
      "trait_type": "Is Transferable",
      "value": "Yes"
    },
    {
      "trait_type": "Created At",
      "value": "2024-11-15T10:30:00Z"
    }
  ],
  "properties": {
    "category": "governance",
    "files": [],
    "creators": [
      {
        "address": "FanEngPlatformAuthority...",
        "share": 100
      }
    ]
  }
}
```

### 3.2 Mapping ShareType Fields to Metadata

| ShareType Field | Metadata Location | Format |
|-----------------|-------------------|--------|
| `Name` | `data.name` (on-chain) | String, max 32 chars |
| `Symbol` | `data.symbol` (on-chain) | String, max 10 chars, uppercase |
| `Description` | `description` (off-chain JSON) | String, unlimited |
| `VotingWeight` | `attributes[].value` (off-chain) | Number with trait_type "Voting Weight" |
| `MaxSupply` | `attributes[].value` (off-chain) | Number with trait_type "Max Supply" |
| `IsTransferable` | `attributes[].value` (off-chain) + Token-2022 extension | "Yes"/"No" + protocol enforcement |
| `OrganizationId` | `attributes[].value` (off-chain) | UUID string |
| `CreatedAt` | `attributes[].value` (off-chain) | ISO 8601 timestamp |

### 3.3 Token Decimals

**Recommendation: 0 decimals for governance tokens**

| Decimals | Use Case | Rationale |
|----------|----------|-----------|
| **0** (recommended) | Governance shares | Shares are typically whole units; matches DB `decimal` type usage |
| 6 | Alternative | Allows fractional shares if future requirements need it |
| 9 | SOL-compatible | Maximum precision, but unnecessary for governance |

**MVP Decision:** Use 0 decimals. ShareType balances in the database are stored as `decimal(20,4)`, but governance shares are typically issued as whole units. If fractional shares become necessary, a new ShareType with appropriate decimals can be created.

### 3.4 Metadata Storage Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **IPFS** | Decentralized, permanent | Requires pinning service | ✅ MVP |
| **Arweave** | Permanent, one-time payment | Higher initial cost | Future consideration |
| **Platform CDN** | Simple, fast | Centralized | Backup/fallback |
| **Token-2022 Native** | On-chain, no external dependency | Limited size, higher rent | For critical fields only |

**MVP Approach:** Store metadata JSON on IPFS via Pinata or similar service, with platform CDN as fallback. URI format: `https://gateway.pinata.cloud/ipfs/{cid}` or `ipfs://{cid}`.

---

## 4. Mint Authority Management

### 4.1 Authority Types

SPL tokens have two key authorities:

| Authority | Purpose | Who Controls |
|-----------|---------|--------------|
| **Mint Authority** | Can mint new tokens | Platform (required for issuance) |
| **Freeze Authority** | Can freeze token accounts | Platform (optional, for compliance) |

### 4.2 MVP: Platform-Controlled Authority

For MVP, use a single platform-controlled keypair as mint authority:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    MVP Authority Model                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Platform Authority Keypair (stored in secure vault)                    │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Public Key: FanEngAuthority...xyz                               │    │
│  │ Private Key: [Stored in AWS KMS / HashiCorp Vault]              │    │
│  │                                                                 │    │
│  │ Permissions:                                                    │    │
│  │ → Mint tokens for all ShareTypes                                │    │
│  │ → Update token metadata                                         │    │
│  │ → Freeze accounts (emergency use)                               │    │
│  │ → Transfer authority (for migration)                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  All Token Mints                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Org A        │  │ Org B        │  │ Org C        │                  │
│  │ ShareType 1  │  │ ShareType 1  │  │ ShareType 1  │                  │
│  │ Mint Auth:   │  │ Mint Auth:   │  │ Mint Auth:   │                  │
│  │ Platform     │  │ Platform     │  │ Platform     │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Security measures for MVP:**
- Private key stored in hardware security module (HSM) or cloud KMS
- Key access restricted to blockchain sync service
- Audit logging for all mint operations
- Rate limiting on mint operations

### 4.3 Future: Multi-Signature Authority

For production, migrate to organization-controlled multisig:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Production Authority Model (Future)                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Organization A                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Multisig Authority (2-of-3):                                    │    │
│  │ → Platform Signer (FanEngagement)                               │    │
│  │ → OrgAdmin Signer 1 (Organization representative)               │    │
│  │ → OrgAdmin Signer 2 (Organization representative)               │    │
│  │                                                                 │    │
│  │ Token Mints controlled by this multisig:                        │    │
│  │ → MUFC-STH (Season Ticket Holder)                               │    │
│  │ → MUFC-FM (Founding Member)                                     │    │
│  │ → MUFC-GOLD (Gold Member)                                       │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Organization B                                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Multisig Authority (3-of-5):                                    │    │
│  │ → Platform Signer (FanEngagement)                               │    │
│  │ → OrgAdmin Signer 1-4 (Organization representatives)            │    │
│  │                                                                 │    │
│  │ Token Mints controlled by this multisig:                        │    │
│  │ → LFC-MEMBER (Member Share)                                     │    │
│  │ → LFC-VIP (VIP Share)                                           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Multisig implementation options:**
1. **Squads Protocol** - Most popular Solana multisig, battle-tested
2. **SPL Token Multisig** - Native SPL multisig account
3. **Custom program** - Built into FanEngagement governance program

### 4.4 Authority Transition Process

To migrate from platform authority to multisig:

```typescript
// 1. Create multisig account for organization
const multisigPda = await createOrgMultisig(orgId, signers, threshold);

// 2. Transfer mint authority to multisig
const transferIx = createSetAuthorityInstruction(
  mintAddress,
  currentAuthority,
  AuthorityType.MintTokens,
  multisigPda
);

// 3. Execute with current authority signature
await sendAndConfirmTransaction(connection, transaction, [currentAuthoritySigner]);

// 4. Update database to reflect new authority model
await updateShareTypeAuthorityModel(shareTypeId, 'MULTISIG', multisigPda);
```

---

## 5. Token Issuance Workflow

### 5.1 Database to Blockchain Synchronization

Token issuance follows the existing ShareIssuance model, with blockchain synchronization as an additional step:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Token Issuance Workflow                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Share Issuance Created in Database                                  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ POST /organizations/{orgId}/share-issuances                     │    │
│  │ Request: { userId, shareTypeId, quantity: 100 }                 │    │
│  │                                                                 │    │
│  │ Service Layer:                                                  │    │
│  │ → Validate user is org member                                   │    │
│  │ → Validate MaxSupply not exceeded (if set)                      │    │
│  │ → Create ShareIssuance record                                   │    │
│  │ → Update ShareBalance (increment by quantity)                   │    │
│  │ → Enqueue "SharesIssued" outbound event                         │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  2. Blockchain Sync Service Processes Event                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Event payload:                                                  │    │
│  │ {                                                               │    │
│  │   "eventType": "SharesIssued",                                  │    │
│  │   "organizationId": "abc-123",                                  │    │
│  │   "shareTypeId": "st-001",                                      │    │
│  │   "userId": "user-456",                                         │    │
│  │   "quantity": 100,                                              │    │
│  │   "issuanceId": "iss-789"                                       │    │
│  │ }                                                               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  3. Resolve User Wallet Address                                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Options:                                                        │    │
│  │ A) User has linked Solana wallet → Use linked wallet address    │    │
│  │ B) User has no wallet → Create custodial wallet (PDA)           │    │
│  │ C) Deferred → Store pending issuance until wallet linked        │    │
│  │                                                                 │    │
│  │ MVP: Option B (Custodial PDA)                                   │    │
│  │ → Derive user wallet PDA: ["user_wallet", user_uuid]            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  4. Create or Get Associated Token Account (ATA)                        │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ If user doesn't have ATA for this token mint:                   │    │
│  │ → Create ATA instruction (rent paid by platform)                │    │
│  │                                                                 │    │
│  │ ATA derivation:                                                 │    │
│  │ getAssociatedTokenAddressSync(mintPda, userWalletPda)           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  5. Mint Tokens to User's ATA                                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Build transaction:                                              │    │
│  │ → CreateAssociatedTokenAccountIdempotent (if needed)            │    │
│  │ → MintTo instruction                                            │    │
│  │   • mint: shareType mint PDA                                    │    │
│  │   • destination: user's ATA                                     │    │
│  │   • authority: platform mint authority                          │    │
│  │   • amount: quantity (in base units, no decimals)               │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  6. Confirm and Record                                                  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Wait for transaction confirmation (finalized)                 │    │
│  │ → Store transaction signature in ShareIssuance record           │    │
│  │ → Update issuance status to "OnChainConfirmed"                  │    │
│  │ → Mark outbound event as processed                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Wallet Models

Three approaches for handling user wallets:

#### Option A: User-Linked Wallets (Self-Custody)

```typescript
// User links their own Solana wallet
interface UserWalletLink {
  userId: string;
  walletAddress: string;  // User's Phantom/Solflare wallet
  linkedAt: Date;
  verificationSignature: string;  // Proves wallet ownership
}
```

**Pros:** True self-custody, user controls private keys  
**Cons:** Onboarding friction, users need Solana wallet

#### Option B: Custodial PDA Wallets (MVP Recommended)

```typescript
// Platform manages wallets via PDA
const [userWalletPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("user_wallet"), userUuid.toBuffer()],
  FAN_GOVERNANCE_PROGRAM_ID
);
```

**Pros:** Seamless UX, no wallet required  
**Cons:** Custodial, platform holds tokens on behalf of users

#### Option C: Hybrid (Future)

Allow both: custodial by default, with option to claim to self-custody wallet.

### 5.3 Batch Issuance

For efficiency, batch multiple issuances into single transactions:

```typescript
async function batchMintTokens(
  issuances: ShareIssuance[],
  maxPerTransaction: number = 10
): Promise<TransactionSignature[]> {
  const signatures: TransactionSignature[] = [];
  
  // Group issuances by ShareType (same mint)
  const grouped = groupBy(issuances, 'shareTypeId');
  
  for (const [shareTypeId, typeIssuances] of Object.entries(grouped)) {
    const mint = await getMintForShareType(shareTypeId);
    
    // Batch into chunks
    for (const batchChunk of chunk(typeIssuances, maxPerTransaction)) {
      const tx = new Transaction();
      
      for (const issuance of batchChunk) {
        const userAta = await getOrCreateAta(mint, issuance.userId);
        tx.add(
          createMintToInstruction(
            mint,
            userAta,
            platformAuthority,
            issuance.quantity
          )
        );
      }
      
      const sig = await sendAndConfirmTransaction(connection, tx, [platformAuthority]);
      signatures.push(sig);
    }
  }
  
  return signatures;
}
```

### 5.4 Consistency and Reconciliation

Ensure database and blockchain stay in sync:

| State | Database | Blockchain | Action |
|-------|----------|------------|--------|
| **Consistent** | 100 shares | 100 tokens | No action needed |
| **DB Ahead** | 100 shares | 50 tokens | Mint 50 more tokens |
| **Chain Ahead** | 50 shares | 100 tokens | Alert & investigate (should not happen) |
| **TX Failed** | 100 shares (pending) | 0 tokens | Retry mint or mark failed |

**Reconciliation process:**
1. Run daily/hourly reconciliation job
2. Compare ShareBalance totals with on-chain token balances
3. For discrepancies where DB > chain: queue catch-up mints
4. For discrepancies where chain > DB: alert operators (data integrity issue)

---

## 6. MaxSupply Enforcement

### 6.1 Enforcement Layers

MaxSupply can be enforced at multiple levels:

| Layer | Enforcement | Pros | Cons |
|-------|-------------|------|------|
| **Application (Database)** | Check before issuance | Fast, flexible | Not cryptographically enforced |
| **Smart Contract** | On-chain validation | Trustless, immutable | Requires custom program |
| **SPL Token** | No native support | - | Must use custom program |

### 6.2 Recommended Approach: Application-Level + On-Chain Validation

**Primary enforcement: Application layer (database)**

```csharp
// In ShareIssuanceService.cs
public async Task<ShareIssuance> IssueSharesAsync(
    CreateShareIssuanceRequest request,
    CancellationToken cancellationToken = default)
{
    var shareType = await dbContext.ShareTypes.FindAsync(request.ShareTypeId, cancellationToken);
    
    if (shareType.MaxSupply.HasValue)
    {
        var currentSupply = await dbContext.ShareBalances
            .Where(b => b.ShareTypeId == request.ShareTypeId)
            .SumAsync(b => b.Balance, cancellationToken);
            
        if (currentSupply + request.Quantity > shareType.MaxSupply.Value)
        {
            throw new InvalidOperationException(
                $"Cannot issue {request.Quantity} shares. " +
                $"Would exceed MaxSupply of {shareType.MaxSupply.Value}. " +
                $"Current supply: {currentSupply}");
        }
    }
    
    // Proceed with issuance...
}
```

**Secondary enforcement: On-chain validation (custom program)**

```rust
// In fan_governance program
pub fn mint_shares(
    ctx: Context<MintShares>,
    amount: u64,
) -> Result<()> {
    let share_type = &ctx.accounts.share_type_pda;
    
    // Validate against on-chain max supply if set
    if let Some(max_supply) = share_type.max_supply {
        let current_supply = ctx.accounts.mint.supply;
        require!(
            current_supply + amount <= max_supply,
            GovernanceError::MaxSupplyExceeded
        );
    }
    
    // Mint tokens
    token::mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.mint_authority.to_account_info(),
            },
        ),
        amount,
    )?;
    
    Ok(())
}
```

### 6.3 MaxSupply Storage

Store MaxSupply both off-chain and on-chain:

```rust
// ShareType PDA account structure
pub struct ShareTypeAccount {
    pub bump: u8,
    pub organization: Pubkey,
    pub share_type_uuid: [u8; 16],
    pub mint: Pubkey,
    pub max_supply: Option<u64>,      // On-chain MaxSupply
    pub voting_weight: u64,           // Basis points (10000 = 1.0)
    pub is_transferable: bool,
    pub metadata_uri: [u8; 200],
}
```

### 6.4 Supply Tracking

Track circulating supply vs. MaxSupply:

| Metric | Source | Calculation |
|--------|--------|-------------|
| **MaxSupply** | ShareType.MaxSupply | Fixed at creation |
| **TotalMinted** | Mint.supply (on-chain) | Sum of all minted tokens |
| **CirculatingSupply** | Token accounts | Sum of all non-burned balances |
| **RemainingSupply** | Calculated | MaxSupply - TotalMinted |

---

## 7. Burn Mechanics for Share Revocation

### 7.1 Use Cases for Burning

Shares may need to be revoked/burned in several scenarios:

| Scenario | Example | Burn Type |
|----------|---------|-----------|
| **Membership termination** | User leaves organization | Admin-initiated |
| **Compliance action** | Regulatory requirement | Admin-initiated |
| **User request** | User wants to exit | User-initiated |
| **Expired shares** | Time-limited membership | Automatic |
| **Correction** | Issuance error | Admin-initiated |

### 7.2 Burn Workflow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    Share Revocation / Burn Workflow                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Revocation Initiated                                                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Trigger: Admin action, user request, or automatic expiry        │    │
│  │                                                                 │    │
│  │ API: POST /organizations/{orgId}/share-revocations              │    │
│  │ Request: { userId, shareTypeId, quantity, reason }              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  2. Validate Revocation                                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Check user has sufficient balance                             │    │
│  │ → Check requester has permission (OrgAdmin or user themselves)  │    │
│  │ → Check no active votes using these shares (optional constraint)│    │
│  │ → Create ShareRevocation record with status "Pending"           │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  3. Update Database Balance                                             │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Decrement ShareBalance by quantity                            │    │
│  │ → Create negative ShareIssuance record (for audit trail)        │    │
│  │ → Enqueue "SharesRevoked" outbound event                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  4. Execute On-Chain Burn                                               │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ Blockchain Sync Service:                                        │    │
│  │                                                                 │    │
│  │ Option A: Burn from user's ATA (requires user signature or PDA) │    │
│  │ → burn_checked instruction                                      │    │
│  │ → Requires: mint, account, owner/delegate, amount               │    │
│  │                                                                 │    │
│  │ Option B: Transfer to burn address, then burn (platform-owned)  │    │
│  │ → transfer instruction to platform-controlled burn ATA          │    │
│  │ → burn instruction from burn ATA                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                              │                                          │
│                              ▼                                          │
│  5. Confirm and Record                                                  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ → Wait for transaction confirmation                             │    │
│  │ → Update ShareRevocation status to "Completed"                  │    │
│  │ → Store burn transaction signature                              │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Burn Authority Options

| Model | Who Can Burn | Implementation |
|-------|--------------|----------------|
| **Owner-only** | Token holder | Standard SPL Token behavior |
| **Delegate burn** | Approved delegate | `Approve` + `Burn` pattern |
| **Platform authority** | Platform (custodial) | Platform holds tokens in PDAs |
| **Permanent Delegate** (Token-2022) | Platform always | Token-2022 extension |

**MVP Recommendation:** Use Permanent Delegate extension (Token-2022) for governance tokens. This allows the platform to burn tokens when shares are revoked, without requiring user action.

### 7.4 Burn vs. Transfer to Dead Address

| Approach | Effect | Pros | Cons |
|----------|--------|------|------|
| **Burn** | Reduces total supply | Clean, reduces circulating supply | Requires burn authority |
| **Transfer to dead address** | Tokens inaccessible | Simple, no special authority | Supply appears unchanged |

**Recommendation:** Use proper burn to accurately reflect circulating supply.

### 7.5 Permanent Delegate for Governance Tokens

Token-2022's Permanent Delegate extension is ideal for governance tokens:

```rust
// Initialize mint with Permanent Delegate extension
let extension_type = ExtensionType::PermanentDelegate;
let extension_data = PermanentDelegateConfig {
    delegate: platform_authority.key(),
};

// Platform can always burn tokens from any account
pub fn revoke_shares(ctx: Context<RevokeShares>, amount: u64) -> Result<()> {
    // Platform has permanent delegate authority
    token_2022::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.platform_authority.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}
```

---

## 8. Token Program Selection

### 8.1 SPL Token vs Token-2022 Decision Matrix

| Feature | SPL Token (Original) | Token-2022 | FanEngagement Need |
|---------|---------------------|------------|-------------------|
| **Ecosystem Support** | Excellent (all wallets/DEXs) | Growing (major wallets) | High |
| **Non-Transferable** | Not supported | ✅ Native extension | **Required** for some share types |
| **Permanent Delegate** | Not supported | ✅ Native extension | **Recommended** for revocation |
| **Native Metadata** | Not supported | ✅ MetadataPointer | Nice to have |
| **Transfer Hooks** | Not supported | ✅ Custom validation | Future: compliance rules |
| **Complexity** | Low | Medium | Acceptable |
| **Rent Cost** | Lower | Slightly higher | Acceptable |

### 8.2 Recommendation by ShareType Configuration

| ShareType.IsTransferable | Token Program | Extensions |
|--------------------------|---------------|------------|
| `true` (tradeable) | SPL Token (original) | None - maximize compatibility |
| `false` (non-transferable) | Token-2022 | Non-Transferable, Permanent Delegate |

**Rationale:**
- Tradeable shares benefit from maximum ecosystem compatibility (DEXs, wallets)
- Non-transferable shares require Token-2022's soulbound feature
- Permanent Delegate enables platform-controlled revocation for all governance tokens

### 8.3 Migration Considerations

If a ShareType's `IsTransferable` flag changes:

| Change | Required Action | Complexity |
|--------|-----------------|------------|
| `true` → `false` | Create new Token-2022 mint, migrate balances | High |
| `false` → `true` | Cannot easily remove Non-Transferable extension | Very High |

**Recommendation:** Treat `IsTransferable` as immutable after token mint creation. If change is needed, create a new ShareType and migrate balances through issuance/revocation.

---

## 9. Implementation Phases

### 9.1 Phase 1: Foundation (MVP)

**Duration:** 4-6 weeks

| Component | Deliverable | Priority |
|-----------|-------------|----------|
| Token mint creation | Create SPL Token mint per ShareType | P0 |
| Metaplex metadata | Store name, symbol, attributes | P0 |
| Platform authority | Single keypair in secure vault | P0 |
| Basic sync service | Mint creation on ShareType create | P0 |
| Database fields | Add `MintAddress`, `SyncStatus` to ShareType | P0 |

**Out of scope for Phase 1:**
- User wallet linking
- On-chain token issuance
- Burn mechanics
- Token-2022 extensions

### 9.2 Phase 2: Token Issuance

**Duration:** 4-6 weeks

| Component | Deliverable | Priority |
|-----------|-------------|----------|
| Custodial wallets | PDA-based user wallets | P0 |
| Token minting | Mint tokens on ShareIssuance | P0 |
| ATA management | Create ATAs for users | P0 |
| Batch minting | Batch multiple issuances | P1 |
| Reconciliation | Daily balance sync check | P1 |

### 9.3 Phase 3: Token-2022 & Revocation

**Duration:** 3-4 weeks

| Component | Deliverable | Priority |
|-----------|-------------|----------|
| Token-2022 mints | For non-transferable shares | P0 |
| Non-Transferable extension | Protocol-level transfer block | P0 |
| Permanent Delegate | Platform burn authority | P0 |
| Burn mechanics | Revoke shares on-chain | P0 |
| MaxSupply on-chain | Validate supply in program | P1 |

### 9.4 Phase 4: Decentralization (Future)

**Duration:** 6-8 weeks

| Component | Deliverable | Priority |
|-----------|-------------|----------|
| User wallet linking | Connect Phantom/Solflare | P1 |
| Self-custody option | Claim tokens to own wallet | P1 |
| Multisig authority | Per-org multisig | P2 |
| Transfer hooks | Custom transfer validation | P2 |

---

## 10. Security Considerations

### 10.1 Key Management

| Risk | Mitigation |
|------|------------|
| Authority key theft | Store in HSM/KMS (AWS, Azure, HashiCorp Vault) |
| Key loss | Backup procedures, multi-party key ceremony |
| Unauthorized minting | Rate limiting, audit logging, alerting |

### 10.2 Smart Contract Security

| Risk | Mitigation |
|------|------------|
| Program vulnerabilities | Security audit before mainnet deployment |
| Upgrade risks | Use upgradeable program pattern with timelock |
| Access control bypass | Validate all signers in program |

### 10.3 Data Integrity

| Risk | Mitigation |
|------|------------|
| DB/chain desync | Automated reconciliation, alerts |
| Double minting | Idempotent operations, unique constraints |
| Supply manipulation | On-chain MaxSupply validation |

### 10.4 Operational Security

| Risk | Mitigation |
|------|------------|
| Service compromise | Least privilege access, network isolation |
| Transaction failures | Retry logic, dead letter queue for failed events |
| Network attacks | Use reputable RPC providers, failover endpoints |

---

## 11. References

### Solana Documentation

- [SPL Token Program](https://spl.solana.com/token)
- [Token-2022 (Token Extensions)](https://solana.com/solutions/token-extensions)
- [Associated Token Account](https://spl.solana.com/associated-token-account)

### Metaplex

- [Token Metadata Standard](https://docs.metaplex.com/programs/token-metadata/)
- [Fungible Token Standard](https://docs.metaplex.com/programs/token-metadata/token-standard#the-fungible-standard)

### Token-2022 Extensions

- [Non-Transferable Tokens](https://solana.com/developers/guides/token-extensions/non-transferable)
- [Permanent Delegate](https://solana.com/developers/guides/token-extensions/permanent-delegate)
- [Metadata Pointer](https://solana.com/developers/guides/token-extensions/metadata-pointer)

### Related FanEngagement Documents

- [Solana Capabilities Analysis](./solana-capabilities-analysis.md) - Cost projections, PDA patterns
- [Governance Models Evaluation](./governance-models-evaluation.md) - On-chain vs off-chain voting
- [Architecture Overview](../architecture.md) - Domain model, ShareType entity

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **ATA** | Associated Token Account - deterministic token account per wallet/mint pair |
| **Burn** | Permanently destroy tokens, reducing total supply |
| **Custodial Wallet** | Wallet controlled by the platform on behalf of users |
| **HSM** | Hardware Security Module - secure key storage device |
| **KMS** | Key Management Service - cloud-based key storage |
| **Metaplex** | Solana metadata standard and tooling |
| **Mint** | Token factory that creates new tokens |
| **Mint Authority** | Account authorized to create new tokens |
| **Non-Transferable** | Tokens that cannot be moved between wallets (soulbound) |
| **PDA** | Program Derived Address - deterministic address without private key |
| **Permanent Delegate** | Token-2022 extension granting permanent control to a delegate |
| **SPL Token** | Solana Program Library Token - standard fungible token |
| **Token-2022** | Enhanced token program with extensions |

## Appendix B: Database Schema Extensions

To support tokenization, extend the ShareType entity:

```csharp
public class ShareType
{
    // Existing fields...
    public Guid Id { get; set; }
    public Guid OrganizationId { get; set; }
    public string Name { get; set; }
    public string Symbol { get; set; }
    public string? Description { get; set; }
    public decimal VotingWeight { get; set; }
    public decimal? MaxSupply { get; set; }
    public bool IsTransferable { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    
    // New fields for blockchain integration
    public string? MintAddress { get; set; }          // Solana mint public key (base58)
    public string? MetadataUri { get; set; }          // IPFS/Arweave URI for token metadata
    public string? MintCreationTxSignature { get; set; }  // Transaction that created the mint
    public BlockchainSyncStatus SyncStatus { get; set; }  // Pending, Synced, Failed
    public DateTimeOffset? LastSyncedAt { get; set; }
}

public enum BlockchainSyncStatus
{
    Pending,
    Syncing,
    Synced,
    Failed
}
```

## Appendix C: Event Payloads

### ShareTypeCreated Event

```json
{
  "eventType": "ShareTypeCreated",
  "organizationId": "abc123-...",
  "payload": {
    "shareTypeId": "st-001-...",
    "name": "Season Ticket Holder",
    "symbol": "MUFC-STH",
    "description": "Governance share for season ticket holders",
    "votingWeight": 1.0,
    "maxSupply": 10000,
    "isTransferable": true
  },
  "timestamp": "2024-11-15T10:30:00Z"
}
```

### SharesIssued Event

```json
{
  "eventType": "SharesIssued",
  "organizationId": "abc123-...",
  "payload": {
    "issuanceId": "iss-789-...",
    "shareTypeId": "st-001-...",
    "userId": "user-456-...",
    "quantity": 100,
    "newBalance": 150
  },
  "timestamp": "2024-11-15T11:00:00Z"
}
```

### SharesRevoked Event

```json
{
  "eventType": "SharesRevoked",
  "organizationId": "abc123-...",
  "payload": {
    "revocationId": "rev-321-...",
    "shareTypeId": "st-001-...",
    "userId": "user-456-...",
    "quantity": 50,
    "reason": "Membership termination",
    "newBalance": 100
  },
  "timestamp": "2024-11-15T12:00:00Z"
}
```
