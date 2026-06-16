# WOW Homepage Experience — Design Spec

_Date: 2026-05-30_

## Goal

Elevate the existing one-page portfolio from "good" to a genuinely memorable,
choreographed experience — without sacrificing the CLAUDE.md non-negotiables
(sharp, simple, recruiter-friendly; content always readable; reuse
`components/system/*` and `components/ui/*`).

One guiding idea: **a single cinematic descent.** The page reads as one
continuous, choreographed sequence from a *living* hero to a calm contact,
punctuated by kinetic typography, with one signature interactive moment (the AI
chat driving the particle field).

This combines all four explored directions: cinematic scroll (A), living 3D
hero (B), kinetic typography (C), interactive signature (D).

## Principles & guardrails (hard requirements)

- **Graceful degradation is mandatory.** `prefers-reduced-motion: reduce` (and a
  global motion check) disables smooth-scroll hijack, the hero formation,
  parallax, and scrub-linked transforms. All content remains fully visible and
  readable with zero motion.
- **No content gated behind animation.** Text/links never depend on a tween
  completing (existing pattern: transform-only reveals, opacity stays usable).
- **Performance budget:** one shared `requestAnimationFrame` loop for
  scroll-driven work; GPU-only properties (`transform`, `opacity`); the hero
  WebGL stays `dynamic`/lazy; particle count scales down on small/low-DPR
  devices.
- **Mobile:** no scroll-jacking jank; lighter particle count; simpler reveals;
  marquee + heavy parallax reduced or disabled.
- **Recruiter-friendly:** fast to scan, copy stays literal, nav/scroll-spy
  intact, no gimmick blocks reading.
- **i18n + theme:** every new string flows through `content/i18n.ts`; every new
  surface respects light/dark tokens.

## Architecture overview

New, focused, independently-testable units (each one purpose, clear interface):

| Unit | Type | Responsibility |
|------|------|----------------|
| `lib/motion.ts` | util | Central motion tokens (easing curves, durations) + `prefersReducedMotion()` helper. Single source of truth. |
| `components/system/smooth-scroll.tsx` | client provider | Wraps the app in Lenis-driven smooth scrolling on a single rAF; no-op under reduced motion / touch coarse pointers where it would harm UX. Exposes nothing else. |
| `lib/scroll-signal.ts` | util | Tiny pub/sub for "scroll progress" so multiple components share one scroll listener instead of each adding their own. |
| `components/kinetic-heading.tsx` | client | Reusable section heading with a per-word mask/clip reveal on scroll-in. **Decision:** this replaces `ScrambleText` at section titles (one motion per heading, not two). `ScrambleText` stays in the repo but is only used where a scramble specifically fits (e.g. small mono accents); section `<h2>`s migrate to `KineticHeading`. Props: `text`, `eyebrow`, `as`. |
| `components/marquee.tsx` | client | Infinite, pausable tech-stack ticker strip between two sections. Props: `items`. |
| `components/grain-overlay.tsx` | client/css | Fixed, pointer-events-none subtle noise layer for depth. CSS-only where possible. |

Changed units:

- `components/hero-canvas.tsx` — add a **formation phase** (particles lerp from
  ambient positions to sampled glyph targets of "MARCO D'ANTONIO" for ~1.2s on
  first load, then ease back to the ambient field) and a **chat shockwave hook**
  (imperative `window`-level event the chat dispatches). Keep the existing
  cursor repulsion / depth parallax; strengthen them slightly.
- `components/hero-mini-chat.tsx` — on send, dispatch a `hero:pulse` event the
  canvas listens for (signature moment D).
- `components/intro.tsx` — scroll-linked parallax-out for canvas/name/chat via
  the shared scroll signal; orchestrate the hero entrance after boot.
- `app/page.tsx` — wrap in `<SmoothScroll>`; insert `<Marquee>` between sections;
  swap section titles to `<KineticHeading>`.
