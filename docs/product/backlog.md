# FanEngagement Product Backlog

This document is the **single source of truth** for product ideas, epics, and groomed user stories.

The Product Owner agent (`product-owner-agent`) may update this file to:

- Add new epics, stories, and acceptance criteria
- Refine or split existing stories
- Mark items as clarified, blocked, or ready for implementation

Status and priority are **proposals**, not commitments. Final decisions are made by a human product owner/architect.

---

## 1. Product Vision (High-Level)

> Short, human-written description of what FanEngagement is trying to achieve over the next 6–24 months.

- Increase meaningful fan participation in governance decisions
- Provide OrgAdmins with clear, actionable tools to manage proposals and members
- Make it easy for members to discover, understand, and vote on relevant proposals

The Product Owner agent may **suggest edits**, but humans own this section.

---

## 2. Themes

High-level, long-lived areas of focus.

| Theme ID | Name                            | Description                                             |
| :------- | :------------------------------ | :------------------------------------------------------ |
| T1       | Member Engagement               | Make it easier and more rewarding for members to engage |
| T2       | OrgAdmin Efficiency             | Reduce friction for OrgAdmins running governance        |
| T3       | Governance Transparency & Trust | Improve clarity of proposals, results, and auditing     |
| T4       | Integrations & Webhooks         | Improve webhook reliability, observability, and UX      |
| T5       | Blockchain & Web3               | Leverage blockchain for verifiable governance, tokenized shares, and on-chain transparency |

The Product Owner agent may **propose new themes**, but should not remove existing ones without explicit instruction.

---

## 3. Epics Overview

This section is a catalog of active / potential epics. Detailed stories live in section 4.

| Epic ID | Theme | Title                                   | Status   | Priority | Owner | Notes                     |
| :------ | :---- | :-------------------------------------- | :------- | :------- | :---- | :------------------------ |
| E-001   | T1    | Improve Member Proposal Discovery       | Proposed | Next     | Brent | Initial draft by PO agent |
| E-002   | T2    | Streamline OrgAdmin Proposal Management | Drafting | Now      | Brent |                           |
| E-003   | T3    | Enhance Governance Results Transparency | Backlog  | Later    | TBD   |                           |
| E-004   | T5    | Blockchain Integration Initiative (Solana): Discovery → MVP Definition → Implementation Planning | Superseded | Next | TBD | **SUPERSEDED by E-007** - Original direct Solana integration approach; archived stories in docs/product/archive/E-004-*.md |
| E-005   | T3    | Audit Logging Across the Application | Proposed | Next | TBD | Comprehensive audit trail for governance, security, compliance; PO agent comprehensive epic |
| E-006   | T3    | Security Documentation Update and Enhancements | Proposed | Now      | TBD   | Update outdated auth docs; verify test coverage; optional security enhancements |
| E-007   | T5    | Blockchain Adapter Platform — Dockerized API for Multi-Chain Support | Proposed | Next | TBD | Modular multi-chain architecture with isolated Docker containers for Solana, Polygon, and future blockchains |
| E-008   | T1/T2 | Frontend User Experience & Navigation Overhaul | Proposed | Next | TBD | Comprehensive UI/UX improvement: navigation redesign, design system, accessibility, micro-interactions, responsive polish |

**Status values (for the PO agent to use):**

- `Proposed` – new epic, needs human review
- `Drafting` – stories and acceptance criteria being fleshed out
- `Ready` – stories are well-formed and can be turned into issues
- `In Progress` – implementation has begun
- `Done` – delivered and verified

**Priority values:**

- `Now`, `Next`, `Later`, `Someday`

The Product Owner agent:

- MAY add rows with `Status = Proposed`
- MAY update `Notes`
- SHOULD NOT change `Owner`, `Priority`, or `Status` from `Ready` onward unless instructed.

---

## 4. Epic Details and User Stories

Each epic gets its own subsection. This is where the Product Owner agent spends most of its time.

### E-001 – Improve Member Proposal Discovery (Theme: T1, Status: Proposed)

#### Motivation

Members can belong to multiple organizations and may miss open proposals. We want to make it easy to see “what needs my attention” in one place.

#### Target users / roles

- Primary: Member (OrganizationRole.Member)
- Secondary: OrgAdmin, PlatformAdmin (for monitoring engagement)

#### Success signals (hypothetical)

- Increased number of proposals with quorum met
- Higher percentage of members voting at least once per month

#### Stories

##### Story E-001-01

> As a **member**, I want a **single view of all open proposals I can vote on** across my organizations, so that I **don’t miss important decisions**.

**Status:** Proposed  
**Priority:** Next  

###### Acceptance Criteria

- [ ] Shows all proposals in `Open` status where the user:
  - Is a member of the organization, and
  - Has non-zero voting power per governance rules.
- [ ] Allows filtering by:
  - Organization
  - Proposal status (Open, Closed, Finalized)
- [ ] Each proposal entry links directly to the proposal voting page.
- [ ] Respects authorization rules (no leakage across orgs).
- [ ] Includes an empty state when there are no open proposals.

###### Notes for implementation

- Frontend: likely `/me/proposals` or expansion of `/me/home`
- Backend: may require a cross-org “my open proposals” endpoint

---

##### Story E-001-02

> As a **member**, I want to **see which proposals are about to close soon**, so that I can **prioritize my attention**.

**Status:** Proposed  
**Priority:** Later  

###### Acceptance Criteria

- [ ] List or indicator of proposals closing within the next configurable window (e.g., 24–72 hours).
- [ ] Sorting by time-to-close.
- [ ] Clear visual emphasis on “closing soon”.

---

### E-002 – Streamline OrgAdmin Proposal Management (Theme: T2, Status: Drafting)

> [The Product Owner agent may add epics/stories here, following the same structure.]

---

### E-004 – Blockchain Integration Initiative (Solana): Discovery → MVP Definition → Implementation Planning (Theme: T5, Status: Proposed)

#### Problem Statement

FanEngagement currently operates as a centralized governance platform where all proposal lifecycle events, voting records, share balances, and governance outcomes are stored exclusively in a PostgreSQL database. While this approach is functional and performant, it presents several limitations:

1. **Trust & Verification Gap**: Users must trust that the platform accurately records and reports votes and governance outcomes. There is no independent mechanism for members to verify that their votes were counted correctly or that results have not been tampered with.

2. **Auditability Limitations**: Organizations and their members cannot independently audit governance decisions without relying on platform-generated reports. External auditors or regulatory bodies have no cryptographic proof of governance integrity.

3. **Limited Market Differentiation**: The fan engagement and governance platform market is increasingly competitive. Blockchain-backed governance provides a clear differentiator that signals commitment to transparency and modern technology adoption.

4. **Future-Proofing Constraints**: As Web3 adoption grows among fan communities (particularly in sports, entertainment, and gaming), platforms without blockchain capabilities risk obsolescence. Early integration positions FanEngagement for future enhancements like tokenized membership, decentralized governance, and marketplace features.

**Why Solana?**

Solana offers unique advantages for FanEngagement's blockchain integration:

- **High Throughput**: Up to 65,000 transactions per second, enabling real-time on-chain event recording without bottlenecks during high-volume voting periods
- **Low Transaction Costs**: Sub-cent transaction fees make it economically viable to record individual votes and governance events on-chain
- **Fast Finality**: ~400ms block times provide near-instant confirmation of on-chain operations
- **SPL Token Standard**: Mature token standard suitable for representing share types as fungible tokens
- **Program Derived Addresses (PDAs)**: Enable deterministic, wallet-less account management for organizations and proposals
- **Active Developer Ecosystem**: Strong tooling (Anchor framework), documentation, and community support
- **Enterprise Adoption**: Growing adoption by enterprises and gaming platforms validates Solana for production use cases

#### Vision & Goals

**Strategic Intent:**

Transform FanEngagement into a hybrid Web2/Web3 governance platform that combines the usability of traditional web applications with the transparency and verifiability of blockchain technology.

**Core Goals:**

1. **Transparency Through Immutability**: Record key governance events on Solana to provide cryptographic proof of governance integrity. Organizations can point to on-chain records as immutable evidence of governance decisions.

2. **Tokenized Share Balances**: Represent organization share types as SPL tokens, enabling verifiable ownership and setting the foundation for future transferability and marketplace features.

3. **Verifiable Voting Records**: Commit vote summaries or individual votes to Solana, allowing members and external parties to verify voting outcomes.

4. **Web2 User Experience**: Achieve all blockchain benefits WITHOUT requiring users to manage wallets, seed phrases, or gas fees. The platform handles all blockchain interactions transparently on behalf of users.

5. **Incremental Adoption**: Design the integration so organizations can opt into blockchain features gradually, from basic event logging to full tokenization.

6. **Developer Experience**: Provide clear documentation, local development tooling, and test infrastructure that enables the development team to work effectively with Solana.

#### Discovery Scope

The discovery phase must investigate all areas where blockchain could add value to FanEngagement:

**A. Proposal Lifecycle Commitments**

- Record proposal status transitions (Draft → Open → Closed → Finalized) on-chain
- Include cryptographic hash of proposal content at each transition
- Enable "View on Solana Explorer" links from proposal detail pages
- Consider: On-chain proposal creation vs. off-chain creation with on-chain commitments

**B. Vote Recording and Proof-of-Vote**

- Options range from full on-chain voting to off-chain voting with result commitment
- Full on-chain: Each vote is a Solana transaction (high cost, maximum transparency)
- Commitment model: Aggregate votes off-chain, commit Merkle root of votes on-chain (lower cost, verifiable)
- Hybrid: Record vote count/power per option on-chain, keep individual votes off-chain
- Consider: Privacy implications of on-chain voting vs. commitment models

**C. Share Balances as SPL Tokens**

- Create SPL token mint per ShareType per organization
- Issue tokens to platform-managed wallets when shares are issued
- Token balances represent voting power (alternative to database balances)
- Consider: Token metadata, mint authority management, burn mechanics

**D. Membership Identity Proofs**

- Issue proof-of-membership as on-chain records or NFTs
- Enable members to prove organization membership to third parties
- Consider: Privacy implications, opt-in vs. automatic issuance

**E. On-Chain Transparency Reports**

- Periodic commitment of organization governance summaries
- Include metrics: total proposals, participation rates, quorum achievements
- Enable organizations to demonstrate governance health to stakeholders

**F. Auditability Across Organizations**

- Platform-wide governance integrity proofs
- Cross-organization governance analytics from on-chain data
- Enable third-party audit tools to verify platform governance

**G. Future Marketplace and Token Utility Models**

- Explore secondary market potential for transferable shares
- Consider utility token models for premium features
- Investigate DAO-like governance for platform decisions

**Solana-Specific Patterns to Evaluate:**

- **SPL Token Program**: For tokenized shares
- **Program Derived Addresses (PDAs)**: For deterministic organization/proposal accounts
- **Anchor Framework**: For Solana program development with type safety
- **Metaplex Token Metadata**: For rich token/NFT metadata
- **Cross-Program Invocations (CPI)**: For composable on-chain logic
- **Account Compression**: For cost-effective NFT/proof issuance at scale

**Constraints and Risks:**

- **Key Management**: Platform must securely manage signing keys for all on-chain operations
- **Consistency**: Database and blockchain state must remain synchronized
- **Cost Scaling**: Transaction costs at scale (millions of votes, thousands of proposals)
- **Regulatory**: Tokenized shares may have regulatory implications in some jurisdictions
- **Latency**: On-chain operations add latency to governance workflows
- **Recovery**: Handling failed transactions, retries, and blockchain reorgs

#### MVP Definition

The MVP must deliver clear blockchain value while minimizing complexity and user friction.

**MVP Scope (Must-Have):**

1. **Tokenize Organization Share Types as SPL Tokens**
   - Each ShareType creates a corresponding SPL token mint on Solana
   - Mint authority held by platform (no user wallet management)
   - Token issuance mirrors database share issuance
   - Foundation for future on-chain balance verification

2. **Record Proposal Lifecycle Events On-Chain**
   - Commit proposal state transitions to Solana
   - Include: proposal ID, organization ID, status, timestamp, content hash
   - Transactions signed by platform wallet
   - Enable "View on Solana Explorer" from proposal detail UI

3. **Commit Proposal Results to Solana**
   - When proposal closes, commit results hash to Solana
   - Include: winning option, total voting power, quorum status
   - Provides cryptographic proof of outcome
   - Results remain auditable even if database is modified

4. **Backend Solana Service Layer**
   - New infrastructure service wrapping Solana RPC interactions
   - Handles transaction building, signing, and submission
   - Implements retry logic and error handling
   - Provides async confirmation tracking

5. **Local Development Environment**
   - Solana test validator configuration
   - Local token program deployment
   - Integration test support for Solana interactions
   - Developer documentation for setup

6. **"View on Solana Explorer" UI Links**
   - Display Solana transaction/account links on relevant pages
   - Link from: ShareType detail, Proposal detail, Organization detail
   - Clear visual indicator of blockchain-verified items

**MVP Out-of-Scope (Future Enhancements):**

- User wallet management or connection
- On-chain voting (votes remain in database)
- Token transfers between users
- Membership NFTs or badges
- DAO governance features
- Marketplace features
- Cross-organization token interoperability

**MVP User Experience:**

- Users experience NO change to their workflow
- No wallets, no gas fees, no seed phrases
- Blockchain features are "behind the scenes" with optional transparency links
- Organizations can view on-chain verification but don't manage it

#### Acceptance Criteria for MVP

**Technical Completion:**

- [ ] SPL token mint created for each new ShareType
- [ ] Token issuance transaction submitted when shares are issued
- [ ] Proposal Open/Close/Finalize transitions create Solana transactions
- [ ] Proposal results committed to Solana with content hash
- [ ] All Solana transactions include relevant metadata (org ID, proposal ID, etc.)
- [ ] Retry mechanism handles transient Solana RPC failures
- [ ] Error logging captures all Solana interaction failures

