# Award-Winning Motion Upgrade (GSAP + Persistent Three.js Canvas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved spec `docs/superpowers/specs/2026-06-12-award-winning-gsap-threejs-design.md`: GSAP ScrollTrigger as the main scroll-choreography engine on top of Lenis, one persistent Three.js canvas for the whole page, four cinematic set pieces, and the listed security/quality fixes.

**Architecture:** GSAP + ScrollTrigger drive all decorative scroll choreography (official Lenis integration recipe). The hero particle canvas becomes a fixed full-viewport background with per-section scene states. `lib/scroll-signal.ts` remains only for *functional* scroll state (header, scroll progress bar); all decorative consumers migrate to ScrollTrigger.

**Tech Stack:** Next.js 16, React 19, GSAP 3.15 (ScrollTrigger + SplitText, both free), Three.js 0.184, Lenis 1.3, Tailwind v4.

**Validation model:** This repo has no unit-test runner; per CLAUDE.md the validation commands are `npm run lint` and `npm run build`, plus browser verification. Each task therefore ends with lint+build (and browser checks at visual milestones) instead of unit tests. TDD steps are intentionally replaced by these checks — do not introduce a test framework.

**Browser verification:** use the chrome-devtools MCP against `npm run dev` (port 3000). Reduced-motion check: emulate `prefers-reduced-motion: reduce`. Mobile check: emulate a ~390px viewport with touch.

---

## File map (who owns what)

| File | Responsibility |
|---|---|
| `lib/gsap.ts` (new) | Single GSAP entry: registers ScrollTrigger + SplitText, exports configured instance |
| `components/system/smooth-scroll.tsx` | Lenis owner + Lenis↔ScrollTrigger bridge |
| `components/scene/site-canvas.tsx` (new, replaces `components/hero-canvas.tsx`) | Persistent fixed WebGL particle field + per-section scene states |
| `components/system/reveal-manager.tsx` (new) | `ScrollTrigger.batch` entrance reveals for `[data-reveal]` blocks |
| `components/section-ghost-number.tsx` (new) | Ghost numerals behind sections, parallax-scrubbed |
| `components/kinetic-heading.tsx` | SplitText char-level masked reveal (same public API) |
| `components/projects-rail.tsx` | Pinned horizontal scrub on desktop; existing drag rail on touch |
| `components/custom-cursor.tsx` | quickTo cursor, event delegation, contextual states |
| `components/magnetic.tsx` | quickTo magnetic pull + elastic release |
| `components/intro.tsx` | Hero parallax-out via ScrollTrigger |
| `components/experience.tsx` | Timeline draw via ScrollTrigger scrub |
| `components/site-shell.tsx` | Mounts SiteCanvas + RevealManager |
| `components/site-content.tsx` | `z-index` layering + ghost numbers per section |
| `app/design-system.css` | Cursor states, ghost numeral styles, hero transparency |
| `lib/security.ts`, `next.config.ts`, `app/api/personai/route.ts`, `package.json` | Security/quality fixes |

---

### Task 1: Security & code-quality fixes (independent of redesign)

**Files:**
- Modify: `app/api/personai/route.ts:51-57`
- Modify: `next.config.ts:39`
- Modify: `lib/security.ts:3-8,36-49`
- Modify: `package.json` (`@types/three` → devDependencies)

- [ ] **Step 1: Stop echoing internal errors from the personAI route**

In `app/api/personai/route.ts`, replace the catch block:

```ts
  } catch (error) {
    console.error("personai: request failed", error);
    return NextResponse.json(
      { error: "personAI could not process the request." },
      { status: 500 }
    );
  }
```

(Remove the now-unused `const message = ...` line entirely.)

- [ ] **Step 2: Harden HSTS**

In `next.config.ts`, change the HSTS header to:

```ts
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
```

- [ ] **Step 3: Trust localhost origins only outside production**

In `lib/security.ts`, replace the top of the file (lines 1–8) with:

```ts
type HeadersLike = Pick<Headers, "get">;

const isProduction = process.env.NODE_ENV === "production";

const allowedOrigins = new Set([
  "https://marcodantonio.it",
  "https://www.marcodantonio.it",
]);
```

and in `isTrustedOrigin`, replace the localhost branch with:

```ts
    if (
      !isProduction &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
```

Also add this comment above `rateLimitStore` (documents the accepted limitation from the spec):

```ts
// NOTE: in-memory state is per-isolate on Cloudflare Workers, so the effective
// global limit is (limit × isolates). Accepted: Turnstile is the primary abuse
// gate; this limiter only blunts per-isolate bursts.
```

- [ ] **Step 4: Move `@types/three` to devDependencies**

In `package.json`, delete `"@types/three": "^0.184.1",` from `dependencies` and add it to `devDependencies` (keep alphabetical order). Run `npm install` to refresh the lockfile.

- [ ] **Step 5: Validate**

Run: `npm run lint && npm run build`
Expected: both pass with no new warnings.

- [ ] **Step 6: Commit**

