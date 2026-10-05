# Component Catalog

## Application shell

Astro server-renders PortfolioApp with client:load hydration. SiteShell retains
language/theme providers, optional BootSequence and the single PersonAIDock.
The game is progressive enhancement, not a replacement for semantic content.
Daylight is the initial theme; a stored explicit light/dark choice is restored.

SiteContent mounts IslandPortfolio. Old JourneyCanvas, former standalone
sections, Lenis, custom cursor and the textured-board exhibition are unmounted.

## IslandPortfolio

components/island-portfolio.tsx coordinates:

- Immediate identity, Projects/Contact/CV quick links, exploration and reading
- Lazy game initialization with cancellation after unmount
- Nine area labels, six-territory minimap and eight optional visit destinations
- Contextual object and guided-transfer actions, including skip
- Native dialog for map or area-specific semantic presentation
- Selected object/case index, current area and reader/world presentation
- Canvas-scoped keyboard and pointer-captured touch control
- Theme, locale, opt-in sound, reduced motion and WebGL failure
- Hash/island:open navigation and chat-aware pause
- Complete no-JavaScript content for all eight destinations

World interaction opens content immediately; camera framing accompanies it.
Dialog content changes move focus to the new heading; close returns focus
coherently to the exploration control. Native dialog top-layer behavior keeps
keyboard input out of the canvas during reading.
The passive desktop field hint sits beside the lower-left controls rather than
across the foreground explorer. Mobile retains its separate compact/touch
placement; it is guidance only, never a content or navigation gate.
Initial reduced-motion preference is honored. Live OS/media changes are an
open limitation of the currently installed useReducedMotion hook (initial
useState without updates); the browser reproduction and engine boundary are
recorded in design-qa.md. Do not inherit an all-preference-compliance claim.

## IslandContent

API:

```ts
IslandContent({
  island: PortfolioIslandId,
  selectedIndex?: number,
  presentation?: "world" | "reader"
})
```

PortfolioIslandId excludes welcome. Each presentation uses SpotlightSection,
an inner Container, KineticHeading and shared UI buttons. The presentation
variant does not substitute different facts.

| Place | Actual document organization |
| --- | --- |
| About | Portrait notebook with complete opening summary and three thematic pages |
| Projects | Five indexed cases: problem, contribution, solution, output, actual stack |
| Skills | Five modules, actual technologies, links to relevant indexed project cases |
| Experience | Two indexed career entries, latest first, dates/role/contributions |
| Education | Three archive records with all/completed/ongoing filtering |
| Tesla | Personal model reference, illustrative colour samples, documentation boundary |
| Dance | Separate Athlete and Teacher disclosures; real-media/detail placeholders |
| Contact | Actual email, topic-prefilled mailto, CV, social profiles and Marco.AI |

Native disclosures keep all document content in SSR HTML. The selected project
or skill opens initially, but the others are not dropped from the markup.
Index links enhance normal anchors by opening the target disclosure and focusing
its summary. Archive filters start at All and do not remove other source data.

Tesla demo state is temporary. Each opening resets both the selected sample and
the world car material; the sample never claims to be the owner's actual colour
or a completed wrap. No fake project links, images, before/after, competition
results, lessons schedule or service offerings are added.

## Scene modules

- createIslandGame initializes the world and exposes start/pause/focus, touch,
  jump, travelTo, inspect/leaveStation, beginTransit/skipTransit, theme, reduced
  motion, car colour and disposal. onOpenObject opens indexed content;
  onTravel reports a nearby/running guided route.
- createIslandWorld composes terrain, bridges, ocean and architecture, plus
  scenery/ambience and independently owned architectural foundations. It forwards
  car colour and camera-distance detail visibility.
- createIslandArchitecture builds the studio, digital workshop, mechanical
  suspended laboratory, two career stations, observatory/archive, car garage,
  dance pavilion and lighthouse. Harbor/signage and low exhibit objects complete
  the place identity. Batches are owned by the module.
- createIslandHotspots owns lightweight shared selection-ring geometry and
  materials, positioned with getGroundHeight over actual decks/bridges/docks.
  It does not own long canvas text or old board panels.
- createTransitProps owns the temporary boat and parachute meshes.
- createIslandTerrainArt, createIslandBridges and createIslandOcean own their
  geometry/materials/textures/render targets and expose explicit disposal.
- createIslandPhysics owns Rapier surfaces/hulls and fixed-step movement,
  last-safe recovery, supported teleport, stop and disposal. Its support state
  uses getGroundHeight rather than terrain alone beneath structural floors.
- island-foundation-map supplies pure exact terrain-triangle footprint clipping
  and 71 shared boxes; createIslandFoundations owns their visible masonry/timber
  batches. The previous 59 Studio/Archive solids plus eight Dance piers/four
  cross-bearers sit below existing decks with 24 cm soil embedment or seabed
  footing. They collide in Rapier without adding a new walking plane.
  Contact's four short masonry toes are separate local building hulls among its
  18 solids, not additions to this existing 71-box foundation owner.
- buildExhibitCopy remains renderer-independent, supplying short factual object
  titles/captions and contact actions from the same localized content.
- createIslandAudio creates no playback until explicit user opt-in.

The central map has 21 hotspots; renderer and physics must consume their actual
transforms and approach clearings. Area IDs are not separate terrain meshes.
See [CODEBASE.md](./CODEBASE.md) for geography and surface contracts.