**Frontend Completion:**

- [ ] "View on Solana Explorer" link on ShareType detail page
- [ ] "View on Solana Explorer" link on Proposal detail page
- [ ] Visual indicator (icon/badge) for blockchain-verified proposals
- [ ] Links work for devnet (development) and mainnet (production)

**Infrastructure Completion:**

- [ ] Solana RPC client integrated into backend
- [ ] Platform wallet keypair management (secure storage)
- [ ] Local test validator scripts for development
- [ ] Environment configuration for devnet/mainnet endpoints

**Testing Completion:**

- [ ] Unit tests for Solana service layer (mocked RPC)
- [ ] Integration tests with local test validator
- [ ] E2E tests verifying blockchain links appear correctly
- [ ] Performance tests for transaction throughput

**Documentation Completion:**

- [ ] Architecture documentation updated with blockchain components
- [ ] Developer setup guide for local Solana environment
- [ ] Operations runbook for mainnet deployment
- [ ] Security documentation for key management

#### Dependencies

**External Dependencies:**

- Solana RPC endpoint (Helius, QuickNode, or other provider)
- Solana devnet/testnet for staging environments
- Secure key management solution (Azure Key Vault, AWS KMS, HashiCorp Vault)

**Internal Dependencies:**

- Existing ShareType and ShareIssuance services (to trigger token operations)
- Existing ProposalService (to trigger lifecycle event commits)
- Existing OutboundEvent infrastructure (potential model for async blockchain operations)
- Backend configuration system (for RPC endpoints, keys)

**Skills/Knowledge Requirements:**

- Solana program development (Rust/Anchor) – for any custom on-chain programs
- Solana RPC client usage (.NET or TypeScript)
- SPL Token program interaction
- Cryptographic key management best practices

---

#### Story Breakdown

##### Group 1: Discovery & Research Stories

###### Story E-004-01

> As an **architect**, I want to **analyze Solana's capabilities for governance use cases**, so that **we can make informed decisions about on-chain vs. off-chain tradeoffs**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document Solana transaction costs at expected scale (1000s of proposals, millions of votes)
- [ ] Evaluate SPL Token program suitability for share tokenization
- [ ] Assess PDA patterns for organization/proposal account management
- [ ] Compare Anchor vs. native Rust development approaches
- [ ] Identify limitations or risks for governance use case
- [ ] Produce recommendation document with cost projections

**Notes for implementation:**

- Research task, no code changes
- Output: Technical analysis document in `docs/blockchain/`

---

###### Story E-004-02

> As an **architect**, I want to **evaluate governance models (on-chain vs. off-chain voting)**, so that **we can choose the right balance of transparency and cost**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document full on-chain voting model (cost, latency, privacy implications)
- [ ] Document off-chain voting with result commitment model
- [ ] Document hybrid approaches (vote counts on-chain, individual votes off-chain)
- [ ] Compare with existing governance platforms (Snapshot, Realms, Governor Bravo)
- [ ] Recommend MVP approach with rationale
- [ ] Identify migration path from MVP to full on-chain voting (if desired)

**Notes for implementation:**

- Research task, no code changes
- Consider privacy regulations (GDPR implications of on-chain votes)

---

###### Story E-004-03

> As an **architect**, I want to **define the tokenization strategy for ShareTypes**, so that **we have a clear model for representing shares as SPL tokens**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Define SPL token mint creation workflow (when, where, who)
- [ ] Define token metadata structure (name, symbol, decimals, URI)
- [ ] Define mint authority management (platform-controlled vs. multisig)
- [ ] Define token issuance workflow (database → blockchain synchronization)
- [ ] Address MaxSupply enforcement (on-chain vs. application-level)
- [ ] Document burn mechanics for share revocation
- [ ] Produce token design document

**Notes for implementation:**

- Research task, no code changes
- Consider Metaplex Token Metadata standard

---

###### Story E-004-04

> As a **developer**, I want to **understand Solana key management best practices**, so that **we can securely manage platform signing keys**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document key generation and storage options (file, HSM, cloud KMS)
- [ ] Evaluate Solana keypair formats and derivation paths
- [ ] Define key rotation strategy
- [ ] Define backup and recovery procedures
- [ ] Assess multi-signature requirements for high-value operations
- [ ] Produce security requirements document

**Notes for implementation:**

- Critical security research
- Must involve security review before implementation

---

###### Story E-004-05

> As a **developer**, I want to **set up a local Solana development environment**, so that **I can develop and test blockchain features locally**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document Solana CLI installation (solana, spl-token, anchor)
- [ ] Configure local test validator startup script
- [ ] Create airdrop script for local SOL funding
- [ ] Verify SPL token program availability on local validator
- [ ] Document common development workflows
- [ ] Add setup instructions to `docs/development.md`

**Notes for implementation:**

- DevOps/tooling task
- Add scripts to `./scripts/` directory

---

###### Story E-004-06

> As a **developer**, I want to **evaluate Solana RPC client options for .NET**, so that **we can choose the best library for backend integration**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Evaluate Solnet (.NET Solana SDK) capabilities and maturity
- [ ] Evaluate alternative approaches (HTTP client to RPC, TypeScript sidecar)
- [ ] Test basic operations: balance check, transaction submission, account read
- [ ] Assess async/await support and error handling
- [ ] Benchmark performance for expected operations
- [ ] Recommend approach with rationale

**Notes for implementation:**

- Technical spike, may involve prototype code
- Prototype code goes in `/tmp/` or spike branch

---

##### Group 2: Architecture & MVP Definition Stories

###### Story E-004-07

> As an **architect**, I want to **design the on-chain event model**, so that **we have a clear schema for what data is committed to Solana**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define event types to be recorded on-chain:
  - ShareType created
  - Shares issued
  - Proposal opened
  - Proposal closed (with results hash)
  - Proposal finalized
- [ ] Define data structure for each event type
- [ ] Define hash/commitment format for large payloads
- [ ] Define Solana account structure (PDAs vs. token accounts)
- [ ] Document storage costs per event type
- [ ] Produce on-chain data model document

**Notes for implementation:**

- Architecture task
- Influences both backend service design and any custom Solana programs

---

###### Story E-004-08

> As an **architect**, I want to **design the token minting model**, so that **ShareTypes can be represented as SPL tokens**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define mint creation workflow (triggered by ShareType creation)
- [ ] Define mint address derivation (PDA based on org ID + share type ID)
- [ ] Define metadata content (name, symbol, description, org branding)
- [ ] Define authority structure (mint authority, freeze authority)
- [ ] Define decimals strategy (whole tokens vs. fractional)
- [ ] Document integration with existing ShareType service

**Notes for implementation:**

- Architecture task
- Must align with existing domain model

---

###### Story E-004-09

> As an **architect**, I want to **design the database-to-blockchain synchronization model**, so that **we maintain consistency between systems**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define synchronization approach:
  - Synchronous (commit to blockchain before database commit)
  - Asynchronous (commit to database, queue blockchain operation)
  - Eventual consistency model
- [ ] Define failure handling:
  - Database committed, blockchain failed
  - Blockchain committed, database failed
  - Partial failures during batch operations
- [ ] Define retry and reconciliation strategy
- [ ] Define monitoring and alerting for sync failures
- [ ] Recommend approach with tradeoffs documented

**Notes for implementation:**

- Critical architecture decision
- Consider existing OutboundEvent pattern as model

---

###### Story E-004-10

> As an **architect**, I want to **design the backend Solana service architecture**, so that **blockchain interactions are well-encapsulated**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define service interface (`ISolanaService` or similar)
- [ ] Define operations:
  - CreateTokenMint
  - MintTokens
  - CommitProposalEvent
  - GetTransactionStatus
  - GetAccountInfo
- [ ] Define configuration model (RPC endpoints, keypair location)
- [ ] Define dependency injection registration
- [ ] Align with existing Infrastructure service patterns
- [ ] Produce service design document

**Notes for implementation:**

- Architecture task
- Follows existing Infrastructure layer patterns

---

###### Story E-004-11

> As an **architect**, I want to **design the data model updates for blockchain references**, so that **entities can store Solana transaction/account references**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define new fields on existing entities:
  - `ShareType.SolanaMintAddress` (string, nullable)
  - `ShareType.SolanaMintTransactionSignature` (string, nullable)
  - `ShareIssuance.SolanaTransactionSignature` (string, nullable)
  - `Proposal.SolanaAccountAddress` (string, nullable)
  - `Proposal.SolanaOpenTransactionSignature` (string, nullable)
  - `Proposal.SolanaCloseTransactionSignature` (string, nullable)
  - `Proposal.SolanaFinalizeTransactionSignature` (string, nullable)
- [ ] Define EF Core migration strategy
- [ ] Document index requirements for blockchain fields
- [ ] Produce data model change document

**Notes for implementation:**

- Architecture task
- Creates EF migration work items

---

###### Story E-004-12

> As a **designer**, I want to **design the UX for blockchain verification links**, so that **users can easily access Solana Explorer**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define visual indicator for blockchain-verified items (icon, badge)
- [ ] Define link placement on ShareType detail page
- [ ] Define link placement on Proposal detail page
- [ ] Define behavior when blockchain reference is pending/unavailable
- [ ] Define Solana Explorer URL patterns (devnet vs. mainnet)
- [ ] Produce UX mockups or specifications

**Notes for implementation:**

- UX/Design task
- Should be subtle/non-intrusive for Web2 users

---

##### Group 3: Implementation Planning & Coding Agent Stories

###### Story E-004-13

> As a **developer**, I want to **integrate Solana RPC client into the backend**, so that **services can interact with Solana**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Add Solana client library dependency (Solnet or chosen alternative)
- [ ] Create `SolanaConfiguration` class for settings
- [ ] Configure RPC endpoint settings per environment (devnet, mainnet)
- [ ] Register Solana client in dependency injection
- [ ] Create health check for Solana RPC connectivity
- [ ] Add to `appsettings.json` and `appsettings.Development.json`

**Notes for implementation:**

- Coding Agent task
- Infrastructure layer change
- Add to existing health check endpoint

---

###### Story E-004-14

> As a **developer**, I want to **configure local test validator for development**, so that **developers can test Solana features locally**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `scripts/solana-local-up.sh` to start test validator
- [ ] Create `scripts/solana-local-down.sh` to stop test validator
- [ ] Configure test validator with SPL token program
- [ ] Create airdrop script for local wallet funding
- [ ] Update Docker Compose for optional Solana validator container
- [ ] Document local setup in `docs/development.md`

**Notes for implementation:**

- Coding Agent task
- DevOps/tooling work

---

###### Story E-004-15

> As a **developer**, I want to **implement secure keypair management**, so that **the platform can sign Solana transactions**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `ISolanaKeyProvider` interface
- [ ] Implement file-based keypair provider (development only)
- [ ] Implement environment variable keypair provider
- [ ] Add configuration for keypair source selection
- [ ] Document production key management requirements
- [ ] Add warning log when using insecure key storage

**Notes for implementation:**

- Coding Agent task
- Critical security component
- Production implementation (HSM/KMS) may be separate story

---

###### Story E-004-16

> As a **developer**, I want to **create SPL token mint per ShareType**, so that **shares are represented as on-chain tokens**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `ISolanaTokenService` interface with `CreateMintAsync` method
- [ ] Implement mint creation with:
  - Deterministic mint address (PDA based on org ID + share type ID)
  - Platform wallet as mint authority
  - Appropriate decimals (0 for whole shares)
