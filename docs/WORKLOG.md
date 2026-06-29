# Worklog

## 2026-06-29 (portfolio evidence and anti-filler pass)

- Added role/output proof blocks to every project card in IT/EN so Projects carries concrete evidence instead of only descriptions.
- Added project role/output metadata to `lib/data.ts` and personAI's project context.
- Sanitized the generated CV knowledge source: phone number redaction, removal of motivational resume summary, generic soft-skill line, privacy boilerplate, and marketing-style phrases.
- Tightened the personAI prompt so answers prefer concrete facts and avoid motivational/promotional wording.
- Added an accessible `aria-label` to the hero H1 while keeping the visual split name treatment.
- Cleaned active README/docs wording away from "WOW/premium/vibe" language and updated docs for project proof cards.
- Extended `scripts/verify-cinematic-chapters.mjs` to guard against the rejected copy and CV phrases returning.

## 2026-06-29 (direct portfolio copy pass)

- Replaced the remaining editorial section headings with literal portfolio labels in IT/EN: Profilo, Formazione, Competenze, Progetti, Esperienza, Contatto.
- Tightened the contact intro copy so it states the actual purpose of the form instead of using slogan-style language.
- Extended the narrative-flow verification script to fail if the rejected manifesto-style headings return to the visible i18n copy.

## 2026-06-29 (runtime loop hygiene)

- Scoped hero particle pointer tracking to `#hero-section` instead of a global `window` mouse listener.
- Paused the hero WebGL render loop when the hero is outside the viewport, while preserving the existing hidden-tab pause and StrictMode cleanup.
- Paused the skill sphere rAF loop outside the viewport and made reduced-motion render a static frame instead of a continuous loop.
- Removed the unused `SpotlightSection variant="chapter"` path and its `.chapter-section` CSS so the old numbered-chapter system has no active implementation surface left.
- Renamed the About treatment hook from `.chapter-dossier` to `.profile-dossier` to remove leftover chapter-system naming from active code.
- Centralized boot overlay timers so SKIP/auto-finish cancel pending line timers and avoid duplicate finish work.
- Added an active-section ref guard in the header observer to avoid redundant state updates while scrolling.
- Updated README and optimization/animation docs to remove stale ghost-numeral language and document the visibility-scoped loops.

## 2026-06-26 (narrative flow anti-template pass)

- Replaced the visible numbered chapter grammar with a continuous homepage story flow: `SpotlightSection variant="story"`, `.story-flow`, and `.story-section`.
- Removed the homepage `CinematicDirector`, `SectionGhostNumber`, ghost numeral CSS, hard section dividers, and visible eyebrow labels from the main sections.
- Reworked section titles in IT/EN copy so they read as specific editorial statements instead of generic portfolio modules.
- Removed project card counters and the homepage tech ticker from the body flow; Projects remains the main pinned horizontal case reel.
- Updated the structural guard so `node scripts/verify-cinematic-chapters.mjs` fails if numbered chapter chrome or `// 01` section labels return.

## 2026-06-19 (cinematic director follow-up)

- Reworked the conservative cinematic chapter pass after design feedback that the site still read like full-height sections instead of an award-style experience.
- Added `components/cinematic-director.tsx`: an aria-hidden GSAP ScrollTrigger director with a fixed chapter rail, active-section class, and scrubbed heading/visual transforms.
- Recalibrated the follow-up after style feedback so the new motion layer evolves the existing visual language instead of replacing it with a separate cinematic skin.
- Kept the homepage tech ticker and Projects card scale aligned with the existing site style while retaining the desktop pinned rail, active-project context, and tilt/scrub motion.
- Updated the structural guard, design-system docs, component catalog, and animation guide to reflect the new shared director.

## 2026-06-18 (cinematic chapter design)

