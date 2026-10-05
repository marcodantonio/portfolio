# Animation and Gameplay Guide

## Single active world

The portfolio is a controllable tropical world, not a scroll-driven scene.
The same explorer moves through shared terrain, bridges and architectural
places. HTML readers scroll independently. Any future scroll-linked effect
must use lib/scroll-signal; do not restore competing archived canvases.

| Owner | Responsibility |
| --- | --- |
| Three.js / WebGL2 | Mostly procedural scene, seven imported static harbor/studio/workshop/archive/laboratory/Dance/Contact buildings, independently loaded explorer, lighting, ocean and transfer props |
| Rapier | Physical walking/jumping, simplified collision and safe arrivals |
| GSAP | Overview-to-play and object-framing camera interpolation |
| Engine transfer state | Guided boat, cannon arc and parachute descent |
| Howler | Explicit opt-in surf, steps, jump and discovery effects |
| React | Discrete UI, selected content, pause, locale/theme and chat |
| Framer Motion | Reduced-motion preference and retained chat animation |
| Scoped CSS | Document/controls presentation and small interface transitions |

## Walking and interaction

The later 1 October elevation correction supersedes historical fixed normal
deck/top/bridge heights. All normal land is genuinely lowered
to sea-relative inhabited levels 2.6–6.3 m, with low sloping coasts. Shared map
vertices drive both art and Rapier. Decks, roots, hulls and props derive their Y
from the same map. Bridge sag is bounded by actual sea clearance; docks connect
the low coast to existing boarding heights. Skills remains suspended at 38 m.
Normal terrain XZ/index topology and local asset geometry do not change; normal
top/rim, deck, hull and bridge Y intentionally do. Real shared-terrain ramps
ease bridge approaches while retaining flat structural-floor aprons and the
unchanged controller slope limit.
The latest shoulder softening preserves all terrain XZ/indices and complete
Skills XYZ; subsequent Dance integration preserves all six resulting XYZ buffers,
the 196 props and 21 hotspots. Physics support state and hotspot rings use
getGroundHeight, including real structural floors, bridges and docks, rather
than the terrain sample beneath them.

WASD/arrows move relative to the three-quarter camera; Shift runs and Space
jumps. The focused canvas owns keys, never a global interceptor.
Jumping is optional, not required by the intended walking circuit.

Rapier uses a kinematic capsule and fixed 1/60-second steps with bounded
catch-up, acceleration/braking and buffered jumping. The same state drives
the explorer, area detection, minimap and footsteps. stop clears momentum and
queued jumps on blur/pause. Touch releases on pointerup, cancellation and lost
capture. Leaves and small greenery remain non-solid; trunks, rocks, structures,
low exhibit objects, decks and rails have shared simplified hulls.

