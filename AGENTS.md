# AGENTS.md

Repository instructions for coding agents (Codex, Claude Code, Copilot, Cursor, Windsurf, etc.).

## Read this first

1. [README.md](./README.md) — stack, commands, section map
2. [docs/INDEX.md](./docs/INDEX.md) — full doc index
3. [docs/CODEBASE.md](./docs/CODEBASE.md) — architecture, file map, data flow
4. [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) — tokens, primitives, reuse rules
5. [docs/COMPONENTS.md](./docs/COMPONENTS.md) — component catalog
6. [docs/ANIMATION-GUIDE.md](./docs/ANIMATION-GUIDE.md) — motion patterns
7. [docs/WORKLOG.md](./docs/WORKLOG.md) — recent changes

## Architecture summary

- **One-page** single-scroll site. Sections are stacked in `app/page.tsx`.
- **No multi-page routes** — `/about`, `/projects`, `/experience`, `/contact` do not exist.
- **Only dynamic route**: `/api/personai` (Cloudflare Workers AI, RAG chat endpoint).
- **i18n**: `content/i18n.ts` is the source of truth for all visible text (IT + EN).
- **Data**: `lib/data.ts` holds projects, skills, experiences (feeds i18n + personAI).

## Important files

| File | Purpose |
|---|---|
| `app/page.tsx` | One-page layout — all sections |
| `app/layout.tsx` | Root layout with providers (Theme, Language, SmoothScroll, GrainOverlay) |
| `app/design-system.css` | All global tokens, motion, component CSS |
| `content/i18n.ts` | Bilingual dictionary — all UI strings |
| `lib/data.ts` | Projects, skills, experiences |
| `lib/scroll-signal.ts` | Shared rAF scroll listener — subscribe here, never add own listeners |
| `lib/motion.ts` | Motion tokens + `prefersReducedMotion()` helper |
| `lib/personai.ts` | RAG retrieval + Workers AI prompt/response |
| `content/knowledge/` | personAI knowledge base (base.ts, generated-cv.ts) |
| `app/api/personai/route.ts` | personAI HTTP endpoint |
| `components/system/` | Layout primitives: SpotlightSection, smooth-scroll, copy |
| `components/ui/` | shadcn base: button, input, textarea, badge |

## Working rules

- Use `SpotlightSection` + `Container` for any new section — never write custom full-width wrappers.
- Use `KineticHeading` for all section titles — never use raw `<h2>` or ScrambleText.
- Use `components/ui/*` for form elements — never style raw inputs.
- All scroll-linked animation must subscribe to `lib/scroll-signal` — never `addEventListener('scroll')`.
- Keep copy literal and concise — no filler text, no AI hype.
- Do not reintroduce: `.surface-card`, `.section-copy`, `.eyebrow`, `ScrambleText`, `react-parallax-tilt`.
- After meaningful changes: update the relevant `docs/` file + add entry to `docs/WORKLOG.md`.

## Checks

```bash
npm run lint
npm run build
```

Both must pass before considering work complete.
