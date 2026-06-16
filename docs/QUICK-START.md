# Quick Start: Vibe-Coding Guide

New to this portfolio? Start here to understand the DNA and add a feature without breaking the vibe.

## The Vibe

- **One-page, smooth, cinematic** — single scroll descent with linked animations
- **Dark-first, recruiter-friendly** — clear hierarchy, no gimmicks blocking reading
- **Modular, optimal** — reuse components + patterns, one shared scroll listener
- **Bilingual i18n** — all text in one place, toggleable language

## The Stack

- **Next.js 16** (pages + API routes)
- **React 19** (use client for interactivity)
- **Tailwind v4** + semantic tokens (--background, --accent, etc.)
- **Lenis** (smooth scroll, one rAF)
- **Three.js** (particle effects in hero)
- **Framer Motion** (staggered entrance animations)

## File Structure at a Glance

```
app/
  page.tsx           # Root: stacks all 6 sections + marquee
  layout.tsx         # Root: providers (theme, language, SmoothScroll, GrainOverlay)
  design-system.css  # Global: tokens, motion, themes, all CSS rules
  api/personai/      # Backend: AI chat endpoint

components/
  intro.tsx          # Hero: particle canvas + chat widget
  about.tsx, education.tsx, skills.tsx, ...  # Sections (use KineticHeading)
  kinetic-heading.tsx  # Reusable: title with per-word reveal
  marquee.tsx        # Ticker: tech stack (pauses on hover)
  grain-overlay.tsx  # Noise layer
  system/
    copy.tsx         # Eyebrow (label text primitive)
    spotlight-section.tsx  # Section wrapper (full-width, cursor glow)
    smooth-scroll.tsx      # Lenis provider
  ui/                # shadcn: button, input, textarea, etc.

content/
  i18n.ts            # Dictionary: all UI strings (IT + EN)
  knowledge/         # personAI knowledge base
  site.ts            # Metadata

lib/
  data.ts            # Projects, skills, experiences (feeds i18n + personAI)
  motion.ts          # Motion helpers (prefersReducedMotion(), easing tokens)
  gsap.ts            # Single GSAP entry point (registers ScrollTrigger + SplitText)
  scroll-signal.ts   # Shared scroll listener — functional state only (header, progress bar)
  personai.ts        # RAG + response generation
  utils.ts           # CSS/className helpers

context/
  theme-context.tsx    # Light/dark + localStorage
  language-context.tsx # IT/EN + localStorage

docs/
  INDEX.md           # Doc index
  CODEBASE.md        # Architecture (this file)
  DESIGN-SYSTEM.md   # Tokens + primitives
  COMPONENTS.md      # Component catalog
  ANIMATION-GUIDE.md # Motion patterns
  I18N-GUIDE.md      # Translations
  WORKLOG.md         # Recent work
```

## Adding a Section (The Most Common Task)

### 1. Add Copy to i18n.ts

```ts
// In content/i18n.ts, add to Copy type:
mysection: {
  label: string;      // Eyebrow
  title: string;      // KineticHeading
  description: string;
}

// In dictionary.it:
mysection: {
  label: "// 07 — my section",
  title: "My Section",
  description: "Some text here."
}

// In dictionary.en:
mysection: {
  label: "// 07 — my section",
  title: "My Section",
  description: "Some text here."
}
```

### 2. Create the Component

```tsx
// components/my-section.tsx
"use client";

import { useLanguage } from "@/context/language-context";
import KineticHeading from "@/components/kinetic-heading";

export default function MySection() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <KineticHeading
          eyebrow={t.mysection.label}
          text={t.mysection.title}
          as="h2"
        />
      </div>

      <div className="prose prose-invert">
        <p>{t.mysection.description}</p>
      </div>
    </div>
  );
}
```

### 3. Add to page.tsx

```tsx
// app/page.tsx
import MySection from "@/components/my-section";

export default function Home() {
  return (
    <main className="flex flex-col">
      <Intro />
      {/* ... existing sections ... */}

      <Divider />

      <SpotlightSection id="mysection" className="py-24 sm:py-28">
        <Container>
          <MySection />
        </Container>
      </SpotlightSection>

      {/* ... rest ... */}
    </main>
  );
}
```

### 4. Update Navigation

In `components/header.tsx`, add the section ID to `SECTIONS`:

```ts
const SECTIONS = [
  "about",
  "education",
  "skills",
  "projects",
  "experience",
  "contact",
  "mysection"  // <-- Add here
] as const;
```

