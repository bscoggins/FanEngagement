# Badge Component Visual Guide

## Quick Reference

### Variants Color Palette

| Variant | Color Token | Hex Color | Use Case |
|---------|-------------|-----------|----------|
| **Default** | `--color-primary-600` | `#007bff` | Primary actions, default states |
| **Success** | `--color-success-600` | `hsl(142, 70%, 40%)` | Successful operations, active states, positive feedback |
| **Warning** | `--color-warning-600` | `hsl(38, 90%, 45%)` | Warnings, pending states, items requiring attention |
| **Error** | `--color-error-600` | `hsl(0, 70%, 45%)` | Errors, failed operations, critical issues |
| **Info** | `--color-info-600` | `hsl(210, 90%, 50%)` | Informational messages, secondary information |
| **Neutral** | `--color-neutral-600` | `hsl(0, 0%, 40%)` | Inactive states, drafts, neutral information |

### Size Specifications

| Size | Padding (Vertical × Horizontal) | Font Size | Min Height | Best For |
|------|--------------------------------|-----------|------------|----------|
| **Small** | `2px × 8px` | `12px` | `20px` | Inline use, compact spaces, status indicators |
| **Medium** | `4px × 12px` | `14px` | `24px` | Standard badges, general use |
| **Large** | `6px × 16px` | `16px` | `32px` | Emphasis, prominent displays, headers |

### Shape Options

| Shape | Border Radius | Visual Style | Best For |
|-------|---------------|--------------|----------|
| **Rounded** | `6px` | Subtle rounded corners | Professional, formal contexts |
| **Pill** | `9999px` | Fully rounded ends | Status indicators, tags, modern UI |

## Visual Examples

### All Variants (Medium Size, Rounded)
```
[Default]  [Success]  [Warning]  [Error]  [Info]  [Neutral]
  Blue       Green      Orange     Red     Blue     Gray
```

### Size Comparison (Success Variant)
```
Small:  [Success]
Medium: [ Success ]
Large:  [  Success  ]
```

### Shape Comparison (Info Variant)
```
Rounded: [Info]
Pill:    ( Info )
```

### With Icons
```
✓ [Verified]  ⚠️ [Warning]  ✗ [Failed]  ℹ️ [Info]  🔔 [Notification]
```

### With Dot Indicators (Small, Pill)
```
● (Online)   ● (Offline)   ● (Away)   ● (Inactive)
Green        Red           Orange     Gray
```

## Real-World Usage Examples

### Proposal Status Badges
```tsx
// Old implementation (inline styles)
<span style={{ backgroundColor: '#28a745', color: 'white', ... }}>Open</span>

// New implementation (Badge component)
<Badge variant="success">Open</Badge>
<Badge variant="neutral">Draft</Badge>
<Badge variant="error">Closed</Badge>
<Badge variant="default">Finalized</Badge>
```

### User Status Indicators
```tsx
<Badge variant="success" size="sm" shape="pill" dot>Active</Badge>
<Badge variant="warning" size="sm" shape="pill" dot>Pending</Badge>
<Badge variant="error" size="sm" shape="pill" dot>Suspended</Badge>
```

### Notification Counters
```tsx
<Badge variant="error" size="sm" shape="pill">3</Badge>
<Badge variant="info" size="sm" shape="pill">12</Badge>
<Badge variant="default" size="sm" shape="pill">99+</Badge>
```

### Feature Tags
```tsx
<Badge variant="info" size="sm" shape="pill">New</Badge>
<Badge variant="success" size="sm" shape="pill" icon="✓">Beta</Badge>
<Badge variant="warning" size="sm" shape="pill">Experimental</Badge>
<Badge variant="neutral" size="sm" shape="pill">Deprecated</Badge>
```

## Component Structure

```tsx
<span class="badge badge--{variant} badge--{size} badge--{shape}">
  {icon && <span class="badge__icon" aria-hidden="true">{icon}</span>}
  {dot && <span class="badge__dot" aria-hidden="true" />}
  {children && <span class="badge__text">{children}</span>}
</span>
```

