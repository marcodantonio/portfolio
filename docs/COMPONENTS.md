# Component Catalog

## Page-Level Layout

### SpotlightSection
Full-width section wrapper with cursor-tracking accent spotlight (radial-gradient that follows mouse).

```tsx
<SpotlightSection id="about" className="py-24 sm:py-28">
  <Container>{children}</Container>
</SpotlightSection>
```

**Props:**
- `id` (string, required) — for anchor nav
- `as` (string, default "section") — HTML tag
- `variant` (`"default" | "chapter"`, default `"default"`) — chapter enables shared cinematic section staging
- `className` (string) — additional styles (padding, bg)
- `children` — inner content

**Behavior:**
- Full width (`w-full`)
- Spotlight glow follows cursor (GPU-accelerated, safe)
- Chapter variant adds `.chapter-section` and `data-chapter-variant="chapter"` for shared depth/spacing
- No motion on `prefers-reduced-motion`

### Container
Max-width wrapper for centering content. Every section uses this.

```tsx
<Container>{children}</Container>
```

**Fixed structure:**
- max-w-1100px, mx-auto, w-full, px-6
- Paired with SpotlightSection so spotlight is full-width, content is centered

---

## Section-Level Components

### KineticHeading
Title with GSAP SplitText char-level masked reveal on scroll-in. Replaces ScrambleText for all section titles.

```tsx
<KineticHeading
  eyebrow="// 03 — skills"
  text="Stack tecnico"
  as="h2"
  className="mb-12"
/>
```

**Props:**
- `text` (string, required) — the title
- `eyebrow` (string, optional) — small label above
- `as` (string, default "h2") — "h1" | "h2" | "h3"
- `className` (string, optional) — extra styles

**Behavior:**
- Plain text stays in the DOM (accessible/selectable) until webfonts load
- On `document.fonts.ready`, GSAP SplitText splits into `words,chars` with per-word clip masks
- A `gsap.from(split.chars, { yPercent: 115, ease: "expo.out", stagger: 0.018 })` raises the chars once, triggered by ScrollTrigger (`start: "top 84%"`, `once: true`)
- Split is reverted on unmount; heading remounts on text change via React `key`
- Skipped under reduced motion (plain text shown)

### SectionGhostNumber
Oversized ghost numeral (01–06) drifting behind a section, parallax-scrubbed on scroll. Decorative only.

```tsx
<SectionGhostNumber index="03" />
```

**Props:**
- `index` (string, required) — the numeral to render

**Behavior:**
- `gsap.fromTo(node, { yPercent: 24 }, { yPercent: -24, scrollTrigger: { scrub: true } })` against its parent section
- `aria-hidden`; styled by `.ghost-num` in design-system.css
- Skipped under reduced motion; trigger killed on unmount

### Marquee
Infinite horizontal ticker (tech stack list). Pauses on hover; disabled under reduced-motion.

```tsx
<Marquee items={["React", "Next.js", "Python", "Three.js"]} />
```

**Props:**
- `items` (string[], required) — list of labels to loop

**Behavior:**
- Renders items twice (seamless loop via transform translateX -50%)
- Marquee track animates continuously (32s linear loop)
- Hover pauses animation
- SVG gradient mask (fade in/out at edges)
- Category-style dots between items (colored with --accent)

### GrainOverlay
Fixed film-grain layer for subtle depth. Applied at app root.

```tsx
<GrainOverlay />
```

**No props.** Pure CSS noise via SVG data-URI.

---

## Reusable Motion Components

### Smooth-Scroll Provider
Wraps the app in Lenis (inertial scroll). Mount once at `<html>` level.

```tsx
// in layout.tsx
<SmoothScroll />
```

**Behavior:**
- Client-side only (safe SSR)
- Disabled under `prefers-reduced-motion`
- Lenis driven by `gsap.ticker` and bridged to ScrollTrigger (`lenis.on("scroll", ScrollTrigger.update)`) — one rAF for all scroll work
- Handles anchor clicks (smooth `lenis.scrollTo(element, { offset: -80 })`)
- Updates browser history on anchor click

### RevealManager
`ScrollTrigger.batch` entrance reveals for any element tagged `data-reveal`. Mounted once in the site shell. Renders nothing.

```tsx
// any element opts in
<div data-reveal>...</div>
```

**Behavior:**
- JS-applied initial state (`gsap.set(targets, { y: 28, opacity: 0 })`) — content stays visible without JS and under reduced motion
- On enter, batches fade+rise in with stagger (`expo.out`)
- Triggers killed and props cleared on unmount

### CustomCursor
Two-layer cursor (dot + trailing ring) driven by `gsap.quickTo`. Contextual states come from `data-cursor` attributes via document-level event delegation (no per-element listeners). Ring uses `mix-blend-mode: difference`.

**Behavior:**
- Only active on fine pointers (`(hover: hover) and (pointer: fine)`)
- `quickTo` follows the pointer (fast dot, slower trailing ring)
- States (`hov`/`drag`/`view`) toggled from the hovered element's `data-cursor`
- Tweens killed on unmount

### Magnetic
Wraps a child with a radial magnetic pull toward the cursor, plus an elastic snap-back on release.

```tsx
<Magnetic strength={0.25} radius={160}>
  <Button>Get in touch</Button>
</Magnetic>
```

**Props:**
- `children` (ReactNode, required)
- `strength` (number, default 0.25) — pull intensity before lock
- `radius` (number, default 160) — field radius in px
- `className` (string, optional)