- Section components (`about`, `education`, `skills`, `projects-rail`,
  `experience`, `contact`) — adopt `KineticHeading`; tie a couple of existing
  effects (radar sweep, timeline draw — already scroll-aware) to the shared
  scroll signal for consistency.
- `app/design-system.css` — motion/easing custom properties; marquee, grain,
  kinetic-reveal classes; reduced-motion overrides in one place.

## Pillar detail

### A — Cinematic scroll
- **Lenis** smooth scroll (single dependency, ~3kb gzip). Mounted via
  `SmoothScroll` provider; its rAF also ticks the `scroll-signal` so all
  scroll-linked components read one normalized progress value.
- Hero exit: canvas dollies/parallaxes, `.hero-inner` translates up + fades as
  it leaves (existing CSS approach, now driven by the shared signal for smooth,
  jank-free linkage).
- Section reveals via `KineticHeading` + existing `.rv`-style transform reveals.

### B — Living hero
- Formation: precompute glyph target points by rendering the wordmark to an
  offscreen 2D canvas once, sampling opaque pixels → target positions. On first
  paint, particles interpolate ambient→target→ambient. Cached in
  `sessionStorage` flag so repeat visits skip straight to the ambient field
  (consistent with the boot-sequence "seen" pattern).
- Stronger cursor depth parallax (already present) + subtle godray glow behind
  the name.
- Reduced motion / low-DPR / small viewport: skip formation, lower `COUNT`.

### C — Kinetic typography
- `KineticHeading`: split into words, each word in an overflow-clip wrapper,
  translateY(110%)→0 with stagger on scroll-in. Accent on key word.
- One `Marquee` strip (tech stack ticker) placed between Skills and Projects;
  pauses on hover; halves speed / static under reduced motion.
- Oversize muted section index numerals (`01 … 06`) as a kinetic accent.

### D — Interactive signature
- `hero-mini-chat` dispatches `window.dispatchEvent(new CustomEvent('hero:pulse', {detail:{...}}))` on send/receive.
- `hero-canvas` listens and triggers a color flare + radial shockwave (reuses
  the existing `u_click` shockwave uniform, repurposed/extended).

## Per-section choreography (summary)

1. **Hero** — formation flourish → ambient field; parallax-out on scroll; chat pulses the field.
2. **About** — kinetic heading; terminal card types/reveals on enter.
3. **Education** — kinetic heading; radar sweep + arc emphasize on enter.
4. **Stats** — count-up on enter (exists).
5. **Skills** — kinetic heading; sphere already alive; subtle scroll-tilt.
6. **Marquee** — tech ticker bridging into Projects.
7. **Projects** — kinetic heading; holographic cards (exist); rail hint.
8. **Experience** — kinetic heading; SVG line draws with shared scroll signal (exists).
9. **Contact** — kinetic heading; calm landing, magnetic submit.

## Dependencies

- Add **`lenis`** (`@studio-freight/lenis` or `lenis`), ~3kb. No other runtime deps.
- Reuse existing `three`, `framer-motion`.

## Out of scope

- No audio. No full page-transition router (single page). No CMS. No new routes.
- No redesign of section content/copy beyond what kinetic headings require.
- Dead-code cleanup from removed routes is tracked separately (not part of this).

## Risks & mitigations

- **Jank from too many scroll listeners** → single rAF + shared scroll signal.
- **Formation looks messy / hurts legibility** → name stays crisp typography on
  top; formation is a brief background flourish only; cached after first visit.
- **Mobile perf** → reduced particle count, disabled marquee/parallax, no smooth-scroll hijack.
- **Accessibility** → centralized reduced-motion kill-switch; semantic headings preserved.

## Success criteria

- Lint + build green; zero console errors/hydration warnings.
- Smooth 60fps scroll on a typical laptop; no layout overlap (verified in-browser).
- Reduced-motion mode: static, readable, no hijacked scroll.
- The hero formation + chat-driven pulse read as the "signature" moments.
