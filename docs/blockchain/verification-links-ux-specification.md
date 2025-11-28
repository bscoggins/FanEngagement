# Blockchain Verification Links UX Specification

**Document ID:** E-004-12  
**Version:** 1.0  
**Status:** Draft  
**Author:** docs-agent  
**Date:** 2025-01-28  

---

## 1. Overview

This document defines the UX design for blockchain verification links in the FanEngagement platform. These links allow users to verify on-chain records via Solana Explorer, providing transparency while maintaining a subtle, non-intrusive experience for Web2 users.

### 1.1 Goals

- Provide transparency by allowing users to verify on-chain records
- Maintain a subtle, non-intrusive design for users unfamiliar with blockchain
- Follow existing frontend design patterns and styling conventions
- Handle all states gracefully (loading, success, error, unavailable)

### 1.2 Related Stories

- **E-004-11:** Data model updates for blockchain references
- **E-004-20:** Frontend implementation of Solana Explorer links (depends on this document)
- **E-004-16:** Token mint creation
- **E-004-17:** Proposal lifecycle events

---

## 2. Visual Indicators

### 2.1 Blockchain Verified Badge

The primary visual indicator for blockchain-verified items is a small, subtle badge that appears next to verified content.

#### 2.1.1 Design Specifications

| Property | Value | Notes |
|----------|-------|-------|
| Icon | Chain link (🔗) or custom SVG | Use a simple chain/link icon |
| Size | 16px × 16px | Matches inline text size |
| Color (default) | `#9945FF` (Solana purple) | Subtle brand alignment |
| Color (hover) | `#14F195` (Solana green) | Interactive feedback |
| Border radius | 4px | Consistent with existing badges |
| Padding | 4px 8px | Comfortable touch target |
| Font size | 12px | Smaller than body text |
| Font weight | 500 | Medium weight for readability |

#### 2.1.2 Badge States

**Verified State (Success)**
```
┌──────────────────────────┐
│ 🔗 Verified on Solana    │  ← Clickable link to Explorer
└──────────────────────────┘
```
- Background: `rgba(153, 69, 255, 0.1)` (light purple)
- Text color: `#9945FF` (Solana purple)
- Cursor: `pointer`

**Pending State (Loading)**
```
┌──────────────────────────┐
│ ⏳ Pending verification  │  ← Non-clickable, shows spinner
└──────────────────────────┘
```
- Background: `rgba(108, 117, 125, 0.1)` (light gray)
- Text color: `#6c757d` (gray)
- Cursor: `default`
- Animation: Subtle pulse or spinner

**Unavailable State (No blockchain reference)**
```
┌──────────────────────────┐
│ ○ Not on chain           │  ← Non-clickable, informational
└──────────────────────────┘
```
- Background: `transparent`
- Border: `1px dashed #dee2e6`
- Text color: `#adb5bd` (light gray)
- Cursor: `default`
- Optional: Hide completely if blockchain integration is not enabled

### 2.2 Icon Options

The following icon options are recommended, in order of preference:

1. **Custom SVG Chain Icon** (Preferred)
   - Clean, minimal design
   - Scalable without quality loss
   - Consistent with Solana branding

2. **Unicode Chain Link** (🔗)
   - Fallback option
   - Universal browser support
   - May vary slightly across platforms

3. **Heroicons Link Icon**
   - If using Heroicons library
   - `LinkIcon` from `@heroicons/react/outline`

### 2.3 Compact Mode

For space-constrained layouts (e.g., table rows), use a compact icon-only mode:

```
┌────┐
│ 🔗 │  ← Icon only, tooltip on hover
└────┘
```

- Size: 20px × 20px
- Tooltip: "Verified on Solana - Click to view"

---

## 3. Link Placement

### 3.1 ShareType Detail Page

#### 3.1.1 Location

The blockchain verification link appears in the ShareType card/detail view, positioned near the metadata section.

#### 3.1.2 Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Share Types                                                     │
│ Organization: Manchester United Supporters Club                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Name          │ Symbol │ Voting Weight │ Max Supply │ ...   │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Fan Token     │ FAN    │ 1.0           │ 10,000     │       │ │
│ │ 🔗 Verified on Solana                                       │ │
│ │                                                             │ │
│ │ Mint Address: So1an...xyz123                                │ │
│ │ ↳ View on Solana Explorer ↗                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.3 Information Displayed