Imported harbor, studio-v2, workshop, archive, suspended laboratory, Dance and Contact are
static, not rigged or animated architecture. The studio's
12×8 m deck is supported at world Y=1.26 m (6 cm over the current clearing); ten posts, wall,
desk, four furnishings and five pots share 21 simplified hulls. It loads without
blocking input or reading. The solid fallback uses the same support/hulls;
successful completion updates lighting/shadows without moving or focusing the
explorer. New model detail does not imply measured runtime performance.
The workshop's 30×24 m deck at world Y=1.66 m and 27 simplified hulls share the
map-derived root translation and unchanged local authoring geometry. Five case approaches, walking entry and east/west
departures stay clear. The separate procedural cannon is never hidden by
workshop completion. Roofs, cloth, leaves and miniature decorative parts do
not create new walkable upper floors or solid obstacles.
The archive's shared 18×14 m stone deck sits at (90,3.16,18); 22 conservative
hulls cover its tower, posts, rear wall, shelves, three tables, stools and pots.
The front entry/crossing and west ridge corridor remain open. Fresh checks of
the lowered approaches belong in design-qa.md; old walking results are not
inherited. The door is
closed and the tower cylinder is solid; dome/telescope and upper beams create
no traversable upper floor. Support/collision are active before the GLB loads
and stay active when loading falls back.
The laboratory's 20×16 m deck at (-9,38.06,-133) has 22 shared hulls and retains
its original 20×13 m clearing and complete Skills terrain top/rim/index buffers.
The five normal tops and four bridge Y profiles are intentionally lowered.
Five Skills stations retain their approaches; cannon arrival, front
station approach and parachute departure remain supported by existing terrain.
The revision-2 soft catch net is raised 9 cm cosmetically, without collider or
support changes. Its fallback belongs to Skills architecture and hides only
when that independent asset is ready. The external cannon remains available.
Imported holography, crane, dish and lower thrusters are static geometry, not
authored clips, rotating mechanisms or extra walking surfaces.
Harbor revision 3's lateral 6.2×4.2 m floor now sits at (-13,-0.34,70), with 11 shared conservative
hulls and an open +X entry. Spawn, 21 stations, all 196 seeded props and travel
endpoints retain their planar positions; terrain-derived Y, docks and bridge
profiles follow the low coast. The mast rests on existing terrain
outside the floor. Its fifth independent owner retains Welcome's solid fallback
until ready; theme/late loading, shadow refresh and overview updates never
delay movement or reading. No new animation or player-support surface across
the plaza is introduced. Unchanged local export/parity is separate from current
world placement. Immutable source JSON/manifests retain the historical studio
14.06 / workshop 18.06 / archive 19.06 / harbor 12.06 m anchor heights, not runtime
placement. Fresh lowered-map built-browser review belongs to design-qa.md.
Dance revision 4 has an unscaled 22×16×.24 m floor at (82,−.54,100), with its top
six centimetres above the area elevation and 28 shared authored hulls replacing
the native four posts/two desks. Its 6,490,128-byte, 28-mesh, 153,778-triangle
aggregate is independently loaded, with the solid fallback retained until ready.
The original Blender PROPOSED local contract is preserved separately from the
map's runtime approval. Boundaries/solids are not inferred from concept drawings.
Seven building loaders plus explorer now make eight independent async owners.
The twelve static catalog assets and separate explorer give thirteen masters;
seventeen reference sheets are art direction, not automatic image-to-3D.

Contact revision 2's reference-led lighthouse/radio hut mounts an experimental
7,392,264-byte/45-mesh/115,524-triangle aggregate. Its 8,843,728-byte master stays
review-only; runtime 8 MiB/96-mesh/180k-triangle guards are unchanged. Native/actual GLB
diagnostics and aggregation parity pass. Final lint/build and scoped CPU gates
pass, as does independent final3059 built-browser smoke in its recorded scope.
The static tower/lantern, radio mast,
dishes, tiles and attached greenery are not rigged or authored animation clips.
Its foot-origin root is (17,.26,69), while only the 6.6×4.6×.24 m hut floor is
centred at (11.8,.26,71.7). The 18 map hulls include four local masonry toes;
they are not additions to the 71 separately clipped foundations below.
The tower remains a solid radius2.4 cylinder ending at local Y13; gallery and
lantern add no walking level. Seven support decks still occupy six territories.
The twelfth static catalog ID and seventeenth reference sheet bring thirteen
masters and seven building owners plus explorer: eight independent async owners,
with all eight browser-confirmed ready in final scoped3059 smoke. Source proposal, actual GLB and runtime
approval remain separate; an older build/browser result does not certify Contact.

Separate pure island-foundation-map and owned island-foundations geometry share
71 real box colliders: 59 existing Studio/Archive supports plus eight Dance piers
and four cross-bearers below the actual deck underside. Exact terrain-triangle
clipping seats full-footprint footings 24 cm into soil; any uncovered shore
fragment continues to the seabed. Visible geometry and Rapier consume the same
boxes. They add no walking plane, replacement terrain or getGroundHeight surface.

