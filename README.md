# web-portfolio

Marco D'Antonio's personal portfolio is a playable tropical world with a complete
HTML reading alternative. Software, AI, and infrastructure are its main subject;
Tesla customisation and competitive dance add two smaller personal destinations.

The current direction is the [inventor archipelago](./docs/design-directions/2026-09-27-inventor-archipelago/README.md).
Nine places share six physical territories. Harbor, home studio, and lighthouse
share the main land; Experience and Education share an elongated ridge. Four
bridges and short walks form an IT circuit, with optional boat, cannon, and
parachute transfers. This replaces the seven-equivalent-islands/large-boards
prototype, not the application stack.
Main, Projects, the shared ridge, Tesla and Dance have low sloping coasts and
sea-relative inhabited levels, not high rock pedestals. Only Skills floats.

## Current coastal elevation correction

The 1 October user-requested correction supersedes earlier unchanged-height
claims below: normal inhabited levels are 2.6–6.3 m above water, versus the
previous 12.2–22.2 m. Shared terrain really slopes to a shoreline only
0.38–0.72 m above water; renderer and Rapier consume the same new vertices.
Water stays at −3.2 m. Structural decks, imported roots, props, hulls, bridge
landings and docks follow the corrected terrain/map. Skills stays at 38 m.
Planar geography, six territories, bridge/transfer endpoints and content are retained.
Later shoulder softening broadens real terrain approaches without changing XZ/
indices, Skills XYZ, the 196 props or 21 hotspots. The Dance pedestrian itinerary
uses three ground waypoints to avoid the pavilion's west posts;
its bridge and arrival are unchanged. Painted paths follow that access, while
historical seed-clearance geometry preserves the existing prop placement.
Immutable Blender contracts/manifests describe historical authoring placement;
local dimensions/geometry remain unchanged, while island-map owns runtime Y.
Fresh evidence and limits belong in design-qa.md, not old passing counts.

## Projects island V2 — bare terrain first

The human selected a bare island followed by separate buildings and scenery.
A fresh Higgsfield directional sheet guides a new native terrain master, not
the rejected V1 shape. The image is not exact orthographic CAD; authoring uses
the explicitly requested lighthouse-style Scene Builder command, not automatic
image-to-mesh. Current exports, colour diagnosis and actual preview evidence are
in [the V2 study](./assets/archipelago/island-reconstruction-v2/README.md).
This remains outside gameplay: no decorative GLB is placed over old collision
terrain. The existing reader, CV, Marco.AI and eight gameplay asset owners remain.
Current native R8/S0 is **macro candidate D saved as a partial working study**,
not a finished or gameplay-mounted island. It replaces fifteen upper owners with
one connected rear ridge and retains a capped lower Saddle; twenty-eight source
owners, including BODY, stay exact. The actual GLB is 12,044,864 bytes / 30 meshes /
204,200 vertices / 84,530 triangles, with maximum Y 16.2666626 m. Its editable Blender
master is 18,651,968 bytes; the lossless aggregate is 12,206,456 bytes / two meshes,
with 0 removed faces. Both GLBs exceed the **unchanged 8 MiB** runtime ceiling.
The actual R7→R8 comparison preserves 256 sea points, 19,159 submerged faces,
the full 832 m² planar apron, prospective approaches, two PBRs and six PNGs.
Native nonadjacent ridge self-contact and unknown-peer counts are 0; these are
scoped checks, not a Boolean union or global embedding certificate.

