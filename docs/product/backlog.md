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

The Product Owner agent may **propose new themes**, but should not remove existing ones without explicit instruction.

---

## 3. Epics Overview

This section is a catalog of active / potential epics. Detailed stories live in section 4.

| Epic ID | Theme | Title                                   | Status   | Priority | Owner | Notes                     |
| :------ | :---- | :-------------------------------------- | :------- | :------- | :---- | :------------------------ |
| E-001   | T1    | Improve Member Proposal Discovery       | Proposed | Next     | Brent | Initial draft by PO agent |
| E-002   | T2    | Streamline OrgAdmin Proposal Management | Drafting | Now      | Brent |                           |
| E-003   | T3    | Enhance Governance Results Transparency | Backlog  | Later    | TBD   |                           |

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