The main circuit is Welcome → Projects → Experience → Education → Welcome.
About and Contact are short branches on main land; Dance has its own bridge.
The Experience/Education connection is a continuous ridge walk, including
authored waypoints around the archive. No Tesla/Skills pedestrian bridge exists.
Dance's original direct arrival-to-shore chord collides with a new west post.
The approved actual-ground access is shore → (69.8,104) → (70.2,109.5) →
(77,110.5) → arrival (82,114), checked both directions without jumping or changing
bridge/arrival/transfer endpoints. WALK_PATHS paints that real itinerary and keeps
decorative foliage clear; historical SEEDED_PLACEMENT_PATHS is separate and
exists only to avoid reseeding the 196 original props. It is not an alternate
walking route. The blocked chord remains an explicit negative physics fixture.
Welcome's ground walk to that unchanged Dance bridge shore also bends north of
Contact's hut through (15,64) → (23,65), in both directions. The older straight
chord hits the real back wall and is kept as a separate negative fixture, not
bypassed by relaxing the controller. All six current terrain XYZ buffers, 196
props, 21 stations and bridge/arrival/transfer endpoints remain unchanged in
this batch. Later island reshaping is user-authorized where needed; it requires
coordinated terrain/map/bridge/hull/route review rather than an absolute XYZ freeze.

E/Enter near a hotspot opens that object's HTML document immediately and frames
the physical location. Reading is not held behind an animation. Projects open
an indexed case; all other cases remain accessible. Closing returns to the
same physical position. M/Escape opens the map during ordinary exploration.

## Guided transfers

TRAVEL_ROUTES is the source of departure/arrival positions and durations.

| Route | Animation | Configured duration |
| --- | --- | --- |
| Harbor → Tesla and return | Automatic curved boat journey | 5 seconds each |
| Projects → Skills | Automatic launch with an arcing trajectory | 3.4 seconds |
| Skills → Projects | Guided descent with parachute | 4.2 seconds |

These are configured timing values, not measured loading/performance results.
Transfers begin near their actual departure, need no aiming/steering and expose
a Skip action. Escape/Enter/E also skip while the canvas is focused.
Reduced motion completes transfer instantly, including when enabled mid-trip.

The engine stops physical input while a transfer drives the explorer's visual
position. Completion/skip teleports the actual Rapier body to the supported
arrival, using getGroundHeight for dock/bridge support as well as terrain.
Input is cleared before returning to walking. Reading or chat pauses the
transfer; hidden documents stop the rendering loop rather than consuming a
large elapsed jump on return.

A map fast-travel action is always available independently of guided transport.
It uses the configured arrival, not an island's arbitrary centre. Visits are
optional arrivals, not unlocks or a content-reading completion metric.

## Camera and ambient motion

A 42-degree perspective camera starts with a world-bounds overview and transitions
toward the explorer. Walking uses a stable three-quarter direction rather than
automatic orbiting. The pure lib/island-camera.ts contract lowers default walking
pitch from 26.3 to 15.5 degrees and half-height to 8.8m: the former upper lens ray
could not see the horizon. About retains a front-left view, while laboratory,
observatory and lighthouse use individual headroom. Portrait generally keeps a
12.5m half-height; Contact uses 13.5m desktop / 15.8m portrait. The portrait
direction is [-20,9,36], focus [.5,10.6,-5], with the unchanged 42-degree lens.
Focus changes remain camera-only; no actor/terrain displacement or
automatic per-frame orbit. Object framing uses a nearby raised view; it does not delay
the associated HTML. Overview uses a roughly 31-degree elevated direction and
cached bounds of real terrain, bridges and architectural/ready-GLB geometry,
plus local shared palm/rock/dock/label guards. An O(samples) perspective fit
balances those points inside a HUD-safe rectangle; actual navbar/intro bounds
are measured on resize. Bounds refresh only on initial construction/asset change,
never per frame. Ocean, sky, distant backdrop and giant instanced/global bucket
boxes are excluded. The virtual overview focus may be below sea; it never moves
the player or terrain. Portrait overview uses the free band above the measured
intro card, with a single Welcome marker for the shared main land; About and
Contact remain in the map/reader and regain markers in gameplay. Very short
viewports retain reading-first fallback bounds. Overview fog near/far scales
with fitted distance to avoid an opaque portrait world, then returns to the
original local 420/1250 range when playing. Initial global sun framing follows the physical map,
then interpolates to the existing local 32-unit actor atlas while exploring.
The same 2048 shadow map therefore has coarser overview coverage, not a shadow
resolution/performance upgrade. Explorer-v1 revision 2 is a separately exported original
human with violet cap/shirt and amber backpack. The generated Higgsfield
turnaround is only its modelling reference, never a raster character swap.
Five rigid groups retain body 17 meshes, arms three each and legs five each;
arm pivots are body children and leg pivots are foot-root children. Neutral
sole Y=0 and height 2.239 m preserve the current scale. There is no armature,
skin, authored clip or dance-performance animation.