Strict portable and full original/batched catalog checks pass, including actual
aggregation parity. The three catalog/checker/packer selectors now target R8
only in the isolated Asset Lab. Fresh R8 lint/build pass on 110 files / 0 errors /
0 warnings, retaining the FormEvent hint/Vite chunk warning. Built 3060 Asset Lab
passes master/aggregate four views, resized 390×844, datum-off full foundation,
isolated 404 retry and handled WebGL failure; public/dist/HTTP SHA parity passes.
Eleven actual captures are reviewed: ready states have one canvas/no overflow;
missing/WebGL-error states have none. There are no page errors and only the
expected 404 fixture console error. This is not physical-mobile/touch/FPS or
gameplay approval; R7 evidence below remains historical.
See [native mutation](./assets/archipelago/island-reconstruction-v2/macro-ridge-r8-d-mutation.json),
[portable comparison](./assets/archipelago/island-reconstruction-v2/macro-ridge-r8-portable-comparison.json)
and [strict portable receipt](./assets/archipelago/island-reconstruction-v2/macro-ridge-r8-strict-portable.json).
The [fresh R8 built-browser receipt](./assets/archipelago/island-reconstruction-v2/built-browser-r8.json)
records the exact local scope and remaining limits.
The central soil/disc, rear massing and reference craft remain unfinished:
partial art, not fidelity, runtime, device/FPS or deployment approval.

Historical settled R7/S0 is **portable albedo only**, not a geometry revision.
Two1024×1024 RGBA8 sRGB colour tiles multiply the existing linear vertex paint.
Independent actual R6→R7 comparison preserves all44 owners' raw positions,
normals, UVs, COLOR_0, indices, hierarchy, material assignments and bounds, plus
the original four PNGs/two PBR factors and normal/MR bindings. The master is
16,500,232 bytes/44 meshes/301,854 vertices; its lossless aggregate is16,797,916
bytes/two meshes, with109,088 triangles/0 removed faces. Both exceed unchanged8 MiB.

Strict portable checks pass5,492,953 checks/20 negatives/four CLI groups; original/
batched catalog and fresh root lint/build pass at04:10:30UTC,110 files/0 errors/
0 warnings with retained FormEvent hint/Vite chunk warning. Fresh public/dist SHA
parity and built3060 Asset Lab PASS: both variants/four views, eight viewed captures,
one ready canvas/no overflow/page errors, unchanged datum stats, resized390×844,
404 retry and isolated handled WebGL failure. This is not physical-mobile/FPS or
gameplay approval; R6 browser evidence remains historical. See
[built-browser-r7.json](./assets/archipelago/island-reconstruction-v2/built-browser-r7.json).
See [material-comparison-r7.json](./assets/archipelago/island-reconstruction-v2/material-comparison-r7.json),
[the owning study](./assets/archipelago/island-reconstruction-v2/README.md) and
[design-qa.md](./design-qa.md).

The earlier two-owner upper-saddle R8 candidate remained diagnostic-only at R7:
four actual native views were inspected, but 714 unresolved contacts and insufficient art
prevented its promotion. It was not committed/exported or selected by the catalog;
it is distinct from the later committed macro-D R8 above. See
[diagnostic receipt](./assets/archipelago/island-reconstruction-v2/upper-saddle-contact-diagnostic.json).

Historical R6's severe flat/regular forms were artistically unapproved: rear
variation3/4 and ledge0.148 m versus0.35 m remain recorded as OPEN R6 targets,
not acceptance criteria inherited by macro-D R8. Material checks do not approve
fidelity, union, navigation, device/FPS or gameplay integration. R1–R7/failures remain
preserved; the optional hero sea datum is review-only, not exported/gameplay water.
Fourteen static review IDs, fifteen editable masters including explorer and
twenty-two image references remain. No terrain/map/physics/ocean/minimap mount,
runtime owner change or final fidelity claim occurs.

## Preceding Projects island study — rejected, review only

After the explicit request to reuse the lighthouse's Higgsfield command, a
separate native Blender terrain was authored and exported at revision2. This is
parametric/reference-led geometry, not automatic reconstruction from three
views. Actual small native and GLB hero review show a smooth green carpet and
stacked-pillar hills; the user rejects the result's method/fidelity. It remains
outside gameplay, with no terrain/map/physics change. Details, source, measured
binaries and limitations are in
[the Projects study](./assets/archipelago/island-reconstruction-v1/README.md).
The isolated projects-terrain entry brings the static review catalog to13,
with14editable masters including explorer and21generated reference images.
Seven building owners plus explorer remain the same eight gameplay loaders.

