# Demo / Dev Seed Data

This document describes the seed data created when running the `POST /admin/seed-dev-data` endpoint in Development or Demo environments.

## Overview

The seeding process creates a comprehensive set of test accounts, organizations, share types, proposals, and votes to facilitate development and testing. All seeding is **idempotent** - running it multiple times will not create duplicate data.

## Voting Power Calculation

Voting power determines how much influence a user has when voting on proposals. It is calculated from share balances:

**Formula:** `Voting Power = Σ (Share Balance × Share Type Voting Weight)`

**Example (Alice in Tech Innovators):**
- 100 Standard Voting Shares × 1 weight = 100
- 20 Premium Voting Shares × 5 weight = 100
- **Total Voting Power = 200**

**Key Concepts:**
- Each share type has a `VotingWeight` (e.g., Standard = 1, Premium = 5)
- Users can hold multiple share types
- Voting power is captured as a snapshot when a proposal opens
- Quorum requirements are calculated against total eligible voting power

**Eligible Voting Power Snapshot:**
When a proposal opens, the system captures the total voting power of all eligible members at that moment. For example:
- Tech Innovators has Alice (200) + Bob (50) = **250 total eligible voting power**
- If the quorum requirement is 25%, at least 62.5 voting power must be cast for the proposal to meet quorum

## Test Accounts

### Platform Administrators

These users have the `Admin` role and can manage all platform resources.

| Email | Display Name | Password | Role | Notes |
|-------|--------------|----------|------|-------|
| `root_admin@platform.local` | Root Administrator | `RootAdm1n!` | Admin | Platform superuser |
| `platform_admin@fanengagement.dev` | Platform Admin | `PlatAdm1n!` | Admin | Secondary platform admin |

### Organization Members

These users have the `User` role and are assigned to various organizations with different organization-level roles.

| Email | Display Name | Password | Role | Organization Memberships |
|-------|--------------|----------|------|-------------------------|
| `alice@example.com` | Alice Johnson | `UserDemo1!` | User | **Tech Innovators** (OrgAdmin), **Green Energy United** (Member) |
| `bob@abefroman.net` | Bob Smith | `UserDemo1!` | User | **Tech Innovators** (Member) |
| `carlos@demo.co` | Carlos Garcia | `UserDemo2!` | User | **Green Energy United** (OrgAdmin) |
| `dana@sample.io` | Dana Miller | `UserDemo2!` | User | **Green Energy United** (Member), **City FC Supporters Trust** (Member) |
| `erika@cityfc.support` | Erika Chen | `UserDemo3!` | User | **Green Energy United** (OrgAdmin), **City FC Supporters Trust** (OrgAdmin) |
| `frank@cityfc.support` | Frank Wilson | `UserDemo3!` | User | **City FC Supporters Trust** (Member) |

> **Note:** The default admin user `admin@example.com` with password `Admin123!` is created separately during application startup in Development/Demo environments.

## Organizations

### Tech Innovators

**Description:** A community for tech enthusiasts focused on innovation and digital transformation

**Members:**
- Alice Johnson (OrgAdmin)
- Bob Smith (Member)

**Share Types:**
| Name | Symbol | Voting Weight | Max Supply | Transferable |
|------|--------|---------------|------------|--------------|
| Standard Voting Share | STDV | 1 | Unlimited | Yes |
| Premium Voting Share | PRMV | 5 | 1,000 | No |

**Share Allocations:**
| User | Standard (STDV) | Premium (PRMV) | Total Voting Power |
|------|-----------------|----------------|-------------------|
| Alice | 100 | 20 | 200 (100×1 + 20×5) |
| Bob | 50 | 0 | 50 (50×1) |

### Green Energy United

**Description:** A sustainability-focused organization advocating for renewable energy solutions

**Members:**
- Carlos Garcia (OrgAdmin)
- Erika Chen (OrgAdmin)
- Alice Johnson (Member)
- Dana Miller (Member)

**Share Types:**
| Name | Symbol | Voting Weight | Max Supply | Transferable |
|------|--------|---------------|------------|--------------|
| Standard Voting Share | STDV | 1 | Unlimited | Yes |
| Premium Voting Share | PRMV | 5 | 1,000 | No |

**Share Allocations:**
| User | Standard (STDV) | Premium (PRMV) | Total Voting Power |
|------|-----------------|----------------|-------------------|
| Carlos | 150 | 30 | 300 (150×1 + 30×5) |
| Erika | 100 | 0 | 100 (100×1) |
| Alice | 50 | 0 | 50 (50×1) |
| Dana | 75 | 0 | 75 (75×1) |

### City FC Supporters Trust

**Description:** The official supporters' trust for City Football Club fans

**Members:**
- Erika Chen (OrgAdmin)
- Dana Miller (Member)
- Frank Wilson (Member)

**Share Types:**
| Name | Symbol | Voting Weight | Max Supply | Transferable |
|------|--------|---------------|------------|--------------|
| Standard Voting Share | STDV | 1 | Unlimited | Yes |
| Premium Voting Share | PRMV | 5 | 1,000 | No |

**Share Allocations:**
| User | Standard (STDV) | Premium (PRMV) | Total Voting Power |
|------|-----------------|----------------|-------------------|
| Erika | 200 | 25 | 325 (200×1 + 25×5) |
| Dana | 100 | 0 | 100 (100×1) |
| Frank | 80 | 0 | 80 (80×1) |

## Proposals

