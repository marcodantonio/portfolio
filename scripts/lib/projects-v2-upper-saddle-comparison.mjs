/** Independent portable R7→R8 upper-sculpture contract. Reads actual GLBs only.
 * Exactly two owners may change topology/upper attributes; the other42 are raw
 * accessor-exact. No provider, writes, renderer, source-index/closure, union,
 * contact, artistic, runtime support or performance approval.
 * CLI: node scripts/lib/projects-v2-upper-saddle-comparison.mjs [R7.glb R8.glb]
 * Fixtures: node scripts/lib/projects-v2-upper-saddle-comparison.mjs --self-test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix4, Quaternion, Vector3 } from "three";
import { readProjectsRevision, triangleInProspectiveCapsule } from "./projects-v2-revision-comparison.mjs";
import { clipApronTriangle, measureBodyApron } from "./terrain-apron-diagnostic.mjs";

const PREFIX = "ProjectsIsland_V2_", ROOT = PREFIX + "Origin_At_Sea_Level";
const BODY = PREFIX + "Continuous_Connected_Coast_And_Bedrock";
const LEDGE = PREFIX + "Front_Low_Connecting_Ridge_Ledge", SADDLE = PREFIX + "Rear_Connected_Low_Saddle";
export const R8_UPPER_OWNERS = Object.freeze([LEDGE, SADDLE]);
const R7_SHA = "03dab463ed067bcbce217d93a41a5124f1a0288770e89b83ca582d886f534cd2";
const DIRECTORY = "assets/archipelago/island-reconstruction-v2/";
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
// may change, but useful row bytes, formats and bindings cannot for42 owners.
function readUpperRevision(path) {
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
        attrs.COLOR_0.bytes.subarray(ids[k] * 12, ids[k] * 12 + 12)])));
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
  const result = { geometry: digest(full), submerged: digest(submerged), lowerGeometryUVColor: digest(lower),
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

function compareAssets(before, after, identityFixture = false) {
  assert.equal(before.sha256, R7_SHA, "Pinned actual immutable R7 baseline");
  assert.deepEqual([before.statistics.owners, before.statistics.primitives, before.statistics.exportedVertices, before.statistics.triangles],
    [44, 44, 301854, 109088], "Actual R7 counts");
  assert.deepEqual([...after.owners.keys()].sort(), [...before.owners.keys()].sort(), "Exactly44 original owner names");
  assert.deepEqual(after.graph, before.graph, "Complete owned graph and local/world transforms exact");
  assert.equal(after.statistics.primitives, 44, "One primitive per owner retained");
  assert(after.statistics.triangles <= 180000, "Unchanged180k editable triangle ceiling");
  assert.deepEqual(materialSemantics(after), materialSemantics(before), "Two PBR graphs/bindings/factors/samplers exact");
  const imageProof = a => a.images.map(({ bytes, sha256, width, height }) => ({ bytes, sha256, width, height })).sort((a, b) => a.sha256.localeCompare(b.sha256));
  assert.equal(before.images.length, 6, "Six actual R7 PNGs");
  assert.deepEqual(imageProof(after), imageProof(before), "All six actual embedded PNG payloads/dimensions exact");
  const intrusion = apronIntrusions(after);
  assert.equal(intrusion.triangles, 0, "No nonBODY geometry above reserved apron");
  const changed = [], owners = [], totals = { submerged: 0, approaches: [0, 0] };
  for (const [name] of before.owners) {
    const selected = R8_UPPER_OWNERS.includes(name);
    if (!selected) assert.deepEqual(rawOwner(after, name), rawOwner(before, name), `Frozen raw attributes/indices/bindings exact: ${name}`);
    else assert.deepEqual(after.rawOwners.get(name).map(p => p.material), before.rawOwners.get(name).map(p => p.material), "Selected original PBR ownership exact");
    const old = ownerSignature(before, name), next = ownerSignature(after, name);
    assert.deepEqual(next.submerged, old.submerged, `All wholly-submerged oriented faces exact: ${name}`);
    assert.deepEqual(next.lowerGeometryUVColor, old.lowerGeometryUVColor, `Whole faces touchingY≤.85 geometry/UV/COLOR_0 exact: ${name}`);
    assert.deepEqual(next.approaches, old.approaches, `Complete prospective capsule faces geometry/UV/COLOR_0 exact: ${name}`);
    totals.submerged += next.submerged.triangles;
    next.approaches.forEach((a, k) => { totals.approaches[k] += a.triangles; });
    const differs = old.geometry.sha256 !== next.geometry.sha256 || old.geometry.triangles !== next.geometry.triangles;
    if (differs) { assert(selected, "Only two whitelisted owners change geometry"); changed.push(name); }
    owners.push({ name, selected, rawExact: !selected, geometryChanged: differs,
      before: old, after: next, topologyCorrespondenceClaimed: !selected });
  }
  assert.equal(totals.submerged, 19159, "All44 actual wholly-submerged face count");
  assert.deepEqual(totals.approaches, [1049, 1519], "All44 actual complete prospective capsule counts");
  assert.deepEqual(changed.sort(), identityFixture ? [] : [...R8_UPPER_OWNERS].sort(), "Both whitelisted upper sculptures genuinely change oriented geometry; no identity-as-R8");
  const oldBody = ownerSignature(before, BODY), body = ownerSignature(after, BODY);
  assert.deepEqual(body.sea, oldBody.sea, "Actual sea-ring Float32points exact");
  assert.equal(body.sea.points, 256, "Actual256 sea-ring points");
  assert.deepEqual(body.apron, oldBody.apron, "Whole BODY apron faces exact");
  const apron = measureBodyApron(after.owners.get(BODY).entries);
  assert(Math.abs(apron.summedProjectedAreaSquareMetres - 832) < 1e-6 && Math.abs(apron.summedInclinedAreaSquareMetres) < 1e-8
    && Math.abs(apron.minimumY - 4.8) < 1e-5 && Math.abs(apron.maximumY - 4.8) < 1e-5,
  "Full actual clipped832m² planar apron");
  return { schemaVersion: 1, scope: identityFixture ? "R7identity fixture; not R8 acceptance" : "Actual portable R7→R8 upper-sculpture contract",
    before: { path: before.path, bytes: before.bytes, sha256: before.sha256, ...before.statistics },
    after: { path: after.path, bytes: after.bytes, sha256: after.sha256, ...after.statistics },
    changedOwners: changed, frozenRawOwners: 42, selectedRetopologyCountsNotPinned: true, owners,
    sixOriginalPNGPayloadsExact: true, twoPBRGraphsExact: true,
    pngDecodeScope: "No new decode: byte-exact continuity with independently decoded/pinned R7 PNGs",
    seaRing: body.sea, whollySubmergedOrientedFaces: totals.submerged, wholeBodyApronFaces: body.apron,
    clippedApron: apron, prospectiveCapsules: APPROACHES.map((a, k) => ({ ...a, completeFaces: totals.approaches[k] })),
    nonBodyApronIntrusion: intrusion,
    notProven: ["Selected topology correspondence/source indices", "Source closure/manifold or shell union", "New contacts/contained volumes/adjacent folds",
      "Artist fidelity", "Runtime terrain/physics integration", "GPU rendering/performance"],
    strictFloat32UVNormalGate: "Separate strict portable gate still required; finite attributes are checked here, UV determinant/normal opposition are not certified" };
}

export function compareProjectsUpperSaddle(fromPath = DIRECTORY + "projects-island-v2-r7.glb", toPath = DIRECTORY + "projects-island-v2-r8.glb") {
  return compareAssets(readUpperRevision(fromPath), readUpperRevision(toPath));
}

export function runUpperSaddleFixtures(path = DIRECTORY + "projects-island-v2-r7.glb") {
  const baseline = readUpperRevision(path), positive = compareAssets(baseline, baseline, true), cases = [];
  const reject = (label, mutate, pattern) => {
    const bad = structuredClone(baseline); mutate(bad);
    assert.throws(() => compareAssets(baseline, bad, true), pattern, `Negative fixture: ${label}`); cases.push(label);
  };
  const entry = (a, name) => a.owners.get(name).entries[0];
  const attribute = (a, name, key) => a.rawOwners.get(name)[0].attributes[key];
  const move = (a, name, id, axis, delta) => {
    const e = entry(a, name), n = id * 3 + axis; e.points[n] += delta;
    new DataView(attribute(a, name, "POSITION").bytes.buffer, attribute(a, name, "POSITION").bytes.byteOffset).setFloat32(n * 4, e.points[n], true);
  };
  const find = (a, name, predicate) => {
    const e = entry(a, name);
    for (let i = 0; i < e.indices.length; i += 3) {
      const ids = Array.from(e.indices.subarray(i, i + 3)), t = ids.map(id => Array.from(e.points.subarray(id * 3, id * 3 + 3)));
      if (predicate(t)) return { offset: i, ids };
    }
    throw new Error("Fixture must target a real measured face");
  };
  const byteChange = (a, name, key, row = 0) => { const b = attribute(a, name, key).bytes; b[row * attribute(a, name, key).rowBytes] ^= 1; };
  reject("blocked42 POSITION", a => move(a, BODY, 0, 0, .1), /Frozen raw/);
  reject("blocked42 NORMAL", a => byteChange(a, BODY, "NORMAL"), /Frozen raw/);
  reject("blocked42 UV", a => byteChange(a, BODY, "TEXCOORD_0"), /Frozen raw/);
  reject("blocked42 COLOR_0", a => byteChange(a, BODY, "COLOR_0"), /Frozen raw/);
  reject("blocked42 raw indices", a => { a.rawOwners.get(BODY)[0].indices.bytes[0] ^= 1; }, /Frozen raw/);
  reject("wholly-submerged Saddle face", a => move(a, SADDLE, find(a, SADDLE, t => t.every(p => p[1] < 0)).ids[0], 0, .1), /wholly-submerged/);
  reject("touching085 mixed face including high corner", a => {
    const f = find(a, SADDLE, t => t.some(p => p[1] <= .85) && t.some(p => p[1] > .85));
    move(a, SADDLE, f.ids.find(id => entry(a, SADDLE).points[id * 3 + 1] > .85), 0, .1);
  }, /touchingY/);
  reject("protected lower winding reversal", a => {
    const e = entry(a, SADDLE), f = find(a, SADDLE, t => t.some(p => p[1] <= .85) && t.every(p => p[1] > 0));
    [e.indices[f.offset + 1], e.indices[f.offset + 2]] = [e.indices[f.offset + 2], e.indices[f.offset + 1]];
  }, /touchingY/);
  reject("protected lower UV", a => byteChange(a, SADDLE, "TEXCOORD_0", find(a, SADDLE, t => t.some(p => p[1] <= .85)).ids[0]), /touchingY/);
  reject("protected lower COLOR_0", a => byteChange(a, SADDLE, "COLOR_0", find(a, SADDLE, t => t.some(p => p[1] <= .85)).ids[0]), /touchingY/);
  reject("apron upper intrusion despite no interior vertex", a => {
    const e = entry(a, LEDGE), f = find(a, LEDGE, t => t.every(p => p[1] > 4.8));
    [[-20, 7, 0], [20, 7, 0], [0, 7, 20]].forEach((p, k) => e.points.set(p, f.ids[k] * 3));
  }, /above reserved apron/);
  const blocked = clipApronTriangle([[-20, 7, 0], [20, 7, 0], [0, 7, 20]]);
  assert(blocked.areaXZ > 0 && blocked.maximumY > 4.80001, "Apron clipping rejects crossing face without interior vertices");
  reject("PBR normal strength", a => { a.document.materials[0].normalTexture.scale += .1; }, /PBR graphs/);
  reject("PBR binding replaced", a => { a.document.materials[0].pbrMetallicRoughness.baseColorTexture.index = 0; }, /PBR graphs/);
  reject("PNG payload replacement", a => { a.images[0].sha256 = "0".repeat(64); }, /PBR graphs|PNG payloads/);
  reject("owned hierarchy mutation", a => { a.graph[0].parent = "ForeignOwner"; }, /owned graph/);
  reject("editable triangle ceiling", a => { a.statistics.triangles = 180001; }, /triangle ceiling/);
  assert.throws(() => compareAssets(baseline, baseline), /Both whitelisted/, "Real mode rejects identity-as-R8");
  cases.push("identity cannot pass actual R8 comparison");
  return { status: "PASS actual R7 identity and scoped negative fixtures; not an R8 binary approval", baselineSHA256: baseline.sha256,
    negativeFixtures: cases.length, cases, fullTriangleCrossingApronFixture: true,
    identity: { frozenRawOwners: positive.frozenRawOwners, submerged: positive.whollySubmergedOrientedFaces,
      sea: positive.seaRing.points, apronSquareMetres: positive.clippedApron.summedProjectedAreaSquareMetres,
      prospectiveFaces: positive.prospectiveCapsules.map(a => a.completeFaces),
      selectedLowerWholeFaces: positive.owners.filter(o => o.selected).map(o => ({ name: o.name, faces: o.before.lowerGeometryUVColor.triangles })) } };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  console.log(JSON.stringify(args[0] === "--self-test" ? runUpperSaddleFixtures(args[1]) : compareProjectsUpperSaddle(args[0], args[1]), null, 2));
}
