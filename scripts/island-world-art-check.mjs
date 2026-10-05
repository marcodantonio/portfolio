import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";

// Execute the real art modules and shared map, without a DOM, network, renderer
// or substitute geometry. These are CPU/ownership checks, not a GPU/FPS claim.
const dataURL = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const modules = new Map();
function moduleURL(file) {
  const absolute = new URL(file, import.meta.url);
  if (modules.has(absolute.href)) return modules.get(absolute.href);
  const source = fs.readFileSync(absolute, "utf8");
  let compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  compiled = compiled.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, specifier) => {
    const target = specifier.startsWith(".")
      ? moduleURL(new URL(`${specifier}.ts`, absolute).href)
      : import.meta.resolve(specifier);
    return `from ${JSON.stringify(target)}`;
  });
  const result = dataURL(compiled); modules.set(absolute.href, result);
  return result;
}
const map = await import(moduleURL("../lib/island-map.ts"));
const { SEA_CLIFF_FOUNDATION_Y, getSeaCliffWaterRadius } = await import(moduleURL("../lib/island-coast.ts"));
const { createIslandTerrainArt } = await import(moduleURL("../lib/island-terrain-art.ts"));
const { createIslandVegetation, createPalmFrondGeometry, PALM_MAXIMUM_WIND_OFFSET, isVegetationPocketClear } = await import(moduleURL("../lib/island-vegetation.ts"));
const { createIslandBackdrop } = await import(moduleURL("../lib/island-backdrop.ts"));
const { createIslandWorld } = await import(moduleURL("../lib/island-world.ts"));
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks++; };
const finite = (values) => Array.from(values).every(Number.isFinite);
const pointKey = (x, y, z) => [x, y, z].join(",");

function distanceToSegment(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}

function inspect(art, name) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), instances = new Set();
  let meshes = 0, renderedTriangles = 0, renderedVertices = 0, instanceCount = 0, instanceBytes = 0;
  art.group.updateMatrixWorld(true);
  art.group.traverse((object) => {
    check(finite(object.matrixWorld.elements), `${name}/${object.name}: finite world transform`);
    if (!object.isMesh) return;
    meshes++; geometries.add(object.geometry);
    const list = Array.isArray(object.material) ? object.material : [object.material];
    list.forEach((material) => materials.add(material));
    const geometry = object.geometry, points = geometry.attributes.position;
    check(!!points && points.count > 0, `${name}/${object.name}: real position buffer`);
    for (const [attributeName, attribute] of Object.entries(geometry.attributes)) {
      check(finite(attribute.array), `${name}/${object.name}: finite ${attributeName}`);
      check(attribute.count === points.count, `${name}/${object.name}: matching ${attributeName} count`);
    }
    check(!!geometry.attributes.normal, `${name}/${object.name}: authored normals`);
    const normals = geometry.attributes.normal;
    for (let i = 0; i < normals.count; i++) {
      const length = Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i));
      check(length > .9 && length < 1.1, `${name}/${object.name}: unit normal ${i}`);
    }
    if (geometry.index) check(Array.from(geometry.index.array).every((i) => Number.isInteger(i) && i >= 0 && i < points.count), `${name}/${object.name}: valid indices`);
    const triangleCount = geometry.index?.count ?? points.count;
    check(triangleCount % 3 === 0, `${name}/${object.name}: complete triangles`);
    const multiplier = object.isInstancedMesh ? object.count : 1;
    renderedTriangles += triangleCount / 3 * multiplier; renderedVertices += points.count * multiplier;
    if (object.isInstancedMesh) {
      instances.add(object); instanceCount += object.count;
      check(Number.isInteger(object.count) && object.count > 0, `${name}/${object.name}: real instances`);
      check(finite(object.instanceMatrix.array), `${name}/${object.name}: finite instance transforms`);
      if (object.instanceColor) check(finite(object.instanceColor.array), `${name}/${object.name}: finite instance colors`);
      instanceBytes += object.instanceMatrix.array.byteLength + (object.instanceColor?.array.byteLength ?? 0);
      check(!!object.boundingBox && !object.boundingBox.isEmpty(), `${name}/${object.name}: instanced culling bounds`);
      check(Number.isFinite(object.boundingSphere?.radius) && object.boundingSphere.radius > 0, `${name}/${object.name}: finite instance sphere`);
    }
  });
  // Path-map ownership lives in a shader closure. Capture actual hook uniforms
  // without pretending that a source-level hook invocation compiles on WebGL.
  const shaders = [];
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
    material.onBeforeCompile(shader, undefined); shaders.push(shader);
    for (const { value } of Object.values(shader.uniforms)) if (value?.isTexture) textures.add(value);
  }
  let geometricBufferBytes = 0, textureCPUBytes = 0;
  for (const geometry of geometries) {
    for (const attribute of Object.values(geometry.attributes)) geometricBufferBytes += attribute.array.byteLength;
    geometricBufferBytes += geometry.index?.array.byteLength ?? 0;
  }
  for (const texture of textures) textureCPUBytes += texture.image?.data?.byteLength ?? 0;
  const counters = { geometries: 0, materials: 0, textures: 0, instances: 0 };
  for (const [collection, category] of [[geometries, "geometries"], [materials, "materials"], [textures, "textures"], [instances, "instances"]]) {
    collection.forEach((resource) => resource.addEventListener("dispose", () => counters[category]++));
  }
  return {
    geometries, materials, textures, shaders,
    stats: { meshes, uniqueGeometries: geometries.size, materials: materials.size, textures: textures.size,
      instances: instanceCount, renderedTriangles, renderedVertices, geometricBufferBytes,
      instanceBufferBytes: instanceBytes, combinedGeometricCPUBytes: geometricBufferBytes + instanceBytes, textureCPUBytes },
    dispose() {
      art.dispose();
      for (const [category, expected] of [["geometries", geometries.size], ["materials", materials.size], ["textures", textures.size], ["instances", instances.size]]) {
        check(counters[category] === expected, `${name}: each owned ${category} disposed once (${counters[category]}/${expected})`);
      }
      check(art.group.children.length === 0, `${name}: detached scene`);
      const first = { ...counters }; art.dispose();
      check(JSON.stringify(counters) === JSON.stringify(first), `${name}: idempotent disposal`);
    },
  };
}

