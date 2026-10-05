/** Projects V2 R6→R7 material-only contract; actual embedded GLB inputs.
 * No writes/provider/renderer. Raw owned accessor data must remain exact.
 * Only two standard baseColorTexture bindings and two PNGs may be added.
 * node scripts/lib/projects-v2-material-comparison.mjs [R6.glb R7.glb]
 * node scripts/lib/projects-v2-material-comparison.mjs --self-test
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";
import { Matrix4, Quaternion, Vector3 } from "three";

const ROOT = "ProjectsIsland_V2_Origin_At_Sea_Level";
const R6_SHA = "419a93354d886eae4d5457fefa7124300595d66b14bcb896829a8b188a34efee";
const DEFAULT_R6 = "assets/archipelago/island-reconstruction-v2/projects-island-v2-r6.glb";
const DEFAULT_R7 = "assets/archipelago/island-reconstruction-v2/projects-island-v2-r7.glb";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const ordinary = (value, keys, label) => assert(Object.keys(value).every(k => keys.includes(k)), `${label}: unsupported operational field`);
const ref = (id, values, label) => {
  assert(Number.isInteger(id) && id >= 0 && id < (values?.length ?? 0), `${label}: valid reference`);
  return values[id];
};
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

// Decode actual RGB/RGBA PNG samples, without colour-profile conversion. The
// glTF baseColor slot supplies sRGB interpretation; normal/MR remain linear.
function decodePNG(payload) {
  assert(payload.length >= 33 && payload.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "PNG signature");
  assert.equal(payload.readUInt32BE(8), 13, "PNG IHDR length");
  assert.equal(payload.toString("ascii", 12, 16), "IHDR", "PNG first IHDR");
  const width = payload.readUInt32BE(16), height = payload.readUInt32BE(20), type = payload[25];
  assert(width >= 2 && height >= 2 && width <= 4096 && height <= 4096 && payload[24] === 8
    && [2, 6].includes(type) && payload[26] === 0 && payload[27] === 0 && payload[28] === 0, "PNG bounded8-bit noninterlaced RGB/RGBA");
  const idat = []; let cursor = 8, ended = false, ihdr = 0;
  while (cursor < payload.length) {
    assert(cursor + 12 <= payload.length && !ended, "PNG bounded chunk header/no trailing chunks");
    const length = payload.readUInt32BE(cursor), end = cursor + 12 + length;
    assert(end <= payload.length, "PNG bounded chunk payload");
    const kind = payload.toString("ascii", cursor + 4, cursor + 8), data = payload.subarray(cursor + 8, end - 4);
    assert.equal(crc32(payload.subarray(cursor + 4, end - 4)), payload.readUInt32BE(end - 4), "PNG chunk CRC");
    assert(kind === "IHDR" || kind === "IDAT" || kind === "IEND" || kind[0] === kind[0].toLowerCase(), "PNG no unsupported critical chunk");
    if (kind === "IHDR") { ihdr++; assert(cursor === 8 && length === 13, "PNG one leading IHDR"); }
    if (kind === "IDAT") idat.push(data);
    if (kind === "IEND") { assert(length === 0 && end === payload.length, "PNG exact IEND"); ended = true; }
    cursor = end;
  }
  assert(ended && ihdr === 1 && idat.length > 0, "PNG complete image");
  const channels = type === 2 ? 3 : 4, rowSize = width * channels, expected = (rowSize + 1) * height;
  const filtered = inflateSync(Buffer.concat(idat), { maxOutputLength: expected });
  assert.equal(filtered.length, expected, "PNG actual inflated length");
  const pixels = Buffer.alloc(rowSize * height);
  const paeth = (a, b, c) => {
    const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = filtered[y * (rowSize + 1)]; assert(filter <= 4, "PNG supported scanline filter");
    for (let x = 0; x < rowSize; x++) {
      const i = y * rowSize + x, a = x >= channels ? pixels[i - channels] : 0;
      const b = y ? pixels[i - rowSize] : 0, c = y && x >= channels ? pixels[i - rowSize - channels] : 0;
      const prediction = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : paeth(a, b, c);
      pixels[i] = (filtered[y * (rowSize + 1) + x + 1] + prediction) & 255;
    }
  }
  const minimum = [255, 255, 255], maximum = [0, 0, 0], sum = [0, 0, 0], squared = [0, 0, 0];
  let opaque = true;
  for (let i = 0; i < pixels.length; i += channels) {
    for (let c = 0; c < 3; c++) {
      const v = pixels[i + c]; minimum[c] = Math.min(minimum[c], v); maximum[c] = Math.max(maximum[c], v);
      sum[c] += v; squared[c] += v * v;
    }
    if (channels === 4 && pixels[i + 3] !== 255) opaque = false;
  }
  const count = width * height, mean = sum.map(v => v / count), variance = squared.map((v, i) => v / count - mean[i] ** 2);
  return { width, height, bitDepth: 8, channels, pixelSHA256: sha(pixels), minimumRGB: minimum, maximumRGB: maximum,
    meanRGB: mean, varianceRGB: variance, variesRGB: maximum.some((v, i) => v > minimum[i]), opaque };
}

function parseGLB(input, label) {
  const bytes = Buffer.isBuffer(input) ? input : readFileSync(input);
  assert(bytes.length >= 28 && bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2, "Actual GLB2 header");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "Actual exact GLB length");
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "Actual JSON chunk");
  const jsonLength = bytes.readUInt32LE(12), end = 20 + jsonLength;
  assert(jsonLength > 0 && jsonLength % 4 === 0 && end + 8 <= bytes.length, "Actual bounded aligned JSON");
  const doc = JSON.parse(bytes.toString("utf8", 20, end)), bin = bytes.subarray(end + 8);
  assert.equal(bytes.readUInt32LE(end + 4), 0x004e4942, "Actual embedded BIN chunk");
  assert.equal(bytes.readUInt32LE(end), bin.length, "Exactly two GLB chunks");
  assert.equal(doc.asset?.version, "2.0", "Ordinary glTF2");
  assert(doc.buffers?.length === 1 && !doc.buffers[0].uri && doc.buffers[0].byteLength > 0
    && doc.buffers[0].byteLength <= bin.length && bin.length - doc.buffers[0].byteLength <= 3, "One bounded embedded buffer");
  assert(!(doc.skins?.length) && !(doc.animations?.length), "No skin/animation outside material-only contract");
  ordinary(doc.extensions ?? {}, ["KHR_lights_punctual"], "Document extension");
  for (const key of ["extensionsUsed", "extensionsRequired"]) assert((doc[key] ?? []).every(k => k === "KHR_lights_punctual"), "Only excluded preview-light extension");
  for (const view of doc.bufferViews ?? []) {
    ordinary(view, ["buffer", "byteOffset", "byteLength", "byteStride", "target", "name", "extras"], "BufferView");
    assert(view.buffer === 0 && Number.isInteger(view.byteLength) && view.byteLength > 0
      && Number.isInteger(view.byteOffset ?? 0) && (view.byteOffset ?? 0) >= 0
      && (view.byteOffset ?? 0) + view.byteLength <= doc.buffers[0].byteLength, "Bounded bufferView");
  }
  const formats = { 5121: [1, "readUInt8", 255], 5123: [2, "readUInt16LE", 65535],
    5125: [4, "readUInt32LE", 4294967295], 5126: [4, "readFloatLE", 1] };
  const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }, cache = new Map();
  function accessor(id) {
    if (cache.has(id)) return cache.get(id);
    const a = ref(id, doc.accessors, "Accessor"), v = ref(a.bufferView, doc.bufferViews, "Accessor view");
    ordinary(a, ["bufferView", "byteOffset", "componentType", "count", "type", "normalized", "min", "max", "name", "extras"], "Dense accessor");
    const format = formats[a.componentType], width = widths[a.type];
    assert(format && width && Number.isInteger(a.count) && a.count > 0, "Supported nonempty accessor");
    const [size, getter, divisor] = format, packed = size * width, stride = v.byteStride ?? packed, offset = a.byteOffset ?? 0;
    assert(Number.isInteger(stride) && stride >= packed && stride <= 252 && Number.isInteger(offset) && offset >= 0
      && offset % size === 0 && ((v.byteOffset ?? 0) + offset) % size === 0
      && offset + (a.count - 1) * stride + packed <= v.byteLength, "Aligned bounded accessor");
    assert(!a.normalized || ![5125, 5126].includes(a.componentType), "Valid normalization");
    const raw = Buffer.alloc(a.count * packed), values = new Float64Array(a.count * width), start = (v.byteOffset ?? 0) + offset;
    for (let i = 0; i < a.count; i++) {
      bin.copy(raw, i * packed, start + i * stride, start + i * stride + packed);
      for (let k = 0; k < width; k++) {
        const n = bin[getter](start + i * stride + k * size); assert(Number.isFinite(n), "Finite raw accessor");
        values[i * width + k] = n / (a.normalized ? divisor : 1);
      }
    }
    const descriptor = { componentType: a.componentType, type: a.type, count: a.count, normalized: a.normalized ?? false,
      min: a.min ?? null, max: a.max ?? null };
    const result = { descriptor, values, width, rawSHA256: sha(raw) }; cache.set(id, result); return result;
  }
  const owners = new Map(), graph = [], seen = new Set(), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  let roots = 0, vertices = 0, triangles = 0, primitives = 0;
  const point = new Vector3();
  function walk(id, parent, active = false, parentName = null) {
    const node = ref(id, doc.nodes, "Scene node"); assert(!seen.has(id), "Acyclic single-parent scene"); seen.add(id);
    if (active || node.name === ROOT) ordinary(node, ["name", "mesh", "children", "matrix", "translation", "rotation", "scale", "extras"], "Owned node");
    assert(!(node.matrix && (node.translation || node.rotation || node.scale)), "Transform matrix or TRS");
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
    const world = parent.clone().multiply(local);
    assert(local.elements.every(Number.isFinite) && world.elements.every(Number.isFinite) && local.determinant() !== 0, "Finite nonsingular transforms");
    if (node.name === ROOT) { roots++; active = true; }
    if (active) graph.push({ name: node.name, parent: parentName, local: local.toArray(), world: world.toArray(),
      children: (node.children ?? []).map(i => ref(i, doc.nodes, "Child").name).sort(), hasMesh: node.mesh !== undefined });
    if (active && node.mesh !== undefined) {
      assert(node.name?.startsWith("ProjectsIsland_V2_") && !owners.has(node.name), "Unique semantic mesh owner");
      const mesh = ref(node.mesh, doc.meshes, "Owned mesh"), entries = [];
      ordinary(mesh, ["name", "primitives", "extras"], "Owned mesh");
      for (const p of mesh.primitives) {
        ordinary(p, ["attributes", "indices", "material", "mode", "extras"], "Static ordinary primitive");
        assert.equal(p.mode ?? 4, 4, "Triangle primitive");
        const attrs = Object.fromEntries(Object.entries(p.attributes).sort().map(([name, index]) => [name, accessor(index)]));
        for (const name of ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0"]) assert(attrs[name], `${name}: required original attribute`);
        const position = attrs.POSITION, count = position.descriptor.count;
        assert(position.width === 3 && attrs.NORMAL.width === 3 && attrs.TEXCOORD_0.width === 2
          && [3, 4].includes(attrs.COLOR_0.width), "Original attribute vector formats");
        assert(Object.values(attrs).every(a => a.descriptor.count === count), "Per-vertex attribute counts");
        const indices = accessor(p.indices);
        assert(indices.width === 1 && [5121, 5123, 5125].includes(indices.descriptor.componentType)
          && !indices.descriptor.normalized && indices.values.length % 3 === 0
          && indices.values.every(i => i < count), "Valid actual triangle indices");
        const material = ref(p.material, doc.materials, "Primitive material");
        assert(material.name, "Named original PBR material");
        const cmin = [Infinity, Infinity, Infinity], cmax = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < count; i++) {
          point.fromArray(position.values, i * 3).applyMatrix4(world);
          [point.x, point.y, point.z].forEach((v, k) => { min[k] = Math.min(min[k], v); max[k] = Math.max(max[k], v); });
          for (let k = 0; k < 3; k++) {
            const v = attrs.COLOR_0.values[i * attrs.COLOR_0.width + k]; assert(v >= 0 && v <= 1, "Linear COLOR_0 in range");
            cmin[k] = Math.min(cmin[k], v); cmax[k] = Math.max(cmax[k], v);
          }
        }
        assert(cmax.some((v, k) => v - cmin[k] > 1e-6), "Modern actual COLOR_0 varies, not legacy white replacement");
        entries.push({ attributes: Object.fromEntries(Object.entries(attrs).map(([k, a]) => [k, { ...a.descriptor, rawSHA256: a.rawSHA256 }])),
          indices: { ...indices.descriptor, rawSHA256: indices.rawSHA256 }, material: material.name,
          colorMinimumRGB: cmin, colorMaximumRGB: cmax });
        vertices += count; triangles += indices.values.length / 3; primitives++;
      }
      owners.set(node.name, entries);
    }
    for (const child of node.children ?? []) walk(child, world, active, active ? node.name : null);
  }
  for (const id of ref(doc.scene ?? 0, doc.scenes, "Active scene").nodes) walk(id, new Matrix4());
  assert.equal(roots, 1, "One reachable owned root; preview cameras/lights excluded");
  assert.equal(doc.meshes.length, owners.size, "No additional geometry hidden outside owner root");
  const images = (doc.images ?? []).map((image, id) => {
    ordinary(image, ["name", "bufferView", "mimeType", "extras"], "Embedded image");
    assert.equal(image.mimeType, "image/png", "Portable PNG only, no external URI");
    const view = ref(image.bufferView, doc.bufferViews, "Image view"), offset = view.byteOffset ?? 0;
    const payload = bin.subarray(offset, offset + view.byteLength);
    return { id, name: image.name ?? null, bytes: payload.length, sha256: sha(payload), payload };
  });
  return { doc, bin, label, bytes: bytes.length, sha256: sha(bytes), owners, graph: graph.sort((a, b) => a.name.localeCompare(b.name)), images,
    statistics: { owners: owners.size, primitives, vertices, triangles, boundsMinYUpMetres: min, boundsMaxYUpMetres: max } };
}

function sampler(asset, index) {
  const s = index === undefined ? {} : ref(index, asset.doc.samplers, "Sampler");
  ordinary(s, ["magFilter", "minFilter", "wrapS", "wrapT", "name", "extras"], "Sampler");
  assert([9728, 9729].includes(s.magFilter ?? 9729) && [9728, 9729, 9984, 9985, 9986, 9987].includes(s.minFilter ?? 9987)
    && [33071, 33648, 10497].includes(s.wrapS ?? 10497) && [33071, 33648, 10497].includes(s.wrapT ?? 10497), "Ordinary sampler values");
  return { magFilter: s.magFilter ?? 9729, minFilter: s.minFilter ?? 9987, wrapS: s.wrapS ?? 10497, wrapT: s.wrapT ?? 10497 };
}
function textureBinding(asset, info) {
  assert(info && Number.isInteger(info.index), "Required standard texture binding");
  ordinary(info, ["index", "texCoord", "scale", "strength"], "TextureInfo");
  assert.equal(info.texCoord ?? 0, 0, "Standard existing TEXCOORD_0 only");
  const texture = ref(info.index, asset.doc.textures, "Texture");
  ordinary(texture, ["source", "sampler", "name", "extras"], "Texture");
  const image = ref(texture.source, asset.images, "Texture image");
  const semantic = { imageSHA256: image.sha256, sampler: sampler(asset, texture.sampler), texCoord: 0 };
  for (const field of ["scale", "strength"]) if (info[field] !== undefined) { assert(Number.isFinite(info[field]), "Finite texture strength"); semantic[field] = info[field]; }
  return { semantic, textureIndex: info.index, samplerIndex: texture.sampler, image };
}
function pbrWithoutBase(asset, material) {
  const m = structuredClone(material); delete m.extras;
  assert(m.pbrMetallicRoughness && !m.extensions, "Original lit PBR, no added material extension");
  const pbr = m.pbrMetallicRoughness;
  ordinary(pbr, ["baseColorFactor", "baseColorTexture", "metallicFactor", "roughnessFactor", "metallicRoughnessTexture", "extras"], "Standard PBR");
  delete pbr.baseColorTexture; delete pbr.extras;
  pbr.baseColorFactor ??= [1, 1, 1, 1]; pbr.metallicFactor ??= 1; pbr.roughnessFactor ??= 1;
  m.emissiveFactor ??= [0, 0, 0]; m.alphaMode ??= "OPAQUE"; m.alphaCutoff ??= .5; m.doubleSided ??= false;
  m.normalTexture = textureBinding(asset, m.normalTexture).semantic;
  m.normalTexture.scale ??= 1;
  m.pbrMetallicRoughness.metallicRoughnessTexture = textureBinding(asset, m.pbrMetallicRoughness.metallicRoughnessTexture).semantic;
  return m;
}

function compareAssets(before, after, fixture = false) {
  assert.equal(before.sha256, R6_SHA, "Pinned immutable actual R6 GLB baseline");
  assert.deepEqual(after.statistics, before.statistics, "Actual owner/primitive/exported vertex/triangle counts and transformed bounds exact");
  assert.deepEqual([before.statistics.owners, before.statistics.primitives, before.statistics.vertices, before.statistics.triangles],
    [44, 44, 301854, 109088], "Frozen actual R6 exported counts; bounds read from pinned binary, not rounded literals");
  assert.deepEqual(after.graph, before.graph, "Complete owned hierarchy and local/world transforms exact");
  assert.equal(after.doc.accessors.length, before.doc.accessors.length, "No accessor addition outside PNG/texture-only contract");
  assert.deepEqual([...after.owners.keys()].sort(), [...before.owners.keys()].sort(), "Exact semantic owner set");
  const owners = [];
  for (const [name, oldEntries] of before.owners) {
    const entries = after.owners.get(name); assert.equal(entries.length, oldEntries.length, `${name}: primitive count exact`);
    for (let i = 0; i < entries.length; i++) {
      assert.deepEqual(entries[i].attributes, oldEntries[i].attributes, `${name}: raw geometry/normal/UV/COLOR_0 accessor bytes and descriptors exact`);
      assert.deepEqual(entries[i].indices, oldEntries[i].indices, `${name}: raw index accessor bytes and descriptor exact`);
      assert.equal(entries[i].material, oldEntries[i].material, `${name}: original material assignment exact`);
    }
    owners.push({ name, primitives: entries.length, rawAttributesAndIndicesExact: true, entries });
  }
  assert.equal(before.images.length, 4, "Actual original four portable PNGs");
  assert.equal(after.images.length, 6, "Exactly two new portable albedo PNGs");
  assert.equal(new Set(after.images.map(i => i.sha256)).size, 6, "Six distinct actual PNG payloads");
  const originalImages = before.images.map(image => {
    const matches = after.images.filter(i => i.sha256 === image.sha256);
    assert.equal(matches.length, 1, "Original portable normal/MR PNG payload preserved, not replaced");
    assert.equal(matches[0].bytes, image.bytes, "Original PNG complete byte length exact");
    const decoded = decodePNG(matches[0].payload);
    return { name: image.name, bytes: image.bytes, sha256: image.sha256, ...decoded, exact: true };
  });
  assert.equal(before.doc.materials.length, 2, "Original two PBR materials");
  assert.equal(after.doc.materials.length, 2, "No extra material beyond original two");
  assert.equal(new Set(after.doc.materials.map(m => m.name)).size, 2, "Distinct material identities");
  assert.equal(before.doc.textures.length, 4, "Original four normal/MR textures");
  assert.equal(after.doc.textures.length, 6, "Only two new base-colour texture definitions");
  const usedTextures = new Set(), usedImages = new Set(), usedSamplers = new Set(), materialReports = [];
  for (const oldMaterial of before.doc.materials) {
    assert(!oldMaterial.pbrMetallicRoughness.baseColorTexture, "R6 original has no albedo texture");
    const material = after.doc.materials.find(m => m.name === oldMaterial.name);
    assert(material, "Original named PBR retained");
    assert.deepEqual(pbrWithoutBase(after, material), pbrWithoutBase(before, oldMaterial), `${material.name}: original PBR factors/normal/MR/alpha/emission semantics exact`);
    const base = textureBinding(after, material.pbrMetallicRoughness.baseColorTexture);
    assert(!before.images.some(i => i.sha256 === base.image.sha256), "Base colour uses a new image, not existing MR/normal");
    assert(base.semantic.scale === undefined && base.semantic.strength === undefined, "Ordinary baseColorTexture has no strength/scale fields");
    const decoded = decodePNG(base.image.payload);
    assert(decoded.width === 1024 && decoded.height === 1024 && decoded.channels === 4,
      "Explicit R7 tile contract:1024×1024 RGBA8");
    assert(decoded.variesRGB && decoded.varianceRGB.some(v => v > 0), "New albedo has decoded RGB variance, not a constant/white placeholder");
    assert(decoded.opaque, "Material-only finish keeps opaque albedo; no alpha geometry workaround");
    for (const info of [material.normalTexture, material.pbrMetallicRoughness.metallicRoughnessTexture, material.pbrMetallicRoughness.baseColorTexture]) {
      const t = textureBinding(after, info); usedTextures.add(t.textureIndex); usedImages.add(t.image.id);
      if (t.samplerIndex !== undefined) usedSamplers.add(t.samplerIndex);
    }
    materialReports.push({ name: material.name, originalPBRAndNormalMRExact: true, baseColorTexture: { index: base.textureIndex,
      image: base.image.name, bytes: base.image.bytes, sha256: base.image.sha256, ...decoded,
      interpretation: "Standard glTF baseColorTexture sRGB samples multiplied by unchanged linear COLOR_0 and baseColorFactor", sampler: base.semantic.sampler, texCoord: 0 } });
  }
  assert.equal(new Set(materialReports.map(m => m.baseColorTexture.sha256)).size, 2, "Each original PBR uses its own new PNG");
  assert.equal(usedTextures.size, after.doc.textures.length, "No unreferenced/unsupported texture addition");
  assert.equal(usedImages.size, after.images.length, "All six actual images referenced");
  assert.equal(usedSamplers.size, after.doc.samplers?.length ?? 0, "No unused sampler addition");
  return { schemaVersion: 1, study: "Projects bare-island V2", revision: 7, comparedWithRevision: 6,
    status: fixture ? "PASS actual R6 baseline + synthetic material-only R7 fixture; actual R7 not audited" : "PASS actual R6→R7 material-only exported-binary contract; not source/art/runtime approval",
    files: { r6: { path: before.label, bytes: before.bytes, sha256: before.sha256 }, r7: { path: after.label, bytes: after.bytes, sha256: after.sha256 } },
    statistics: after.statistics, contract: { geometryOwnersRawExact: 44, positionNormalUVColorAndIndexDescriptorsAndBytesExact: true,
      ownedHierarchyAndMaterialAssignmentsExact: true, modernVariableCOLOR0Preserved: true, originalPortablePNGsExact: 4,
      originalPBRFactorsNormalMRBindingsExact: 2, onlyTwoBaseColorTexturesAndTwoDistinctOpaqueVariablePNGsAdded: true,
      albedoTileContract: "Two1024×1024 RGBA8 sRGB-baseColor tiles; TEXCOORD_0 only",
      extrasAreNotRenderingProof: true, sourceVertexIndicesOrNativeGraphNotInferredFromGLB: true },
    owners, originalImages, materials: materialReports,
    limits: { nativeSourceGeometryAuditRequiredSeparately: true, artworkOrPixelsReviewed: false, runtimeMounted: false,
      physicsUnionSupportOrPerformanceApproved: false, overUnchangedEightMiBRuntimeGuard: after.bytes > 8 * 1048576 } };
}

export function compareProjectsMaterials(fromPath = DEFAULT_R6, toPath = DEFAULT_R7) {
  return compareAssets(parseGLB(fromPath, fromPath), parseGLB(toPath, toPath));
}

// The fixtures serialize real GLB JSON/BIN in memory and run the same parser/
// comparator. No mutated file or fake actual-R7 acceptance is published.
function pngChunk(kind, data) {
  const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length);
  result.write(kind, 4, "ascii"); data.copy(result, 8);
  result.writeUInt32BE(crc32(result.subarray(4, result.length - 4)), result.length - 4); return result;
}
function fixturePNG(seed, constant = false, filter = 0, width = 16, alpha = 255) {
  const height = width, channels = 4, ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  const pixels = Buffer.alloc(width * height * channels), raw = Buffer.alloc((width * channels + 1) * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    for (let c = 0; c < 3; c++) pixels[i + c] = constant ? 255 : 80 + (seed + x * 7 + y * 11 + c * 17) % 160;
    pixels[i + 3] = alpha;
  }
  const rowSize = width * channels;
  for (let y = 0; y < height; y++) {
    raw[y * (rowSize + 1)] = filter;
    for (let x = 0; x < rowSize; x++) {
      const i = y * rowSize + x, a = x >= channels ? pixels[i - channels] : 0, b = y ? pixels[i - rowSize] : 0;
      const c = y && x >= channels ? pixels[i - rowSize - channels] : 0;
      const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
      const prediction = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b
        : filter === 3 ? Math.floor((a + b) / 2) : da <= db && da <= dc ? a : db <= dc ? b : c;
      raw[y * (rowSize + 1) + x + 1] = (pixels[i] - prediction) & 255;
    }
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk("IHDR", ihdr), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}
function addImage(doc, bin, payload, name) {
  const offset = Math.ceil(bin.length / 4) * 4, view = doc.bufferViews.length;
  doc.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: payload.length });
  doc.images.push({ name, mimeType: "image/png", bufferView: view });
  const next = Buffer.concat([bin, Buffer.alloc(offset - bin.length), payload]); doc.buffers[0].byteLength = next.length; return next;
}
function pack(doc, bin) {
  const text = Buffer.from(JSON.stringify(doc)), json = Buffer.concat([text, Buffer.alloc((4 - text.length % 4) % 4, 32)]);
  const payload = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]), result = Buffer.alloc(28 + json.length + payload.length);
  result.writeUInt32LE(0x46546c67); result.writeUInt32LE(2, 4); result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(json.length, 12); result.writeUInt32LE(0x4e4f534a, 16); json.copy(result, 20);
  result.writeUInt32LE(payload.length, 20 + json.length); result.writeUInt32LE(0x004e4942, 24 + json.length); payload.copy(result, 28 + json.length); return result;
}
export function runMaterialComparisonFixtures(fromPath = DEFAULT_R6) {
  const before = parseGLB(fromPath, fromPath), doc = structuredClone(before.doc); let bin = Buffer.from(before.bin);
  for (let i = 0; i < 2; i++) {
    const source = doc.images.length; bin = addImage(doc, bin, fixturePNG(i * 41, false, 0, 1024), `Synthetic_Albedo_${i}`);
    const index = doc.textures.length; doc.textures.push({ source, sampler: 0 });
    doc.materials[i].pbrMetallicRoughness.baseColorTexture = { index };
  }
  const positive = compareAssets(before, parseGLB(pack(doc, bin), "in-memory synthetic R7"), true), rejected = [];
  const semanticDoc = structuredClone(doc);
  for (const m of semanticDoc.materials) {
    m.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1]; m.pbrMetallicRoughness.roughnessFactor = 1;
    m.alphaMode = "OPAQUE"; m.doubleSided = false; m.emissiveFactor = [0, 0, 0];
    for (const info of [m.normalTexture, m.pbrMetallicRoughness.metallicRoughnessTexture, m.pbrMetallicRoughness.baseColorTexture]) {
      info.index = semanticDoc.textures.length - 1 - info.index; info.texCoord = 0;
    }
  }
  semanticDoc.textures.reverse(); semanticDoc.images.reverse();
  for (const t of semanticDoc.textures) t.source = semanticDoc.images.length - 1 - t.source;
  compareAssets(before, parseGLB(pack(semanticDoc, bin), "in-memory equivalent defaults/reindexed texture fixture"), true);
  const reject = (name, mutate, expected) => {
    const d = structuredClone(doc); let b = Buffer.from(bin); b = mutate(d, b) ?? b;
    assert.throws(() => compareAssets(before, parseGLB(pack(d, b), name), true), expected, name); rejected.push(name);
  };
  const modify = (d, b, attribute) => {
    const id = attribute === "indices" ? d.meshes[0].primitives[0].indices : d.meshes[0].primitives[0].attributes[attribute];
    const a = d.accessors[id], v = d.bufferViews[a.bufferView], offset = (v.byteOffset ?? 0) + (a.byteOffset ?? 0);
    if (a.componentType === 5126) b.writeFloatLE(b.readFloatLE(offset) + .001, offset);
    else b.writeUInt16LE((b.readUInt16LE(offset) + 1) % d.accessors[d.meshes[0].primitives[0].attributes.POSITION].count, offset);
  };
  for (const attribute of ["POSITION", "NORMAL", "TEXCOORD_0", "COLOR_0", "indices"]) reject(`raw-${attribute}-changed`, (d, b) => modify(d, b, attribute), /exact/);
  reject("legacy-white-COLOR_0", (d, b) => {
    const a = d.accessors[d.meshes[0].primitives[0].attributes.COLOR_0], v = d.bufferViews[a.bufferView];
    for (let i = 0; i < a.count * 3; i++) b.writeFloatLE(1, (v.byteOffset ?? 0) + i * 4);
  }, /COLOR_0 varies/);
  reject("PBR-roughness-changed", d => { d.materials[0].pbrMetallicRoughness.roughnessFactor = .2; }, /original PBR/);
  reject("PBR-baseColorFactor-changed", d => { d.materials[0].pbrMetallicRoughness.baseColorFactor = [.8, 1, 1, 1]; }, /original PBR/);
  reject("normal-scale-changed", d => { d.materials[0].normalTexture.scale = 0; }, /original PBR/);
  reject("normal-MR-binding-swapped", d => { d.materials[0].normalTexture.index = 1; }, /original PBR/);
  reject("unexpected-COLOR_1", d => { d.meshes[0].primitives[0].attributes.COLOR_1 = d.meshes[0].primitives[0].attributes.COLOR_0; }, /raw geometry\/normal\/UV\/COLOR_0/);
  reject("baseColorTexture-missing", d => { delete d.materials[0].pbrMetallicRoughness.baseColorTexture; }, /Required standard texture/);
  reject("original-PNG-replaced", (d, b) => { const v = d.bufferViews[d.images[0].bufferView]; b[v.byteOffset + 100] ^= 1; }, /PNG payload preserved/);
  reject("base-uses-normal-map", d => { d.materials[0].pbrMetallicRoughness.baseColorTexture.index = 0; }, /Base colour uses a new image/);
  reject("UV-transform-extension", d => { d.materials[0].pbrMetallicRoughness.baseColorTexture.extensions = { KHR_texture_transform: { scale: [2, 2] } }; }, /unsupported operational field/);
  reject("owned-light-extension", d => { d.nodes[d.nodes.findIndex(n => n.name === ROOT)].extensions = { KHR_lights_punctual: { light: 0 } }; }, /unsupported operational field/);
  reject("external-albedo-URI", d => { d.images[4].uri = "https://invalid.example/texture.png"; }, /unsupported operational field/);
  reject("new-PNG-invalid-CRC", (d, b) => { const v = d.bufferViews[d.images[4].bufferView]; b[v.byteOffset + 44] ^= 1; }, /PNG chunk CRC/);
  const replaceAlbedo = (d, b, payload) => {
    const next = addImage(d, b, payload, "Replacement_Albedo_0"); d.images[4] = d.images.pop(); return next;
  };
  reject("constant-white-new-albedo", (d, b) => replaceAlbedo(d, b, fixturePNG(0, true, 0, 1024)), /decoded RGB variance/);
  reject("transparent-new-albedo", (d, b) => replaceAlbedo(d, b, fixturePNG(0, false, 0, 1024, 127)), /keeps opaque albedo/);
  reject("wrong-albedo-dimensions", (d, b) => replaceAlbedo(d, b, fixturePNG(0)), /1024×1024 RGBA8/);
  for (const filter of [0, 1, 2, 3, 4]) {
    const decoded = decodePNG(fixturePNG(23, false, filter));
    assert.equal(decoded.pixelSHA256, decodePNG(fixturePNG(23)).pixelSHA256, "Unfilter actual PNG samples exact");
  }
  assert.equal(decodePNG(fixturePNG(0, true)).variesRGB, false, "Decoded white placeholder has no RGB variance");
  return { status: positive.status, actualR6SHA256: before.sha256, positiveContract: positive.contract,
    semanticDefaultsAndReindexedTexturePositiveFixture: true,
    negativeFixtures: rejected, pngDecodeFixtures: 6, actualR7Audited: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  assert(args.length <= 2 && (args[0] !== "--self-test" || args.length === 1), "CLI: [R6.glb R7.glb] or --self-test");
  assert(!args.some(a => a.startsWith("--") && a !== "--self-test"), "Unknown CLI option");
  console.log(JSON.stringify(args[0] === "--self-test" ? runMaterialComparisonFixtures() : compareProjectsMaterials(args[0], args[1]), null, 2));
}