The former highest-vertex-only Contact gate/browser review found the lighthouse
partly covered by the portrait header/minimap/right frame while the human stayed
visible. The Contact shot's CPU contract checks the whole building silhouette
and nominal portrait HUD margins, not just its apex. Fresh actual GLB and
mounted-world composition need their own evidence. Those CPU final-pose checks
do not certify raster occlusion, the actual DOM safe area or the live transition;
fresh built-browser composition must be recorded in design-qa.md. No physical
terrain or player coordinate is changed to improve this view.

The independent owner retains the old procedural fallback, embedded texture
decoding and unchanged 8 MiB / 96-mesh / 70,000-triangle character guards.
Runtime limb swing and jump pose rotate the separate rigid groups; body bob
does not move the capsule. Joint-local sole correction raises only cosmetic
leg geometry to avoid the neutral ground plane during walking. This is not
foot IK, new collision or a replacement support surface. Historical
pre-height-correction built-engine smoke on local preview 3046 verified loading,
walking, jump/landing and a single visible explorer. A held request retained
one procedural fallback until one GLB replaced it; isolated explorer-404 failure
and reload recovery left the three buildings independent. Settled inspection
fade hid the GLB without reviving the fallback; closing restored the opaque
explorer and canvas focus. All four owners were ready in day/night. Complete
character transfer behavior, reduced-motion gait, physical-device behavior
and final character art acceptance remain open in design-qa.

Water, foliage-adjacent cloth, birds, a decorative sailboat and procedural
fallback mechanisms provide ambient life; imported laboratory machinery remains
static. Pinnate palm fronds have a single world-owned shader-time uniform and a
bounded 3.5cm soft-leaf flutter, without moving trunks or physics. Reduced motion
returns the palm deformation exactly to neutral, freezes ambient time, removes
camera easing and quietens idle body motion. It does not hide portfolio facts.
No dancing pair is fabricated: the pavilion is left free of unverified motion.
These reductions follow the initial preference. A final browser audit found
that changing the OS/media preference after mount is not propagated by the
installed Framer hook; reload honors it. Live updates are an open limitation
in design-qa.md, not a passed dynamic preference contract.

Daylight is the initial scene; the stored explicit light/dark preference is
retained. Night adjusts existing lights/materials, not a separate scene.
The imported Dance owner and its procedural fallback each own two bounded warm
lantern PointLights (24 daylight /
40 night, 12m range, no extra shadow maps). Its physically clearcoated parquet
responds to those lights and the existing sky; finish and grain are static, not
an additional animation or scene-reflection pass. The ready GLB replaces only
its solid fallback; each owner releases its own lights. Actual projection/material gates still need browser
shader and occlusion review.

## Ocean, batching and quality

Ocean rendering owns a bounded planar reflection of real scene geometry,
procedural wave normals, Fresnel, shallow colouring and coastline foam.
The coast field follows the art-only rock/sea contact shared in
lib/island-coast.ts, derived from the exact terrain rim and grounded wall
profile rather than the upper turf outline. It is pre-baked during construction,
not recomputed per frame, and excludes the floating lab.
This is stylized water, not fluid, swimming or buoyancy simulation.

Reflection quality is lower in compact mode (currently 384 versus 768 desktop,
with 15 versus 24 maximum reflection updates/s). Renderer DPR caps remain
1.5 compact / 2 desktop and the sun map is 2048 square. Optional procedural
architectural detail groups are culled by camera distance (75 compact / 115
desktop world units); imported harbor/studio/workshop/archive/laboratory/Dance GLBs and explorer have no such culling or LOD.
compact mode also reduces selected decoration and rope microgeometry. These are settings, not FPS
guarantees, a measured adaptive-quality system or a full mesh-LOD pipeline.

