# AGENTS.md

Repository instructions for coding agents.

## Read this first

1. [README.md](./README.md) — stack, commands, playable portfolio
2. [docs/INDEX.md](./docs/INDEX.md) — documentation index
3. [docs/CODEBASE.md](./docs/CODEBASE.md) — architecture and ownership
4. [docs/ASTRO-MIGRATION.md](./docs/ASTRO-MIGRATION.md) — runtime, routes, legacy files
5. [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md) — art and presentation contract
6. [docs/COMPONENTS.md](./docs/COMPONENTS.md) — component catalog
7. [docs/ANIMATION-GUIDE.md](./docs/ANIMATION-GUIDE.md) — movement, camera, travel, audio
8. [docs/WORKLOG.md](./docs/WORKLOG.md) — recent changes
9. [Current design brief](./docs/design-directions/2026-09-27-inventor-archipelago/README.md)

## Architecture summary

- One-page portfolio as an explorable developer-inventor archipelago, with eight
  distinct HTML content presentations and a complete independent reader.
- Astro 7 / Vite / React with Cloudflare adapter. Locale routes index.astro and
  en.astro share components/portfolio-app.tsx.
- Three.js WebGLRenderer uses WebGL2; Rapier owns character movement/collision,
  GSAP camera transitions, Howler explicit opt-in sound.
- Nine semantic places, six physical territories, four bridges, 21 object
  hotspots, two boarding ramps, four directional guided-transfer routes.
  AREAS/ISLANDS describe places; TERRITORIES alone describe physical surfaces.
- Main, Projects, Ridge, Tesla and Dance are grounded sea cliffs, with a
  continuous rock foundation 10 m below WATER_LEVEL. Skills alone remains
  suspended; its existing tapered underside is unchanged.
- Welcome, About and Contact share land. Experience and Education share a ridge.
  Welcome → Projects → Experience → Education → Welcome is the IT loop.
  Tesla has a boat, Skills a cannon/parachute, Dance a separate footbridge.
- IT remains the principal identity. Tesla/dance are smaller personal areas, not
  three equally weighted portfolios. No collectible or unlock gates.
- Server routes /api/personai and /cv/[lang], metadata, API discovery and sitemap
  remain; see the migration guide. No separate content-page routes are added.
- content/i18n.ts owns visible IT/EN copy. lib/data.ts and content/site.ts own
  existing project, skill, experience, and public profile facts.
- Old JourneyCanvas, shaders, sections, Next/OpenNext files and board renderer
  remain historical/unmounted. app/ still owns imported CSS.
