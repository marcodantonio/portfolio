# Developer-inventor archipelago — 2026-09-27

## Source and intent

This is the durable implementation contract for the user's written
“Specifica di progetto — Portfolio 3D di Marco D’Antonio” and ten supplied concept
images. Original text: `/Users/marcodantonio/.codex/attachments/01ee59c5-58e7-4c73-886a-60b91f12b1fb/Pasted text.txt`.
The images remain in `/Users/marcodantonio/Downloads/`; they have not been copied
into the application or used as flat scene backgrounds.

| Original image filename | Reference role |
| --- | --- |
| ChatGPT Image Sep 27, 2026 at 01_34_46 AM-1.png | Master map |
| ChatGPT Image Sep 27, 2026 at 01_34_47 AM-2.png | Welcome harbor |
| ChatGPT Image Sep 27, 2026 at 01_34_48 AM-3.png | Home studio |
| ChatGPT Image Sep 27, 2026 at 01_34_48 AM-4.png | Digital workshop |
| ChatGPT Image Sep 27, 2026 at 01_34_49 AM-5.png | Suspended laboratory |
| ChatGPT Image Sep 27, 2026 at 01_34_49 AM-6.png | Career cliffs |
| ChatGPT Image Sep 27, 2026 at 01_34_50 AM-7.png | Archive-observatory |
| ChatGPT Image Sep 27, 2026 at 01_34_51 AM-8.png | Tesla bay and garage |
| ChatGPT Image Sep 27, 2026 at 01_34_51 AM-9.png | Dance pavilion |
| ChatGPT Image Sep 27, 2026 at 01_34_52 AM-10.png | Contact lighthouse |

The text wins when an image contains inconsistent geography, extra buildings,
generated labels or unconfirmed personal details. Reference images are not
screenshots of implemented work or proof of actual vehicle/dance activities.

## Identity and geography

Software, IT and AI are the main profession and approximately 75% of the intended
hierarchy. Tesla/modding and dance share the secondary role. This is a design
target, not a claimed measured ratio. Never turn the entrance into three equal
portfolio choices or nine interchangeable island cards.

Nine semantic places occupy six physical territories:

- Main territory: Welcome harbor, About home studio, Contact lighthouse.
- Digital district: Projects on its own large irregular mass.
- Shared ridge: Experience at one end, Education/observatory at the other.
- Suspended territory: Skills, visibly supported by an inventor's machinery.
- Western bay: compact Tesla garage with automatic boat access.
- Eastern terrace: compact Dance pavilion with a dedicated footbridge.

The pedestrian loop is **Welcome → Projects → Experience → Education → Welcome**.
About and Contact are short main-land branches. Experience→Education remains a
continuous ridge walk. Welcome→Dance has a separate bridge. Welcome↔Tesla uses
a boat, never a footbridge. Projects→Skills uses a cannon; Skills→Projects uses
a guided parachute descent. No unlock, precision jump, aiming or steering is
required. All destinations also have immediately available fast travel.

The active map implements six surfaces, four bridges, 21 object hotspots, two
boarding ramps and four directional special-transfer routes. Safe entrances,
footprints, paths, hulls and transfer endpoints are centralized in island-map.ts.
The old sqrt(10) scale is historical context, not a claim that this new map
preserves tenfold area for each redesigned territory.

## Art contract

**Later user workflow correction, 3 October:** create bare-island references
in front/right/top directions before Higgsfield multiview image-to-3D, then add
separate scenery. Do not keep expanding procedural island art as a substitute.
The [first Projects pilot](../../../assets/archipelago/island-reconstruction-v1/README.md)
is only a saved image study: down-tilted candidates are not approved orthographic
inputs. Current Higgsfield lists Meshy/Tripo3D models but exposes no generate_3d
command. No automatic reconstructed island exists yet. Restore a documented
execution path or obtain a different workflow choice before conversion; never
label manually authored Blender geometry as automatic faithful reconstruction.
After real GLB review, any terrain replacement/reshape must coordinate sea-relative
land, map support, collision, bridges, shore field and separate element placement.

**Later user correction, 1 October:** ordinary islands must look natural at
sea level rather than perched on tall rock plinths. Normal inhabited ground is
2.6–6.3 m above the sea with sloping sandy shoulders and0.38–0.72 m rims.
Water remains−3.2; Skills alone stays deliberately suspended. This supersedes
the normal XYZ/bridge-Y preservation conditions in historical implementation
entries below. Preserve all XZ geography, routes, prop placement and local
Blender geometry; runtime Y now belongs to the corrected shared map.
The current Contact continuation freezes all six resulting XYZ buffers, 196
props, 21 stations and bridge/arrival/transfer endpoints; it does not reshape
islands. The user's later authorization permits future reshaping where needed,
provided terrain, map, hulls, bridges and supported routes evolve together with
fresh collision/navigation/visual checks. This scoped freeze is not a permanent ban.

