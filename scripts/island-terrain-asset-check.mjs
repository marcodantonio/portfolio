/** Actual standalone terrain GLB inspection, never a runtime/art/FPS approval.
 * node scripts/island-terrain-asset-check.mjs [--file PATH] [--root NAME]
 *   [--max-triangles COUNT] [--self-test]
 * Mutations are in-memory negative fixtures; no file/network/provider writes.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import { measureBodyApron } from "./lib/terrain-apron-diagnostic.mjs";

const defaultPath = new URL("../assets/archipelago/island-reconstruction-v1/projects-island-v1.glb", import.meta.url);
const defaultRootName = "ProjectsIsland_V1_Origin_At_Sea_Level";
const legacyBodyName = "ProjectsIsland_Continuous_Land_Shore_And_Submerged_Bedrock";
const args = process.argv.slice(2);
function parseArguments(values) {
  const options = { path: defaultPath, rootName: defaultRootName, maxTriangles: 100_000, selfTest: false };
  const seen = new Set();
  for (let i = 0; i < values.length; i++) {
    const flag = values[i];
    assert(["--file", "--root", "--max-triangles", "--self-test"].includes(flag), `Unknown option: ${flag}`);
    assert(!seen.has(flag), `Repeated option: ${flag}`); seen.add(flag);
    if (flag === "--self-test") { options.selfTest = true; continue; }
    const value = values[++i];
    assert(typeof value === "string" && value.length > 0 && !value.startsWith("--"), `${flag} requires a value`);
    if (flag === "--file") options.path = pathToFileURL(resolve(value));
    else if (flag === "--root") options.rootName = value;
    else {
      assert(/^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)), "--max-triangles requires a positive safe integer");
      options.maxTriangles = Number(value);
    }
  }
  return options;
}
const options = parseArguments(args), { path } = options;
const types = { 5120: [1, "getInt8", "setInt8", 127], 5121: [1, "getUint8", "setUint8", 255],
  5122: [2, "getInt16", "setInt16", 32767], 5123: [2, "getUint16", "setUint16", 65535],
  5125: [4, "getUint32", "setUint32", 4294967295], 5126: [4, "getFloat32", "setFloat32", 1] };
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");

function parse(bytes) {
  assert(bytes.length >= 28, "Bounded GLB header");
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "GLB version2");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "Exact GLB length");
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "First chunk JSON");
  const jsonLength = bytes.readUInt32LE(12), end = 20 + jsonLength;
  assert(jsonLength > 0 && jsonLength % 4 === 0 && end + 8 <= bytes.length, "Aligned bounded JSON");
  const doc = JSON.parse(bytes.subarray(20, end).toString("utf8"));
  assert.equal(doc.asset?.version, "2.0", "glTF2 document");
  assert.equal(bytes.readUInt32LE(end + 4), 0x004e4942, "Second chunk BIN");
  const length = bytes.readUInt32LE(end), bin = bytes.subarray(end + 8);
  assert(length > 0 && length % 4 === 0 && length === bin.length, "Exactly two bounded GLB chunks");
  return { doc, bin };
}

function inspect(doc, bin, configuration = options) {
  const { rootName, maxTriangles } = configuration;
  let checks = 0;
  const check = (condition, label) => { assert(condition, label); checks++; };
  const ref = (id, values, label) => {
    check(Array.isArray(values) && Number.isInteger(id) && id >= 0 && id < values.length, `${label}: valid reference`);
    return values[id];
  };
  const finite = (values, size, label) => {
    check(Array.isArray(values) && values.length === size && values.every(Number.isFinite), `${label}: finite vector`);
  };
  check(doc.buffers?.length === 1 && doc.buffers[0].uri === undefined, "One embedded buffer, no external URI");
  check(Number.isInteger(doc.buffers[0].byteLength) && doc.buffers[0].byteLength > 0
    && doc.buffers[0].byteLength <= bin.length && bin.length - doc.buffers[0].byteLength <= 3, "Declared BIN range and padding");
  // Native exports retain separately owned preview lamps. This ordinary glTF
  // light extension is not a geometry decoder, and active-asset traversal below
  // rejects its assignment inside the terrain owner rather than hiding it.
  check((doc.extensionsRequired ?? []).every(name => name === "KHR_lights_punctual"), "Only ordinary preview-light extension, no required geometry decoder");
  check(!(doc.extensionsUsed ?? []).some(name => /draco|meshopt|basisu|texture_webp|mesh_quantization/i.test(name)), "No compressed decoder dependency");
  check(!(doc.skins?.length) && !(doc.animations?.length), "Standalone static terrain, no skin or clips");
  for (const view of doc.bufferViews ?? []) {
    check(view.buffer === 0 && Number.isInteger(view.byteOffset ?? 0) && (view.byteOffset ?? 0) >= 0
      && Number.isInteger(view.byteLength) && view.byteLength > 0
      && (view.byteOffset ?? 0) + view.byteLength <= doc.buffers[0].byteLength, "Embedded bufferView range");
    check(!(Object.keys(view.extensions ?? {}).some(name => /draco|meshopt/i.test(name))), "No bufferView decoder");
  }
  const binary = new DataView(bin.buffer, bin.byteOffset, bin.byteLength), cache = new Map();
  function values(id) {
    if (cache.has(id)) return cache.get(id);
    const accessor = ref(id, doc.accessors, "Accessor"), view = ref(accessor.bufferView, doc.bufferViews, "Accessor bufferView");
    check(!accessor.sparse, "Dense ordinary accessor");
    const width = widths[accessor.type], format = types[accessor.componentType];
    check(Boolean(width && format), "Supported ordinary attribute format");
    const [size, getter, , maximum] = format, stride = view.byteStride ?? size * width, offset = accessor.byteOffset ?? 0;
    check(Number.isInteger(accessor.count) && accessor.count > 0, "Nonempty accessor");
    check(Number.isInteger(stride) && stride >= size * width && stride <= 252, "Valid accessor stride");
    check(Number.isInteger(offset) && offset >= 0 && offset % size === 0
      && offset + (accessor.count - 1) * stride + size * width <= view.byteLength, "Aligned accessor bounds");
    check(!accessor.normalized || ![5125, 5126].includes(accessor.componentType), "Valid glTF normalization");
    const out = new Float64Array(accessor.count * width), start = (view.byteOffset ?? 0) + offset;
    for (let i = 0; i < accessor.count; i++) for (let component = 0; component < width; component++) {
      const raw = binary[getter](start + i * stride + component * size, true);
      check(Number.isFinite(raw), "Finite attribute/index");
      out[i * width + component] = accessor.normalized ? Math.max(-1, raw / maximum) : raw;
    }
    const result = { accessor, width, data: out }; cache.set(id, result); return result;
  }
  function localMatrix(node) {
    if (node.matrix !== undefined) {
      finite(node.matrix, 16, "Node matrix");
      check(node.translation === undefined && node.rotation === undefined && node.scale === undefined, "Matrix or TRS, never both");
      return new Matrix4().fromArray(node.matrix);
    }
    const translation = node.translation ?? [0, 0, 0], rotation = node.rotation ?? [0, 0, 0, 1], scale = node.scale ?? [1, 1, 1];
    finite(translation, 3, "Translation"); finite(rotation, 4, "Quaternion"); finite(scale, 3, "Scale");
    const quaternion = new Quaternion().fromArray(rotation);
    check(Math.abs(quaternion.length() - 1) < 2e-5 && scale.every(value => Math.abs(value) > 1e-8), "Unit quaternion and nonsingular scale");
    return new Matrix4().compose(new Vector3().fromArray(translation), quaternion, new Vector3().fromArray(scale));
  }
  const identity = new Matrix4(), rootIds = (doc.nodes ?? []).flatMap((node, i) => node.name === rootName ? [i] : []);
  check(rootIds.length === 1, "Exactly one named sea-level root");
  const rootId = rootIds[0], root = doc.nodes[rootId];
  check(localMatrix(root).elements.every((value, i) => Math.abs(value - identity.elements[i]) < 1e-6), "Sea-level root identity: no hidden height/scale");
  finite(root.extras?.origin_gltf, 3, "Sea-level origin annotation");
  check(root.extras.origin_gltf.every(value => value === 0) && root.extras.units === "metres"
    && root.extras.origin_semantics === "Sea level, not a walking floor", "Explicit metre sea origin, not a gameplay floor");
  check(root.extras.automatic_multiview_reconstruction === false, "Reference-led authoring annotation, not automatic reconstruction");
  const seen = new Set(), meshIds = new Set(), materials = new Set(), primitives = [], excluded = [];
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  const normalLength = [Infinity, -Infinity];
  let vertices = 0, triangles = 0, nearZeroAreaTriangles = 0, normalOppositionCandidates = 0;
  const face = new Vector3(), ab = new Vector3(), ac = new Vector3(), average = new Vector3();
  function walk(id, parent, active = false, parentId = null) {
    const node = ref(id, doc.nodes, "Scene node");
    check(!seen.has(id), "Acyclic single-parent active scene"); seen.add(id);
    const matrix = parent.clone().multiply(localMatrix(node));
    check(matrix.elements.every(Number.isFinite) && Math.abs(matrix.determinant()) > 1e-10, "Finite nonsingular scene transform");
    if (id === rootId) { check(parentId === null, "Sea root is a scene root"); active = true; }
    if (active) {
      check(node.camera === undefined && !node.extensions?.KHR_lights_punctual && node.skin === undefined, "Preview camera/light/skin outside asset subtree");
      if (node.mesh !== undefined) {
        const mesh = ref(node.mesh, doc.meshes, "Mesh"); meshIds.add(node.mesh);
        check(Array.isArray(mesh.primitives) && mesh.primitives.length > 0, "Nonempty terrain mesh");
        for (const primitive of mesh.primitives) {
          check((primitive.mode ?? 4) === 4 && !(primitive.targets?.length), "Static triangle primitive");
          check(!Object.keys(primitive.attributes ?? {}).some(name => /^(JOINTS|WEIGHTS)_/.test(name)), "No skin attributes");
          const position = values(primitive.attributes?.POSITION), normal = values(primitive.attributes?.NORMAL), uv = values(primitive.attributes?.TEXCOORD_0);
          check(position.width === 3 && position.accessor.componentType === 5126, "Float32 POSITION VEC3");
          check(normal.width === 3 && normal.accessor.count === position.accessor.count, "Matching NORMAL VEC3");
          check(uv.width === 2 && uv.accessor.count === position.accessor.count, "Matching finite TEXCOORD_0 VEC2");
          check(primitive.attributes.COLOR_0 !== undefined, "Every terrain primitive has exported COLOR_0");
          const color = values(primitive.attributes.COLOR_0), count = position.accessor.count;
          check([3, 4].includes(color.width) && color.accessor.count === count, "Matching RGB/RGBA COLOR_0");
          check(color.accessor.componentType === 5126 || ([5121, 5123].includes(color.accessor.componentType) && color.accessor.normalized), "Portable normalized or float colour format");
          const colorMin = [Infinity, Infinity, Infinity], colorMax = [-Infinity, -Infinity, -Infinity];
          for (let i = 0; i < color.data.length; i++) check(color.data[i] >= 0 && color.data[i] <= 1, "Colour channels in0..1");
          for (let i = 0; i < count; i++) for (let channel = 0; channel < 3; channel++) {
            colorMin[channel] = Math.min(colorMin[channel], color.data[i * color.width + channel]);
            colorMax[channel] = Math.max(colorMax[channel], color.data[i * color.width + channel]);
          }
          check(colorMax.some((value, i) => value - colorMin[i] > 1e-5), "Each primitive has varying actual vertex paint, not uniform/empty colours");
          for (const attribute of Object.values(primitive.attributes)) values(attribute);
          const index = primitive.indices === undefined ? null : values(primitive.indices);
          if (index) {
            check(index.width === 1 && [5121, 5123, 5125].includes(index.accessor.componentType) && !index.accessor.normalized, "Unsigned SCALAR indices");
            for (const value of index.data) check(Number.isInteger(value) && value >= 0 && value < count, "Actual in-range index");
          }
          const faceCount = index?.data.length ?? count;
          check(faceCount > 0 && faceCount % 3 === 0, "Complete nonempty triangles");
          const transformed = new Float64Array(count * 3), transformedNormals = new Float64Array(count * 3), normalMatrix = new Matrix3().getNormalMatrix(matrix);
          const point = new Vector3(), n = new Vector3();
          for (let i = 0; i < count; i++) {
            point.fromArray(position.data, i * 3).applyMatrix4(matrix);
            check(point.toArray().every(Number.isFinite), "Finite transformed POSITION"); transformed.set(point.toArray(), i * 3); min.min(point); max.max(point);
            n.fromArray(normal.data, i * 3); const length = n.length();
            normalLength[0] = Math.min(normalLength[0], length); normalLength[1] = Math.max(normalLength[1], length);
            check(Math.abs(length - 1) < 5e-4, "Finite unit vertex normals, not zero");
            n.applyMatrix3(normalMatrix).normalize(); transformedNormals.set(n.toArray(), i * 3);
          }
          const a = new Vector3(), b = new Vector3(), c = new Vector3();
          for (let i = 0; i < faceCount; i += 3) {
            const ia = index?.data[i] ?? i, ib = index?.data[i + 1] ?? i + 1, ic = index?.data[i + 2] ?? i + 2;
            a.fromArray(transformed, ia * 3); b.fromArray(transformed, ib * 3); c.fromArray(transformed, ic * 3);
            face.crossVectors(ab.copy(b).sub(a), ac.copy(c).sub(a));
            if (face.lengthSq() < 1e-20) { nearZeroAreaTriangles++; continue; }
            average.set(...[0, 1, 2].map(component => transformedNormals[ia * 3 + component] + transformedNormals[ib * 3 + component] + transformedNormals[ic * 3 + component]));
            if (average.lengthSq() > 1e-12 && face.normalize().dot(average.normalize()) < -.05) normalOppositionCandidates++;
          }
          materials.add(primitive.material); ref(primitive.material, doc.materials, "Actual material");
          primitives.push({ node: node.name ?? null, nodeId: id, terrainRole: node.extras?.terrain_role ?? null,
            mesh: node.mesh, primitive, points: transformed, indices: index?.data ?? null,
            vertices: count, triangles: faceCount / 3, colorMin, colorMax });
          triangles += faceCount / 3; vertices += count;
        }
      }
    } else { check(node.mesh === undefined, "No active geometry outside the named terrain owner"); excluded.push(node.name ?? null); }
    for (const child of node.children ?? []) walk(child, matrix, active, id);
  }
  const scene = ref(doc.scene ?? 0, doc.scenes, "Default scene");
  for (const id of scene.nodes ?? []) walk(id, identity);
  check(seen.has(rootId) && primitives.length > 0, "Reachable named terrain has actual geometry");
  check(meshIds.size === doc.meshes.length, "No dormant/unreachable geometry meshes");
  check(triangles <= maxTriangles, `Actual study triangle count ${triangles} exceeds configured review guard ${maxTriangles}; not a runtime profile`);
  const size = max.clone().sub(min);
  check(size.toArray().every(value => Number.isFinite(value) && value > .05), "Actual physical3D bounds");
  check(Math.abs(min.y + 10) < 2e-4, "Actual body minimumY−10m below sea, not an exposed lifted base");

  // New studies declare the body semantically instead of coupling inspection
  // to one sculptor's object name. Only V1 retains its immutable legacy name.
  const declaredBody = primitives.filter(entry => entry.terrainRole === "continuous-bedrock");
  const body = declaredBody.length ? declaredBody
    : rootName === defaultRootName ? primitives.filter(entry => entry.node === legacyBodyName) : [];
  check(body.length > 0 && new Set(body.map(entry => entry.nodeId)).size === 1,
    "One continuous terrain/bedrock owner: terrain_role=continuous-bedrock or the legacy V1 body");
  let bodyMinimumY = Infinity;
  for (const entry of body) for (let i = 1; i < entry.points.length; i += 3) bodyMinimumY = Math.min(bodyMinimumY, entry.points[i]);
  check(Math.abs(bodyMinimumY + 10) < 2e-4, "Actual continuous body minimumY−10m below sea");
  function eachTriangle(entry, action) {
    const count = entry.indices?.length ?? entry.points.length / 3;
    for (let i = 0; i < count; i += 3) action([0, 1, 2].map(j => {
      const vertex = entry.indices?.[i + j] ?? i + j;
      return Array.from(entry.points.subarray(vertex * 3, vertex * 3 + 3));
    }));
  }
  function section(y) {
    const samples = [], angularRadius = new Array(32).fill(0);
    for (const entry of body) eachTriangle(entry, triangle => {
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle[edge], b = triangle[(edge + 1) % 3], dy = b[1] - a[1];
        if (Math.abs(dy) < 1e-12 || (y - a[1]) * (y - b[1]) > 0) continue;
        const t = (y - a[1]) / dy, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t;
        samples.push([x, z]); const bin = Math.floor(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * angularRadius.length);
        angularRadius[bin] = Math.max(angularRadius[bin], Math.hypot(x, z));
      }
    });
    check(samples.length > 0 && angularRadius.every(value => value > 0), `Actual body sectionY${y}: all angular bins intersect`);
    const lower = [Infinity, Infinity], upper = [-Infinity, -Infinity];
    for (const p of samples) for (let i = 0; i < 2; i++) { lower[i] = Math.min(lower[i], p[i]); upper[i] = Math.max(upper[i], p[i]); }
    return { y, crossingSamples: samples.length, boundsXZ: { min: lower, max: upper }, spanXZ: upper.map((value, i) => value - lower[i]), minimumAngularRadius: Math.min(...angularRadius) };
  }
  const sea = section(0), submerged = section(-9.5), nearWater = section(.3);
  check(sea.spanXZ.every(value => value > 10) && sea.minimumAngularRadius > Math.min(...sea.spanXZ) * .25, "Broad actual body at sea level, not a narrow hanging stem");
  check(submerged.spanXZ.every((value, i) => value >= sea.spanXZ[i] * .92)
    && submerged.minimumAngularRadius >= sea.minimumAngularRadius * .92, "Bedrock stays broad below sea instead of tapering into floating rocks");
  // These are actual triangle measurements in the declared apron frame, not
  // a V1-centred two-intersection constraint. Eroded ledges may legitimately
  // add crossings; the report never certifies support, flatness or gameplay.
  const clearingFrame = { centreXZ: [0, -3], width: 32, depth: 26,
    boundsXZ: { min: [-16, -16], max: [16, 10] }, proposedTopYAboveSea: 4.8 };
  const clearingFrameProbes = [];
  for (let ix = 0; ix <= 4; ix++) for (let iz = 0; iz <= 4; iz++) {
    const x = -16 + clearingFrame.width * ix / 4, z = -16 + clearingFrame.depth * iz / 4;
    const heights = [];
    for (const entry of body) eachTriangle(entry, ([a, b, c]) => {
      const denominator = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
      if (Math.abs(denominator) < 1e-12) return;
      const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / denominator;
      const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / denominator;
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7) heights.push(u * a[1] + v * b[1] + (1 - u - v) * c[1]);
    });
    heights.sort((a, b) => a - b); const unique = heights.filter((value, i) => i === 0 || Math.abs(value - heights[i - 1]) > 1e-4);
    const bottom = unique[0] ?? null, top = unique.at(-1) ?? null;
    clearingFrameProbes.push({ x, z, distinctIntersections: unique, bottomYAboveSea: bottom, topYAboveSea: top,
      reachesBedrock: bottom !== null && Math.abs(bottom + 10) < 2e-4,
      hasDryTop: top !== null && top > 0,
      deviationFromProposedTop: top === null ? null : top - clearingFrame.proposedTopYAboveSea });
  }
  check(nearZeroAreaTriangles === 0, "No actual near-zero-area triangles");
  check(normalOppositionCandidates === 0, "No actual face/vertex-normal opposition candidates");

  const images = [];
  for (const [id, image] of (doc.images ?? []).entries()) {
    check(image.uri === undefined && image.bufferView !== undefined && image.mimeType === "image/png", "Actual embedded PNG, no external image URI");
    const view = ref(image.bufferView, doc.bufferViews, "PNG bufferView"), start = view.byteOffset ?? 0, png = bin.subarray(start, start + view.byteLength);
    check(png.length >= 33 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "PNG signature");
    check(png.readUInt32BE(8) === 13 && png.subarray(12, 16).toString("ascii") === "IHDR", "PNG IHDR");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20), depth = png[24], colorType = png[25];
    check(width > 0 && height > 0 && width <= 16384 && height <= 16384 && [8, 16].includes(depth)
      && [0, 2, 4, 6].includes(colorType) && png[26] === 0 && png[27] === 0 && png[28] === 0, "Ordinary bounded noninterlaced PNG dimensions/format");
    const idat = []; let cursor = 8, ended = false;
    while (cursor < png.length) {
      check(cursor + 12 <= png.length, "PNG bounded chunk header");
      const length = png.readUInt32BE(cursor), end = cursor + 12 + length, kind = png.subarray(cursor + 4, cursor + 8).toString("ascii");
      check(end <= png.length, "PNG bounded chunk payload");
      if (kind === "IDAT") idat.push(png.subarray(cursor + 8, cursor + 8 + length));
      if (kind === "IEND") { check(length === 0 && end === png.length, "PNG exact IEND"); ended = true; }
      cursor = end;
    }
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType], rowBytes = width * channels * depth / 8, rawLength = (rowBytes + 1) * height;
    check(ended && idat.length > 0 && rawLength <= 256 * 1024 * 1024, "Complete bounded PNG image");
    const raw = inflateSync(Buffer.concat(idat), { maxOutputLength: rawLength });
    check(raw.length === rawLength, "PNG actual pixel payload length");
    for (let row = 0; row < height; row++) check(raw[row * (rowBytes + 1)] <= 4, "PNG ordinary scanline filter");
    images.push({ id, name: image.name ?? null, width, height, bitDepth: depth, bytes: png.length, sha256: sha256(png) });
  }
  const textures = new Set(), materialReports = [];
  for (const id of materials) {
    const material = ref(id, doc.materials, "PBR material"), pbr = material.pbrMetallicRoughness;
    check(Boolean(pbr && pbr.metallicRoughnessTexture && material.normalTexture), "Every actual material has standard MR and tangent-normal textures");
    check(!material.extensions?.KHR_materials_unlit, "Lit standard PBR material");
    if (pbr.baseColorFactor) finite(pbr.baseColorFactor, 4, "PBR base factor");
    for (const [label, factor, fallback] of [["metallic", pbr.metallicFactor, 1], ["roughness", pbr.roughnessFactor, 1]])
      check(Number.isFinite(factor ?? fallback) && (factor ?? fallback) >= 0 && (factor ?? fallback) <= 1, `PBR ${label} factor`);
    for (const texture of [pbr.baseColorTexture, pbr.metallicRoughnessTexture, material.normalTexture, material.occlusionTexture, material.emissiveTexture].filter(Boolean)) {
      check((texture.texCoord ?? 0) === 0, "PBR texture uses validated TEXCOORD_0");
      const definition = ref(texture.index, doc.textures, "PBR texture"); textures.add(texture.index);
      ref(definition.source, images, "Texture embedded image");
      if (definition.sampler !== undefined) ref(definition.sampler, doc.samplers, "Texture sampler");
    }
    check(Number.isFinite(material.normalTexture.scale ?? 1), "Finite normal-map strength");
    materialReports.push({ id, name: material.name ?? null, metallicRoughnessTexture: pbr.metallicRoughnessTexture.index,
      normalTexture: material.normalTexture.index, baseColorTexture: pbr.baseColorTexture?.index ?? null,
      occlusionTexture: material.occlusionTexture?.index ?? null,
      aoInterpretation: material.occlusionTexture ? "Explicit glTF AO texture" : "No glTF occlusion texture assigned; ORM filename alone does not certify AO" });
  }
  check(images.length > 0 && textures.size > 0, "Actual referenced embedded PBR images");
  return { checks, meshes: meshIds.size, primitives: primitives.length, vertices, triangles,
    boundsMinYUpMetres: min.toArray(), boundsMaxYUpMetres: max.toArray(), boundsYUpMetres: size.toArray(),
    normalLengthRange: normalLength, geometryDiagnostics: { nearZeroAreaTriangles, normalOppositionCandidates,
      interpretation: "Actual transformed triangle shading diagnostics, not source manifold/watertightness certification from glTF seams" },
    vertexPaint: primitives.map(entry => ({ node: entry.node, vertices: entry.vertices, triangles: entry.triangles, minRGB: entry.colorMin, maxRGB: entry.colorMax })),
    reviewProfile: { maxTriangles, defaultV1MaxTriangles: 100_000, interpretation: "Explicit standalone study guard, not runtime/performance acceptance" },
    seaContact: { originY: 0, bodyNode: body[0].node, bodyNodeId: body[0].nodeId, bodyMinimumY,
      bodyPrimitiveCount: body.length, sections: [nearWater, sea, submerged], clearingFrame, clearingFrameProbes,
      fullBodyApronDiagnostic: measureBodyApron(body),
      interpretation: "Actual body intersections plus sparse25point apron-frame diagnostics; no fixed V1 ray topology, manifold, sea-foam, flatness, collision or gameplay support acceptance" },
    materials: materialReports, textures: textures.size, embeddedImages: images, excludedPreviewNodes: excluded,
    fixedMapOrImageFidelityAsserted: false, runtimeIntegrated: false };
}

function mutateAccessor(doc, bin, id, transform) {
  const accessor = doc.accessors[id], view = doc.bufferViews[accessor.bufferView], [size, getter, setter, maximum] = types[accessor.componentType];
  const width = widths[accessor.type], stride = view.byteStride ?? width * size, start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const data = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  for (let i = 0; i < accessor.count; i++) {
    const old = Array.from({ length: width }, (_, component) => data[getter](start + i * stride + component * size, true));
    const next = transform(old, i, accessor);
    for (let component = 0; component < width; component++) {
      const value = accessor.normalized && accessor.componentType !== 5126 ? Math.round(next[component] * maximum) : next[component];
      data[setter](start + i * stride + component * size, value, true);
    }
  }
}

const bytes = await readFile(path), { doc, bin } = parse(bytes), report = inspect(doc, bin);
const negativeFixtures = [], interfaceFixtures = [];
if (options.selfTest) {
  const first = doc.meshes[0].primitives[0], bodyMesh = doc.nodes[report.seaContact.bodyNodeId].mesh;
  const reject = (name, mutation, expected, source = doc, configuration = options) => {
    const broken = structuredClone(source), buffer = Buffer.from(bin); mutation(broken, buffer);
    assert.throws(() => inspect(broken, buffer, configuration), expected, `${name}: must reject actual in-memory corruption`); negativeFixtures.push(name);
  };
  reject("missing-all-exported-colours", d => { for (const mesh of d.meshes) for (const primitive of mesh.primitives) delete primitive.attributes.COLOR_0; }, /COLOR_0|valid reference/);
  reject("empty-colour-accessor", d => { d.accessors[first.attributes.COLOR_0].count = 0; }, /Nonempty accessor/);
  reject("uniform-colour-not-vertex-paint", (d, b) => { for (const mesh of d.meshes) for (const primitive of mesh.primitives)
    mutateAccessor(d, b, primitive.attributes.COLOR_0, (old, _i, accessor) => Array.from({ length: widths[accessor.type] }, (_, c) => c === 3 ? 1 : .5)); }, /varying actual vertex paint/);
  reject("nonfinite-position", (d, b) => mutateAccessor(d, b, first.attributes.POSITION, (old, i) => i === 0 ? [NaN, old[1], old[2]] : old), /Finite attribute/);
  reject("nonfinite-colour", (d, b) => mutateAccessor(d, b, first.attributes.COLOR_0, (old, i) => i === 0 ? [NaN, ...old.slice(1)] : old), /Finite attribute/);
  reject("nonfinite-uv", (d, b) => mutateAccessor(d, b, first.attributes.TEXCOORD_0, (old, i) => i === 0 ? [NaN, old[1]] : old), /Finite attribute/);
  reject("zero-normals", (d, b) => mutateAccessor(d, b, first.attributes.NORMAL, () => [0, 0, 0]), /unit vertex normals/);
  reject("inverted-normals", (d, b) => mutateAccessor(d, b, first.attributes.NORMAL, old => old.map(value => -value)), /normal opposition/);
  reject("invalid-index", (d, b) => mutateAccessor(d, b, first.indices, (old, i) => i === 0 ? [d.accessors[first.attributes.POSITION].count] : old), /in-range index/);
  reject("translated-sea-origin", d => { d.nodes.find(node => node.name === options.rootName).translation = [0, 4.8, 0]; }, /Sea-level root identity/);
  reject("external-buffer", d => { d.buffers[0].uri = "https://invalid.example/terrain.bin"; }, /no external URI/);
  reject("external-image", d => { d.images[0].uri = "https://invalid.example/texture.png"; }, /no external image URI/);
  reject("missing-mr-map", d => { delete d.materials[0].pbrMetallicRoughness.metallicRoughnessTexture; }, /standard MR/);
  reject("missing-normal-map", d => { delete d.materials[0].normalTexture; }, /standard MR/);
  reject("invalid-embedded-png", (d, b) => { b[d.bufferViews[d.images[0].bufferView].byteOffset ?? 0] = 0; }, /PNG signature/);
  reject("lifted-bedrock-base", (d, b) => { for (const primitive of d.meshes[bodyMesh].primitives)
    mutateAccessor(d, b, primitive.attributes.POSITION, old => [old[0], old[1] < 0 ? old[1] * .8 : old[1], old[2]]); }, /minimumY/);
  reject("pinched-hanging-bedrock", (d, b) => { for (const primitive of d.meshes[bodyMesh].primitives)
    mutateAccessor(d, b, primitive.attributes.POSITION, old => old[1] < -1 ? [old[0] * .15, old[1], old[2] * .15] : old); }, /Bedrock stays broad/);
  reject("explicit-study-triangle-budget", () => {}, /configured review guard/, doc, { ...options, maxTriangles: report.triangles - 1 });

  const defaults = parseArguments([]);
  assert(defaults.path.href === defaultPath.href && defaults.rootName === defaultRootName
    && defaults.maxTriangles === 100_000 && defaults.selfTest === false, "Legacy V1 defaults stay explicit");
  interfaceFixtures.push("legacy-v1-defaults");
  const explicit = parseArguments(["--file", fileURLToPath(path), "--root", options.rootName, "--max-triangles", "180000", "--self-test"]);
  assert(explicit.path.href === path.href && explicit.rootName === options.rootName
    && explicit.maxTriangles === 180_000 && explicit.selfTest, "Explicit local file/root/review guard parsing");
  interfaceFixtures.push("explicit-file-root-study-budget");
  for (const invalid of [["--unknown"], ["--file"], ["--root", ""], ["--max-triangles", "0"],
    ["--max-triangles", "180000.5"], ["--max-triangles", "9007199254740992"], ["--self-test", "--self-test"]])
    assert.throws(() => parseArguments(invalid), /option|requires/, `Invalid CLI: ${invalid.join(" ")}`);
  interfaceFixtures.push("seven-invalid-cli-fixtures");

  // This fixture reuses the current binary, not an actual V2 model or fidelity
  // claim. It proves a renamed owner/body works through the new semantic API.
  const semantic = structuredClone(doc), semanticRoot = "ProjectsIsland_V2_Origin_At_Sea_Level";
  semantic.nodes.find(node => node.name === options.rootName).name = semanticRoot;
  const semanticBody = semantic.nodes[report.seaContact.bodyNodeId];
  semanticBody.name = "Arbitrary sculptor body name, not a checker identifier";
  semanticBody.extras = { ...semanticBody.extras, terrain_role: "continuous-bedrock" };
  const semanticConfiguration = { ...options, rootName: semanticRoot, maxTriangles: 180_000 };
  const semanticReport = inspect(semantic, bin, semanticConfiguration);
  assert(semanticReport.triangles === report.triangles && semanticReport.seaContact.bodyNode === semanticBody.name
    && semanticReport.seaContact.clearingFrameProbes.length === 25, "Parameterized semantic inspection preserves actual geometry measurements");
  interfaceFixtures.push("renamed-v2-root-semantic-body-on-current-binary-only");
  reject("missing-v2-semantic-body", d => { delete d.nodes[report.seaContact.bodyNodeId].extras.terrain_role; },
    /continuous terrain\/bedrock owner/, semantic, semanticConfiguration);
  if (doc.nodes.some((node, id) => id !== report.seaContact.bodyNodeId && node.mesh !== undefined)) {
    reject("ambiguous-semantic-bedrock-owners", d => {
      const other = d.nodes.find((node, id) => id !== report.seaContact.bodyNodeId && node.mesh !== undefined);
      other.extras = { ...other.extras, terrain_role: "continuous-bedrock" };
    }, /continuous terrain\/bedrock owner/, semantic, semanticConfiguration);
  }
}
console.log(JSON.stringify({ asset: doc.nodes.find(node => node.name === options.rootName).extras?.asset_id ?? "standalone-terrain-study",
  root: options.rootName, file: fileURLToPath(path), bytes: bytes.length,
  sha256: sha256(bytes), status: "ACTUAL STANDALONE STRUCTURE PASS; not map/physics, visual fidelity, source manifold, performance or runtime acceptance",
  ...report, negativeFixtures, interfaceFixtures }, null, 2));