- Active art is mostly procedural; Welcome, About, Projects, Education, Skills,
  Dance and Contact mount static reference-led harbor / studio-v2 / workshop /
  archive / suspended-lab / dance-pavilion / lighthouse Blender GLBs with seven
  independent async owners, solid fallbacks and shared decks/hulls. Twelve static
  catalog masters/aggregates live in assets/archipelago / Asset Lab; those seven
  aggregates are mounted. No image-identical fidelity is claimed. A separate
  explorer-v1 revision-2 master brings the total to thirteen, with its own loader/
  fallback outside the static catalog. The preceding three-building/explorer
  built-browser smoke verifies those four owners ready in day/night, walking/jump/landing,
  inspection fade and canvas-focus return, one fallback under a held request,
  and isolated explorer-404 recovery. Complete transfer/reduced-motion/device
  character behavior and final art acceptance remain open. Laboratory revision 2
  source, GLB parity, map/physics and projection are checked. Final scoped built-
  browser smoke reports the four buildings and explorer ready on one canvas in desktop/
  emulated mobile, day/night, without overflow; laboratory-404 recovery, glide,
  cannon skip and mobile chat/reader pause/focus pass. Final lint/build and CPU
  gates pass, with exact scope recorded in design-qa.md. This is not complete
  transfer/reduced-motion/device or final art acceptance. Explorer is not a static
  catalog/packer ID.
  Those built-browser observations precede the grounded-coast revision; fresh
  coast browser evidence is recorded separately, not inferred from CPU gates.
  Harbor revision 3 is a lateral nautical kiosk, not a new floor across spawn.
  Its actual binary/aggregation parity and five-building projection pass;
  fresh built-browser Harbor ready/failure-recovery, desktop/emulated-mobile
  day/night and scoped reading/input/locale checks are recorded in design-qa.md.
  Full artistic, transfer, hardware/performance acceptance remains separate.
  Current Dance revision 4 is a static prototype on a 22×16×.24 m deck at
  (82,−.54,100) with 28 hulls. The preceding six-building/explorer batch had seven
  independent owners and sixteen references; Contact now adds the eighth owner
  and seventeenth drawing, not automatic image-to-3D.
  Latest terrain softening preserves planar/index geometry, complete Skills XYZ,
  196 props and 21 hotspots. Only the local Dance pedestrian access is rerouted
  around real posts; bridge/arrival/transfer endpoints remain unchanged. Current
  final build/browser and R4 overview evidence belong in design-qa.md, not the
  historical approvals above.
  Contact revision 2 mounts an experimental 7,392,264-byte/45-mesh/115,524-triangle
  aggregate, with 25 portable PBR materials and 8 embedded 512px images. Its
  8,843,728-byte master is review-only; the runtime 8 MiB/96-mesh/180k-triangle guards are
  unchanged. Native UV-degenerate/zero-area/normal-opposition counts are0;
  actual GLBs have0 zero-area/opposition candidates and finite UVs, with exact
  binary/aggregation parity. Actual UV triangle determinants are not separately
  measured. Final lint/build and fresh scoped CPU gates pass; the build checks 109
  Astro files with 0 errors/0 warnings, one legacy FormEvent hint and the retained
  Vite chunk warning. Final built-browser3059 smoke passes in desktop/emulated
  mobile day/night: eight ready owners, one canvas, no overflow/page errors,
  Contact object/HTML, reader/chat pause/focus, touch end/cancel and isolated
  Contact404 fallback/reload recovery. Local Turnstile warnings, unmeasured
  first-load latency, portrait hint/foliage occlusion and device/FPS/complete-
  transfer/live-reduced-motion/art/deploy limits remain in design-qa.md. There are now
  twelve static catalog IDs, thirteen masters and seventeen generated sheets.
  Seven building owners plus explorer make eight async owners; do not inherit
  Contact readiness or art acceptance from the earlier six buildings.
  The shared map now has seven structural decks on the same six territories:
  Contact's tower root is (17,.26,69), while only the hut floor is centred at
  (11.8,.26,71.7), 6.6×4.6×.24 m. Its 18 hulls include four local masonry toes,
  separate from the existing 71 Studio/Archive/Dance foundation boxes.
  The Welcome-to-Dance ground route adds (15,64) → (23,65) north of the hut;
  bridge/arrival/transfer endpoints, all six XYZ buffers, 196 props and 21 stations
  remain unchanged in this batch. No island reshaping has been performed.
  Skeletal animation, Unity and WebGPU remain absent.

## Important files