| Field | Description | When Shown |
|-------|-------------|------------|
| Mint Address | Truncated Solana address | When `SolanaMintAddress` is present |
| Explorer Link | Link to view token on Solana Explorer | When `SolanaMintAddress` is present |
| Mint Transaction | Link to mint creation transaction | When `SolanaMintTransactionSignature` is present |

#### 3.1.4 Component Structure

```
<ShareTypeBlockchainInfo>
  ├── <VerificationBadge status="verified|pending|unavailable" />
  ├── <TruncatedAddress address="..." />  // Shows first 4 + ... + last 6 chars
  └── <ExplorerLink type="address" value="..." network="devnet|mainnet" />
</ShareTypeBlockchainInfo>
```

### 3.2 Proposal Detail Page

#### 3.2.1 Location

The blockchain verification appears in the proposal metadata section, showing verification status for each lifecycle event.

#### 3.2.2 Layout Mockup

```
┌─────────────────────────────────────────────────────────────────┐
│ Proposal: Choose Our New Kit Color                              │
│ ┌────────────────────────────────────────────────────────────┐  │
│ │ Status: Finalized  🏆                                       │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ BLOCKCHAIN VERIFICATION                                     │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │                                                             │ │
│ │  ✓ Proposal Created                                         │ │
│ │    Account: So1an...abc456                                  │ │
│ │    ↳ View on Solana Explorer ↗                              │ │
│ │                                                             │ │
│ │  ✓ Proposal Opened (Jan 15, 2025 10:30 AM)                  │ │
│ │    Transaction: 5K7x...def789                               │ │
│ │    ↳ View transaction ↗                                     │ │
│ │                                                             │ │
│ │  ✓ Proposal Closed (Jan 22, 2025 11:45 AM)                  │ │
│ │    Transaction: 9M2y...ghi012                               │ │
│ │    ↳ View transaction ↗                                     │ │
│ │                                                             │ │
│ │  ✓ Proposal Finalized (Jan 22, 2025 2:00 PM)                │ │
│ │    Transaction: 3P8z...jkl345                               │ │
│ │    ↳ View transaction ↗                                     │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Start Date        │ End Date          │ Quorum              │ │
│ │ Jan 15, 2025      │ Jan 22, 2025      │ 50%                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.2.3 Lifecycle Events Displayed

| Event | Blockchain Field | Description |
|-------|-----------------|-------------|
| Proposal Created | `SolanaAccountAddress` | On-chain proposal account |
| Proposal Opened | `SolanaOpenTransactionSignature` | Transaction when opened for voting |
| Proposal Closed | `SolanaCloseTransactionSignature` | Transaction when voting closed |
| Proposal Finalized | `SolanaFinalizeTransactionSignature` | Transaction with final results hash |

#### 3.2.4 Component Structure

```
<ProposalBlockchainVerification>
  ├── <SectionHeader title="Blockchain Verification" />
  ├── <LifecycleEvent 
  │     event="created" 
  │     address="..." 
  │     status="verified" 
  │   />
  ├── <LifecycleEvent 
  │     event="opened" 
  │     signature="..." 
  │     timestamp="..." 
  │     status="verified" 
  │   />
  ├── <LifecycleEvent 
  │     event="closed" 
  │     signature="..." 
  │     timestamp="..." 
  │     status="pending" 
  │   />
  └── <LifecycleEvent 
        event="finalized" 
        signature={null} 
        status="unavailable" 
      />