## Preceding Contact lighthouse continuation — experimental

A new Higgsfield 4K modelling sheet guides an original Blender lighthouse and
open-front radio hut, not an automatic image-to-3D reconstruction. Revision 2's
experimental aggregate is mounted: 7,392,264 bytes, 45 meshes, 115,524 triangles,
25 PBR materials and 8 embedded 512px images. Its 8,843,728-byte master is review-only,
outside the unchanged 8 MiB runtime guard. Native UV-degenerate/zero-area/
normal-opposition counts are0; actual GLBs have0 zero-area/opposition candidates,
finite UVs and exact aggregation parity. Actual UV triangle determinants are not
separately measured. Final lint/build pass on 109 Astro files,
with 0 errors/0 warnings, one legacy FormEvent hint and the retained Vite chunk
warning. Final scoped built-browser3059 smoke passes; artistic acceptance,
physical-device/FPS and complete transfer/live-reduced-motion checks remain open.
Lighthouse is the twelfth static catalog ID;
there are thirteen masters including explorer, seventeen reference sheets and
seven building loaders plus explorer: eight independently owned assets.

Fresh scoped CPU checks pass: camera 222,228; overview 2,290 with 2,076,620 ready
and 1,413,748 fallback geometry samples per viewport, zero clipping; world art
2,670,876; Rapier 160,583; Contact 130,252 including 60,958 actual hard-body vertices;
foundations 14,289; all 12 master/aggregate parity checks and explorer 17 rigid poses.
Local built preview 3059 serves the exact 7,392,264-byte aggregate with HTTP 200 and
matching dist/public SHA. Final scoped3059 smoke additionally verifies eight
ready owners on one canvas without overflow/page errors in1680×945 desktop and
390×844/DPR2/coarse/initial-reduced-motion emulation, day/night. A keyboard walk
opens Contact's object/HTML; reader/chat pause movement and restore canvas/input/
button focus coherently. Trusted CDP touch end/cancel leave rounded XZ stable.
Isolated Contact404 preserves the other seven ready assets, HTML/chat and tower
collision; reload recovers all eight GET200/ready with no recovery errors/warnings.
No AI requests or audio playback occur. Desktop logs four warning messages,
two repetitions of the same Turnstile source/origin pair, and no console errors.
Mobile has no post-start console errors; its pre-resume warnings are not measured.
An initial mobile30s readiness wait timed out before all eight
were subsequently observed ready; first-load latency is not measured. Portrait
captures show the full tower, but the hint covers part of the hut roof and palm
fronds partially cover the avatar: this is not whole-HUD/art approval, real-phone
performance, all-transfer/live-reduced-motion verification or deployment.

The tower's foot-origin root is (17,.26,69). Only the radio hut has a small
6.6×4.6×.24 m support floor centred at (11.8,.26,71.7); there is no tower-wide
platform, upper walking floor or seventh terrain. Contact has 18 shared solids,
including four local underfloor masonry toes, separate from the existing 71
Studio/Archive/Dance foundation boxes. The shared map contains seven support
decks on the same six territories. Welcome-to-Dance now bends north of the hut
through (15,64) → (23,65) → unchanged bridge shore, in both directions.
All six terrain XYZ buffers, 196 props, 21 stations and bridge/arrival/transfer
endpoints remain unchanged in this batch: no island reshaping was performed.
Future reshaping is user-authorized where needed, with coordinated map, terrain,
hulls, bridge and navigation review; this current freeze is not a permanent ban.

## Explore or read

