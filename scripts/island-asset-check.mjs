/** Portable master-asset checks; no browser/GPU or visual-fidelity claim. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Matrix3, Matrix4, Quaternion, Vector3 } from "three";

const assets = [
  ["bridge", "bridge-v1", "BridgeAsset__walking_surface_pivot", 120_000],
  ["palm", "palm-v1", "Palm_V1_Origin_At_Trunk_Base", 150_000],
  ["cliff", "cliff-v1", "Cliff_V1_Origin_At_Coast_Base", 100_000],
  ["cliff-v2", "cliff-v2", "Cliff_V2_Origin_At_Coast_Base", 100_000],
  ["studio", "studio-v1", "HomeStudio_V1_Origin_At_Deck_Centre", 180_000],
  ["studio-v2", "studio-v2", "HomeStudio_V2_Origin_At_Deck_Centre", 180_000],
  ["workshop", "workshop-v1", "DigitalWorkshop_V1_Origin_At_Deck_Centre", 180_000],
  ["archive", "archive-v1", "ArchiveObservatory_V1_Origin_At_Deck_Centre", 180_000],
  ["laboratory", "suspended-lab-v1", "SuspendedLab_V1_Origin_At_Deck_Centre", 180_000],
  ["harbor", "welcome-harbor-v1", "WelcomeHarbor_V1_Origin_At_Deck_Centre", 180_000],
  ["dance", "dance-pavilion-v1", "DancePavilion_V1_Origin_At_Deck_Centre", 180_000],
  ["lighthouse", "contact-lighthouse-v1", "ContactLighthouse_V1_Origin_At_Tower_Base", 180_000],
  ["projects-terrain", "projects-island-v1", "ProjectsIsland_V1_Origin_At_Sea_Level", 100_000],
  ["projects-terrain-v2", "projects-island-v2-r8", "ProjectsIsland_V2_Origin_At_Sea_Level", 180_000],
];
const batch = process.argv.includes("--batched");
const requested = process.argv.slice(2).filter(arg => arg !== "--batched");
assert(requested.every(id => assets.some(a => a[0] === id)), "Only closed-catalog IDs are supported");
const rootDir = new URL("../", import.meta.url);
const types = { 5120: [1, "getInt8"], 5121: [1, "getUint8"], 5122: [2, "getInt16"], 5123: [2, "getUint16"], 5125: [4, "getUint32"], 5126: [4, "getFloat32"] };
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
const reports = [];

for (const [id, file, rootName, profile] of assets) {
  if (requested.length && !requested.includes(id)) continue;
  const path = new URL(`public/models/archipelago/${file}${batch?"-batched":""}.glb`, rootDir);
  const bytes = await readFile(path);
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, `${id}: GLB magic`);
  assert.equal(bytes.readUInt32LE(4), 2, `${id}: GLB version`);
  assert.equal(bytes.readUInt32LE(8), bytes.length, `${id}: GLB length`);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, `${id}: JSON chunk`);
  const jsonSize = bytes.readUInt32LE(12), binHeader = 20 + jsonSize;
  const doc = JSON.parse(bytes.subarray(20, binHeader).toString("utf8"));
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942, `${id}: BIN chunk`);
  const bin = bytes.subarray(binHeader + 8);
  assert.equal(bin.length, bytes.readUInt32LE(binHeader), `${id}: BIN length`);
  assert.equal(doc.buffers.length, 1, `${id}: one embedded buffer`);
  assert(!doc.buffers[0].uri, `${id}: no remote buffer`);
  assert(doc.buffers[0].byteLength <= bin.length, `${id}: declared buffer range`);
  const view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (const b of doc.bufferViews) {
    assert.equal(b.buffer, 0, `${id}: buffer index`);
    assert((b.byteOffset ?? 0) + b.byteLength <= bin.length, `${id}: bufferView range`);
  }
  const decoded = new Map();
  function values(index) {
    if (decoded.has(index)) return decoded.get(index);
    const a = doc.accessors[index], b = doc.bufferViews[a.bufferView];
    assert(!a.sparse, `${id}: sparse accessor requires a dedicated decoder`);
    const width = widths[a.type], format = types[a.componentType];
    assert(width && format, `${id}: supported accessor format`);
    const [size, getter] = format, stride = b.byteStride ?? size * width;
    const start = (b.byteOffset ?? 0) + (a.byteOffset ?? 0);
    assert(stride >= size * width, `${id}: stride`);
    assert(a.count > 0 && Number.isInteger(a.count), `${id}: accessor count`);
    const end = start + (a.count - 1) * stride + width * size;
    assert(end <= (b.byteOffset ?? 0) + b.byteLength, `${id}: accessor range`);
    const out = new Array(a.count * width);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < width; c++) {
      const value = view[getter](start + i * stride + c * size, true);
      assert(Number.isFinite(value), `${id}: finite attribute`); out[i * width + c] = value;
    }
    decoded.set(index, out); return out;
  }
  const materialIndices = new Set(), textureIndices = new Set();
  let triangles = 0, vertices = 0, meshes = 0, nearZeroNormals = 0;
  let nearZeroAreaTriangles = 0, normalOppositionCandidates = 0;
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  const point = new Vector3();
  const aPoint = new Vector3(), bPoint = new Vector3(), cPoint = new Vector3();
  const edgeA = new Vector3(), edgeB = new Vector3(), faceNormal = new Vector3(), averageNormal = new Vector3();
  const reachableRoots = [];
  const activeNodeNames = new Set();
  function localMatrix(node) {
    return node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation ?? [0, 0, 0]),
      new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale ?? [1, 1, 1]),
    );
  }
  function walk(index, parent, active, ancestors = new Set()) {
    assert(!ancestors.has(index), `${id}: acyclic node graph`);
    const node = doc.nodes[index], matrix = parent.clone().multiply(localMatrix(node));
    assert(matrix.elements.every(Number.isFinite), `${id}: finite transform`);
    if (node.name === rootName) { reachableRoots.push(index); active = true; }
    if (active) activeNodeNames.add(node.name);
    if (active && node.mesh !== undefined) {
      for (const p of doc.meshes[node.mesh].primitives) {
        assert.equal(p.mode ?? 4, 4, `${id}: triangle primitives`);
        const positions = values(p.attributes.POSITION), count = positions.length / 3;
        assert.equal(doc.accessors[p.attributes.POSITION].type, "VEC3");
        assert(p.attributes.NORMAL !== undefined, `${id}: normals present`);
        const normals = values(p.attributes.NORMAL);
        assert.equal(normals.length, count * 3);
        // Solid-colour iron/endgrain may legitimately omit UVs. Textured PBR
        // primitives must have them; don't mistake absent unused data for a defect.
        const material = doc.materials[p.material];
        const needsUV = [material?.pbrMetallicRoughness?.baseColorTexture,
          material?.pbrMetallicRoughness?.metallicRoughnessTexture, material?.normalTexture,
          material?.occlusionTexture, material?.emissiveTexture].some(Boolean);
        if (needsUV) assert(p.attributes.TEXCOORD_0 !== undefined, `${id}: textured primitive UV present`);
        if (p.attributes.TEXCOORD_0 !== undefined) assert.equal(values(p.attributes.TEXCOORD_0).length, count * 2);
        for (const a of Object.values(p.attributes)) values(a);
        for (let n = 0; n < normals.length; n += 3) {
          if (Math.hypot(normals[n], normals[n + 1], normals[n + 2]) < .5) nearZeroNormals++;
        }
        const indices = p.indices === undefined ? null : values(p.indices);
        if (indices) for (const i of indices) assert(Number.isInteger(i) && i >= 0 && i < count, `${id}: valid index`);
        const faceVertices = indices?.length ?? count;
        assert.equal(faceVertices % 3, 0, `${id}: complete triangles`);
        const normalMatrix = new Matrix3().getNormalMatrix(matrix);
        for (let i = 0; i < faceVertices; i += 3) {
          const ia = indices?.[i] ?? i, ib = indices?.[i + 1] ?? i + 1, ic = indices?.[i + 2] ?? i + 2;
          aPoint.fromArray(positions, ia * 3).applyMatrix4(matrix);
          bPoint.fromArray(positions, ib * 3).applyMatrix4(matrix);
          cPoint.fromArray(positions, ic * 3).applyMatrix4(matrix);
          faceNormal.crossVectors(edgeA.copy(bPoint).sub(aPoint), edgeB.copy(cPoint).sub(aPoint));
          if (faceNormal.lengthSq() < 1e-20) { nearZeroAreaTriangles++; continue; }
          averageNormal.set(normals[ia * 3] + normals[ib * 3] + normals[ic * 3],
            normals[ia * 3 + 1] + normals[ib * 3 + 1] + normals[ic * 3 + 1],
            normals[ia * 3 + 2] + normals[ib * 3 + 2] + normals[ic * 3 + 2]).applyMatrix3(normalMatrix);
          // A diagnostic, not an automatic flipped-face verdict for smooth caps.
          if (averageNormal.lengthSq() > 1e-12 && faceNormal.normalize().dot(averageNormal.normalize()) < -.05) normalOppositionCandidates++;
        }
        triangles += faceVertices / 3; vertices += count; meshes++;
        for (let i = 0; i < positions.length; i += 3) {
          point.fromArray(positions, i).applyMatrix4(matrix); min.min(point); max.max(point);
        }
        assert(p.material !== undefined, `${id}: material present`);
        materialIndices.add(p.material);
      }
    }
    const next = new Set(ancestors); next.add(index);
    for (const child of node.children ?? []) walk(child, matrix, active, next);
  }
  for (const node of doc.scenes[doc.scene ?? 0].nodes) walk(node, new Matrix4(), false);
  assert.equal(reachableRoots.length, 1, `${id}: exactly one named root`);
  if (id === "harbor") for (const part of ["shell", "roof", "interior", "decor"]) {
    assert(activeNodeNames.has(`Harbor_${part}`), `${id}: semantic ${part} belongs to actual asset root`);
  }
  if (id === "dance") for (const part of ["shell", "roof", "interior", "decor"]) {
    assert(activeNodeNames.has(`Dance_${part}`), `${id}: semantic ${part} belongs to actual asset root`);
  }
  if (id === "lighthouse") for (const part of ["shell", "roof", "interior", "decor"]) {
    assert(activeNodeNames.has(`Lighthouse_${part}`), `${id}: semantic ${part} belongs to actual asset root`);
  }
  for (const index of materialIndices) {
    const m = doc.materials[index];
    assert(m.pbrMetallicRoughness, `${id}: portable PBR`);
    for (const t of [m.pbrMetallicRoughness.baseColorTexture, m.pbrMetallicRoughness.metallicRoughnessTexture,
      m.normalTexture, m.occlusionTexture, m.emissiveTexture]) if (t) textureIndices.add(t.index);
  }
  assert(textureIndices.size > 0, `${id}: real embedded PBR textures`);
  const imageIndices = new Set();
  for (const index of textureIndices) {
    const t = doc.textures[index]; assert(t.source !== undefined, `${id}: standard texture source`);
    imageIndices.add(t.source);
    const image = doc.images[t.source];
    assert(!image.uri && image.bufferView !== undefined, `${id}: embedded image`);
    assert(["image/png", "image/jpeg"].includes(image.mimeType), `${id}: portable image format`);
    const b = doc.bufferViews[image.bufferView], imageStart = b.byteOffset ?? 0;
    if (image.mimeType === "image/png") {
      assert.equal(bin.readUInt32BE(imageStart), 0x89504e47, `${id}: PNG payload`);
      assert(bin.readUInt32BE(imageStart + 16) > 0 && bin.readUInt32BE(imageStart + 20) > 0, `${id}: image dimensions`);
    }
  }
  const size = max.clone().sub(min);
  assert([size.x, size.y, size.z].every(n => Number.isFinite(n) && n > .05), `${id}: physical 3D bounds`);
  assert.equal(nearZeroNormals, 0, `${id}: nonzero vertex normals`);
  if (batch) {
    const source = await readFile(new URL(`public/models/archipelago/${file}.glb`, rootDir));
    const end = 20 + source.readUInt32LE(12), original = JSON.parse(source.subarray(20, end).toString("utf8"));
    const originalBin = source.subarray(end + 8);
    assert.equal(doc.extras.sourceSha256, createHash("sha256").update(source).digest("hex"), `${id}: exact source provenance`);
    for (const key of ["materials", "textures", "samplers"]) assert.deepEqual(doc[key], original[key], `${id}: unchanged ${key}`);
    assert.equal(doc.images.length, original.images.length, `${id}: all images retained`);
    for (let i = 0; i < doc.images.length; i++) {
      const current = doc.bufferViews[doc.images[i].bufferView], previous = original.bufferViews[original.images[i].bufferView];
      assert.equal(doc.images[i].mimeType, original.images[i].mimeType);
      assert.equal(Buffer.compare(bin.subarray(current.byteOffset ?? 0, (current.byteOffset ?? 0) + current.byteLength),
        originalBin.subarray(previous.byteOffset ?? 0, (previous.byteOffset ?? 0) + previous.byteLength)), 0, `${id}: image ${i} byte-identical`);
    }
    assert.equal(doc.extras.notLOD, true); assert.equal(doc.extras.runtimeApproval, false);
    if (["studio", "studio-v2", "workshop", "archive", "laboratory", "harbor", "dance"].includes(id)) {
      const prefix = id === "dance" ? "Dance" : id === "harbor" ? "Harbor" : id === "laboratory" ? "Lab" : id === "archive" ? "Archive" : id === "workshop" ? "Workshop" : "Studio";
      assert.deepEqual([...doc.extras.semanticGroups].sort(), ["decor", "interior", "roof", "shell"]);
      for (const name of doc.extras.semanticGroups) assert(doc.nodes.some(node => node.name === `${prefix}_${name}`), `${id}: semantic ${name} retained`);
    }
    assert.equal(triangles, doc.extras.outputTriangles);
    assert.equal(triangles, doc.extras.inputTriangles - doc.extras.removedNearZeroAreaTriangles);
    assert(meshes <= doc.extras.inputMeshes, `${id}: aggregation cannot add primitives`);
    assert.equal(nearZeroAreaTriangles, 0, `${id}: no collapsed output triangles`);
    const sourceMin = new Vector3(Infinity, Infinity, Infinity), sourceMax = new Vector3(-Infinity, -Infinity, -Infinity);
    const originalView = new DataView(originalBin.buffer, originalBin.byteOffset, originalBin.byteLength);
    function sourceBounds(index, parent, active = false) {
      const node = original.nodes[index], matrix = parent.clone().multiply(localMatrix(node));
      active ||= node.name === rootName;
      if (active && node.mesh !== undefined) for (const primitive of original.meshes[node.mesh].primitives) {
        const accessor = original.accessors[primitive.attributes.POSITION], buffer = original.bufferViews[accessor.bufferView];
        assert.equal(accessor.componentType, 5126); assert.equal(accessor.type, "VEC3");
        const start = (buffer.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = buffer.byteStride ?? 12;
        for (let i = 0; i < accessor.count; i++) {
          point.set(...[0, 4, 8].map(offset => originalView.getFloat32(start + i * stride + offset, true))).applyMatrix4(matrix);
          sourceMin.min(point); sourceMax.max(point);
        }
      }
      for (const child of node.children ?? []) sourceBounds(child, matrix, active);
    }
    for (const node of original.scenes[original.scene ?? 0].nodes) sourceBounds(node, new Matrix4());
    assert(min.distanceTo(sourceMin) < 1e-5 && max.distanceTo(sourceMax) < 1e-5, `${id}: authored bounds retained within Float32 tolerance`);
  }
  reports.push({ asset: id, file: fileURLToPath(path), bytes: bytes.length, triangles, vertices, meshes,
    materials: materialIndices.size, textures: textureIndices.size, embeddedImages: imageIndices.size,
    boundsYUpMetres: size.toArray().map(n => Number(n.toFixed(4))),
    boundsMinYUpMetres: min.toArray().map(n => Number(n.toFixed(4))),
    boundsMaxYUpMetres: max.toArray().map(n => Number(n.toFixed(4))),
    geometryDiagnostics: { nearZeroAreaTriangles, normalOppositionCandidates, interpretation: "Review candidates, not manifold or visual certification" },
    ...(batch ? { aggregationParity: "PASS: source hash, material/texture definitions, image bytes, triangle accounting and bounds" } : {}),
    belowStudyProfile: triangles <= profile && bytes.length <= 8 * 1024 * 1024,
    status: "STRUCTURE PASS only; not visual, LOD, collision or performance acceptance" });
}
console.log(JSON.stringify(reports, null, 2));