```bash
git add app/api/personai/route.ts next.config.ts lib/security.ts package.json package-lock.json
git commit -m "fix: harden personAI error responses, HSTS, origin checks; move @types/three to devDeps"
```

---

### Task 2: GSAP motion core + Lenis bridge

**Files:**
- Modify: `package.json` (add `gsap`)
- Create: `lib/gsap.ts`
- Modify: `components/system/smooth-scroll.tsx`

- [ ] **Step 1: Install GSAP**

Run: `npm install gsap@^3.15.0`
Expected: `gsap` appears in `dependencies`.

- [ ] **Step 2: Create `lib/gsap.ts`**

```ts
/**
 * Single GSAP entry point. Plugins are registered once here; components import
 * { gsap, ScrollTrigger, SplitText } from "@/lib/gsap", never from "gsap" directly.
 * Client-only consumers — registration is window-guarded for SSR safety.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };
```

- [ ] **Step 3: Bridge Lenis ↔ ScrollTrigger in `components/system/smooth-scroll.tsx`**

Replace the file body so the effect reads (anchor-click handler unchanged):

```tsx
"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

const NAV_OFFSET = 80; // clear the fixed 64px header when jumping to anchors

/**
 * Inertial smooth scrolling via Lenis driven by GSAP's ticker (official
 * ScrollTrigger integration recipe): one rAF for all scroll work. Disabled
 * entirely under reduced-motion (native scroll). Also upgrades in-page anchor
 * clicks to an eased `scrollTo`. Renders nothing.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const drive = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(drive);
    gsap.ticker.lagSmoothing(0);

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.includes("#")) return;
      const id = href.slice(href.indexOf("#") + 1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target, { offset: -NAV_OFFSET });
      const path = `${window.location.pathname}${window.location.search}#${id}`;
      history.replaceState(null, "", path);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(drive);
      lenis.destroy();
    };
  }, []);

  return null;
}
```

- [ ] **Step 4: Validate**

Run: `npm run lint && npm run build`
Expected: pass. Then `npm run dev`, load `http://localhost:3000`, confirm smooth scroll and anchor clicks still work.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json lib/gsap.ts components/system/smooth-scroll.tsx
git commit -m "feat: add GSAP motion core and Lenis-ScrollTrigger bridge"
```

---

### Task 3: Persistent site canvas

**Files:**
- Create: `components/scene/site-canvas.tsx` (move + extend `components/hero-canvas.tsx`)
- Delete: `components/hero-canvas.tsx`
- Modify: `components/site-shell.tsx`
- Modify: `components/intro.tsx` (drop HeroCanvas)
- Modify: `components/site-content.tsx` (layering)
- Modify: `app/design-system.css` (`#hero-section` transparency)

- [ ] **Step 1: Create `components/scene/site-canvas.tsx`**

Start from a copy of `components/hero-canvas.tsx`, then apply these changes:

1. Rename the component `export default function SiteCanvas()`.
2. **Reduced motion = no canvas.** At the top of the component body:

```tsx
const [enabled] = useState(
  () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
);
// before the canvas return:
if (!enabled) return null;
```

(Deliberate change per spec: no ambient animation under reduced motion. Import `useState`.)

3. **Fixed full-viewport sizing.** Replace the hero-based size helpers:

```tsx
const W = () => window.innerWidth;
const H = () => window.innerHeight;
```

(Keep `const hero = document.getElementById("hero-section")` — still used for pointer interaction + click shockwave.)

4. **Touch tier.** Replace the particle-count/DPR constants:

```tsx
const isTouch = !window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const COUNT = isTouch ? 7000 : 22000;
// renderer:
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.25 : 1.6));
```

5. **Canvas element style** (bottom of file):

```tsx
return (
  <canvas
    ref={canvasRef}
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 0,
      background: "var(--hero-bg)",
      transition: "background 0.35s ease",
    }}
  />
);
```

6. **Per-section scene states.** After `const uniforms = {...}`, add:

```tsx
// Scroll-driven scene states: as each section crosses mid-viewport its state
// becomes the lerp target for palette/turbulence/dim.
type SceneState = {
  c1: number; c2: number; c3: number;
  warp: number; speed: number; light: number;
};
const SECTION_STATES: Array<{ id: string; state: SceneState }> = [
  { id: "hero-section", state: { c1: 0x7c6bff, c2: 0x58a6ff, c3: 0x00d4aa, warp: 1.2, speed: 1.0, light: 0 } },
  { id: "about",        state: { c1: 0x58a6ff, c2: 0x7c6bff, c3: 0x00d4aa, warp: 0.7, speed: 0.6, light: 0.35 } },
  { id: "education",    state: { c1: 0x00d4aa, c2: 0x58a6ff, c3: 0x7c6bff, warp: 0.6, speed: 0.5, light: 0.35 } },
  { id: "skills",       state: { c1: 0x7c6bff, c2: 0x00d4aa, c3: 0x58a6ff, warp: 1.0, speed: 0.8, light: 0.2 } },
  { id: "projects",     state: { c1: 0x58a6ff, c2: 0x00d4aa, c3: 0x7c6bff, warp: 0.9, speed: 0.7, light: 0.3 } },
  { id: "experience",   state: { c1: 0x00d4aa, c2: 0x7c6bff, c3: 0x58a6ff, warp: 0.6, speed: 0.5, light: 0.35 } },
  { id: "contact",      state: { c1: 0x7c6bff, c2: 0x58a6ff, c3: 0x00d4aa, warp: 1.1, speed: 0.9, light: 0.15 } },
];
const targetState: SceneState = { ...SECTION_STATES[0].state };
const targetC1 = new THREE.Color(targetState.c1);
const targetC2 = new THREE.Color(targetState.c2);
const targetC3 = new THREE.Color(targetState.c3);
const sectionEls = SECTION_STATES
  .map((s) => ({ el: document.getElementById(s.id), state: s.state }))
  .filter((s): s is { el: HTMLElement; state: SceneState } => Boolean(s.el));
let stateTick = 0;
const pickSectionState = () => {
  // Cheap dominant-section pick: the section whose box contains mid-viewport.
  const mid = window.innerHeight * 0.5;
  for (const { el, state } of sectionEls) {
    const rect = el.getBoundingClientRect();
    if (rect.top <= mid && rect.bottom >= mid) {
      Object.assign(targetState, state);
      targetC1.set(state.c1);
      targetC2.set(state.c2);
      targetC3.set(state.c3);
      return;
    }
  }
};
```

7. **Lerp toward the target each frame.** Inside `tick()`, after the existing `u_mAmt`/`u_repulse` lerps, add:

```tsx
// Re-pick the dominant section ~6×/sec (cheap), lerp uniforms every frame.
if ((stateTick = (stateTick + 1) % 10) === 0) pickSectionState();
uniforms.u_warp.value += (targetState.warp - uniforms.u_warp.value) * 0.03;
uniforms.u_speed.value += (targetState.speed - uniforms.u_speed.value) * 0.03;
uniforms.u_c1.value.lerp(targetC1, 0.03);
uniforms.u_c2.value.lerp(targetC2, 0.03);
uniforms.u_c3.value.lerp(targetC3, 0.03);
```

Add a slow scroll-linked camera drift (spec: "camera drift"). Declare next to `camTX/camTY`:

```tsx
let scrollDrift = 0;
```

inside `tick()`, before the camera lerp lines:

```tsx
scrollDrift = Math.min(1, window.scrollY / (window.innerHeight * 4)) * 1.2;
```

and change the camera Y lerp to include it:

```tsx
camera.position.y += (camTY - scrollDrift - camera.position.y) * 0.04;
```

and change the theme handling so light-theme dimming and section dimming compose — replace the `u_light` line in `applyTheme` and add a `themeLight` flag:

```tsx
let themeLight = 0;
const applyTheme = () => {
  const isLight = !document.documentElement.classList.contains("dark");
  themeLight = isLight ? 1.0 : 0.0;
  mat.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
  mat.needsUpdate = true;
};
// in tick(), with the other lerps:
const lightTarget = Math.max(themeLight, targetState.light);
uniforms.u_light.value += (lightTarget - uniforms.u_light.value) * 0.04;
```

8. **Ripple event** (used by project cards in Task 6). Next to the `hero:pulse` listener:

```tsx
const onRipple = (event: Event) => {
  const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
  if (!detail) return;
  const p = planePoint(detail.x, detail.y);
  if (p) uniforms.u_click.value.set(p.x, p.y, 0.8);
};
window.addEventListener("scene:ripple", onRipple);
// cleanup:
window.removeEventListener("scene:ripple", onRipple);
```

9. **Pause when the tab is hidden.** Around the rAF loop:

```tsx
const onVisibility = () => {
  if (document.hidden) {
    cancelAnimationFrame(animId);
  } else {
    timer.reset();
    tick();
  }
};
document.addEventListener("visibilitychange", onVisibility);
// cleanup:
document.removeEventListener("visibilitychange", onVisibility);
```

10. The `reduced` flag inside the module: the early `if (!enabled) return null` makes the old `reduced` checks dead on the formation path — leave them (harmless) or simplify to `const reduced = false`; prefer deleting the `reduced` variable and its branches since the component no longer mounts under reduced motion.

- [ ] **Step 2: Mount in the shell, remove from the hero**

In `components/site-shell.tsx`:

```tsx
const SiteCanvas = dynamic(() => import("@/components/scene/site-canvas"), { ssr: false });
```

and render `<SiteCanvas />` immediately after `<LanguageProvider initialLang={initialLang}>` (before `<GrainOverlay />`). Render it **unconditionally** — do NOT gate it behind `enhancementsReady` (the formation must start promptly, and the component already lazy-loads three internally).

In `components/intro.tsx`: delete the `HeroCanvas` dynamic import line and the `<HeroCanvas />` element (the comment too).

Delete `components/hero-canvas.tsx` (`git rm components/hero-canvas.tsx`).

- [ ] **Step 3: Fix layering**

In `components/site-content.tsx`, the main wrapper becomes:

```tsx
<main className="relative z-[1] flex flex-col">
```

