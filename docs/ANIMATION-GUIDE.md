# Animation Guide

Motion on this page is built from three things: **motion tokens** (easing, duration in CSS), **GSAP / ScrollTrigger** (all decorative scroll choreography), and **scroll-signal** (a shared rAF listener kept only for *functional* scroll state — header + progress bar). This guide walks through how to add or modify animations.

## GSAP / ScrollTrigger

Decorative scroll choreography — kinetic headings, ghost numerals, reveals, the projects rail, pointer-follow effects — runs on GSAP.

### Single import (`lib/gsap.ts`)

Plugins are registered once. **Always import from `@/lib/gsap`, never from `gsap` directly:**

```tsx
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
```

`lib/gsap.ts` window-guards `gsap.registerPlugin(ScrollTrigger, SplitText)` for SSR safety. Importing `gsap` straight from the package would re-register plugins and bloat duplicate copies.

### Lenis ↔ ticker bridge

`components/system/smooth-scroll.tsx` drives Lenis from GSAP's ticker so there is one rAF for all scroll work (official ScrollTrigger recipe):

```tsx
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
```

Disabled entirely under reduced motion (native scroll).

### Responsive tiers (`gsap.matchMedia`)

Build behavior per breakpoint/pointer/motion preference and let GSAP revert it automatically. The projects rail only pins on desktop, fine-pointer, no-reduced-motion:

```tsx
const mm = gsap.matchMedia();
mm.add(
  "(hover: hover) and (pointer: fine) and (min-width: 1024px) and (prefers-reduced-motion: no-preference)",
  () => {
    const tween = gsap.to(track, { x: () => -distance(), ease: "none", scrollTrigger: { /* pin + scrub */ } });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }
);
return () => mm.revert();
```

### Pointer-follow (`gsap.quickTo`)

`quickTo` returns a fast setter for one property — use it for cursor, magnetic pull, and card tilt instead of creating a tween per frame:

```tsx
const xTo = gsap.quickTo(node, "x", { duration: 0.35, ease: "power3.out" });
xTo(targetX); // call on every pointermove
```

Custom cursor (`custom-cursor.tsx`) and magnetic (`magnetic.tsx`) both use this; magnetic adds an `elastic.out` snap-back on release.

### Batched reveals (`ScrollTrigger.batch`)

`components/system/reveal-manager.tsx` reveals any element tagged `data-reveal` in staggered batches. Initial hidden state is JS-applied (not CSS) so content stays visible without JS and under reduced motion:

```tsx
gsap.set(targets, { y: 28, opacity: 0 });
ScrollTrigger.batch(targets, {
  start: "top 86%",
  once: true,
  onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, stagger: 0.08, ease: "expo.out", overwrite: true }),
});
```

### Cleanup on unmount

ScrollTrigger instances are global — **always tear them down** in the effect cleanup or they leak across remounts:

```tsx
return () => {
  tween.scrollTrigger?.kill();
  tween.kill();
};
```

For `matchMedia`, `mm.revert()` kills everything it created. For `batch`, kill each returned trigger. For `SplitText`, also call `split.revert()` to restore the original DOM.

## Motion Tokens

Everything in `app/design-system.css`:

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);        /* Premium entrance, snappy */
--ease-inout: cubic-bezier(0.65, 0, 0.35, 1);     /* Smooth loops, hover */
--dur-fast: 0.35s;                                 /* Quick feedback */
--dur-base: 0.6s;                                  /* Standard animation */
--dur-slow: 0.85s;                                 /* Epic reveal */
```

**Use in CSS:**
```css
.element { transition: transform var(--dur-base) var(--ease-out); }
```

**Use in JS (Framer Motion):**
```tsx
<motion.div transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
```

## scroll-signal (legacy — functional state only)

`lib/scroll-signal.ts` is a single shared rAF listener. New decorative scroll work uses GSAP ScrollTrigger (above); scroll-signal is kept only for **functional scroll state** where a tiny pub/sub is enough:

```tsx
import { subscribeScroll } from "@/lib/scroll-signal";