**Behavior:**
- Disabled on touch / coarse pointers
- Pull driven by `gsap.quickTo`; release uses `elastic.out(1, 0.45)`
- Releases on pointer-leave / blur / visibility change; tweens killed on unmount

---

## Content Components

### About
Bio sections with `<Eyebrow>` + paragraphs, and a syntax-highlighted profile.json card.

**Pattern:** 2-col grid on large (left: bio, right: card). Uses semantic `bg-surface`, `border-line`.

### Education
Degree + thesis with a radar visualization (Pescara ↔ L'Aquila arc). Custom SVG.

**Pattern:** Grid layout with animated SVG + text. Uses `content/i18n.ts` for all labels.

### Skills
3D Fibonacci sphere with tagged skills. Hover a category → dim others, glow the selected.

**Pattern:** Three.js canvas, cursor repulsion, scroll-aware tilt. Categories from `lib/data.ts`.

### Projects-Rail
5 holographic cards in a horizontal rail. Hover → accent sheen follows cursor (subtle, on-palette).

**Pattern:** On desktop (≥1024px, fine pointer, no reduced motion) a `gsap.matchMedia` block pins `#projects` and scrubs the card track horizontally via ScrollTrigger, with a progress bar, active-project context, larger cards, and velocity-linked skew. Touch keeps the existing momentum drag rail (pointer events + friction rAF). Card tilt uses `gsap.quickTo`; `holo-card` class carries `--mx`, `--my`, `--hop` for the cursor sheen. The `.projects-cinematic` wrapper is the main expanded chapter moment.

### Experience
Timeline with animated SVG vertical line. Fill line's `y2` attribute is driven by scroll progress.

**Pattern:** A `ScrollTrigger.create({ scrub: true })` updates the fill `y2` from its `onUpdate`; a separate `ScrollTrigger.batch` reveals each `.tl-item`. Both killed on unmount.

### Contact
Email form (left) + social links (right). Uses the `.contact-command` chapter treatment for the closing scene.

**Pattern:** 2-col grid (mobile: 1-col). Form action via `sendEmail` server action.

---

## Form & Input Components

All from `components/ui/*` (shadcn base). Styled with semantic tokens.

- `<Input />` — email field, text inputs. Rounded border, focus ring via accent.
- `<Textarea />` — message field. Min-height, same focus styling.
- `<Button />` — CTA buttons. Variants: default (filled), outline, ghost.
- `<Badge />` — skill tags, category labels. Small pill-shaped.

**Pattern:** All use `fieldClass` constant for consistent styling (bg, border, focus).

---

## Canvas & WebGL

### Hero Canvas (`hero-canvas.tsx`)
Hero-only Three.js particle field (absolute, `zIndex 0`, inside `#hero-section`). Formation flourish + cursor tracking + chat shockwave.

**Key features:**
- Tiered particle count: 22k + DPR 1.6 on fine pointers, 7k + DPR 1.25 on coarse/touch pointers (lower frame budget)
- Formation: particles assemble into "MARCO D'ANTONIO" on first load (~2.9s total)
- Ambient field: Perlin-like noise, depth parallax
- Cursor: repulsion + depth offset
- Chat pulse: shockwave + color flare when chat sends/receives (`hero:pulse`)
- Theme: additive blending (dark), normal blending (light)
- Perf/robustness: render paused on `visibilitychange` (tab hidden), double-rAF guard for hidden-tab loads, WebGL capability guard, StrictMode double-mount guard

**Lifecycle:**
1. SSR-safe: dynamic import of `three`
2. On mount: sample wordmark (offscreen 2D canvas) → target positions
3. Emit `bootend` event when boot overlay clears → start formation
4. Listen for `hero:pulse` events from chat
5. Cache formation flag in sessionStorage (skip on repeat visits)

---

## Patterns to Reuse

### Heading Reveal
Use `<KineticHeading>` — don't hand-roll. It splits the text with GSAP SplitText and reveals chars via ScrollTrigger (see ANIMATION-GUIDE.md).

### Scroll-Linked Parallax
Use a ScrollTrigger `scrub` tween from `lib/gsap`; kill it on unmount:

```tsx
const tween = gsap.fromTo(
  element,
  { yPercent: 20 },
  { yPercent: -20, ease: "none", scrollTrigger: { trigger: element, scrub: true } }
);
return () => { tween.scrollTrigger?.kill(); tween.kill(); };
```

### Theme-Aware Styling
Use `html.dark` selector in CSS or check `useTheme()` in JS:

```tsx
// CSS
html.dark .component { /* dark styles */ }

// JS
const { theme } = useTheme();
```

All semantic tokens already have dark variants in `app/design-system.css`.

### Hover Cursor Tracking
Use `--mx` and `--my` CSS properties (updated on mousemove). Common on `.holo-card`:

```css
.holo-card::before {
  background: radial-gradient(circle at var(--mx) var(--my), ...);
}
```

JavaScript sets these on the card's parent:

```tsx
card.style.setProperty('--mx', `${(e.clientX / rect.width) * 100}%`);
card.style.setProperty('--my', `${(e.clientY / rect.height) * 100}%`);
```

---

## Don't Reintroduce

- `ScrambleText` (replaced by KineticHeading)
- Custom scroll listeners or new `scroll-signal` subscribers for decorative motion (use GSAP ScrollTrigger via `lib/gsap`)
- Importing `gsap` directly (always import from `@/lib/gsap`)
- Dead components from old routes (check WORKLOG.md for what was removed)
- Inline motion CSS (use motion tokens from design-system.css)