- [ ] Add metadata using Metaplex Token Metadata program
- [ ] Store mint address and transaction signature on ShareType entity
- [ ] Handle idempotency (don't recreate existing mints)
- [ ] Add unit tests with mocked Solana client
- [ ] Add integration test with local test validator

**Notes for implementation:**

- Coding Agent task
- Modify ShareTypeService to call Solana service after database commit

---

###### Story E-004-17

> As a **developer**, I want to **record proposal lifecycle events on-chain**, so that **governance transitions are immutable**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `ISolanaGovernanceService` interface
- [ ] Implement `CommitProposalOpenAsync` method:
  - Create memo transaction with proposal data hash
  - Include: proposal ID, org ID, status, timestamp, content hash
- [ ] Implement `CommitProposalCloseAsync` method:
  - Include: results hash, winning option, total votes, quorum status
- [ ] Implement `CommitProposalFinalizeAsync` method
- [ ] Store transaction signatures on Proposal entity
- [ ] Integrate with existing ProposalService lifecycle methods
- [ ] Add retry logic for transient RPC failures
- [ ] Add unit and integration tests

**Notes for implementation:**

- Coding Agent task
- Consider using Solana Memo program for simple data commitment
- May require custom Solana program for structured data

---

###### Story E-004-18

> As a **developer**, I want to **commit proposal results hash to Solana**, so that **outcomes are cryptographically verifiable**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define results hash format (SHA-256 of canonical results JSON)
- [ ] Compute results hash when proposal closes
- [ ] Commit hash to Solana via memo or custom program
- [ ] Store results hash and transaction signature
- [ ] Provide verification endpoint to compare on-chain vs. database hash
- [ ] Add tests for hash computation and verification

**Notes for implementation:**

- Coding Agent task
- Builds on E-004-17

---

###### Story E-004-19

> As a **developer**, I want to **create a backend service wrapping Solana interactions**, so that **blockchain operations are abstracted from business logic**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `SolanaService` implementing `ISolanaService`
- [ ] Implement methods:
  - `SubmitTransactionAsync(transaction)`
  - `GetTransactionStatusAsync(signature)`
  - `GetAccountInfoAsync(address)`
  - `BuildMemoTransaction(data)`
- [ ] Implement retry with exponential backoff
- [ ] Implement structured logging for all operations
- [ ] Add metrics for transaction success/failure rates
- [ ] Handle rate limiting from RPC provider
- [ ] Add comprehensive error handling

**Notes for implementation:**

- Coding Agent task
- Core infrastructure service
- Pattern similar to existing webhook delivery service

---

###### Story E-004-20

> As a **developer**, I want to **add Solana Explorer links to the frontend**, so that **users can verify blockchain records**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `SolanaExplorerLink` React component
- [ ] Accept props: transaction signature or account address
- [ ] Generate correct URL for configured network (devnet/mainnet)
- [ ] Display subtle icon/badge (e.g., chain link icon)
- [ ] Handle null/pending blockchain references gracefully
- [ ] Add to ShareType detail page
- [ ] Add to Proposal detail page
- [ ] Add unit tests for component

**Notes for implementation:**

- Coding Agent task
- Frontend work
- Use existing component patterns

---

###### Story E-004-21

> As a **developer**, I want to **add database migrations for blockchain fields**, so that **entities can store Solana references**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create EF Core migration adding:
  - `ShareTypes.SolanaMintAddress` (varchar 64, nullable)
  - `ShareTypes.SolanaMintTransactionSignature` (varchar 128, nullable)
  - `ShareIssuances.SolanaTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaAccountAddress` (varchar 64, nullable)
  - `Proposals.SolanaOpenTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaCloseTransactionSignature` (varchar 128, nullable)
  - `Proposals.SolanaFinalizeTransactionSignature` (varchar 128, nullable)
- [ ] Add appropriate indexes for query patterns
- [ ] Test migration up and down
- [ ] Update entity classes with new properties

**Notes for implementation:**

- Coding Agent task
- EF Core migration
- Non-breaking (all fields nullable)

---

###### Story E-004-22

> As a **developer**, I want to **add developer documentation for Solana integration**, so that **team members can work with blockchain features**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create `docs/blockchain/` directory
- [ ] Create `docs/blockchain/architecture.md` with:
  - Overview of blockchain integration
  - Component diagram
  - Data flow descriptions
- [ ] Create `docs/blockchain/development.md` with:
  - Local setup instructions
  - Common development tasks
  - Troubleshooting guide
- [ ] Create `docs/blockchain/operations.md` with:
  - Deployment considerations
  - Monitoring and alerting
  - Key management procedures
- [ ] Update main `docs/architecture.md` with blockchain section reference

**Notes for implementation:**

- Coding Agent task (documentation)
- Follows existing documentation patterns

---

###### Story E-004-23

> As a **developer**, I want to **create integration tests for Solana interactions**, so that **blockchain features are verified in CI**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create test fixture that starts local test validator
- [ ] Create tests for:
  - Token mint creation
  - Token issuance
  - Memo transaction submission
  - Transaction status retrieval
- [ ] Tests run against local validator (not devnet)
- [ ] Tests are idempotent and isolated
- [ ] CI pipeline includes Solana test validator setup
- [ ] Document test setup in `docs/blockchain/development.md`

**Notes for implementation:**

- Coding Agent task (testing)
- May require CI pipeline updates

---

###### Story E-004-24

> As a **developer**, I want to **implement error handling and observability for blockchain operations**, so that **failures are properly tracked and debugged**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Define custom exception types for Solana errors:
  - `SolanaTransactionFailedException`
  - `SolanaRpcException`
  - `SolanaTimeoutException`
- [ ] Add structured logging with:
  - Transaction signature
  - Operation type
  - Error details
  - Retry count
- [ ] Add metrics:
  - `solana_transactions_total` (counter, tags: success, operation_type)
  - `solana_transaction_latency_seconds` (histogram)
  - `solana_rpc_errors_total` (counter, tags: error_type)
- [ ] Integrate with existing `FanEngagementMetrics` service
- [ ] Add alerting thresholds documentation

**Notes for implementation:**

- Coding Agent task
- Follows existing observability patterns

---

##### Group 4: Future (Non-MVP) Enhancement Stories

###### Story E-004-25

> As a **member**, I want to **connect my personal Solana wallet**, so that **I can self-custody my share tokens**.

**Status:** Proposed  
**Priority:** Later (Post-MVP)  

**Acceptance Criteria:**

- [ ] Integrate wallet adapter (Phantom, Solflare, etc.)
- [ ] Allow user to link wallet address to account
- [ ] Enable token transfer from platform custody to user wallet
- [ ] Handle wallet signature for identity verification
- [ ] Update voting flow to optionally use wallet signature

**Notes for implementation:**

- Future enhancement
- Requires significant UX and security work

---

###### Story E-004-26

> As a **member**, I want to **receive NFT membership badges**, so that **I can prove my organization membership on-chain**.

**Status:** Proposed  
**Priority:** Later (Post-MVP)  

**Acceptance Criteria:**

- [ ] Design NFT metadata schema for membership badges
- [ ] Create NFT mint per organization for membership proofs
- [ ] Issue NFT when user joins organization
- [ ] Burn or revoke NFT when membership ends
- [ ] Display badge on member profile

**Notes for implementation:**

- Future enhancement
- Consider using compressed NFTs for cost efficiency

---

###### Story E-004-27

> As an **organization**, I want to **enable a secondary market for share tokens**, so that **members can trade shares with each other**.

**Status:** Proposed  
**Priority:** Someday (Post-MVP)  

**Acceptance Criteria:**

- [ ] Enable token transfers between wallets
- [ ] Create or integrate with DEX/marketplace
- [ ] Implement royalty/fee structure for organizations
- [ ] Handle regulatory compliance requirements
- [ ] Update voting power calculation for traded shares

**Notes for implementation:**

- Future enhancement
- Significant regulatory and legal considerations

---

###### Story E-004-28

> As a **platform**, I want to **implement DAO-like governance features**, so that **organizations can operate as on-chain DAOs**.

**Status:** Proposed  
**Priority:** Someday (Post-MVP)  

**Acceptance Criteria:**

- [ ] Integrate with existing DAO frameworks (Realms, SPL Governance)
- [ ] Enable on-chain proposal creation
- [ ] Enable on-chain voting with token-gated participation
- [ ] Implement on-chain execution of proposal outcomes
- [ ] Provide migration path from off-chain to on-chain governance

**Notes for implementation:**

- Future enhancement
- Major architectural shift

---

###### Story E-004-29

> As a **platform**, I want to **create a decentralized organization registry**, so that **organization metadata is publicly verifiable**.

**Status:** Proposed  
**Priority:** Someday (Post-MVP)  

**Acceptance Criteria:**

- [ ] Store organization metadata on-chain
- [ ] Enable third-party discovery of organizations
- [ ] Implement verification/attestation system
- [ ] Create public API for registry queries

**Notes for implementation:**

- Future enhancement
- Decentralization milestone

---

###### Story E-004-30

> As an **analyst**, I want to **build governance analytics from on-chain data**, so that **I can create transparency reports from immutable records**.

**Status:** Proposed  
**Priority:** Later (Post-MVP)  

**Acceptance Criteria:**

- [ ] Create indexer for on-chain governance events
- [ ] Build analytics dashboard from indexed data
- [ ] Compare on-chain vs. off-chain metrics
- [ ] Publish transparency reports

**Notes for implementation:**

- Future enhancement
- May use third-party indexing services

---

##### Group 5: Risk, Security, and Compliance Stories

###### Story E-004-31

> As a **security engineer**, I want to **implement production key management**, so that **signing keys are protected according to best practices**.

**Status:** Proposed  
**Priority:** Now (Pre-MVP Launch)  

**Acceptance Criteria:**

- [ ] Evaluate HSM vs. cloud KMS options:
  - AWS KMS with asymmetric keys
  - Azure Key Vault
  - HashiCorp Vault
  - Dedicated HSM
- [ ] Implement key storage integration
- [ ] Implement secure signing workflow
- [ ] Define key rotation procedures
- [ ] Define incident response for key compromise
- [ ] Security review and penetration testing

**Notes for implementation:**

- Critical security work
- Must complete before mainnet deployment

---

###### Story E-004-32

> As a **security engineer**, I want to **define the transaction signing model**, so that **unauthorized transactions cannot be submitted**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Define which operations require signing
- [ ] Implement signing authorization checks
- [ ] Log all signing operations with audit trail
- [ ] Implement rate limiting for signing operations
- [ ] Define multi-signature requirements for high-value operations
- [ ] Document threat model for signing system

**Notes for implementation:**

- Security architecture task
- Input to key management implementation

---

###### Story E-004-33

> As a **security engineer**, I want to **implement replay attack prevention**, so that **transactions cannot be maliciously resubmitted**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Document Solana's built-in replay protection (recent blockhash)
- [ ] Implement application-level idempotency
- [ ] Track submitted transaction signatures
- [ ] Prevent duplicate submission of same operation
- [ ] Add tests for replay scenarios

**Notes for implementation:**

- Security implementation
- Solana has built-in protection; application layer adds defense in depth

---

###### Story E-004-34

> As a **security engineer**, I want to **implement fraud and tampering protections**, so that **blockchain records accurately reflect platform state**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Implement verification that on-chain data matches database
- [ ] Create reconciliation job for detecting discrepancies
- [ ] Alert on detected tampering or inconsistencies
- [ ] Document response procedures for detected issues
- [ ] Implement audit logging for all blockchain operations

**Notes for implementation:**

- Security and operations work
- Part of consistency/synchronization strategy

---

###### Story E-004-35

> As an **operator**, I want to **select production RPC endpoints**, so that **the platform has reliable Solana connectivity**.

**Status:** Proposed  
**Priority:** Now (Pre-MVP Launch)  

**Acceptance Criteria:**

- [ ] Evaluate RPC providers:
  - Helius
  - QuickNode
  - Triton
  - Public endpoints (rate limits, reliability)
- [ ] Select provider based on:
  - Reliability and uptime SLA
  - Rate limits and pricing
  - Geographic distribution
  - Feature support (getProgramAccounts, etc.)
- [ ] Configure failover to backup endpoints
- [ ] Implement circuit breaker for RPC failures
- [ ] Document operational procedures

**Notes for implementation:**

- Operations/infrastructure task
- Cost and reliability implications

---

###### Story E-004-36

> As a **compliance officer**, I want to **understand regulatory implications of token issuance**, so that **the platform operates within legal boundaries**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Research securities regulations for tokenized shares:
  - US (SEC, Howey Test)
  - EU (MiCA)
  - UK (FCA)
- [ ] Document jurisdiction-specific requirements
- [ ] Identify required disclaimers and terms
- [ ] Recommend legal review scope
- [ ] Define geographic restrictions if needed

**Notes for implementation:**

- Legal/compliance research
- Critical for production launch
- Requires external legal counsel review

---

#### Additional Grooming Notes

**Prioritization Guidance:**

1. **Now (Immediate):** Discovery and research stories (Group 1), security architecture (Group 5)
2. **Next (After Discovery):** Architecture stories (Group 2), core implementation (Group 3 early stories)
3. **Later (After MVP):** Future enhancements (Group 4), advanced security features
4. **Someday:** DAO features, marketplace, decentralization

**Sprint Planning Suggestions:**

- **Sprint 1-2:** Discovery (E-004-01 through E-004-06)
- **Sprint 3-4:** Architecture (E-004-07 through E-004-12)
- **Sprint 5-8:** Core Implementation (E-004-13 through E-004-24)
- **Sprint 9:** Hardening, security review, documentation
- **Sprint 10:** Devnet deployment and testing
- **Sprint 11+:** Mainnet preparation and launch

**Technical Dependencies Chart:**

```
E-004-05 (Local Dev Setup)
    └── E-004-06 (RPC Client Evaluation)
        └── E-004-13 (RPC Client Integration)
            ├── E-004-15 (Key Management)
            │   └── E-004-16 (Token Mint Creation)
            │   └── E-004-17 (Proposal Events)
            │       └── E-004-18 (Results Commitment)
            └── E-004-19 (Solana Service)
                └── E-004-23 (Integration Tests)
                └── E-004-24 (Error Handling)

E-004-11 (Data Model)
    └── E-004-21 (Database Migration)
        └── E-004-16, E-004-17 (Implementation stories)

E-004-12 (UX Design)
    └── E-004-20 (Frontend Links)
```

**Risk Register:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Solana network congestion affects transaction confirmation | High | Medium | Implement retry with exponential backoff; consider priority fees |
| Key compromise | Critical | Low | HSM/KMS, key rotation, monitoring, incident response |
| Regulatory action on token issuance | High | Medium | Legal review, jurisdiction restrictions, terms of service |
| RPC provider outage | Medium | Medium | Multiple providers, failover, circuit breaker |
| Cost overrun from transaction fees | Medium | Low | Cost projections, batch operations, mainnet fee monitoring |
| Database-blockchain inconsistency | High | Medium | Reconciliation jobs, alerting, clear sync model |

**Success Metrics:**

- **Technical:** 99.9% transaction success rate, <2s average confirmation time
- **Adoption:** 50% of new proposals use blockchain verification within 6 months
- **User Perception:** Positive feedback on transparency features
- **Auditability:** External auditor successfully verifies governance using on-chain data

---

### E-006 – Security Documentation Update and Enhancements (Theme: T3, Status: Proposed)

> **Research Report:** `docs/product/security-authorization-research-report.md`

#### Problem Statement

The `docs/architecture.md` file contains **outdated information** that incorrectly describes the authorization implementation as having "significant gaps." Upon code review, the application actually has **comprehensive authorization already implemented** with proper policies (GlobalAdmin, OrgMember, OrgAdmin, ProposalManager) applied to all controllers.

**Key Findings:**

1. ✅ **Authorization Infrastructure Exists**: Custom handlers in `backend/FanEngagement.Api/Authorization/`
2. ✅ **Policies Registered**: GlobalAdmin, OrgMember, OrgAdmin, ProposalManager policies in `Program.cs`
3. ✅ **Controllers Secured**: All controllers have appropriate `[Authorize(Policy = "...")]` attributes
4. ⚠️ **Documentation Outdated**: `docs/architecture.md` incorrectly shows ⚠️ AUTH-ONLY and ⚠️ OPEN markers

#### Motivation

- Correct misleading security documentation before it causes confusion
- Verify and expand authorization test coverage
- Implement optional security enhancements for production readiness
- Maintain accurate security posture documentation

#### Target Users / Roles

- Primary: Developers and security reviewers (documentation accuracy)
- Secondary: All users (benefit from security enhancements)

#### Success Signals

- Documentation accurately reflects implementation (verified by review)
- Authorization test coverage verified for all endpoints
- No false security findings from auditors using outdated docs

#### Epic Scope

**In Scope:**
- Update `docs/architecture.md` authorization tables to reflect actual secure implementation
- Verify and expand authorization test coverage
- Optional security enhancements (MFA, rate limiting, password policy)
- Security model documentation

**Out of Scope:**
- Authorization infrastructure (already implemented)
- Endpoint authorization (already implemented)
- Audit logging (covered by E-005)
- Blockchain security (covered by E-004)

#### Stories

##### Workstream A: Documentation Updates (Priority: Now)

###### Story E-006-01

> As a **documentation maintainer**, I want to **update the architecture documentation authorization tables**, so that **documentation accurately reflects the secure implementation**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Update `docs/architecture.md` "Current Authorization Implementation" table
- [ ] Change all ⚠️ AUTH-ONLY markers to ✅ ENFORCED
- [ ] Change all ⚠️ OPEN markers to ✅ ENFORCED  
- [ ] Update "Implementation Gaps & Security Concerns" section to reflect resolved status
- [ ] Reference authorization handlers documentation in `backend/FanEngagement.Api/Authorization/`
- [ ] Review confirms documentation matches codebase

---

###### Story E-006-02

> As a **documentation maintainer**, I want to **document the authorization infrastructure**, so that **developers understand how authorization works**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document `OrganizationMemberHandler`, `OrganizationAdminHandler`, `ProposalManagerHandler`
- [ ] Document `RouteValueHelpers` organization ID extraction
- [ ] Document policy registration in `Program.cs`
- [ ] Add examples of policy usage on controllers

---

##### Workstream B: Test Coverage Verification (Priority: Next)

###### Story E-006-03

> As a **developer**, I want to **verify authorization test coverage**, so that **all authorization scenarios are tested**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Review existing `AuthorizationIntegrationTests.cs`
- [ ] Create inventory of all endpoints and their expected authorization
- [ ] Identify any missing test scenarios
- [ ] Document test coverage status

---

###### Story E-006-04

> As a **developer**, I want to **add any missing authorization tests**, so that **test coverage is comprehensive**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Add tests for any scenarios identified in E-006-03
- [ ] Ensure cross-organization access denial is tested
- [ ] Ensure GlobalAdmin override is tested for all relevant endpoints
- [ ] All tests pass

---

##### Workstream C: Security Enhancements (Priority: Later)

###### Story E-006-05

> As a **developer**, I want to **strengthen password requirements**, so that **user accounts are more secure**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Increase minimum password length to 12 characters
- [ ] Require at least one uppercase letter, number, and special character
- [ ] Update validation messages to describe requirements
- [ ] Update frontend registration to show requirements

---

###### Story E-006-06

> As a **developer**, I want to **implement rate limiting**, so that **brute force attacks are mitigated**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Add rate limiting middleware or library
- [ ] Configure rate limits for login endpoint
- [ ] Configure rate limits for user creation
- [ ] Return 429 Too Many Requests when limits exceeded

---

###### Story E-006-07

> As a **developer**, I want to **document JWT security model**, so that **token handling is clearly defined**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Document token expiration policy
- [ ] Document refresh token approach (if implemented)
- [ ] Document token revocation strategy for security incidents
- [ ] Add to architecture documentation

---

###### Story E-006-08

> As a **developer**, I want to **encrypt webhook secrets at rest**, so that **secrets are protected in the database**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Add encryption service for sensitive fields
- [ ] Encrypt `WebhookEndpoint.Secret` before storage
- [ ] Decrypt secrets only when needed for delivery
- [ ] Migrate existing secrets to encrypted format

---

###### Story E-006-09

> As an **admin user**, I want to **enable multi-factor authentication (MFA) on my account**, so that **my account is protected with an additional security layer**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] MFA can be enabled by admin users in account settings
- [ ] QR code generated for TOTP setup (compatible with authenticator apps)
- [ ] TOTP validation during login for MFA-enabled accounts
- [ ] Backup codes generated for account recovery
- [ ] MFA can be disabled by user (requires current TOTP or backup code)

