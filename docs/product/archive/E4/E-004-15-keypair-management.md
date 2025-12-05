---
name: "Coding Task"
about: "Create a development task for the Copilot Coding Agent"
title: "[Dev] E-004-15: Implement secure keypair management"
labels: ["development", "copilot", "blockchain", "security", "backend", "T5"]
assignees: []
---

<!-- markdownlint-disable-next-line MD018 -->
#github-pull-request_copilot-coding-agent

> This issue is intended for the **Copilot Coding Agent** or a specific specialized agent (docs-agent, test-agent, lint-agent).  
> Please specify the agent if required. Otherwise, the default coding agent will be used.

---

## 1. Summary

Implement secure keypair management so the platform can sign Solana transactions. This is a critical security component that provides the foundation for all on-chain operations.

---

## 2. Requirements

- Create `ISolanaKeyProvider` interface
- Implement file-based keypair provider (development only)
- Implement environment variable keypair provider
- Add configuration for keypair source selection
- Document production key management requirements
- Add warning log when using insecure key storage

---

## 3. Acceptance Criteria (Testable)

- [ ] Create `ISolanaKeyProvider` interface in Application layer
- [ ] Implement file-based keypair provider (development only)
- [ ] Implement environment variable keypair provider
- [ ] Add configuration for keypair source selection
- [ ] Document production key management requirements
- [ ] Add warning log when using insecure key storage
- [ ] Unit tests for keypair providers
- [ ] All tests pass (`dotnet test`)

---

## 4. Constraints

- Must follow existing backend layering (`Api → Application → Domain → Infrastructure`)
- Production implementation (HSM/KMS) is a separate story (E-004-31)
- File-based provider must log security warnings
- Never log or expose private key material

---

## 5. Technical Notes (Optional)

- Solana keypairs are Ed25519 (64 bytes: 32 private + 32 public)
- File format: JSON array of bytes `[byte, byte, ...]`
- Environment variable: base64 encoded keypair
- Interface should support async key retrieval for cloud KMS

**Related Stories:**
- Part of Epic E-004: Blockchain Integration Initiative (Solana)
- Depends on: E-004-04 (Key management research), E-004-13 (RPC client integration)
- Dependency for: E-004-16 (Token mint creation), E-004-17 (Proposal events)

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
- backend/FanEngagement.Application/**
- backend/FanEngagement.Infrastructure/**
- backend/FanEngagement.Tests/**
- docs/blockchain/**

---

## 8. Completion Criteria

When the agent submits a PR, it must include:

- Summary of all file changes
- Commands to build and test (`dotnet build`, `dotnet test`)
- Security considerations documented
- Configuration examples for each provider
