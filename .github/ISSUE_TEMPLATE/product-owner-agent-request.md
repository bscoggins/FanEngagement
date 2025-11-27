---
name: "Product Owner Agent Request"
description: "Ask the product-owner-agent to propose or refine product ideas, epics, and stories."
title: "[PO] "
labels: ["product-owner", "copilot"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **product-owner-agent**. It should NOT modify production code.

## Objective

Briefly describe what you want from the Product Owner agent.

Examples:

- “Propose 3–5 epics to improve member engagement on /me/home.”
- “Refine these rough ideas into user stories with acceptance criteria.”
- “Groom the backlog for OrgAdmin webhook UX.”

## Current Context

Provide any context the agent should consider (optional but helpful):

- Relevant docs: `docs/architecture.md` sections, specific routes, etc.
- Known pain points or user feedback
- Constraints (e.g., no new core features, just UX improvements)

## Required Output

What format do you want?

- [ ] New epics + stories added to `docs/product/backlog.md`
- [ ] New entries added/updated in `docs/future-improvements.md`
- [ ] A summary comment in this issue only (no file changes)

If you expect file changes, specify which:

```text
Allowed files for this request:
- docs/product/backlog.md
- docs/future-improvements.md
