# Story E-008-39: Mobile-Optimized Layouts

**Epic:** E-008 – Frontend User Experience & Navigation Overhaul  
**Workstream:** F – Responsive Design  
**Priority:** Next  
**Status:** Proposed

## User Story

> As a **mobile user**, I want **mobile-optimized layouts with readable text**, so that **I don't need to zoom or scroll horizontally**.

## Acceptance Criteria

- [ ] Mobile breakpoint: <768px (tablet: 768-1024px, desktop: >1024px)
- [ ] Font sizes adjust for mobile (minimum 16px for body text)
- [ ] No horizontal overflow (width: 100%, max-width: 100%)
- [ ] Images and videos scale to fit container
- [ ] Tested on iPhone (375px, 390px, 428px) and Android (360px, 412px)

## Implementation Notes

- Use `meta viewport` tag
- CSS: Mobile-first approach
- Test on real devices

## Files to Change

- All page and component CSS files
