# Cinematic Chapter System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved cinematic chapter system while preserving the current one-page section order.

**Architecture:** Extend the existing section primitives instead of building a second homepage. `SpotlightSection` becomes the shared chapter wrapper, each existing section receives focused chapter markup/classes, and `ProjectsRail` becomes the strongest pinned cinematic moment.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 utility classes, global CSS tokens in `app/design-system.css`, GSAP ScrollTrigger via `lib/gsap.ts`, Lenis smooth scroll, existing i18n/data sources.

---

## File Map

- Modify `components/system/spotlight-section.tsx`: add a `variant` prop and chapter data attributes/classes.
- Modify `components/site-content.tsx`: mark the existing sections as cinematic chapters without changing their order.
- Modify `components/intro.tsx`: add cinematic stage hooks and improve hero scroll transition classes.
- Modify `components/about.tsx`: turn the profile terminal into a larger dossier panel with structural hooks.
- Modify `components/education.tsx`: add radar-stage hooks and scroll-scrubbed visual emphasis.
- Modify `components/skills.tsx`: add kinetic-machine hooks and stronger sphere/category layout classes.
- Modify `components/projects-rail.tsx`: expand the pinned project chapter, add active-project state, and make progress/project context visible.
- Modify `components/experience.tsx`: add theatrical timeline hooks and stronger current-role styling.
- Modify `components/contact.tsx`: add closing-command hooks while keeping form behavior intact.
- Modify `app/design-system.css`: add the shared cinematic chapter system, section-specific styling, responsive behavior, and reduced-motion fallbacks.
- Create `scripts/verify-cinematic-chapters.mjs`: static red/green guard for required chapter hooks.
- Modify `docs/DESIGN-SYSTEM.md`, `docs/COMPONENTS.md`, `docs/ANIMATION-GUIDE.md`, and `docs/WORKLOG.md`: document the implementation.

## Task 1: Structural Red Test

**Files:**
- Create: `scripts/verify-cinematic-chapters.mjs`

- [ ] **Step 1: Write the failing structural test**

Create `scripts/verify-cinematic-chapters.mjs` with checks for the new chapter system hooks:

```js
import fs from "node:fs";

const checks = [
  ["components/system/spotlight-section.tsx", "variant?: \"default\" | \"chapter\""],
  ["components/system/spotlight-section.tsx", "data-chapter-variant"],
  ["components/site-content.tsx", "variant=\"chapter\""],
  ["components/intro.tsx", "hero-stage"],
  ["components/about.tsx", "chapter-dossier"],
  ["components/education.tsx", "education-radar-stage"],
  ["components/skills.tsx", "skills-machine"],
  ["components/projects-rail.tsx", "projects-cinematic"],
  ["components/experience.tsx", "experience-theatre"],
  ["components/contact.tsx", "contact-command"],
  ["app/design-system.css", ".chapter-section"],
  ["app/design-system.css", ".projects-cinematic"],
];

let failed = false;

for (const [file, needle] of checks) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) {
    console.error(`Missing ${needle} in ${file}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log(`Cinematic chapter hooks verified (${checks.length} checks).`);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/verify-cinematic-chapters.mjs`

Expected: FAIL because the new hooks do not exist yet.

## Task 2: Shared Chapter Wrapper

**Files:**
- Modify: `components/system/spotlight-section.tsx`
- Modify: `components/site-content.tsx`
- Modify: `app/design-system.css`

- [ ] **Step 1: Add `variant` support to `SpotlightSection`**

Add `variant?: "default" | "chapter"` and emit `data-chapter-variant={variant}`. When `variant === "chapter"`, add the `chapter-section` class.

- [ ] **Step 2: Mark existing sections as chapters**

In `components/site-content.tsx`, keep the exact section order and add `variant="chapter"` to About, Education, Skills, Projects, Experience, and Contact. Keep `Intro` as the full-screen opening stage.

- [ ] **Step 3: Add shared CSS**

Add `.chapter-section`, `.chapter-section::after`, `.chapter-section > *`, and responsive/reduced-motion rules to `app/design-system.css`. Use subtle grid/depth layers, not decorative blobs.

- [ ] **Step 4: Run the structural test**

Run: `node scripts/verify-cinematic-chapters.mjs`

Expected: still FAIL until all section hooks from later tasks exist.

## Task 3: Section Chapter Treatments

**Files:**
- Modify: `components/intro.tsx`
- Modify: `components/about.tsx`
- Modify: `components/education.tsx`
- Modify: `components/skills.tsx`
- Modify: `components/experience.tsx`
- Modify: `components/contact.tsx`
- Modify: `app/design-system.css`

- [ ] **Step 1: Add structural hooks**

Add these wrapper classes without changing visible copy source:

```txt
hero-stage
chapter-dossier
education-radar-stage
skills-machine
experience-theatre
contact-command
```

- [ ] **Step 2: Add focused GSAP/ScrollTrigger enhancement where useful**

Use local `ScrollTrigger` effects only where there is already a visual object: About terminal depth, Education radar scale/depth, Skills sphere stage, Experience timeline depth. Do not add a global scene store.

- [ ] **Step 3: Add CSS for section treatments**

Add CSS for dossier panels, radar stage, skills machine layout, timeline theatre, and contact command framing. Keep text readable and avoid nested-card styling.

- [ ] **Step 4: Run lint**

Run: `npm run lint`

Expected: PASS before continuing.

## Task 4: Expanded Projects Chapter

**Files:**
- Modify: `components/projects-rail.tsx`
- Modify: `app/design-system.css`

- [ ] **Step 1: Add active project state**

Track `activeProject` from ScrollTrigger progress on desktop and expose the current title/number in existing project data text.

- [ ] **Step 2: Expand pinned layout**

Make the project cards larger on desktop, increase the pin distance, and add a `projects-cinematic` wrapper with a visible progress/context area.

- [ ] **Step 3: Preserve touch fallback**

Keep the existing pointer drag behavior when the pinned desktop branch is inactive.

- [ ] **Step 4: Run structural test**

Run: `node scripts/verify-cinematic-chapters.mjs`

Expected: PASS.

## Task 5: Documentation And Verification

**Files:**
- Modify: `docs/DESIGN-SYSTEM.md`
- Modify: `docs/COMPONENTS.md`
- Modify: `docs/ANIMATION-GUIDE.md`
- Modify: `docs/WORKLOG.md`

- [ ] **Step 1: Document the chapter system**

Update docs with the new `SpotlightSection` chapter variant, section treatment hooks, Projects expansion, and motion rules.

- [ ] **Step 2: Run full checks**

Run:

```bash
node scripts/verify-cinematic-chapters.mjs
npm run lint
npm run build
```

Expected: all commands PASS.

- [ ] **Step 3: Run rendered QA**

Start the dev server and verify desktop plus mobile rendering. Check for blank page, framework overlay, console errors, clipping/overlap, anchor navigation, Projects desktop pinning, mobile touch fallback, and reduced-motion readability.

- [ ] **Step 4: Commit implementation**

Stage the implementation files and commit with:

```bash
git add components app scripts docs
git commit -m "Implement cinematic chapter system"
```