| File | Responsibility |
| --- | --- |
| src/layouts/SiteLayout.astro | Document, fonts, locale metadata, structured data |
| components/portfolio-app.tsx, site-shell.tsx | Providers, optional boot, persistent chat |
| components/island-portfolio.tsx | HUD, map, native dialog, touch and game lifecycle |
| components/island-content.tsx | Eight distinct semantic presentations and SSR content |
| lib/island-map.ts | Areas, territories, entrances, routes, props, hotspots, shared hulls |
| lib/island-game.ts | Renderer, explorer, camera, input, guided-transfer state |
| lib/island-camera.ts | Pure walking-shot lens/direction/foreground framing; never changes terrain or the player |
| lib/island-overview.ts | Cached real-scene bounds and perspective safe-rectangle fitting; no gameplay mutation |
| lib/island-explorer.ts | Independent five-rigid-group GLB owner, cosmetic foot lift and procedural fallback; scoped local gait/fade/fallback smoke verified, broader acceptance open |
| lib/island-world.ts | Procedural scenery and owned scene composition |
| lib/island-studio-asset.ts | Seven independently owned async building GLBs, embedded textures, solid fallbacks and cleanup |
| lib/island-architecture.ts | Distinct buildings, low exhibit objects, mechanisms, car |
| lib/island-hotspots.ts | Shared subtle object-selection indicators |
| lib/island-transit.ts | Owned boat/parachute transfer props |
| lib/island-terrain-art.ts | Shared tops, five grounded sea cliffs, unchanged Skills underside, route material |
| lib/island-coast.ts | Art-only grounded wall/foundation and sea-contact radius shared with ocean; never walking support |
| lib/island-foundation-map.ts | Pure exact terrain-footprint clipping and 71 shared Studio/Archive/Dance foundation box hulls; no new walking plane |
| lib/island-foundations.ts | Independently owned visible masonry/timber support geometry matching those Rapier solids |
| lib/island-vegetation.ts | Instanced broad-leaf borders, flowers and trailing plants; shared clearance, no new hulls |
| lib/island-palm-art.ts | Closed curved palm fronds and parametric outward normals; unchanged conservative crown/wind bounds |
| lib/island-backdrop.ts | Owned distant limestone scenery outside the navigable map; no extra territory |
| lib/island-bridges.ts | Curved timber spans and boarding ramps |
| lib/island-ocean.ts | Planar reflection, waves, foam/shallows from grounded rock sea contact, cleanup |
| lib/island-exhibit-copy.ts | Short localized object labels; no renderer import |
| lib/island-physics.ts | Rapier colliders, fixed step, supported arrivals, last-safe recovery |
| lib/island-audio.ts | Opt-in Howler and original PCM effects |
| lib/island-asset-lab.ts, src/pages/asset-lab.astro | Isolated loopback GLB review, three orthographic axes, ownership and failure states |
| assets/archipelago/README.md | Generated references, editable Blender masters, manifest and integration limits |
| app/island-game.css | Scoped game, distinct documents, map and touch styling |
| src/pages/api/personai.ts, lib/personai.ts | Existing real AI endpoint/retrieval |
| scripts/island-physics-check.mjs | Actual-module deterministic Rapier checks |
| scripts/island-foundation-check.mjs | Actual triangle footing, visible/physical parity and negative support checks; not art or browser approval |
| scripts/island-contact-check.mjs | Contact proposal/map/actual GLB hard-body and floor parity, real Rapier access and blocked-chord negative; not art approval |
| scripts/island-asset-pack.mjs, island-asset-check.mjs | Static material/group batching and binary/parity checks; not LOD or art approval |
| scripts/island-explorer-check.mjs | Separate character binary, foot/pivot/hierarchy and finite rigid-pose checks |
| scripts/island-overview-check.mjs | Actual geometry/GLB projections, responsive frustum and invalid-input checks |
| scripts/island-camera-check.mjs | Actual walking projections and owned pavilion finish/light checks; raster occlusion still requires browser review |
| scripts/island-world-art-check.mjs | CPU world-art geometry/map/clearance/ownership checks; not FPS, shader or visual acceptance |
| scripts/island-ocean-check.mjs | Actual CPU coastal field, time/theme/light uniforms and exact-once resource disposal; not GPU/FPS/art approval |

## Working rules

- Preserve complete reading, projects, CV, contact and Marco.AI without gameplay,
  WebGL, sound, or reaching a place. No-JavaScript HTML remains meaningful.
- Use SpotlightSection + Container + KineticHeading and components/ui controls.
  Scope styles to island classes; do not patch archived effects for active UI.
- World art, navigation, minimap and physics share island-map contracts. Never
  render AREAS as nine independent terrain meshes. Review supported entrances,
  pedestrian approaches and collision whenever routes or architecture change.
