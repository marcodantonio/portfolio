# Codebase

## Stack

- Next.js 16 (SSR-ready, edge-deployed)
- React 19 (client components for interactivity)
- Tailwind CSS v4 (tokens + utilities)
- shadcn/ui (button, input, textarea, separator, badge)
- Three.js + GLSL (WebGL hero particle field + formation)
- GSAP 3 (ScrollTrigger + SplitText) — scroll choreography
- Framer Motion (a few entrance animations, e.g. contact)
- **Lenis** (smooth-scroll inertia, driven by GSAP's ticker)
- Cloudflare Workers AI (personAI backend)
- OpenNext (Workers deployment)

## Main folders

- `app/` — Next.js routes & layout
  - `(it)/layout.tsx` + `(it)/page.tsx` + locale special files — Italian home route (`/`)
  - `(en)/layout.tsx` + `(en)/en/page.tsx` + locale special files — English home route (`/en`)
  - `design-system.css` — global tokens, motion classes, theme-aware colors
  - `api/personai` — AI endpoint (POST handler)
- `components/` — Feature & section components
  - `intro.tsx` — hero with hero-only particle canvas, chat widget, parallax-out on scroll
  - `hero-canvas.tsx` — hero-only Three.js particle field (inside `#hero-section`)
  - `about.tsx`, `education.tsx`, `skills.tsx`, `projects-rail.tsx`, `experience.tsx`, `contact.tsx` — sections
  - `kinetic-heading.tsx` — reusable title with GSAP SplitText char-level masked reveal on scroll-in
  - `section-ghost-number.tsx` — oversized ghost numeral behind a section, parallax-scrubbed via ScrollTrigger (decorative, `aria-hidden`)
  - `custom-cursor.tsx`, `magnetic.tsx` — GSAP `quickTo` pointer-follow effects
  - `marquee.tsx` — infinite tech-stack ticker (pauses on hover)
  - `grain-overlay.tsx` — subtle film-grain layer
  - `system/` — design-system primitives: `copy.tsx` (Eyebrow), `spotlight-section.tsx`, `smooth-scroll.tsx` (Lenis↔GSAP-ticker bridge), `reveal-manager.tsx` (`ScrollTrigger.batch` entrance reveals for `[data-reveal]`)
  - `ui/` — shadcn base: button, input, textarea, badge, separator
- `content/` — i18n + knowledge
  - `i18n.ts` — bilingual dictionary (IT + EN, all UI strings)
  - `knowledge/` — personAI knowledge base (background, projects, etc.)
  - `site.ts` — site-level metadata
- `lib/` — utilities & data
  - `data.ts` — projects, skills, experiences (feeds i18n + personAI)
  - `motion.ts` — easing tokens, `prefersReducedMotion()` helper
  - `gsap.ts` — single GSAP entry point; registers ScrollTrigger + SplitText. All components import `{ gsap, ScrollTrigger, SplitText }` from here, never from `gsap` directly
  - `scroll-signal.ts` — shared single-rAF scroll listener, now **functional-only** (consumed by `header.tsx` and `scroll-progress.tsx`). Decorative scroll choreography uses GSAP ScrollTrigger instead
  - `personai.ts` — retrieval + RAG response generation
  - `cloudflare.ts` — Cloudflare binding helpers
- `context/` — React context providers
  - `theme-context.tsx` — light/dark mode + localStorage
  - `language-context.tsx` — IT/EN toggle + localStorage + URL navigation
- `actions/` — Next.js server actions
  - `sendEmail.ts` — email form submission via Resend
- `public/` — static assets (CV, images)

## Page structure (locale routes + anchor nav)

The portfolio has two locale routes, `/` and `/en`, each with the same 6 sections, each an `<SpotlightSection>`:

1. **Hero (Intro)** — particle field (particle formation on first load), chat widget, CTA, scroll hint
2. **About** (`#about`) — bio paragraphs + syntax-highlighted profile.json card
3. **Education** (`#education`) — degree + thesis with Pescara↔L'Aquila radar arc
4. **Skills** (`#skills`) — 3D Fibonacci sphere with tagged skills (category dim/glow on hover)
5. **Projects** (`#projects`) — drag-scroll rail of 5 holographic cards (accent sheen follows cursor)
6. **Experience** (`#experience`) — timeline with animated SVG line draw (scrubbed via ScrollTrigger)
7. **Contact** (`#contact`) — email form + GitHub/LinkedIn rows

All sections are full-width (SpotlightSection), inner content centered via Container wrapper (max-w-1100px, px-6).

## Data flow

- **Content source**: `content/i18n.ts` is the UX truth (all visible text)
- **Metadata**: `lib/data.ts` holds projects, skills, experience (tech tags, icons), feeds both i18n strings and personAI knowledge
- **Metadata helper**: `lib/seo.ts` centralizes locale metadata, `hreflang`, JSON-LD, and shared SEO constants
- **Agent discovery**: `lib/agent-discovery.ts` centralizes Link header targets, the JSON api-catalog payload, and WebMCP tool metadata
- **Security hardening**: `lib/security.ts` centralizes origin checks and lightweight rate limiting for the AI/chat and contact surfaces; `next.config.ts` attaches baseline security headers and discovery Link headers
- **personAI**: `content/knowledge/` builds the retrieval corpus from data + generated CV
- **Locale routing**: `/` and `/en` have separate root layouts, so the server emits the correct `<html lang>` from the first response
- **Social image**: locale-specific `opengraph-image.tsx` / `twitter-image.tsx` files generate the social previews; `public/portrait.jpg` stays as the shared portrait asset
- **Scroll**: Decorative scroll choreography (kinetic headings, ghost numerals, reveals, projects rail, timeline draw) runs on GSAP ScrollTrigger via `lib/gsap`. Functional scroll state (header scrolled flag, progress bar) still goes through `lib/scroll-signal`
- **Agent docs**: `/docs/api` is the service documentation entry point, and `/.well-known/api-catalog` is the machine-readable catalog advertised from the homepage via `Link` headers

## Motion & animation

- **GSAP core**: Single entry point `lib/gsap.ts` registers ScrollTrigger + SplitText. All decorative scroll choreography runs through it
- **Smooth scroll**: Lenis driven by `gsap.ticker` and bridged to ScrollTrigger (one rAF for all scroll work); disabled under `prefers-reduced-motion`
- **Formation flourish**: Hero-only particles form "MARCO D'ANTONIO" on first load (350ms after boot), then idle in ambient field
- **Hero chat shockwave**: Chat sends/receives → dispatch `hero:pulse` event → particles radiate + flare
- **Kinetic headings**: GSAP SplitText char-level masked reveal on scroll-in (ScrollTrigger `once`)
- **Ghost numerals**: Oversized section numbers parallax-scrubbed behind sections (ScrollTrigger `scrub`)
- **Batched reveals**: `ScrollTrigger.batch` entrance reveals for any `[data-reveal]` element (via `reveal-manager.tsx`)
- **Projects rail**: Desktop pins `#projects` and scrubs the card track horizontally; touch keeps the momentum drag rail
- **Timeline draw**: SVG line draw scrubbed as the timeline scrolls into view (ScrollTrigger)
- **Functional scroll state**: header scrolled flag + progress bar still use `lib/scroll-signal`
- All motion tokens in `app/design-system.css` (--ease-out, --dur-base, etc.)

## Deployment

- Local dev: `npm run dev` (Lenis + hot reload works)
- Build: `npm run build` (Next.js static + SSR)
- Test: `npm run lint` (ESLint only) + visual browser check
- Cloudflare Workers: `npm run deploy` (uses OpenNext + env bindings)