- Welcome: identity, role, Pescara, immediate project/contact/CV access
- Home studio: editorial notebook and real portrait
- Digital workshop: five project cases with contribution, solution, outcome, stack
- Suspended laboratory: five skill groups with links to relevant projects
- Career cliffs: two real professional experiences
- Archive-observatory: three education records, with the master's clearly ongoing
- Tesla bay: 2021 pre-refresh Model 3 reference and explicitly illustrative wrap demo
- Dance pavilion: separate Athlete and Teacher presentations
- Lighthouse: email, CV, actual social profiles, and persistent Marco.AI

Twenty-one low object hotspots open readable HTML immediately while the camera
frames their location. These are not long-text 3D boards. Each content type has
its own organization; all documents also remain available without playing,
WebGL, sound, or JavaScript. The main scene does not scroll; reader bodies do.

| Control | Action |
| --- | --- |
| WASD / arrows | Camera-relative movement on the focused canvas |
| Shift / Space | Run / optional jump |
| E / Enter | Open a nearby object's content or start a nearby guided transfer |
| M / Escape | Open the map while exploring |
| Escape / Enter / E during transfer | Skip to its supported arrival |
| Touch direction pad / jump | Mobile movement |

The map offers immediate reading or fast travel to every destination. There are
no unlocks, scores, required jumps, or required visits. The optional visit counter
counts eight destinations, excluding Welcome; it does not measure reading
completion. Reader dialogs and Marco.AI pause character control. Sound starts off.

## Stack

- Astro 7 / Vite, React 19, Tailwind 4, existing shared UI primitives
- Three.js WebGL2: procedural scenery/ocean, seven static Blender buildings and an independently loaded rigid-group explorer/fallback — eight independent async owners
- Rapier: shared terrain, bridge, dock, prop, and structure collision
- GSAP: overview-to-play and object-framing camera transitions
- Framer Motion: reduced-motion preference and retained chat interface
- Howler: explicit opt-in synthesized ambience and effects
- Cloudflare adapter / Workers AI: retained server routes and Marco.AI

Italian is served at / and English at /en. Hashes such as #projects, #tesla, and
#dance open the corresponding reader. Astro owns the runtime; the old Next and
signal files are preserved but unmounted. See [ASTRO-MIGRATION.md](./docs/ASTRO-MIGRATION.md).

## Commands

```bash
npm run dev
npm run lint
npm run build
npm run preview
node scripts/island-physics-check.mjs
node scripts/island-foundation-check.mjs
node scripts/island-contact-check.mjs
node scripts/island-asset-check.mjs
node scripts/island-asset-check.mjs --batched
node scripts/island-explorer-check.mjs
node scripts/island-overview-check.mjs
node scripts/island-camera-check.mjs
node scripts/island-world-art-check.mjs
node scripts/island-terrain-apron-check.mjs
npm run knowledge:sync
```

Build runs knowledge synchronisation and Astro checks before bundling.
Deployment, push, and production changes require separate explicit authorization.
A local build or UI test does not prove deployment, routing, or live AI inference.

## Implementation boundary

Walking composition now has a visible horizon and a larger foreground explorer,
using a pure per-place camera contract rather than the former top-down direction.
Tall education/contact structures have explicit headroom; the independently fitted
overview, ground and player coordinates are unchanged. Dance mounts a reference-
led static pavilion with embedded PBR textures and two owned warm lights; its
solid procedural fallback retains dedicated clearcoated timber, not glossy bridge
wood or a screenshot backdrop. Palms have real closed pinnate leaflets and continuous
bark while retaining their original trunk collision and crown envelopes; the
separate palm-v1 GLB remains an isolated study. Camera projection/material ownership checks do not
certify raster roof occlusion, reference fidelity or GPU performance; current
built-browser evidence and remaining gaps belong in [design-qa.md](./design-qa.md).

