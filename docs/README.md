# FanEngagement Documentation

Welcome to the FanEngagement documentation. This index helps you find the information you need quickly.

## 🚀 Getting Started

New to FanEngagement? Start here:

- **[Development Guide](development.md)** - Set up your development environment, run tests, and start coding
- **[Architecture Overview](architecture.md)** - Understand the system design, tech stack, and core concepts
- **[Demo Seed Data](demo-seed-data.md)** - Test accounts and sample data for development

## 📚 Core Documentation

### Backend Architecture

- **[Architecture](architecture.md)** - Comprehensive system architecture, domain model, and governance rules
- **[Authorization](authorization.md)** - Policy-based authorization system, roles, and permissions
- **[Future Improvements](future-improvements.md)** - Backlog of enhancement ideas and feature requests

### Development & Testing

- **[Development Guide](development.md)** - Local setup, Docker workflows, and development scripts
- **[Demo Seed Data](demo-seed-data.md)** - Seeded accounts, organizations, and test scenarios

## 🎨 Frontend Documentation

### Design System

Located in [`frontend/`](frontend/):

- **[Frontend Overview](frontend/README.md)** - Frontend architecture and patterns
- **[Design System](frontend/design-system.md)** - Comprehensive design system with tokens, components, and guidelines
- **[Design Tokens](frontend/)** - JSON/CSV exports and showcase files

### Components

Located in [`frontend/components/`](frontend/components/):

- **[Badge Component](frontend/components/badge.md)** - Badge variants, usage, and examples
- **[Badge Visual Guide](frontend/components/badge-visual-guide.md)** - Visual reference for badge styles
- **[Button Component](frontend/components/button.md)** - Button variants, states, and accessibility

### Design Resources

Located in [`frontend/design/`](frontend/design/):

- **[Dark Mode](frontend/design/dark-mode.md)** - Dark mode implementation and tokens
- **[Figma Library](frontend/design/figma-library.md)** - Figma setup and component library
- **[Shadow & Radius Tokens](frontend/design/shadow-radius-tokens.md)** - Shadow and border radius design tokens
- **[Spacing Tokens](frontend/SPACING_TOKENS_SUMMARY.md)** - Spacing scale and usage guidelines

### Navigation & UX

- **[Navigation](frontend/navigation.md)** - Navigation patterns and architecture
- **[Navigation Design Specifications](frontend/navigation-design-specifications.md)** - Detailed navigation design specs
- **[Navigation Visual Mockups](frontend/navigation-visual-mockup-guide.md)** - Visual mockups and screenshots
- **[Navigation Token Usage](frontend/navigation-token-usage-guide.md)** - Design tokens used in navigation
- **[Header Navigation](frontend/header-navigation.md)** - Header navigation implementation
- **[Mobile Navigation](frontend/mobile-navigation.md)** - Mobile-specific navigation patterns
- **[Keyboard Navigation](frontend/keyboard-navigation.md)** - Keyboard shortcuts and accessibility

### Figma Integration

- **[Figma Setup Guide](frontend/figma-setup-guide.md)** - Complete Figma library setup
- **[Figma Token Mapping](frontend/figma-token-mapping.md)** - CSS-to-Figma token reference
- **[Figma Component Specs](frontend/figma-component-specs.md)** - Component anatomy and specifications

## 🔒 Security & Audit

### Audit Logging

Located in [`audit/`](audit/):

- **[Audit Architecture](audit/architecture.md)** - Audit system design and data model
- **[Audit Events Catalog](audit/events.md)** - Complete list of audited events
- **[Development Guide](audit/development.md)** - How to add new audit events
- **[Operations Guide](audit/operations.md)** - Configuration, monitoring, and troubleshooting
- **[Security Summary](audit/summary.md)** - Audit security implementation overview
- **[Test Coverage Report](audit/test-coverage.md)** - Audit logging test coverage

### Additional Audit Documentation