function closedLeaf(geometry, name) {
  const points = geometry.attributes.position, edges = new Map();
  const count = geometry.index?.count ?? points.count;
  const point = (i) => new THREE.Vector3().fromBufferAttribute(points, i);
  // Weld geometric seams for the nonindexed extrusion, not index topology.
  const key = (i) => [points.getX(i), points.getY(i), points.getZ(i)].map((value) => Math.round(value * 1e5)).join(",");
  let signedVolume = 0;
  for (let triangle = 0; triangle < count; triangle += 3) {
    const ids = [0, 1, 2].map((offset) => geometry.index ? geometry.index.getX(triangle + offset) : triangle + offset);
    const [a, b, c] = ids.map(point);
    check(b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() > 1e-16, `${name}: nondegenerate face ${triangle / 3}`);
    signedVolume += a.dot(b.clone().cross(c)) / 6;
    for (let i = 0; i < 3; i++) {
      const edge = [key(ids[i]), key(ids[(i + 1) % 3])].sort().join("|");
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  check([...edges.values()].every((references) => references === 2), `${name}: closed two-manifold blade, including real holes`);
  check(signedVolume > 0, `${name}: outward winding and real volume`);
  return { triangles: count / 3, signedVolume, boundaryEdges: 0, degenerateFaces: 0 };
}

// Derive separate solids from the actual index graph: diagnostic metadata alone
// cannot prove a blade has leaflets, sealed tips, or correctly oriented faces.
function pinnateSolids(geometry, compact, name) {
  const points = geometry.attributes.position, normals = geometry.attributes.normal;
  const coordinates = geometry.attributes.palmLeafUV, index = geometry.index;
  check(!!index && index.count % 3 === 0, `${name}: indexed complete triangles`);
  check(!!coordinates && coordinates.itemSize === 4 && coordinates.count === points.count, `${name}: real botanical coordinates`);
  check(!!normals && normals.count === points.count, `${name}: real matching normals`);
  for (const attribute of Object.values(geometry.attributes)) check(finite(attribute.array), `${name}: finite vertex attributes`);
  for (let i = 0; i < points.count; i++) {
    const n = Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i));
    check(n > .999 && n < 1.001, `${name}: normalized normal ${i}`);
    check([coordinates.getX(i), coordinates.getY(i), coordinates.getZ(i)].every((value) => value >= 0 && value <= 1), `${name}: bounded vein and wind weights ${i}`);
  }
  const parent = Array.from({ length: points.count }, (_, i) => i);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const shade = new THREE.Vector3(), normalPart = new THREE.Vector3();
  let minimumNormalAlignment = 1;
  const root = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    check(ids.every((id) => Number.isInteger(id) && id >= 0 && id < points.count), `${name}: valid triangle index ${i / 3}`);
    a.fromBufferAttribute(points, ids[0]); b.fromBufferAttribute(points, ids[1]); c.fromBufferAttribute(points, ids[2]);
    const face = b.sub(a).cross(c.sub(a)).normalize();
    shade.set(0, 0, 0); ids.forEach((id) => shade.add(normalPart.fromBufferAttribute(normals, id)));
    const alignment = face.dot(shade.normalize());
    check(alignment > 0, `${name}: outward smooth normals match actual face ${i / 3}`);
    minimumNormalAlignment = Math.min(minimumNormalAlignment, alignment);
    parent[root(ids[1])] = root(ids[0]); parent[root(ids[2])] = root(ids[0]);
  }
  const groups = new Map();
  for (let i = 0; i < index.count; i += 3) {
    const id = root(index.getX(i)), group = groups.get(id) ?? [];
    group.push(index.getX(i), index.getX(i + 1), index.getX(i + 2)); groups.set(id, group);
  }
  const solids = [];
  for (const ids of groups.values()) {
    const kinds = new Set(ids.map((i) => coordinates.getW(i)));
    check(kinds.size === 1 && (kinds.has(0) || kinds.has(1)), `${name}: distinct rachis/leaflet volume`);
    const solid = new THREE.BufferGeometry(); solid.setAttribute("position", points); solid.setIndex(ids);
    let topology;
    try { topology = closedLeaf(solid, `${name}/solid-${solids.length}`); } finally { solid.dispose(); }
    const directed = new Map();
    for (let i = 0; i < ids.length; i += 3) for (let side = 0; side < 3; side++) {
      const a = ids[i + side], b = ids[i + (side + 1) % 3], edge = `${Math.min(a, b)}:${Math.max(a, b)}`;
      directed.set(edge, (directed.get(edge) ?? 0) + (a < b ? 1 : -1));
    }
    check([...directed.values()].every((value) => value === 0), `${name}: mutually opposite edge winding per solid`);
    solids.push({ kind: kinds.has(0) ? "rachis" : "leaflet", ids, ...topology });
  }
  const leaflets = solids.filter((solid) => solid.kind === "leaflet"), rachis = solids.filter((solid) => solid.kind === "rachis");
  check(rachis.length === 1, `${name}: one solid structural rachis`);
  check(leaflets.length === (compact ? 16 : 24), `${name}: real paired pinnate leaflets`);
  check(leaflets.every((solid) => solid.triangles === (compact ? 48 : 72)), `${name}: contained closed-leaflet triangle budget`);
  check(index.count / 3 === (compact ? 848 : 1872), `${name}: contained complete-frond budget`);
  const rachisGeometry = new THREE.BufferGeometry(); rachisGeometry.setAttribute("position", points); rachisGeometry.setIndex(rachis[0].ids);
  const probeMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), rachisMesh = new THREE.Mesh(rachisGeometry, probeMaterial);
  const probeDirection = new THREE.Vector3(.73, .41, .55).normalize(), origin = new THREE.Vector3();
  rachisMesh.updateMatrixWorld(true);
  try {
    for (const leaflet of leaflets) {
      const base = [...new Set(leaflet.ids)].filter((i) => coordinates.getX(i) === 0);
      check(base.length === 1, `${name}: one real petiole root per leaflet`);
      origin.fromBufferAttribute(points, base[0]);
      const hits = new THREE.Raycaster(origin, probeDirection).intersectObject(rachisMesh, false);
      check(hits.length % 2 === 1, `${name}: petiole root lies inside the actual solid rachis, not floating beside it`);
    }
  } finally { rachisGeometry.dispose(); probeMaterial.dispose(); }
  return { solids, leaflets: leaflets.length, triangleCount: index.count / 3, minimumNormalAlignment };
}