Static scenery/architecture is material-batched. Bridges are also batched by span.
Avoid allocating geometry/materials every frame. Individual visible plank
joints do not create physical holes; bridges/docks use continuous shared support.
Bridge timber now has irregular local fibres, rare knots, roughness and filtered
millimetre-scale derivative relief. Per-primitive grain offsets vary appearance,
not positions/normals or support. No new texture, time uniform, draw batch or
replacement of imported PBR materials is involved. Ground colour/roughness masks
follow inhabited footprints/entrances and planted pockets. The owned path
texture paints current WALK_PATHS, including the approved Dance detour; every
other planar route is unchanged. Normal top Y now genuinely slopes
down to sea-relative sandy coasts. Neither material pass is art acceptance.
The sculpted terrain owner has 13 meshes/three materials, with 64,148 desktop
or 48,310 compact triangles across all six territories. Five normal territories
join shorelines 0.38–0.72 m above WATER_LEVEL to a small sandy toe and submerged
bedrock continuing 10 m below the sea (-13.2 m). Near-water ribs are restrained;
normal low rims have no decorative fracture plates or hanging vines crossing
the waves. Per-fragment wetness and per-vertex sand joins do not animate or
create collision. Skills alone keeps its full old top mesh and tapered
suspended underside. All six current top buffers match Rapier exactly; their
XZ/index topology is preserved, but normal Y and bridge/dock support intentionally
change. CPU comparison of the shared sea-contact helper with actual coastal
triangles measured maximum radial error 0.19613 m desktop / 0.20617 m compact,
within the unchanged 0.4 m tolerance; this does not certify pixel-level foam contact.
Botanical blades/flowers use instances
and joined stems use per-territory batches; their bounded wind is frozen by
reduced motion. A separately owned distant limestone backdrop adds no navigation,
collision or special travel destination. Geometry counts are not FPS evidence.

The opening overview fits actual coast/architecture samples, not the old map
centre. Walking uses a higher three-quarter view to clear nearby roofs. Static
shadow maps refresh after actor/focus movement or lighting changes rather than
on every idle frame. This is bounded work reduction, not an adaptive-quality or
measured target-device FPS guarantee. Sky environment targets are cached once
per theme and disposed with the game; the larger sea plane keeps its finite
edge out of the spread-out overview without adding vertices.

## Audio, pause and cleanup

Audio is silent initially and enabled only by the explicit sound control.
Howler owns generated PCM surf/steps/jump/discovery sounds with no music download.
Pause/hide/disable stop owned playback; never use global Howler mute/unload.

Reader dialogs and chat suspend movement; keyboard typing remains ordinary
typing. Focus enters the new content and returns coherently on closing.
WebGL initialization/context failure exposes reading. Reload recreates the world;
automatic context restoration is not claimed.

Normal cleanup disposes RAF, observers/listeners, tweens, physics, audio,
architecture, terrain/ocean/bridges, hotspot/transfer props, geometry, materials,
textures, botanical/backdrop/foundation owners, seven independent building loaders,
independent explorer/fallback, reflection target, shadows and renderer. Partial-construction failures
need their own review and are not proven by successful normal disposal.

## Acceptance evidence