- **[Event Categorization](audit/event-categorization.md)** - How events are categorized
- **[Data Model](audit/data-model.md)** - Audit event schema and relationships
- **[Retention Configuration](audit/retention-configuration.md)** - Data retention policies
- **[Security Controls](audit/security-controls.md)** - Security measures for audit data
- **[Security Review Checklist](audit/security-review-checklist.md)** - Security review process
- **[Security Verification Report](audit/security-verification-report.md)** - Security audit results
- **[Service Architecture](audit/service-architecture.md)** - Audit service implementation details
- **[Export Rate Limiting](audit/export-rate-limiting.md)** - Rate limiting for audit exports

## ✨ Features & Enhancements

Located in [`features/`](features/):

- **[Keyboard Shortcuts](features/keyboard-shortcuts.md)** - Keyboard shortcuts for org admin navigation
- **[Navigation Improvements](features/navigation-improvements.md)** - Navigation system enhancements
- **[Platform Admin Quick Access](features/platform-admin-quick-access.md)** - Quick access features for admins
- **[Platform Admin Visual Guide](features/platform-admin-visual-guide.md)** - Visual guide for admin features
- **[E-008-03 Implementation](features/e-008-03-implementation-summary.md)** - Epic E-008-03 implementation details
- **[E-008-03 Visual Documentation](features/e-008-03-visual-documentation.md)** - Visual documentation for E-008-03

## 🔧 Technical Documentation

Located in [`technical/`](technical/):

- **[Webhook Encryption](technical/webhook-encryption.md)** - Webhook secret encryption and security
- **[PostgreSQL Persistence](technical/postgres-persistence.md)** - Database persistence with Docker volumes
- **[Copilot Agent (Legacy)](technical/copilot-agent-legacy.md)** - Legacy copilot agent documentation

## 🌐 Blockchain Integration

Located in [`blockchain/`](blockchain/) (excluded from this consolidation):

- Blockchain adapter platform documentation
- Solana and Polygon integration guides
- See `blockchain/README.md` for the complete index

## 📦 Product Documentation

Located in [`product/`](product/) (excluded from this consolidation):

- Product requirements and specifications
- Epic documentation
- User stories and acceptance criteria

## 📖 Guides

Located in [`guides/`](guides/):

- **[Testing Login Flow](guides/testing-login-flow.md)** - How to test authentication and protected routes

## 🔗 Quick Links

### For Developers

- [Development Setup](development.md)
- [Architecture Overview](architecture.md)
- [Audit Logging Guide](audit/development.md)
- [Frontend Components](frontend/components/)
- [Design System](frontend/design-system.md)

### For Designers

- [Design System](frontend/design-system.md)
- [Figma Setup Guide](frontend/figma-setup-guide.md)
- [Design Tokens](frontend/design-tokens.json)
- [Component Specifications](frontend/figma-component-specs.md)

### For DevOps

- [Development Guide](development.md#docker-compose)
- [PostgreSQL Persistence](technical/postgres-persistence.md)
- [Audit Operations](audit/operations.md)

### For Product Managers

- [Architecture Overview](architecture.md)
- [Future Improvements](future-improvements.md)
- [Demo Seed Data](demo-seed-data.md)

## 📝 Contributing

When adding new documentation:

1. Place files in the appropriate subdirectory
2. Update this README.md index
3. Use clear, descriptive filenames (kebab-case)
4. Include a table of contents for long documents
5. Link related documents together

## 📂 Documentation Structure

```
docs/
├── README.md (this file)
├── architecture.md
├── authorization.md
├── development.md
├── demo-seed-data.md
├── future-improvements.md
├── audit/               # Audit logging system
├── blockchain/          # Blockchain integration (excluded)
├── features/            # Feature documentation
├── frontend/            # Frontend docs, design system, components
│   ├── components/      # Component documentation
│   └── design/          # Design resources
├── guides/              # How-to guides and tutorials
├── product/             # Product requirements (excluded)
└── technical/           # Technical documentation
```