- Defined the approved direction for the next WOW pass: keep the current one-page section order while upgrading each section into a more cinematic chapter.
- Chose a shared chapter system plus local GSAP timelines as the technical direction, avoiding both light-only polish and a fragile single global scene director.
- Scoped Projects as the main expanded/pinned anchor moment, with Hero, About, Education, Skills, Experience, and Contact retaining their current roles but gaining stronger section choreography.
- Captured the design in `docs/superpowers/specs/2026-06-18-cinematic-chapter-system-design.md` before implementation planning.
- Implemented the shared chapter wrapper, section treatment hooks, expanded Projects active-state rail, and `scripts/verify-cinematic-chapters.mjs` structural guard on branch `codex/cinematic-chapter-system`.

## 2026-06-14 (GSAP motion upgrade)

- Added GSAP 3 (ScrollTrigger + SplitText, both free since 3.13) as the scroll-choreography engine, behind a single entry point `lib/gsap.ts` — components import `{ gsap, ScrollTrigger, SplitText }` from there, never from `gsap` directly.
- Bridged Lenis to GSAP's ticker and to ScrollTrigger in `components/system/smooth-scroll.tsx` (`gsap.ticker.add`, `lenis.on("scroll", ScrollTrigger.update)`, `lagSmoothing(0)`) so there is one rAF for all scroll work; still disabled under reduced motion.
- Rebuilt kinetic headings on GSAP SplitText: char-level masked reveal triggered by ScrollTrigger (`once`), split deferred to `document.fonts.ready`, reverted on unmount, remounts on text change via `key`. Same public API.
- Added oversized ghost section numerals (`components/section-ghost-number.tsx`), parallax-scrubbed via ScrollTrigger behind sections (`aria-hidden`, `.ghost-num`).
- Added batched entrance reveals (`components/system/reveal-manager.tsx`) via `ScrollTrigger.batch` for any `[data-reveal]` element; initial hidden state is JS-applied so content stays visible without JS / under reduced motion.
- Made the projects rail cinematic on desktop (≥1024px, fine pointer, no reduced motion): `gsap.matchMedia` pins `#projects` and scrubs the card track horizontally with a progress bar and velocity-linked skew; touch keeps the momentum drag rail. Card tilt uses `gsap.quickTo`.
- Rebuilt the custom cursor as a two-layer dot + trailing ring via `gsap.quickTo` with contextual `data-cursor` states through document-level event delegation; magnetic pull now uses `gsap.quickTo` + `elastic.out` snap-back (props simplified to `{children, strength, radius, className}`).
- Migrated decorative scroll work in `intro.tsx` and `experience.tsx` from `lib/scroll-signal` to ScrollTrigger. `lib/scroll-signal.ts` now exists for **functional scroll state only** (`header.tsx`, `scroll-progress.tsx`).
- Hardened the hero canvas: touch tier (7k particles + DPR 1.25 on coarse pointers vs 22k/1.6 on fine), render paused on `visibilitychange`, double-rAF guard for hidden-tab loads.
- **Persistent full-page canvas trialled and reverted.** An earlier step made the particle canvas a fixed site-wide background with per-section scene states; per the site owner's feedback it was reverted, so the particle field is **hero-only again** (contained in `#hero-section`). Only the perf fixes above were kept; there is no `components/scene/site-canvas.tsx` and no per-section scene state.
- Security/quality: `app/api/personai/route.ts` no longer echoes internal error text (logs server-side, returns a generic message); `next.config.ts` HSTS gains `includeSubDomains; preload`; `lib/security.ts` trusts loopback origins only in dev or when the request Host is itself loopback (preview); `@types/three` moved to devDependencies.
- Registered `MotionPathPlugin` in `lib/gsap.ts` (free in GSAP 3) and ported branch B's "pulsing dot travels the arc" flourish to GSAP in `components/education.tsx`: a `.radar-traveller` `<circle>` rides `#edu-arc` via `motionPath` (yoyo, `power1.inOut`, ~2.8s) with a `sine.inOut` scale pulse and a CSS `drop-shadow` glow. The tween is gated by a ScrollTrigger (`onEnter`/`onLeave`/`onEnterBack`/`onLeaveBack` toggle `play`/`pause`) so it never loops off-screen; under `prefersReducedMotion()` it stays parked at the arc start with no tween. Cleanup kills the trigger + both tweens (StrictMode-safe). No framer-motion.