function palmCrownEnvelope(geometry, scale, yaw, pitch, name) {
  const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, yaw, pitch));
  const point = new THREE.Vector3(), points = geometry.attributes.position, radius = 3.4 * scale;
  // These are the CURRENT analytic overview guards, not enlarged test bounds.
  for (let i = 0; i < points.count; i++) {
    point.fromBufferAttribute(points, i).applyMatrix4(rotation);
    check(Math.abs(point.x) <= radius && Math.abs(point.z) <= radius, `${name}: crown XZ guard ${i}`);
    check(point.y - PALM_MAXIMUM_WIND_OFFSET >= -radius * .3
      && point.y + PALM_MAXIMUM_WIND_OFFSET <= radius * .45, `${name}: crown Y/wind guard ${i}`);
  }
}

function palmFrondContract(geometry, compact) {
  const name = `palm-frond/${compact}`, topology = pinnateSolids(geometry, compact, name);
  const whole = closedLeaf(geometry, name), copy = createPalmFrondGeometry(3, .6, compact);
  try {
    for (const [key, attribute] of Object.entries(geometry.attributes)) check(Buffer.from(attribute.array.buffer).equals(Buffer.from(copy.attributes[key].array.buffer)), `${name}: deterministic ${key}`);
    check(Buffer.from(geometry.index.array.buffer).equals(Buffer.from(copy.index.array.buffer)), `${name}: deterministic topology`);
  } finally { copy.dispose(); }
  const opened = geometry.clone(), flat = geometry.clone(), reversed = geometry.clone(), detached = geometry.clone(), missingCoordinates = geometry.clone(), reversedNormals = geometry.clone();
  try {
    opened.setIndex(Array.from(geometry.index.array).slice(0, -3));
    check(assert.throws(() => pinnateSolids(opened, compact, `${name}/opened`)) === undefined, `${name}: missing tip face rejected`);
    flat.scale(1, 1, 0);
    check(assert.throws(() => pinnateSolids(flat, compact, `${name}/flat`)) === undefined, `${name}: flattened card rejected`);
    const reversedIds = Array.from(reversed.index.array), leaflet = topology.solids.find((solid) => solid.kind === "leaflet");
    for (let i = 0; i < reversedIds.length; i += 3) if (leaflet.ids.includes(reversedIds[i])) [reversedIds[i + 1], reversedIds[i + 2]] = [reversedIds[i + 2], reversedIds[i + 1]];
    reversed.setIndex(reversedIds);
    check(assert.throws(() => pinnateSolids(reversed, compact, `${name}/reversed`)) === undefined, `${name}: inward leaflet rejected independently of positive overall volume`);
    for (const i of new Set(leaflet.ids)) detached.attributes.position.setZ(i, detached.attributes.position.getZ(i) + .3);
    check(assert.throws(() => pinnateSolids(detached, compact, `${name}/detached`)) === undefined, `${name}: disconnected petiole rejected despite closed outward geometry`);
    missingCoordinates.deleteAttribute("palmLeafUV");
    check(assert.throws(() => pinnateSolids(missingCoordinates, compact, `${name}/missing-uv`)) === undefined, `${name}: incompatible leaf batch rejected`);
    const reversedNormal = reversedNormals.attributes.normal;
    for (let i = 0; i < reversedNormal.array.length; i++) reversedNormal.array[i] *= -1;
    check(assert.throws(() => pinnateSolids(reversedNormals, compact, `${name}/inward-normals`)) === undefined,
      `${name}: inward shading rejected despite correct position/index/closed volume`);
  } finally { [opened, flat, reversed, detached, missingCoordinates, reversedNormals].forEach((fixture) => fixture.dispose()); }
  const scales = [...new Set([.8, ...map.WORLD_PROPS.filter((prop) => prop.kind === "palm").map((prop) => prop.scale)])];
  for (const scale of scales) {
    const largest = createPalmFrondGeometry(2.97 * scale, .67 * scale, compact);
    try { for (const pitch of [-.085, -.055, -.025, .16]) for (const yaw of [0, Math.PI / 4, Math.PI / 2]) palmCrownEnvelope(largest, scale, yaw, pitch, `${name}/scale-${scale}`); }
    finally { largest.dispose(); }
  }
  const excessive = createPalmFrondGeometry(5, .6, compact);
  try { check(assert.throws(() => palmCrownEnvelope(excessive, 1, 0, .16, `${name}/oversized`)) === undefined, `${name}: oversized frond guard rejected`); }
  finally { excessive.dispose(); }
  for (const [length, width] of [[0, .6], [3, 0], [-1, .6], [Infinity, .6], [3, NaN]]) check(assert.throws(() => createPalmFrondGeometry(length, width, compact), RangeError) === undefined, `${name}: invalid dimensions rejected`);
  return { ...whole, pairedLeaflets: topology.leaflets, independentClosedSolids: topology.solids.length,
    minimumNormalAlignment: topology.minimumNormalAlignment,
    maximumWindOffset: PALM_MAXIMUM_WIND_OFFSET, crownGuardsPreserved: true,
    negatives: ["open tip", "flattened card", "inward leaflet", "inward smooth normals", "detached petiole", "missing botanical coordinates", "oversized crown", "invalid dimensions"] };
}