Run lint/build plus the real-module Rapier check. Browser-test object→case→return,
the walking loop, every special transfer and skip, touch cancellation, chat/reader
pause/focus, locale/theme, reduced motion, background/foreground and WebGL failure.
Only [design-qa.md](../design-qa.md) records actual results and remaining limits.
Contact's actual revision-2 binary/parity checks pass and its aggregate is mounted
experimentally. Final lint/build, scoped CPU gates and final3059 built-browser
smoke pass separately. Native or CPU checks are not shader, visual-fidelity or
physical-device acceptance.
Fresh final CPU evidence: camera 222,228; overview 2,290 with 2,076,620 ready /
1,413,748 fallback samples per viewport and zero clipping; world art 2,670,876;
Rapier 160,583 plus Contact 130,252 (60,958 actual hard-body vertices);
foundations 14,289; twelve master/aggregate parity checks and explorer 17 rigid
poses. The final build covers 109 Astro files with 0 errors/0 warnings, one legacy
FormEvent hint and the retained Vite chunk warning. Exact browser results belong
in design-qa.md, not in these CPU counts or preceding historical approvals.
Independent final3059 smoke verifies eight ready owners/one canvas/no overflow
or page errors on1680×945 desktop and390×844/DPR2/coarse/initial-reduced-motion
emulation, day/night. ArrowUp520ms moves the rounded position from(13,79) to
(14.39,75.86) and opens Contact HTML. Reader/chat400ms pauses retain rounded XZ
and return CANVAS/INPUT→BUTTON focus coherently. Trusted CDP mobile left300ms
touchEnd leaves(10.77,77.77) stable over550+400ms; left250ms touchCancel leaves
(8.73,76.65) equally stable. These are rounded datasets, not absolute precision.
Contact404 alone retains the other seven GET200/ready assets plus HTML/chat and
tower collision; unroute/reload restores eight GET200/ready with zero recovery
errors/warnings/routes. No AI requests or audio playback occur. Desktop logs four
warning messages, two repetitions of the same Turnstile source/origin pair,
and zero console errors. Mobile has no console errors after start; pre-resume
warnings are not measured.
The first mobile30s readiness wait timed out before all eight were observed ready;
no first-load latency is measured. Portrait screenshots show the tower beneath
the HUD but retain hint/hut-roof and palm/avatar occlusion. These checks do not
approve whole-HUD/art, physical-device/FPS, full transfers, live reduced-motion
changes, shader correctness or deployment.
The scoped Dance map/physics gate passes 160,579 checks; the foundation gate
passes 14,289. Its earlier2,144-check overview result belongs to R3. A separate
fresh R4 overview passes2,144 with1,916,618ready samples per viewport and zero
clipping; final lint/build and scoped mounted-world browser checks are recorded
in design-qa.md. Binary/parity/native-preview evidence alone never establishes
those browser results, complete physical-device behavior or artistic acceptance.
Fresh lowered-map Rapier, overview, lint/build and browser results belong there;
historical passing counts do not certify changed support or travel trajectories.
The natural-height CPU world-art run passed 1,047,450 geometry/map/contact/
clearance/ownership checks, including low sandy rims/toes and raised/green-rim
negative fixtures. It does not compile shaders or measure frame rate.

Historical pre-height-correction grounded-coast/Harbor evidence passed 10,867
Rapier checks, 2,092 overview checks and 2,011,354 ready-scene samples in each
1680×945, 1024×768 and 390×844 viewport without clipping, plus 1,229,600 CPU
world-art checks. The preceding grounded-coast revision passed lint/build on 106 files
with zero Astro errors/warnings, one legacy hint and the retained chunk-size
warning. The Harbor change passed targeted lint and all ten static aggregate
binary/parity gates before the elevation correction. These are historical
results, not fresh lowered-map acceptance. Historical laboratory revision-2
built-browser smoke reported the four buildings and explorer ready on one canvas in desktop and 390×844
emulated mobile, day/night, without document overflow. Isolated laboratory-404
fallback/reload recovery, natural glide completion and cannon skip restored
supported walking/focus. Mobile chat/reader suppressed held-arrow movement and
retained coherent input/heading focus, returning to the launch button on chat
close. These scoped checks predate the grounded-coast and natural-height
revisions; fresh lowered-map built-browser verification is tracked separately
in design-qa.md, not inferred from CPU gates. They are not all-route or physical-device acceptance.
Historical three-building/explorer browser smoke verified walking/jump/landing, settled fade/
focus restoration, held-request single-fallback replacement and isolated
explorer-404 recovery as scoped above. Complete character transfer/reduced-motion
gait and physical-device behavior remain unverified. None of these certify
foot IK, a skinned rig, shaders, final art, target-device FPS or production deployment.
