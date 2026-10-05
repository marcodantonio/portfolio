/** Scoped, direct portable-GLB comparison for Projects bare-island R5→R6.
 * No writes, renderer, provider, source-index/manifold/union or contact approval.
 * CLI prints JSON; the parent saves a reviewed receipt separately with apply_patch.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Matrix4, Quaternion, Vector3 } from "three";
import { clipApronTriangle, measureBodyApron } from "./terrain-apron-diagnostic.mjs";

const PREFIX = "ProjectsIsland_V2_";
const ROOT = PREFIX + "Origin_At_Sea_Level";
const BODY = PREFIX + "Continuous_Connected_Coast_And_Bedrock";
const R5_SHA = "93a39ca60a2feb7c21669eb003cc8938c98487f1a986c28eefe125d0e5520ec0";
const PRIMARY = ["Rear_Connected_Low_Saddle", "Western_Broad_Second_Terrace",
  "Cannon_Continuous_Middle_Terrace", "Cannon_Asymmetric_High_Plateau",
  "Western_High_Shoulder_Connected_To_Cannon", "East_Long_Lower_Shoulder",
  "West_Front_Outer_Cleft_Buttress", "West_Front_Inner_Cleft_Buttress",
  "Front_Left_Principal_Finger", "Front_Central_Long_Finger", "Front_East_Short_Finger"];
export const R6_ALLOWED_GEOMETRY_OWNERS = new Set([BODY,
  ...PRIMARY.map(name => PREFIX + name),
  ...Array.from({ length: 9 }, (_, index) => PREFIX + `Attached_Fracture_${index + 14}`),
  PREFIX + "Front_Low_Connecting_Ridge_Ledge"]);
const APPROACHES = [
  { name: "Welcome→Projects prospective arrival", a: [4.6834, 26.3442], b: [0, 15], radius: 2.75, feather: 1.15 },
  { name: "Projects→Experience prospective arrival", a: [29.0315, 1.296], b: [0, 15], radius: 1.75, feather: 1.15 },
];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");

// Raw top-level arrays, independently of JSON.stringify or packed Blender images.
function rawArray(text, key) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      const start = i++;
      while (i < text.length && text[i] !== '"') { if (text[i] === "\\") i++; i++; }
      const value = JSON.parse(text.slice(start, i + 1));
      if (depth !== 1 || value !== key) continue;
      let next = i + 1; while (/\s/.test(text[next] ?? "")) next++;
      if (text[next] !== ":") continue;
      next++; while (/\s/.test(text[next] ?? "")) next++;
      assert.equal(text[next], "[", `${key}: actual top-level array`);
      let level = 0, quoted = false;
      for (let end = next; end < text.length; end++) {
        const c = text[end];
        if (quoted) { if (c === "\\") end++; else if (c === '"') quoted = false; continue; }
        if (c === '"') quoted = true;
        else if (c === "[" || c === "{") level++;
        else if (c === "]" || c === "}") { level--; if (!level) return text.slice(next, end + 1); }
      }
      throw new Error(`${key}: unterminated array`);
    }
    if (text[i] === "{" || text[i] === "[") depth++;
    if (text[i] === "}" || text[i] === "]") depth--;
  }
  // Absent samplers are explicit, not silently equivalent to a populated array.
  return null;
}

export function readProjectsRevision(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "actual GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "actual GLB2");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "actual GLB length");
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "actual JSON chunk");
  const jsonLength = bytes.readUInt32LE(12), binOffset = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binOffset + 4), 0x004e4942, "actual embedded BIN chunk");
  const text = bytes.toString("utf8", 20, binOffset), document = JSON.parse(text);
  const bin = bytes.subarray(binOffset + 8, binOffset + 8 + bytes.readUInt32LE(binOffset));
  assert.equal(document.buffers.length, 1, "one embedded buffer");
  assert(!document.buffers[0].uri && document.buffers[0].byteLength <= bin.length, "no external buffer");
  const component = { 5121: [1, "readUInt8", 255], 5123: [2, "readUInt16LE", 65535],
    5125: [4, "readUInt32LE", 4294967295], 5126: [4, "readFloatLE", 1] };
  const sizes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  function accessor(id) {
    const a = document.accessors[id], v = document.bufferViews[a.bufferView];
    assert(!a.sparse && component[a.componentType] && sizes[a.type], "supported unsparse actual accessor");
    const [size, method, divisor] = component[a.componentType], n = sizes[a.type];
    const stride = v.byteStride ?? size * n, offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    assert(stride >= size * n && (a.byteOffset ?? 0) + (a.count - 1) * stride + size * n <= v.byteLength,
      "actual accessor inside its bufferView");
    assert(offset + (a.count - 1) * stride + size * n <= bin.length, "actual accessor inside BIN");
    const result = new Float64Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let k = 0; k < n; k++) {
      const value = bin[method](offset + i * stride + k * size) / (a.normalized ? divisor : 1);
      assert(Number.isFinite(value), "finite actual accessor"); result[i * n + k] = value;
    }
    return { values: result, size: n, count: a.count };
  }
  const owners = new Map(); let roots = 0, primitiveCount = 0, vertices = 0, triangles = 0;
  function visit(id, parent, active = false, ancestry = new Set()) {
    assert(!ancestry.has(id), "acyclic actual hierarchy");
    const node = document.nodes[id], local = node.matrix ? new Matrix4().fromArray(node.matrix)
      : new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])),
        new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
    const world = parent.clone().multiply(local);
    assert(world.elements.every(Number.isFinite), "finite actual hierarchy matrix");
    if (node.name === ROOT) { roots++; active = true; }
    if (active && node.mesh !== undefined) {
      assert(node.name?.startsWith(PREFIX) && !owners.has(node.name), "unique actual semantic mesh owner");
      const entries = [];
      for (const primitive of document.meshes[node.mesh].primitives) {
        assert.equal(primitive.mode ?? 4, 4, "triangle primitive");
        const source = accessor(primitive.attributes.POSITION), color = accessor(primitive.attributes.COLOR_0);
        assert.equal(source.size, 3, "POSITION vec3");
        assert([3, 4].includes(color.size) && color.count === source.count, "actual per-vertex COLOR_0");
        const points = new Float32Array(source.count * 3), rgb = new Float32Array(source.count * 3);
        const identity = world.elements.every((value, i) => value === (i % 5 === 0 ? 1 : 0));
        for (let i = 0; i < source.count; i++) {
          const original = source.values.subarray(i * 3, i * 3 + 3);
          // Identity arithmetic can turn exported Float32 -0 into +0. Retain
          // those exact corner bits; nonidentity hierarchies still transform.
          points.set(identity ? original : new Vector3(...original).applyMatrix4(world).toArray(), i * 3);
          rgb.set(color.values.subarray(i * color.size, i * color.size + 3), i * 3);
        }
        const ids = primitive.indices === undefined ? Array.from({ length: source.count }, (_, i) => i)
          : Array.from(accessor(primitive.indices).values);
        assert(ids.length % 3 === 0 && ids.every(i => Number.isInteger(i) && i >= 0 && i < source.count), "actual triangle indices");
        entries.push({ points, indices: Uint32Array.from(ids), rgb, material: primitive.material });
        primitiveCount++; vertices += source.count; triangles += ids.length / 3;
      }
      owners.set(node.name, { name: node.name, matrix: world.toArray(), entries });
    }
    const next = new Set(ancestry); next.add(id);
    for (const child of node.children ?? []) visit(child, world, active, next);
  }
  for (const id of document.scenes[document.scene ?? 0].nodes) visit(id, new Matrix4());
  assert.equal(roots, 1, "one reachable actual terrain root; auxiliary preview objects excluded");
  const images = (document.images ?? []).map(image => {
    assert(!image.uri && image.mimeType === "image/png" && image.bufferView !== undefined, "actual embedded portable PNG");
    const view = document.bufferViews[image.bufferView], payload = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    assert.equal(payload.length, view.byteLength, "actual complete PNG view");
    assert(payload.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "actual PNG signature");
    assert.equal(payload.toString("ascii", 12, 16), "IHDR", "actual PNG dimensions");
    return { name: image.name ?? null, bytes: payload.length, sha256: sha(payload), width: payload.readUInt32BE(16), height: payload.readUInt32BE(20) };
  });
  return { path, bytes: bytes.length, sha256: sha(bytes), document, owners, images,
    raw: Object.fromEntries(["materials", "textures", "samplers"].map(key => [key, rawArray(text, key)])),
    statistics: { owners: owners.size, primitives: primitiveCount, exportedVertices: vertices, triangles, ...bounds([...owners.values()]) } };
}

function eachTriangle(owner, fn) {
  for (const entry of owner.entries) for (let i = 0; i < entry.indices.length; i += 3) {
    const ids = entry.indices.subarray(i, i + 3);
    fn(Array.from(ids, id => Array.from(entry.points.subarray(id * 3, id * 3 + 3))), entry, ids);
  }
}
function bounds(owners) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const owner of owners) for (const entry of owner.entries) for (const id of entry.indices) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], entry.points[id * 3 + axis]); max[axis] = Math.max(max[axis], entry.points[id * 3 + axis]);
  }
  return { boundsMinYUpMetres: min, boundsMaxYUpMetres: max };
}
function rowBytes(values) { const bytes = Buffer.alloc(values.length * 4); values.forEach((value, i) => bytes.writeFloatLE(value, i * 4)); return bytes; }
function orientedRecord(rows) {
  const bytes = rows.map(rowBytes), rotations = [0, 1, 2].map(i => Buffer.concat([bytes[i], bytes[(i + 1) % 3], bytes[(i + 2) % 3]]));
  return rotations.sort(Buffer.compare)[0]; // NEVER reverse winding; retain duplicate records.
}
function digestRecords(records) { return { count: records.length, sha256: sha(Buffer.concat(records.sort(Buffer.compare))) }; }
function geometry(owner, selected = () => true, axes = [0, 1, 2]) {
  const records = []; eachTriangle(owner, triangle => { if (selected(triangle)) records.push(orientedRecord(triangle.map(p => axes.map(k => p[k])))); });
  const result = digestRecords(records); return { triangles: result.count, sha256: result.sha256 };
}
function color(owner) {
  const records = [], minimum = [Infinity, Infinity, Infinity], maximum = [-Infinity, -Infinity, -Infinity];
  eachTriangle(owner, (_, entry, ids) => {
    const rows = Array.from(ids, id => Array.from(entry.rgb.subarray(id * 3, id * 3 + 3)));
    for (const row of rows) row.forEach((v, k) => { assert(Number.isFinite(v), "finite indexed RGB"); minimum[k] = Math.min(minimum[k], v); maximum[k] = Math.max(maximum[k], v); });
    records.push(orientedRecord(rows));
  });
  return { ...digestRecords(records), minimum, maximum, varies: maximum.some((v, k) => v - minimum[k] > 1e-6) };
}
function seaRing(owner) {
  const points = new Map(); eachTriangle(owner, triangle => { for (const p of triangle) if (p[1] === 0) { const row = rowBytes(p); points.set(row.toString("hex"), row); } });
  const result = digestRecords([...points.values()]); return { points: result.count, sha256: result.sha256 };
}
const cross2 = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], length = dx * dx + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
function segmentIntersection(a, b, c, d) {
  const e = 1e-9, u = cross2(a, b, c), v = cross2(a, b, d), w = cross2(c, d, a), z = cross2(c, d, b);
  if (((u > e && v < -e) || (u < -e && v > e)) && ((w > e && z < -e) || (w < -e && z > e))) return true;
  return [[u, c, a, b], [v, d, a, b], [w, a, c, d], [z, b, c, d]].some(([area, p, q, r]) => Math.abs(area) <= e && pointSegmentDistance(p, q, r) <= e);
}
function insideTriangle(p, triangle) {
  if (Math.abs(cross2(...triangle)) <= 1e-12) return false;
  const v = triangle.map((a, i) => cross2(a, triangle[(i + 1) % 3], p));
  return v.every(x => x >= -1e-9) || v.every(x => x <= 1e-9);
}
export function triangleInProspectiveCapsule(triangle, approach) {
  const p = triangle.map(v => [v[0], v[2]]), { a, b } = approach;
  if (insideTriangle(a, p) || insideTriangle(b, p)) return true;
  let distance = Infinity;
  for (let i = 0; i < 3; i++) {
    const u = p[i], v = p[(i + 1) % 3];
    if (segmentIntersection(a, b, u, v)) return true;
    distance = Math.min(distance, pointSegmentDistance(a, u, v), pointSegmentDistance(b, u, v), pointSegmentDistance(u, a, b), pointSegmentDistance(v, a, b));
  }
  return distance <= approach.radius + approach.feather + 1e-6;
}
function apronFace(triangle) {
  const [a, b, c] = triangle, up = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
  return up > 1e-12 && Math.max(...triangle.map(p => p[1])) > 0 && clipApronTriangle(triangle).areaXZ > 1e-9;
}
function otherApron(owners) {
  let triangles = 0, area = 0;
  for (const owner of owners) if (owner.name !== BODY) eachTriangle(owner, triangle => {
    const clip = clipApronTriangle(triangle);
    if (clip.areaXZ > 1e-9 && clip.maximumY > 4.80001) { triangles++; area += clip.areaXZ; }
  });
  return { clippedTriangles: triangles, summedProjectedOverlap: area };
}

// Exporter corner order is only a diagnostic correspondence, not source indices.
function displacement(before, after, exact) {
  if (exact) return { available: true, method: "Exact oriented geometry multiset", changedUniqueGeometricPoints: 0, maximumEuclideanDeltaMetres: 0 };
  const oldCorners = [], newCorners = [];
  eachTriangle(before, triangle => oldCorners.push(...triangle)); eachTriangle(after, triangle => newCorners.push(...triangle));
  const forward = new Map(), reverse = new Map();
  if (oldCorners.length !== newCorners.length) return { available: false, reason: "Different expanded-corner counts" };
  for (let i = 0; i < oldCorners.length; i++) {
    const a = rowBytes(oldCorners[i]).toString("hex"), b = rowBytes(newCorners[i]).toString("hex");
    if ((forward.has(a) && forward.get(a).key !== b) || (reverse.has(b) && reverse.get(b) !== a))
      return { available: false, reason: "Exporter corner stream does not establish a bijective geometric-point correspondence; no guessed delta" };
    forward.set(a, { key: b, old: oldCorners[i], next: newCorners[i] }); reverse.set(b, a);
  }
  let changed = 0, maximum = 0; const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const { old, next } of forward.values()) {
    const delta = next.map((v, k) => v - old[k]);
    if (delta.some(v => v !== 0)) changed++;
    maximum = Math.max(maximum, Math.hypot(...delta));
    delta.forEach((v, k) => { min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v); });
  }
  return { available: true, method: "Actual ordered expanded-corner bijection after exact position welding; not source vertex IDs, accessor-byte or general graph-isomorphism proof",
    weldedGeometricPoints: forward.size, changedUniqueGeometricPoints: changed,
    maximumEuclideanDeltaMetres: maximum, signedXYZDeltaRangeMetres: [min, max] };
}

export function compareProjectsRevisions(fromPath, toPath, { fromRevision = 5, toRevision = 6, identityFixture = false } = {}) {
  const before = readProjectsRevision(fromPath), after = readProjectsRevision(toPath);
  assert.equal(before.sha256, R5_SHA, "immutable actual R5 portable baseline");
  assert.equal(R6_ALLOWED_GEOMETRY_OWNERS.size, 22, "explicit allowed geometry owners counted");
  assert.deepEqual([...after.owners.keys()].sort(), [...before.owners.keys()].sort(), "same semantic owners");
  for (const asset of [before, after]) {
    assert.equal(asset.owners.size, 44, "44 actual mesh owners"); assert.equal(asset.statistics.primitives, 44, "44 actual primitives");
    assert.equal(asset.statistics.triangles, 109088, "actual triangle count unchanged"); assert.equal(asset.images.length, 4, "four actual portable PNGs");
    assert.equal(asset.document.materials.length, 2, "two actual portable PBRs");
  }
  const owners = []; let changed = 0, exactOutside = 0, varied = 0, indexedRGBChanged = 0;
  let beforeSubmerged = 0, afterSubmerged = 0;
  for (const [name, a] of before.owners) {
    const b = after.owners.get(name), oldGeometry = geometry(a), newGeometry = geometry(b), exact = oldGeometry.sha256 === newGeometry.sha256;
    assert.equal(oldGeometry.triangles, newGeometry.triangles, `${name}: triangle count`);
    assert.deepEqual(b.matrix, a.matrix, `${name}: full hierarchy transform exact`);
    assert.deepEqual(b.entries.map(e => e.material), a.entries.map(e => e.material), `${name}: actual material binding exact`);
    const oldSubmerged = geometry(a, t => t.every(p => p[1] <= 0)), newSubmerged = geometry(b, t => t.every(p => p[1] <= 0));
    assert.deepEqual(newSubmerged, oldSubmerged, `${name}: complete submerged oriented Float32 triangle multiset exact`);
    beforeSubmerged += oldSubmerged.triangles; afterSubmerged += newSubmerged.triangles;
    const allowed = R6_ALLOWED_GEOMETRY_OWNERS.has(name);
    if (!allowed) { assert(exact, `${name}: forbidden geometry change`); exactOutside++; }
    if (!exact) changed++;
    const oldColor = color(a), newColor = color(b); assert(newColor.varies, `${name}: actual indexed COLOR_0 varies`); varied++;
    if (oldColor.sha256 !== newColor.sha256) indexedRGBChanged++;
    owners.push({ name, geometryChangeAllowed: allowed, geometryExact: exact,
      geometryBefore: oldGeometry, geometryAfter: newGeometry, submergedExact: true, submerged: newSubmerged,
      displacement: displacement(a, b, exact), boundsBefore: bounds([a]), boundsAfter: bounds([b]),
      indexedRGBChanged: oldColor.sha256 !== newColor.sha256, colorAfter: newColor });
  }
  const aBody = before.owners.get(BODY), bBody = after.owners.get(BODY), seaBefore = seaRing(aBody), seaAfter = seaRing(bBody);
  assert.equal(seaBefore.points, 256, "actual baseline sea-ring256"); assert.deepEqual(seaAfter, seaBefore, "all256 actual sea points exact");
  const approaches = APPROACHES.map(approach => {
    const a = geometry(aBody, t => triangleInProspectiveCapsule(t, approach)), b = geometry(bBody, t => triangleInProspectiveCapsule(t, approach));
    assert.deepEqual(b, a, `${approach.name}: complete selected triangles exact`);
    const ownerFaces = []; let totalBefore = 0, totalAfter = 0;
    // R6 authoring protects the full prospective capsule on every selected
    // owner; the other22 owners are exact. Verify that promised invariant,
    // while keeping historical BODY473/803 separate from the all-owner sum.
    for (const [name, oldOwner] of before.owners) {
      const selectedBefore = geometry(oldOwner, t => triangleInProspectiveCapsule(t, approach));
      const selectedAfter = geometry(after.owners.get(name), t => triangleInProspectiveCapsule(t, approach));
      assert.deepEqual(selectedAfter, selectedBefore, `${approach.name}: ${name} complete selected faces exact`);
      totalBefore += selectedBefore.triangles; totalAfter += selectedAfter.triangles;
      if (selectedBefore.triangles || selectedAfter.triangles) ownerFaces.push({ name, before: selectedBefore, after: selectedAfter, exact: true });
    }
    return { ...approach, before: a, after: b, exact: true,
      scope: "BODY historical subset plus independently selected full faces of all44 owners; radius+1.15m feather",
      allOwnerSelectedFaceTotals: { before: totalBefore, after: totalAfter }, ownerFaces };
  });
  const apronBefore = measureBodyApron(aBody.entries), apronAfter = measureBodyApron(bBody.entries);
  for (const apron of [apronBefore, apronAfter]) {
    assert(Math.abs(apron.summedProjectedAreaSquareMetres - 832) < 1e-6 && Math.abs(apron.summedPlanarAreaSquareMetres - 832) < 1e-6,
      "actual full832m² planar-apron sum"); assert(apron.summedInclinedAreaSquareMetres < 1e-6, "no inclined clipped apron area");
    assert(Math.abs(apron.minimumY - 4.8) <= 1e-5 && Math.abs(apron.maximumY - 4.8) <= 1e-5, "actual full apron height tolerance");
  }
  const apronFacesBefore = geometry(aBody, apronFace), apronFacesAfter = geometry(bBody, apronFace);
  assert.deepEqual(apronFacesAfter, apronFacesBefore, "whole actual body apron-intersecting upward faces exact");
  const nonBodyApron = otherApron([...after.owners.values()]); assert.equal(nonBodyApron.clippedTriangles, 0, "no other solid invades actual apron above4.8");
  const portable = {};
  for (const field of ["materials", "textures", "samplers"]) {
    assert.deepEqual(after.document[field], before.document[field], `actual ${field} definitions exact`);
    assert.equal(after.raw[field], before.raw[field], `actual raw ${field} JSON array exact`);
    portable[field] = { exact: true, rawSHA256: sha(before.raw[field] ?? "ABSENT") };
  }
  assert.deepEqual(after.images, before.images, "actual four portable PNG payloads/identities/dimensions exact");
  return { schemaVersion: 1, study: "Projects bare-island V2", revision: toRevision, comparedWithRevision: fromRevision,
    auditedOn: new Date().toISOString().slice(0, 10),
    status: identityFixture ? "PASS R5 identity fixture only; R6 not audited" : "PASS scoped actual R5→R6 portable binary comparison; native source topology, art, contacts/union and gameplay require separate evidence",
    files: { [`r${fromRevision}`]: { path: fromPath, bytes: before.bytes, sha256: before.sha256 }, [`r${toRevision}`]: { path: toPath, bytes: after.bytes, sha256: after.sha256 } },
    actualAssetStatistics: { before: before.statistics, after: after.statistics },
    comparativeSummary: { owners: 44, allowedGeometryOwners: 22, exactOutsideAllowedOwners: exactOutside,
      changedWholeGeometryOwners: changed, changedAllowedOwnerNames: owners.filter(o => !o.geometryExact).map(o => o.name),
      variableIndexedRGBOwners: varied, indexedRGBChangedOwners: indexedRGBChanged, totalSubmergedTrianglesBefore: beforeSubmerged, totalSubmergedTrianglesAfter: afterSubmerged },
    method: { inputs: "Direct actual embedded GLB JSON/BIN with complete active subtree Matrix4 transforms; preview objects outside root excluded",
      orientedGeometry: "Float32 little-endian XYZ triangles, canonical cyclic rotations only, sorted full multisets retaining duplicates; never reversed winding",
      allowedOwnerTopology: "Triangle counts are independently checked, not connectivity proof. Native source per-owner index/orientation assertion required separately; no source-index or general graph-isomorphism claim",
      approaches: "Exact2D segment/triangle capsule distance with edge crossings, endpoint containment and radius+1.15m feather; complete selected oriented XYZ faces on all44 owners, BODY historical subset reported separately",
      apron: "Full actual triangle clipping, planar832m² sum and whole selected BODY-face equality; sums are not a union or navigation proof",
      portable: "Actual portable R5 PNG payloads and raw/decoded PBR/texture/sampler arrays; not native packed-file baseline",
      color: "Actual expanded indexed linear RGB-corner multisets and variation; not rendered pixel measurements" },
    owners, body: { seaRingBefore: seaBefore, seaRingAfter: seaAfter, seaRingExact: true, apronFacesBefore, apronFacesAfter },
    prospectiveApproaches: approaches, bodyApron: { before: apronBefore, after: apronAfter }, nonBodyApron,
    portablePBR: portable, actualPortablePNGs: after.images,
    limits: { nativeSourceTopologyAssertionRequired: true, sourceManifoldCertified: false, solidUnionOrContactCertified: false,
      runtimeMounted: false, overUnchangedEightMiBRuntimeGuard: after.bytes > 8 * 1048576, artOrGameplayApproved: false } };
}

export function runComparisonMathFixtures() {
  const a = [[0, 0, 0], [2, 0, 0], [0, 0, 2]], cyclic = [a[1], a[2], a[0]], reversed = [a[0], a[2], a[1]];
  assert(orientedRecord(a).equals(orientedRecord(cyclic)), "cyclic winding equivalent");
  assert(!orientedRecord(a).equals(orientedRecord(reversed)), "reverse winding rejected");
  assert(!rowBytes([0, 0, 0]).equals(rowBytes([-0, 0, 0])), "Float32 signed-zero bits remain explicit");
  assert.notEqual(digestRecords([orientedRecord(a)]).sha256, digestRecords([orientedRecord(a), orientedRecord(a)]).sha256, "duplicate multiplicity retained");
  const capsule = { a: [.4, .4], b: [.6, .4], radius: 0, feather: 0 };
  assert(triangleInProspectiveCapsule(a, capsule), "capsule endpoint containment without vertex inside");
  assert(triangleInProspectiveCapsule(a, { ...capsule, a: [-1, 1], b: [2, 1] }), "capsule crosses face without triangle vertex inside");
  assert(!triangleInProspectiveCapsule(a, { ...capsule, a: [4, 4], b: [5, 5] }), "separate capsule rejected");
  const vertical = [[1, -1, 0], [1, 1, 0], [1, 0, 2]];
  assert(triangleInProspectiveCapsule(vertical, { ...capsule, a: [0, 1], b: [2, 1] }), "vertical projected-degenerate face crossing retained");
  assert(!triangleInProspectiveCapsule(vertical, { ...capsule, a: [0, 4], b: [2, 4] }), "projected-degenerate separate face rejected");
  assert.equal(rawArray('{"extras":{"materials":[0]},"materials":[{"name":"[x]"}]}', "materials"), '[{"name":"[x]"}]', "only actual top-level array extracted");
  return { fixtures: 10, pass: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--self-test")) {
    const math = runComparisonMathFixtures(), path = "assets/archipelago/island-reconstruction-v2/projects-island-v2-r5.glb";
    const report = compareProjectsRevisions(path, path, { toRevision: "5-identity", identityFixture: true });
    console.log(JSON.stringify({ math, status: report.status, summary: report.comparativeSummary, seaRing: report.body.seaRingAfter,
      approaches: report.prospectiveApproaches.map(a => ({ body: a.after, allOwners: a.allOwnerSelectedFaceTotals, touchedOwners: a.ownerFaces.length })), limits: report.limits }, null, 2));
  } else {
    const from = process.argv[2] ?? "assets/archipelago/island-reconstruction-v2/projects-island-v2-r5.glb";
    const to = process.argv[3] ?? "assets/archipelago/island-reconstruction-v2/projects-island-v2-r6.glb";
    console.log(JSON.stringify(compareProjectsRevisions(from, to), null, 2));
  }
}