const palmWindOwners = new WeakSet();
async function palmWorldContract(compact) {
  // Real world and real fallback geometry, with seven explicitly held-off GLB
  // responses. No browser/network/renderer is used or implied by this check.
  const originalFetch = globalThis.fetch; let world, requests = [];
  try {
    globalThis.fetch = async url => { requests.push(String(url)); return new Response(null, { status: 404 }); };
    world = createIslandWorld({ compact });
  } finally { globalThis.fetch = originalFetch; }
  const meshes = [];
  world.group.updateMatrixWorld(true);
  world.group.traverse((object) => {
    if (object.isMesh && ["island-pinnate-palm-leaf-v2", "island-continuous-palm-bark-v1"].includes(object.material.customProgramCacheKey())) meshes.push(object);
  });
  // Observe the actual owned palm resources without reparenting the scene or
  // requiring unrelated ocean render-target/browser lifecycle assertions.
  const view = { group: { traverse: (fn) => meshes.forEach(fn), updateMatrixWorld: () => world.group.updateMatrixWorld(true), children: world.group.children }, dispose: world.dispose };
  let audit, buildingOwners = [];
  try {
    // Settle only local resolved 404 promises. This is not a browser readiness
    // test, and cannot certify images, shaders or an actual GLB success path.
    await new Promise(resolve => setImmediate(resolve));
    const expectedRequests = ["studio-v2", "workshop-v1", "archive-v1", "suspended-lab-v1", "welcome-harbor-v1", "dance-pavilion-v1", "contact-lighthouse-v1"]
      .map(id => `/models/archipelago/${id}-batched.glb`).sort();
    check(requests.length === 7 && new Set(requests).size === 7
      && JSON.stringify([...requests].sort()) === JSON.stringify(expectedRequests), `palm-world/${compact}: seven distinct exact building requests isolated from the network`);
    world.group.traverse(object => { if (object.name.startsWith("Imported reference-led asset:")) buildingOwners.push(object); });
    const expectedOwners = ["studio-v2", "workshop", "archive", "laboratory", "harbor", "dance", "lighthouse"]
      .map(id => `Imported reference-led asset: ${id}`).sort();
    check(buildingOwners.length === 7 && new Set(buildingOwners).size === 7
      && JSON.stringify(buildingOwners.map(owner => owner.name).sort()) === JSON.stringify(expectedOwners)
      && buildingOwners.every(owner => owner.userData.assetState === "fallback"),
      `palm-world/${compact}: all seven independent actual owners reach CPU-only fallback, not just seven attempted requests`);
    check(buildingOwners.some(owner => owner.name === "Imported reference-led asset: lighthouse")
      && world.group.getObjectByName("Architecture: contact")?.visible,
      `palm-world/${compact}: new Contact owner retains its real visible fallback under isolated local 404`);
    check(world.lighthouseState() === "fallback" && buildingOwners.every(owner => world.getOverviewRoots().includes(owner)),
      `palm-world/${compact}: seventh owner exposes its real state and all seven roots participate in overview fitting`);
    check(world.consumeArtChange() === true && world.consumeArtChange() === false,
      `palm-world/${compact}: one pass consumes all seven actual dirty owners without short-circuiting`);
    check(meshes.length === 3, `palm-world/${compact}: both foliage batches and one continuous bark batch really render`);
    audit = inspect(view, `palm-world/${compact}`);
    const leaves = meshes.filter((mesh) => mesh.geometry.attributes.palmLeafUV), bark = meshes.filter((mesh) => mesh.geometry.attributes.palmBarkUV);
    check(leaves.length === 2 && bark.length === 1, `palm-world/${compact}: compatible dedicated botanical attributes`);
    for (const mesh of meshes) {
      check(!!mesh.geometry.index, `palm-world/${compact}: no duplicate flattened palm upload`);
      check(mesh.material.side === THREE.FrontSide && !mesh.material.transparent && mesh.material.alphaTest === 0, `palm-world/${compact}: real single-sided solids, not alpha cards`);
    }
    const leafShaders = audit.shaders.filter((shader) => shader.uniforms.palmWindTime), uniforms = leafShaders.map((shader) => shader.uniforms.palmWindTime);
    check(uniforms.length === 2 && uniforms[0] === uniforms[1], `palm-world/${compact}: both crown palettes share one owned wind uniform`);
    check(!palmWindOwners.has(uniforms[0]), `palm-world/${compact}: no shared wind state between world owners`); palmWindOwners.add(uniforms[0]);
    check(leafShaders.every((shader) => shader.vertexShader.includes("- sin(palmRestPhase)")
      && shader.vertexShader.includes(`* ${PALM_MAXIMUM_WIND_OFFSET / 2} * palmLeafUV.z * palmLeafUV.z * palmLeafUV.x`)
      && shader.fragmentShader.includes("fwidth(vPalmLeafUV.y)")), `palm-world/${compact}: neutral-rest bounded wind and filtered leaflet veins are installed`);
    check(audit.shaders.some((shader) => shader.fragmentShader.includes("fwidth(palmRingCoord)") && shader.fragmentShader.includes("fwidth(palmFibreCoord)")), `palm-world/${compact}: bark detail is fragment-filtered`);
    world.update(12.5, false); check(uniforms[0].value === 12.5, `palm-world/${compact}: ambient wind follows world time`);
    world.update(12.5, true); check(uniforms[0].value === 0, `palm-world/${compact}: reduced motion restores the unbent rest pose`);
    const count = map.WORLD_PROPS.filter((prop) => prop.kind === "palm").length + 3;
    const triangles = (list) => list.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);
    check(triangles(leaves) === count * (compact ? 9 * 848 : 11 * 1872), `palm-world/${compact}: actual merged crown triangle budget`);
    check(triangles(bark) === count * 7 * 48, `palm-world/${compact}: actual shared seven-segment trunk budget`);
    const coconut = new THREE.SphereGeometry(1, compact ? 8 : 12, compact ? 6 : 8);
    const coconutTriangles = coconut.index.count / 3; coconut.dispose();
    return { ...audit.stats, palms: count, foliageTriangles: triangles(leaves), trunkTriangles: triangles(bark),
      includingUnchangedCoconuts: triangles(leaves) + triangles(bark) + count * 3 * coconutTriangles,
      glbLoading: "seven independent CPU-only 404 fixtures; not browser asset acceptance", buildingRequests: requests,
      fallbackOwners: buildingOwners.map(owner => owner.name) };
  } finally {
    if (audit) audit.dispose(); else world.dispose();
    check(buildingOwners.length === 7 && buildingOwners.every(owner => owner.userData.assetState === "disposed" && owner.children.length === 0)
      && world.lighthouseState() === "disposed", `palm-world/${compact}: all seven actual asset owners cleanly dispose with the world`);
  }
}

// Probe the actual rendered cliff triangles, not diagnostic metadata or the
// authoring formula. Rays stop at the territory centre, so an opposite wall
// cannot conceal a missing near-side coast. Mid-sector bearings avoid treating
// an exact shared-edge Float32 coincidence as proof of a continuous wall.
const SEA_CLIFF_PROBE_OFFSETS = [-.2, .2, -1];
const COAST_FLOAT32_TOLERANCE = 1e-4;
function coastalProbes(territory, source, cliff) {
  const positions = cliff.geometry.attributes.position, worldPoint = new THREE.Vector3();
  let outerRadius = 0;
  for (let i = 0; i < positions.count; i++) {
    worldPoint.fromBufferAttribute(positions, i).applyMatrix4(cliff.matrixWorld);
    outerRadius = Math.max(outerRadius, Math.hypot(worldPoint.x - territory.x, worldPoint.z - territory.z));
  }
  const first = source.vertices.length / 3 - map.TERRAIN_ANGULAR_SEGMENTS;
  return Array.from({ length: map.TERRAIN_ANGULAR_SEGMENTS }, (_, sector) => {
    const a = (first + sector) * 3, b = (first + (sector + 1) % map.TERRAIN_ANGULAR_SEGMENTS) * 3;
    const dx = (source.vertices[a] + source.vertices[b]) / 2 - territory.x;
    const dz = (source.vertices[a + 2] + source.vertices[b + 2]) / 2 - territory.z;
    const rimRadius = Math.hypot(dx, dz), outward = new THREE.Vector3(dx / rimRadius, 0, dz / rimRadius);
    const ray = new THREE.Raycaster(new THREE.Vector3(), outward.clone().negate(), 0, outerRadius + 4);
    return { sector, rimRadius, outward, ray, outerRadius: outerRadius + 4 };
  });
}