The geometry is real-time and explorable, not reference images used as scenery.
It is **not** an image-identical or production-asset reconstruction. A separate
[reference-led Blender asset study](./assets/archipelago/README.md) contains
generated multi-view drawings, editable masters and portable PBR GLBs. Review
them locally at `/asset-lab` (loopback hosts only), selecting `master` or
`batched`. Home-studio v2, digital workshop, archive-observatory, suspended
laboratory, welcome harbor, Dance pavilion and Contact lighthouse are the seven imported buildings in
gameplay: unscaled static aggregates with shared 12×8 m / 30×24 m / 18×14 m /
20×16 m / 6.2×4.2 m / 22×16 m / 6.6×4.6 m support decks and
21 / 27 / 22 / 22 / 11 / 28 / 18 simplified hulls. Their seven async loaders plus the separate explorer make eight
independent owners; reading is never gated on them.
Visible solid fallbacks remain on load failure; each owner keeps the unchanged
8 MiB, 96-mesh and 180,000-triangle loading guards.
The workshop keeps the five existing case stations and separate working cannon.
The archive keeps three education stations and the west ridge walking corridor.
The laboratory keeps five skill stations, the original cannon arrival and
parachute departure. Its deck at (-9,38.06,-133) retains the original suspended
terrain; the five normal territories now use the lower sea-relative contract.
High sails/crane/dish and lower thrusters are static soft decoration, not a rig,
upper walking floor or extra island. Laboratory revision 2 has 100,304 triangles;
its 4,020,100-byte, 42-mesh aggregate remains below the unchanged loader guards.
The soft catch net is raised 9 cm without changing hulls or physical support;
revision 1 remains recoverable. The earlier harbor revision's actual-module
Rapier gate passed 10,867 checks; current terrain/camera results are recorded in
design-qa.md. The preceding grounded-coast revision passed lint/build on 106
files with zero Astro errors/warnings, one legacy hint and the retained chunk-size
warning; that historical Harbor revision3 also passed full lint/build and all ten
master/aggregate binary/parity gates. Its six-owner readiness, Harbor404 fallback/
recovery, day/night desktop/emulated mobile, reader/chat focus/pause and locale
are scoped fresh checks in design-qa.md; local chat Turnstile warnings and art/
device/performance limitations remain explicit.
The preceding laboratory revision-2 built-browser smoke verifies
all four buildings and explorer ready on one canvas in desktop and 390×844
emulated mobile, day/night, without
overflow; laboratory-404 fallback/reload recovery, natural glide completion,
cannon skip and mobile chat/reader movement/focus are checked. Results are in
design-qa.md; it predates the grounded-coast revision and is not all-route,
physical-device, fidelity or FPS approval. Fresh grounded-coast built-browser
verification is tracked separately there.
Other buildings, terrain, bridges, palms and car remain procedural; seven other
static GLB studies are not mounted. This is partial, not art acceptance.
Dance revision 4 uses a 22×16×0.24 m deck at (82,−0.54,100), six centimetres above
its area elevation, with 28 source-aligned solids. Its real master is 7,481,860
bytes / 1,928 meshes; the aggregate is 6,490,128 bytes / 28 meshes. Both have
153,778 triangles, 18 materials and eight embedded 512×512 images. Native preview
and binary parity do not establish mounted-world fidelity or device performance.
The corrected walking access is shore → (69.8,104) → (70.2,109.5) → (77,110.5) →
arrival (82,114), checked both ways without changing the bridge. The old straight
chord collides with a west post and is retained only as a negative control.
Separate visible Studio/Archive/Dance foundations consume 71 real box hulls:
59 existing supports plus eight Dance piers and four cross-bearers. Exact clipping
against terrain triangles seats land footings 24 cm into soil; uncovered footprints
reach the seabed. These supports add no walking plane or terrain territory.
Harbor revision 3 is a small lateral nautical kiosk at (-13,-0.34,70), open
toward +X; it adds no spawn-wide platform, new station or duplicated dock.
Its immutable authoring contract records the earlier Y12.06; the unscaled
runtime root and eleven local hulls now share the derived lower deck.
Its 3,070,900-byte aggregate has 37 meshes and 85,940 triangles, with actual
binary/material/image/bounds parity checked. The owner hides only Welcome's
solid fallback after success and keeps reading/game/chat independent of loading.
The historical five-building actual-source overview gate passed 2,092 assertions and
2,011,354 geometry samples per viewport with zero clipping. Fresh built-browser
Harbor readiness/failure and final art review are recorded separately in design-qa.md.
Current Dance R4 overview, full lint/build and built-browser acceptance must be
recorded separately there; earlier owner counts and approvals are not inherited.
Seventeen generated sheets include Higgsfield explorer/Dance/Contact drawings; they are only
modelling references. A separate explorer-v1 revision-2 master is now exported
(1,382,360 bytes, 49,466 triangles). That phase had thirteen masters and twelve
static catalog IDs/aggregates; later Projects terrain is review-only. Its independent runtime loader
retains the procedural fallback and unchanged capsule; actual built-browser
engine loading was verified for the preceding three buildings and explorer prototype.
That 1 October built-browser smoke on local preview 3046 verifies walking,
jump/landing, settled inspection fade and canvas-focus return, a held-request
single-fallback-to-single-GLB swap, isolated explorer-404 fallback/recovery,
and all four owners ready in day/night. Complete character transfer behavior,
reduced-motion gait, physical-device behavior and art acceptance remain open.
Five rigid groups are not foot IK, a skeletal rig or authored animation clips.
Imported skeletal character, Unity and WebGPU remain absent. The car is not a dimensionally
faithful Tesla asset.

