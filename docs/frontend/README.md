# Frontend Documentation

**Version:** 1.0  
**Last Updated:** 2025-12-19  
**Repository:** FanEngagement

---

## 📚 Quick Links

### 🎨 **Design System**
**[design-system.md](./design-system.md)** — Complete design token documentation  
**[design-tokens-showcase.html](./design-tokens-showcase.html)** — Interactive visual reference for all tokens

**Start here** if you're:
- Building new UI components
- Styling existing components
- Looking for color, spacing, typography, or shadow tokens
- Wondering which tokens to use

### 🎭 **Figma Design Library**
**[figma-setup-guide.md](./figma-setup-guide.md)** — Step-by-step Figma library creation  
**[figma-token-mapping.md](./figma-token-mapping.md)** — CSS-to-Figma token reference  
**[figma-component-specs.md](./figma-component-specs.md)** — Detailed component specifications

**Start here** if you're:
- Creating the Figma design library
- Importing design tokens into Figma
- Building components in Figma
- Verifying designs match the codebase

### 🧭 **Navigation Design**
**[README-navigation-design.md](./README-navigation-design.md)** — Navigation documentation index  
**[navigation-design-specifications.md](./navigation-design-specifications.md)** — Complete navigation specs

**Start here** if you're:
- Working on navigation components
- Implementing sidebar, mobile nav, or organization switcher
- Need navigation-specific token usage

### ♿ **Accessibility**
**[accessibility.md](./accessibility.md)** — Complete accessibility playbook and checklist  
**[keyboard-navigation.md](./keyboard-navigation.md)** — Keyboard navigation implementation

**Start here** if you're:
- Building new features or components
- Need an accessibility checklist for PR review
- Looking for ARIA, keyboard, or screen reader guidance
- Setting up accessibility testing tools

---

## 📖 Complete Documentation Index

### Design System & Tokens
| Document | Purpose | Audience |
|----------|---------|----------|
| [design-system.md](./design-system.md) | **Authoritative design token reference** | All developers |
| [design-tokens-showcase.html](./design-tokens-showcase.html) | **Interactive visual showcase** | Designers, developers |
| [SPACING_TOKENS_SUMMARY.md](./SPACING_TOKENS_SUMMARY.md) | Spacing token implementation summary | Developers |
| [shadow-tokens-demo.html](./shadow-tokens-demo.html) | Shadow & radius token demonstrations | Designers, developers |
| [spacing-tokens-demo.png](./spacing-tokens-demo.png) | Visual spacing reference image | Designers |

### Figma Design Library
| Document | Purpose | Audience |
|----------|---------|----------|
| [figma-setup-guide.md](./figma-setup-guide.md) | **Step-by-step Figma library setup** | Designers |
| [figma-token-mapping.md](./figma-token-mapping.md) | **Complete CSS-to-Figma token mapping** | Designers, developers |
| [figma-component-specs.md](./figma-component-specs.md) | Detailed component specifications for Figma | Designers |
| [design-tokens.json](./design-tokens.json) | Machine-readable token export for plugins | Designers (automated import) |
| [design-tokens.csv](./design-tokens.csv) | Spreadsheet-friendly token export | Designers, PMs |

### Navigation System
| Document | Purpose | Audience |
|----------|---------|----------|
| [README-navigation-design.md](./README-navigation-design.md) | Navigation documentation index | All |
| [navigation-design-specifications.md](./navigation-design-specifications.md) | Complete navigation technical specs | Developers, QA |
| [navigation.md](./navigation.md) | Navigation implementation guide | Developers |
| [navigation-visual-mockup-guide.md](./navigation-visual-mockup-guide.md) | Visual design mockups | Designers, PMs |
| [navigation-token-usage-guide.md](./navigation-token-usage-guide.md) | Token usage in navigation | Developers |
| [keyboard-navigation.md](./keyboard-navigation.md) | Keyboard accessibility guide | Developers, QA, Accessibility |

### Accessibility
| Document | Purpose | Audience |
|----------|---------|----------|
| [accessibility.md](./accessibility.md) | **Complete accessibility playbook and checklist** | All developers, QA, Accessibility |
| [keyboard-navigation.md](./keyboard-navigation.md) | Detailed keyboard navigation implementation | Developers |

---

## 🚀 Quick Start

### For Designers: Building the Figma Library

**1. Start with the setup guide:**
- Open [figma-setup-guide.md](./figma-setup-guide.md)
- Follow step-by-step instructions (2-3 hours)

**2. Import tokens:**
- Use [design-tokens.json](./design-tokens.json) with Figma Tokens plugin (fastest)
- Or manually create styles using [figma-token-mapping.md](./figma-token-mapping.md)

**3. Build components:**
- Follow specifications in [figma-component-specs.md](./figma-component-specs.md)
- Create variants for all states (hover, focus, active, disabled)

