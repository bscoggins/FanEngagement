# FanEngagement – Backend Architecture

## Goal

FanEngagement is a multi-tenant fan governance platform. Organizations (teams, clubs, etc.) can issue “shares” to users and use them for governance (voting on proposals). The platform manages users, organizations, shares, proposals, votes, and webhooks that notify external systems of outcomes.

## Core Concepts

- **User**
  - Registered participant in the platform.
  - Can belong to one or more organizations.

- **Organization**
  - Team/club/entity.
  - Configures its own governance rules and share types.

- **OrganizationMembership**
  - Links a User to an Organization with a role:
    - `OrgAdmin`, `Member` (extendable).

- **ShareType**
  - Defined per Organization.
  - Fields:
    - `Name`
    - `Symbol`
    - `Description`
    - `VotingWeight` (e.g., 1.0, 10.0)
    - `MaxSupply` (optional)
    - `IsTransferable` (bool)

- **ShareIssuance**
  - Records issuance of a quantity of a ShareType to a User.
  - Used for auditing and history.

- **ShareBalance**
  - Denormalized view of current quantity held by a User for a ShareType.
  - Maintained by the application whenever issuances or transfers occur.

- **Proposal**
  - A question to be voted on within an Organization.
  - References eligible ShareTypes.
  - Fields:
    - `Title`
    - `Description`
    - `Status` (`Draft`, `Open`, `Closed`, `Finalized`)
    - `StartAt`, `EndAt`
    - `QuorumRequirement` (e.g., min % of voting power)
    - `CreatedByUserId`

- **ProposalOption**
  - Possible choices for a Proposal (e.g., "Red kit", "Blue kit").

- **Vote**
  - A User’s vote on a Proposal.
  - Includes `VotingPower` captured from a snapshot of balances at vote time (or at proposal start).

- **WebhookEndpoint**
  - Registered by an Organization.
  - Fields:
    - `Url`
    - `Secret`
    - `SubscribedEvents` (e.g., `ProposalCreated`, `ProposalFinalized`)

- **OutboundEvent**
  - Queued event for delivery to webhook endpoints.
  - Fields:
    - `EventType`
    - `Payload` (JSON)
    - `Status` (`Pending`, `Delivered`, `Failed`)
    - `AttemptCount`
    - `LastAttemptAt`

## Tech Stack

- Runtime: .NET 8
- Web: ASP.NET Core Web API
- Database: PostgreSQL (via Docker Compose)
- ORM: EF Core
- Auth: JWT-based (can be stubbed initially; structure should allow multi-tenant auth later)

## Solution Structure

- `FanEngagement.Api`
  - ASP.NET Core startup, DI configuration, controllers (or minimal APIs), request/response models.
- `FanEngagement.Application`
  - Application services / use cases.
  - DTOs, validators, orchestration logic.
- `FanEngagement.Domain`
  - Entities, value objects, domain services (pure C#).
- `FanEngagement.Infrastructure`
  - EF Core DbContext and mappings.
  - Repository implementations.
  - Migration scripts.
- `FanEngagement.Tests`
  - Unit tests for Domain and Application.
  - Basic integration tests for key API endpoints.

## Initial API Surface (v1)

Focus on CRUD and basic flows:

- Organizations
  - `POST /organizations`
  - `GET /organizations`
  - `GET /organizations/{id}`
  - `PUT /organizations/{id}`
- Share Types
  - `POST /organizations/{orgId}/share-types`
  - `GET /organizations/{orgId}/share-types`
- Share Issuances
  - `POST /organizations/{orgId}/share-issuances`
  - `GET /organizations/{orgId}/users/{userId}/balances`
- Proposals
  - `POST /organizations/{orgId}/proposals`
  - `GET /organizations/{orgId}/proposals`
  - `POST /proposals/{id}/votes`
- Webhooks
  - `POST /organizations/{orgId}/webhooks`
  - System will later POST out to those URLs for events (e.g. `ProposalFinalized`).

## Non-Functional Requirements

- Multi-tenant aware: most operations are scoped by `OrganizationId`.
- Clean separation of concerns:
  - Domain logic does not depend on EF Core or ASP.NET.
- EF Core migrations for schema evolution.
- Tests:
  - Domain unit tests for entities and domain services.
  - Integration tests hitting a test DB for core endpoints.
