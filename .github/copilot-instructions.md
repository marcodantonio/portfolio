# GitHub Copilot Instructions

## Read first

- [README.md](../README.md)
- [AGENTS.md](../AGENTS.md)
- [docs/CODEBASE.md](../docs/CODEBASE.md)
- [docs/DESIGN-SYSTEM.md](../docs/DESIGN-SYSTEM.md)
- [docs/COMPONENTS.md](../docs/COMPONENTS.md)
- [docs/ANIMATION-GUIDE.md](../docs/ANIMATION-GUIDE.md)

## Architecture

One-page portfolio (`app/page.tsx`). No multi-page routes. Sections: about, education, skills, projects, experience, contact. One dynamic route: `/api/personai`.

## Rules

- Sections go in `app/page.tsx` inside `<SpotlightSection id="..." className="py-24 sm:py-28"><Container>...</Container></SpotlightSection>`
- Section titles use `<KineticHeading eyebrow="// N — label" text="Title" />`
- All UI strings go in `content/i18n.ts` (IT + EN), accessed via `const { t } = useLanguage()`
- Scroll-linked animation: subscribe to `lib/scroll-signal`, never `addEventListener('scroll')`
- Form inputs: use `components/ui/input` and `components/ui/textarea`
- Do not reintroduce: `.surface-card`, `.section-copy`, `.eyebrow`, `ScrambleText`

## Checks

```bash
npm run lint
npm run build
```