Original tropical cartoon 3D, with credible warm daylight/material response:
grey-brown irregular cliff volumes, timber, terracotta, turquoise/deeper-blue sea,
edge vegetation and restrained violet/amber identity details. Architecture—not
colour swapping—distinguishes places. Keep pedestrian paths legible and give each
area one dominant silhouette. No cloned Crash character/assets, cyberpunk garage,
permanent nighttime dance club or repeated magical crystals.

The character remains a stylized human in violet with an amber backpack. The
floating lab is the principal impossible element; the rest reads as an inhabited
developer-inventor's world. Concept-level microdetail and lighting fidelity are
not satisfied merely by adding more primitive geometry.

## Content and interaction contract

| Place | Presentation | Factual boundary |
| --- | --- | --- |
| Welcome | Immediate identity, role/location, Projects invitation | No movement needed to understand the profile |
| About | Notebook, real portrait, complete first-page summary | Companies/dates/qualifications are detailed elsewhere |
| Projects | Physical prototypes plus indexed HTML cases | Five real projects; problem/contribution/solution/output/stack |
| Skills | Modular laboratory plus capability/tool/example documents | Five actual groups; no arbitrary ratings |
| Experience | Spatial/selectable timeline, newest first | Two real roles, not personal projects relabelled as jobs |
| Education | Consultable archive with status filtering | Three records; master's remains in progress |
| Tesla | Car and explicitly demonstrative wrap samples | 2021 pre-refresh Model 3 only; actual configuration/modifications need evidence |
| Dance | Athlete and Teacher presentations | No invented results, media, venues, qualifications or lesson offers |
| Contact | Radio/desk plus direct email/CV/social/AI actions | Mailto is not a successful website form submission |

Object interaction opens HTML without waiting for the camera. Long text remains
readable/selectable rather than embedded in 3D textures. Every document is also
available in independent reading; selected cases may be opened directly from
skills. Guided transfers are short, skippable and instant under reduced motion.
Eight optional visits mean entering places, not reading all their contents.

The wrap workbench is a temporary visual experiment: reopening it resets the
sample and car colour. It does not store or claim a real vehicle configuration.
The dance floor is left without a fabricated pair animation while authentic
media/movement data are absent.

## Implementation status

**Current Contact revision 2, experimental aggregate mounted:** a new seventeenth
4K Higgsfield sheet guides an original cream-limestone lighthouse with octagonal
amber lantern, curved terracotta radio-hut roof, crafted radio desk and attached
ivy/hibiscus. Native authoring is separate from automatic image-to-3D. The new
twelfth static catalog ID brings thirteen masters and seven building owners
plus explorer: eight async owners. The actual aggregate is 7,392,264 bytes,
45 meshes and 115,524 triangles; its 8,843,728-byte master remains review-only.
Both retain 25 portable PBR materials and 8 embedded 512px images. Native
UV-degenerate/zero-area/normal-opposition counts are0; actual GLBs have0 area/
opposition candidates and finite UVs, without separate UV determinant measurement.
Actual binary/aggregation parity passes without increasing
runtime guards. Final lint/build, fresh scoped CPU gates and independent
final3059 desktop/emulated-mobile browser smoke pass, not inherited from older
results. Eight ready owners, one canvas, day/night, Contact HTML, reader/chat
pause/focus, touch end/cancel and isolated404 fallback/reload recovery are checked.
Artistic/whole-HUD, physical-device/FPS, complete-transfer/live-reduced-motion
and deployment approval remain open; portrait hints/foliage still occlude parts
of the hut/avatar, and first-load latency is not measured.
Current CPU evidence includes Rapier 160,583, Contact 130,252
with 60,958 actual hard-body vertices, camera 222,228 and overview 2,290 with zero
clipping; exact scope and remaining limits belong in design-qa.md.
The tower's foot-origin root (17,.26,69) differs from its only 6.6×4.6×.24 m hut
floor at (11.8,.26,71.7), the seventh structural deck on the same six territories.
Eighteen building hulls include four local toes, not additions to the existing
71 clipped Studio/Archive/Dance foundation boxes. The Welcome-to-Dance ground
approach now bends north of the hut through (15,64) → (23,65) → unchanged shore,
in both directions. No terrain XYZ, seeded prop, station or bridge/arrival/
transfer endpoint is moved. The former back-wall chord is a collision negative,
not a second player route. Current results belong in design-qa.md, not in
historical passing counts below; no reconstruction, deploy or art approval is claimed.