- Normal land uses sea-relative LAND_CLEARANCE (2.6–6.3m inhabited ground) and
  low sloping shores; Skills alone keeps its suspended elevation38. Runtime
  heights come from the map, not historical Blender world anchors. Preserve
  asset-local geometry/XZ/topology; old exact normal terrain/bridge-Y snapshots
  predate the user's natural-elevation correction and are not current guards.
  The user authorizes future island reshaping where needed. The current Contact
  batch's frozen terrain is a scoped baseline, not a permanent ban: a future
  reshape must coordinate terrain, hulls, bridges, map and supported routes and
  rerun the corresponding checks rather than inheriting old XYZ claims.
- Objects open readable HTML immediately; camera framing must not delay text.
  Use notebook/case/module/timeline/archive/garage/dance/contact-specific layouts,
  not long canvas paragraphs or identically structured section popups.
- Keep the main IT loop walkable without jumping. Guided transfers have skip
  controls and immediate reduced-motion completion. Fast travel is never locked.
  Dance's approved ground access is bridge shore → (69.8,104) → (70.2,109.5) →
  (77,110.5) → arrival (82,114), in both directions. WALK_PATHS must reflect this
  access for art/vegetation; SEEDED_PLACEMENT_PATHS preserves the original RNG
  exclusions solely to retain the 196 props. Never use that historic straight
  chord as a player route or hide its post collision by loosening the controller.
  Welcome-to-Dance also avoids the Contact hut northwards through (15,64) and
  (23,65) before the unchanged shore (29.443082,72.234975), in both directions.
  Keep the blocked former hut-back-wall chord as a negative collision fixture.
- Keyboard movement belongs to the focused canvas. Clear held input and momentum
  on blur/pause; clear touch on release, cancellation and lost capture.
  Stop movement while a reader or chat is open; restore focus coherently.
- Audio starts disabled. Dispose owned Howler resources only, never global state.
- Preserve daylight default with stored day/night preference, IT/EN, reduced
  motion, WebGL failure reading, boot skip, and chat persistence.
- Active gameplay is not scroll-linked. Any retained/future scroll effect uses
  lib/scroll-signal, not a separate scroll listener.
- Do not invent companies, qualifications, ratings, metrics, project links,
  vehicle modifications, dance results, teaching venues or commercial services.
  Concept images are art direction, never factual proof.
- Tesla wrap is an explicitly illustrative transient demo; reopening resets it.
  Preserve explicit incomplete-content notices until real materials exist.
- Do not reintroduce .surface-card, .section-copy, .eyebrow, ScrambleText or
  react-parallax-tilt. Preserve user edits and archived alternatives.
