# Narrative Flow Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible AI-template section grammar with a continuous portfolio story while preserving the current visual identity, content, anchors, and core interactions.

**Architecture:** Keep the one-page structure and existing section components, but change the homepage wrapper from numbered chapters to a `story` variant. The redesign removes global numbered chrome and lets each existing visual object carry the flow: terminal profile, radar, skill sphere, projects rail, timeline, and contact command surface.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, GSAP ScrollTrigger, existing design tokens in `app/design-system.css`.

---

### Task 1: Structural Guard

**Files:**
- Modify: `scripts/verify-cinematic-chapters.mjs`

- [x] **Step 1: Write the failing guard**

Add required checks for `variant="story"`, `.story-flow`, and `.story-section`. Add absence checks for `CinematicDirector`, `SectionGhostNumber`, `<Divider`, section `eyebrow=` props, and `// 01` through `// 06` labels.

- [x] **Step 2: Run guard to verify it fails**

Run: `node scripts/verify-cinematic-chapters.mjs`

Expected: failure listing the remaining chapter rail, ghost numbers, divider, eyebrow props, and numbered labels.

- [x] **Step 3: Keep the guard as the regression check**

The final passing output must be:

```text
Narrative flow verified (27 checks).
```

### Task 2: Homepage Flow

**Files:**
- Modify: `components/system/spotlight-section.tsx`
- Modify: `components/site-content.tsx`
- Delete: `components/cinematic-director.tsx`
- Delete: `components/section-ghost-number.tsx`

- [x] **Step 1: Add the story variant**

Extend `SpotlightSection` to accept `variant="story"` and apply the `story-section` class.

- [x] **Step 2: Remove numbered chapter chrome**

Remove the director, ghost numbers, section dividers, and tech ticker from `components/site-content.tsx`.

- [x] **Step 3: Keep the anchors**

Keep `#about`, `#education`, `#skills`, `#projects`, `#experience`, and `#contact` in the same order.

### Task 3: Component Copy Shape

**Files:**
- Modify: `components/about.tsx`
- Modify: `components/education.tsx`
- Modify: `components/skills.tsx`
- Modify: `components/projects-rail.tsx`
- Modify: `components/experience.tsx`
- Modify: `components/contact.tsx`
- Modify: `content/i18n.ts`

- [x] **Step 1: Remove heading eyebrows**

Use `KineticHeading` without `eyebrow` for homepage story titles.

- [x] **Step 2: Remove case counters**

Remove `01 / 05` counters from project cards and active project meta.

- [x] **Step 3: Rewrite generic section titles**

Replace generic titles with specific editorial copy:

```text
IT: Software che resta utile, Metodo costruito sul campo, Stack applicato, Casi reali, Dal prototipo alla produzione, Costruiamo qualcosa?
EN: Software that stays useful, Method built in the field, Applied stack, Real cases, From prototype to production, Build something?
```

### Task 4: Story CSS

**Files:**
- Modify: `app/design-system.css`

- [x] **Step 1: Add story flow styles**

Add `.story-flow`, `.story-flow::before`, `.story-flow > *`, `.story-section`, and `.story-section::after`.

- [x] **Step 2: Remove ghost numeral styling**

Remove `.ghost-num` styles and any active chapter styling that references it.

- [x] **Step 3: Preserve identity**

Use existing background, surface, accent, line, and copy tokens. Do not add a new color palette, blobs, or a new cinematic skin.

### Task 5: Documentation And Verification

**Files:**
- Modify: `docs/CODEBASE.md`
- Modify: `docs/DESIGN-SYSTEM.md`
- Modify: `docs/COMPONENTS.md`
- Modify: `docs/ANIMATION-GUIDE.md`
- Modify: `docs/WORKLOG.md`

- [x] **Step 1: Document story flow**

Update docs to describe `variant="story"` and to prohibit reintroducing numbered chapter chrome.

- [x] **Step 2: Run checks**

Run:

```bash
node scripts/verify-cinematic-chapters.mjs
npm run lint
npm run build
```

- [x] **Step 3: Browser QA**

Verify `http://localhost:3000/` on desktop and mobile. Check hero, story scenes, Projects rail, contact form layout, console health, and horizontal overflow.