Water uses bounded planar reflection and procedural waves/foam, not a fluid or
buoyancy simulation. Five normal lands have sloping sandy coasts, a short
submerged toe and bedrock foundations10 m below WATER_LEVEL (−13.2 m).
Skills alone retains its suspended underside. The shared art-only coast profile
supplies the real sea contact used by foam/shallows. Low shores no longer carry
oversized decorative cliff plates or hanging greenery into the water.
Normal walking Y really changes; XZ and indices remain independently checked
against historical geometry. Land approaches are feathered real terrain ramps
with protected flat building aprons; bridge sag follows actual sea clearance.
Buildings, hulls and props share their map-derived heights.
Player support and hotspot rings use getGroundHeight, including structural floors,
bridges and docks, rather than reading terrain alone under those surfaces.
The terrain owner now has13 meshes, three materials, one path texture and
64,148 desktop /48,310 compact triangles. This is geometry accounting, not FPS.
The contact helper stays within the unchanged0.4 m CPU tolerance, not pixel-level
optical acceptance. Architectural distance/compact detail settings and lack of
imported-building LOD remain unchanged.
Instanced tropical borders and distant limestone scenery
add no collision or seventh territory. These settings are not measured FPS claims.
The natural-coast CPU gate checks shared vertices, beach heights/pigment,
actual sea contact, negative fixtures and ownership; it does not compile
shaders or measure frame rate. Character binary/finite-pose
checks alone likewise do not prove the live gait or complete physical-device
behavior.

The supplied images are art references, never evidence of projects, vehicle
modifications, or dance performances. Project media/links, Tesla modifications
and actual configuration, and dance results/media/teaching details remain
explicitly incomplete where no factual source was supplied. Reopening the wrap
demo resets its swatch and the world car to the initial illustrative colour.

Current verification and limits live in [design-qa.md](./design-qa.md); historical
passing results must not be inherited by this redesign.

## Documentation

[AGENTS.md](./AGENTS.md) · [Index](./docs/INDEX.md) ·
[Architecture](./docs/CODEBASE.md) · [Components](./docs/COMPONENTS.md) ·
[Design](./docs/DESIGN-SYSTEM.md) · [Gameplay](./docs/ANIMATION-GUIDE.md) ·
[Worklog](./docs/WORKLOG.md)