## 2026-06-01 (production hygiene pass)

- Moved the public Turnstile site key into source so the client widgets no longer depend on a missing build-time env var in production.
- Reset and re-executed the Turnstile widget before each send attempt to keep the token lifecycle fresh on both chat and contact.
- Moved toast notifications to the bottom-center and restyled them to match the app's frosted panel language.
- Disabled Wrangler observability logs/traces/persistence in `wrangler.toml` per the requested production config.
- Reworked the social preview card to use the same light palette, accent, and card language as the site instead of a dark standalone poster style.
- Swapped the hero CTA icons and the contact submit icon to the same bootstrap-style icon family as the theme toggle for visual consistency.
- Refined the skills sphere interaction so it keeps its original idle motion, can be grabbed with the cursor, and now preserves release inertia without springing back to a rest pose.
- Fixed the skills sphere auto-rotation so it stays at a constant baseline speed instead of accelerating over time.
- Kept the Fibonacci lattice for the skills sphere positions, but shuffled the tag assignment so categories no longer cluster into visible bands.
- Added explicit spacing between CTA text and inline icons so button labels breathe correctly.
- Restored the Italian header menu labels in the `it` dictionary so the nav is localized again on the Italian route.
- Removed the orphan `SubmitBtn` component and localized the Italian menu label for skills to `Competenze`.
- Removed the manual `twitter:image` override so Next can use the generated `twitter-image` route instead of the static portrait.
- Added `security.txt` at both `/.well-known/security.txt` and `/security.txt` with contact, language, canonical, and expiry metadata.
- Replaced the generated `robots.txt` route with a static public file so Content-Signal directives can be declared explicitly for ai-train, search, and ai-input.
- Added homepage Link headers plus a machine-readable `/.well-known/api-catalog`, a human-readable `/docs/api` page, and browser WebMCP tool registration for agent discovery.
- Added baseline HTTP security headers on the main routes: HSTS, nosniff, no framing, strict referrer policy, and a restrictive permissions policy.
- Added a strict-but-compatible CSP, plus same-origin checks and lightweight per-IP throttling for `/api/personai` and the contact form server action.
- Deferred non-critical client layers until idle time: smooth-scroll, custom cursor, WebMCP registration, and toast portal now mount after the first idle slot; the hero chat also mounts lazily behind a skeleton placeholder.
- Added `content-visibility:auto` to below-the-fold sections and the footer so the browser can skip rendering work until those blocks approach the viewport.
- Loosened the CSP only in development with `unsafe-eval` so React Refresh works without weakening production security headers.
- Restored a minimal root layout so `not-found.tsx` has a valid app root and the build can complete cleanly again.
- Aligned the root `body` attributes with the route-group layouts to eliminate the hydration mismatch caused by duplicated layout wrappers.
- Removed the duplicated `<html>/<body>` wrappers from the route-group layouts and mounted the cursor on `not-found` so the 404 stays interactive without breaking hydration.
- Promoted the custom cursor to the root layout so it is truly global instead of being owned by the 404 or a route shell.
- Moved the `/docs/api` surface under a docs shell that reuses the site chrome, so the technical page no longer feels detached from the brand.
- Reworked the docs page cards to use the same rounded-panel language, spacing, and widths as the rest of the design system, removing the oversized technical-box feel.
- Rebuilt the docs page as a stacked sequence of site-style sections and cards instead of a separate two-column technical layout, so it reads as part of the same brand system.
- Trimmed the docs content down to the discovery facts only: link headers, catalog paths, WebMCP tool names, and the external capabilities note.
- Added a WebGL capability guard to the hero canvas so browsers without a usable context skip the Three.js setup cleanly instead of throwing console errors.

## 2026-06-01 (content alignment pass)