**4. Publish and share:**
- Publish library for team use
- Share with developers for verification

### For Developers: Using Design Tokens

**1. Find the token you need:**
- Open [design-tokens-showcase.html](./design-tokens-showcase.html) in your browser
- Or search [design-system.md](./design-system.md) for token documentation

**2. Use in your CSS:**
```css
.my-component {
  color: var(--color-text-primary);
  background-color: var(--color-surface);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
```

**3. Use utility classes (when appropriate):**
```html
<div class="p-6 mb-4 gap-3">
  <h2 class="mb-3">Title</h2>
  <p class="text-body">Content</p>
</div>
```

### For Developers: Storybook

- From `frontend/`, run `npm run storybook` to explore components with controls and the accessibility addon.
- Generate a static bundle with `npm run build-storybook` for local sharing.

### Building Navigation Components

**1. Review navigation specifications:**
- Read [navigation-design-specifications.md](./navigation-design-specifications.md)
- Check [navigation-token-usage-guide.md](./navigation-token-usage-guide.md) for token usage

**2. Follow existing patterns:**
- Use the same tokens as similar components
- Maintain consistent spacing and elevation

**3. Test keyboard navigation:**
- Review [keyboard-navigation.md](./keyboard-navigation.md)
- Ensure all interactive elements are keyboard accessible

---

## 🎯 Documentation Standards

All documentation in this directory follows these standards:

### Structure
- **Version number** at the top
- **Last updated date**
- **Purpose/audience** clearly stated
- **Table of contents** for long documents
- **Code examples** with syntax highlighting
- **Visual references** where helpful

### Design Tokens
- Token names use CSS custom property syntax: `var(--token-name)`
- Include both token name and computed value
- Provide usage guidelines
- Show anti-patterns (what NOT to do)

### Navigation Specs
- Complete measurements and spacing
- Token references for all values
- Visual mockups where helpful
- Accessibility requirements
- Responsive behavior

---

## 🔍 Finding What You Need

### "I need to style a button"
→ [design-system.md](./design-system.md) — See "Common Patterns" section

### "I need to add spacing between elements"
→ [design-tokens-showcase.html](./design-tokens-showcase.html) — Open in browser, scroll to "Spacing Scale"

### "I need to implement the sidebar"
→ [navigation-design-specifications.md](./navigation-design-specifications.md) — See "Desktop Sidebar Navigation"

### "I need to know which colors to use"
→ [design-tokens-showcase.html](./design-tokens-showcase.html) — Open in browser, scroll to "Colors"

### "I need to make my component keyboard accessible"
→ [accessibility.md](./accessibility.md) — See "Keyboard Navigation" section

### "I need to ensure my component is accessible"
→ [accessibility.md](./accessibility.md) — Complete accessibility playbook with checklist

### "I need to test for accessibility issues"
→ [accessibility.md](./accessibility.md) — See "Tools & Setup" section

### "I need visual mockups for navigation"
→ [navigation-visual-mockup-guide.md](./navigation-visual-mockup-guide.md) — Visual design reference

### "I need to create a Figma design library"
→ [figma-setup-guide.md](./figma-setup-guide.md) — Complete setup instructions

### "I need to verify Figma designs match code"
→ [figma-token-mapping.md](./figma-token-mapping.md) — CSS-to-Figma token reference

---

## 📝 Contributing to Documentation

When adding or updating documentation:

1. **Update the version number and date**
2. **Add an entry to this README** if it's a new file
3. **Link to related documentation** where appropriate
4. **Include code examples** with proper syntax highlighting
5. **Provide visual examples** (HTML demos, images) when helpful
6. **Follow existing naming conventions**
7. **Test all links** before committing

---

## 🆘 Need Help?

- **Questions about design tokens?** See [design-system.md](./design-system.md) or open the [interactive showcase](./design-tokens-showcase.html)
- **Questions about navigation?** Start with [README-navigation-design.md](./README-navigation-design.md)
- **Questions about accessibility?** See [accessibility.md](./accessibility.md) for complete guidance
- **Can't find what you need?** Check the main [docs/](../) directory
- **Found an issue?** Open a GitHub issue with the `documentation` label

---

## 📊 Documentation Status

| Category | Status | Last Updated |
|----------|--------|--------------|
| Design System | ✅ Complete | 2025-12-09 |
| Figma Design Library | ✅ Complete | 2025-12-09 |
| Navigation Design | ✅ Complete | 2025-12-08 |
| Keyboard Navigation | ✅ Complete | 2025-12-08 |
| Accessibility Playbook | ✅ Complete | 2025-12-19 |
| Interactive Demos | ✅ Complete | 2025-12-09 |

---

**Maintained by:** FanEngagement Frontend Team  
**Last Reviewed:** 2025-12-19
