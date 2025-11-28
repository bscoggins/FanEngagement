---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-26: NFT membership badges (Post-MVP)"
labels: ["development", "copilot", "blockchain", "nft", "future", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

**[POST-MVP / FUTURE ENHANCEMENT]**

Allow members to receive NFT membership badges so they can prove their organization membership on-chain. This enables portable identity and cross-platform recognition.

---

## 2. Requirements

- Design NFT metadata schema for membership badges
- Create NFT mint per organization for membership proofs
- Issue NFT when user joins organization
- Burn or revoke NFT when membership ends
- Display badge on member profile

---

## 3. Acceptance Criteria (Testable)

- [ ] Design NFT metadata schema for membership badges
- [ ] Create NFT mint per organization for membership proofs
- [ ] Issue NFT when user joins organization
- [ ] Burn or revoke NFT when membership ends
- [ ] Display badge on member profile
- [ ] Unit and integration tests
- [ ] All tests pass

---

## 4. Constraints

- **This is a POST-MVP enhancement** - do not implement until MVP is complete
- Consider using compressed NFTs for cost efficiency at scale
- Must handle membership revocation gracefully
- NFT metadata should include organization branding

---

## 5. Technical Notes (Optional)

- Metaplex NFT standard for metadata
- Compressed NFTs (cNFTs) for cost-effective issuance
- Metadata: org name, member since date, role, org logo URI
- Consider: Soulbound tokens (non-transferable)

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: MVP completion, E-004-25 (wallet connection)
- Priority: Later (Post-MVP)

---

## 6. Desired Agent

Select one:

- [x] **Default Coding Agent**
- [ ] **docs-agent** (documentation only)
- [ ] **test-agent** (tests only)
- [ ] **lint-agent** (formatting / safe refactor only)
- [ ] **product-owner-agent** (idea → epic/story refinement; no code)

---

## 7. Files Allowed to Change

Allowed:
- frontend/**
- backend/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test
- NFT metadata schema documentation
- Cost analysis for badge issuance
