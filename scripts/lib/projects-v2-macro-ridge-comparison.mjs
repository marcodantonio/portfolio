/** Independent R7→macro rear-ridge portable contract, not the two-owner R8.
 * Actual baseline is pinned. Exactly28 owners remain raw-exact,15 retire,
 * Saddle becomes a capped lower slice and one stable named ridge is added.
 * No writes/provider/renderer/runtime or source-closure/contact/art approval.
 * CLI: node scripts/lib/projects-v2-macro-ridge-comparison.mjs R7.glb macro.glb
 * Fixtures: node scripts/lib/projects-v2-macro-ridge-comparison.mjs --self-test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix4, Quaternion, ShapeUtils, Vector2, Vector3 } from "three";
import { readProjectsRevision, triangleInProspectiveCapsule } from "./projects-v2-revision-comparison.mjs";
import { clipApronTriangle, measureBodyApron } from "./terrain-apron-diagnostic.mjs";

const PREFIX = "ProjectsIsland_V2_", ROOT = PREFIX + "Origin_At_Sea_Level";
const BODY = PREFIX + "Continuous_Connected_Coast_And_Bedrock";
const SADDLE = PREFIX + "Rear_Connected_Low_Saddle", RIDGE = PREFIX + "Integrated_Rear_Ridge";
const R7_SHA = "03dab463ed067bcbce217d93a41a5124f1a0288770e89b83ca582d886f534cd2";
const R7_PATH = "assets/archipelago/island-reconstruction-v2/projects-island-v2-r7.glb";
export const MACRO_REPLACED_OWNERS = Object.freeze([SADDLE,
  ...["Front_Low_Connecting_Ridge_Ledge", "Western_Broad_Second_Terrace", "Cannon_Continuous_Middle_Terrace",
    "Cannon_Asymmetric_High_Plateau", "Western_High_Shoulder_Connected_To_Cannon", "East_Long_Lower_Shoulder"].map(n => PREFIX + n),
  ...Array.from({ length: 9 }, (_, i) => PREFIX + `Attached_Fracture_${i + 14}`)]);
const RETIRED = MACRO_REPLACED_OWNERS.filter(n => n !== SADDLE);
const APPROACHES = [
  { name: "Welcome→Projects prospective arrival", a: [4.6834, 26.3442], b: [0, 15], radius: 2.75, feather: 1.15 },
  { name: "Projects→Experience prospective arrival", a: [29.0315, 1.296], b: [0, 15], radius: 1.75, feather: 1.15 },
];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const ordinary = (value, keys, label) => assert(Object.keys(value).every(k => keys.includes(k)), `${label}: unsupported operational field`);
const reference = (id, values, label) => {
  assert(Number.isInteger(id) && id >= 0 && id < (values?.length ?? 0), `${label}: valid reference`);
  return values[id];
};

// Reuse the actual hierarchy/geometry reader. Supplement only dense raw
// accessors and owned graph semantics it does not expose; BIN offsets/padding
// may change, but useful row bytes, formats and bindings cannot for28 owners.
function readMacroRevision(path) {
  const asset = readProjectsRevision(path), doc = asset.document, file = readFileSync(path);
  assert.equal(sha(file), asset.sha256, "Same actual file during supplemental read");
  assert.equal(doc.asset?.version, "2.0", "Actual ordinary glTF2");
  const end = 20 + file.readUInt32LE(12), bin = file.subarray(end + 8);
  assert.equal(file.readUInt32LE(end), bin.length, "Exactly two GLB chunks");
  assert(!(doc.skins?.length) && !(doc.animations?.length), "Static unskinned study");
  ordinary(doc.extensions ?? {}, ["KHR_lights_punctual"], "Document extensions");
  for (const key of ["extensionsUsed", "extensionsRequired"])
    assert((doc[key] ?? []).every(k => k === "KHR_lights_punctual"), "Only excluded preview-light extension");
  for (const image of doc.images ?? []) ordinary(image, ["name", "bufferView", "mimeType", "extras"], "Embedded PNG image");
  const cache = new Map(), formats = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  function accessor(id) {
    if (cache.has(id)) return cache.get(id);
    const a = reference(id, doc.accessors, "Accessor"), v = reference(a.bufferView, doc.bufferViews, "Accessor view");
    ordinary(a, ["bufferView", "byteOffset", "componentType", "count", "type", "normalized", "min", "max", "name", "extras"], "Dense accessor");
    ordinary(v, ["buffer", "byteOffset", "byteLength", "byteStride", "target", "name", "extras"], "Buffer view");
    const size = formats[a.componentType], width = widths[a.type], packed = size * width;
    const stride = v.byteStride ?? packed, offset = a.byteOffset ?? 0, start = (v.byteOffset ?? 0) + offset;
    assert(size && width && a.count > 0 && Number.isInteger(a.count) && v.buffer === 0
      && Number.isInteger(stride) && stride >= packed && stride <= 252 && Number.isInteger(offset) && offset >= 0
      && start % size === 0 && offset + (a.count - 1) * stride + packed <= v.byteLength
      && (v.byteOffset ?? 0) >= 0 && (v.byteOffset ?? 0) + v.byteLength <= doc.buffers[0].byteLength,
    "Aligned bounded actual dense accessor");
    const bytes = Buffer.alloc(a.count * packed);
    for (let i = 0; i < a.count; i++) bin.copy(bytes, i * packed, start + i * stride, start + i * stride + packed);
    const result = { bytes, width, rowBytes: packed, descriptor: { componentType: a.componentType, type: a.type,
      count: a.count, normalized: a.normalized ?? false, min: a.min ?? null, max: a.max ?? null } };
    cache.set(id, result); return result;
  }
  const rawOwners = new Map(), graph = [], seen = new Set(), meshes = new Set();
  function walk(id, parent, active = false, parentName = null) {
    const node = reference(id, doc.nodes, "Scene node"); assert(!seen.has(id), "Single-parent acyclic scene"); seen.add(id);
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
    assert(!(node.matrix && (node.translation || node.rotation || node.scale)), "Matrix or TRS, not both");
    const world = parent.clone().multiply(local);
    active ||= node.name === ROOT;
    if (active) {
      ordinary(node, ["name", "mesh", "children", "matrix", "translation", "rotation", "scale", "extras"], "Owned node");
      assert(local.elements.every(Number.isFinite) && local.determinant() !== 0, "Finite nonsingular owned transform");
      graph.push({ name: node.name, parent: parentName, local: local.toArray(), world: world.toArray(),
        children: (node.children ?? []).map(i => reference(i, doc.nodes, "Child").name).sort(), hasMesh: node.mesh !== undefined });
    }
    if (active && node.mesh !== undefined) {
      assert(!meshes.has(node.mesh), "One independent mesh per semantic owner"); meshes.add(node.mesh);
      const mesh = reference(node.mesh, doc.meshes, "Owned mesh"); ordinary(mesh, ["name", "primitives", "extras"], "Owned mesh");
      const entries = mesh.primitives.map(p => {
        ordinary(p, ["attributes", "indices", "material", "mode", "extras"], "Static ordinary primitive");
        const attrs = Object.fromEntries(Object.entries(p.attributes).sort().map(([k, i]) => [k, accessor(i)]));
        assert.deepEqual(Object.keys(attrs), ["COLOR_0", "NORMAL", "POSITION", "TEXCOORD_0"], "Exactly original attribute names; no COLOR_1/extra attributes");
        const count = attrs.POSITION.descriptor.count;
        for (const [name, width] of [["POSITION", 3], ["NORMAL", 3], ["TEXCOORD_0", 2], ["COLOR_0", 3]]) {
          const a = attrs[name];
          assert(a.width === width && a.descriptor.componentType === 5126 && !a.descriptor.normalized
            && a.descriptor.count === count, "Original finite Float32 attribute format/count");
          for (let i = 0; i < a.bytes.length; i += 4) assert(Number.isFinite(a.bytes.readFloatLE(i)), "Finite raw Float32 attribute");
        }
        const indices = accessor(p.indices);
        assert(indices.width === 1 && indices.descriptor.componentType !== 5126 && !indices.descriptor.normalized,
          "Unsigned dense indexed triangles");
        return { attributes: attrs, indices, material: reference(p.material, doc.materials, "Material").name };
      });
      rawOwners.set(node.name, entries);
    }
    for (const child of node.children ?? []) walk(child, world, active, active ? node.name : null);
  }
  for (const id of doc.scenes[doc.scene ?? 0].nodes) walk(id, new Matrix4());
  assert.equal(meshes.size, doc.meshes.length, "No extra geometry outside terrain root");
  return { ...asset, rawOwners, graph: graph.sort((a, b) => a.name.localeCompare(b.name)) };
}

function materialSemantics(asset) {
  const doc = asset.document;
  function binding(info) {
    if (!info) return null;
    ordinary(info, ["index", "texCoord", "scale", "strength"], "Texture info");
    assert.equal(info.texCoord ?? 0, 0, "Existing TEXCOORD_0 only");
    const texture = reference(info.index, doc.textures, "Texture"); ordinary(texture, ["source", "sampler", "name", "extras"], "Texture");
    const image = reference(texture.source, asset.images, "Image");
    const s = texture.sampler === undefined ? {} : reference(texture.sampler, doc.samplers, "Sampler");
    ordinary(s, ["magFilter", "minFilter", "wrapS", "wrapT", "name", "extras"], "Sampler");
    return { imageSHA256: image.sha256, texCoord: 0, scale: info.scale ?? 1, strength: info.strength ?? 1,
      sampler: { magFilter: s.magFilter ?? 9729, minFilter: s.minFilter ?? 9987, wrapS: s.wrapS ?? 10497, wrapT: s.wrapT ?? 10497 } };
  }
  assert.equal(doc.textures?.length, 6, "Exactly six portable texture entries");
  assert.equal(doc.samplers?.length, 1, "Unchanged sampler ownership");
  const materials = doc.materials.map(m => {
    ordinary(m, ["name", "extras", "pbrMetallicRoughness", "normalTexture", "occlusionTexture", "emissiveTexture", "emissiveFactor", "alphaMode", "alphaCutoff", "doubleSided"], "Standard PBR material");
    const p = m.pbrMetallicRoughness ?? {};
    ordinary(p, ["baseColorFactor", "baseColorTexture", "metallicFactor", "roughnessFactor", "metallicRoughnessTexture", "extras"], "Standard PBR graph");
    return { name: m.name, baseColorFactor: p.baseColorFactor ?? [1, 1, 1, 1], metallicFactor: p.metallicFactor ?? 1,
      roughnessFactor: p.roughnessFactor ?? 1, emissiveFactor: m.emissiveFactor ?? [0, 0, 0], alphaMode: m.alphaMode ?? "OPAQUE",
      alphaCutoff: m.alphaCutoff ?? .5, doubleSided: m.doubleSided ?? false, baseColor: binding(p.baseColorTexture),
      normal: binding(m.normalTexture), metalRoughness: binding(p.metallicRoughnessTexture),
      occlusion: binding(m.occlusionTexture), emissive: binding(m.emissiveTexture) };
  }).sort((a, b) => a.name.localeCompare(b.name));
  const textures = doc.textures.map((_, index) => binding({ index })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return { materials, textures };
}
function accessorFingerprint(a) { return { ...a.descriptor, rawSHA256: sha(a.bytes) }; }
function rawOwner(asset, name) {
  return asset.rawOwners.get(name).map(p => ({ material: p.material, indices: accessorFingerprint(p.indices),
    attributes: Object.fromEntries(Object.entries(p.attributes).map(([k, a]) => [k, accessorFingerprint(a)])) }));
}
function floatRow(p) { const out = Buffer.alloc(p.length * 4); p.forEach((v, i) => out.writeFloatLE(v, i * 4)); return out; }
function oriented(rows) {
  return [0, 1, 2].map(i => Buffer.concat([rows[i], rows[(i + 1) % 3], rows[(i + 2) % 3]])).sort(Buffer.compare)[0];
}
function digest(records) { return { triangles: records.length, sha256: sha(Buffer.concat(records.sort(Buffer.compare))) }; }
const signatures = new WeakMap();
function ownerSignature(asset, name) {
  const owner = asset.owners.get(name), raw = asset.rawOwners.get(name);
  if (signatures.has(owner)) return signatures.get(owner);
  const full = [], submerged = [], lower = [], apron = [], routes = APPROACHES.map(() => []), sea = new Map();
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]; let vertices = 0;
  owner.entries.forEach((entry, primitive) => {
    vertices += entry.points.length / 3;
    const attrs = raw[primitive].attributes;
    for (let i = 0; i < entry.indices.length; i += 3) {
      const ids = Array.from(entry.indices.subarray(i, i + 3));
      const triangle = ids.map(id => Array.from(entry.points.subarray(id * 3, id * 3 + 3)));
      const rows = triangle.map(floatRow), record = oriented(rows);
      const painted = () => oriented(rows.map((row, k) => Buffer.concat([row,
        attrs.TEXCOORD_0.bytes.subarray(ids[k] * 8, ids[k] * 8 + 8),
        attrs.COLOR_0.bytes.subarray(ids[k] * 12, ids[k] * 12 + 12),
        attrs.NORMAL.bytes.subarray(ids[k] * 12, ids[k] * 12 + 12)])));
      full.push(record);
      if (triangle.every(p => p[1] <= 0)) submerged.push(record);
      if (triangle.some(p => p[1] <= .85)) lower.push(painted());
      APPROACHES.forEach((approach, k) => { if (triangleInProspectiveCapsule(triangle, approach)) routes[k].push(painted()); });
      if (name === BODY) {
        const [a, b, c] = triangle, up = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
        if (up > 1e-12 && Math.max(...triangle.map(p => p[1])) > 0 && clipApronTriangle(triangle).areaXZ > 1e-9) apron.push(record);
        for (const p of triangle) if (p[1] === 0) { const row = floatRow(p); sea.set(row.toString("hex"), row); }
      }
      triangle.forEach(p => p.forEach((v, axis) => { min[axis] = Math.min(min[axis], v); max[axis] = Math.max(max[axis], v); }));
    }
  });
  const result = { geometry: digest(full), submerged: digest(submerged), lowerGeometryUVNormalColor: digest(lower),
    approaches: routes.map(digest), apron: digest(apron), sea: { points: sea.size, sha256: sha(Buffer.concat([...sea.values()].sort(Buffer.compare))) },
    exportedVertices: vertices, boundsMinYUpMetres: min, boundsMaxYUpMetres: max };
  signatures.set(owner, result); return result;
}
function apronIntrusions(asset) {
  let triangles = 0, area = 0;
  for (const [name, owner] of asset.owners) if (name !== BODY) for (const entry of owner.entries)
    for (let i = 0; i < entry.indices.length; i += 3) {
      const triangle = Array.from(entry.indices.subarray(i, i + 3), id => Array.from(entry.points.subarray(id * 3, id * 3 + 3)));
      const clipped = clipApronTriangle(triangle);
      if (clipped.areaXZ > 1e-9 && clipped.maximumY > 4.80001) { triangles++; area += clipped.areaXZ; }
    }
  return { triangles, summedProjectedAreaSquareMetres: area };
}

function nodeGraph(asset, name) { return asset.graph.find(n => n.name === name); }
function inspectBaseline(asset) {
  assert.equal(asset.sha256, R7_SHA, "Pinned actual immutable R7 baseline");
  assert.deepEqual([asset.statistics.owners, asset.statistics.primitives, asset.statistics.exportedVertices, asset.statistics.triangles],
    [44, 44, 301854, 109088], "Actual R7 baseline counts");
  assert(MACRO_REPLACED_OWNERS.every(n => asset.owners.has(n)), "Exactly16 real replaced owner names");
  const frozen = [...asset.owners.keys()].filter(n => !MACRO_REPLACED_OWNERS.includes(n)).sort();
  assert.equal(frozen.length, 28, "Actual28 frozen owners");
  const retirement = RETIRED.map(name => {
    const s = ownerSignature(asset, name);
    assert.equal(s.lowerGeometryUVNormalColor.triangles, 0, "Retired owner has no whole low protected face");
    assert.equal(s.submerged.triangles, 0, "Retired owner has no submerged face");
    assert(s.approaches.every(r => r.triangles === 0), "Retired owner has no prospective approach face");
    assert(s.boundsMinYUpMetres[1] > 1.25, "Retired owner lies entirely above actual cut");
    return { name, ...s };
  });
  const signatures = [...asset.owners.keys()].map(n => ownerSignature(asset, n));
  const submerged = signatures.reduce((n, s) => n + s.submerged.triangles, 0);
  const approaches = APPROACHES.map((_, k) => signatures.reduce((n, s) => n + s.approaches[k].triangles, 0));
  assert.equal(submerged, 19159, "Actual baseline wholly-submerged faces");
  assert.deepEqual(approaches, [1049, 1519], "Actual baseline prospective capsule faces");
  return { frozen, retirement, submerged, approaches };
}
function colorRange(asset, name) {
  const minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  for (const p of asset.rawOwners.get(name)) {
    const bytes = Buffer.from(p.attributes.COLOR_0.bytes);
    for (let i = 0; i < bytes.length; i += 4) {
      const v = bytes.readFloatLE(i), axis = (i / 4) % 3;
      assert(Number.isFinite(v) && v >= 0 && v <= 1, "Finite modern linear COLOR_0 in range");
      minimum[axis] = Math.min(minimum[axis], v); maximum[axis] = Math.max(maximum[axis], v);
    }
  }
  assert(maximum.some((v, k) => v - minimum[k] > 1e-6), "New ridge has variable COLOR_0, not white/constant replacement");
  return { minimum, maximum };
}

function compareMacroAssets(before, after, fixture = false) {
  const baseline = inspectBaseline(before);
  const expected = [...baseline.frozen, SADDLE, RIDGE].sort();
  assert.deepEqual([...after.owners.keys()].sort(), expected, "Exactly30 mesh owners:28frozen+Saddlelower+one stable ridge;15 retired");
  assert.deepEqual([after.statistics.owners, after.statistics.primitives], [30, 30], "Actual30 nonempty meshes/primitives");
  assert(after.statistics.triangles <= 180000, "Unchanged180k editable-study triangle ceiling");
  assert.deepEqual(after.graph.map(n => n.name).sort(), [ROOT, ...expected].sort(), "No unknown owned nodes or retired semantic empties");
  const oldRoot = nodeGraph(before, ROOT), newRoot = nodeGraph(after, ROOT);
  assert.deepEqual(newRoot, { ...oldRoot, children: expected }, "Root transform/parent exact with explicit replacement children");
  for (const name of [...baseline.frozen, SADDLE]) assert.deepEqual(nodeGraph(after, name), nodeGraph(before, name), `Existing local/world transform and parent exact: ${name}`);
  assert.deepEqual(nodeGraph(after, RIDGE), { ...nodeGraph(before, SADDLE), name: RIDGE }, "New stable ridge is an identity sibling, no extra transform or children");
  assert.deepEqual(materialSemantics(after), materialSemantics(before), "Two portable PBR graphs/bindings/factors/samplers exact");
  const pngs = asset => asset.images.map(({ bytes, sha256, width, height }) => ({ bytes, sha256, width, height })).sort((a, b) => a.sha256.localeCompare(b.sha256));
  assert.equal(before.images.length, 6, "Actual six R7 PNGs");
  assert.deepEqual(pngs(after), pngs(before), "All six embedded PNG payloads/dimensions exact");
  const frozen = [];
  for (const name of baseline.frozen) {
    assert.deepEqual(rawOwner(after, name), rawOwner(before, name), `Frozen28 raw geometry/UV/NORMAL/COLOR_0/indices/formats/bindings exact: ${name}`);
    frozen.push({ name, ...ownerSignature(after, name) });
  }
  assert.deepEqual(after.rawOwners.get(SADDLE).map(p => p.material), before.rawOwners.get(SADDLE).map(p => p.material), "Lower Saddle PBR ownership exact");
  assert.deepEqual(after.rawOwners.get(RIDGE).map(p => p.material), [PREFIX + "Limestone"], "New ridge inherits original Limestone PBR");
  const old = ownerSignature(before, SADDLE), lower = ownerSignature(after, SADDLE), ridge = ownerSignature(after, RIDGE);
  assert.deepEqual(lower.submerged, old.submerged, "Original Saddle wholly-submerged oriented faces exact");
  assert.deepEqual(lower.lowerGeometryUVNormalColor, old.lowerGeometryUVNormalColor, "Whole Saddle faces touchingY≤.85 geometry/UV/COLOR_0/NORMAL exact");
  assert.deepEqual(lower.approaches, old.approaches, "Complete original Saddle prospective capsule payloads exact");
  assert(lower.boundsMaxYUpMetres[1] <= Math.fround(1.25), "Capped lower Saddle has no original upper geometry above cut1.25");
  assert(old.geometry.sha256 !== lower.geometry.sha256, "Lower Saddle is genuinely clipped, not an identity clone");
  assert(ridge.geometry.triangles > 0 && [...ridge.boundsMinYUpMetres, ...ridge.boundsMaxYUpMetres].every(Number.isFinite), "Nonempty new ridge finite actual bounds");
  // 1.05 is not representable in Float32. Compare its exact nominal export
  // value, not a centimetre tolerance or a moved datum.
  assert(ridge.boundsMinYUpMetres[1] >= Math.fround(1.05), "New ridge minimumY≥nominal1.05 Float32");
  const pigment = colorRange(after, RIDGE);
  const intrusion = apronIntrusions(after); assert.equal(intrusion.triangles, 0, "No nonBODY geometry above reserved apron");
  const actual = [...after.owners.keys()].map(n => ownerSignature(after, n));
  const submerged = actual.reduce((n, s) => n + s.submerged.triangles, 0);
  const approaches = APPROACHES.map((_, k) => actual.reduce((n, s) => n + s.approaches[k].triangles, 0));
  assert.equal(submerged, baseline.submerged, "All global wholly-submerged face count exact");
  assert.deepEqual(approaches, baseline.approaches, "All global complete prospective capsule counts exact");
  assert(ridge.approaches.every(r => r.triangles === 0), "New ridge introduces no prospective capsule face");
  const nonemptyProof = (asset, pick) => [...asset.owners.keys()].map(name => ({ owner: name, ...pick(ownerSignature(asset, name)) }))
    .filter(r => r.triangles > 0).sort((a, b) => a.owner.localeCompare(b.owner));
  const globalSubmerged = nonemptyProof(after, s => s.submerged);
  assert.deepEqual(globalSubmerged, nonemptyProof(before, s => s.submerged), "All global owner-tagged submerged oriented multisets exact");
  const globalApproaches = APPROACHES.map((_, k) => {
    const proof = nonemptyProof(after, s => s.approaches[k]);
    assert.deepEqual(proof, nonemptyProof(before, s => s.approaches[k]), "All global owner-tagged prospective geometry/UV/COLOR_0/NORMAL exact");
    return sha(JSON.stringify(proof));
  });
  const body = ownerSignature(after, BODY), oldBody = ownerSignature(before, BODY);
  assert.deepEqual(body.sea, oldBody.sea, "Actual BODY sea-ring Float32points exact");
  assert.equal(body.sea.points, 256, "Actual256 sea-ring points");
  assert.deepEqual(body.apron, oldBody.apron, "Whole BODY apron oriented faces exact");
  const apron = measureBodyApron(after.owners.get(BODY).entries);
  assert(Math.abs(apron.summedProjectedAreaSquareMetres - 832) < 1e-6 && Math.abs(apron.summedInclinedAreaSquareMetres) < 1e-8
    && Math.abs(apron.minimumY - 4.8) < 1e-5 && Math.abs(apron.maximumY - 4.8) < 1e-5, "Full actual clipped832m² planar BODY apron");
  return { schemaVersion: 1, scope: fixture ? "Synthetic normalized contract fixture; NOT actual macro export/native/art approval"
    : "Actual portable R7→macro rear-ridge comparison, NOT two-owner R8 or native/art/runtime approval",
  before: { path: before.path, bytes: before.bytes, sha256: before.sha256, ...before.statistics },
  after: { path: after.path, bytes: after.bytes, sha256: after.sha256, ...after.statistics },
  frozen28: frozen, retired15: baseline.retirement.map(s => ({ name: s.name, trianglesBefore: s.geometry.triangles,
    lowProtectedBefore: s.lowerGeometryUVNormalColor.triangles, submergedBefore: s.submerged.triangles, approachesBefore: s.approaches.map(r => r.triangles) })),
  lowerSaddle: { before: old, after: lower, mixedCut125TopologyExactClaimed: false },
  newRidge: { owner: RIDGE, ...ridge, pigment, nominalMinimumY: 1.05, nominalFloat32MinimumY: Math.fround(1.05) },
  whollySubmergedFacesExact: submerged, globalSubmergedOwnerSHA256: sha(JSON.stringify(globalSubmerged)),
  seaRing: body.sea, clippedBodyApron: apron, nonBodyApronIntrusion: intrusion,
  prospectiveCapsules: APPROACHES.map((r, k) => ({ ...r, completeFaces: approaches[k], ownerPayloadSHA256: globalApproaches[k] })), twoPBRGraphsExact: true, sixPNGPayloadsExact: true,
  pngDecodeScope: "Byte-exact continuity with independently decoded/pinned R7 PNGs; no new decode or pixel invention",
  notProven: ["Native source indices, closed volumes or union", "New ridge footing/complete cap closure/contacts/contained volumes",
    "Selected new topology correspondence", "Full UV determinants/normal-opposition: separate strict portable gate required",
    "Artist fidelity", "Runtime map/physics integration,8MiB eligibility, GPU/performance/deploy"] };
}

export function compareProjectsMacroRidge(fromPath = R7_PATH, toPath) {
  assert(typeof toPath === "string" && toPath.length, "Actual macro GLB path required; no placeholder/default guessed revision");
  return compareMacroAssets(readMacroRevision(fromPath), readMacroRevision(toPath));
}

const pointKey = p => floatRow(p).toString("hex");
function paintedCorner(p, normal = [0, 1, 0]) {
  return { p: p.map(Math.fround), uv: [p[0] / 6.4, p[2] / 6.4].map(Math.fround),
    rgb: [.44 + p[0] / 1000, .36 + p[2] / 1000, .27], normal };
}
function packFixtureOwner(name, triangles, matrix) {
  const data = { POSITION: [], NORMAL: [], TEXCOORD_0: [], COLOR_0: [] };
  for (const t of triangles) for (const c of t) {
    data.POSITION.push(...c.p); data.NORMAL.push(...c.normal); data.TEXCOORD_0.push(...c.uv); data.COLOR_0.push(...c.rgb);
  }
  const count = triangles.length * 3, attributes = {};
  for (const [key, values] of Object.entries(data)) {
    const width = key === "TEXCOORD_0" ? 2 : 3;
    attributes[key] = { bytes: floatRow(values), width, rowBytes: width * 4,
      descriptor: { componentType: 5126, type: "VEC" + width, count, normalized: false, min: null, max: null } };
  }
  const indices = Uint32Array.from({ length: count }, (_, i) => i), bytes = Buffer.alloc(count * 4);
  indices.forEach((v, i) => bytes.writeUInt32LE(v, i * 4));
  return { owner: { name, matrix, entries: [{ points: Float32Array.from(data.POSITION), indices,
    rgb: Float32Array.from(data.COLOR_0), material: 0 }] }, raw: [{ attributes,
    indices: { bytes, width: 1, rowBytes: 4, descriptor: { componentType: 5125, type: "SCALAR", count, normalized: false, min: null, max: null } },
    material: PREFIX + "Limestone" }] };
}

// Synthetic comparator fixture, not the native candidate: actual R7 Saddle
// triangles are clipped at1.25 with canonical geometric edge intersections.
// A planar boundary-complete cap and vertical prism over that same real loop
// exercise retirement/lower/upper invariants. No art/footing/contact proof.
function macroFixture(before) {
  const e = before.owners.get(SADDLE).entries[0], attrs = before.rawOwners.get(SADDLE)[0].attributes;
  const lower = [], intersections = new Map();
  function corner(id) {
    const floats = (key, width) => Array.from({ length: width }, (_, k) => attrs[key].bytes.readFloatLE((id * width + k) * 4));
    return { p: Array.from(e.points.subarray(id * 3, id * 3 + 3)), uv: floats("TEXCOORD_0", 2), rgb: floats("COLOR_0", 3), normal: floats("NORMAL", 3) };
  }
  function intersection(a, b) {
    const ka = pointKey(a.p), kb = pointKey(b.p), key = [ka, kb].sort().join("/");
    if (!intersections.has(key)) {
      const [u, v] = ka < kb ? [a.p, b.p] : [b.p, a.p], t = (1.25 - u[1]) / (v[1] - u[1]);
      const p = u.map((n, k) => Math.fround(n + (v[k] - n) * t)); p[1] = 1.25; intersections.set(key, p);
    }
    const t = (1.25 - a.p[1]) / (b.p[1] - a.p[1]);
    const interpolate = key => a[key].map((n, k) => Math.fround(n + (b[key][k] - n) * t));
    return { p: intersections.get(key), uv: interpolate("uv"), rgb: interpolate("rgb"), normal: interpolate("normal") };
  }
  for (let i = 0; i < e.indices.length; i += 3) {
    const tri = Array.from(e.indices.subarray(i, i + 3), corner); let a = tri[2]; const poly = [];
    for (const b of tri) {
      if ((a.p[1] <= 1.25) !== (b.p[1] <= 1.25)) poly.push(intersection(a, b));
      if (b.p[1] <= 1.25) poly.push(b); a = b;
    }
    for (let j = 1; j < poly.length - 1; j++) lower.push([poly[0], poly[j], poly[j + 1]]);
  }
  const edges = new Map(), points = new Map();
  for (const tri of lower) for (let k = 0; k < 3; k++) {
    const a = pointKey(tri[k].p), b = pointKey(tri[(k + 1) % 3].p), key = [a, b].sort().join("/");
    points.set(a, tri[k].p);
    if (!edges.has(key)) edges.set(key, { count: 0, a, b }); edges.get(key).count++;
  }
  const open = [...edges.values()].filter(v => v.count === 1), outgoing = new Map(open.map(v => [v.a, v.b]));
  assert.equal(open.length, 360, "Fixture actual R7 cut has360 boundary edges");
  assert.equal(outgoing.size, 360, "Fixture cut boundary is unbranched");
  const keys = [], start = open[0].a; let key = start;
  do { assert(!keys.includes(key), "Fixture single cutloop"); keys.push(key); key = outgoing.get(key); } while (key !== start);
  assert.equal(keys.length, 360, "Fixture no second cutloop");
  const loop = keys.map(k => points.get(k)); assert(loop.every(p => p[1] === 1.25), "Actual fixture collar plane");
  const cap = ShapeUtils.triangulateShape(loop.map(p => new Vector2(p[0], p[2])), []);
  // Earcut may simplify collinear boundary samples. Reinsert any unused real
  // sample by splitting its containing edge, not by an invalid centre fan.
  const used = new Set(cap.flat());
  for (let id = 0; id < loop.length; id++) if (!used.has(id)) {
    let inserted = false;
    for (let i = 0; i < cap.length && !inserted; i++) for (let j = 0; j < 3 && !inserted; j++) {
      const a = cap[i][j], b = cap[i][(j + 1) % 3], c = cap[i][(j + 2) % 3], u = loop[a], v = loop[b], p = loop[id];
      const dx = v[0] - u[0], dz = v[2] - u[2], t = ((p[0] - u[0]) * dx + (p[2] - u[2]) * dz) / (dx * dx + dz * dz);
      if (t > 0 && t < 1 && Math.hypot(p[0] - u[0] - t * dx, p[2] - u[2] - t * dz) < 1e-7) {
        cap.splice(i, 1, [a, id, c], [id, b, c]); used.add(id); inserted = true;
      }
    }
    assert(inserted, "Fixture cap preserves every original boundary sample");
  }
  const capEdges = new Map(); let area = 0;
  for (const f of cap) {
    const [a, b, c] = f.map(i => loop[i]), crossY = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    assert(Math.abs(crossY) > 1e-12, "Nondegenerate fixture cap");
    if (crossY < 0) [f[1], f[2]] = [f[2], f[1]];
    area += Math.abs(crossY) * .5;
    for (let i = 0; i < 3; i++) { const k = [f[i], f[(i + 1) % 3]].sort((a, b) => a - b).join("/"); capEdges.set(k, (capEdges.get(k) ?? 0) + 1); }
    lower.push(f.map(i => paintedCorner(loop[i])));
  }
  loop.forEach((_, i) => assert.equal(capEdges.get([i, (i + 1) % loop.length].sort((a, b) => a - b).join("/")), 1, "Complete fixture cap boundary edge"));
  const upper = [], bottom = loop.map(p => paintedCorner([p[0], Math.fround(1.05), p[2]], [0, -1, 0]));
  const top = loop.map(p => paintedCorner([p[0], 14, p[2]]));
  for (const [a, b, c] of cap) { upper.push([bottom[a], bottom[c], bottom[b]], [top[a], top[b], top[c]]); }
  for (let i = 0; i < loop.length; i++) { const j = (i + 1) % loop.length; upper.push([bottom[i], bottom[j], top[i]], [bottom[j], top[j], top[i]]); }
  const after = { ...before, owners: new Map(before.owners), rawOwners: new Map(before.rawOwners),
    graph: before.graph.filter(n => !RETIRED.includes(n.name)).map(n => ({ ...n, children: [...n.children] })),
    path: "Synthetic in-memory contract fixture from actual R7 cutloop", bytes: null, sha256: null };
  for (const name of RETIRED) { after.owners.delete(name); after.rawOwners.delete(name); }
  for (const [name, triangles] of [[SADDLE, lower], [RIDGE, upper]]) {
    const packed = packFixtureOwner(name, triangles, before.owners.get(SADDLE).matrix);
    after.owners.set(name, packed.owner); after.rawOwners.set(name, packed.raw);
  }
  after.graph.push({ ...nodeGraph(before, SADDLE), name: RIDGE });
  nodeGraph(after, ROOT).children = [...after.owners.keys()].sort(); after.graph.sort((a, b) => a.name.localeCompare(b.name));
  const signatures = [...after.owners.keys()].map(n => ownerSignature(after, n));
  after.statistics = { owners: after.owners.size, primitives: after.owners.size,
    exportedVertices: signatures.reduce((n, s) => n + s.exportedVertices, 0), triangles: signatures.reduce((n, s) => n + s.geometry.triangles, 0),
    boundsMinYUpMetres: [0, 1, 2].map(k => Math.min(...signatures.map(s => s.boundsMinYUpMetres[k]))),
    boundsMaxYUpMetres: [0, 1, 2].map(k => Math.max(...signatures.map(s => s.boundsMaxYUpMetres[k]))) };
  return { after, loopPoints: loop.length, capTriangles: cap.length, capAreaSquareMetres: area,
    scope: "Normalized in-memory comparator fixture, not encoded GLB parser/native CDT or source closure/art approval" };
}

export function runMacroRidgeFixtures(path = R7_PATH) {
  const baseline = readMacroRevision(path), inspection = inspectBaseline(baseline), synthetic = macroFixture(baseline);
  const positive = compareMacroAssets(baseline, synthetic.after, true), cases = [];
  const reject = (name, mutate, pattern) => {
    const bad = structuredClone(synthetic.after); mutate(bad);
    assert.throws(() => compareMacroAssets(baseline, bad, true), pattern, `Negative fixture: ${name}`); cases.push(name);
  };
  const entry = (a, name) => a.owners.get(name).entries[0];
  const attr = (a, name, key) => a.rawOwners.get(name)[0].attributes[key];
  const byteChange = (a, name, key, id = 0) => { attr(a, name, key).bytes[id * attr(a, name, key).rowBytes] ^= 1; };
  const findFace = (a, name, selected) => {
    const e = entry(a, name);
    for (let i = 0; i < e.indices.length; i += 3) {
      const ids = Array.from(e.indices.subarray(i, i + 3)), t = ids.map(id => Array.from(e.points.subarray(id * 3, id * 3 + 3)));
      if (selected(t)) return { i, ids };
    }
    throw new Error("Fixture must select a real measured face");
  };
  const move = (a, name, id, axis, delta) => {
    const p = entry(a, name).points, k = id * 3 + axis; p[k] += delta;
    const b = attr(a, name, "POSITION").bytes; new DataView(b.buffer, b.byteOffset).setFloat32(k * 4, p[k], true);
  };
  reject("frozen28 POSITION", a => move(a, BODY, 0, 0, .1), /Frozen28 raw/);
  reject("frozen28 NORMAL", a => byteChange(a, BODY, "NORMAL"), /Frozen28 raw/);
  reject("frozen28 indices", a => { a.rawOwners.get(BODY)[0].indices.bytes[0] ^= 1; }, /Frozen28 raw/);
  reject("lower Saddle submerged", a => move(a, SADDLE, findFace(a, SADDLE, t => t.every(p => p[1] < 0)).ids[0], 0, .1), /Saddle wholly-submerged/);
  reject("lower mixed085 high corner", a => {
    const f = findFace(a, SADDLE, t => t.some(p => p[1] <= .85) && t.some(p => p[1] > .85));
    move(a, SADDLE, f.ids.find(id => entry(a, SADDLE).points[id * 3 + 1] > .85), 0, .1);
  }, /touchingY/);
  for (const key of ["TEXCOORD_0", "COLOR_0", "NORMAL"]) reject("lower protected " + key,
    a => byteChange(a, SADDLE, key, findFace(a, SADDLE, t => t.some(p => p[1] <= .85)).ids[0]), /touchingY/);
  reject("lower protected winding", a => {
    const e = entry(a, SADDLE), f = findFace(a, SADDLE, t => t.some(p => p[1] <= .85) && t.every(p => p[1] > 0));
    [e.indices[f.i + 1], e.indices[f.i + 2]] = [e.indices[f.i + 2], e.indices[f.i + 1]];
  }, /touchingY/);
  reject("new ridge below1.05", a => move(a, RIDGE, 0, 1, -.1), /minimumY/);
  reject("new ridge constant COLOR_0", a => {
    const b = attr(a, RIDGE, "COLOR_0").bytes, view = new DataView(b.buffer, b.byteOffset);
    for (let i = 0; i < b.length; i += 4) view.setFloat32(i, 1, true);
  }, /variable COLOR/);
  reject("crossing apron with no interior vertex", a => {
    const e = entry(a, RIDGE); [[-20, 7, 0], [20, 7, 0], [0, 7, 20]].forEach((p, k) => e.points.set(p, e.indices[k] * 3));
  }, /reserved apron/);
  reject("PBR strength", a => { a.document.materials[0].normalTexture.scale += .1; }, /PBR graphs/);
  reject("PNG payload replaced", a => { a.images[0].sha256 = "0".repeat(64); }, /PBR graphs|PNG payloads/);
  reject("retired15 still present", a => { a.owners.set(RETIRED[0], baseline.owners.get(RETIRED[0])); }, /Exactly30 mesh/);
  reject("frozen parent changed", a => { nodeGraph(a, BODY).parent = RIDGE; }, /parent exact/);
  reject("study180k ceiling", a => { a.statistics.triangles = 180001; }, /triangle ceiling/);
  assert.throws(() => compareMacroAssets(baseline, baseline), /Exactly30 mesh/, "Actual mode cannot approve R7identity as macro");
  cases.push("R7identity is not a macro candidate");
  return { status: "PASS frozen actual R7 inspection, synthetic normalized macro contract fixture and negative fixtures; NO actual macro GLB approval",
    baselineSHA256: baseline.sha256, baselineOwners: baseline.owners.size, frozenOwners: inspection.frozen.length, retiredOwners: inspection.retirement.length,
    baselineLowerSaddleWholeProtectedFaces: ownerSignature(baseline, SADDLE).lowerGeometryUVNormalColor.triangles,
    whollySubmerged: positive.whollySubmergedFacesExact, seaRing: positive.seaRing.points,
    apronSquareMetres: positive.clippedBodyApron.summedProjectedAreaSquareMetres,
    prospectiveFaces: positive.prospectiveCapsules.map(r => r.completeFaces),
    synthetic: { ...synthetic, after: positive.after }, negativeFixtures: cases.length, cases };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  console.log(JSON.stringify(args[0] === "--self-test" ? runMacroRidgeFixtures(args[1]) : compareProjectsMacroRidge(args[0], args[1]), null, 2));
}