</ProposalBlockchainVerification>
```

### 3.3 Table/List Views

For ShareType and Proposal list views, use compact indicators:

```
┌──────────────┬────────┬───────────────┬───────────┬─────────┐
│ Name         │ Symbol │ Voting Weight │ Max Supply│ Chain   │
├──────────────┼────────┼───────────────┼───────────┼─────────┤
│ Fan Token    │ FAN    │ 1.0           │ 10,000    │ 🔗      │  ← Verified
│ VIP Pass     │ VIP    │ 5.0           │ 100       │ ⏳      │  ← Pending
│ Legacy Share │ LEG    │ 1.0           │ 5,000     │ ○       │  ← Not on chain
└──────────────┴────────┴───────────────┴───────────┴─────────┘
```

---

## 4. State Handling

### 4.1 State Definitions

| State | Condition | Visual | Behavior |
|-------|-----------|--------|----------|
| **Verified** | Blockchain reference exists and is confirmed | Green checkmark + purple badge | Clickable link to Explorer |
| **Pending** | Transaction submitted but not confirmed | Animated spinner | Non-clickable, tooltip explains |
| **Unavailable** | No blockchain reference | Dashed outline or hidden | Non-clickable, optional tooltip |
| **Error** | Transaction failed or invalid | Red indicator | Show error message in tooltip |

### 4.2 Loading State

When fetching blockchain confirmation status:

```jsx
<VerificationBadge>
  <Spinner size="small" />
  <span>Checking verification...</span>
</VerificationBadge>
```

- Duration: Show for minimum 300ms to prevent flash
- Fallback: If check fails, show "unavailable" state

### 4.3 Error State

When a blockchain transaction has failed:

```jsx
<VerificationBadge status="error">
  <ErrorIcon />
  <span>Verification failed</span>
  <Tooltip>Transaction failed: {errorMessage}</Tooltip>
</VerificationBadge>
```

### 4.4 Tooltip Content

**Verified State Tooltip:**
```
Verified on Solana blockchain
Network: Devnet
Click to view on Solana Explorer
```

**Pending State Tooltip:**
```
Transaction pending confirmation
Submitted: 2 minutes ago
This may take up to 30 seconds
```

**Unavailable State Tooltip:**
```
This item has not been recorded on the blockchain.
Blockchain verification is optional.
```

---

## 5. Solana Explorer URL Patterns

### 5.1 URL Construction

| Network | Base URL | Query Parameter |
|---------|----------|-----------------|
| Mainnet | `https://explorer.solana.com` | (none) |
| Devnet | `https://explorer.solana.com` | `?cluster=devnet` |
| Testnet | `https://explorer.solana.com` | `?cluster=testnet` |

### 5.2 URL Types

#### 5.2.1 Transaction URL
```
# Mainnet
https://explorer.solana.com/tx/{signature}

# Devnet
https://explorer.solana.com/tx/{signature}?cluster=devnet
```

**Examples:**
- Mainnet: `https://explorer.solana.com/tx/5K7xYz...abc123`
- Devnet: `https://explorer.solana.com/tx/5K7xYz...abc123?cluster=devnet`

#### 5.2.2 Account/Address URL
```
# Mainnet
https://explorer.solana.com/address/{address}

# Devnet
https://explorer.solana.com/address/{address}?cluster=devnet
```

**Examples:**
- Mainnet: `https://explorer.solana.com/address/So1an...xyz789`
- Devnet: `https://explorer.solana.com/address/So1an...xyz789?cluster=devnet`

### 5.3 Network Configuration

The active network should be determined from environment configuration:

```typescript
// Environment variable
VITE_SOLANA_NETWORK=devnet  // or 'mainnet-beta'

// URL construction utility
function getSolanaExplorerUrl(
  type: 'tx' | 'address',
  value: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  const baseUrl = 'https://explorer.solana.com';
  const path = type === 'tx' ? `/tx/${value}` : `/address/${value}`;
  const query = network !== 'mainnet-beta' ? `?cluster=${network}` : '';
  return `${baseUrl}${path}${query}`;
}
```

### 5.4 Link Behavior

- **Target:** `_blank` (opens in new tab)
- **Rel:** `noopener noreferrer` (security best practice)
- **Aria label:** Descriptive text for accessibility

```jsx
<a
  href={explorerUrl}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={`View ${type} on Solana Explorer`}
>
  View on Solana Explorer ↗
</a>
```

---

## 6. Component Specifications

### 6.1 SolanaExplorerLink Component

#### Props Interface