---

#### Dependencies

- **E-005 (Audit Logging)**: Security events should be logged once audit infrastructure exists

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Documentation update misses details | Low | Low | Code review of documentation |
| Test coverage gaps not identified | Medium | Low | Systematic endpoint review |

#### Open Questions

1. **Production Timeline**: When is production deployment planned? This affects enhancement priority.
2. **Rate Limiting Thresholds**: What are appropriate rate limits for different endpoints?
3. **MFA Scope**: Should MFA be mandatory for GlobalAdmin or optional for all admin users?

---

### E-007 – Blockchain Adapter Platform — Dockerized API for Multi-Chain Support (Theme: T5, Status: Proposed)

#### Motivation

E-004 laid the foundation for blockchain integration by exploring Solana capabilities, governance models, and tokenization strategies. However, its architecture was tightly coupled to a single blockchain (Solana) with direct integration into the FanEngagement backend. This approach creates several challenges:

1. **Vendor Lock-in**: Hard dependency on Solana limits organizational choice and flexibility
2. **Limited Extensibility**: Adding new blockchains (Polygon, Ethereum, etc.) requires substantial backend refactoring
3. **Maintenance Complexity**: Blockchain-specific logic mixed with business logic increases complexity and testing burden
4. **Operational Fragility**: Blockchain RPC provider issues or network outages directly impact the main application

E-007 addresses these challenges by introducing a **modular Blockchain Adapter Platform** that:

- Isolates blockchain interactions in dedicated Docker containers
- Provides a consistent API contract across all supported blockchains
- Enables organizations to select their preferred blockchain
- Allows independent scaling, deployment, and versioning of blockchain adapters
- Simplifies testing through standardized adapter interfaces

#### Target Users / Roles

- **OrgAdmins**: Can select and configure which blockchain their organization uses
- **Platform Developers**: Work with consistent blockchain APIs regardless of underlying chain
- **DevOps Engineers**: Deploy and monitor blockchain adapters independently
- **Organizations**: Benefit from transparency and verifiability without blockchain vendor lock-in

#### Success Signals

- Organizations can select from multiple blockchains (Solana, Polygon) in configuration
- New blockchains can be added without modifying FanEngagement core backend
- Blockchain adapter failures do not crash or impact the main application
- Adapter containers can be deployed and scaled independently
- Clear API contracts enable testing without blockchain network dependencies

#### Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                 FanEngagement Backend API                      │
│  (Organizations, Proposals, Votes, ShareTypes, Users)          │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ Consistent Adapter API
                         │ (OpenAPI contract)
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Solana     │  │   Polygon    │  │  Future      │
│   Adapter    │  │   Adapter    │  │  Adapter     │
│  Container   │  │  Container   │  │  Container   │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
    Solana           Polygon          Ethereum/
    Network          Network          Other Chain
