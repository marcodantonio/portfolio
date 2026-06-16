# WOW Homepage — Implementation Plan

Derived from `2026-05-30-wow-homepage-experience-design.md`. Build stays green
after each group; verify in-browser at the end.

## Group 1 — Foundations
1. Add `lenis` dependency.
2. `lib/motion.ts` — easing/duration tokens + `prefersReducedMotion()`.
3. `lib/scroll-signal.ts` — single shared scroll listener (rAF-throttled pub/sub).
4. CSS: motion custom props, `.kinetic-*`, `.marquee*`, `.grain` classes +
   centralized `prefers-reduced-motion` overrides.

## Group 2 — Reusable motion components
5. `components/system/smooth-scroll.tsx` — Lenis provider (no-op under reduced
   motion / coarse pointer); its rAF only drives Lenis.
6. `components/kinetic-heading.tsx` — per-word mask reveal heading (eyebrow + h2).
7. `components/marquee.tsx` — infinite tech-stack ticker, pause on hover.
8. `components/grain-overlay.tsx` — fixed subtle noise layer.

## Group 3 — Hero signature (B + D)
9. `hero-canvas.tsx` — formation phase (sample wordmark → particle targets,
   ambient→target→ambient on first load, cached in sessionStorage) + `hero:pulse`
   listener (color flare + shockwave).
10. `hero-mini-chat.tsx` — dispatch `hero:pulse` on send and on reply.
11. `intro.tsx` — scroll-linked parallax-out (canvas/orbs/inner) via scroll-signal.

## Group 4 — Wire-up
12. `app/layout.tsx` — wrap children in `<SmoothScroll>`, add `<GrainOverlay>`.
13. `app/page.tsx` — insert `<Marquee>` between Skills and Projects.
14. Migrate section `<h2>` titles to `<KineticHeading>` in about, education,
    skills, projects-rail, experience, contact.

## Group 5 — Verify
15. `npm run lint` + `npm run build` green.
16. Browser: smooth scroll, formation, chat pulse, kinetic reveals, marquee,
    no overlap, no console errors; reduced-motion sanity.
17. Update `docs/WORKLOG.md`.