```typescript
interface SolanaExplorerLinkProps {
  /** Type of link: transaction or account address */
  type: 'transaction' | 'address';
  
  /** Transaction signature or account address */
  value: string | null | undefined;
  
  /** Display mode */
  variant?: 'full' | 'compact' | 'icon-only';
  
  /** Custom label text */
  label?: string;
  
  /** Show truncated address/signature */
  showValue?: boolean;
  
  /** Additional CSS class */
  className?: string;
}
```

#### Usage Examples

```jsx
// Full display with label
<SolanaExplorerLink
  type="transaction"
  value="5K7xYz...abc123"
  variant="full"
  showValue={true}
/>

// Compact badge
<SolanaExplorerLink
  type="address"
  value="So1an...xyz789"
  variant="compact"
/>

// Icon only for tables
<SolanaExplorerLink
  type="transaction"
  value="5K7xYz...abc123"
  variant="icon-only"
/>
```

### 6.2 BlockchainVerificationBadge Component

#### Props Interface

```typescript
interface BlockchainVerificationBadgeProps {
  /** Current verification status */
  status: 'verified' | 'pending' | 'unavailable' | 'error';
  
  /** Explorer link (for verified status) */
  explorerUrl?: string;
  
  /** Custom tooltip text */
  tooltip?: string;
  
  /** Show text label or icon only */
  iconOnly?: boolean;
  
  /** Error message (for error status) */
  errorMessage?: string;
}
```

### 6.3 ProposalBlockchainVerification Component

#### Props Interface

```typescript
interface ProposalBlockchainVerificationProps {
  /** Proposal account address */
  accountAddress?: string | null;
  
  /** Open transaction signature */
  openTxSignature?: string | null;
  
  /** Close transaction signature */
  closeTxSignature?: string | null;
  
  /** Finalize transaction signature */
  finalizeTxSignature?: string | null;
  
  /** Timestamps for each event */
  openedAt?: string | null;
  closedAt?: string | null;
  finalizedAt?: string | null;
  
  /** Proposal status (to determine which events to show) */
  proposalStatus: 'Draft' | 'Open' | 'Closed' | 'Finalized';
}
```

### 6.4 ShareTypeBlockchainInfo Component

#### Props Interface

```typescript
interface ShareTypeBlockchainInfoProps {
  /** Solana token mint address */
  mintAddress?: string | null;
  
  /** Mint creation transaction signature */
  mintTxSignature?: string | null;
  
  /** Display variant */
  variant?: 'inline' | 'card';
}
```

---

## 7. Accessibility Considerations

### 7.1 Screen Reader Support

- All links must have descriptive `aria-label` attributes
- Status indicators must have `aria-live` regions for dynamic updates
- Tooltips must be accessible via keyboard focus

### 7.2 Keyboard Navigation

- All interactive elements must be focusable
- Focus indicators must be visible (follow existing patterns)
- Escape key should close tooltips

### 7.3 Color Contrast

- All text must meet WCAG AA contrast requirements
- Do not rely solely on color to convey status
- Use icons + text for status indication

### 7.4 Focus States

```css
.verification-badge:focus {
  outline: 2px solid #9945FF;
  outline-offset: 2px;
}
```

---

## 8. Responsive Design

### 8.1 Breakpoints

| Breakpoint | Badge Display | Link Text |
|------------|---------------|-----------|
| Desktop (>1024px) | Full badge + text | "View on Solana Explorer" |
| Tablet (768-1024px) | Badge + text | "View on Explorer" |
| Mobile (<768px) | Icon only | Tooltip on tap |

### 8.2 Mobile Considerations

- Touch targets minimum 44px × 44px
- Tooltips become tap-to-reveal on mobile
- Consider bottom sheet for detailed blockchain info

---

## 9. Implementation Notes

### 9.1 Styling Approach

Follow existing frontend patterns:
- Use inline styles for component-specific styling (matches existing components)
- Primary color: `#0066cc` (platform default)
- Solana brand color: `#9945FF` (use sparingly for blockchain-specific elements)

### 9.2 Test IDs

Add `data-testid` attributes for E2E testing:
- `data-testid="blockchain-verification-badge"`
- `data-testid="solana-explorer-link"`
- `data-testid="blockchain-status-{status}"`

