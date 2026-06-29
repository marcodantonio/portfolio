# Optimization

## Current priorities

1. Keep rAF/WebGL work scoped to visible sections only
2. Normalize a few remaining bespoke media treatments across pages
3. Keep reducing UI duplication as new sections evolve
4. Continue simplifying page-level visual noise where cards are not needed
5. Refine `personAI` tone further if real recruiter usage suggests it

## Known design-system debt

- Some sections still mix primitives with custom wrappers instead of composing only from system blocks
- A few page-level compositions still rely on inline visual treatments rather than reusable visual patterns

## Known product debt

- `personAI` can still be refined further in tone and response presentation after more real usage feedback

## Recent under-the-hood improvements

- Hero WebGL now pauses its render loop when `#hero-section` leaves the viewport or the tab is hidden.
- Hero pointer tracking is scoped to `#hero-section` instead of `window`, so later sections do not pay bounding-box work on every pointer move.
- Skill sphere rAF now pauses outside the viewport and renders only once under `prefers-reduced-motion`.

## What was already removed

- Technical `personAI` copy in the page hero and preview
- Legacy global helper usage in key content sections
- Navbar horizontal-scroll pattern
- The old `projects` layout based on heavy absolute positioning and percentage offsets
- The extra `personAI` source summary footer and some of the heavier conversation chrome
- Repeated page-level gradient blobs now centralized behind `components/system/ambient.tsx`
- Much of the generic filler copy in home and secondary pages has been removed or tightened