- Aligned the public site content with the updated CV and preserved `WordPress Websites` as the last project card in the horizontal rail.
- Updated the SEO keywords and i18n documentation to remove the last legacy "Full-Stack Developer" wording.
- Kept the project rail order stable because it is driven by `t.projects.items` and `projectsData` in the same sequence.
- Switched the CV download endpoint to the repo's `single-column` PDFs and made the knowledge sync fetch the remote PDF automatically, with a local fallback only if the remote source fails.
- Restored the hero's hover-driven repulsion field for the mouse, including sessions where the formation has already completed.
- Added a GitHub Actions deploy workflow that runs `npm run deploy` on pushes to `main`, and declared the Worker custom domains in `wrangler.toml` so the production origin can move off the old Pages project.
- Added a Cloudflare country-based locale redirect on `/` so Italy lands on `/` and every other country lands on `/en` without client-side guessing.
- Removed the `CONTACT_EMAIL` worker secret by using the public site email directly in the contact action, reducing the runtime secret count further.
- Restored the three-step education section order in the requested visible order: Triennale, Tesi Triennale, Magistrale in corso.
- Reworked the social preview card so the OG/Twitter image matches the site language better and removed the standalone "MD" monogram look.
- Switched the invisible Turnstile flows to wait on the widget response promise instead of a manual timeout path, which should reduce false "security check expired" errors in production.

## 2026-06-01 (SEO + locale route pass)

- Added a real English locale route at `/en` while keeping `/` as Italian.
- Moved locale handling into separate root layouts under route groups so the server emits the correct `<html lang>` on the first response for both locales.
- Added locale metadata with canonical + `hreflang`, plus JSON-LD (`Person`, `WebSite`, `WebPage`) for search/LLM discoverability.
- Reintroduced code-generated OG/Twitter previews with locale-specific `opengraph-image.tsx` and `twitter-image.tsx` files.
- Centralized the shared locale metadata in `lib/seo.ts` so the IT and EN pages only declare their locale-specific entry point.
- Refined the social preview card design to be more editorial and less template-like.
- Slowed the first hero particle formation and delayed the hero content reveal until the explosion completes, to avoid any overlap.
- Slowed the marquee ticker slightly and increased the magnetic pull / settle time on the main CTA and contact submit button.
- Delayed the hero repulsion field until the name formation starts dispersing, so the pixel-built name stays readable during the assembly phase.
- Reduced the hero wordmark size in the particle target canvas so both lines fit comfortably without edge clipping.
- Fixed the hero reveal trigger by listening for the formation-complete event on `window`, matching the canvas emitter.
- Reworked the hero into a single phase timeline (`assemble` → `hold` → `disperse` → `complete`) so the reveal feels less mechanical and the repulsion starts only during dispersion.
- Tightened the hero timing so the wordmark stays up a bit less and the content reveal starts slightly later, inside the dispersion window.
- Smoothed the reveal transition so the hero fades in instead of snapping in behind the wordmark.
- Increased the magnetic follow strength of the hero CTA and contact submit button.
- Upgraded the hero CTA and contact submit button to a radial magnetic field with elastic return, limited to those two buttons.
- Expanded the magnetic field to track the global pointer position, so both CTA buttons start attracting before the cursor actually touches them and settle back smoothly when it leaves the field.
- Stabilized the magnetic CTA behavior by measuring from a fixed wrapper and translating an inner element only; reduced the hero/contact radii so the field does not bleed into nearby UI.
- Reworked the CTA magnetic force from normalized radial motion to a capped cursor-follow vector, so the buttons pull toward the cursor instead of orbiting around it.
- Added an inner lock zone to the two magnetic CTAs so the button center snaps to the cursor once it is close enough, while keeping a smaller outer attraction radius.
- Collapsed the footer to a single row by removing the footer tagline copy and keeping only the brand and copyright line.
- Reduced the CTA button footprint and aligned the hero CTA and contact submit button to the same compact size and typography.
- Routed the CV button through a local `/cv/[lang]` download endpoint that fetches the locale-specific PDF from the dedicated curriculum repo.
- Updated the sitemap to expose `/` and `/en` as crawlable URLs instead of fragment links.
- Updated the language toggle to navigate between locale URLs rather than only swapping client state.
- Refactored the shell so both locales share the same content/components without duplicated layout code.