In `app/design-system.css`, `#hero-section` loses its own background (the fixed canvas carries `--hero-bg` now):

```css
#hero-section {
  position: relative;
  min-height: 100dvh;
  overflow: hidden;
  background: transparent;
}
```

Check `components/footer.tsx`: if it has no opaque background, give its root `relative z-[1]` so it sits above the canvas too.

- [ ] **Step 4: Validate in browser**

Run: `npm run lint && npm run build`, then `npm run dev` and verify:
- Fresh session (clear `sessionStorage`): boot → particles form "MARCO D'ANTONIO" → disperse → hero content reveals.
- Scrolling: particles stay visible behind transparent sections (about/skills/experience/contact), palette/turbulence shift per section, opaque `--surface` sections (education/projects) cover the field.
- Chat send still pulses the field (`hero:pulse`).
- Theme toggle still dims/changes blending.
- Mobile emulation: lower density field renders, no jank.
- Reduced-motion emulation: no canvas at all, all content readable.

- [ ] **Step 5: Commit**

```bash
git add components/scene/site-canvas.tsx components/site-shell.tsx components/intro.tsx components/site-content.tsx app/design-system.css
git rm components/hero-canvas.tsx
git commit -m "feat: promote hero particles to persistent site-wide canvas with per-section scene states"
```

---

### Task 4: Migrate decorative scroll work to ScrollTrigger (intro + experience)

**Files:**
- Modify: `components/intro.tsx:91-100` (parallax-out)
- Modify: `components/experience.tsx:14-46`

- [ ] **Step 1: Intro parallax-out via ScrollTrigger**

In `components/intro.tsx`, remove the `subscribeScroll` import and replace the parallax block (lines 91–100) with:

```tsx
    // Scroll-linked parallax-out (only after the content is revealed).
    let trigger: ScrollTrigger | undefined;
    if (!reduced && hero && inner) {
      trigger = ScrollTrigger.create({
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: true,
        onUpdate: (self) => {
          if (!revealedRef.current) return;
          inner.style.transform = `translateY(${self.progress * -70}px)`;
          inner.style.opacity = `${Math.max(0, 1 - self.progress * 1.15)}`;
        },
      });
    }
```

Update imports: `import { ScrollTrigger } from "@/lib/gsap";` and in the effect cleanup replace `unsub?.()` with `trigger?.kill()`. Remove the `let unsub` declaration.

- [ ] **Step 2: Experience timeline via ScrollTrigger**

In `components/experience.tsx`, remove the `subscribeScroll` import, add `import { ScrollTrigger } from "@/lib/gsap";`, and replace the IntersectionObserver + subscribe block with:

```tsx
    const itemTrigger = ScrollTrigger.batch(timeline.querySelectorAll(".tl-item"), {
      start: "top 85%",
      once: true,
      onEnter: (batch) => batch.forEach((el) => el.classList.add("in-view")),
    });

    // Draw the gradient line in proportion to scroll progress.
    const lineTrigger = ScrollTrigger.create({
      trigger: timeline,
      start: "top 70%",
      end: "bottom 70%",
      scrub: true,
      onUpdate: (self) => fill.setAttribute("y2", `${self.progress * 100}`),
    });

    return () => {
      itemTrigger.forEach((t) => t.kill());
      lineTrigger.kill();
    };
```

- [ ] **Step 3: Validate**

Run: `npm run lint && npm run build`. In the browser: hero content still slides up/fades when scrolling past; experience line still draws with scroll; timeline cards still reveal once.

- [ ] **Step 4: Commit**

```bash
git add components/intro.tsx components/experience.tsx
git commit -m "refactor: drive hero parallax and timeline draw with ScrollTrigger"
```

---

### Task 5: Section transitions — ghost numbers + SplitText headings + batch reveals

**Files:**
- Create: `components/section-ghost-number.tsx`
- Create: `components/system/reveal-manager.tsx`
- Modify: `components/site-content.tsx` (ghost numbers per section)
- Modify: `components/site-shell.tsx` (mount RevealManager)
- Modify: `components/kinetic-heading.tsx` (SplitText internals)
- Modify: `app/design-system.css` (ghost numeral styles; drop `.kinetic-word*` rules)
- Modify: `components/about.tsx`, `components/skills.tsx`, `components/contact.tsx` (add `data-reveal`)

- [ ] **Step 1: Ghost section numbers**

Create `components/section-ghost-number.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

/** Oversized ghost numeral behind a section, drifting on scroll. Decorative. */
export default function SectionGhostNumber({ index }: { index: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || prefersReducedMotion()) return;
    const tween = gsap.fromTo(
      node,
      { yPercent: 24 },
      {
        yPercent: -24,
        ease: "none",
        scrollTrigger: {
          trigger: node.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <span ref={ref} aria-hidden="true" className="ghost-num">
      {index}
    </span>
  );
}
```

Add to `app/design-system.css` (near the holo-card block):