### 9.3 Error Handling

- Gracefully handle null/undefined blockchain references
- Show appropriate fallback UI when blockchain features are disabled
- Log errors but don't crash the UI

---

## 10. Future Considerations

### 10.1 Potential Enhancements

- Real-time confirmation status polling
- Copy address/signature to clipboard button
- QR code generation for mobile scanning
- Transaction history timeline view
- Integration with wallet connection (E-004-25)

### 10.2 Analytics

Consider tracking:
- Click-through rate to Solana Explorer
- Tooltip hover/view rates
- User engagement with blockchain features

---

## 11. References

- [Solana Explorer](https://explorer.solana.com)
- [Solana Brand Guidelines](https://solana.com/branding)
- [FanEngagement Frontend Components](../frontend/src/components/)
- [E-004-11: Data Model Updates](../docs/product/E-004-11-data-model-updates.md)
- [E-004-20: Frontend Explorer Links](../docs/product/E-004-20-frontend-explorer-links.md)

---

## Appendix A: Visual Mockup Summary

### A.1 Badge States Visual Reference

```
VERIFIED:    ┌─────────────────────────┐
             │ 🔗 Verified on Solana   │  (purple background, clickable)
             └─────────────────────────┘

PENDING:     ┌─────────────────────────┐
             │ ⏳ Pending verification │  (gray background, not clickable)
             └─────────────────────────┘

UNAVAILABLE: ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
             │ ○ Not on chain          │  (dashed border, not clickable)
             └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘

ERROR:       ┌─────────────────────────┐
             │ ⚠ Verification failed   │  (red background, has tooltip)
             └─────────────────────────┘
```

### A.2 ShareType Detail Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ SHARE TYPE DETAILS                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Name:           Fan Token                                     │
│   Symbol:         FAN                                           │
│   Voting Weight:  1.0                                           │
│   Max Supply:     10,000                                        │
│   Transferable:   Yes                                           │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│   BLOCKCHAIN VERIFICATION                                       │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   🔗 Verified on Solana                                         │
│                                                                 │
│   Mint Address:  So1an...xyz123                                 │
│                  └─ View on Explorer ↗                          │
│                                                                 │
│   Mint Transaction:  5K7x...abc789                              │
│                      └─ View transaction ↗                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### A.3 Proposal Detail Integration

```
┌─────────────────────────────────────────────────────────────────┐
│ PROPOSAL: Choose Our New Kit Color                              │
│                                                                 │
│   Status:  ┌────────────┐                                       │
│            │ Finalized  │                                       │
│            └────────────┘                                       │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│   BLOCKCHAIN VERIFICATION                                       │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   ✓ Created                                                     │
│     Account: So1an...abc456  ↗                                  │
│                                                                 │
│   ✓ Opened  •  Jan 15, 2025 10:30 AM                            │
│     Tx: 5K7x...def789  ↗                                        │
│                                                                 │
│   ✓ Closed  •  Jan 22, 2025 11:45 AM                            │
│     Tx: 9M2y...ghi012  ↗                                        │
│                                                                 │
│   ✓ Finalized  •  Jan 22, 2025 2:00 PM                          │
│     Tx: 3P8z...jkl345  ↗                                        │
│     Results hash committed to chain                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix B: CSS Variables Reference

For consistent styling, the following CSS variables are recommended:

```css
:root {
  /* Solana brand colors */
  --solana-purple: #9945FF;
  --solana-green: #14F195;
  
  /* Blockchain verification states */
  --blockchain-verified-bg: rgba(153, 69, 255, 0.1);
  --blockchain-verified-text: #9945FF;
  --blockchain-pending-bg: rgba(108, 117, 125, 0.1);
  --blockchain-pending-text: #6c757d;
  --blockchain-unavailable-border: #dee2e6;
  --blockchain-unavailable-text: #adb5bd;
  --blockchain-error-bg: rgba(220, 53, 69, 0.1);
  --blockchain-error-text: #dc3545;
  
  /* Transitions */
  --blockchain-transition: all 0.2s ease;
}
```

---

*End of Document*
