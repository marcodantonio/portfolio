Design system refactor — changes

What I added

- app/design-system.css
  - Centralized tokens (colors, radii, shadows, font stack)
  - Dark-mode token overrides
  - `@layer utilities` mapping utility class names used in the codebase to CSS variables
  - `@layer components` for component-level classes: `.ds-panel`, `.ds-panel--inverse`, `.ds-btn`, `.ds-btn--*`, `.font-display`

How to use

- Tokens are available as CSS variables (ex: `var(--accent)`, `var(--radius)`).
- Use the helper utility classes already referenced in the codebase, e.g. `bg-panel`, `text-copy-muted`.
- Prefer semantic classes for rapid styling inside components: `ds-panel`, `ds-btn--outline`, `font-display`.

Next steps

- Optionally replace remaining transient helpers with `@layer components` styles.
- Polish specific component variants (Badge, Card) and add unit tests or visual regression tests.
- Consider exporting tokens as a JS/TS module if you need them at runtime.

Notes

- I imported `app/design-system.css` from `app/globals.css` so Tailwind will compile utilities/components.
- I kept the existing CVA/utility-based styling in components and added semantic classes to reduce visual drift.
