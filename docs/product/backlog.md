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
| E-004   | T5    | Blockchain Integration Initiative (Solana): Discovery → MVP Definition → Implementation Planning | Proposed | Next | TBD | Major market differentiator; PO agent comprehensive epic |
| E-005   | T3    | Implement Thorough Audit Logging Across the Application | Proposed | Next | TBD | Comprehensive audit trail for governance, security, compliance; PO agent comprehensive epic |

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