## 2026-06-01 (language sync + fallback cleanup)

- Fixed the document language attribute so `context/language-context.tsx` now mirrors the active locale onto `<html lang="...">` after hydration and on every toggle.
- Removed fallback defaults that were no longer buying safety:
  `components/typed-text.tsx` now requires `roles`,
  `content/site.ts` reads the first `heroFacts` entry directly,
  `components/skills.tsx` reads translated category labels directly.
- Kept fallbacks that still protect SSR, user storage, and external services:
  theme/lang hydration, reduced-motion checks, Cloudflare bindings, Turnstile, and server/API error guards.

## 2026-05-30 (cleanup + optimization pass)

- Removed 19 orphaned modules left over from the route removal + redesign:
  `components/content/*`, `page-hero(-aside)`, `home-panels`, `personai-chat`,
  `personai-preview`, `project`, `projects`, `section-divider`, `section-heading`,
  `theme-switch`, `system/{action-cluster,ambient,panel}`, `ui/card`. (Kept
  `content/site.ts` — still consumed by `lib/personai`.)
- Pruned dead `lib/data.ts` exports (`navLinks`, `heroHighlights`, `homePanels`,
  `aboutPillars`) and dropped the 5 unrendered project image imports + `imageUrl`.
- Removed the unused `stats` i18n block and the dead `.divider-wipe` CSS.
- Deleted the dead `active-section-context` (no consumers) and unwrapped it from layout.
- Consolidated all scroll-linked work onto `lib/scroll-signal` (one rAF-throttled
  listener): `scroll-progress`, `header` (with change-guard), and `experience`
  now subscribe instead of each adding their own `scroll`/`resize` listeners.
- Uninstalled `react-parallax-tilt` (route-only, now unused).
- i18n is the display source of truth for section text; `lib/data` keeps
  tags/icons and feeds the personAI knowledge base.

## 2026-05-30 (WOW polish + cleanup prep)

- Removed the text-scramble ("matrix") effect — it swapped to a mono font mid-animation and snapped on settle. Deleted `scramble-text.tsx` and its CSS; the contact heading now renders plainly. Section titles already use `KineticHeading` (transform-only, no font swap).
- Replaced the incoherent rainbow holographic project-card effect with a subtle on-palette accent sheen that follows the cursor (kept the 3D tilt + accent top-bar).
- Removed the stats strip ("5 years / 20 projects / …") and deleted `stats-strip.tsx`.
- Fixed `KineticHeading` word spacing (the inter-word space was clipped by the word-mask overflow → "Chisono"); now spaced via margin.

## 2026-05-30 (layout/animation fixes)

- Fixed the cursor **spotlight** appearing as a fixed-width "box": `SpotlightSection`s are now full-bleed with an inner `Container` (max-w-1100), so the radial glow spans the whole viewport instead of clipping at the content edge (about/skills/experience/contact)
- Fixed the hero: the absolute scroll hint was overlapping the CTA row — reduced hero content height (tighter gaps/padding, chat 180→160px) and the scroll hint now only renders on tall viewports (`min-height:940px`) and is `pointer-events-none`
- Removed the mobile **hamburger** menu (and its CSS); the section nav shows from `md` up
- Verified: no console errors, no overlap, full-width spotlights, lint + build green

## 2026-05-30 (i18n completion + single-page consolidation)

- Extended `content/i18n.ts` to cover **all** home content: projects, experience, education cards, and skill-category labels in both languages (tags/icons stay from `lib/data.ts`)
- Made the hero mini-chat **theme-aware** (light + dark palettes via `.chat-*` classes) and the greeting now renders live from i18n
- `ScrambleText` now shows the live `text` when idle, so language switches update already-revealed titles instantly
- Consolidated to a **single page**: removed the `/about`, `/projects`, `/experience`, `/contact`, `/personai` routes (kept `/api/personai` for the hero chat)
- Fixed a real hydration mismatch in `context/theme-context.tsx`: `mounted` now starts `false` and reconciles the stored theme post-mount, so SSR and first client render agree (was flipping the nav theme icon)
- Verified end-to-end in the browser: IT/EN toggle across every section, light/dark + light chat, scroll-spy nav, sphere/radar/timeline/holographic animations, and zero console errors
- Note: components that only served the removed routes (e.g. `projects.tsx`, `project.tsx`, `page-hero*`, `content/*`, `personai-chat.tsx`) are now unused — left in place, safe to prune later