```css
/* ── Ghost section numerals ── */
.ghost-num {
  position: absolute;
  top: 0.5rem;
  right: clamp(0.5rem, 3vw, 3rem);
  z-index: 0;
  pointer-events: none;
  user-select: none;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: clamp(110px, 22vw, 260px);
  line-height: 1;
  letter-spacing: -0.06em;
  color: transparent;
  -webkit-text-stroke: 1px color-mix(in srgb, var(--accent) 22%, transparent);
  opacity: 0.5;
}
```

In `components/site-content.tsx`, drop a ghost number as the first child of each `SpotlightSection`'s `Container` sibling — i.e. directly inside the `SpotlightSection`, before `<Container>`:

```tsx
<SpotlightSection id="about" className="py-24 sm:py-28">
  <SectionGhostNumber index="01" />
  <Container>...</Container>
</SpotlightSection>
```

with `02`–`06` for education/skills/projects/experience/contact, and `import SectionGhostNumber from "@/components/section-ghost-number";`. If `SpotlightSection`'s root is not `position: relative`, pass `className="relative ..."` (check `components/system/spotlight-section.tsx` first).

- [ ] **Step 2: KineticHeading on SplitText (public API unchanged)**

Replace `components/kinetic-heading.tsx` internals:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { Eyebrow } from "@/components/system/copy";
import { gsap, SplitText } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

type KineticHeadingProps = {
  /** The heading text; split into chars for the staggered mask reveal. */
  text: string;
  /** Small mono eyebrow above the heading (e.g. "// 03 — skills"). */
  eyebrow?: string;
  as?: "h1" | "h2" | "h3";
  className?: string;
};

/**
 * Section heading whose characters rise out of a clip mask, staggered, when it
 * first scrolls into view (GSAP SplitText). The plain text stays in the DOM
 * until fonts are ready, and is restored on unmount — accessible/selectable.
 */
export default function KineticHeading({
  text,
  eyebrow,
  as = "h2",
  className,
}: KineticHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const node = headingRef.current;
    if (!node || prefersReducedMotion()) return;

    let split: SplitText | undefined;
    let tween: gsap.core.Tween | undefined;
    let cancelled = false;

    // Split only once webfonts are in, so glyph metrics are final.
    document.fonts.ready.then(() => {
      if (cancelled) return;
      split = new SplitText(node, { type: "words,chars", mask: "words" });
      tween = gsap.from(split.chars, {
        yPercent: 115,
        duration: 0.85,
        ease: "expo.out",
        stagger: 0.018,
        scrollTrigger: { trigger: node, start: "top 84%", once: true },
      });
    });

    return () => {
      cancelled = true;
      tween?.scrollTrigger?.kill();
      tween?.kill();
      split?.revert();
    };
  }, [text]);

  const Tag = as;

  return (
    <div className={className}>
      {eyebrow ? (
        <Eyebrow className="mb-3 text-[0.78rem] tracking-[0.24em]">{eyebrow}</Eyebrow>
      ) : null}
      <Tag
        ref={headingRef}
        className="ds-display-title ds-display-title--size-section ds-display-title--tone-default"
      >
        {text}
      </Tag>
    </div>
  );
}
```

Then in `app/design-system.css` delete the `.kinetic-word-wrap`, `.kinetic-word`, `.kinetic-heading.in-view .kinetic-word`, and the `.kinetic-word:nth-child(...)` stagger rules (grep `kinetic-` to catch them all; also remove any `.kinetic-heading` base rule if nothing else uses it).

- [ ] **Step 3: Batch content reveals**

Create `components/system/reveal-manager.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Entrance reveals for any element tagged `data-reveal`. JS-applied initial
 * state (not CSS) so content stays visible without JS and under reduced motion.
 */
export default function RevealManager() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
    if (!targets.length) return;

    gsap.set(targets, { y: 28, opacity: 0 });
    const triggers = ScrollTrigger.batch(targets, {
      start: "top 86%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.08,
          overwrite: true,
        }),
    });
    ScrollTrigger.refresh();

    return () => {
      triggers.forEach((t) => t.kill());
      gsap.set(targets, { clearProps: "transform,opacity" });
    };
  }, []);

  return null;
}
```

Mount it in `components/site-shell.tsx` right after `<Header />`:

```tsx
<RevealManager />
```

(plain import, not dynamic — it renders nothing and must register before the user scrolls far).

Tag content blocks: in `components/about.tsx`, `components/skills.tsx`, and `components/contact.tsx`, add `data-reveal` to the top-level wrapper(s) of the content **below** each `KineticHeading` (read each file; typically the prose column and the card/form/sphere wrapper — 1–3 elements per section, no nesting of tagged elements).

- [ ] **Step 4: Validate**

Run: `npm run lint && npm run build`. Browser: headings reveal char-by-char once; ghost numerals drift behind sections; about/skills/contact blocks rise in with stagger; reduced-motion emulation shows everything statically; text in headings is selectable after the reveal.

- [ ] **Step 5: Commit**

```bash
git add components/section-ghost-number.tsx components/system/reveal-manager.tsx components/kinetic-heading.tsx components/site-content.tsx components/site-shell.tsx components/about.tsx components/skills.tsx components/contact.tsx app/design-system.css
git commit -m "feat: ghost section numerals, SplitText headings, batched content reveals"
```

---### Task 6: Cinematic projects rail

**Files:**
- Modify: `components/projects-rail.tsx`
- Modify: `content/i18n.ts` (scroll hint string, both locales)
- Modify: `app/design-system.css` (progress bar)

- [ ] **Step 1: Pinned horizontal scrub (desktop tier only)**

In `components/projects-rail.tsx` add imports:

```tsx
import { useEffect, useRef } from "react"; // useEffect already there via cleanup effect
import { gsap } from "@/lib/gsap";
```

Inside `ProjectsRail`, add a ref for the progress bar and the matchMedia effect:

```tsx
const progressRef = useRef<HTMLDivElement>(null);
const pinnedRef = useRef(false);

