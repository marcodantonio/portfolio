# Projects island study — 3 October 2026

Status: **native reference-led terrain rejected for artistic/method fidelity;
not integrated into gameplay**.

The agreed order is island images in three directions, a faithful Higgsfield
3D island, and separately placed buildings/vegetation. The first result does
not fulfil that order: independently generated images remain oblique and the
native terrain is an original parametric interpretation, not their reconstruction.

## Image phase retained

Four completed Higgsfield `gpt_image_2_5` jobs at xhigh/requested4k are preserved:

- [Concept](./projects-concept-oblique.png),3840×2160.
- [Front candidate](./projects-front.png),3840×2160.
- [Right candidate](./projects-right.png),3840×2160.
- [Overhead candidate](./projects-top.png),2880×2880.

Main-agent pixel review rejects them as strict coherent orthographic CAD.
[provenance.json](./provenance.json) retains exact prompts, original-media IDs,
jobs, dimensions, hashes and billing. Balance93.25→65.25 matches four7-credit
quotes; the trial bucket debit is unproven.

[capability-audit.json](./capability-audit.json) is historical evidence of the
then-connected103tools: automatic Meshy is listed in the3D catalog but no
generate_3d execution command was exposed. Image-cost preflight returned
INVALID_ARGUMENT/use generate_3d, with no3D job or cost quote. No undocumented
HTTP or image/video-model proxy was used. A missing execution command remains
a limitation for automatic reconstruction, not for native Blender authoring.

## Later native workflow explicitly requested by the user

The user's clarification requested the same Higgsfield command used for the
lighthouse. A separate native Scene Builder project was therefore created:
`0833ec7b-5fa5-4bcd-94bc-e52b05cd56ae`, settled revision2/sequence0.
The same tool does not imply the same artistic result or automatic conversion.

[build_projects_island_v1.py](./build_projects_island_v1.py) authors a closed
parametric heightfield with a low shore, submerged body and rear hills.
[finish_projects_island_v2.py](./finish_projects_island_v2.py) fixes the initial
export's omitted vertex paint by connecting VertexColor directly to Principled
Base Color; geometry stays unchanged. R1 remains in native revision history.
The actual `.blend` and GLB are stored locally with exact operations/hashes in
[native-manifest-r2.json](./native-manifest-r2.json).

Measured R2:47,820triangles,28,134exported vertices,22meshes,2portable PBR
materials, four embedded PNGs (two512px normal/two1024px metallic-roughness).
Every primitive exports varying finite COLOR_0. AO is not assigned as a glTF
occlusion texture; ORM naming alone does not certify AO. The source retains
two disconnected colour maps, not exported base-colour textures.

Actual bounds64.667×22.864×59.094m differ from the60×56m proposal.
Identity root is sea level in metres, not a walking floor; minimumY−10m and
broad body sections do not prove gameplay support or natural sea appearance.
The32×26m clearing atY+4.8 is an analytic authoring proposal, not current
terrain/map parity. [projects-map-contract.json](./projects-map-contract.json)
separates current world facts from the unimplemented reshaping proposal.

## Review result: failed artistic acceptance

The actual eight-sample480×360 Eevee
[hero](./native-previews-r2/projects-island-r2-hero-small.png) uses a temporary
query-only sea plane, never included in the model. Main and independent review
find a smooth green carpet and stacked-pillar hills, far from the references.
The user explicitly objects that this is not the island agreed on. Further
R3 authoring was interrupted before submission, not silently continued.

The initial960px four-view native query timed out at300seconds with no published
images. The smaller hero succeeded. Complete native front/right/top raster
review is absent. Asset Lab loaded the actual GLB and a browser hero was
captured, but complete axis/aggregate/failure/device review is unfinished.
Neither previews nor structural checks establish fidelity.

## Isolated local artifacts, not world integration

Master2,139,148B and aggregate2,110,536B are available in the review-only
`/asset-lab?asset=projects-terrain` entry. Aggregation retains all triangles,
materials, image bytes and bounds in two meshes; it is not LOD.

Master/aggregate gates pass. The standalone actual terrain checker passes
742,082checks and17negative fixtures for geometry, vertex paint, PBR, embedding,
origin and underwater sections. Fresh lint/build pass:110Astrofiles,0errors,
0warnings, one retained FormEvent hint and the Vite large-chunk warning.
These are not collision, source-manifold, FPS, device or artistic approval.

No gameplay owner mounts this terrain. Renderer/map/physics/water/routes/CSP and
seven building owners remain unchanged by this native study. No push or deploy.
Balance stayed65.25 before/after native authoring; this is an observation, not a
price guarantee or proof of promotional-bucket assignment.

Next: correct the agreed reference fidelity and production method before more
detail or any coordinated runtime terrain/map/bridge/hull integration.
