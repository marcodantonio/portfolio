# web-portfolio

Premium one-page portfolio built with Next.js, Tailwind v4, shadcn/ui, Three.js, GSAP (ScrollTrigger + SplitText), and Cloudflare Workers AI. Features a cinematic design with smooth scroll choreography, particle effects, kinetic typography, and a live AI assistant.

## What is in this repo

- Marco D'Antonio's portfolio: full-stack developer & AI engineer
- **One-page** single-scroll experience with anchor-based navigation
- Locale principale in italiano su `/`, con versione inglese su `/en`
- **WOW moment** hero: particle field formation + interactive chat
- Smooth-scroll (Lenis driven by GSAP's ticker) + GSAP ScrollTrigger choreography (kinetic reveals, ghost numerals, pinned projects rail)
- `/api/personai` backend for live AI chat answering questions about Marco's background
- Cloudflare Workers / OpenNext deployment setup
- Full i18n: IT (default) + EN

## Main commands

```bash
npm run dev       # Local dev (port 3000)
npm run lint      # ESLint check
npm run build     # Production build
npm run preview   # Cloudflare OpenNext preview
npm run deploy    # Deploy to Cloudflare Workers
npm run knowledge:sync  # Sync personAI knowledge base from content
```

## Deploy

- GitHub Actions deploys on every push to `main` using `.github/workflows/deploy.yml`.
- Set these GitHub repository secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
- Cloudflare custom domains for the Worker are declared in `wrangler.toml`:
  - `marcodantonio.it`
  - `www.marcodantonio.it`
- One-time migration step: remove the old Pages binding for the domain in Cloudflare so the Worker becomes the active origin.
- If deploy fails on `www.marcodantonio.it`, delete the old Pages custom domain or DNS record for `www` in Cloudflare first, then redeploy so Workers can claim it.
- Locale auto-selection is server-side on the root route: Cloudflare country `IT` stays on `/`, everything else redirects to `/en`.
- Worker runtime secrets now only need the email and Turnstile keys:
  - `RESEND_API_KEY`
  - `TURNSTILE_SECRET_KEY`
- `workers.dev` and Preview URLs are disabled for this Worker in `wrangler.toml`.

## Core sections (anchor nav)

- `#about` — bio + terminal card with profile.json
- `#education` — degrees + radar visualization
- `#skills` — 3D sphere with tagged skills
- `#projects` — holographic card rail (drag-scroll)
- `#experience` — timeline with animated SVG line draw
- `#contact` — email form + social links
- `/en` — English version of the full page
- `/api/personai` — backend for the live chat

## Docs

- [AGENTS.md](./AGENTS.md) — Agent setup & environment
- [CLAUDE.md](./CLAUDE.md) — Claude Code instructions
- [docs/INDEX.md](./docs/INDEX.md) — Full doc index
- [docs/CODEBASE.md](./docs/CODEBASE.md) — Architecture & file map
- [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) — Design tokens & reusable patterns
- [docs/COMPONENTS.md](./docs/COMPONENTS.md) — Component catalog & usage
- [docs/ANIMATION-GUIDE.md](./docs/ANIMATION-GUIDE.md) — Motion patterns, GSAP/ScrollTrigger, Lenis
- [docs/I18N-GUIDE.md](./docs/I18N-GUIDE.md) — Internationalization setup
- [docs/PERSONAI.md](./docs/PERSONAI.md) — personAI backend & knowledge base
- [docs/OPTIMIZATION.md](./docs/OPTIMIZATION.md) — Performance & bundle tips
- [docs/WORKLOG.md](./docs/WORKLOG.md) — Recent work & changes