useEffect(() => {
  const outer = outerRef.current;
  const track = trackRef.current;
  if (!outer || !track) return;

  const mm = gsap.matchMedia();
  mm.add(
    "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    () => {
      const section = document.getElementById("projects");
      if (!section) return;
      pinnedRef.current = true;
      const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
      const distance = () => track.scrollWidth - outer.clientWidth;
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) {
              progressRef.current.style.transform = `scaleX(${self.progress})`;
            }
            // Subtle velocity-linked skew (clamped), eased back to 0.
            const skew = gsap.utils.clamp(-4, 4, self.getVelocity() / -350);
            skewTo(skew);
          },
        },
      });
      return () => {
        pinnedRef.current = false;
        tween.scrollTrigger?.kill();
        tween.kill();
        gsap.set(track, { clearProps: "transform" });
      };
    }
  );
  return () => mm.revert();
}, []);
```

Gate the drag handlers so they no-op while pinned — first line of `onPointerDown`:

```tsx
if (pinnedRef.current) return;
```

- [ ] **Step 2: Progress bar + hint copy**

Under the drag-hint row in the JSX, add the progress bar (desktop only):

```tsx
<div className="rail-progress hidden lg:block" aria-hidden="true">
  <div ref={progressRef} className="rail-progress-fill" />
</div>
```

CSS in `app/design-system.css` next to `.rail-outer`:

```css
.rail-progress {
  height: 2px;
  max-width: 200px;
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  border-radius: 999px;
  overflow: hidden;
}
.rail-progress-fill {
  height: 100%;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
}
```

In `content/i18n.ts`, find the `projects` object in **both** locales; next to the existing `drag` key add:

```ts
// it:
scrollHint: "scorri — le card scorrono in orizzontale",
// en:
scrollHint: "scroll — the cards glide sideways",
```

and in the JSX show the right hint per tier:

```tsx
<span className="lg:hidden">{t.projects.drag}</span>
<span className="hidden lg:inline">{t.projects.scrollHint}</span>
```

- [ ] **Step 3: quickTo tilt + canvas ripple on cards**

In `HoloCard`, replace the manual `node.style.transform` writes with GSAP quickTo (init once per card):

```tsx
const tiltRef = useRef<{
  rx: (v: number) => void;
  ry: (v: number) => void;
  y: (v: number) => void;
} | null>(null);

useEffect(() => {
  const node = ref.current;
  if (!node || !isFinePointer) return;
  gsap.set(node, { transformPerspective: 900 });
  tiltRef.current = {
    rx: gsap.quickTo(node, "rotationX", { duration: 0.4, ease: "power3.out" }),
    ry: gsap.quickTo(node, "rotationY", { duration: 0.4, ease: "power3.out" }),
    y: gsap.quickTo(node, "y", { duration: 0.4, ease: "power3.out" }),
  };
}, []);

const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
  const node = ref.current;
  const tilt = tiltRef.current;
  if (!node || !tilt || !isFinePointer) return;
  const rect = node.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  node.style.setProperty("--mx", `${px * 100}%`);
  node.style.setProperty("--my", `${py * 100}%`);
  node.style.setProperty("--hop", "0.6");
  tilt.rx((py - 0.5) * -8);
  tilt.ry((px - 0.5) * 10);
  tilt.y(-5);
};

const reset = () => {
  const node = ref.current;
  const tilt = tiltRef.current;
  if (!node) return;
  node.style.setProperty("--hop", "0");
  if (tilt) {
    tilt.rx(0);
    tilt.ry(0);
    tilt.y(0);
  }
};

const handleEnter = (event: React.MouseEvent<HTMLDivElement>) => {
  window.dispatchEvent(
    new CustomEvent("scene:ripple", { detail: { x: event.clientX, y: event.clientY } })
  );
};
```

Wire `onMouseEnter={handleEnter}` on the card root and add `data-cursor="view"` to it (used by Task 7). Note: the CSS `transition: transform ...` on `.holo-card` now conflicts with GSAP-driven transforms — remove `transform 0.18s cubic-bezier(.2,.6,.3,1),` from the `.holo-card` transition list in `app/design-system.css`.

Also add `data-cursor="drag"` to the `rail-outer` div.

- [ ] **Step 4: Validate**

Run: `npm run lint && npm run build`. Browser (desktop ≥1024px): the projects section pins, vertical scroll glides the cards horizontally, progress bar fills, tilt feels smooth, hovering a card ripples the background field; scrolling back up un-pins cleanly. Mobile emulation: drag rail works exactly as before. Anchor `#projects` from the nav still lands correctly (ScrollTrigger pin spacing — verify, and if the anchor lands short, that is acceptable as it still shows the pinned section start).

