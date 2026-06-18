# Design System

## Tokens & color

**Colors** are CSS custom properties in `:root` (light) and `html.dark` (dark):
- `--background`, `--surface`, `--foreground` — base palette
- `--accent`, `--accent-soft` — primary interaction color (purple/blue)
- `--copy-default`, `--copy-muted`, `--copy-soft` — text hierarchy
- `--line`, `--line-subtle` — borders
- Theme switching via `html.dark` class (no re-render); stored in localStorage

**Motion tokens** (all in `app/design-system.css`):
- `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` — premium entrance
- `--ease-inout: cubic-bezier(0.65, 0, 0.35, 1)` — smooth loops
- `--dur-fast: 0.35s`, `--dur-base: 0.6s`, `--dur-slow: 0.85s`

## Structural patterns

- **Container**: max-w-1100px, px-6, mx-auto (all sections use this)
- **SpotlightSection**: full-width wrapper with cursor-tracking accent spotlight (radial-gradient); `variant="chapter"` enables the cinematic section system
- **Divider**: thin border (border-line-subtle) between sections
- **Grid spacing**: gap-6 for columns, py-24 sm:py-28 for section vertical padding

**Reusable text components** (`components/system/copy.tsx`):
- `Eyebrow` — uppercase mono label (0.78rem, tracking-0.24em)
- `BodyCopy` — standard paragraph text

**Other system primitives**:
- `smooth-scroll.tsx` — Lenis wrapper (client-side, anchor-safe)
- `spotlight-section.tsx` — section wrapper with full-width accent glow and chapter variant

**Base UI** (`components/ui/*`):
- `button` — variants (default, outline, ghost)
- `input`, `textarea` — with focus ring + border
- `badge` — for tags
- `separator` — divider line

## Pattern: Kinetic headings

Every section uses `<KineticHeading>` for the main heading:
```tsx
<KineticHeading
  eyebrow="// 01 — about"
  text="Chi sono"
  as="h2"
/>
```
GSAP SplitText splits the text into chars, masked per word, staggered on scroll-in (ScrollTrigger `once`). Plain text stays in the DOM until fonts load; reverted on unmount.

## Pattern: Motion

**Decorative scroll animation** uses GSAP ScrollTrigger via `lib/gsap.ts` (import `{ gsap, ScrollTrigger }` from there, never from `gsap`):
```tsx
useEffect(() => {
  const tween = gsap.fromTo(
    element,
    { yPercent: 20 },
    { yPercent: -20, ease: "none", scrollTrigger: { trigger: element, scrub: true } }
  );
  return () => { tween.scrollTrigger?.kill(); tween.kill(); };
}, []);
```
Lenis is driven by `gsap.ticker` (one rAF for all scroll work). Functional scroll state (header, progress bar) still uses `lib/scroll-signal`.

## Pattern: Cinematic chapters

Existing homepage sections use `<SpotlightSection variant="chapter">` for the shared cinematic layer. This adds stable full-viewport chapter spacing, subtle grid/depth treatment, and the `.chapter-section` hook.

Use it only for the main one-page chapters: about, education, skills, projects, experience, and contact. Section-specific treatments use named hooks: `.chapter-dossier`, `.education-radar-stage`, `.skills-machine`, `.projects-cinematic`, `.experience-theatre`, and `.contact-command`.

Projects is the main expanded chapter: desktop keeps the pinned rail and now exposes active-project context; touch/mobile keeps the drag fallback.

**Parallax-out** in the hero:
- Hero content (name, chat, CTA) moves up + fades as you scroll past
- A ScrollTrigger `scrub` tween drives the inner div's transform + opacity

**Formation flourish** in the particle canvas:
- On first load (post-boot), particles assemble into "MARCO D'ANTONIO" over ~2.9s
- Held briefly, then disperse back to ambient field
- Cached in sessionStorage so repeat visits skip the formation

## Do not reintroduce

- `.surface-card`, `.surface-card-strong` (use SpotlightSection + container grid)
- `.section-copy` (use BodyCopy from system/copy.tsx)
- One-off layout wrappers (reuse SpotlightSection + Container)
- `ScrambleText` (use KineticHeading for titles)
- Custom scroll listeners or new `scroll-signal` subscribers for decorative motion (use GSAP ScrollTrigger via `lib/gsap`)

## Reuse checklist before writing new CSS

1. Is this a heading? → Use `KineticHeading`
2. Is this a section wrapper? → Use `SpotlightSection` + `Container`
3. Is this a text label? → Use `Eyebrow` or semantic text tokens
4. Is this decorative scroll-linked motion? → Use GSAP ScrollTrigger via `lib/gsap`, don't add your own listener (`scroll-signal` is functional-only)
5. Is this a text/form input? → Use `ui/input`, `ui/textarea`
6. Is this a centered surface? → Use semantic tokens (`bg-surface`, `border-line`) + Container

## Design direction

- **Premium but human**: smooth motion, clear type, breathing space
- **Cinematic but structured**: wow moments come from shared chapter staging and Projects expansion, not a separate reel or reordered page
- **Dark-first**: light mode is the override (light defaults, dark variants)
- **Recruiter-friendly**: fast to scan, copy is literal, CTA is clear, no gimmicks block reading
- **Reduced-motion respects**: all motion disables under `prefers-reduced-motion: reduce`
- **One-page, no jank**: single rAF, GPU properties only, lazy WebGL on mobile