function seaCliffHit(territory, mesh, probe, y) {
  probe.ray.ray.origin.set(territory.x + probe.outward.x * probe.outerRadius, y,
    territory.z + probe.outward.z * probe.outerRadius);
  const hit = probe.ray.intersectObject(mesh, false)[0];
  return hit ? { radius: Math.hypot(hit.point.x - territory.x, hit.point.z - territory.z), point: hit.point } : null;
}

function cliffFixture(cliff, geometry, lift = 0) {
  const fixture = new THREE.Mesh(geometry, cliff.material);
  fixture.matrixAutoUpdate = false;
  fixture.matrix.copy(new THREE.Matrix4().makeTranslation(0, lift, 0).multiply(cliff.matrixWorld));
  fixture.updateMatrixWorld(true);
  return fixture;
}

function cliffContinuityNegatives(territory, cliff, probes) {
  // Raising a real coast 10 m exposes air below its formerly submerged foot.
  // This shares the original geometry/material without mutating or disposing
  // the art owner's resources, and proves the water probes can detect a gap.
  const lifted = cliffFixture(cliff, cliff.geometry, 10), probe = probes[0];
  for (const offset of [-.2, -1]) {
    check(seaCliffHit(territory, lifted, probe, map.WATER_LEVEL + offset) === null,
      `terrain/${territory.id}: lifted-coast negative exposes air at water${offset}`);
  }
  // A narrowed but still continuous wall must be rejected by the footprint
  // invariant, independently of foundation depth or basic hit coverage.
  const narrowed = cliffFixture(cliff, cliff.geometry);
  narrowed.matrix.premultiply(new THREE.Matrix4().makeTranslation(territory.x, 0, territory.z)
    .multiply(new THREE.Matrix4().makeScale(.6, 1, .6))
    .multiply(new THREE.Matrix4().makeTranslation(-territory.x, 0, -territory.z)));
  narrowed.updateMatrixWorld(true);
  const narrowedHit = seaCliffHit(territory, narrowed, probe, map.WATER_LEVEL - .2);
  check(!!narrowedHit && narrowedHit.radius < probe.rimRadius - COAST_FLOAT32_TOLERANCE,
    `terrain/${territory.id}: narrowed-foot negative has a hit but fails rim footprint`);

  // Remove all actual triangles crossing one near-side probe at the checked
  // heights. A small angular opening must fail even if other sectors, shared
  // rim vertices and the minimum foundation height remain intact.
  const geometry = cliff.geometry, points = geometry.attributes.position;
  const count = geometry.index?.count ?? points.count, kept = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), intersection = new THREE.Vector3();
  const rays = SEA_CLIFF_PROBE_OFFSETS.map((offset) => new THREE.Ray(
    new THREE.Vector3(territory.x + probe.outward.x * probe.outerRadius, map.WATER_LEVEL + offset,
      territory.z + probe.outward.z * probe.outerRadius), probe.outward.clone().negate()));
  let removed = 0;
  for (let face = 0; face < count; face += 3) {
    const ids = [0, 1, 2].map((offset) => geometry.index ? geometry.index.getX(face + offset) : face + offset);
    a.fromBufferAttribute(points, ids[0]).applyMatrix4(cliff.matrixWorld);
    b.fromBufferAttribute(points, ids[1]).applyMatrix4(cliff.matrixWorld);
    c.fromBufferAttribute(points, ids[2]).applyMatrix4(cliff.matrixWorld);
    if (rays.some((ray) => ray.intersectTriangle(a, b, c, false, intersection)
      && ray.origin.distanceTo(intersection) <= probe.outerRadius + COAST_FLOAT32_TOLERANCE)) removed++;
    else kept.push(...ids);
  }
  check(removed > 0 && kept.length > 0, `terrain/${territory.id}: negative fixture removes real coast faces only`);
  const openedGeometry = geometry.clone();
  try {
    openedGeometry.setIndex(kept);
    const opened = cliffFixture(cliff, openedGeometry);
    for (const offset of SEA_CLIFF_PROBE_OFFSETS) {
      check(seaCliffHit(territory, opened, probe, map.WATER_LEVEL + offset) === null,
        `terrain/${territory.id}: missing-face negative detects a sea-level opening at water${offset}`);
    }
  } finally { openedGeometry.dispose(); }
  return { liftedBelowWaterMisses: 2, narrowedFootRejected: true,
    removedFaces: removed, openedSectorMisses: SEA_CLIFF_PROBE_OFFSETS.length };
}