- Meaningful changes require owning docs and a WORKLOG entry.
- Asset masters must be reviewed as actual GLBs with embedded PBR textures and
  finite bounds, not just concept images or Blender previews. The seven unscaled
  building aggregates are explicit prototypes, not production approval.
  HOME_STUDIO / WORKSHOP / ARCHIVE_OBSERVATORY / SUSPENDED_LAB / WELCOME_HARBOR /
  DANCE_PAVILION / CONTACT_LIGHTHOUSE and WORLD_SUPPORT_DECKS own seven support decks and
  21 / 27 / 22 / 22 / 11 / 28 / 18 simplified
  hulls, not a seventh terrain. Lab is a 20×16 m deck at (-9,38.06,-133), not a
  terrain replacement: retain the original 20×13 clearing, six exact shared top/
  rim buffers and four bridges. Keep the five skill anchors, cannon arrival,
  front approach and parachute departure clear. Lower motors/soft catch net add
  no walking support or solid hull; lab mechanisms are currently static, not rigged.
  Harbor is a 6.2×4.2 m lateral floor at (-13,−.34,70), open toward +X; its
  immutable authoring contract retains the earlier Y12.06, not runtime Y.
  retain the spawn/plaza, 21 stations, 196 existing props, docks and transfer routes.
  Its mast stands on existing terrain outside that floor. Loading hides only
  Architecture: welcome after success; other buildings and separate docks remain.
  Dance is an unscaled 22×16×.24 m floor at (82,−.54,100), top area.elevation+.06;
  its 28 authored hulls replace the native four posts/two desks. Original Blender
  PROPOSED local geometry remains distinct from dance-contract-v1 runtime approval.
  Shared physics support and hotspot positions use getGroundHeight, not terrain
  alone beneath floors. Preserve the six latest terrain buffers when refining art.
  CONTACT_LIGHTHOUSE / CONTACT_LIGHTHOUSE_DECK adds the seventh shared support
  floor, not a seventh territory or a tower-wide slab. Keep its foot-origin root
  (17,.26,69) distinct from the hut floor centre (11.8,.26,71.7), with 18 local
  hulls including four toes below that floor. The tower cylinder ends at local
  Y13 with radius 2.4 and bottom−.12; gallery/lantern are non-walkable decoration.
  contact-proposed-v1.json remains an immutable PROPOSED source. Actual exported
  geometry, runtime approval and fresh browser evidence are separate steps.
  Revision2's actual GLB/aggregate parity passes and its aggregate is mounted;
  final lint/build, scoped CPU gates and final3059 built-browser smoke pass in
  their recorded scope. They are not whole-HUD, art/performance/device/deploy approval.
  Separate Studio/Archive/Dance foundations own 71 real box solids: the previous
  59 plus eight Dance timber piers and four cross-bearers below the existing floor.
  Pure clipping of real terrain triangles determines full-footprint soil contact
  and 24 cm embedment; uncovered fragments continue to the seabed. Match visible
  support and Rapier exactly. Foundations never add another walking plane, filled
  island or getGroundHeight surface.
  Keep each imported building below the unchanged 8 MiB / 96-mesh / 180,000-triangle
  runtime limits; heavier editable masters remain review-only.
  Keep other masters isolated until placement, runtime cost,
  LOD, pivots, hulls and routes are checked. Do not widen the public CSP for GLB
  textures; buildings use independent isolated HTML-image texture loaders.
  Asset Lab never imports world/map/physics; exported preview cameras/lights are
  excluded from rendering, bounds and statistics. No missing-asset placeholders.
- Cliff dressing stays below the playable top. Preserve all six shared top
  buffers and 576 Float32 shoreline vertices exactly when refining coastal art;
  decorative relief and distant scenery never create unsupported walkable land.
  Five normal territories must continue into the sea, not taper into exposed
  hanging boulders. lib/island-coast.ts shares their WATER_LEVEL - 10 foundation
  and sea-contact profile with the ocean field; do not move the water, terrain,
  bridge profiles or Rapier support to achieve this. Keep the waterline clear
  of bridging decorative plates and apply coastal wetness per fragment, not
  across a whole fracture cell. Skills is the sole floating exception and stays
  excluded from sea-contact foam. Geometric contact is not final art acceptance.
  The generated explorer turnaround is a reference only. The exported explorer
  uses five rigid groups, not a skin/armature or authored clips. Preserve the
  foot-origin plane, unchanged Rapier capsule, independent fallback and 8 MiB /
  96-mesh / 70,000-triangle character limits. Cosmetic sole lift must never move
  the capsule or root; exported structure is not built-browser gait acceptance.
- Push, deployment, remote migrations and production changes require separate
  explicit authorization. Local gates are not proof of deployment or live AI.

## Checks

```bash
npm run lint
npm run build
node scripts/island-physics-check.mjs
node scripts/island-foundation-check.mjs
node scripts/island-contact-check.mjs
node scripts/island-asset-check.mjs
node scripts/island-asset-check.mjs --batched
node scripts/island-explorer-check.mjs
node scripts/island-overview-check.mjs
node scripts/island-camera-check.mjs
node scripts/island-world-art-check.mjs
node scripts/island-ocean-check.mjs
```

Lint and build must pass before completion. Also verify changed behavior in a
browser: object→case→return→reader, routes and transfers both ways/skip, keyboard
and touch cancellation, focus, chat, locale/theme, audio opt-in, reduced motion
and WebGL failure as appropriate. Record exact results and limits in design-qa.md.
Do not inherit historical passing claims or label quality settings as measured
performance.