**Done!** The section now:
- Appears in the one-page scroll
- Has an anchor link (#mysection) in the nav
- Highlights active section as you scroll
- Uses the theme tokens + motion rules automatically

## Common Patterns

### Pattern 1: Title + Grid of Items

```tsx
export default function MySection() {
  const { t } = useLanguage();

  return (
    <div className="space-y-8">
      <KineticHeading eyebrow={t.mysection.label} text={t.mysection.title} />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-line bg-surface p-4">
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-sm text-copy-muted">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Pattern 2: 2-Column Layout (Large Screens)

```tsx
<div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
  <div>
    <h3>{t.mysection.leftTitle}</h3>
    <p>{t.mysection.leftBody}</p>
  </div>

  <div>
    <h3>{t.mysection.rightTitle}</h3>
    <p>{t.mysection.rightBody}</p>
  </div>
</div>
```

### Pattern 3: Scroll-Linked Parallax

```tsx
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

export default function MySection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;

    const tween = gsap.fromTo(
      element,
      { yPercent: 12 },
      { yPercent: -12, ease: "none", scrollTrigger: { trigger: element, scrub: true } }
    );
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, []);

  return <div ref={ref}>Parallax content</div>;
}
```

### Pattern 4: Framer Motion Entrance

```tsx
import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 24 }}
  whileInView={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: "easeOut" }}
  viewport={{ once: true, amount: 0.3 }}
>
  Content fades in when scrolling into view
</motion.div>
```

## Styling Patterns

### Use Semantic Tokens (Not Raw Colors)

```css
/* ✓ Good */
background-color: var(--surface);
border: 1px solid var(--line-subtle);
color: var(--copy-muted);

/* ✗ Bad */
background-color: #1f1f1f;
border: 1px solid #333;
color: #999;
```

**Why?** Tokens auto-update on theme toggle (light ↔ dark). Raw colors break in dark mode.

### Spacing

```tsx
/* Padding + margin use Tailwind */
<div className="p-4 py-6 mb-8">Content</div>

/* Complex layouts use gap */
<div className="grid gap-6 sm:grid-cols-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

/* Section vertical spacing: py-24 sm:py-28 (via SpotlightSection) */
```

### Responsive

```tsx
<div className="text-sm sm:text-base lg:text-lg">
  Scales on mobile, tablet, large screens
</div>

<div className="hidden sm:flex">
  Hidden on mobile, visible on tablet+
</div>

<div className="w-full max-w-[1100px] px-6">
  Full width on mobile, centered + constrained on large
</div>
```

## Motion Checklist

Before adding motion, ask:

✓ Is this scroll-linked? → Use `subscribeScroll()` (not custom listeners)
✓ Is this an entrance? → Use Framer Motion `whileInView` (simpler)
✓ Is this interactive (hover, click)? → Use CSS transitions or Framer Motion `whileHover`
✓ Does this respect reduced-motion? → Check `lib/motion.ts` + CSS media query
✓ Is this using the right easing? → Pick `--ease-out` (entrance) or `--ease-inout` (loops)
✓ Is this using the right duration? → Pick `--dur-fast` (0.35s), `--dur-base` (0.6s), or `--dur-slow` (0.85s)

## Debugging Checklist

**Section not appearing?**
- Check section ID is in `SECTIONS` array in header.tsx
- Check `id="mysection"` matches on SpotlightSection
- Check component is imported in page.tsx
- Check export default on component file

**i18n string not updating on language toggle?**
- Verify key exists in BOTH `dictionary.it` and `dictionary.en`
- Verify component uses `const { t } = useLanguage()` and accesses `t.mysection.key`
- Check browser console for TS errors

**Styles not applying?**
- Check you're using semantic tokens (var(--background), not hardcoded hex)
- Check Tailwind class name is correct (no typos in breakpoints)
- Check dark mode: use `html.dark` selector for dark-specific styles
- Run `npm run build` to catch errors (dev mode may cache old styles)

**Animation janky?**
- Use GSAP ScrollTrigger via `lib/gsap` (not custom scroll listeners)
- Ensure you're transforming GPU properties only (translate, opacity, scale, rotate)
- Check you're not thrashing layout (reading offsetHeight in loop)
- Run on mobile: frame budget is tighter there

## Performance Tips

- **Import dynamically:** Large Three.js canvas → `dynamic(() => import(...), { ssr: false })`
- **Lazy images:** `<Image priority={false} />` for below-fold
- **Defer non-critical CSS:** Move animation keyframes to design-system.css (shared)
- **Cache formation flag:** Particle assembly cached in sessionStorage (skip on repeat visits)
- **One rAF for all:** Lenis is driven by `gsap.ticker`, so all scroll work shares one rAF (not N listeners)

## Testing

```bash
npm run lint      # ESLint check
npm run build     # Production build (catches TS + build errors)
npm run dev       # Local dev (hot reload)
```

Before committing:
1. Toggle theme (light ↔ dark) — check all colors update
2. Toggle language (IT ↔ EN) — check all text updates
3. Scroll smoothly — check motion is linked, not janky
4. Test on mobile (DevTools or real device) — check layout + performance
5. Check nav highlights correctly as you scroll

## One More Thing

The coolest part of this codebase is **how little there is**. All the "wow" comes from:
- One particle canvas (hero-only)
- One smooth scroll engine (Lenis, driven by GSAP's ticker)
- One scroll-choreography engine (GSAP ScrollTrigger via `lib/gsap`)
- Coordinated timing (motion tokens)

Don't add complexity. Keep copy literal. Reuse components. When you're tempted to write custom logic, check if a ScrollTrigger pattern or a motion token already does it.

**Vibe-code ethically.** 🎬