## CSS Classes

### Base Classes
- `.badge` - Base badge styles (font, layout, transitions)
- `.badge__icon` - Icon container
- `.badge__dot` - Dot indicator
- `.badge__text` - Text content wrapper

### Variant Classes
- `.badge--default` - Primary blue
- `.badge--success` - Green
- `.badge--warning` - Orange
- `.badge--error` - Red
- `.badge--info` - Blue
- `.badge--neutral` - Gray

### Size Classes
- `.badge--sm` - Small size
- `.badge--md` - Medium size (default)
- `.badge--lg` - Large size

### Shape Classes
- `.badge--rounded` - Standard rounded corners (default)
- `.badge--pill` - Fully rounded ends

## Accessibility Features

✅ **Semantic HTML**: Uses `<span>` with proper classes  
✅ **ARIA Attributes**: Icons and dots have `aria-hidden="true"`  
✅ **Color + Text**: Color is not the only indicator  
✅ **Contrast**: WCAG 2.1 AA compliant (white text on colored backgrounds)  
✅ **Keyboard**: No interactive elements (display-only component)  
✅ **Screen Readers**: Text content is properly announced  

## Dark Mode Support

The Badge component automatically adapts to dark mode:

- Uses darker shades in dark mode (e.g., `-700` instead of `-600`)
- Dual activation: `@media (prefers-color-scheme: dark)` + `body.theme-dark` class
- Maintains proper contrast ratios
- All variants tested in both light and dark themes

## Browser Support

✅ Modern browsers (Chrome, Firefox, Safari, Edge)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)  
✅ Responsive design (320px to large desktop)  
✅ CSS Grid and Flexbox support required  
✅ CSS Custom Properties (variables) required  

## Performance Considerations

- **Lightweight**: No JavaScript (pure CSS)
- **Efficient**: Uses CSS classes instead of inline styles
- **Cacheable**: CSS is in separate file
- **Optimized**: Minimal DOM nodes
- **Transitions**: Respects `prefers-reduced-motion`

## Comparison with Button Component

Both Badge and Button follow the same design patterns:

| Feature | Badge | Button |
|---------|-------|--------|
| **Variants** | 6 semantic | 5 (primary, secondary, outline, ghost, danger) |
| **Sizes** | 3 (sm, md, lg) | 5 (xs, sm, md, lg, xl) |
| **Icons** | Yes (display only) | Yes (with positioning) |
| **Shapes** | 2 (rounded, pill) | Auto (based on size) |
| **Interactive** | No | Yes (clickable) |
| **States** | None | Hover, focus, active, disabled, loading |

## Integration Points

The Badge component is used in:
1. **ProposalStatusBadge** - Proposal status display
2. **Admin Organization Proposals Page** - Proposal listing
3. **Admin Proposal Detail Page** - Individual proposal view
4. **My Proposal Page** - User's proposal view

## Future Enhancements

Potential improvements for future iterations:
- Add more variants if needed (e.g., blockchain-specific)
- Support for custom colors via props
- Animation on value changes (optional)
- Storybook integration when available
- Additional icons or icon libraries
- Size variants for ultra-compact displays

## Testing Coverage

**28 test cases** covering:
- ✅ All 6 variants
- ✅ All 3 sizes
- ✅ All 2 shapes
- ✅ Icon support
- ✅ Dot indicator
- ✅ Custom className
- ✅ Test ID
- ✅ Ref forwarding
- ✅ Various combinations

**Integration tests**:
- ✅ ProposalStatusBadge component
- ✅ Admin Organization Proposals page
- ✅ All 674 frontend tests passing

---

For more details, see:
- `Badge.tsx` - Component implementation
- `Badge.css` - Styling
- `Badge.test.tsx` - Test suite
- `Badge.README.md` - Full documentation
- `Badge.showcase.html` - Visual showcase
- `BADGE_COMPONENT_SUMMARY.md` - Implementation summary
