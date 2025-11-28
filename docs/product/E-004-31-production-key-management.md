---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-31: Implement production key management"
labels: ["development", "copilot", "blockchain", "security", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement production-grade key management so signing keys are protected according to best practices. This is critical security work that must be complete before mainnet deployment.

---

## 2. Requirements

- Evaluate HSM vs. cloud KMS options:
  - AWS KMS with asymmetric keys
  - Azure Key Vault
  - HashiCorp Vault
  - Dedicated HSM
- Implement key storage integration
- Implement secure signing workflow
- Define key rotation procedures
- Define incident response for key compromise
- Security review and penetration testing

---

## 3. Acceptance Criteria (Testable)

- [ ] Evaluate HSM vs. cloud KMS options documented
- [ ] Implement key storage integration with chosen provider
- [ ] Implement secure signing workflow
- [ ] Define key rotation procedures documented
- [ ] Define incident response for key compromise documented
- [ ] Security review completed
- [ ] Penetration testing completed (if applicable)
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- **Must complete before mainnet deployment**
- Critical security work - requires security team review
- Must support key rotation without service interruption
- Audit trail required for all key operations

---

## 5. Technical Notes (Optional)

- E-004-15 provides development key management; this is production upgrade
- AWS KMS: Ed25519 support via asymmetric keys
- Azure Key Vault: Similar capabilities
- HashiCorp Vault: Transit secrets engine for signing
- Consider: multi-region redundancy for key material

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Upgrades: E-004-15 (Development keypair management)
- Priority: Now (Pre-MVP Launch)

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
- backend/FanEngagement.Infrastructure/**
- backend/FanEngagement.Application/**
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Security review sign-off
- Key rotation documentation
- Incident response procedures