**Preceding Dance R4/support batch, 3 October:** a sixth independent building
aggregate supplies an open timber pergola, furnished parquet, cloth and attached
greenery, from a new Higgsfield4K reference and editable Blender master.
Actual153,778 triangles/28 aggregate meshes with8embedded textures; shared
22×16m deck/28hulls and71 total real render/Rapier footings. Seven async owners
include the separate explorer. Lower normal slopes/Harbor apron and the local
Dance approach are corrected without moving XZ geography or reseeding props.
Fresh lint/build, structural, physics, projection and scoped desktop/emulated-
mobile browser evidence belong in design-qa.md and manifest-v7. Sparse density,
wood render finish, other missing models and final artistic acceptance remain
open: this is not a faithful reconstruction of all supplied images.

**Historical walking composition/foliage finish, 2 October:** the lower normal terrain remains
unchanged while a pure walking-shot contract restores a visible horizon and
foreground human scale. Lighthouse/observatory/laboratory have individual
headroom. Real closed pinnate palm leaflets and continuous bark retain the
original trunk collision, seeded placement and crown guards. Dance alone gets
a physically finished parquet floor and two owned warm lantern lights. No new
bitmap, Blender binary, automatic reconstruction or reference-identity claim;
roof occlusion, built-browser validation and remaining fidelity limits are
reported independently in design-qa.md.

**Current natural-elevation correction:** five normal territories now have real
low terrain shoulders and sandy water-contact toes. Normal Y, structural world
placement and bridge/dock heights intentionally change; all planar geography,
indices, stations, prop placements and asset-local geometry remain. Shared
bridge approach ramps are real terrain and protect structural floor aprons;
they keep the existing controller rather than bypassing a steep slope with
teleport or invisible colliders. Skills' full top stays unchanged. The entries
below describe earlier asset/coast revisions; their unchanged normal-Y claims
are historical. Current gates/browser evidence belong to design-qa.md.

**1 October Welcome Harbor continuation:** the existing fifteen bitmap sheets
are reused, including the original welcome-office multiview and the user's
welcome reference; no new drawing replaces actual mesh authoring. Ten static
catalog assets plus the separate explorer make eleven editable Blender masters.
Five independent building integrations now exist (studio-v2, workshop, archive,
laboratory and harbor), with explorer as the sixth separately owned runtime
asset. Welcome Harbor's contact-only revision-3 master and matching aggregate
pass structural and exact PBR/image/source-hash, triangle/bounds parity checks,
retaining the approved map/hull contract. The aggregate is 3,070,900 bytes,
37 meshes, 85,940 triangles and 60,715 vertices, with 21 materials, 15 texture
bindings, eight images and zero collapsed triangles removed. The master is
3,401,416 bytes. Final build/browser and visual review remain pending; older
browser evidence is not final harbor acceptance.

The harbor is a compact nautical kiosk on a 6.2×4.2×.24 m floor at
world(-13,12.06,70), opening +X toward the existing main-land plaza. Its eleven
shared hulls and authoring coordinates are defined in
[harbor-contract-v1.json](../../../assets/archipelago/harbor-contract-v1.json).
The timber/terracotta shelter, counter, cartographic desk, compass mast and small
furniture are original scenery, not a new factual station. The floor is
6.88–12.96 cm above untouched terrain; there is no Welcome clearing or a new
spawn slab. The mast stands on original terrain outside the high roof. Old huge
Welcome boards/annex and the remote map table are removed. Preserve all 196
existing prop ids/positions/scales/yaws, six entire top/index buffers, 576
Float32 shoreline vertices, four bridge profiles, spawn(0,12,65), 21 hotspot
anchors, walking corridors and guided endpoints. CONTACT_DOCK and both boarding
ramps remain separately owned, unchanged and outside the imported harbor GLB.

The harbor source/map/fallback contract passes 10,867 actual-module Rapier checks:
2,709 unchanged-terrain samples, 43 real free-floor supports, eleven positive
solid contacts and eleven removed-hull negatives. Removed-floor, seeded-placement
and terrain-clearing fixtures detect meaningful regressions. Entry and map
approach are walked both ways without jumping, using an outside bend around the
table. A separate actual portable GLB audit checks 10,886 hard-body vertices
against the eleven conservative hulls, with maximum Float32 outside distance
9.54e-8 m and barrel minimum local Y=0. The fresh CPU overview gate passes 2,092
assertions: 2,011,354 ready-scene and 1,551,328 fallback geometry samples per
viewport, zero safe-rectangle clips. This is geometry/navigation/projection
evidence, not final browser readiness, cinematic fidelity, GPU performance or a
real-device test. Revision-3 artifact hashes belong in the separate
[manifest-v6.json](../../../assets/archipelago/manifest-v6.json), and fresh local
review belongs in design-qa; previous manifests do not certify this continuation.