function groundedCliffContract(territory, source, cliff) {
  const bounds = new THREE.Box3().setFromObject(cliff), probes = coastalProbes(territory, source, cliff);
  check(!bounds.isEmpty() && finite([...bounds.min.toArray(), ...bounds.max.toArray()]),
    `terrain/${territory.id}: actual finite coastal bounds`);
  if (territory.floating) {
    check(territory.id === "skills", "terrain: Skills alone retains the floating exception");
    check(Math.abs(bounds.min.y - (territory.elevation - 17.5)) <= COAST_FLOAT32_TOLERANCE,
      "terrain/skills: suspended underside retains actual 20.5 m foundation");
    check(bounds.min.y > map.WATER_LEVEL + 15, "terrain/skills: underside remains clearly separated from sea");
    for (const probe of probes) for (const offset of SEA_CLIFF_PROBE_OFFSETS) {
      check(seaCliffHit(territory, cliff, probe, map.WATER_LEVEL + offset) === null,
        `terrain/skills: no grounded sea cliff at sector ${probe.sector}, water${offset}`);
    }
    return { territory: territory.id, floating: true, actualFoundationY: bounds.min.y,
      seaLevelMisses: probes.length * SEA_CLIFF_PROBE_OFFSETS.length,
      historicalDecorativeBufferParity: "not asserted: no pre-change snapshot" };
  }
  check(bounds.min.y <= map.WATER_LEVEL - 8 + COAST_FLOAT32_TOLERANCE,
    `terrain/${territory.id}: actual foundation extends at least eight metres below water`);
  check(Math.abs(bounds.min.y - SEA_CLIFF_FOUNDATION_Y) <= COAST_FLOAT32_TOLERANCE,
    `terrain/${territory.id}: actual foundation matches the shared art-only sea-cliff base`);
  let minimumSeaFootOffset = Infinity, maximumSeaFootOffset = -Infinity, maximumSharedSeaContactError = 0, foundationHits = 0;
  for (const probe of probes) {
    for (const offset of SEA_CLIFF_PROBE_OFFSETS) {
      const hit = seaCliffHit(territory, cliff, probe, map.WATER_LEVEL + offset);
      check(!!hit, `terrain/${territory.id}: continuous sea cliff at sector ${probe.sector}, water${offset}`);
      const footOffset = hit.radius - probe.rimRadius;
      check(footOffset >= -COAST_FLOAT32_TOLERANCE,
        `terrain/${territory.id}: sea foot never narrower than rim at sector ${probe.sector}, water${offset} (${footOffset})`);
      minimumSeaFootOffset = Math.min(minimumSeaFootOffset, footOffset);
      maximumSeaFootOffset = Math.max(maximumSeaFootOffset, footOffset);
    }
    check(!!seaCliffHit(territory, cliff, probe, map.WATER_LEVEL - 8),
      `terrain/${territory.id}: submerged foundation is continuous at sector ${probe.sector}`);
    foundationHits++;
    const waterHit = seaCliffHit(territory, cliff, probe, map.WATER_LEVEL);
    check(!!waterHit, `terrain/${territory.id}: actual sea contact at sector ${probe.sector}`);
    const sharedRadius = getSeaCliffWaterRadius(territory, Math.atan2(probe.outward.z, probe.outward.x));
    const seaContactError = Math.abs(waterHit.radius - sharedRadius);
    check(Number.isFinite(sharedRadius) && seaContactError <= .4,
      `terrain/${territory.id}: shared foam contact agrees with real triangles at sector ${probe.sector} (${seaContactError} m)`);
    maximumSharedSeaContactError = Math.max(maximumSharedSeaContactError, seaContactError);
  }
  return { territory: territory.id, floating: false, actualFoundationY: bounds.min.y,
    checkedSectors: probes.length, seaLevelOffsets: SEA_CLIFF_PROBE_OFFSETS,
    seaLevelHits: probes.length * SEA_CLIFF_PROBE_OFFSETS.length, foundationHits,
    minimumSeaFootOffset, maximumSeaFootOffset, maximumSharedSeaContactError,
    negatives: cliffContinuityNegatives(territory, cliff, probes) };
}

function naturalBeachContract(territory, source, top, cliff, art) {
  if (territory.floating) return null;
  const first = source.vertices.length / 3 - map.TERRAIN_ANGULAR_SEGMENTS;
  const sandy = (colors, i) => colors.getX(i) > colors.getY(i)
    && colors.getY(i) > colors.getZ(i) && colors.getX(i) - colors.getZ(i) > .2;
  const rimHeight = (vertices) => Array.from({ length: map.TERRAIN_ANGULAR_SEGMENTS }, (_, sector) =>
    vertices[(first + sector) * 3 + 1] - map.WATER_LEVEL);
  const validRim = (vertices) => rimHeight(vertices).every((height) => height >= .3 && height <= .8);
  check(validRim(source.vertices), `terrain/${territory.id}: real shoreline stays 0.3–0.8 metres above sea, not a high plateau`);
  const heights = rimHeight(source.vertices), colors = top.geometry.attributes.color;
  for (let i = first; i < source.vertices.length / 3; i++) {
    check(sandy(colors, i), `terrain/${territory.id}: real shared rim vertex ${i - first} has sand pigment, not a green collar`);
  }
  const points = cliff.geometry.attributes.position, coastColors = cliff.geometry.attributes.color;
  let dryToeVertices = 0;
  for (let i = 0; i < points.count; i++) if (points.getY(i) >= map.WATER_LEVEL) {
    check(sandy(coastColors, i), `terrain/${territory.id}: emerged toe vertex ${i} joins the sandy beach`);
    dryToeVertices++;
  }
  check(dryToeVertices > 0, `terrain/${territory.id}: actual emerged sandy toe exists`);
  check(!art.group.getObjectByName(`Local trailing cliff vegetation: ${territory.id}`),
    `terrain/${territory.id}: low beach has no hanging vines dipping into water`);
  // Height/pigment fixtures keep these new assertions capable of rejecting the
  // previous raised-rim/green-collar look rather than merely counting objects.
  const raised = source.vertices.slice();
  for (let i = first; i < raised.length / 3; i++) raised[i * 3 + 1] += 8;
  check(!validRim(raised), `terrain/${territory.id}: elevated-rim negative is rejected`);
  const green = colors.clone();
  green.setXYZ(first, .12, .48, .1);
  check(!sandy(green, first), `terrain/${territory.id}: green-rim negative is rejected`);
  return { minimumRimAboveSea: Math.min(...heights), maximumRimAboveSea: Math.max(...heights),
    sandyRimVertices: map.TERRAIN_ANGULAR_SEGMENTS, dryToeVertices, hangingCoastFoliage: false,
    elevatedRimRejected: true, greenRimRejected: true };
}

function groundSurfaceContract(geometry, name) {
  const surface = geometry.attributes.groundSurface, points = geometry.attributes.position;
  check(!!surface && surface.itemSize === 3 && surface.count === points.count,
    `${name}: real per-vertex clearing/planted/beach mask`);
  check(finite(surface.array) && surface.array.every((value) => value >= 0 && value <= 1),
    `${name}: finite normalized surface channels`);
  check(surface.array.some((value) => value > .1) && surface.array.some((value) => value < .1),
    `${name}: differentiated actual ground, not a uniform material flag`);
}

