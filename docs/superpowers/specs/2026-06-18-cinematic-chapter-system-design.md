# Cinematic Chapter System Design

Date: 2026-06-18

## Goal

Upgrade the current one-page portfolio from a set of good but isolated motion details into a more cinematic, scroll-directed experience inspired by sites like Montfort, while preserving the existing information architecture.

The desired outcome is a stronger first impression and a more memorable scroll journey without sacrificing readability, recruiter usefulness, performance, or the current one-page anchor model.

## Approved Direction

Use a shared cinematic chapter system across the existing sections.

The site keeps the current order:

1. Hero
2. About
3. Education
4. Skills
5. Projects
6. Experience
7. Contact

The site does not add a separate reel between sections. Instead, each existing section becomes a more deliberate chapter with shared visual language, stronger GSAP choreography, and section-specific hero visuals.

## Non-Goals

- Do not create a second homepage or parallel page structure.
- Do not change the one-page route model or add multi-page routes.
- Do not reorder the current sections.
- Do not hardcode visible copy outside `content/i18n.ts`.
- Do not introduce custom scroll listeners for decorative animation.
- Do not import GSAP directly from `gsap`; continue using `lib/gsap.ts`.
- Do not reintroduce `.surface-card`, `.section-copy`, `.eyebrow`, `ScrambleText`, `react-parallax-tilt`, or other removed patterns.
- Do not make the site feel like a generic corporate clone of the reference.

## Design Principles

The new motion system should feel cinematic, technical, and personal.

Each section should have:

- a strong chapter identity;
- a dominant visual object or layout moment;
- a clear content hierarchy;
- a GSAP timeline that supports the content instead of competing with it;
- graceful reduced-motion and mobile fallbacks.

The overall page should feel continuous. Section transitions should be more deliberate than ordinary reveal animations, but content must remain scannable.

## Technical Approach

Use a shared chapter system plus local GSAP timelines.

This is the approved middle path between two weaker extremes:

- only doing local polish, which would likely not create a true wow effect;
- building one global scene director, which would be more fragile and harder to maintain.

The shared system should live mostly in existing primitives and CSS:

- `components/system/spotlight-section.tsx`
- `components/section-ghost-number.tsx`
- `app/design-system.css`
- shared motion helpers imported from `lib/gsap.ts` and `lib/motion.ts`

Individual sections can then add focused ScrollTrigger timelines where the section has unique visual behavior.

## Section Treatment

### Hero

Keep the hero full-screen, but make it feel more like an opening stage.

Expected changes:

- stronger typographic composition for the name;
- particle canvas used less like passive background and more like part of the opening transition;
- scroll-linked transition from the hero into About;
- chat widget visually integrated as a cinematic object, not just a floating utility widget.

### About

Turn the bio and `profile.json` card into a dossier-like chapter.

Expected changes:

- larger, more physical terminal/profile panel;
- GSAP reveal sequence for bio, metadata, and profile lines;
- stronger chapter number treatment;
- no loss of readable bio content.

### Education

Make the radar visualization the main visual driver.

Expected changes:

- radar, arc, pins, and education cards synchronized more tightly with scroll;
- stronger depth and focus states;
- existing education order and text preserved.

### Skills

Keep the interactive sphere, but make the section feel like a kinetic 3D machine.

Expected changes:

- stronger section entry choreography;
- category labels and sphere states made more legible;
- scroll-scrubbed depth/rotation on desktop when appropriate;
- no heavy pinning on mobile.

### Projects

Projects is the main anchor moment and may be expanded more than the other sections.

Expected changes:

- larger or longer pinned projects chapter on desktop;
- bigger project cards or stronger project scene framing;
- active project progress more narratively visible;
- possible background/accent changes by active project;
- touch/mobile keeps a simpler usable rail.

### Experience

Make the timeline feel more theatrical without reducing clarity.

Expected changes:

- stronger line draw sequence;
- role cards entering with depth and timing;
- current role emphasized;
- timeline remains readable and semantic.

### Contact

Use Contact as a clean closing scene.

Expected changes:

- more decisive closing composition;
- form and social links framed as final commands/actions;
- submission behavior unchanged.

## Component Architecture

Prefer evolving existing components over creating new parallel sections.

Likely touched files:

- `components/site-content.tsx`
- `components/intro.tsx`
- `components/hero-canvas.tsx`
- `components/about.tsx`
- `components/education.tsx`
- `components/skills.tsx`
- `components/projects-rail.tsx`
- `components/experience.tsx`
- `components/contact.tsx`
- `components/system/spotlight-section.tsx`
- `components/section-ghost-number.tsx`
- `app/design-system.css`
- `docs/ANIMATION-GUIDE.md`
- `docs/DESIGN-SYSTEM.md`
- `docs/COMPONENTS.md`
- `docs/WORKLOG.md`

New components are acceptable only when they remove real duplication, for example a small `ChapterFrame` or section motion helper. They should not replace the current page structure.

## Data Flow

Visible text continues to come from `content/i18n.ts`.

Project, skill, and experience data continues to come from `lib/data.ts`.

Motion state should be local to each client component unless a shared primitive genuinely needs it. There is no approved global scene store.

## Motion Rules

- Use `gsap.matchMedia()` for desktop/mobile/reduced-motion branches.
- Use `ScrollTrigger` for decorative scroll-linked motion.
- Use the existing Lenis and GSAP ticker bridge.
- Kill all triggers and tweens on unmount.
- Use transform and opacity where possible.
- Keep pinning limited and intentional, especially outside Projects.
- Respect `prefers-reduced-motion` with static readable content.

## Responsive Behavior

Desktop can use the full cinematic treatment, including pinning and scrubbed timelines.

Tablet should keep the same visual hierarchy with lighter choreography.

Mobile should avoid heavy pinned scenes. It should prioritize readable stacked content, reduced transform distance, stable controls, and no horizontal overflow.

## Accessibility

- Keep semantic section structure and anchor navigation.
- Decorative chapter numbers and visual effects remain `aria-hidden`.
- Interactive widgets must remain keyboard usable.
- Reduced-motion users get readable static content.
- Text must not overlap or clip at common desktop and mobile widths.

## Performance Constraints

The implementation must preserve the current performance discipline:

- no unnecessary global animation loops;
- no custom decorative scroll listeners;
- no uncontrolled WebGL expansion across the full page unless explicitly re-approved;
- no layout-shifting content-visibility experiments that desync ScrollTrigger;
- mobile animation and WebGL tiers remain conservative.

## Testing Plan

Required checks after implementation:

- `npm run lint`
- `npm run build`
- rendered desktop visual QA;
- rendered mobile visual QA;
- no framework error overlay;
- no relevant browser console errors;
- anchor navigation still lands on the expected sections;
- Projects pinned behavior works on desktop and touch fallback works on mobile;
- reduced-motion path is readable and functional;
- contact form UI still renders and remains usable.

## Open Implementation Notes

Before coding the visual details, the implementation phase should produce or select a concrete visual reference for the chapter system. The reference should guide color, typography scale, section depth, chapter number treatment, project card scale, and motion rhythm.

The first implementation pass should focus on the shared chapter frame and Projects expansion, because those two changes will determine whether the site truly feels more cinematic rather than merely polished.