**1 October preceding Higgsfield continuation:** fifteen image sheets, eight static catalog
masters and three independently mounted building aggregates (studio-v2,
workshop and archive). The archive has an open library, three physical stations
and a slit dome/telescope, with a shared 18×14m deck and22 conservative hulls.
New source-checked curved cliff masses preserve six exact terrain tops and576
rim vertices; closed-volume tropical foliage and decorative distant islands
remain separate from physical navigation. Explorer multiview is now generated
with Higgsfield MCP; rigid five-pivot original Blender geometry is independently
loaded as a local prototype (49,466 triangles). Walking/jump/landing, inspection
fade/restoration, held-fetch and isolated failure have been browser checked.
It is not a skeletal rig, terrain-aware IK or authored clip set. Inhabited ground
uses shared footprint/entrance masks without changing navigation. These are authored geometry, not automatic multiview
reconstruction or reference-image identity. The overview is still too clean,
sparse and plateau-like. Manifest-v4 and current design-qa own fresh evidence.

**1 October historical continuation:** one additional cliff image revision brings the
image-first workflow to 13 sheets (12 initial subjects plus the refinement).
Five editable masters now exist: bridge, palm, cliff-v1, cliff-v2 and home-studio.
Their static aggregates preserve material/image bytes; only the studio is mounted
as an unscaled single-building prototype, with shared deck/hulls and load-failure
fallback. Eight other building/place GLBs and final reference fidelity remain
unfinished. The new cliff is still an isolated study, not an island replacement.

**1 October initial asset study:** the requested image-first workflow began with 12 generated
multi-view reference sheets and a separate Blender-to-GLB authoring/review pipeline.
These are not image-identical reconstructions. Some generated views violate the
orthographic intent; actual GLB front/right/top captures are the dimensional
check. Bridge/palm/cliff are the first master studies, not nine completed building
models or replacements already mounted into gameplay. See [asset workflow](../../../assets/archipelago/README.md)
for exact revisions, checks and remaining LOD/collision/coverage work.

**30 September refinement:** physical coastlines now have open-water separation
(minimum 36.83 world units across the sampled polygon pairs). Continuous cliff
shoulders, shared mineral/timber variation, an owned sky/environment, open roof
portions and a sculpted car replace the roughest repeated primitive forms.
Entrance sight corridors prevent tall palms covering initial arrivals. Compact
rope detail and architectural microgeometry are reduced; these are structural
improvements, not measured FPS or reference-quality approval. Current technical
findings remain in [the audit](../../audit-2026-09-30.md).

**Implemented:** nine-place/six-territory configuration; shared terrain and hulls;
distinct original procedural buildings and low exhibit objects; continuous IT
loop; contextual HTML presentations; boat/cannon/parachute state and props;
skip/reduced-motion completion; map/quick links; existing Astro/Cloudflare,
boot, IT/EN, day/night, opt-in audio and persistent chat.

**Partial:** matching the supplied cinematic art quality; production-level car
and character fidelity; detailed LOD/adaptive quality beyond compact mode and
distance detail culling; factual project media and secondary-activity dossiers.
Architecture and transport implementation do not establish visual acceptance
or measured runtime performance.

**Absent:** reference-approved production masters, imported skinned skeletal GLB character,
Unity/WebGPU implementation, authentic dance performance animation, project
screenshots/demos not already supplied, Tesla modification evidence or commercial
service claims. No new backend or fake successful contact submission is added.

## Verification and iteration

Follow the requested sequence: shared map/scale → complete Harbor/Projects/case/
return/reader slice → other areas/transfers → visual refinement → browser and
runtime verification. Continue refining in the existing Astro/Cloudflare runtime.

Content checks for this change passed targeted ESLint and 40 isolated IT/EN SSR
assertions. The SSR harness used real React rendering with stubbed presentation
wrappers/context; it is not a browser or full-runtime acceptance test. The root
lint/build, actual Rapier checks and browser findings are maintained separately
in [design-qa.md](../../../design-qa.md); this document does not predeclare them.

Acceptance requires a visibly dominant IT route, shared asymmetric geography,
distinct meaningful presentations, immediate independent information access,
reliable focus/input/transport/recovery, factual content, and actual explorable
geometry. Final visual approval remains the user's decision. No deployment or
remote changes are implied.