function terrainContract(art, audit, compact) {
  const topMeshes = art.group.children.filter((object) => object.name.startsWith("Continuous terrain:"));
  check(topMeshes.length === map.TERRITORIES.length, "terrain: six physical surfaces, not nine semantic areas");
  const groundedCoasts = [];
  check(map.TERRITORIES.filter((territory) => !territory.floating).length === 5, "terrain: five sea-grounded territories");
  check(map.TERRAIN_ANGULAR_SEGMENTS === 96, "terrain: unchanged 96 shared coastal sectors");
  for (const territory of map.TERRITORIES) {
    const source = map.getTerrainMesh(territory), top = art.group.getObjectByName(`Continuous terrain: ${territory.id}`);
    check(!!top, `terrain/${territory.id}: shared top exists`);
    check(top.geometry.attributes.position.array.length === source.vertices.length, `terrain/${territory.id}: shared top size`);
    check(top.geometry.attributes.position.array.every((value, i) => value === source.vertices[i]), `terrain/${territory.id}: Float32-identical Rapier positions`);
    check(top.geometry.index.array.length === source.indices.length, `terrain/${territory.id}: shared index count`);
    check(top.geometry.index.array.every((value, i) => value === source.indices[i]), `terrain/${territory.id}: identical Rapier topology`);
    groundSurfaceContract(top.geometry, `terrain/${territory.id}`);
    // These negative controls exercise the same actual geometry contract; they
    // do not claim shader compilation or artistic quality from source hooks.
    const groundSurface = top.geometry.attributes.groundSurface;
    top.geometry.deleteAttribute("groundSurface");
    try { check(assert.throws(() => groundSurfaceContract(top.geometry, "ground/missing")) === undefined,
      "terrain: missing ground-use channels rejected"); }
    finally { top.geometry.setAttribute("groundSurface", groundSurface); }
    const original = groundSurface.array[0]; groundSurface.array[0] = 1.1;
    try { check(assert.throws(() => groundSurfaceContract(top.geometry, "ground/unbounded")) === undefined,
      "terrain: unbounded ground-use channel rejected"); }
    finally { groundSurface.array[0] = original; }
    const cliff = art.group.getObjectByName(`Fractured coastal mass: ${territory.id}`);
    check(!!cliff, `terrain/${territory.id}: coastal volume exists`);
    const positions = cliff.geometry.attributes.position, coastPoints = new Set();
    for (let i = 0; i < positions.count; i++) coastPoints.add(pointKey(positions.getX(i), positions.getY(i), positions.getZ(i)));
    const first = source.vertices.length / 3 - map.TERRAIN_ANGULAR_SEGMENTS;
    for (let i = first; i < source.vertices.length / 3; i++) check(coastPoints.has(pointKey(...source.vertices.slice(i * 3, i * 3 + 3))), `terrain/${territory.id}: unbroken shared rim vertex ${i - first}`);
    check(art.group.userData[`${territory.id}Cliff`]?.decorativeOnly === true, `terrain/${territory.id}: no new decorative collision surface`);
    groundedCoasts.push({ ...groundedCliffContract(territory, source, cliff),
      naturalBeach: naturalBeachContract(territory, source, top, cliff, art) });
  }
  check(audit.textures.size === 1, "terrain: exactly one owned path texture");
  const texture = [...audit.textures][0], expected = compact ? 1024 : 2048;
  check(texture.image.width === expected && texture.image.height === expected, "terrain: declared path-map dimensions");
  check(texture.image.data.some((value) => value > 0) && texture.image.data.some((value) => value === 0), "terrain: paths and unpainted ground both exist");
  check(audit.shaders.some((shader) => shader.uniforms.terrainPathMap?.value === texture), "terrain: real shader hook owns ground-integrated path field");
  const finish = audit.shaders.find((shader) => shader.uniforms.terrainPathMap?.value === texture);
  check(finish.vertexShader.includes("attribute vec3 groundSurface") && finish.vertexShader.includes("vGroundSurface = groundSurface"),
    "terrain: actual material consumes the authored use-mask");
  check(finish.fragmentShader.includes("terrainFilteredNoise") && finish.fragmentShader.includes("fwidth(groundStone.x)")
    && finish.fragmentShader.includes("stoneFilter = 1. - smoothstep(.20, .78, stoneFootprint)"),
    "terrain: screen-filtered grain and mineral joints, no unfiltered checker field");
  check(finish.fragmentShader.includes("* (1. - vGroundSurface.y) * (1. - vGroundSurface.z) * (1. - pathCoverage * .88)"),
    "terrain: stone finish excludes planted/coastal ground and suppresses compacted paths");
  check(finish.fragmentShader.includes("abs(groundDet) > .00000001")
    && finish.fragmentShader.includes(".12 / max(length(groundSlope), .000001)")
    && finish.fragmentShader.includes("-stoneJoint * .008 * stoneReliefMask"),
    "terrain: shallow finite determinant-guarded normal relief, not silhouette displacement");
  check(finish.fragmentShader.includes(".78, 1.") && finish.fragmentShader.includes("* vGroundSurface.z"),
    "terrain: matte bounded roughness and beach-only sea-relative wetness");
  return groundedCoasts;
}

function outwardShadingContract(geometry, name) {
  const points = geometry.attributes.position, normals = geometry.attributes.normal;
  check(!!normals && normals.count === points.count && finite(normals.array), `${name}: finite matching authored normals`);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const sum = new THREE.Vector3(), part = new THREE.Vector3();
  const count = geometry.index?.count ?? points.count;
  let minimumNormalAlignment = 1;
  for (let i = 0; i < count; i += 3) {
    const ids = [0, 1, 2].map((side) => geometry.index ? geometry.index.getX(i + side) : i + side);
    a.fromBufferAttribute(points, ids[0]); b.fromBufferAttribute(points, ids[1]); c.fromBufferAttribute(points, ids[2]);
    const face = b.sub(a).cross(c.sub(a)).normalize();
    sum.set(0, 0, 0); ids.forEach((id) => sum.add(part.fromBufferAttribute(normals, id)));
    const alignment = face.dot(sum.normalize());
    check(alignment > 0, `${name}: actual face and smooth normals agree ${i / 3}`);
    minimumNormalAlignment = Math.min(minimumNormalAlignment, alignment);
  }
  return { minimumNormalAlignment };
}

