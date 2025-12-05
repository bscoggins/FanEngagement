# Story E-008-45: Responsive Images and Media

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** F – Responsive Design  
**Priority:** Later  
**Status:** Proposed

## User Story

> As a **user**, I want **responsive images and media**, so that **pages load quickly and look sharp on my device**.

## Acceptance Criteria

- [ ] Images use `srcset` and `sizes` attributes
- [ ] Images use modern formats (WebP) with fallbacks
- [ ] Lazy loading for images below the fold
- [ ] Videos have playback controls and are mobile-friendly
- [ ] Tested across devices and network conditions

## Implementation Notes

- Use `<picture>` element for art direction
- Lazy loading: `loading="lazy"` attribute or Intersection Observer
- Consider: Image optimization service

## Files to Change

- All pages with images
- Image components