```

**Key Design Principles:**

1. **Isolation**: Each blockchain adapter runs in its own Docker container with independent lifecycle
2. **Consistent Interface**: All adapters implement the same API contract (OpenAPI spec)
3. **Configuration**: Organizations select blockchain in database; backend routes requests to appropriate adapter
4. **Resilience**: Adapter failures handled gracefully; main application remains operational
5. **Extensibility**: New blockchains added by implementing adapter contract and deploying container

#### API Contract (Consistent Across All Adapters)

All blockchain adapters must implement these endpoints:

- `POST /adapter/organizations` - Create on-chain organization representation
- `POST /adapter/share-types` - Create token mint for ShareType
- `POST /adapter/share-issuances` - Record share issuance on-chain
- `POST /adapter/proposals` - Create on-chain proposal
- `POST /adapter/votes` - Record vote on-chain
- `POST /adapter/proposal-results` - Commit proposal results hash on-chain
- `GET /adapter/transactions/{txId}` - Query transaction status
- `GET /adapter/health` - Health check endpoint
- `GET /adapter/metrics` - Prometheus metrics endpoint

#### Stories

##### Group 1: Architecture & Design Foundation

###### Story E-007-01

> As an **architect**, I want to **design the multi-chain adapter architecture**, so that **we have a clear blueprint for implementing isolated blockchain adapters**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Document adapter container architecture (Docker, API gateway pattern)
- [ ] Define OpenAPI contract for blockchain adapter interface
- [ ] Design organization blockchain selection mechanism (database schema)
- [ ] Define adapter discovery and routing strategy
- [ ] Design failure handling and circuit breaker patterns
- [ ] Document adapter-to-backend communication security
- [ ] Define adapter deployment model (Kubernetes, Docker Compose)
- [ ] Produce architecture document in `docs/blockchain/adapter-platform-architecture.md`

**Notes for implementation:**

- Architecture/design task, no production code
- Output: Comprehensive architecture specification
- Consider: service mesh, API versioning, monitoring, logging aggregation

---

###### Story E-007-02

> As a **developer**, I want to **define the API contract for the Solana adapter**, so that **the backend can interact with Solana through a consistent interface**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Create OpenAPI 3.0 specification for Solana adapter
- [ ] Define all required endpoints (org creation, token minting, voting, etc.)
- [ ] Define request/response schemas with validation rules
- [ ] Define error responses and status codes
- [ ] Document authentication mechanism (API key, JWT, mutual TLS)
- [ ] Include example requests/responses for each endpoint
- [ ] Validate OpenAPI spec with validator tools
- [ ] Store spec in `docs/blockchain/solana/solana-adapter-api.yaml`

**Notes for implementation:**

- Leverage existing Solana documentation from E-004
- Reference: `/docs/blockchain/solana/*.md` for domain concepts
- Use OpenAPI Generator to validate specification

---

###### Story E-007-03

> As a **developer**, I want to **define the API contract for the Polygon adapter**, so that **the backend can interact with Polygon through a consistent interface matching Solana's contract**.

**Status:** Complete  
**Priority:** Now  

**Acceptance Criteria:**

- [x] Create OpenAPI 3.0 specification for Polygon adapter
- [x] Ensure endpoint structure matches Solana adapter contract
- [x] Define Polygon-specific parameters (gas estimation, network selection)
- [x] Define request/response schemas aligned with Solana adapter
- [x] Document authentication mechanism (consistent with Solana adapter)
- [x] Include example requests/responses for each endpoint
- [x] Validate OpenAPI spec with validator tools
- [x] Store spec in `docs/blockchain/polygon/polygon-adapter-api.yaml`

**Deliverables:**

- ✅ OpenAPI specification created at `docs/blockchain/polygon/polygon-adapter-api.yaml`
- ✅ All 9 endpoints defined: organizations, share-types, share-issuances, proposals, votes, proposal-results, transactions/{txId}, health, metrics
- ✅ Polygon-specific fields documented: gasUsed, gasPrice, network (mumbai/polygon), contractAddress, tokenAddress, transactionHash
- ✅ RFC 7807 Problem Details error format implemented
- ✅ API Key authentication matching Solana adapter
- ✅ Validated successfully with swagger-cli

**Notes for implementation:**

- Mirror Solana adapter API structure for consistency
- Polygon-specific considerations: ERC-20 tokens, gas fees, network selection (Mumbai testnet, Polygon mainnet)
- Key differences from Solana: 0x transaction hashes, Ethereum-style addresses, 18 decimals (ERC-20 standard), gas model

---

##### Group 2: Blockchain-Specific Documentation

###### Story E-007-06

> As a **developer**, I want to **comprehensive Polygon blockchain documentation**, so that **I understand Polygon's capabilities, costs, and governance models for FanEngagement**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Create `docs/blockchain/polygon/polygon-capabilities-analysis.md` covering:
  - Transaction costs and gas fees
  - ERC-20 token standard evaluation
  - Block finality and confirmation times
  - Development framework comparison (Hardhat, Foundry)
- [ ] Create `docs/blockchain/polygon/governance-models-evaluation.md` covering:
  - On-chain vs. off-chain voting on Polygon
  - Cost projections at scale
  - Integration with existing governance platforms (Snapshot, Tally)
- [ ] Create `docs/blockchain/polygon/sharetype-tokenization-strategy.md` covering:
  - ERC-20 token creation for ShareTypes
  - Metadata structure (name, symbol, decimals)
  - Token issuance and burn mechanics
  - MaxSupply enforcement
- [ ] Create `docs/blockchain/polygon/polygon-key-management-security.md` covering:
  - Key generation and storage for Polygon
  - Smart contract deployment security
  - Multisig wallet patterns
- [ ] All documentation follows structure of Solana documentation in `/docs/blockchain/solana/`

**Notes for implementation:**

- Research task, no production code
- Mirror Solana documentation structure for consistency
- Consider Polygon-specific factors: L2 architecture, bridge to Ethereum, lower gas costs vs. Solana

---

##### Group 3: Adapter Implementation

###### Story E-007-04

> As a **developer**, I want to **implement the Solana adapter container**, so that **FanEngagement can interact with Solana blockchain through a standardized API**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create Dockerfile for Solana adapter service
- [ ] Implement all endpoints from Solana adapter OpenAPI contract
- [ ] Integrate Solana RPC client (Solnet or equivalent)
- [ ] Implement retry logic with exponential backoff
- [ ] Implement structured logging (JSON format, log levels)
- [ ] Implement Prometheus metrics endpoint (`/metrics`)
- [ ] Implement health check endpoint (`/health`)
- [ ] Add comprehensive error handling with standard error responses
- [ ] Add integration tests using Solana test validator
- [ ] Create docker-compose.yml for local development
- [ ] Document deployment in `docs/blockchain/solana/solana-adapter-deployment.md`

**Notes for implementation:**

- Technology: Node.js/TypeScript OR .NET (choose based on team expertise)
- Dependencies: Solana Web3.js (if Node) or Solnet (if .NET)
- Testing: Use Solana test validator for integration tests
- Consider: Rate limiting, request validation, circuit breaker

---

###### Story E-007-05

> As a **developer**, I want to **implement the Polygon adapter container**, so that **FanEngagement can interact with Polygon blockchain through a standardized API**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Create Dockerfile for Polygon adapter service
- [ ] Implement all endpoints from Polygon adapter OpenAPI contract
- [ ] Integrate Polygon/Ethereum RPC client (Nethereum or Web3.js)
- [ ] Implement smart contract for governance operations (if needed)
- [ ] Deploy smart contract to Polygon Mumbai testnet
- [ ] Implement retry logic with exponential backoff
- [ ] Implement structured logging (JSON format, log levels)
- [ ] Implement Prometheus metrics endpoint (`/metrics`)
- [ ] Implement health check endpoint (`/health`)
- [ ] Add comprehensive error handling with standard error responses
- [ ] Add integration tests using Polygon Mumbai testnet
- [ ] Create docker-compose.yml for local development
- [ ] Document deployment in `docs/blockchain/polygon/polygon-adapter-deployment.md`

**Notes for implementation:**

- Technology: Should match Solana adapter (Node.js OR .NET)
- Dependencies: Ethers.js/Web3.js (if Node) or Nethereum (if .NET)
- Smart Contract: May need Solidity contract for proposal results commitment
- Testing: Use Mumbai testnet for integration tests

---

##### Group 4: Backend Integration

###### Story E-007-07

> As an **OrgAdmin**, I want to **select which blockchain my organization uses**, so that **my organization's governance is recorded on my preferred blockchain network**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Add `BlockchainType` enum to codebase (`None`, `Solana`, `Polygon`)
- [ ] Add `BlockchainType` and `BlockchainConfig` (JSON) columns to `Organizations` table
- [ ] Create EF Core migration for schema change
- [ ] Update `CreateOrganizationRequest` and `UpdateOrganizationRequest` DTOs
- [ ] Update `OrganizationService` to store blockchain configuration
- [ ] Add validation: only one blockchain type per organization
- [ ] Create `IBlockchainAdapterFactory` interface for adapter routing
- [ ] Implement `BlockchainAdapterFactory` that routes to correct adapter based on org config
- [ ] Update organization API to expose blockchain selection
- [ ] Add frontend UI for blockchain selection in organization settings (OrgAdmin only)
- [ ] Document configuration in `docs/architecture.md`
- [ ] Unit tests for blockchain selection logic
- [ ] Integration tests for organization creation with blockchain config

**Notes for implementation:**

- Database schema change requires migration
- Frontend: dropdown in org settings with "Solana", "Polygon", "None" options
- Default: `BlockchainType.None` for backwards compatibility

---

##### Group 5: Operations & Testing

###### Story E-007-08

> As a **DevOps engineer**, I want to **CI/CD pipeline support for blockchain adapter containers**, so that **adapters can be built, tested, and deployed automatically**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Add Dockerfile build steps to CI pipeline for Solana adapter
- [ ] Add Dockerfile build steps to CI pipeline for Polygon adapter
- [ ] Configure automated tests for Solana adapter in CI
- [ ] Configure automated tests for Polygon adapter in CI
- [ ] Add Docker image publishing to container registry (GitHub Container Registry or Docker Hub)
- [ ] Create deployment manifests (Kubernetes YAML or Docker Compose)
- [ ] Add health check monitoring in deployment
- [ ] Document CI/CD pipeline in `docs/blockchain/adapter-cicd.md`
- [ ] Configure image vulnerability scanning (Trivy or Snyk)

**Notes for implementation:**

- Use GitHub Actions (existing CI platform)
- Consider: Multi-stage builds for smaller images, layer caching
- Security: Scan images for vulnerabilities before deployment

---

###### Story E-007-09

> As a **QA engineer**, I want to **comprehensive testing strategy for blockchain adapters**, so that **we can verify adapter functionality without production blockchain costs**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Document unit testing approach (mock blockchain clients)
- [ ] Document integration testing approach (test validators, testnets)
- [ ] Create test harness for adapter contract validation
- [ ] Implement contract testing (Pact or OpenAPI contract tests)
- [ ] Create test data fixtures for common scenarios
- [ ] Document local testing setup in `docs/blockchain/adapter-testing.md`
- [ ] Add performance/load testing strategy for adapters
- [ ] Define acceptable latency thresholds per operation
- [ ] Create smoke tests for production adapter health

**Notes for implementation:**

- Solana: Use `solana-test-validator` for integration tests
- Polygon: Use Mumbai testnet for integration tests
- Contract Testing: Ensure adapters match OpenAPI spec exactly
- Performance: Target <2s response time for transaction submission

---

###### Story E-007-10

> As a **platform operator**, I want to **operational readiness documentation and monitoring for blockchain adapters**, so that **I can deploy, monitor, and troubleshoot adapters in production**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Document deployment architecture (how adapters connect to main app)
- [ ] Define monitoring metrics (transaction success rate, latency, error rate)
- [ ] Create Grafana dashboard for adapter monitoring (or equivalent)
- [ ] Define alerting thresholds (adapter down, high error rate, slow responses)
- [ ] Document runbook for common failure scenarios:
  - Adapter container crashes
  - Blockchain RPC provider outage
  - Transaction failures
  - Blockchain network congestion
- [ ] Document scaling strategy (when to scale adapters)
- [ ] Document backup and disaster recovery for adapter keys
- [ ] Create operational readiness checklist
- [ ] Store documentation in `docs/blockchain/adapter-operations.md`

**Notes for implementation:**

- Monitoring: Use Prometheus + Grafana (industry standard)
- Logging: Centralized logging (Loki, Elasticsearch, or CloudWatch)
- Alerts: Integration with PagerDuty or Opsgenie for on-call
- Key Management: Document secure key storage (AWS KMS, Azure Key Vault, HashiCorp Vault)

---

###### Story E-007-11

> As a **developer**, I want a **repeatable checklist for testing the Solana and Polygon adapters**, so that **anyone can stand up wallets, fund test accounts, and validate adapters against devnet/Amoy without tribal knowledge**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Extend `docs/blockchain/adapter-testing.md` to cover local, devnet, and Amoy workflows
- [ ] Document how to generate and locally store Solana keypairs (`solana-keygen new`) and Polygon private keys (OpenSSL/Node scripts), including rotation guidance
- [ ] Include instructions for funding Solana devnet wallets (`solana config set --url https://api.devnet.solana.com` + `solana airdrop 2`) and obtaining Amoy/Mumbai MATIC via the Polygon faucet
- [ ] Describe environment variable mapping for each network (`SOLANA_PRIVATE_KEY`, `POLYGON_PRIVATE_KEY`, RPC URLs, API keys) and how to load them via `.env.*`
- [ ] Provide smoke-test steps for each adapter: health check, `/v1/adapter/organizations`, transaction lookup, plus explorer links (Solana Devnet Explorer, Amoy Polygonscan)
- [ ] Outline prerequisites for CI and manual QA (test validator container, rate limits, expected confirmation times)

**Notes for implementation:**

- Emphasize separation of dev/test/prod wallets and never reusing faucet-funded keys in production
- Capture troubleshooting tips (insufficient funds, RPC throttling, stale private key formats) and pointers to faucets/bookmarks for quick reference

---

#### Dependencies

- **E-004 Solana Documentation**: Solana adapter leverages research from E-004 (capabilities, governance, tokenization)
- **Docker Infrastructure**: Requires Docker/Kubernetes deployment capability
- **Polygon Research**: Story E-007-06 must complete before E-007-05 (Polygon adapter implementation)
- **API Contract Definition**: Stories E-007-02 and E-007-03 must complete before adapter implementation

#### Value Proposition

**For Organizations:**
- **Choice**: Select blockchain that aligns with their values, costs, and technical preferences
- **Future-Proof**: New blockchains can be added without migration or disruption
- **Transparency**: Governance backed by blockchain verification without vendor lock-in

**For Platform:**
- **Reduced Risk**: Blockchain issues isolated from main application
- **Easier Testing**: Standardized adapter interface simplifies testing and mocking
- **Market Differentiation**: Multi-chain support appeals to broader market
- **Independent Scaling**: High-volume organizations can scale their blockchain adapter independently

**For Developers:**
- **Clean Architecture**: Blockchain logic isolated from business logic
- **Easier Onboarding**: Consistent API reduces learning curve for new blockchains
- **Better Testing**: Mock adapters for fast unit tests; real adapters for integration tests

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Adapter API contract divergence | High | Medium | Contract testing in CI; OpenAPI validation |
| Blockchain network outages impact availability | Medium | Low | Circuit breaker pattern; graceful degradation |
| Key management complexity increases | High | Medium | Comprehensive key management documentation; use cloud KMS |
| Performance overhead from adapter layer | Medium | Low | Performance testing; optimize hot paths; caching |
| Increased operational complexity | Medium | Medium | Comprehensive runbooks; automated monitoring; training |

#### Open Questions

1. **Adapter Technology Stack**: Should adapters be Node.js/TypeScript (better blockchain SDK support) or .NET (team expertise)? Recommendation: Node.js for blockchain ecosystem compatibility.
2. **Smart Contract Strategy**: Does Polygon adapter require custom smart contracts, or can we use on-chain memo transactions like Solana? Research needed.
3. **Adapter Authentication**: How should main backend authenticate to adapters? Options: API keys, mutual TLS, service mesh auth.
4. **Deployment Platform**: Kubernetes or Docker Compose? Recommendation: Docker Compose for MVP, Kubernetes migration path documented.
5. **Blockchain Selection UI**: Should blockchain selection be immutable after org creation, or allow migration? Recommendation: Immutable for MVP (migration is complex).

#### Epic Supersedes E-004

This epic **supersedes** the original E-004 (Blockchain Integration Initiative - Solana). Key differences:

| Aspect | E-004 (Old) | E-007 (New) |
|--------|-------------|-------------|
| Architecture | Direct Solana integration in backend | Isolated Docker adapters |
| Blockchain Support | Solana only | Multi-chain (Solana, Polygon, extensible) |
| Coupling | Tight coupling with backend | Loose coupling via API contract |
| Extensibility | Requires backend refactor for new chains | Add new adapter container |
| Testing | Complex (needs Solana test validator in backend tests) | Simpler (mock adapter API) |
| Operations | Backend and blockchain tightly coupled | Independent scaling and deployment |

**Migration from E-004:**

- Solana research documentation (in `/docs/blockchain/solana/`) remains valid and will be referenced
- Archived E-004 stories (in `/docs/product/archive/E-004-*.md`) are marked as superseded
- E-004 insights inform E-007 Solana adapter implementation
- Organizations will not be migrated; E-007 starts fresh with new architecture

---

### E-008 – Frontend User Experience & Navigation Overhaul (Theme: T1/T2, Status: Proposed)

#### Problem Statement

Recent stakeholder feedback and usability analysis have revealed significant friction in the FanEngagement frontend user experience:

**Navigation Inconsistencies:**
- Users struggle to find key features when switching between dashboard, admin, and profile flows
- Organization switcher behavior confuses users with mixed roles (OrgAdmin in one org, Member in another)
- Deep links fail to restore proper navigation context
- Breadcrumb trails are absent in deeply nested admin pages

**Visual Design Issues:**
- Outdated look-and-feel doesn't reflect modern governance platform expectations
- Inconsistent spacing, typography, and color usage across pages
- Poor visual hierarchy makes it difficult to identify primary actions
- Admin panels feel cluttered with too much information density

**Accessibility Gaps:**
- Screen reader support is incomplete or broken in several flows
- Keyboard navigation is inconsistent (missing focus indicators, improper tab order)
- Color contrast issues fail WCAG 2.1 AA standards in multiple components
- ARIA roles and labels are missing or incorrect

**Lack of Polish:**
- No micro-interactions or meaningful feedback for user actions
- State changes (loading, success, error) lack visual transitions
- Forms feel static without progressive disclosure or validation hints
- Page transitions are jarring without animation

**Responsive Design Deficiencies:**
- Mobile experience is poor with overlapping elements and tiny tap targets
- Tablet layouts don't adapt gracefully between mobile and desktop breakpoints
- Tables overflow without horizontal scroll or responsive alternatives

#### Motivation

FanEngagement is competing in a space where user experience directly impacts engagement metrics. A beautiful, accessible, intuitive interface:

- **Increases Member Participation**: Easier navigation → more proposal votes → higher quorum rates
- **Reduces Support Load**: Clear visual hierarchy → fewer "where is X?" tickets
- **Improves Satisfaction Scores**: Modern design → positive brand perception
- **Enables Future Growth**: Accessible platform → larger addressable market
- **Supports Multi-Org Workflows**: Better navigation → seamless org-switching experience

#### Target Users / Roles

**Primary:**
- **Members**: Need intuitive discovery of proposals, voting flows, and org dashboards
- **OrgAdmins**: Need efficient admin tools with clear information architecture
- **PlatformAdmins**: Need powerful, data-dense interfaces without sacrificing usability

**Secondary:**
- **Screen Reader Users**: Must be able to navigate and operate all features via assistive tech
- **Keyboard-Only Users**: Must be able to complete all workflows without mouse
- **Mobile Users**: Need optimized experience on phones and tablets

#### Success Signals

**Quantitative:**
- Navigation discoverability score increases by 40% (user testing metric)
- Support tickets about "can't find feature X" decrease by 60%
- Proposal voting completion rate increases by 25%
- Page load performance remains under budget (<200KB initial, <2s LCP)
- WCAG 2.1 AA compliance achieved across all pages (automated + manual audit)

**Qualitative:**
- Positive user feedback in post-deployment surveys
- Design team satisfaction with component library and tokens
- Engineering team reports improved frontend development velocity

#### Vision & Goals

**Strategic Intent:**

Transform FanEngagement from a functional but dated governance platform into a modern, delightful user experience that competes with best-in-class SaaS applications.

**Core Goals:**

1. **Navigation That Just Works**: Users should never be lost or confused about where they are or how to get where they're going
2. **Visual Excellence**: Every page should feel polished, professional, and purpose-built for governance
3. **Accessibility First**: All users, regardless of ability, should have equal access to platform features
4. **Delightful Interactions**: State changes and user actions should feel responsive, smooth, and meaningful
5. **Responsive Everywhere**: Exceptional experience across desktop, tablet, and mobile devices
6. **Design System Foundation**: Reusable, documented components and tokens for long-term maintainability

#### Scope

**In Scope:**
- Navigation architecture redesign for all user personas
- Design system with tokens (colors, typography, spacing, shadows, radii)
- Component library overhaul (forms, tables, cards, buttons, badges)
- Accessibility remediation (ARIA, keyboard nav, color contrast, focus management)
- Micro-interactions and motion design for key flows
- Responsive layout improvements across all pages
- Frontend documentation and Storybook updates

**Out of Scope:**
- Backend API changes (use existing endpoints)
- New features or functionality (pure UI/UX improvements)
- E2E workflow changes (maintain existing user journeys)
- Performance optimization beyond frontend assets (backend out of scope)

#### User Personas

##### Persona 1: Sarah the Multi-Org Member
- **Role**: Member in 3 organizations (voting power in all)
- **Pain Points**: Gets lost switching between orgs; misses proposal deadlines
- **Needs**: Clear org switcher, unified proposal inbox, mobile-friendly voting

##### Persona 2: James the OrgAdmin
- **Role**: OrgAdmin for 1 large org (500+ members)
- **Pain Points**: Admin panel feels cluttered; hard to find specific member or proposal
- **Needs**: Clear data hierarchy, powerful search/filters, efficient workflows

##### Persona 3: Maria the Platform Admin
- **Role**: GlobalAdmin managing entire platform
- **Pain Points**: Too much context-switching between admin views; missing at-a-glance metrics
- **Needs**: Dashboard with key metrics, quick access to users/orgs, audit logs

##### Persona 4: Alex the Screen Reader User
- **Role**: Member with visual impairment using JAWS
- **Pain Points**: Many pages lack landmarks, buttons have no labels, forms are confusing
- **Needs**: Proper ARIA, logical heading structure, descriptive labels, skip links

##### Persona 5: Taylor the Mobile Member
- **Role**: Member accessing platform primarily on phone
- **Pain Points**: Tiny tap targets, overlapping text, horizontal scrolling
- **Needs**: Touch-optimized UI, readable text without zoom, thumb-friendly navigation

#### Epic Workstreams

The epic is divided into 6 major workstreams, each with its own set of stories:

##### Workstream A: Navigation Redesign (Priority: Now)
**Goal**: Create consistent, role-aware navigation that adapts to user context.

**Key Deliverables:**
- Updated `navConfig.ts` with improved organization
- Enhanced org switcher with role badges and better UX
- Breadcrumb component for deep pages
- Active state indicators and keyboard shortcuts
- Navigation documentation for developers

##### Workstream B: Design System & Tokens (Priority: Now, except E-008-15 which is Later)
**Goal**: Establish a comprehensive design system with reusable tokens and components.

**Key Deliverables:**
- CSS custom properties for colors, typography, spacing, shadows, radii
- Token documentation with usage guidelines
- Dark mode foundation (optional, deferred to later)
- Design system documentation site or README

##### Workstream C: Component Library Refresh (Priority: Next)
**Goal**: Redesign core components with consistent styling and better UX.

**Key Deliverables:**
- Updated Button, Badge, Card, Table, Form components
- Enhanced LoadingSpinner, ErrorMessage, EmptyState
- New components: Toast, Modal, Dropdown, Tooltip
- Storybook stories for all components
- Component API documentation

##### Workstream D: Accessibility Remediation (Priority: Now)
**Goal**: Achieve WCAG 2.1 AA compliance across all pages.

**Key Deliverables:**
- ARIA roles, labels, and live regions
- Keyboard navigation with visible focus indicators
- Color contrast fixes (4.5:1 for text, 3:1 for UI elements)
- Skip links and landmark regions
- Accessibility testing documentation

##### Workstream E: Micro-Interactions & Polish (Priority: Next)
**Goal**: Add delightful transitions and feedback to key user actions.

**Key Deliverables:**
- Loading states with skeleton screens
- Success/error animations and toasts
- Hover/focus/active state transitions
- Page transition animations
- Optimistic UI updates for async actions

##### Workstream F: Responsive Design (Priority: Next)
**Goal**: Optimize layouts for mobile, tablet, and desktop breakpoints.

**Key Deliverables:**
- Mobile-first CSS with responsive breakpoints
- Touch-optimized tap targets (44px minimum)
- Responsive tables (horizontal scroll or card layout)
- Mobile navigation (hamburger menu or bottom tabs)
- Responsive testing documentation

#### Dependencies

- **Frontend Agent**: Primary implementer for all stories in this epic
- **Existing API Endpoints**: No backend changes; use existing APIs
- **Stakeholder Approval**: Design direction and token choices require product owner sign-off
- **Accessibility Audit Tool**: Need axe DevTools browser extension or axe-core library (via @axe-core/playwright) for automated testing

#### Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Scope creep (adding new features) | High | Medium | Strict adherence to UI/UX improvements only; defer feature requests |
| Design system adoption lag | Medium | Medium | Comprehensive documentation; examples; team training |
| Accessibility testing gaps | High | Low | Automated + manual testing; external audit |
| Performance regression from animations | Medium | Low | Performance budget enforcement; lazy loading; CSS transform usage |
| Breaking existing E2E tests | High | Medium | Update tests incrementally; maintain test-ids; CI checks |
| Mobile testing coverage | Medium | Medium | Device lab or BrowserStack; responsive design QA checklist |

#### Open Questions

1. **Design Direction**: Should we pursue data-dense/dashboard, minimalist/calm, or expressive/bold? Recommendation: Minimalist with expressive accents for key actions.
2. **Dark Mode**: Should we implement dark mode in this epic or defer? Recommendation: Foundation (tokens) now, implementation later.
3. **Animation Library**: Should we use Framer Motion, React Spring, or CSS-only? Recommendation: CSS-only for MVP, library for complex animations later.
4. **Mobile Navigation Pattern**: Hamburger menu, bottom tabs, or hybrid? Recommendation: Hamburger menu for consistency with desktop.
5. **Storybook Deployment**: Should we deploy Storybook publicly or keep internal? Recommendation: Internal for now, public later.

#### Stories

##### Workstream A: Navigation Redesign (Stories E-008-01 through E-008-08)

###### Story E-008-01

> As a **member**, I want **clear visual indicators of my current location in the app**, so that **I never feel lost or confused about where I am**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Active nav items have distinct visual treatment (bold text, colored underline, or background)
- [ ] Breadcrumbs appear on nested admin pages (e.g., Admin > Organizations > Org Name > Proposals)
- [ ] Page titles match navigation labels for consistency
- [ ] URL structure reflects page hierarchy
- [ ] Works across all breakpoints (mobile, tablet, desktop)

**Notes for Implementation:**
- Update `AdminLayout.tsx` and `PlatformAdminLayout.tsx`
- Use React Router's `useLocation` and `useMatches` for active state
- Consider: Breadcrumb component with automatic generation from route config

---

###### Story E-008-02

> As a **multi-org user**, I want **an improved organization switcher with role badges**, so that **I can easily switch between my organizations and understand my role in each**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Org switcher shows organization name with role badge (e.g., "Org Name (Admin)" or "Org Name (Member)")
- [ ] Current org is visually highlighted in dropdown
- [ ] Switching orgs updates nav items and redirects to appropriate dashboard
- [ ] Keyboard accessible (arrow keys, Enter to select, Escape to close)
- [ ] Tooltip shows full org name if truncated
- [ ] Works on mobile (touch-friendly tap target)

**Notes for Implementation:**
- Update `OrganizationSelector.tsx`
- Use design system tokens for colors, spacing, and typography
- Consider: Search/filter for users with many orgs

---

###### Story E-008-03

> As an **OrgAdmin**, I want **consistent navigation across all org admin pages**, so that **I can easily move between admin tools without losing context**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Org admin sub-nav appears consistently in sidebar on all org-scoped pages
- [ ] Sub-nav items: Overview, Memberships, Share Types, Proposals, Webhook Events, Audit Log
- [ ] Active sub-nav item is visually distinct
- [ ] Sub-nav collapses on mobile (accordion or hamburger)
- [ ] Keyboard shortcuts documented (optional: Ctrl+1 for Overview, Ctrl+2 for Memberships, etc.)

**Notes for Implementation:**
- Leverage existing `navConfig.ts` with scope: 'org'
- Ensure `AdminLayout.tsx` renders sub-nav for all org-scoped routes
- Add skip link to main content

---

###### Story E-008-04

> As a **keyboard-only user**, I want **visible focus indicators and logical tab order**, so that **I can navigate the app efficiently without a mouse**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] All interactive elements (links, buttons, inputs) have visible focus ring (2px solid, high contrast color)
- [ ] Focus ring uses design system token (e.g., `--focus-ring-color`)
- [ ] Tab order follows logical reading order (top to bottom, left to right)
- [ ] Skip link to main content appears on Tab press
- [ ] Modal dialogs trap focus (Tab cycles within modal)
- [ ] Dropdown menus navigable with arrow keys

**Notes for Implementation:**
- Add global CSS for `:focus-visible` with design token
- Test with keyboard only (no mouse)
- Use `focus-trap-react` or similar for modals

---

###### Story E-008-05

> As a **developer**, I want **comprehensive navigation configuration documentation**, so that **I can add new pages and nav items confidently**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Documentation in `/docs/frontend/navigation.md` or README
- [ ] Explains `navConfig.ts` structure (NavItem, scope, roles, order)
- [ ] Provides examples for adding global, org, and user-scoped items
- [ ] Documents route guards (AdminRoute, OrgAdminRoute, ProtectedRoute)
- [ ] Includes troubleshooting section (common issues and fixes)

**Notes for Implementation:**
- Leverage existing `.github/copilot-coding-agent-instructions.md` navigation docs
- Add diagrams or flowcharts if helpful

---

###### Story E-008-06

> As a **member**, I want **mobile-friendly navigation**, so that **I can access all features comfortably on my phone**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Hamburger menu icon on mobile (< 768px breakpoint)
- [ ] Tapping hamburger opens full-screen or slide-out nav drawer
- [ ] Nav items have 44px minimum tap target size
- [ ] Closing nav (tap outside, Escape key, or close button) works smoothly
- [ ] Org switcher accessible from mobile nav
- [ ] Active route highlighted in mobile nav

**Notes for Implementation:**
- Update `Layout.tsx` and `AdminLayout.tsx` with mobile nav component
- Consider: Bottom tab bar as alternative navigation pattern
- Test on real devices (iOS Safari, Chrome Android)

---

###### Story E-008-07

> As a **PlatformAdmin**, I want **quick access to frequently used admin tools**, so that **I can perform common tasks efficiently**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Platform admin dashboard includes quick action cards (e.g., "Create Organization", "View Audit Log")
- [ ] Global search in header (search users, orgs, proposals)
- [ ] Keyboard shortcut overlay (? key shows shortcuts)
- [ ] Recent items list in dropdown (last 5 viewed orgs or users)

**Notes for Implementation:**
- Enhance `PlatformAdminDashboardPage.tsx`
- Global search: debounced API call, instant results dropdown
- Keyboard shortcuts: Use library like `react-hotkeys-hook`

---

###### Story E-008-08

> As a **designer**, I want **navigation design specifications and mockups**, so that **implementation matches the intended UX**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Figma, Sketch, or high-fidelity mockups for all navigation states
- [ ] Mockups include: desktop sidebar, mobile hamburger, org switcher, breadcrumbs
- [ ] Specs document: spacing, colors, typography, shadows, animations
- [ ] Hover, focus, active states documented
- [ ] Mobile and desktop variants included
- [ ] Delivered to frontend agent as reference

**Notes for Implementation:**
- Product owner or designer delivers mockups
- Frontend agent implements based on specs
- Iterative review and refinement

---

##### Workstream B: Design System & Tokens (Stories E-008-09 through E-008-15)

###### Story E-008-09

> As a **developer**, I want **CSS custom properties (tokens) for colors**, so that **I can build consistent, themeable interfaces**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Color tokens defined in `/src/index.css` or dedicated tokens file
- [ ] Tokens include:
  - Brand colors (primary, secondary, accent)
  - Semantic colors (success, warning, error, info)
  - Neutral colors (gray scale with 10 shades)
  - Background colors (surface, canvas, elevated)
  - Border colors (subtle, default, strong)
  - Focus ring color
- [ ] Dark mode tokens (optional, use `prefers-color-scheme` or class toggle)
- [ ] Documentation with color swatches and usage guidelines
- [ ] All hardcoded colors in component files replaced with tokens (migration tracked separately for page files)

**Notes for Implementation:**
- Example: `--color-primary-600`, `--color-success-500`, `--color-neutral-200`
- Use HSL for easier manipulation (hue, saturation, lightness)
- Consider: Radix Colors or Tailwind color palette as reference

---

###### Story E-008-10

> As a **developer**, I want **CSS custom properties for typography**, so that **text styles are consistent and scalable**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Typography tokens defined for:
  - Font families (primary: sans-serif, secondary: serif, mono: monospace)
  - Font sizes (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
  - Font weights (light, normal, medium, semibold, bold)
  - Line heights (tight, normal, relaxed)
  - Letter spacing (tighter, normal, wider)
- [ ] Heading styles (h1-h6) use tokens
- [ ] Body text, labels, captions use tokens
- [ ] Documentation with type scale examples
- [ ] All hardcoded font sizes/weights replaced with tokens

**Notes for Implementation:**
- Example: `--font-size-lg`, `--font-weight-semibold`, `--line-height-normal`
- Consider: Type scale based on modular scale (1.25 or 1.33 ratio)
- Test: Ensure readability across breakpoints

---

###### Story E-008-11

> As a **developer**, I want **CSS custom properties for spacing**, so that **layouts are consistent and rhythm is predictable**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Spacing tokens defined for:
  - Base unit (4px)
  - Scale: 0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64
  - Note: Scale is intentionally constrained to common multiples of the base unit. For intermediate values (e.g., 14 = 3.5rem), use existing tokens in combination or choose the nearest value.
- [ ] Tokens used for: padding, margin, gap
- [ ] Documentation with spacing scale visualization
- [ ] All magic numbers replaced with spacing tokens

**Notes for Implementation:**
- Example: `--spacing-4` (16px), `--spacing-6` (24px)
- Consider: Use rem units for accessibility (respects user font size preferences)
- Apply consistently in components

---

###### Story E-008-12

> As a **developer**, I want **CSS custom properties for shadows and radii**, so that **elevation and roundness are consistent**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Shadow tokens for elevation levels (xs, sm, md, lg, xl, 2xl)
- [ ] Border radius tokens (none, sm, md, lg, xl, full)
- [ ] Documentation with visual examples
- [ ] All hardcoded shadows and radii replaced with tokens

**Notes for Implementation:**
- Example: `--shadow-lg`, `--radius-md`
- Shadows: Use multiple layers for realistic depth
- Consider: Tailwind or Material Design shadow scales as reference

---

###### Story E-008-13

> As a **developer**, I want **comprehensive design token documentation**, so that **I can quickly find and apply the right tokens**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Documentation in `/docs/frontend/design-system.md` or `/docs/design-tokens.md`
- [ ] Includes: color swatches, type scale, spacing scale, shadow examples, radius examples
- [ ] Usage guidelines: when to use each token, anti-patterns
- [ ] Code examples for common patterns (card with shadow, button with focus ring)
- [ ] Link to Storybook or live token reference (if available)

**Notes for Implementation:**
- Consider: Automated token documentation from CSS variables
- Use markdown tables or interactive HTML for token display

---

###### Story E-008-14

> As a **designer**, I want **design system Figma library or style guide**, so that **I can design new features with consistent tokens**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Figma library with design tokens as styles
- [ ] Components (buttons, cards, inputs) built with token styles
- [ ] Color, text, and effect styles match CSS tokens
- [ ] Documentation links Figma tokens to CSS tokens
- [ ] Shared with design and frontend teams

**Notes for Implementation:**
- Designer task (frontend agent may assist with token extraction)
- Ensure Figma tokens sync with CSS tokens (use Figma plugin if needed)

---

###### Story E-008-15

> As a **developer**, I want **dark mode foundation (tokens only)**, so that **we can implement dark mode later without refactoring**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Color tokens defined for both light and dark themes
- [ ] CSS uses `@media (prefers-color-scheme: dark)` or class toggle (`.dark`)
- [ ] Dark mode tokens include: background, surface, text, borders
- [ ] No full dark mode implementation (foundation only)
- [ ] Documentation explains dark mode token structure

**Notes for Implementation:**
- Foundation only; actual dark mode implementation is separate epic
- Example: `--color-background-light`, `--color-background-dark`
- Test: Toggle between light/dark to verify tokens switch correctly

---

##### Workstream C: Component Library Refresh (Stories E-008-16 through E-008-25)

###### Story E-008-16

> As a **developer**, I want **redesigned Button component with variants and states**, so that **buttons are consistent and accessible**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Button variants: primary, secondary, outline, ghost, danger
- [ ] Sizes: xs, sm, md, lg, xl
- [ ] States: default, hover, focus, active, disabled, loading
- [ ] Icon support (left, right, icon-only)
- [ ] Accessible (ARIA labels, focus ring, keyboard activation)
- [ ] Uses design system tokens
- [ ] Storybook story with all variants and states
- [ ] Replace all `<button>` elements with new Button component

**Notes for Implementation:**
- Use CSS modules or styled-components for scoped styles
- Loading state: spinner icon + disabled state
- Consider: Polymorphic component (renders as `<button>` or `<a>`)

---

###### Story E-008-17

> As a **developer**, I want **redesigned Badge component**, so that **status indicators are clear and consistent**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Badge variants: default, success, warning, error, info, neutral
- [ ] Sizes: sm, md, lg
- [ ] Shapes: rounded, pill
- [ ] Icon support (optional icon inside badge)
- [ ] Uses design system tokens
- [ ] Storybook story with all variants
- [ ] Update `ProposalStatusBadge.tsx` to use new Badge

**Notes for Implementation:**
- Consider: Dot indicator for compact status display

---

###### Story E-008-18

> As a **developer**, I want **redesigned Card component with elevation and hover states**, so that **cards feel interactive and polished**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Card variants: default, interactive (hover effect), bordered
- [ ] Elevation levels using shadow tokens
- [ ] Hover state: subtle scale or shadow increase
- [ ] Padding options: compact, default, spacious
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update pages to use new Card component

**Notes for Implementation:**
- Interactive cards: use `<button>` or `<a>` wrapper for semantics
- Hover animation: CSS transform with transition

---

###### Story E-008-19

> As a **developer**, I want **enhanced Table component with responsive layout**, so that **data tables work well on all screen sizes**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Desktop: Standard table with sticky header
- [ ] Mobile: Horizontal scroll OR card layout (configurable)
- [ ] Sortable columns (optional, icon indicates sort direction)
- [ ] Row hover state with subtle background change
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update admin pages (users, orgs, proposals) to use new Table

**Notes for Implementation:**
- Responsive: Use `overflow-x: auto` for horizontal scroll
- Card layout: Transform rows into stacked cards on mobile
- Consider: `react-table` or `@tanstack/table` for complex tables

---

###### Story E-008-20

> As a **developer**, I want **enhanced Form components (Input, Select, Checkbox, Radio)**, so that **forms are accessible and user-friendly**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Input component: text, email, password, number, search
- [ ] States: default, focus, error, disabled
- [ ] Label, helper text, error message slots
- [ ] Icon support (left, right)
- [ ] Select component with custom styling (dropdown arrow, focus ring)
- [ ] Checkbox and Radio with custom styles
- [ ] Accessible (labels, ARIA, keyboard navigation)
- [ ] Uses design system tokens
- [ ] Storybook stories for all form components
- [ ] Update all forms to use new components

**Notes for Implementation:**
- Use native HTML elements for accessibility
- Custom styling: Overlay pseudo-elements on native controls
- Error state: Red border, error icon, error message

---

###### Story E-008-21

> As a **developer**, I want **Toast notification component**, so that **users receive non-blocking feedback for actions**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Toast variants: success, warning, error, info
- [ ] Positions: top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
- [ ] Auto-dismiss with configurable timeout
- [ ] Manual dismiss (close button)
- [ ] Slide-in animation
- [ ] Stacks multiple toasts vertically
- [ ] Accessible (ARIA live region, focus management)
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Replace `NotificationContainer.tsx` or integrate with new Toast

**Notes for Implementation:**
- Use context API or library like `react-hot-toast` or `sonner`
- Animation: CSS transform + opacity transition

---

###### Story E-008-22

> As a **developer**, I want **Modal component**, so that **dialogs and confirmations are consistent and accessible**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Modal sizes: sm, md, lg, xl, full
- [ ] Header, body, footer slots
- [ ] Close on backdrop click (configurable)
- [ ] Close on Escape key
- [ ] Focus trap (tab cycles within modal)
- [ ] Accessible (ARIA dialog, focus management, body scroll lock)
- [ ] Slide-in or fade-in animation
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update confirmation dialogs to use new Modal

**Notes for Implementation:**
- Use `react-modal` or build with `focus-trap-react`
- Body scroll lock: Prevent background scrolling when modal is open

---

###### Story E-008-23

> As a **developer**, I want **Dropdown component**, so that **menus and popovers are consistent and accessible**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Trigger: button or custom trigger element
- [ ] Dropdown content: menu items, custom content
- [ ] Positions: bottom-left, bottom-right, top-left, top-right, auto (flips on boundary)
- [ ] Keyboard navigation (arrow keys, Enter, Escape)
- [ ] Accessible (ARIA menu, focus management)
- [ ] Animation: Fade + scale-in
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Update org switcher and user menu to use new Dropdown

**Notes for Implementation:**
- Use `@floating-ui/react` for positioning
- Menu items: Support icons, dividers, disabled states

---

###### Story E-008-24

> As a **developer**, I want **Tooltip component**, so that **helpful hints appear on hover or focus**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Trigger on hover and keyboard focus
- [ ] Positions: top, bottom, left, right, auto
- [ ] Delay before showing (configurable, default 300ms)
- [ ] Fade-in animation
- [ ] Accessible (ARIA describedby, keyboard dismissable)
- [ ] Uses design system tokens
- [ ] Storybook story with examples
- [ ] Add tooltips to icons and truncated text across app

**Notes for Implementation:**
- Use `@floating-ui/react` for positioning
- Ensure tooltip doesn't block interactive elements

---

###### Story E-008-25

> As a **developer**, I want **Storybook for all updated components**, so that **components are documented and testable in isolation**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Storybook installed and configured
- [ ] Stories for all components: Button, Badge, Card, Table, Form components, Toast, Modal, Dropdown, Tooltip
- [ ] Stories show all variants, sizes, and states
- [ ] Interactive controls (Storybook Controls addon)
- [ ] Accessibility testing with `@storybook/addon-a11y`
- [ ] Deployed internally or locally runnable

**Notes for Implementation:**
- Use Storybook 7+ with Vite
- Consider: Chromatic for visual regression testing

---

##### Workstream D: Accessibility Remediation (Stories E-008-26 through E-008-32)

###### Story E-008-26

> As a **screen reader user**, I want **proper ARIA roles, labels, and live regions**, so that **I can understand and operate the app with assistive technology**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] All interactive elements have ARIA labels or accessible names
- [ ] Landmark roles: `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
- [ ] Buttons without text have `aria-label` (e.g., icon-only buttons)
- [ ] Form inputs have associated `<label>` elements or `aria-labelledby`
- [ ] Dynamic content updates use ARIA live regions (`aria-live`, `aria-atomic`)
- [ ] Complex widgets (modals, dropdowns, tabs) have correct ARIA attributes
- [ ] Tested with screen reader (NVDA, JAWS, or VoiceOver)

**Notes for Implementation:**
- Audit all pages with axe DevTools browser extension (for manual testing) or axe-core library (for automated testing)
- Use semantic HTML where possible (reduce need for ARIA)
- Live regions: Use for toasts, loading states, error messages

---

###### Story E-008-27

> As a **keyboard-only user**, I want **logical tab order and no keyboard traps**, so that **I can navigate the entire app efficiently**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Tab order follows visual order (top-to-bottom, left-to-right)
- [ ] No keyboard traps (user can always escape with Tab, Shift+Tab, or Escape)
- [ ] Skip link to main content at top of page
- [ ] Focus visible on all interactive elements
- [ ] Modals trap focus correctly (tab cycles within modal, Escape to close)
- [ ] Dropdowns close on Escape
- [ ] Tested by navigating entire app with keyboard only

**Notes for Implementation:**
- Use `tabindex="0"` for custom interactive elements
- Never use `tabindex > 0` (causes unpredictable tab order)
- Test: Unplug mouse and complete key workflows

---

###### Story E-008-28

> As a **user with low vision**, I want **sufficient color contrast**, so that **I can read text and identify UI elements**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Text contrast meets WCAG 2.1 AA: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold)
- [ ] UI element contrast meets WCAG 2.1 AA: 3:1 for borders, icons, focus rings
- [ ] Color is not the only indicator of state (use icons, labels, or patterns)
- [ ] Tested with color contrast checker (WebAIM Contrast Checker or axe DevTools browser extension)
- [ ] All color token combinations documented with contrast ratios

**Notes for Implementation:**
- Audit all text and UI elements for contrast
- Adjust color tokens if necessary
- Use high-contrast focus ring color

---

###### Story E-008-29

> As a **user**, I want **accessible forms with clear error messages**, so that **I understand what went wrong and how to fix it**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] All form inputs have associated labels
- [ ] Required fields indicated with asterisk and `aria-required="true"`
- [ ] Error messages use `aria-invalid="true"` and `aria-describedby`
- [ ] Error messages are specific (not just "Invalid input")
- [ ] Error summary at top of form lists all errors
- [ ] Focus moves to first error field on submit
- [ ] Tested with screen reader

**Notes for Implementation:**
- Use form validation library with accessibility support (e.g., React Hook Form)
- Error summary: Use ARIA live region

---

###### Story E-008-30

> As a **mobile screen reader user**, I want **accessible mobile navigation**, so that **I can navigate the app on my phone with VoiceOver or TalkBack**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Hamburger menu button has accessible label ("Open menu" / "Close menu")
- [ ] Mobile nav drawer has `role="navigation"` and `aria-label`
- [ ] Nav items have accessible names
- [ ] Opening/closing nav announces state change
- [ ] Focus management: Focus moves to first nav item when opened, returns to trigger when closed
- [ ] Tested with VoiceOver (iOS) and TalkBack (Android)

**Notes for Implementation:**
- Use `aria-expanded` on hamburger button
- Focus trap in mobile nav drawer

---

###### Story E-008-31

> As a **QA engineer**, I want **automated accessibility testing in CI**, so that **accessibility regressions are caught early**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Axe-core or pa11y integrated into CI pipeline
- [ ] Tests run on all pages (or representative sample)
- [ ] CI fails if critical accessibility issues detected
- [ ] Test report generated and saved as artifact
- [ ] Documentation for running tests locally

**Notes for Implementation:**
- Use `@axe-core/playwright` or `pa11y-ci`
- Add to GitHub Actions workflow

---

###### Story E-008-32

> As a **developer**, I want **accessibility documentation and checklist**, so that **I can build accessible features from the start**.

**Status:** Proposed  
**Priority:** Now  

**Acceptance Criteria:**

- [ ] Documentation in `/docs/frontend/accessibility.md`
- [ ] Checklist for new features (ARIA, keyboard nav, contrast, screen reader testing)
- [ ] Code examples for common patterns (accessible buttons, forms, modals)
- [ ] Link to WCAG 2.1 guidelines and resources
- [ ] Troubleshooting section for common issues

**Notes for Implementation:**
- Based on WCAG 2.1 Level AA
- Include tools: axe DevTools browser extension, axe-core library, WAVE, Lighthouse

---

##### Workstream E: Micro-Interactions & Polish (Stories E-008-33 through E-008-38)

###### Story E-008-33

> As a **user**, I want **skeleton screens for loading states**, so that **the page feels responsive while data loads**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Skeleton component with animated gradient (pulse or shimmer)
- [ ] Skeleton shapes: text lines, circles, rectangles
- [ ] Applied to all async data loading (tables, cards, lists)
- [ ] Uses design system tokens
- [ ] Storybook story with examples

**Notes for Implementation:**
- CSS animation: `@keyframes` with `background-position` shift
- Replace `LoadingSpinner` in some contexts

---

###### Story E-008-34

> As a **user**, I want **success and error toasts with icons and animations**, so that **I receive clear feedback for my actions**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Toast variants: success (✓), warning (⚠), error (✗), info (i)
- [ ] Slide-in animation from edge
- [ ] Auto-dismiss after 5 seconds (configurable)
- [ ] Progress bar showing time until dismiss
- [ ] Toast stacks without overlapping
- [ ] Uses design system tokens

**Notes for Implementation:**
- Build on Story E-008-21 (Toast component)
- Animation: CSS `transform: translateX()`

---

###### Story E-008-35

> As a **user**, I want **smooth hover and focus transitions on interactive elements**, so that **the app feels polished and responsive**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] All buttons, links, cards have hover state with transition
- [ ] Transition duration: 150-200ms (fast but noticeable)
- [ ] Transition properties: background-color, border-color, box-shadow, transform
- [ ] Focus ring appears instantly (no transition)
- [ ] Uses design system tokens
- [ ] No janky or sluggish animations

**Notes for Implementation:**
- CSS: `transition: background-color 150ms ease, box-shadow 150ms ease;`
- Avoid transitioning layout properties (width, height) for performance

---

###### Story E-008-36

> As a **user**, I want **page transition animations**, so that **navigation feels smooth and intentional**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Fade-in or slide-in animation when navigating between pages
- [ ] Duration: 200-300ms
- [ ] Respects `prefers-reduced-motion` media query
- [ ] No layout shift during animation
- [ ] Tested across browsers

**Notes for Implementation:**
- Use React Router v6 transitions or Framer Motion
- CSS: `@media (prefers-reduced-motion: reduce)` disables animations

---

###### Story E-008-37

> As a **user**, I want **optimistic UI updates for async actions**, so that **the app feels instant and responsive**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Actions like voting, saving, deleting show immediate UI update
- [ ] If action fails, revert UI and show error toast
- [ ] Loading indicator (spinner or progress bar) for longer actions
- [ ] Tested with slow network conditions (throttling)

**Notes for Implementation:**
- Use React state to update UI immediately, then confirm with API response
- Example: Vote cast → option count increments → API call → success or revert

---

###### Story E-008-38

> As a **designer**, I want **motion design guidelines**, so that **animations are consistent and purposeful**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Documentation in `/docs/frontend/motion-design.md`
- [ ] Guidelines: when to animate, animation duration, easing curves
- [ ] Easing tokens: `--ease-in`, `--ease-out`, `--ease-in-out`
- [ ] Examples: button hover, modal open, toast slide, page transition
- [ ] Accessibility: Respect `prefers-reduced-motion`

**Notes for Implementation:**
- Easing curves: Use CSS cubic-bezier or named values
- Reference: Material Design motion guidelines

---

##### Workstream F: Responsive Design (Stories E-008-39 through E-008-45)

###### Story E-008-39

> As a **mobile user**, I want **mobile-optimized layouts with readable text**, so that **I don't need to zoom or scroll horizontally**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Mobile breakpoint: <768px (tablet: 768-1024px, desktop: >1024px)
- [ ] Font sizes adjust for mobile (minimum 16px for body text to prevent zoom on iOS)
- [ ] No horizontal overflow (width: 100%, max-width: 100%)
- [ ] Images and videos scale to fit container
- [ ] Tested on iPhone (375px, 390px, 428px) and Android (360px, 412px)

**Notes for Implementation:**
- Use `meta viewport` tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- CSS: Mobile-first approach (base styles for mobile, media queries for larger screens)

---

###### Story E-008-40

> As a **mobile user**, I want **touch-friendly tap targets**, so that **I can easily tap buttons and links without mistakes**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] All interactive elements have minimum 44x44px tap target (WCAG 2.5.5 Level AAA)
- [ ] Spacing between tap targets (8px minimum) to avoid mis-taps
- [ ] Tested on real devices (not just browser emulation)
- [ ] Applies to: buttons, links, nav items, form controls

**Notes for Implementation:**
- Use padding to increase tap target without changing visual size
- CSS: `min-height: 44px; min-width: 44px;`

---

###### Story E-008-41

> As a **mobile user**, I want **responsive tables that don't overflow**, so that **I can view data on small screens**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Tables use horizontal scroll on mobile (with scroll indicator)
- [ ] OR: Tables transform to card layout on mobile (stacked, one card per row)
- [ ] Sticky header (optional, for long tables)
- [ ] Tested on mobile devices

**Notes for Implementation:**
- Horizontal scroll: `overflow-x: auto; -webkit-overflow-scrolling: touch;`
- Card layout: Hide `<table>` on mobile, render as divs or cards
- Consider: `react-table` responsive plugin

---

###### Story E-008-42

> As a **tablet user**, I want **optimized layouts for tablet breakpoints**, so that **the app uses screen space efficiently on my iPad**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Tablet breakpoint: 768-1024px
- [ ] Layouts adapt: sidebar collapses or remains, grid columns adjust
- [ ] Tap targets remain 44x44px minimum
- [ ] Tested on iPad (1024x768 landscape, 768x1024 portrait) and Android tablets

**Notes for Implementation:**
- CSS: `@media (min-width: 768px) and (max-width: 1024px) { ... }`
- Consider: Hybrid navigation (sidebar on landscape, hamburger on portrait)

---

###### Story E-008-43

> As a **developer**, I want **responsive design breakpoints and utilities**, so that **I can build responsive layouts consistently**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Breakpoint tokens defined: `--bp-sm`, `--bp-md`, `--bp-lg`, `--bp-xl`
- [ ] Utility classes or mixins for responsive visibility (e.g., `hide-on-mobile`)
- [ ] Grid system or flex utilities for responsive layouts
- [ ] Documentation with examples
- [ ] All pages updated to use responsive utilities

**Notes for Implementation:**
- Example: `--bp-md: 768px`, `--bp-lg: 1024px`
- Consider: Use Tailwind CSS or custom utility classes

---

###### Story E-008-44

> As a **QA engineer**, I want **responsive design testing checklist**, so that **I can verify layouts across breakpoints**.

**Status:** Proposed  
**Priority:** Next  

**Acceptance Criteria:**

- [ ] Checklist in `/docs/frontend/responsive-testing.md`
- [ ] Device list: iPhone SE, iPhone 14 Pro, iPad, Android phones/tablets, desktop (1920x1080)
- [ ] Test scenarios: navigation, forms, tables, modals, images
- [ ] Tools: Browser DevTools, BrowserStack, or device lab

**Notes for Implementation:**
- Include: Portrait and landscape orientations
- Test: Real devices > browser emulation (emulation misses touch issues)

---

###### Story E-008-45

> As a **user**, I want **responsive images and media**, so that **pages load quickly and look sharp on my device**.

**Status:** Proposed  
**Priority:** Later  

**Acceptance Criteria:**

- [ ] Images use `srcset` and `sizes` attributes for responsive loading
- [ ] Images use modern formats (WebP) with fallbacks
- [ ] Lazy loading for images below the fold
- [ ] Videos have playback controls and are mobile-friendly
- [ ] Tested across devices and network conditions

**Notes for Implementation:**
- Use `<picture>` element for art direction
- Lazy loading: `loading="lazy"` attribute or Intersection Observer
- Consider: Image optimization service (Cloudflare Images, Imgix)

---

#### Additional Grooming Notes

**Prioritization Guidance:**

1. **Now (Sprint 1-2)**: Navigation redesign, design system foundation, accessibility remediation
2. **Next (Sprint 3-4)**: Component library refresh, micro-interactions, responsive design
3. **Later (Sprint 5+)**: Advanced animations, dark mode implementation, performance optimization

**Sprint Planning Suggestions:**

- **Sprint 1** (5 stories): E-008-01 to E-008-05 (Navigation core)
- **Sprint 2** (7 stories): E-008-09 to E-008-12 (Design tokens), E-008-26 to E-008-28 (Accessibility core)
- **Sprint 3** (8 stories): E-008-06 to E-008-08 (Navigation polish), E-008-16 to E-008-20 (Core components)
- **Sprint 4** (7 stories): E-008-21 to E-008-25 (Advanced components), E-008-29 to E-008-30 (Accessibility polish)
- **Sprint 5** (9 stories): E-008-31 to E-008-32 (Accessibility docs/testing), E-008-33 to E-008-38 (Micro-interactions), E-008-39
- **Sprint 6** (9 stories): E-008-40 to E-008-45 (Responsive), E-008-13 to E-008-15 (Design system polish)

**Dependencies Chart (Primary Dependency Paths Only):**

```
E-008-09 to E-008-13 (Design Tokens)
    └── E-008-16 to E-008-25 (Components use tokens)
        └── E-008-01 to E-008-08 (Navigation uses components)

E-008-26 to E-008-29 (Accessibility foundation)
    └── E-008-30 to E-008-32 (Accessibility testing and docs)

E-008-39 to E-008-43 (Responsive foundation)
    └── E-008-44 to E-008-45 (Responsive testing and media)
```

**Note:** This chart shows primary dependency paths. Individual stories may have additional dependencies (e.g., E-008-34 depends on E-008-21 for Toast animations).

**Risk Register:**

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Design direction requires multiple iterations | High | Medium | Early mockups and stakeholder feedback loops |
| Accessibility gaps discovered late | High | Low | Automated testing in CI from Sprint 1 |
| Component library adoption lag | Medium | Medium | Comprehensive documentation and examples |
| Performance regression from animations | Medium | Low | Performance budget monitoring; CSS-only animations where possible |
| Responsive design issues on real devices | High | Medium | Device testing lab; BrowserStack integration |
| Breaking E2E tests during refactor | High | High | Incremental updates; maintain data-testid attributes; CI checks |

**Success Metrics (How to Measure Success):**

- **Navigation Discoverability**: User testing task completion rate increases by 40%
- **Support Ticket Reduction**: "Can't find X" tickets decrease by 60% post-launch
- **Accessibility Compliance**: 0 critical violations from axe-core automated testing; manual audit passes WCAG 2.1 AA
- **Performance**: LCP <2s, CLS <0.1, FID <100ms maintained or improved
- **User Satisfaction**: Post-deployment NPS score increases by 15+ points
- **Developer Velocity**: Component reuse increases; new feature development time decreases

---

## 5. Ready-for-Issue Stories

This section lists **only stories that a human has approved as “Ready”** and that should be turned into GitHub issues.

The Product Owner agent may:

- Move stories here when explicitly instructed in an issue (e.g. “groom and mark Ready items”).
- Add suggested GitHub issue titles and labels.

Example format:

| Story ID | Suggested Issue Title                          | Labels                      |
| :------- | :--------------------------------------------- | :-------------------------- |
| E-001-01 | Member view for all open proposals across orgs | `feature`, `frontend`, `T1` |

---

## 6. Parking Lot

Ideas that are not yet epics or are too vague.

The Product Owner agent can:

- Add bullets here with a short description.
- Suggest whether something should be promoted to an epic later.

- “OrgAdmin onboarding checklist UI”
- “Member notifications for proposal lifecycle changes”
- “OrgAdmin reporting for engagement metrics”
