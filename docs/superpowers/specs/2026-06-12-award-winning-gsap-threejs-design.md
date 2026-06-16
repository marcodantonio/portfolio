# Award-winning motion upgrade: GSAP + persistent Three.js canvas

**Date:** 2026-06-12
**Status:** Approved (approach A)

## Goal

Raise the portfolio to award-level (Awwwards-style) motion quality using GSAP as the
primary scroll-choreography engine and a single persistent Three.js canvas, while
keeping the UX sharp, simple, and recruiter-friendly, Lighthouse high, and fixing
known code-quality/security issues along the way.

## Decisions (user-approved)

- GSAP becomes the main motion engine; framer-motion stays only for existing UI
  micro-transitions until individually migrated.
- All four set pieces: persistent canvas, cinematic projects rail, section
  transitions, premium micro-interactions.
- Performance posture: full spectacle on desktop fine-pointer devices, lightened
  mobile tier, static-but-complete content under `prefers-reduced-motion`.
- Approach A: GSAP ScrollTrigger on top of Lenis (official integration recipe),
  one WebGL context for the whole page. `lib/scroll-signal.ts` is retired as
  consumers migrate; docs updated to present ScrollTrigger as the pattern.

## Architecture

### 1. Motion core

- **New `lib/gsap.ts`** — single module that imports `gsap`, registers
  `ScrollTrigger` + `SplitText` (free since GSAP 3.13), and exports the configured
  `gsap` instance. All components import GSAP from here, never from `gsap` directly.
- **`components/system/smooth-scroll.tsx`** — keeps owning Lenis. Integration:
  `lenis.on("scroll", ScrollTrigger.update)`, `gsap.ticker.add((t) => lenis.raf(t * 1000))`,
  `gsap.ticker.lagSmoothing(0)`. Under reduced motion Lenis stays disabled and no
  ScrollTrigger choreography is registered.
- **Responsive tiers via `gsap.matchMedia()`:**
  - `(hover: hover) and (pointer: fine)` + width ≥ 1024px → full choreography.
  - Touch / narrow → no pinning, lighter parallax, cheaper canvas.
  - `(prefers-reduced-motion: reduce)` → no scroll choreography at all; all content
    rendered visible in its final state.

### 2. Persistent Three.js canvas

- **`components/scene/site-canvas.tsx`** (refactor of `components/hero-canvas.tsx`) —
  the particle field becomes a `position: fixed` full-viewport background layer
  (z-index 0, `pointer-events: none`), mounted once in the site shell.
- **Preserved behaviors:** "MARCO D'ANTONIO" formation on first load (sessionStorage
  cache), chat shockwave (`hero:pulse`), mouse repulsion, theme-aware palette,
  WebGL feature detection and StrictMode guard.
- **New scene controller:** scroll progress (from Lenis/ScrollTrigger) drives
  per-section scene states — palette lerp (u_c1/u_c2/u_c3), turbulence (u_warp,
  u_speed), density/opacity, camera drift. Particles recede in depth and dim where
  dense text sits so copy stays readable.
- **Performance:** single WebGL context for the whole site; particle count
  ~22k desktop / ~7k touch; DPR cap 1.6 desktop / 1.25 touch; rendering paused on
  `document.visibilitychange`; under reduced motion the animated canvas is not
  mounted at all and a static gradient backdrop takes its place — a deliberate
  change from today, where the ambient field still animates under reduced motion.

### 3. Cinematic projects rail

- **Desktop tier:** `#projects` section pinned by ScrollTrigger; vertical scroll
  scrubs horizontal `translateX` of the card track; thin progress indicator;
  subtle velocity-linked skew on cards.
- **Touch tier:** existing drag-rail code path stays as-is (momentum drag).
- **Card hover (desktop):** GSAP `quickTo` tilt replacing manual style writes, plus
  a background-canvas ripple on hover reusing the existing `u_click` shockwave
  uniform (event with card center in NDC) — no extra WebGL contexts.

### 4. Section transitions

- **Ghost section numbers:** oversized numerals (01–06) behind each section,
  parallax-scrubbed, `aria-hidden`.
- **`components/kinetic-heading.tsx`:** internals rewritten on SplitText
  (char-level masked reveal, scrub-independent, triggered by ScrollTrigger).
  Public API unchanged (`text`, `eyebrow`, `as`, `className`). Plain text remains
  in the DOM for accessibility/selection.
- **Content reveals:** multi-layer mask/clip-path entrances for section blocks via
  `ScrollTrigger.batch`, replacing the current IntersectionObserver-based reveals
  where they exist.

### 5. Premium micro-interactions

- **`components/custom-cursor.tsx`:** GSAP `quickTo` movement; `mix-blend-mode`
  ring; contextual states — "drag" over the rail, "view" over project cards,
  enlarged over links/buttons; click squash. Fixes existing defects: hover
  listeners are currently attached per-element at mount (never removed, blind to
  later-mounted nodes) → replaced with document-level event delegation.
- **`components/magnetic.tsx`:** reimplemented on `gsap.quickTo` with proper
  elastic release.

### 6. Code quality & security fixes (independent of the redesign)

1. `app/api/personai/route.ts` — stop echoing internal `error.message` to the
   client (information disclosure); log server-side, return a generic message.
2. `next.config.ts` — HSTS gains `includeSubDomains; preload`.
3. `lib/security.ts` — trust `http://localhost` / `http://127.0.0.1` origins only
   when not in production.
4. `package.json` — move `@types/three` to `devDependencies`.
5. `components/custom-cursor.tsx` — listener leak fix (see §5).
6. In-memory rate limiting is per-isolate on Workers — documented as a known,
   accepted limitation (Turnstile is the primary abuse gate).

## Data flow

- Scroll position: Lenis → ScrollTrigger (single source). No new scroll listeners.
- Scene state: ScrollTrigger progress callbacks → scene controller → uniforms.
- DOM↔canvas events keep the existing CustomEvent contract (`hero:pulse`,
  `hero:phase`, new `scene:ripple` for card hover).

## Error handling

- WebGL unavailable → static shell (current behavior preserved).
- GSAP plugin registration is module-scoped and SSR-guarded (`"use client"` files only).
- All ScrollTriggers created inside `gsap.context()` per component and killed on
  unmount (React 19 StrictMode safe).

## Testing & validation

- `npm run lint` and `npm run build` must pass.
- Browser verification (desktop viewport, mobile emulation, reduced-motion
  emulation): hero formation, pinned rail scrub, section reveals, cursor states,
  canvas palette shifts, chat shockwave.
- Lighthouse spot-check: no regression class (target: performance ≥ 90 on desktop).

## Out of scope

- react-three-fiber migration.
- KV-backed rate limiting.
- New content/copy or layout redesign of sections.
- Removing framer-motion entirely (gradual migration only where touched).

## Docs to update

- `docs/CODEBASE.md` (stack + motion section), `docs/ANIMATION-GUIDE.md`
  (ScrollTrigger pattern replaces scroll-signal), `docs/COMPONENTS.md` (touched
  components), `docs/WORKLOG.md` (entry), `README.md` (stack line).