- [ ] **Step 5: Commit**

```bash
git add components/projects-rail.tsx content/i18n.ts app/design-system.css
git commit -m "feat: pinned horizontal projects rail with scrub, progress bar, quickTo tilt and canvas ripple"
```

---

### Task 7: Premium cursor + magnetic

**Files:**
- Modify: `components/custom-cursor.tsx` (full rewrite)
- Modify: `components/magnetic.tsx` (quickTo core)
- Modify: `components/intro.tsx` (Magnetic props)
- Modify: `app/design-system.css` (cursor states)

- [ ] **Step 1: Rewrite `components/custom-cursor.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";

const HOVER_SELECTOR = "a, button, [role='button'], [data-cursor]";
const STATES = ["hov", "drag", "view"] as const;

/**
 * Two-layer custom cursor (dot + trailing ring) driven by GSAP quickTo.
 * Contextual states come from `data-cursor` attributes via event delegation,
 * so dynamically mounted nodes are covered and nothing leaks.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2.out" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2.out" });
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3.out" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3.out" });

    let alive = false;
    const onMove = (e: MouseEvent) => {
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
      if (!alive) {
        dot.style.opacity = "1";
        ring.style.opacity = "0.55";
        alive = true;
      }
    };

    const setState = (state: string | null) => {
      for (const s of STATES) {
        dot.classList.toggle(s, s === state);
        ring.classList.toggle(s, s === state);
      }
    };
    const onOver = (e: MouseEvent) => {
      const hit = (e.target as Element | null)?.closest?.(HOVER_SELECTOR);
      if (!hit) {
        setState(null);
        return;
      }
      setState(hit.getAttribute("data-cursor") || "hov");
    };

    const onDown = () => {
      dot.classList.add("click");
      ring.classList.add("click");
    };
    const onUp = () => {
      dot.classList.remove("click");
      ring.classList.remove("click");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      gsap.killTweensOf([dot, ring]);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cur-dot" />
      <div ref={ringRef} className="cur-ring" />
    </>
  );
}
```

CSS updates in `app/design-system.css`: the cursor now translates via GSAP `x/y` (top-left origin), so remove `transform: translate(-50%, -50%)` and compensate with negative margins; add blend mode and the new states:

```css
.cur-dot {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99999;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  background: var(--accent);
  border-radius: 50%;
  pointer-events: none;
  transition: width 0.15s, height 0.15s, margin 0.15s, opacity 0.2s;
  opacity: 0;
}
.cur-ring {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 99998;
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  border: 1px solid var(--accent);
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: difference;
  transition: width 0.25s, height 0.25s, margin 0.25s, opacity 0.3s;
  opacity: 0;
}
.cur-dot.hov { width: 10px; height: 10px; margin: -5px 0 0 -5px; }
.cur-ring.hov { width: 52px; height: 52px; margin: -26px 0 0 -26px; opacity: 0.35; }
.cur-dot.click { width: 4px; height: 4px; margin: -2px 0 0 -2px; opacity: 0.6; }
.cur-ring.click { width: 60px; height: 60px; margin: -30px 0 0 -30px; opacity: 0.2; }
.cur-dot.drag, .cur-dot.view { opacity: 0; }
.cur-ring.drag, .cur-ring.view {
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  opacity: 0.6;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}
```

- [ ] **Step 2: Magnetic on quickTo**

Replace `components/magnetic.tsx` (drops the hand-rolled spring; same radial-field behavior, elastic release):

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/gsap";

type MagneticProps = {
  children: ReactNode;
  /** Pull intensity applied before the element fully locks to the cursor. */
  strength?: number;
  /** Radius in pixels where the magnetic field starts influencing the cursor. */
  radius?: number;
  className?: string;
};

/**
 * Gives a child a radial magnetic pull toward the cursor, with an elastic
 * snap-back on release. Disabled on touch / coarse pointers.
 */
