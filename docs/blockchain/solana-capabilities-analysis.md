# Solana Capabilities Analysis for Governance Use Cases

> **Document Type:** Research Analysis
> **Epic:** E-004 - Blockchain Integration Initiative (Solana)
> **Status:** Complete
> **Last Updated:** November 2024

## Executive Summary

This document analyzes Solana's capabilities for implementing governance features in FanEngagement, focusing on transaction costs at scale, token program suitability for share tokenization, Program Derived Address (PDA) patterns for account management, and development framework comparisons.

**Key Findings:**

1. **Transaction costs are highly economical** - At current rates (~0.000005 SOL per signature), millions of votes would cost approximately $500-2,500 at $100-150/SOL
2. **SPL Token program (especially Token-2022)** is well-suited for share tokenization with governance-specific extensions
3. **PDA patterns** provide robust, deterministic account management ideal for organizations and proposals
4. **Anchor framework** is recommended for development due to reduced boilerplate and faster iteration
5. **Hybrid on-chain/off-chain model** recommended for MVP to balance cost, transparency, and privacy

---

## Table of Contents

1. [Transaction Cost Analysis](#1-transaction-cost-analysis)
2. [SPL Token Program Evaluation](#2-spl-token-program-evaluation)
3. [PDA Patterns for Account Management](#3-pda-patterns-for-account-management)
4. [Development Framework Comparison](#4-development-framework-comparison)
5. [Existing Governance Platforms Analysis](#5-existing-governance-platforms-analysis)
6. [Limitations and Risks](#6-limitations-and-risks)
7. [Cost Projections at Scale](#7-cost-projections-at-scale)
8. [Recommendations](#8-recommendations)
9. [References](#9-references)

---

## 1. Transaction Cost Analysis

### 1.1 Fee Structure Overview

Solana's transaction fee model consists of two components:

| Fee Type | Description | Typical Cost (SOL) | USD Equivalent (@$100/SOL) |
|----------|-------------|-------------------|---------------------------|
| **Base Fee** | Per included signature | 0.000005 | $0.0005 |
| **Priority Fee** | Optional, per compute unit | 0.000008 - 0.000016 | $0.0008 - $0.0016 |
| **Compute Units** | Measurement per instruction | ~200,000 - 1,400,000 | Depends on CU price |

**Key Points:**

- Base fee is split: 50% burned, 50% to validator
- Priority fees are 100% to validator
- Most standard transactions use a single signature
- Complex transactions (governance operations) may use 200,000-400,000 compute units

### 1.2 Cost Breakdown by Operation

For FanEngagement governance operations:

| Operation | Estimated CU | Transaction Fee (SOL) | USD (@$100/SOL) |
|-----------|-------------|----------------------|-----------------|
| Create Proposal | ~150,000 | 0.000005 - 0.000015 | $0.0005 - $0.0015 |
| Cast Vote | ~100,000 | 0.000005 - 0.000010 | $0.0005 - $0.0010 |
| Update Proposal Status | ~80,000 | 0.000005 - 0.000008 | $0.0005 - $0.0008 |
| Token Transfer (Share) | ~50,000 | 0.000005 | $0.0005 |
| Create Token Account | ~100,000 | 0.000005 - 0.000010 | $0.0005 - $0.0010 |

### 1.3 Storage (Rent) Costs

Solana accounts require rent-exempt deposits for permanent storage:

- **Rate:** 6,960 lamports per byte for 2-year rent exemption
- **Account Overhead:** 128 bytes minimum for any account
- **Calculation:** `(data_size + 128) × 6,960 lamports`

| Account Type | Estimated Size | Rent (SOL) | USD (@$100/SOL) |
|--------------|---------------|------------|-----------------|
| Organization PDA | ~500 bytes | 0.00437 | $0.44 |
| Proposal PDA | ~1,000 bytes | 0.00785 | $0.78 |
| Vote Record | ~200 bytes | 0.00228 | $0.23 |
| Token Mint | ~82 bytes | 0.00146 | $0.15 |
| Token Account | ~165 bytes | 0.00204 | $0.20 |

---

## 2. SPL Token Program Evaluation

### 2.1 SPL Token vs Token-2022 (Token Extensions)

FanEngagement share tokenization can leverage either the original SPL Token program or the newer Token-2022 program:

| Feature | SPL Token (Original) | Token-2022 |
|---------|---------------------|------------|
| Ecosystem Support | Excellent | Growing |
| Transfer Controls | Basic | Advanced (hooks, freezing) |
| Metadata | External (Metaplex) | Native support |
| Governance Extensions | None | Multiple |
| Complexity | Low | Medium |
| Audit Coverage | Extensive | Good |

### 2.2 Token-2022 Extensions Relevant to Governance

Token-2022 provides extensions particularly valuable for FanEngagement:

#### Recommended Extensions

| Extension | Governance Use Case | FanEngagement Application |
|-----------|--------------------|-----------------------------|
| **Non-Transferable (Soulbound)** | Lock voting rights to holder | Prevent share speculation/manipulation |
| **Permanent Delegate** | Emergency control, compliance | DAO recovery, regulatory compliance |
| **Transfer Hook** | Custom transfer validation | Enforce transfer rules per share type |
| **Metadata** | Native token information | Store share type details on-chain |
| **Default Account State** | Control initial account status | Require membership verification before trading |

#### Example: Soulbound Shares for Governance

```
Share Type: "Founding Member Share"
- FanEngagement DB: IsTransferable: false
- On-chain: Token-2022 mint with Non-Transferable extension enabled
- Result: Shares locked to original holder, voting power cannot be transferred
```

> **Note:** The `IsTransferable` flag exists in both the off-chain database (for UI enforcement) and
> on-chain via Token-2022's Non-Transferable extension (for protocol-level enforcement).

### 2.3 Share Tokenization Strategy

**Recommended Approach:**

1. **One Token Mint per Share Type** - Each organization's share type becomes a distinct SPL token
2. **Use Token-2022 for governance tokens** - Leverage extensions for transfer controls
3. **Use original SPL Token for tradeable shares** - Better DEX/marketplace compatibility
4. **Metadata on-chain** - Store share type info (name, symbol, voting weight) in token metadata

**Token Structure Example:**
```
Organization: "Manchester United FC"
├── Share Type: "Season Ticket Holder"
│   └── Token Mint: SPL Token (tradeable)
├── Share Type: "Founding Member"
│   └── Token Mint: Token-2022 (non-transferable)
└── Share Type: "Gold Member"
    └── Token Mint: Token-2022 (transfer hook for restrictions)
```

---

## 3. PDA Patterns for Account Management

### 3.1 PDA Overview

Program Derived Addresses (PDAs) are deterministic account addresses derived from seeds and a program ID. They're ideal for FanEngagement because:

- **Deterministic**: Same seeds always produce the same address
- **Program-controlled**: Only the program can sign for PDA accounts
- **No private keys**: Cannot be compromised via key theft
- **Efficient lookups**: Clients can derive addresses without on-chain queries

### 3.2 Recommended PDA Structure for FanEngagement

#### Organization Account

```rust
// Seeds: ["organization", organization_uuid]
// Size: ~500 bytes
pub struct OrganizationAccount {
    pub bump: u8,                    // 1 byte
    pub uuid: [u8; 16],              // 16 bytes (UUID)
    pub name: [u8; 100],             // 100 bytes
    pub admin: Pubkey,               // 32 bytes
    pub created_at: i64,             // 8 bytes
    pub proposal_count: u64,         // 8 bytes
    pub member_count: u64,           // 8 bytes
    pub metadata_uri: [u8; 200],     // 200 bytes (IPFS/Arweave URI)
    pub reserved: [u8; 127],         // Reserved for future use
}
```

#### Proposal Account

```rust
// Seeds: ["proposal", organization_pda, proposal_uuid]
// Size: ~1,000 bytes
pub struct ProposalAccount {
    pub bump: u8,                    // 1 byte
    pub uuid: [u8; 16],              // 16 bytes
    pub organization: Pubkey,        // 32 bytes
    pub creator: Pubkey,             // 32 bytes
    pub status: ProposalStatus,      // 1 byte
    pub title: [u8; 200],            // 200 bytes
    pub start_at: i64,               // 8 bytes
    pub end_at: i64,                 // 8 bytes
    pub quorum_requirement: u64,     // 8 bytes (basis points)
    pub total_votes_cast: u64,       // 8 bytes
    pub winning_option: u8,          // 1 byte
    pub quorum_met: bool,            // 1 byte
    pub eligible_voting_power: u64,  // 8 bytes (snapshot)
    pub options_count: u8,           // 1 byte
    pub results_hash: [u8; 32],      // 32 bytes (commitment)
    pub metadata_uri: [u8; 200],     // 200 bytes
    pub reserved: [u8; 242],         // Reserved
}
```

#### Vote Record Account

```rust
// Seeds: ["vote", proposal_pda, voter_pubkey]
// Size: ~200 bytes
pub struct VoteRecord {
    pub bump: u8,                    // 1 byte
    pub proposal: Pubkey,            // 32 bytes
    pub voter: Pubkey,               // 32 bytes
    pub option_index: u8,            // 1 byte
    pub voting_power: u64,           // 8 bytes
    pub voted_at: i64,               // 8 bytes
    pub signature: [u8; 64],         // 64 bytes (optional: voter signature)
    pub reserved: [u8; 54],          // Reserved
}
```

### 3.3 PDA Derivation Patterns

```typescript
// Client-side address derivation (TypeScript)

// Organization PDA
const [orgPda, orgBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("organization"), orgUuid.toBuffer()],
  PROGRAM_ID
);

// Proposal PDA
const [proposalPda, proposalBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("proposal"), orgPda.toBuffer(), proposalUuid.toBuffer()],
  PROGRAM_ID
);

// Vote Record PDA
const [votePda, voteBump] = PublicKey.findProgramAddressSync(
  [Buffer.from("vote"), proposalPda.toBuffer(), voterPubkey.toBuffer()],
  PROGRAM_ID
);
```

### 3.4 Best Practices Applied

1. **Store bump seeds**: All PDAs store their bump to enable efficient re-derivation
2. **Versioned structures**: Reserved bytes allow future upgrades without migration
3. **UUID-based seeds**: Use off-chain UUIDs to link on-chain/off-chain data
4. **Hierarchical structure**: Organization → Proposal → Vote hierarchy for access control
5. **Metadata URIs**: Store detailed data off-chain (IPFS) with on-chain URI reference

---

## 4. Development Framework Comparison

### 4.1 Anchor Framework vs Native Rust

| Aspect | Anchor Framework | Native Rust |
|--------|-----------------|-------------|
| **Learning Curve** | Moderate | Steep |
| **Development Speed** | Fast | Slow |
| **Boilerplate Code** | Minimal | Significant |
| **Account Validation** | Automatic | Manual |
| **Type Safety** | Strong (macros) | Manual |
| **Testing** | Built-in (Mocha/Chai) | Manual setup |
| **Client SDK** | Auto-generated TypeScript | Manual |
| **Flexibility** | Good (escape hatches) | Maximum |
| **Performance** | Excellent | Optimal |
| **Debugging** | Easier | Harder |

### 4.2 Recommendation: Anchor Framework

**Rationale:**

1. **Faster MVP delivery** - Anchor's code generation significantly reduces development time
2. **Reduced security risks** - Automatic account validation catches common vulnerabilities
3. **Better maintainability** - Cleaner code structure, easier onboarding for new developers
4. **TypeScript integration** - Auto-generated client SDK simplifies frontend integration
5. **Testing framework** - Built-in testing accelerates CI/CD pipeline setup

**When to Consider Native Rust:**
- Extreme optimization requirements
- Custom serialization needs
- Edge cases not supported by Anchor macros

### 4.3 Anchor Program Structure Example

```rust
use anchor_lang::prelude::*;

#[program]
pub mod fan_governance {
    use super::*;

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        uuid: [u8; 16],
        title: String,
        start_at: i64,
        end_at: i64,
        quorum_requirement: u64,
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        proposal.bump = ctx.bumps.proposal;
        proposal.uuid = uuid;
        proposal.organization = ctx.accounts.organization.key();
        proposal.creator = ctx.accounts.creator.key();
        proposal.status = ProposalStatus::Draft;
        proposal.title = title
            .as_bytes()
            .get(..100)
            .ok_or(GovernanceError::TitleTooLong)?
            .try_into()
            .map_err(|_| GovernanceError::TitleTooLong)?;
        proposal.start_at = start_at;
        proposal.end_at = end_at;
        proposal.quorum_requirement = quorum_requirement;
        Ok(())
    }

    pub fn cast_vote(
        ctx: Context<CastVote>,
        option_index: u8,
    ) -> Result<()> {
        // Validate proposal is open
        require!(
            ctx.accounts.proposal.status == ProposalStatus::Open,
            GovernanceError::ProposalNotOpen
        );

        // Calculate voting power from token balances
        let voting_power = calculate_voting_power(&ctx.accounts.voter_tokens)?;

        // Record vote
        let vote = &mut ctx.accounts.vote_record;
        vote.bump = ctx.bumps.vote_record;
        vote.proposal = ctx.accounts.proposal.key();
        vote.voter = ctx.accounts.voter.key();
        vote.option_index = option_index;
        vote.voting_power = voting_power;
        vote.voted_at = Clock::get()?.unix_timestamp;

        // Update proposal totals
        ctx.accounts.proposal.total_votes_cast += voting_power;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(uuid: [u8; 16])]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        seeds = [b"organization", organization.uuid.as_ref()],
        bump = organization.bump,
    )]
    pub organization: Account<'info, OrganizationAccount>,

    #[account(
        init,
        payer = creator,
        space = 8 + ProposalAccount::INIT_SPACE,
        seeds = [b"proposal", organization.key().as_ref(), uuid.as_ref()],
        bump,
    )]
    pub proposal: Account<'info, ProposalAccount>,

    pub system_program: Program<'info, System>,
}
```

---

## 5. Existing Governance Platforms Analysis

### 5.1 Solana Realms (SPL Governance)

**Overview:** The primary on-chain governance platform on Solana, powering major DAOs.

| Aspect | Details |
|--------|---------|
| **Architecture** | Fully on-chain voting and treasury management |
| **Token Support** | SPL Token and Token-2022 |
| **Customization** | High (plugins, custom rules) |
| **UI** | Realms web interface |
| **Adoption** | Wide (Marinade, Raydium, etc.) |

**Strengths:**
- Battle-tested codebase
- Comprehensive feature set
- Active development and maintenance

**Limitations:**
- Complex account structure
- No native delegator influence mechanism
- Quorum manipulation possible
- Requires technical expertise for custom deployments

### 5.2 Comparison with FanEngagement Requirements

| Feature | Realms | FanEngagement Need | Gap Analysis |
|---------|--------|-------------------|--------------|
| Proposal Creation | ✅ | ✅ | None |
| On-chain Voting | ✅ | ⚠️ Partial | May want hybrid |
| Quorum Management | ✅ | ✅ | None |
| Custom Token Support | ✅ | ✅ | None |
| Multi-org Support | ⚠️ Per-realm | ✅ Multi-tenant | Custom needed |
| Webhook Integration | ❌ | ✅ | Custom needed |
| Privacy (ballot secrecy) | ❌ | ⚠️ Optional | Hybrid model |
| Off-chain Database Sync | ❌ | ✅ | Custom needed |

### 5.3 Recommendation

**Build custom governance program** rather than forking Realms because:

1. FanEngagement's multi-tenant model differs from Realms' per-DAO approach
2. Webhook integration and off-chain sync are core requirements
3. Hybrid voting model requires custom implementation
4. Simpler feature set allows leaner, more maintainable code

---

## 6. Limitations and Risks

### 6.1 Technical Limitations

| Limitation | Impact | Mitigation |
|-----------|--------|------------|
| **Account Size Limits** | 10MB max per account | Use multiple accounts, off-chain storage |
| **Transaction Size** | 1232 bytes max | Batch operations, versioned transactions |
| **Compute Budget** | 1.4M CU per transaction | Optimize instructions, split complex ops |
| **Network Congestion** | Transaction failures during high load | Priority fees, retry logic |
| **Finality Time** | ~400ms slot time | Design for eventual consistency |

### 6.2 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **SOL Price Volatility** | High | Cost unpredictability | USD-based budgeting, SOL reserves |
| **Network Outages** | Low-Medium | Service disruption | Graceful degradation, off-chain backup |
| **Program Bugs** | Medium | Data loss, exploitation | Audits, upgradeable programs |
| **Key Management** | Medium | Loss of admin access | Multi-sig, key rotation |
| **Regulatory Changes** | Low | Compliance requirements | Modular design, legal review |

### 6.3 Governance-Specific Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Vote Buying** | Users selling votes for tokens | Non-transferable tokens, identity verification |
| **Sybil Attacks** | Multiple accounts to amplify voting | Membership verification, share issuance controls |
| **Front-running** | Observing votes before commitment | Commit-reveal scheme, private mempools |
| **Quorum Gaming** | Strategic non-voting to block proposals | Dynamic quorum, participation incentives |
| **Result Manipulation** | Off-chain tampering before on-chain commit | Result hashing, multi-party verification |

---

## 7. Cost Projections at Scale

### 7.1 Assumptions

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| SOL Price | $100 - $150 | Current range |
| Organizations | 100 | Year 1 target |
| Proposals/Org/Year | 20 | ~2 per month |
| Avg Votes/Proposal | 5,000 | Active communities |
| Share Types/Org | 3 | Common configuration |
| Members/Org | 10,000 | Medium-sized fan bases |

### 7.2 Transaction Cost Projection

#### Year 1 Scale (100 Organizations)

> **Calculation Basis:**
> - Token Account Creation: 100 orgs × 10,000 members × 1 primary share type = 1,000,000 accounts
>   (Each member needs a token account per share type they hold)
> - Cast Votes: 100 orgs × 20 proposals × 5,000 votes = 10,000,000 votes

| Operation | Count | Cost/Op (SOL) | Total (SOL) | USD (@$100) |
|-----------|-------|---------------|-------------|-------------|
| Create Organizations | 100 | 0.00437 | 0.437 | $44 |
| Create Share Types | 300 | 0.00146 | 0.438 | $44 |
| Token Account Creation | 1,000,000 | 0.00204 | 2,040 | $204,000 |
| Create Proposals | 2,000 | 0.00785 | 15.70 | $1,570 |
| Cast Votes | 10,000,000 | 0.000005 | 50 | $5,000 |
| **Total Transaction Fees** | - | - | **~2,100** | **~$210,000** |

> **Note:** Token account creation is the largest cost. This can be optimized by:
> - Using Associated Token Accounts (created on first transfer)
> - Having users pay for their own token account rent
> - Batching account creation

#### Optimized Cost Model

| Scenario | Approach | Year 1 Cost |
|----------|----------|-------------|
| **Platform-Paid Everything** | All accounts/fees paid by platform | ~$210,000 |
| **User-Paid Token Accounts** | Users fund their token accounts | ~$10,000 |
| **Hybrid Off-chain Votes** | Only results committed on-chain | ~$3,000 |

### 7.3 Storage Cost Projection

> **Note:** Storage rent is separate from transaction fees and is a one-time deposit
> (not ongoing). The rent amount is recoverable if the account is closed.

| Account Type | Count (Year 1) | Size | Rent (SOL) | Total (SOL) |
|--------------|---------------|------|------------|-------------|
| Organization PDAs | 100 | 500 B | 0.00437 | 0.437 |
| Proposal PDAs | 2,000 | 1,000 B | 0.00785 | 15.70 |
| Vote Records (on-chain) | 10,000,000 | 200 B | 0.00228 | 22,800 |
| Token Mints | 300 | 82 B | 0.00146 | 0.438 |
| **Total Rent** | - | - | - | **~22,800** |

> **Cost Breakdown:** Vote records represent 99%+ of storage costs.
> At $100/SOL, 22,800 SOL = $2.28M for full on-chain voting.
> This is why the hybrid model is strongly recommended.

**Hybrid Model Savings:**

- Off-chain votes with result commitment: ~$2,300 rent vs $2.28M
- 99% cost reduction for vote storage

### 7.4 Three-Year Projection

| Model | Year 1 | Year 2 | Year 3 | Total |
|-------|--------|--------|--------|-------|
| **Full On-Chain** | $2.3M | $4.6M | $9.2M | $16.1M |
| **Hybrid (recommended)** | $15K | $30K | $60K | $105K |
| **Off-Chain + Commitment Only** | $5K | $10K | $20K | $35K |

---

## 8. Recommendations

### 8.1 Architecture Recommendation

**Hybrid On-Chain/Off-Chain Model:**

```text
┌─────────────────────────────────────────────────────────────┐
│                    FanEngagement Platform                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐     ┌────────────────────────────────┐  │
│  │  On-Chain      │     │  Off-Chain (PostgreSQL)        │  │
│  │  (Solana)      │     │                                │  │
│  ├────────────────┤     ├────────────────────────────────┤  │
│  │ • Org PDAs     │     │ • Full proposal details        │  │
│  │ • Token Mints  │     │ • Individual votes             │  │
│  │ • Result Hash  │     │ • User profiles                │  │
│  │ • Proposal IDs │     │ • Webhook events               │  │
│  │ • Final Status │     │ • Audit history                │  │
│  └────────────────┘     └────────────────────────────────┘  │
│           │                         │                        │
│           └─────────┬───────────────┘                        │
│                     │                                        │
│           ┌─────────▼───────────┐                           │
│           │  Sync Service       │                           │
│           │  • Result commits   │                           │
│           │  • Token balance    │                           │
│           │  • Status updates   │                           │
│           └─────────────────────┘                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Token Strategy

1. **Phase 1 (MVP):** Use SPL Token for all share types
   - Simpler implementation
   - Better ecosystem compatibility
   - Can upgrade later

2. **Phase 2:** Migrate governance tokens to Token-2022
   - Enable non-transferable shares where needed
   - Add transfer hooks for compliance
   - Native metadata

### 8.3 Development Approach

1. **Use Anchor Framework** - Faster development, safer code
2. **Build custom program** - Don't fork Realms, build lean
3. **Progressive decentralization**:
   - MVP: Off-chain votes, on-chain results
   - V2: On-chain voting for high-stakes proposals
   - V3: Full on-chain governance option

### 8.4 Cost Management

| Strategy | Expected Savings | Implementation Effort |
|----------|------------------|----------------------|
| User-paid token accounts | 95%+ | Low |
| Hybrid voting model | 99%+ | Medium |
| Batch operations | 20-30% | Low |
| Priority fee optimization | 10-20% | Low |
| Account compression | 50-70% | High |

### 8.5 Implementation Priorities

| Priority | Item | Rationale |
|----------|------|-----------|
| P0 | Organization PDAs | Foundation for all on-chain data |
| P0 | Token mint creation | Share tokenization core feature |
| P1 | Result commitment | Verifiable governance outcomes |
| P1 | Balance sync service | Real-time voting power |
| P2 | On-chain voting option | Full transparency for key votes |
| P3 | Token-2022 migration | Advanced governance features |

---

## 9. References

### Solana Documentation

- [Transaction Fees](https://solana.com/docs/core/fees)
- [Program Derived Addresses](https://solana.com/docs/core/pda)
- [Token-2022 Extensions](https://solana.com/solutions/token-extensions)
- [Programs Overview](https://solana.com/docs/core/programs)

### Governance Platforms

- [Realms Documentation](https://docs.realms.today/)
- [SPL Governance](https://www.splgovernance.com/docs.html)
- [Solana Governance Analysis (Helius)](https://www.helius.dev/blog/solana-governance--a-comprehensive-analysis)

### Development Resources

- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Developer Resources](https://solana.com/developers)
- [Token-2022 Specification (RareSkills)](https://rareskills.io/post/token-2022)
- [PDA Best Practices (Helius)](https://www.helius.dev/blog/solana-pda)

### Tools

- [Solana Rent Calculator](https://solanarentcalculator.vercel.app/)
- [Priority Fee API (Helius)](https://www.helius.dev/docs/priority-fee-api)
- [Solana Priority Fee Tracker (QuickNode)](https://www.quicknode.com/gas-tracker/solana)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **PDA** | Program Derived Address - deterministic account addresses controlled by programs |
| **SPL Token** | Solana Program Library Token - standard fungible token program |
| **Token-2022** | Enhanced token program with extensions for advanced features |
| **Anchor** | Rust framework for Solana program development |
| **Rent** | SOL deposit required to keep account data on-chain |
| **Compute Units** | Measure of computational resources used by transactions |
| **Lamports** | Smallest unit of SOL (1 SOL = 1,000,000,000 lamports) |

## Appendix B: Related Documents

> **Note:** The following documents are planned as part of Epic E-004. Links will be updated as documents are created.

- E-004-02: Governance Models Evaluation (Planned)
- E-004-03: Tokenization Strategy (Planned)
- E-004-07: On-chain Event Model (Planned)