## Local asset review

`/asset-lab` is an isolated loopback-host-only review page, not a new public
content section. A fixed catalog selects bridge/palm/cliff/cliff-v2/studio/
studio-v2/workshop/archive/laboratory/harbor/dance/lighthouse
and validated master/batched variants. It displays
an image-generated reference beside the actual embedded-texture GLB, with orbit
and front/right/top orthographic cameras, measured file/geometry/resource/bounds
statistics and an explicitly non-binding master profile. Named-root extraction
excludes Blender preview lights/cameras. Texture failures must be errors, never
an apparently successful white model. Loading is abortable, rendering on-demand
and all owned geometries/materials/textures/ImageBitmaps are disposed on reload
and exit. Missing GLBs, no JavaScript or unavailable WebGL leave the drawings
and navigation meaningful. It imports no game/map/physics modules.

The actual world separately owns createHomeStudioAsset,
createDigitalWorkshopAsset, createArchiveObservatoryAsset,
createSuspendedLaboratoryAsset, createWelcomeHarborAsset, createDancePavilionAsset
and createContactLighthouseAsset: studio-v2, workshop, archive, laboratory, harbor,
Dance and Contact aggregates replace their
visible fallbacks only after independent successful loading. Shared
map support/hulls remain active regardless of loading. This static prototype
does not gate reading, engine readiness or focus and is not a production LOD.
Harbor revision 3 hides only Architecture: welcome after ready, on its lateral 6.2×4.2 m
floor; it does not replace spawn/plaza, docks or the other main-land buildings.
Its four semantic groups remain inspectable through the tenth closed Asset Lab
ID, harbor. Actual binary/parity and projection checks are separate from fresh
built-browser loading/failure, physical-device or art acceptance.
Dance is the eleventh static catalog ID and sixth mounted building owner.
Revision 4's 6,490,128-byte, 28-mesh, 153,778-triangle aggregate retains the
7,481,860-byte master's embedded PBR material/image/hard-hull contract. It uses
an unscaled 22×16×.24 m structural floor at (82,−.54,100) with 28 solids; only
Architecture: dance hides on success. The ground access skirts the west/front
posts via (69.8,104) → (70.2,109.5) → (77,110.5) → arrival (82,114), without moving
the bridge. WALK_PATHS follows it; historical seed clearance keeps 196 props
unchanged. Six resulting terrain buffers and 21 hotspot anchors are preserved.

createIslandExplorer owns an independent rigid-joint loader and the existing
procedural fallback. Five named torso/arm/leg pivots preserve the foot origin and
existing Rapier capsule. It must not run through the static scene flattener.
Export and browser readiness are recorded separately in design-qa.md.
This makes eight independent gameplay asset owners, twelve static catalog
masters/aggregates and thirteen masters including explorer. Seventeen drawings
remain modelling references, not automatic image-to-3D or fidelity approval.

The Contact revision-2 owner mounts an experimental aggregate. Final lint/build,
scoped CPU gates and independent final3059 browser smoke pass: eight ready owners,
one canvas, desktop/emulated-mobile day/night, Contact HTML, reader/chat pause/
focus, touch end/cancel and isolated Contact404 fallback/recovery. No AI requests
or audio playback occur. Rounded-coordinate stability is not absolute-precision motion
proof; whole-HUD/art, real-device/FPS, all-transfer and live preference checks
remain open, including hint/hut-roof and palm/avatar portrait occlusion.
The lighthouse is the twelfth static catalog ID; the new seventeenth 4K sheet
guides original geometry, not automatic reconstruction. There are thirteen
masters and eight async owners: seven independent building loaders plus explorer.
Its actual aggregate is 7,392,264 bytes/45 meshes/115,524 triangles, with 25 PBR
materials and 8 embedded 512px images. The 8,843,728-byte master stays review-only;
native/binary/parity checks pass without raising runtime guards. Existing six-building readiness is not evidence
for Contact. Its cream block tower, octagonal amber lantern, curved terracotta
radio-hut roof and attached greenery retain shell/roof/interior/decor groups.
The tower root is (17,.26,69); only the small hut floor is centred at
(11.8,.26,71.7), 6.6×4.6×.24 m, with 18 map solids and one existing contact
station. It adds the seventh support deck, not another territory or upper floor.
Welcome-to-Dance bends north through (15,64) → (23,65) before the unchanged
bridge shore. The six terrain XYZ buffers, 196 props and 21 stations are unchanged.
No reshaping is performed here; future user-authorized terrain changes require
coordinated art/map/physics/route review. Local docs do not establish deployment.

## Boot, chat and server boundaries

Boot remains skippable, localized and latched through lib/boot-state.ts. It is an
intro, not a fabricated percentage of loaded assets. Engine readiness separately
controls the play action; reading remains useful before game initialization.
On a definitive WebGL failure the opening primary action becomes an enabled
localized reader button, not a permanently spinning/loading disabled control.

PersonAIDock lazily mounts the real HeroMiniChat once and preserves its state
when closed. personai:state pauses gameplay. Focus, Escape, hidden/inert and
Turnstile behavior remain owned by the chat. No local mock replaces inference.

The Astro AI and CV routes are unchanged by the world redesign. Availability
of UI controls does not establish live provider access. Current browser and
build evidence belongs in [design-qa.md](../design-qa.md).