export default function Magnetic({
  children,
  strength = 0.25,
  radius = 160,
  className,
}: MagneticProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const moverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const anchor = anchorRef.current;
    const mover = moverRef.current;
    if (!anchor || !mover) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const xTo = gsap.quickTo(mover, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(mover, "y", { duration: 0.35, ease: "power3.out" });
    let inField = false;

    const release = () => {
      if (!inField) return;
      inField = false;
      gsap.to(mover, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" });
    };

    const onMove = (event: PointerEvent) => {
      const rect = anchor.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist >= radius) {
        release();
        return;
      }
      if (!inField) {
        inField = true;
        gsap.killTweensOf(mover);
      }
      const lockDistance = radius * 0.62;
      const pull =
        dist <= lockDistance
          ? 1
          : strength * Math.pow((radius - dist) / (radius - lockDistance), 0.72);
      xTo(dx * pull);
      yTo(dy * pull);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", release);
    document.addEventListener("pointerleave", release);
    document.addEventListener("visibilitychange", release);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", release);
      document.removeEventListener("pointerleave", release);
      document.removeEventListener("visibilitychange", release);
      gsap.killTweensOf(mover);
    };
  }, [radius, strength]);

  return (
    <span ref={anchorRef} className={className} style={{ display: "inline-flex" }}>
      <span ref={moverRef} style={{ display: "inline-flex", willChange: "transform" }}>
        {children}
      </span>
    </span>
  );
}
```

Update call sites that pass the removed props: run `grep -rn "stiffness\|damping" components/ --include="*.tsx"`. Expected hit: `components/intro.tsx:236` — change to:

```tsx
<Magnetic strength={0.38} radius={120}>
```

(If other call sites appear, strip `stiffness`/`damping` the same way.)

- [ ] **Step 3: Validate**

Run: `npm run lint && npm run build`. Browser: dot snaps, ring trails with lag; link/button hover swells the ring; over the rail the ring becomes a filled "drag" disc; over a project card the "view" disc; CTA buttons pull toward the cursor and snap back elastically on exit.

- [ ] **Step 4: Commit**

```bash
git add components/custom-cursor.tsx components/magnetic.tsx components/intro.tsx app/design-system.css
git commit -m "feat: contextual GSAP cursor and elastic magnetic interactions"
```

---

### Task 8: Retire scroll-signal from docs surface + update all docs

**Files:**
- Check usages: `grep -rn "scroll-signal" components/ lib/ docs/`
- Modify: `docs/CODEBASE.md`, `docs/ANIMATION-GUIDE.md`, `docs/COMPONENTS.md`, `README.md`, `docs/WORKLOG.md`

- [ ] **Step 1: Confirm remaining scroll-signal consumers**

Run: `grep -rln "subscribeScroll" components/ lib/`
Expected remaining: `components/header.tsx`, `components/scroll-progress.tsx` (functional scroll state — these stay), `lib/scroll-signal.ts`. If `components/intro.tsx` or `components/experience.tsx` still appear, Task 4 was incomplete — fix before proceeding.

- [ ] **Step 2: Update docs**

- `README.md`: stack line gains GSAP — "Next.js, Tailwind v4, shadcn/ui, GSAP (ScrollTrigger), Three.js, and Cloudflare Workers AI"; mention the persistent particle canvas in the hero bullet.
- `docs/CODEBASE.md`: Stack section adds `GSAP 3 (ScrollTrigger + SplitText) — scroll choreography`; `components/scene/site-canvas.tsx` replaces `hero-canvas` references; Motion section: decorative choreography = GSAP ScrollTrigger via `lib/gsap.ts`, functional scroll state (header, progress bar) = `lib/scroll-signal.ts`.
- `docs/ANIMATION-GUIDE.md`: new top section "GSAP / ScrollTrigger pattern" with the `lib/gsap.ts` import rule, the Lenis bridge explanation, a `gsap.matchMedia` tier example, and the cleanup-on-unmount rule (`tween.scrollTrigger?.kill()`); rewrite the Kinetic Heading and Timeline sections to match the new implementations; mark scroll-signal as legacy ("functional state only — new decorative work uses ScrollTrigger").
- `docs/COMPONENTS.md`: update entries for kinetic-heading, projects-rail, custom-cursor, magnetic; add site-canvas, reveal-manager, section-ghost-number.
- `docs/WORKLOG.md`: add a dated entry summarizing the upgrade (GSAP core, persistent canvas, rail, transitions, cursor, security fixes).

- [ ] **Step 3: Validate + commit**

Run: `npm run lint && npm run build`

```bash
git add README.md docs/
git commit -m "docs: document GSAP motion architecture and persistent canvas"
```

---

### Task 9: Final verification sweep

- [ ] **Step 1: Full build + lint**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 2: Browser matrix**

With `npm run dev` + chrome-devtools MCP:
1. **Desktop (1440px)**: boot → formation → disperse → hero reveal; scroll through all sections — canvas states shift, ghost numerals drift, headings split-reveal, projects pin + scrub, experience line draws, contact reveals; chat pulse works; theme toggle works; cursor states everywhere.
2. **Mobile (390px touch)**: no pinning, drag rail intact, ~7k particle field smooth, no custom cursor.
3. **Reduced motion**: no canvas, no choreography, every section fully readable, marquee static.
4. **Console**: zero errors/warnings from GSAP or three.

- [ ] **Step 3: Lighthouse spot-check**

Run a desktop Lighthouse audit on `/` via chrome-devtools MCP `lighthouse_audit`.
Expected: Performance ≥ 90. If below: check canvas DPR cap, confirm gsap is tree-shaken (no `gsap/all` imports), confirm three.js still loads via dynamic import only.

- [ ] **Step 4: Commit any tuning, then wrap up**

```bash
git add -A
git commit -m "polish: motion tuning from browser verification pass"
```

(Skip if nothing changed.)
