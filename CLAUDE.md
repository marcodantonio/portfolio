# CLAUDE.md

This file is the Claude-facing entry point for this repository.

## Start here

1. [README.md](./README.md)
2. [AGENTS.md](./AGENTS.md)
3. [docs/INDEX.md](./docs/INDEX.md)
4. [docs/CODEBASE.md](./docs/CODEBASE.md)
5. [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md)
6. [docs/PERSONAI.md](./docs/PERSONAI.md)
7. [docs/OPTIMIZATION.md](./docs/OPTIMIZATION.md)

## Repo intent

- This is Marco D'Antonio's portfolio and `personAI` site
- The UX should stay sharp, simple, and recruiter-friendly
- `personAI` should read like a place to ask questions, not a technical AI showcase

## Non-negotiables

- Reuse `components/system/*` before introducing custom layout wrappers
- Reuse `components/ui/*` before styling raw markup
- Keep copy literal and concise
- Do not reintroduce removed legacy helpers like `.surface-card`, `.section-copy`, or `.eyebrow`
- Update docs when behavior, structure, or design-system rules change
- Add important completed work to [docs/WORKLOG.md](./docs/WORKLOG.md)

## Validation

```bash
npm run lint
npm run build
```
