/** Actual articulated explorer GLB checks. No GPU, art/FPS or manifold claim.
 * Read-only: node scripts/island-explorer-check.mjs [--self-test]
 * --self-test additionally rejects in-memory corruptions of the real document.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Box3, Matrix3, Matrix4, Quaternion, Vector3 } from "three";
import ts from "typescript";

const base = new URL("../", import.meta.url);
const modelPath = new URL("public/models/archipelago/explorer-v1.glb", base);
const contractPath = new URL("assets/archipelago/explorer-contract-v1.json", base);
const args = process.argv.slice(2);
assert(args.every(arg => arg === "--self-test"), "Only --self-test is supported; the asset path is closed-catalog");
const tolerance = 1e-6;
const identity = new Matrix4();
const formats = { 5120: [1, "getInt8"], 5121: [1, "getUint8"], 5122: [2, "getInt16"], 5123: [2, "getUint16"], 5125: [4, "getUint32"], 5126: [4, "getFloat32"] };
const widths = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };
const finite = array => Array.isArray(array) && array.every(Number.isFinite);
const same = (actual, expected, label) => {
  assert(finite(actual) && actual.length === expected.length, `${label}: finite vector width`);
  assert(actual.every((value, i) => Math.abs(value - expected[i]) <= tolerance), `${label}: rest value differs from contract`);
};
const validIndex = (index, array, label) => {
  assert(Number.isInteger(index) && index >= 0 && index < array.length, `${label}: valid reference`);
  return array[index];
};
const isIdentity = matrix => matrix.elements.every((value, i) => Math.abs(value - identity.elements[i]) <= tolerance);

// Same in-memory actual-module execution as island-world-art-check.mjs. No
// copied helper, emitted build files, DOM, network request or substitute mesh.
const actualModules = new Map();
function moduleURL(file) {
  const absolute = new URL(file, import.meta.url);
  if (actualModules.has(absolute.href)) return actualModules.get(absolute.href);
  let compiled = ts.transpileModule(readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  compiled = compiled.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, specifier) => {
    const target = specifier.startsWith(".") ? moduleURL(new URL(`${specifier}.ts`, absolute).href) : import.meta.resolve(specifier);
    return `from ${JSON.stringify(target)}`;
  });
  const result = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
  actualModules.set(absolute.href, result); return result;
}

function parse(bytes, budget) {
  assert(bytes.length >= 28 && bytes.length <= budget.glbBytesMax, "GLB byte budget/header");
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, "GLB magic");
  assert.equal(bytes.readUInt32LE(4), 2, "GLB binary version2");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "GLB declared length");
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, "First chunk is JSON");
  const jsonSize = bytes.readUInt32LE(12), binHeader = 20 + jsonSize;
  assert(jsonSize > 0 && jsonSize % 4 === 0 && binHeader + 8 <= bytes.length, "Aligned bounded JSON chunk");
  const doc = JSON.parse(bytes.subarray(20, binHeader).toString("utf8"));
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942, "Second chunk is embedded BIN");
  const binSize = bytes.readUInt32LE(binHeader), bin = bytes.subarray(binHeader + 8);
  assert(binSize > 0 && binSize % 4 === 0 && binSize === bin.length, "Exactly two bounded GLB chunks");
  assert.equal(doc.asset?.version, "2.0", "glTF2 document");
  return { doc, bin };
}

function localMatrix(node) {
  if (node.matrix !== undefined) {
    assert(finite(node.matrix) && node.matrix.length === 16, "Finite node matrix");
    assert(node.translation === undefined && node.rotation === undefined && node.scale === undefined, "Matrix and TRS cannot coexist");
    return new Matrix4().fromArray(node.matrix);
  }
  same(node.translation ?? [0, 0, 0], node.translation ?? [0, 0, 0], "Node translation");
  same(node.rotation ?? [0, 0, 0, 1], node.rotation ?? [0, 0, 0, 1], "Node rotation");
  same(node.scale ?? [1, 1, 1], node.scale ?? [1, 1, 1], "Node scale");
  assert.equal((node.translation ?? [0, 0, 0]).length, 3, "Translation width");
  assert.equal((node.rotation ?? [0, 0, 0, 1]).length, 4, "Quaternion width");
  assert.equal((node.scale ?? [1, 1, 1]).length, 3, "Scale width");
  const quaternion = new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]);
  assert(Math.abs(quaternion.length() - 1) < tolerance, "Unit rest quaternion");
  return new Matrix4().compose(new Vector3().fromArray(node.translation ?? [0, 0, 0]), quaternion, new Vector3().fromArray(node.scale ?? [1, 1, 1]));
}

function structure(doc, bin, contract) {
  assert.equal(contract.schema, "archipelago-rigid-explorer-contract-v1", "Exact explorer contract schema");
  assert.equal(contract.units, "metres", "Contract metre units");
  assert.equal(contract.joints.length, 5, "Five contracted rigid pivots");
  assert.equal(contract.physics.change, "none", "Collider contract is unchanged");
  assert(!(doc.animations?.length), "No authored animations");
  assert(!(doc.skins?.length), "No skins/armature");
  assert(!(doc.extensionsRequired?.length), "No required decoder or extension");
  const blocked = /draco|meshopt|basisu|texture_webp|mesh_quantization/i;
  assert(!(doc.extensionsUsed ?? []).some(name => blocked.test(name)), "No compressed/decoder dependency");
  assert(Array.isArray(doc.buffers) && doc.buffers.length === 1, "One embedded buffer");
  assert(!doc.buffers[0].uri, "No external buffer URI");
  assert(Number.isInteger(doc.buffers[0].byteLength) && doc.buffers[0].byteLength > 0 && doc.buffers[0].byteLength <= bin.length, "Embedded buffer bounds");
  assert(bin.length - doc.buffers[0].byteLength <= 3, "Only GLB padding after the declared buffer");
  for (const view of doc.bufferViews ?? []) {
    assert.equal(view.buffer, 0, "Buffer view owns embedded BIN");
    const offset = view.byteOffset ?? 0;
    assert(Number.isInteger(offset) && offset >= 0 && Number.isInteger(view.byteLength) && view.byteLength > 0, "Finite buffer view range");
    assert(offset + view.byteLength <= doc.buffers[0].byteLength, "Buffer view fits declared BIN");
    assert(!(Object.keys(view.extensions ?? {}).some(name => blocked.test(name))), "No buffer-view decoder");
  }
  assert(Array.isArray(doc.nodes) && Array.isArray(doc.meshes) && Array.isArray(doc.scenes), "Actual scene and mesh arrays");
  const rootIds = doc.nodes.flatMap((node, i) => node.name === contract.root ? [i] : []);
  assert.equal(rootIds.length, 1, "Exactly one semantic foot root");
  const rootId = rootIds[0], root = doc.nodes[rootId];
  assert(isIdentity(localMatrix(root)), "Foot root identity transform (metre geometry, no hidden scale)");
  assert(root.extras?.units?.startsWith("metres"), "Root declares metre authoring units");
  assert.equal(root.extras?.foot_plane_z, 0, "Authored foot-plane annotation");
  const parentOf = new Map(), locals = new Map(), reachable = new Set();
  function visit(index, parent, ancestors = new Set()) {
    const node = validIndex(index, doc.nodes, "Scene node");
    assert(!ancestors.has(index) && !reachable.has(index), "Acyclic single-parent reachable graph");
    reachable.add(index); parentOf.set(index, parent); locals.set(index, localMatrix(node));
    assert(node.skin === undefined, "No mesh skin assignment");
    const next = new Set(ancestors); next.add(index);
    for (const child of node.children ?? []) visit(child, index, next);
  }
  const scene = validIndex(doc.scene ?? 0, doc.scenes, "Default scene");
  for (const node of scene.nodes ?? []) visit(node, null);
  assert(reachable.has(rootId) && parentOf.get(rootId) === null, "Foot root is a reachable scene root");
  const joints = new Map();
  for (const expected of contract.joints) {
    const matches = [...reachable].filter(index => doc.nodes[index].name === expected.name);
    assert.equal(matches.length, 1, `${expected.name}: exactly one reachable rigid pivot`);
    const index = matches[0], node = doc.nodes[index], parent = parentOf.get(index);
    assert.equal(doc.nodes[parent]?.name, expected.parent, `${expected.name}: direct contracted parent`);
    assert(node.mesh === undefined, `${expected.name}: editable empty pivot, not a flattened mesh`);
    const position = new Vector3(), quaternion = new Quaternion(), scale = new Vector3();
    locals.get(index).decompose(position, quaternion, scale);
    same(position.toArray(), expected.translation, `${expected.name}: local translation`);
    same(scale.toArray(), expected.scale, `${expected.name}: local scale`);
    same(quaternion.toArray(), [0, 0, 0, 1], `${expected.name}: neutral local rotation`);
    assert.deepEqual(expected.rotation, [0, 0, 0], "Contract rest Euler orientation");
    joints.set(expected.name, index);
  }
  const meshNodes = [];
  for (const index of reachable) {
    const node = doc.nodes[index];
    if (node.mesh === undefined) continue;
    const parent = parentOf.get(index), jointName = doc.nodes[parent]?.name;
    assert(joints.has(jointName), `${node.name}: geometry is an immediate rigid-joint child, not scene/global flattened`);
    assert(isIdentity(locals.get(index)), `${node.name}: mesh local identity (part vertices remain joint-local)`);
    assert.equal(node.extras?.runtime_joint, jointName, `${node.name}: joint ownership extra`);
    const mesh = validIndex(node.mesh, doc.meshes, "Mesh node");
    assert(mesh.primitives?.length > 0, "Nonempty actual mesh");
    for (const primitive of mesh.primitives) {
      assert(!(Object.keys(primitive.extensions ?? {}).some(name => blocked.test(name))), "No primitive decoder");
      assert(!Object.keys(primitive.attributes ?? {}).some(name => /^(JOINTS|WEIGHTS)_/.test(name)), "No skin attributes");
      assert(!(primitive.targets?.length), "No hidden morph animation");
    }
    meshNodes.push({ index, jointName, mesh });
  }
  assert(meshNodes.length > 5 && meshNodes.length <= contract.authoringBudgets.meshObjectsMax, "Articulated mesh-node count within budget");
  assert.equal(meshNodes.length, doc.meshes.length, "No dormant/unreachable/global geometry meshes");
  for (const name of joints.keys()) assert(meshNodes.some(node => node.jointName === name), `${name}: owns real geometry`);
  const rootChildren = (root.children ?? []).map(index => doc.nodes[index].name).sort();
  assert.deepEqual(rootChildren, contract.joints.filter(joint => joint.parent === contract.root).map(joint => joint.name).sort(), "Root preserves body/independent-leg hierarchy");
  return { rootId, joints, meshNodes, parentOf, locals, reachable, sceneRoots: scene.nodes };
}

function accessorReader(doc, bin) {
  const decoded = new Map(), view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  return index => {
    if (decoded.has(index)) return decoded.get(index);
    const accessor = validIndex(index, doc.accessors ?? [], "Accessor");
    assert(!accessor.sparse && accessor.bufferView !== undefined, "Dense portable accessor only");
    const buffer = validIndex(accessor.bufferView, doc.bufferViews, "Accessor buffer view");
    const width = widths[accessor.type], format = formats[accessor.componentType];
    assert(width && format, "Supported ordinary accessor format");
    assert(!accessor.normalized, "Explorer attributes use ordinary floats/unsigned indices, no quantized normalization");
    const [size, getter] = format, stride = buffer.byteStride ?? size * width, offset = accessor.byteOffset ?? 0;
    assert(Number.isInteger(accessor.count) && accessor.count > 0, "Positive bounded accessor count");
    assert(Number.isInteger(stride) && stride >= width * size && stride <= 252, "Valid accessor stride");
    assert(Number.isInteger(offset) && offset >= 0 && offset % size === 0, "Aligned accessor offset");
    assert(offset + (accessor.count - 1) * stride + width * size <= buffer.byteLength, "Accessor fits buffer view");
    const start = (buffer.byteOffset ?? 0) + offset, values = new Array(accessor.count * width);
    for (let i = 0; i < accessor.count; i++) for (let c = 0; c < width; c++) {
      const value = view[getter](start + i * stride + c * size, true);
      assert(Number.isFinite(value), "Finite decoded attribute/index"); values[i * width + c] = value;
    }
    const result = { values, accessor, width }; decoded.set(index, result); return result;
  };
}

function imagesAndMaterials(doc, bin, contract, materialIds) {
  assert(doc.images?.length > 0 && doc.images.length <= contract.authoringBudgets.packedImagesMax, "Embedded image budget");
  const imageDimensions = [];
  for (const image of doc.images) {
    assert(!image.uri && image.bufferView !== undefined, "No external image URI; each image is embedded");
    assert.equal(image.mimeType, "image/png", "Portable embedded PNG PBR");
    const view = validIndex(image.bufferView, doc.bufferViews, "Image buffer view"), start = view.byteOffset ?? 0;
    const png = bin.subarray(start, start + view.byteLength);
    assert(png.length >= 33 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Embedded PNG signature");
    assert.equal(png.readUInt32BE(8), 13, "PNG IHDR length");
    assert.equal(png.subarray(12, 16).toString("ascii"), "IHDR", "PNG dimensions header");
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert(width > 0 && height > 0 && Math.max(width, height) <= contract.authoringBudgets.textureDimensionMax, "Packed PNG dimension budget");
    imageDimensions.push({ name: image.name ?? null, width, height });
  }
  const textureIds = new Set(), imageIds = new Set();
  for (const id of materialIds) {
    const material = validIndex(id, doc.materials ?? [], "Primitive material");
    const pbr = material.pbrMetallicRoughness;
    assert(pbr, "Standard metallic/roughness PBR material");
    assert.equal(material.alphaMode ?? "OPAQUE", "OPAQUE", "Neutral explorer material is opaque before runtime fade");
    const color = pbr.baseColorFactor ?? [1, 1, 1, 1];
    assert(finite(color) && color.length === 4 && color.every(value => value >= 0 && value <= 1), "Finite normalized base factor");
    assert.equal(color[3], 1, "Neutral opacity1");
    for (const value of [pbr.metallicFactor ?? 1, pbr.roughnessFactor ?? 1]) assert(Number.isFinite(value) && value >= 0 && value <= 1, "Finite standard PBR factors");
    for (const info of [pbr.baseColorTexture, pbr.metallicRoughnessTexture, material.normalTexture, material.occlusionTexture, material.emissiveTexture]) {
      if (!info) continue;
      assert.equal(info.texCoord ?? 0, 0, "PBR uses verified TEXCOORD_0");
      const texture = validIndex(info.index, doc.textures ?? [], "PBR texture");
      validIndex(texture.source, doc.images, "Standard embedded texture source");
      assert(!(Object.keys(texture.extensions ?? {}).length), "Texture source has no decoder/alternate format");
      if (texture.sampler !== undefined) validIndex(texture.sampler, doc.samplers ?? [], "Texture sampler");
      textureIds.add(info.index); imageIds.add(texture.source);
    }
  }
  assert(textureIds.size > 0, "Actual packed PBR maps, not only color factors");
  assert.equal(imageIds.size, doc.images.length, "All embedded PBR images are actually referenced");
  return { materials: materialIds.size, textures: textureIds.size, embeddedImages: imageIds.size, imageDimensions };
}

function worldMatrices(doc, state, overrides = new Map()) {
  const worlds = new Map();
  function visit(index, parent) {
    const matrix = parent.clone().multiply(overrides.get(index) ?? state.locals.get(index));
    assert(matrix.elements.every(Number.isFinite), "Finite posed node matrix"); worlds.set(index, matrix);
    for (const child of doc.nodes[index].children ?? []) visit(child, matrix);
  }
  for (const index of state.sceneRoots) visit(index, new Matrix4());
  return worlds;
}

function geometry(doc, bin, contract, state) {
  const values = accessorReader(doc, bin), worlds = worldMatrices(doc, state), parts = [], materialIds = new Set();
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  const localBounds = new Map([...state.joints.keys()].map(name => [name, { min: new Vector3(Infinity, Infinity, Infinity), max: new Vector3(-Infinity, -Infinity, -Infinity) }]));
  const a = new Vector3(), b = new Vector3(), c = new Vector3(), edge1 = new Vector3(), edge2 = new Vector3(), face = new Vector3(), average = new Vector3(), point = new Vector3();
  let triangles = 0, vertices = 0, primitives = 0, nearZeroAreaTriangles = 0, normalOppositionCandidates = 0;
  const oppositionByNode = new Map();
  for (const node of state.meshNodes) for (const primitive of node.mesh.primitives) {
    assert.equal(primitive.mode ?? 4, 4, "Triangle primitive mode");
    const position = values(primitive.attributes.POSITION), normal = values(primitive.attributes.NORMAL);
    assert.equal(position.accessor.type, "VEC3", "Position VEC3"); assert.equal(position.accessor.componentType, 5126, "Position Float32");
    assert.equal(normal.accessor.type, "VEC3", "Normal VEC3"); assert.equal(normal.accessor.componentType, 5126, "Normal Float32");
    assert.equal(normal.values.length, position.values.length, "Position/normal count parity");
    const uv = primitive.attributes.TEXCOORD_0 === undefined ? null : values(primitive.attributes.TEXCOORD_0);
    if (uv) { assert.equal(uv.accessor.type, "VEC2", "UV VEC2"); assert.equal(uv.accessor.componentType, 5126, "UV Float32"); assert.equal(uv.accessor.count, position.accessor.count, "UV count parity"); }
    const material = validIndex(primitive.material, doc.materials ?? [], "Mesh PBR material");
    if ([material.pbrMetallicRoughness?.baseColorTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture, material.normalTexture, material.occlusionTexture, material.emissiveTexture].some(Boolean)) assert(uv, "Textured PBR mesh owns UV coordinates");
    for (const accessor of Object.values(primitive.attributes)) values(accessor);
    const count = position.accessor.count, positions = position.values, normals = normal.values;
    let indices = null;
    if (primitive.indices !== undefined) {
      const decoded = values(primitive.indices); indices = decoded.values;
      assert.equal(decoded.accessor.type, "SCALAR", "Scalar indices"); assert([5121, 5123, 5125].includes(decoded.accessor.componentType), "Unsigned ordinary indices");
      assert(indices.every(index => Number.isInteger(index) && index >= 0 && index < count), "Every triangle index is in range");
    }
    const faceVertices = indices?.length ?? count;
    assert.equal(faceVertices % 3, 0, "Complete triangle triples");
    const matrix = worlds.get(node.index), normalMatrix = new Matrix3().getNormalMatrix(matrix), jointBounds = localBounds.get(node.jointName);
    for (let i = 0; i < positions.length; i += 3) {
      point.fromArray(positions, i); jointBounds.min.min(point); jointBounds.max.max(point);
      point.applyMatrix4(matrix); min.min(point); max.max(point);
      const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]);
      assert(Number.isFinite(length) && length >= .99 && length <= 1.01, "Finite unit vertex normal");
    }
    let nodeOpposition = 0;
    for (let i = 0; i < faceVertices; i += 3) {
      const ia = indices?.[i] ?? i, ib = indices?.[i + 1] ?? i + 1, ic = indices?.[i + 2] ?? i + 2;
      a.fromArray(positions, ia * 3).applyMatrix4(matrix); b.fromArray(positions, ib * 3).applyMatrix4(matrix); c.fromArray(positions, ic * 3).applyMatrix4(matrix);
      face.crossVectors(edge1.copy(b).sub(a), edge2.copy(c).sub(a));
      if (face.lengthSq() < 1e-20) { nearZeroAreaTriangles++; continue; }
      average.set(normals[ia * 3] + normals[ib * 3] + normals[ic * 3], normals[ia * 3 + 1] + normals[ib * 3 + 1] + normals[ic * 3 + 1], normals[ia * 3 + 2] + normals[ib * 3 + 2] + normals[ic * 3 + 2]).applyMatrix3(normalMatrix);
      if (average.lengthSq() > 1e-12 && face.normalize().dot(average.normalize()) < -.05) nodeOpposition++;
    }
    if (nodeOpposition) oppositionByNode.set(doc.nodes[node.index].name, (oppositionByNode.get(doc.nodes[node.index].name) ?? 0) + nodeOpposition);
    normalOppositionCandidates += nodeOpposition;
    triangles += faceVertices / 3; vertices += count; primitives++; materialIds.add(primitive.material);
    parts.push({ node: node.index, joint: node.jointName, positions });
  }
  assert(triangles > 0 && triangles <= contract.authoringBudgets.trianglesMax, "Actual GLB triangle budget");
  assert.equal(nearZeroAreaTriangles, 0, "No zero/near-zero-area exported triangles");
  assert(Math.abs(min.y - contract.footPlane) < tolerance, "Actual neutral foot planeY0");
  assert(Math.abs(max.y - 2.239) < 1e-5 && max.y <= contract.heightMax, "Actual authored height2.239m, below height cap");
  assert(max.x - min.x > .8 && max.z - min.z > .5, "Volume-bearing human silhouette, not a flat sprite");
  for (const name of ["Explorer_leg_L", "Explorer_leg_R"]) {
    const bounds = localBounds.get(name), height = contract.joints.find(joint => joint.name === name).translation[1];
    assert(Math.abs(bounds.min.y + height) < tolerance, `${name}: actual sole vertices are local below hip and worldY0`);
    assert(bounds.max.y < .25 && bounds.max.y > 0, `${name}: leg coordinates are not globally baked`);
  }
  for (const name of ["Explorer_arm_L", "Explorer_arm_R"]) {
    const bounds = localBounds.get(name);
    assert(bounds.min.y < -.55 && bounds.max.y < .25, `${name}: arm coordinates are local below shoulder, not globally baked`);
  }
  return { triangles, vertices, primitives, min, max, parts, localBounds, worlds, materialIds,
    diagnostics: { nearZeroAreaTriangles, normalOppositionCandidates, oppositionByNode: Object.fromEntries(oppositionByNode), interpretation: "Opposition is a diagnostic for review, not a flipped-face verdict or manifold certification" } };
}

function posedBounds(parts, worlds) {
  const min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity), point = new Vector3();
  for (const part of parts) for (let i = 0; i < part.positions.length; i += 3) {
    point.fromArray(part.positions, i).applyMatrix4(worlds.get(part.node));
    assert(point.toArray().every(Number.isFinite), "Finite actual vertex during joint swing"); min.min(point); max.max(point);
  }
  return { min: min.toArray(), max: max.toArray() };
}

function articulation(doc, contract, state, geo, groundLift) {
  const neutralBounds = posedBounds(geo.parts, geo.worlds), poses = [];
  let uncorrectedMinimumY = Infinity, uncorrectedEndpointMinimumY = Infinity, correctedMinimumY = Infinity, maximumLift = 0;
  for (let step = -8; step <= 8; step++) {
    const angle = step / 8 * .68, overrides = new Map(), uncorrected = new Map(), lifts = {};
    for (const [name, direction] of [["Explorer_leg_L", -1], ["Explorer_leg_R", 1]]) {
      const index = state.joints.get(name), p = contract.joints.find(joint => joint.name === name).translation;
      const bounds = geo.localBounds.get(name), box = new Box3(bounds.min.clone(), bounds.max.clone()), before = box.clone();
      const lift = groundLift(box, angle * direction, p[1]);
      assert(Number.isFinite(lift) && lift >= 0, "Actual runtime helper returns finite nonnegative contact lift");
      assert(box.equals(before), "Actual ground-lift helper does not mutate authored bounds");
      if (step === 0) assert(lift < tolerance, `${name}: neutral hip remainsY.73 within Float32 tolerance`);
      maximumLift = Math.max(maximumLift, lift); lifts[name] = lift;
      const rotation = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle * direction);
      uncorrected.set(index, new Matrix4().compose(new Vector3().fromArray(p), rotation, new Vector3(1, 1, 1)));
      overrides.set(index, new Matrix4().compose(new Vector3(p[0], p[1] + lift, p[2]), rotation, new Vector3(1, 1, 1)));
    }
    const worlds = worldMatrices(doc, state, overrides);
    for (const name of ["Explorer_leg_L", "Explorer_leg_R"]) {
      const index = state.joints.get(name), pivot = new Vector3().setFromMatrixPosition(worlds.get(index)), original = new Vector3().setFromMatrixPosition(geo.worlds.get(index));
      assert(Math.abs(pivot.x - original.x) < tolerance && Math.abs(pivot.z - original.z) < tolerance
        && Math.abs(pivot.y - original.y - lifts[name]) < tolerance, `${name}: actual hip pivot translated only by contact lift`);
      assert(Math.abs(worlds.get(index).determinant() - 1) < tolerance, `${name}: rigid non-stretched swing`);
    }
    for (const name of ["Explorer_body", "Explorer_arm_L", "Explorer_arm_R"]) assert.deepEqual(worlds.get(state.joints.get(name)).elements, geo.worlds.get(state.joints.get(name)).elements, `${name}: leg swing cannot move unrelated groups`);
    const bounds = posedBounds(geo.parts, worlds), withoutLift = posedBounds(geo.parts, worldMatrices(doc, state, uncorrected));
    uncorrectedMinimumY = Math.min(uncorrectedMinimumY, withoutLift.min[1]);
    if (Math.abs(step) === 8) uncorrectedEndpointMinimumY = Math.min(uncorrectedEndpointMinimumY, withoutLift.min[1]);
    correctedMinimumY = Math.min(correctedMinimumY, bounds.min[1]);
    assert(bounds.min[1] >= contract.footPlane - tolerance, "Every actual GLB vertex stays above foot plane after the real runtime lift");
    poses.push({ angle: Number(angle.toFixed(4)), appliedLift: lifts, bounds });
  }
  assert(uncorrectedEndpointMinimumY < -.04 && uncorrectedEndpointMinimumY > -.044, "Negative control: actual uncorrected shoe clips by about.042m at stride endpoints");
  assert(uncorrectedMinimumY <= uncorrectedEndpointMinimumY, "Intermediate pose clipping is measured, not assumed from endpoints");
  assert.notDeepEqual(poses[0].bounds, neutralBounds, "Actual leg geometry responds to pivot rotation");
  const returned = worldMatrices(doc, state);
  for (const [index, matrix] of returned) assert.deepEqual(matrix.elements, geo.worlds.get(index).elements, "Exact neutral world matrix after return");
  assert.deepEqual(posedBounds(geo.parts, returned), neutralBounds, "Exact actual neutral bounds after return");
  return { samples: poses.length, axis: "glTF localX", angleRange: [-.68, .68], finiteVertices: "PASS", pivotPolicy: "Only actual contact lift onY; no lateral pivot change or stretch",
    runtimeHelper: "lib/island-explorer.ts::explorerLegGroundLift (actual in-memory transpiled module)", groundPlaneAfterLift: "PASS every actual vertex at17poses",
    uncorrectedMinimumY, uncorrectedEndpointMinimumY, correctedMinimumY, maximumLift, neutralHipY: .73, neutralReturn: "EXACT", endpointBounds: [poses[0], poses.at(-1)],
    interpretation: "Rigid transform/contact-plane check only; conservative lift, live gait, Rapier movement and art still require browser review" };
}

function negativeChecks(doc, bin, contract) {
  const cases = [
    ["root-scale", copy => { copy.nodes.find(node => node.name === contract.root).scale = [2, 2, 2]; }, /root identity/i],
    ["arm-pivot", copy => { copy.nodes.find(node => node.name === "Explorer_arm_L").translation = [-.44, 1.4, 0]; }, /local translation/],
    ["flattened-pivot", copy => { copy.nodes.find(node => node.name === "Explorer_leg_R").name = "Flattened_leg"; }, /exactly one reachable rigid pivot/],
    ["authored-animation", copy => { copy.animations = [{}]; }, /No authored animations/],
    ["skin", copy => { copy.skins = [{}]; }, /No skins/],
    ["decoder", copy => { copy.extensionsUsed = ["KHR_draco_mesh_compression"]; }, /decoder dependency/],
  ];
  const passed = [];
  for (const [name, mutate, expected] of cases) {
    const copy = structuredClone(doc); mutate(copy);
    assert.throws(() => structure(copy, bin, contract), expected, `Reject actual-document corruption: ${name}`); passed.push(name);
  }
  const external = structuredClone(doc); external.images[0].uri = "https://invalid.example/not-requested.png";
  assert.throws(() => imagesAndMaterials(external, bin, contract, new Set()), /external image URI/, "Reject external texture without fetching it"); passed.push("external-image");
  const images = structuredClone(doc); images.images = Array(contract.authoringBudgets.packedImagesMax + 1).fill(doc.images[0]);
  assert.throws(() => imagesAndMaterials(images, bin, contract, new Set()), /image budget/, "Reject embedded-image overbudget"); passed.push("image-budget");
  return passed;
}

const contract = JSON.parse(await readFile(contractPath, "utf8"));
const bytes = await readFile(modelPath);
const { doc, bin } = parse(bytes, contract.authoringBudgets);
const state = structure(doc, bin, contract);
const geo = geometry(doc, bin, contract, state);
const pbr = imagesAndMaterials(doc, bin, contract, geo.materialIds);
const { explorerLegGroundLift } = await import(moduleURL("../lib/island-explorer.ts"));
const poses = articulation(doc, contract, state, geo, explorerLegGroundLift);
const negativeCases = args.includes("--self-test") ? negativeChecks(doc, bin, contract) : [];
console.log(JSON.stringify({ asset: contract.asset, path: fileURLToPath(modelPath), sha256: createHash("sha256").update(bytes).digest("hex"),
  bytes: bytes.length, triangles: geo.triangles, vertices: geo.vertices, meshNodes: state.meshNodes.length, primitives: geo.primitives, ...pbr,
  root: contract.root, rootIdentity: "PASS", hierarchyRestContract: "PASS", boundsMinYUpMetres: geo.min.toArray(), boundsMaxYUpMetres: geo.max.toArray(),
  jointLocalBounds: Object.fromEntries([...geo.localBounds].map(([name, bounds]) => [name, { min: bounds.min.toArray(), max: bounds.max.toArray() }])),
  geometryDiagnostics: geo.diagnostics, articulation: poses, negativeCases,
  status: "STRUCTURE/FINITE RIGID POSE PASS only; no art, assembly-manifold, browser-gait, collision or FPS certification" }, null, 2));