## 2026-05-29 (design-fidelity pass)

- Rebuilt `header.tsx` to the design's minimal nav: `MD.` logo, lowercase mono anchor links, scroll-spy active state, `scrolled` blur, mobile hamburger — replacing the old route-panel header
- Moved the theme toggle into the nav and removed the floating `ThemeSwitch`
- Added a working **IT/EN** language system: `content/i18n.ts` dictionary + `context/language-context.tsx` (default Italian, the design's primary language); all home chrome now reads from it
- Made the hero **theme-aware**: `--hero-bg` token, tokenized hero text colors, and `hero-canvas.tsx` now follows light/dark via a class `MutationObserver` (normal blend + dimmed palette in light)
- Rebuilt `about.tsx` to the design's bio + `profile.json` terminal card
- Rebuilt `contact.tsx` to the design's two-column layout (head + accent em, social rows, form) while keeping the real `sendEmail` action
- Localized eyebrows/titles/labels across education, skills, projects, experience, stats, footer, and submit button
- Nav anchors use `/#section` so they work from any route

## 2026-05-29

- Rebuilt the home route as a single-page, anchor-scrolled experience (`hero → about → education → skills → projects → experience → contact`)
- Added the design's signature interactions as modular client components:
  - `skill-sphere.tsx` — 3D Fibonacci tag sphere (auto-rotate + cursor rotation, category dim/glow), driven by real `skillsData`
  - `education.tsx` — new radar section with the animated Pescara↔L'Aquila arc and cross-highlighting pins (degree + thesis)
  - `projects-rail.tsx` — horizontal drag-scroll holographic project cards from real `projectsData` (kept separate from the `/projects` route components)
  - `scramble-text.tsx`, `magnetic.tsx`, `system/spotlight-section.tsx` — reusable reveal/pointer effects
- Upgraded `experience.tsx` to an SVG-draw-on-scroll timeline with animated markers
- Wired the hero chat (`hero-mini-chat.tsx`) to the real `/api/personai` endpoint
- Hardened `hero-canvas.tsx` against the StrictMode double-mount WebGL race (cancellation guard) — removed a 250+ warning console flood
- Fixed the hero clipping under the fixed header (stale negative margin from the old padded layout)
- All new effects live behind design tokens in `app/design-system.css` and respect `prefers-reduced-motion`

## 2026-04-21

- Continued phase 2 of the design-system migration
- Refactored `about`, `skills`, `experience`, `contact`, and `personAI` chat toward `components/system/*`
- Removed legacy global helper usage from active components
- Simplified `personAI` positioning so it reads as a place to ask questions, not as a technical AI demo
- Added repo docs for codebase structure, design system, personAI, optimization, and AI workflow
- Added AI-facing repo files for Codex, Claude, Copilot, Cursor, and generic LLM discovery
- Rebuilt `projects` around a stable two-column media/content pattern and removed the old offset-heavy layout
- Simplified `contact` and `personAI` chat so they rely more on existing panel structure and less on bespoke conversation chrome
- Added a reusable ambient backdrop layer and tightened secondary page heroes so they feel less card-like
- Tightened home hero and page copy so the site reads more directly and with less filler text

## 2026-06-03 (performance pass)

- Lazy-loaded the 3D skills sphere when its section approaches the viewport, keeping the same layout but removing the widget from the first interactive bundle
- Removed `framer-motion` from the about and contact sections, replacing the entry animations with plain layout markup to reduce client-side work
- Re-ran Lighthouse against a production-served build and confirmed the home performance score now lands at 91/100 on the local production server
