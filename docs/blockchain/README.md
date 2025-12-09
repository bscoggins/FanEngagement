# Blockchain Adapter Documentation

This directory contains documentation for the FanEngagement blockchain adapter platform.

## Quick Links

### Getting Started
- **[Adapter Testing Playbook](./adapter-testing-playbook.md)** - Step-by-step testing guide for Solana and Polygon adapters
- **[Adapter Testing Strategy](./adapter-testing.md)** - Comprehensive testing strategy and best practices
- **[Adapter Platform Architecture](./adapter-platform-architecture.md)** - System architecture and design

### Deployment Guides
- **[Solana Adapter Deployment](./solana/solana-adapter-deployment.md)** - Deploy Solana adapter (local, Docker, Kubernetes)
- **[Polygon Adapter Deployment](./polygon/polygon-adapter-deployment.md)** - Deploy Polygon adapter (local, Docker, Kubernetes)

### Operations
- **[Adapter CI/CD](./adapter-cicd.md)** - Continuous integration and deployment pipeline
- **[Adapter Operations](./adapter-operations.md)** - Operational procedures and runbooks

## Document Index

### Core Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| [adapter-testing-playbook.md](./adapter-testing-playbook.md) | **Quick reference** for testing adapters | Developers, QA |
| [adapter-testing.md](./adapter-testing.md) | **Comprehensive testing strategy** | QA, Engineers |
| [adapter-platform-architecture.md](./adapter-platform-architecture.md) | **System architecture** and design decisions | Architects, Engineers |
| [adapter-cicd.md](./adapter-cicd.md) | **CI/CD pipeline** documentation | DevOps, Engineers |
| [adapter-operations.md](./adapter-operations.md) | **Operational procedures** | DevOps, SRE |

### Solana Documentation

| Document | Purpose |
|----------|---------|
| [solana/solana-adapter-deployment.md](./solana/solana-adapter-deployment.md) | Solana adapter deployment guide |
| [solana/solana-capabilities-analysis.md](./solana/solana-capabilities-analysis.md) | Solana blockchain capabilities |
| [solana/solana-key-management-security.md](./solana/solana-key-management-security.md) | Security best practices |
| [solana/governance-models-evaluation.md](./solana/governance-models-evaluation.md) | Governance model evaluation |
| [solana/sharetype-tokenization-strategy.md](./solana/sharetype-tokenization-strategy.md) | Token strategy |

### Polygon Documentation

| Document | Purpose |
|----------|---------|
| [polygon/polygon-adapter-deployment.md](./polygon/polygon-adapter-deployment.md) | Polygon adapter deployment guide |
| [polygon/polygon-capabilities-analysis.md](./polygon/polygon-capabilities-analysis.md) | Polygon blockchain capabilities |

### Test Fixtures

Test fixtures for contract testing are located in [test-fixtures/](./test-fixtures/).

## Common Tasks

### Testing Adapters Locally

**Quick start:**
```bash
# Solana
cd adapters/solana
cp .env.example .env
# Edit .env with keypair path
npm install && npm run dev

# Polygon
cd adapters/polygon
cp .env.example .env
# Edit .env with private key
npm install && npm run dev
```

See [adapter-testing-playbook.md](./adapter-testing-playbook.md) for detailed instructions.

### Deploying to Kubernetes

See deployment guides:
- [Solana Deployment](./solana/solana-adapter-deployment.md#kubernetes-deployment)
- [Polygon Deployment](./polygon/polygon-adapter-deployment.md#production-deployment)

### Running CI/CD Locally

See [adapter-cicd.md](./adapter-cicd.md#manual-operations) for local CI simulation.

## Document Relationships

```
adapter-testing-playbook.md (Quick Reference)
    ↓ references
adapter-testing.md (Comprehensive Strategy)
    ↓ references
adapter-platform-architecture.md (System Design)
    ↓ informs
solana/solana-adapter-deployment.md
polygon/polygon-adapter-deployment.md
    ↓ implemented by
adapter-cicd.md (CI/CD Pipeline)
adapter-operations.md (Operations)
```

## Contributing

When adding new documentation:

1. Follow existing document structure
2. Use consistent formatting (Markdown)
3. Include Table of Contents for long documents
4. Add cross-references to related docs
5. Update this README.md index
6. Keep code examples up-to-date with implementation

## Support

For questions or issues:
- Check [adapter-testing-playbook.md](./adapter-testing-playbook.md) for quick answers
- Review [troubleshooting sections](./adapter-testing-playbook.md#8-troubleshooting-guide)
- Contact FanEngagement Platform Team