function vegetationContract(art, audit, compact) {
  const placements = art.group.userData.placements;
  check(Array.isArray(placements) && placements.length > 0, "vegetation: actual deterministic pockets");
  let minimumPathClearance = Infinity;
  for (const placement of placements) {
    check(isVegetationPocketClear(placement.x, placement.z, placement.radius), "vegetation: full footprint passes shared approaches/decks/hulls/camera guard");
    check(!map.supportDeckAt(placement.x, placement.z, -placement.radius - .65), "vegetation: no foliage footprint on an expanded imported deck");
    for (const path of map.WALK_PATHS) minimumPathClearance = Math.min(minimumPathClearance,
      distanceToSegment(placement.x, placement.z, path.from, path.to) - path.width / 2 - placement.radius);
  }
  check(minimumPathClearance >= .45 - 1e-7, "vegetation: independently measured full-radius walk clearance");
  const leaves = {};
  for (const kind of ["banana", "monstera", "small"]) {
    const template = art.group.getObjectByName(`main: curved ${kind} foliage`);
    check(template?.isInstancedMesh, `vegetation/${kind}: shared instanced template`);
    leaves[kind] = { ...closedLeaf(template.geometry, `vegetation/${compact}/${kind}`),
      ...outwardShadingContract(template.geometry, `vegetation/${compact}/${kind}`) };
    const reversed = template.geometry.clone();
    try {
      const normals = reversed.attributes.normal;
      for (let i = 0; i < normals.array.length; i++) normals.array[i] *= -1;
      check(assert.throws(() => outwardShadingContract(reversed, `${kind}/inverted`)) === undefined,
        `vegetation/${kind}: inward shading negative rejected`);
    } finally { reversed.dispose(); }
  }
  const wind = audit.shaders.find((shader) => shader.uniforms.foliageTime)?.uniforms.foliageTime;
  check(!!wind, "vegetation: owned wind uniform");
  art.update(12.5, false); check(wind.value === 12.5, "vegetation: live wind follows supplied game time");
  art.update(12.5, true); check(wind.value === 0, "vegetation: reduced motion freezes wind");
  return { pockets: placements.length, byKind: Object.fromEntries(["border", "shrub", "vine"].map((kind) => [kind, placements.filter((p) => p.kind === kind).length])), minimumPathClearance, leaves };
}

function backdropContract(art) {
  const bounds = map.WORLD_BOUNDS;
  art.group.traverse((object) => {
    if (!object.isMesh) return;
    check(!object.castShadow && !object.receiveShadow, "backdrop: no waste in the local actor shadow atlas");
    const points = object.geometry.attributes.position;
    for (let i = 0; i < points.count; i++) check(!(points.getX(i) > bounds.minX - 60 && points.getX(i) < bounds.maxX + 60
      && points.getZ(i) > bounds.minZ - 60 && points.getZ(i) < bounds.maxZ + 60), `backdrop: vertex ${i} remains outside playable-map buffer`);
  });
}

// The shared trunk contract is checked against its authored formula. This does
// not substitute for inspecting the world renderer or testing real Rapier hits.
for (const prop of map.WORLD_PROPS.filter((entry) => entry.kind === "palm")) {
  const segments = map.getPalmTrunkSegments(prop), ground = map.getTerrainHeight(prop.x, prop.z);
  check(segments.length === 7, `${prop.id}: seven shared solid trunk segments`);
  check(segments[0].a.x === prop.x && segments[0].a.z === prop.z && segments[0].a.y === ground, `${prop.id}: unchanged shared trunk base`);
  check(Math.abs(segments.at(-1).b.y - ground - 5 * prop.scale) < 1e-8, `${prop.id}: unchanged shared trunk height`);
  check(Math.abs(segments.at(-1).b.x - prop.x - Math.cos(prop.yaw) * .8 * prop.scale) < 1e-8
    && Math.abs(segments.at(-1).b.z - prop.z - Math.sin(prop.yaw) * .8 * prop.scale) < 1e-8, `${prop.id}: unchanged shared trunk lean`);
}

const results = [];
for (const path of map.WALK_PATHS) check(!isVegetationPocketClear((path.from.x + path.to.x) / 2, (path.from.z + path.to.z) / 2, 1), "vegetation negative control: a real path centre is rejected");
for (const deck of map.WORLD_SUPPORT_DECKS) check(!isVegetationPocketClear(deck.x, deck.z, 1), "vegetation negative control: imported deck centre is rejected");
for (const area of map.AREAS) check(!isVegetationPocketClear(area.entrance.x, area.entrance.z, 1), "vegetation negative control: each arrival is rejected");
for (const station of map.WORLD_STATIONS) check(!isVegetationPocketClear(station.x, station.z, 1), "vegetation negative control: each interactive object is rejected");
for (const route of map.TRAVEL_ROUTES) check(!isVegetationPocketClear(route.departure.x, route.departure.z, 1), "vegetation negative control: each transfer departure is rejected");
const about = map.getArrival("about");
check(!isVegetationPocketClear(about.x - 5, about.z + 14, 1), "vegetation negative control: new front-left About camera corridor is rejected");
for (const compact of [false, true]) {
  const terrain = createIslandTerrainArt({ compact }), vegetation = createIslandVegetation({ compact }), backdrop = createIslandBackdrop({ compact });
  const audits = [];
  try {
    const terrainAudit = inspect(terrain, `terrain/${compact}`); audits.push(terrainAudit);
    const vegetationAudit = inspect(vegetation, `vegetation/${compact}`); audits.push(vegetationAudit);
    const backdropAudit = inspect(backdrop, `backdrop/${compact}`); audits.push(backdropAudit);
    const groundedCoasts = terrainContract(terrain, terrainAudit, compact);
    const botanical = vegetationContract(vegetation, vegetationAudit, compact);
    backdropContract(backdrop);
    const frond = createPalmFrondGeometry(3, .6, compact);
    let palm;
    try { palm = palmFrondContract(frond, compact); } finally { frond.dispose(); }
    const palmWorld = await palmWorldContract(compact);
    results.push({ compact, terrain: { ...terrainAudit.stats, groundedCoasts }, vegetation: { ...vegetationAudit.stats, ...botanical }, backdrop: backdropAudit.stats, palmFrondTemplate: palm, palmWorld });
  } finally {
    // Also clean up if a failed assertion aborts a constructor/contract check.
    try { audits.forEach((audit) => audit.dispose()); } finally { terrain.dispose(); vegetation.dispose(); backdrop.dispose(); }
  }
}
console.log(JSON.stringify({ status: "PASS", checks, scope: "CPU geometry, map parity, decorative clearance and resource ownership; no measured FPS, shader compilation or visual approval", results }, null, 2));
