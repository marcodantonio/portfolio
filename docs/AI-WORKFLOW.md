# AI Workflow

## Goal

Make the repo easy for coding agents to understand, change, and maintain without relying on chat history.

## Standard flow

1. Read `README.md`, `AGENTS.md`, and `docs/INDEX.md`
2. Read the doc closest to the area being changed
3. Inspect the code
4. Implement the change
5. Run `npm run lint` and `npm run build`
6. Update docs if the change affects architecture, UI rules, personAI behavior, or optimization backlog
7. Add a short note to `docs/WORKLOG.md` for meaningful changes

## If touching UI

- Start from `components/system/*`
- Reuse `components/ui/*`
- Keep copy literal and short
- Avoid reintroducing legacy helpers or card soup

## If touching personAI

- Keep the product positioning simple
- Keep retrieval grounded in local knowledge
- Do not turn the interface into an AI dashboard
- Update `docs/PERSONAI.md` if behavior or scope changes

## If touching architecture

- Update `docs/CODEBASE.md`
- Update `docs/OPTIMIZATION.md` if debt changes

## If starting a new work block

- Check `docs/OPTIMIZATION.md`
- Continue from the highest-value unfinished item
