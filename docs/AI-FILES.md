# AI Files

This document maps the AI-specific files in the repository and explains which tool each file is meant to help.

## Root files

- [AGENTS.md](../AGENTS.md)
  Use as the main instruction file for Codex-style agents and as the canonical repo-level agent contract.

- [CLAUDE.md](../CLAUDE.md)
  Use as the Claude-facing entry point.

- [llms.txt](../llms.txt)
  Lightweight machine-readable overview for LLM-friendly discovery.

## GitHub-specific

- [.github/copilot-instructions.md](../.github/copilot-instructions.md)
  Instructions for GitHub Copilot and Copilot coding agent features.

## Editor-specific

- [.cursor/rules/repository.mdc](../.cursor/rules/repository.mdc)
  Repository-wide Cursor rules aligned with `AGENTS.md`.

## Canonical shared docs

- [docs/CODEBASE.md](./CODEBASE.md)
- [docs/DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md)
- [docs/PERSONAI.md](./PERSONAI.md)
- [docs/AI-WORKFLOW.md](./AI-WORKFLOW.md)
- [docs/OPTIMIZATION.md](./OPTIMIZATION.md)
- [docs/WORKLOG.md](./WORKLOG.md)

## Rule

Do not maintain contradictory instructions across these files.

If a project rule changes, update:

1. `AGENTS.md`
2. the relevant doc in `docs/`
3. any tool-specific file that must mirror the change