Each organization has three proposals demonstrating different lifecycle states:

### Tech Innovators Proposals

| Title | Status | Quorum | Description |
|-------|--------|--------|-------------|
| Should we launch the new fan rewards program? | **Open** | 25% | Vote on whether to implement a new loyalty rewards program |
| Approve 2025 fan engagement budget | **Closed** | 20% | Vote to approve the proposed budget (completed with votes) |
| Adopt new community guidelines | **Draft (Scheduled)** | 30% | Future proposal - starts in 1 day |

### Green Energy United Proposals

| Title | Status | Quorum | Description |
|-------|--------|--------|-------------|
| Solar panel installation for community center | **Open** | 25% | Should we fund solar panel installation? |
| Annual sustainability report publication | **Closed** | 20% | Vote to approve and publish the annual report (completed with votes) |
| Electric vehicle charging stations proposal | **Draft (Scheduled)** | 25% | Future proposal - starts in 2 days |

### City FC Supporters Trust Proposals

| Title | Status | Quorum | Description |
|-------|--------|--------|-------------|
| New season ticket pricing structure | **Open** | 30% | Vote on the proposed new pricing structure |
| Away travel subsidy program | **Closed** | 20% | Vote to establish a subsidy program (completed with votes) |
| Stadium naming rights consultation | **Draft (Scheduled)** | 35% | Future proposal - starts in 3 days |

## Seeded Votes

The following proposals have pre-seeded votes to demonstrate voting functionality:

### Closed Proposals (with results computed)

**Tech Innovators - "Approve 2025 fan engagement budget":**
- Alice voted "Approve" (200 voting power)
- Bob voted "Approve" (50 voting power)
- **Winner:** Approve (250 total votes)
- **Quorum Met:** Yes

**Green Energy United - "Annual sustainability report publication":**
- Carlos voted "Publish" (300 voting power)
- Erika voted "Publish" (100 voting power)
- Dana voted "Defer" (75 voting power)
- **Winner:** Publish (400 winning votes, 75 non-winning votes)
- **Quorum Met:** Yes

**City FC Supporters Trust - "Away travel subsidy program":**
- Erika voted "Establish" (325 voting power)
- Dana voted "Establish" (100 voting power)
- Frank voted "Decline" (80 voting power)
- **Winner:** Establish (425 winning votes, 80 non-winning votes)
- **Quorum Met:** Yes

### Open Proposals (partial voting for testing)

**Tech Innovators - "Should we launch the new fan rewards program?":**
- Alice voted "Yes" (200 voting power)
- *Bob has not voted yet* (demonstrates pending vote scenario)

**Green Energy United - "Solar panel installation for community center":**
- Carlos voted "Fund" (300 voting power)
- Alice voted "Fund" (50 voting power)
- *Dana and Erika have not voted yet* (demonstrates partial participation)

## API Usage

### Seeding Data

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}' | jq -r '.token')

# Seed basic demo data (default)
curl -X POST http://localhost:5049/admin/seed-dev-data \
  -H "Authorization: Bearer $TOKEN"

# Seed with specific scenario
curl -X POST "http://localhost:5049/admin/seed-dev-data?scenario=HeavyProposals" \
  -H "Authorization: Bearer $TOKEN"
```

### Available Scenarios

| Scenario | Description |
|----------|-------------|
| `BasicDemo` | Default - 3 organizations, 8 users, proposals in various states |
| `HeavyProposals` | 50+ proposals for pagination/performance testing |
| `WebhookFailures` | Webhook endpoints with various delivery statuses |

### Logging In as Seeded Users

```bash
# Login as a platform admin
curl -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"root_admin@platform.local","password":"RootAdm1n!"}'

# Login as an org admin
curl -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"UserDemo1!"}'

# Login as a regular member
curl -X POST http://localhost:5049/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@abefroman.net","password":"UserDemo1!"}'
```

## Idempotency

The seeding process is designed to be idempotent:

- **Users** are looked up by email - duplicates are not created
- **Organizations** are looked up by name - duplicates are not created
- **Memberships** are checked by (organization, user) pair - duplicates are not created
- **Share Types** are looked up by (organization, symbol) pair - duplicates are not created
- **Proposals** are looked up by (organization, title) pair - duplicates are not created
- **Votes** are checked by (proposal, user) pair - duplicates are not created

Running the seed endpoint multiple times will return `0` for all creation counts after the initial seed.

## Testing Scenarios

The seed data supports testing the following scenarios:

1. **Role-based access control:**
   - Platform admins (root_admin, platform_admin) have global access
   - OrgAdmins (alice, carlos, erika) can manage their organizations
   - Members (bob, dana, frank) can view and vote in their organizations

2. **Multi-organization membership:**
   - Alice is a member of 2 organizations (Tech Innovators, Green Energy United)
   - Dana is a member of 2 organizations (Green Energy United, City FC Supporters Trust)
   - Erika is an OrgAdmin in 2 organizations (Green Energy United, City FC Supporters Trust)

3. **Proposal lifecycle:**
   - Open proposals for active voting
   - Closed proposals with computed results and winners
   - Scheduled (Draft) proposals with future start dates

4. **Voting scenarios:**
   - Complete voting on closed proposals
   - Partial voting on open proposals (some users haven't voted)
   - Quorum calculations with various participation levels

5. **Share types and voting power:**
   - Standard shares with 1x voting weight
   - Premium shares with 5x voting weight
   - Different allocations per user demonstrating voting power calculations