useEffect(() => {
  return subscribeScroll(() => {
    // Runs once per frame; returns an unsubscribe function.
    element.classList.toggle("scrolled", window.scrollY > 60);
  });
}, []);
```

**Remaining consumers:**
- `components/header.tsx` — scrolled state toggle (scrollY > 60)
- `components/scroll-progress.tsx` — top progress bar

Decorative scroll motion (parallax, kinetic reveals, timeline draw) has migrated to ScrollTrigger — don't add new decorative work here.

## Kinetic Heading (SplitText char reveal)

Used on all section titles. Characters rise out of a clip mask, staggered, when the heading first scrolls into view — built with GSAP SplitText.

```tsx
<KineticHeading
  eyebrow="// 03 — skills"
  text="Stack tecnico"
  as="h2"
/>
```

**How it works (`components/kinetic-heading.tsx`):**
1. The plain `text` stays in the DOM (accessible, selectable) until webfonts load.
2. On `document.fonts.ready`, `new SplitText(node, { type: "words,chars", mask: "words" })` splits the heading and adds per-word clip masks.
3. `gsap.from(split.chars, { yPercent: 115, ease: "expo.out", stagger: 0.018, scrollTrigger: { trigger: node, start: "top 84%", once: true } })` raises the chars into view once.
4. Splitting is deferred to `fonts.ready` so glyph metrics are final; the split is **reverted on unmount** (`split.revert()`) and the heading remounts on text change via a React `key`.
5. Skipped entirely under reduced motion (plain text shown).

**To reuse:** just drop `<KineticHeading>` into any section heading. Public API is `text`, `eyebrow`, `as`, `className`.

## Lenis Smooth Scroll

One-line scroll inertia. Wraps the app via `<SmoothScroll />` provider.

**What it does:**
- Intercepts `wheel` + `touch` events
- Applies easing (inertial deceleration)
- Driven by `gsap.ticker` and bridged to ScrollTrigger — one rAF for all scroll work (see Lenis ↔ ticker bridge above)
- Disabled under `prefers-reduced-motion: reduce`

**Safe for:**
- Anchor navigation (`lenis.scrollTo()` with a nav offset)
- Browser history (anchor clicks update URL)
- SSR (no DOM thrashing on server)

**Not manual scroll listeners.** Decorative scroll motion goes through ScrollTrigger; functional scroll state through `scroll-signal`.

## Hero Particle Formation

The "wow moment": particles assemble into "MARCO D'ANTONIO" on first load.

**Lifecycle:**
1. **0–350ms:** Boot overlay showing; particles idle in ambient field
2. **350ms:** Boot overlay clears → `bootend` event fired
3. **350–1250ms (0.9s formation):** Particles linearly interpolate from ambient positions to glyph targets
4. **1250–2250ms (1.0s hold):** Assembled name stays visible + legible
5. **2250–3250ms (1.0s disperse):** Particles lerp back to ambient noise field; hero content fades in
6. **3250ms+:** Hero content fully revealed + parallax-out active on scroll

**Formation cached:** Flag stored in `sessionStorage` so repeat visits skip the 3s sequence (instant idle field).

**Rendering:** WebGL vertex shader mixes between three states via `u_form` uniform:
- `u_form = 0.0` → ambient positions (Perlin field)
- `u_form = 0.5` → glyph target positions
- `u_form = 1.0` → ambient positions again (disperse)

## Hero Content Parallax-Out

As you scroll past the hero, content slides up + fades out. Creates "cinematic" descent illusion.

**How:**
1. Hero inner div (`revealedRef`) initially hidden (opacity 0, translateY 24px)
2. On `bootend` event, animate in over 0.8s (opacity 1, translateY 0)
3. Once revealed, a `ScrollTrigger.create({ scrub: true })` drives the hero content as you scroll past
4. Applies `translateY(${progress * -70}px)` + `opacity ${1 - progress * 1.15}` from its `onUpdate`

**Result:** Content smoothly rises out of frame as you scroll, perfectly timed with particle disperse.

## Chat Shockwave

When chat sends/receives a message, the particle field pulses.

**Trigger:**
```tsx
// In hero-mini-chat.tsx
window.dispatchEvent(new CustomEvent("hero:pulse"));
```

**Particle field listening:**
```tsx
// In hero-canvas.tsx
window.addEventListener("hero:pulse", () => {
  uniforms.u_click.value.set(0, 0, 1.3); // centered shockwave (x, y, strength)
});
```

**Shader effect:** The vertex shader pushes particles radially out from the click point; strength decays each frame.

## Marquee (Tech Stack Ticker)

Infinite horizontal scroll with pause-on-hover.

**CSS animation:**
```css
.marquee-track {
  animation: marquee-scroll 32s linear infinite;
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); } /* Rendered 2x, so -50% loops */
}

.marquee:hover .marquee-track {
  animation-play-state: paused;
}
```

**Disabled under reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  .marquee-track { animation: none; }
  .marquee-item:nth-child(n+2) { display: none; } /* Show only once */
}
```

## Timeline SVG Draw

The experience section's vertical line draws as it scrolls into view, scrubbed by ScrollTrigger (`components/experience.tsx`).

**How:**
1. Two SVG `<line>`s on a `0–100` coordinate system: a static background line and a fill line that starts at `y2="0"`.
2. A `ScrollTrigger.create({ ..., scrub: true })` drives the fill's `y2` attribute from its `onUpdate`: `fill.setAttribute("y2", \`${self.progress * 100}\`)`.
3. A separate `ScrollTrigger.batch` reveals each `.tl-item` as it enters.
4. Triggers are killed on unmount.

```tsx
ScrollTrigger.create({
  trigger: timeline,
  start: "top 70%",
  end: "bottom 70%",
  scrub: true,
  onUpdate: (self) => fill.setAttribute("y2", `${self.progress * 100}`),
});
```

## Reduce-Motion Compliance

All motion respects `prefers-reduced-motion: reduce`:

**CSS fallback:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

**JS check:**
```tsx
import { prefersReducedMotion } from "@/lib/motion";

if (!prefersReducedMotion()) {
  // Run animation
} else {
  // Instant state, no motion
}
```

**Applied to:**
- Lenis scroll (disabled, instant scroll)
- KineticHeading reveals (instant, no stagger)
- Marquee ticker (static, show once)
- Grain overlay (hidden)
- Hero formation (skipped, instant idle field)

## Adding a New Scroll-Linked Animation

**Template (ScrollTrigger):**

```tsx
// components/my-section.tsx
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/motion";

export default function MySection() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const tween = gsap.fromTo(
      el,
      { yPercent: 20 },
      {
        yPercent: -20,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return <div ref={ref}>Content</div>;
}
```

**Don't:** Add your own `addEventListener('scroll')`, or use `scroll-signal` for decorative motion (it's functional-only now).

**Do:** Reach for ScrollTrigger (`scrub` for parallax, `batch` for reveals, `quickTo` for pointer-follow), guard with `prefersReducedMotion()`, and kill triggers on unmount.

## Performance Checklist

✓ Use ScrollTrigger for decorative scroll motion (scroll-signal is functional-only)
✓ Apply only GPU-safe transforms (translate, opacity, scale, rotate)
✓ Avoid layout-thrashing (reading offsetWidth in animation loops)
✓ Cache element refs, don't re-query DOM each frame
✓ Kill ScrollTriggers / tweens on unmount (`tween.scrollTrigger?.kill(); tween.kill();`); `mm.revert()` for matchMedia
✓ Disable under reduced-motion
✓ Test on mobile (lower frame budget)
