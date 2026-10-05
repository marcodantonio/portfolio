import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";

// Real shared-map/art modules plus actual exported GLB POSITION buffers. No
// DOM, fetch, renderer, mocked world geometry, FPS or manifold certification.
const modules = new Map();
function moduleURL(file) {
  const absolute = new URL(file, import.meta.url);
  if (modules.has(absolute.href)) return modules.get(absolute.href);
  let source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, specifier) =>
    `from ${JSON.stringify(specifier.startsWith(".")
      ? moduleURL(new URL(`${specifier}.ts`, absolute).href) : import.meta.resolve(specifier))}`);
  const result = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  modules.set(absolute.href, result); return result;
}
const map = await import(moduleURL("../lib/island-map.ts"));
const overview = await import(moduleURL("../lib/island-overview.ts"));
const { createIslandTerrainArt } = await import(moduleURL("../lib/island-terrain-art.ts"));
const { createIslandArchitecture } = await import(moduleURL("../lib/island-architecture.ts"));
const { createIslandBridges } = await import(moduleURL("../lib/island-bridges.ts"));
const { createIslandFoundations } = await import(moduleURL("../lib/island-foundations.ts"));
const { createContactLighthouseAsset } = await import(moduleURL("../lib/island-studio-asset.ts"));
let checks = 0;
const check = (value, label) => { assert(value, label); checks++; };
const finite = (point) => [point.x, point.y, point.z].every(Number.isFinite);
const direction = new THREE.Vector3(30, 80, 130), viewports = [[1680, 945], [1024, 768], [390, 844]];
const imported = [];
const foundationMeshes = new Set();
let foundationVertices = 0;

function actualGLB(filename, rootName, deck, semanticNodes = [], runtimeMatrix) {
  const bytes = fs.readFileSync(new URL(`../public/models/archipelago/${filename}`, import.meta.url));
  check(bytes.length <= 8 * 1048576, `${filename}: unchanged 8 MiB imported-building budget`);
  check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${filename}: actual binary glTF2`);
  const jsonLength = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  const binOffset = 28 + jsonLength;
  check(bytes.readUInt32LE(24 + jsonLength) === 0x004e4942 && json.buffers.length === 1 && !json.buffers[0].uri, `${filename}: embedded BIN`);
  const geometryByAccessor = new Map(), geometries = new Set();
  function geometry(index) {
    if (geometryByAccessor.has(index)) return geometryByAccessor.get(index);
    const accessor = json.accessors[index], view = json.bufferViews[accessor.bufferView];
    check(accessor.componentType === 5126 && accessor.type === "VEC3" && !accessor.sparse, `${filename}: actual Float32 POSITION`);
    const positions = new Float32Array(accessor.count * 3), stride = view.byteStride ?? 12;
    const start = binOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    for (let i = 0; i < accessor.count; i++) for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = bytes.readFloatLE(start + i * stride + axis * 4);
    check(positions.every(Number.isFinite), `${filename}: finite real positions`);
    const result = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometries.add(result); geometryByAccessor.set(index, result); return result;
  }
  const material = new THREE.MeshBasicMaterial(); // CPU carrier only, not a PBR or shader check.
  const nodes = json.nodes.map((node) => {
    const group = new THREE.Group(); group.name = node.name ?? "";
    if (node.matrix) { group.matrix.fromArray(node.matrix); group.matrixAutoUpdate = false; }
    else {
      if (node.translation) group.position.fromArray(node.translation);
      if (node.rotation) group.quaternion.fromArray(node.rotation);
      if (node.scale) group.scale.fromArray(node.scale);
    }
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) group.add(new THREE.Mesh(geometry(primitive.attributes.POSITION), material));
    return group;
  });
  json.nodes.forEach((node, i) => node.children?.forEach((child) => nodes[i].add(nodes[child])));
  const scene = new THREE.Group();
  json.scenes[json.scene ?? 0].nodes.forEach((index) => scene.add(nodes[index]));
  scene.updateMatrixWorld(true);
  const asset = scene.getObjectByName(rootName);
  check(!!asset, `${filename}: exported semantic root`);
  for (const name of semanticNodes) check(!!asset.getObjectByName(name), `${filename}: actual mounted semantic group ${name}`);
  // Mirror the runtime owner's exact subtree extraction and affine transform;
  // preview cameras, lights and any outside preview meshes are not game art.
  const worldMatrix = asset.matrixWorld.clone();
  asset.removeFromParent(); asset.matrix.copy(worldMatrix); asset.matrixAutoUpdate = false; asset.matrixWorldNeedsUpdate = true;
  const group = new THREE.Group();
  if (runtimeMatrix) { group.matrix.copy(runtimeMatrix); group.matrixAutoUpdate = false; }
  else { group.position.set(deck.x, deck.top, deck.z); group.rotation.y = deck.yaw; }
  group.add(asset);
  imported.push({ group, dispose() { geometries.forEach(value => value.dispose()); material.dispose(); group.clear(); } });
  return group;
}

function visitVisible(roots, callback) {
  const seen = new Set();
  function visit(object) {
    if (seen.has(object)) return; seen.add(object);
    if (!object.visible && !object.name.startsWith("Optional near detail:")) return;
    if (object.isMesh) callback(object);
    object.children.forEach(visit);
  }
  roots.forEach(root => { root.updateWorldMatrix(true, true); visit(root); });
}

function verifyFoundationCoverage(roots) {
  const present = new Set();
  let vertices = 0;
  visitVisible(roots, object => {
    if (!foundationMeshes.has(object)) return;
    present.add(object); vertices += object.geometry.getAttribute("position").count;
  });
  assert(present.size === foundationMeshes.size && vertices === foundationVertices,
    "independent real foundation owner missing from overview roots or hidden with a building fallback");
  checks++;
  return vertices;
}

function verifyFit(roots, phase) {
  const actualFoundationVertices = verifyFoundationCoverage(roots);
  const points = overview.collectIslandOverviewPoints(roots), before = points.map(point => point.toArray());
  check(points.length > 500 && points.every(finite), `${phase}: bounded finite geometry/map samples`);
  const repeated = overview.collectIslandOverviewPoints(roots);
  check(JSON.stringify(repeated.map(point => point.toArray())) === JSON.stringify(before), `${phase}: cached collection is deterministic`);
  const reports = [];
  for (const [width, height] of viewports) {
    const rect = overview.islandOverviewSafeRect(width, height, true,
      width < 760 ? { navBottom: 120, introTop: 470.6 } : undefined);
    const fit = overview.fitIslandOverview(points, { direction, aspect: width / height, fov: 42, safeRect: rect, near: .1 });
    check(finite(fit.focus) && Number.isFinite(fit.distance) && fit.distance > 0 && fit.halfHeight > 0, `${phase}/${width}: finite positive fit`);
    const camera = new THREE.PerspectiveCamera(42, width / height, .1, 1800);
    camera.position.copy(fit.focus).addScaledVector(direction.clone().normalize(), fit.distance); camera.lookAt(fit.focus); camera.updateMatrixWorld(true);
    let samples = 0, clips = 0, minDepth = Infinity, maxDepth = -Infinity, validatedFoundationVertices = 0;
    const minNDC = [Infinity, Infinity], maxNDC = [-Infinity, -Infinity], point = new THREE.Vector3(), projected = new THREE.Vector3();
    const cameraDirection = direction.clone().normalize(), view = new THREE.Vector3();
    function validate(p) {
      projected.copy(p).project(camera); view.copy(camera.position).sub(p);
      const depth = view.dot(cameraDirection); minDepth = Math.min(minDepth, depth); maxDepth = Math.max(maxDepth, depth);
      minNDC[0] = Math.min(minNDC[0], projected.x); minNDC[1] = Math.min(minNDC[1], projected.y);
      maxNDC[0] = Math.max(maxNDC[0], projected.x); maxNDC[1] = Math.max(maxNDC[1], projected.y);
      if (!finite(projected) || projected.x < rect.xMin - 1e-6 || projected.x > rect.xMax + 1e-6 || projected.y < rect.yMin - 1e-6 || projected.y > rect.yMax + 1e-6 || depth < .1 || depth > 1800) clips++;
      samples++;
    }
    points.forEach(validate);
    // Independently validate every actual base POSITION after its hierarchy
    // transform, not only the conservative corner samples used by the fit.
    visitVisible(roots, object => {
      check(!object.isInstancedMesh, `${phase}: global merged instanced bucket deliberately excluded`);
      const position = object.geometry.getAttribute("position");
      for (let i = 0; i < position.count; i++) validate(point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld));
      if (foundationMeshes.has(object)) validatedFoundationVertices += position.count;
    });
    check(validatedFoundationVertices === actualFoundationVertices && validatedFoundationVertices > 0,
      `${phase}/${width}: every actual foundation POSITION tested, not just metadata or fitting corners`);
    check(clips === 0, `${phase}/${width}: all ${samples} real/corner samples inside safe frustum (${clips} clips)`);
    check(minDepth > .1 && maxDepth < 1800, `${phase}/${width}: near/far coverage`);
    reports.push({ width, height, cornerSamples: points.length, validatedSamples: samples, distance: fit.distance, halfHeight: fit.halfHeight,
      focus: fit.focus.toArray(), safeRect: rect, minNDC, maxNDC, minDepth, maxDepth, clippedSamples: clips,
      foundationVertices: validatedFoundationVertices });
  }
  check(JSON.stringify(points.map(point => point.toArray())) === JSON.stringify(before), `${phase}: fit does not mutate samples`);
  check(direction.equals(new THREE.Vector3(30, 80, 130)), `${phase}: fit does not mutate direction`);
  return reports;
}

const terrain = createIslandTerrainArt(), architecture = createIslandArchitecture(), bridges = createIslandBridges(), foundations = createIslandFoundations();
let contactOwner;
const foundationResources = new Set(), foundationDisposals = new Map();
foundations.group.traverse(object => {
  if (!object.isMesh) return;
  foundationMeshes.add(object); foundationVertices += object.geometry.getAttribute("position").count;
  foundationResources.add(object.geometry);
  (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => foundationResources.add(material));
});
for (const resource of foundationResources) {
  foundationDisposals.set(resource, 0);
  resource.addEventListener("dispose", () => foundationDisposals.set(resource, foundationDisposals.get(resource) + 1));
}
try {
  check(terrain.group.children.filter(object => object.name.startsWith("Continuous terrain:")).length === map.TERRITORIES.length && map.TERRITORIES.length === 6,
    "actual terrain has six physical territories, not nine duplicated islands");
  const worldAST = ts.createSourceFile("island-world.ts", fs.readFileSync(new URL("../lib/island-world.ts", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let hasRuntimeFoundationRoot = false, hasRuntimeContactRoot = false;
  function inspectWorld(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(worldAST) === "overviewRoots") {
      const initializer = ts.isAsExpression(node.initializer) ? node.initializer.expression : node.initializer;
      hasRuntimeFoundationRoot = ts.isArrayLiteralExpression(initializer)
        && initializer.elements.some(element => element.getText(worldAST) === "foundations.group");
      hasRuntimeContactRoot = ts.isArrayLiteralExpression(initializer)
        && initializer.elements.some(element => element.getText(worldAST) === "contactLighthouse.group");
    }
    ts.forEachChild(node, inspectWorld);
  }
  inspectWorld(worldAST);
  check(hasRuntimeFoundationRoot, "actual world composition includes its independently owned real foundation root");
  check(hasRuntimeContactRoot, "actual world composition includes the independently owned Contact GLB root in overview fitting");
  check(foundationMeshes.size === 2 && foundationVertices > 0 && foundationResources.size === 4,
    "actual foundation construction owns two real geometry/material batches");
  const proceduralRoots = [terrain.group, bridges.group, architecture.group, foundations.group];
  assert.throws(() => verifyFoundationCoverage(proceduralRoots.filter(root => root !== foundations.group)), /foundation owner missing/); checks++;
  foundations.group.visible = false;
  try { assert.throws(() => verifyFoundationCoverage(proceduralRoots), /foundation owner missing/); checks++; }
  finally { foundations.group.visible = true; }
  const fallback = verifyFit(proceduralRoots, "procedural fallback");
  // Use the actual runtime owner's transform, not the offset hut deck as an
  // inferred lighthouse pivot. This CPU-only 404 never implies browser loading.
  const originalFetch = globalThis.fetch, requests = [], contactFallback = architecture.group.getObjectByName("Architecture: contact");
  check(!!contactFallback, "actual Contact fallback exists before isolated loading");
  try {
    globalThis.fetch = async url => { requests.push(String(url)); return new Response(null, { status: 404 }); };
    contactOwner = createContactLighthouseAsset(contactFallback);
    await new Promise(resolve => setImmediate(resolve));
  } finally { globalThis.fetch = originalFetch; }
  check(requests.length === 1 && requests[0] === "/models/archipelago/contact-lighthouse-v1-batched.glb"
    && contactOwner.state === "fallback" && contactFallback.visible,
    "actual Contact owner independently retains its real fallback after one exact local 404");
  check(contactOwner.group.position.equals(new THREE.Vector3(map.CONTACT_LIGHTHOUSE.anchor.x, map.CONTACT_LIGHTHOUSE.anchor.y,
    map.CONTACT_LIGHTHOUSE.anchor.z)), "actual Contact owner uses exported tower anchor rather than radio-hut deck centre");
  check(contactOwner.group.position.x !== map.CONTACT_LIGHTHOUSE_DECK.x && contactOwner.group.position.z !== map.CONTACT_LIGHTHOUSE_DECK.z,
    "Contact tower origin and compact offset support deck stay distinct");
  contactOwner.group.updateMatrixWorld(true);
  for (const name of ["about", "projects", "education", "skills", "welcome", "dance", "contact"]) {
    const group = architecture.group.getObjectByName(`Architecture: ${name}`); check(!!group, `real fallback ${name} exists`); group.visible = false;
  }
  const readyRoots = [...proceduralRoots,
    actualGLB("studio-v2-batched.glb", "HomeStudio_V2_Origin_At_Deck_Centre", map.HOME_STUDIO_DECK),
    actualGLB("workshop-v1-batched.glb", "DigitalWorkshop_V1_Origin_At_Deck_Centre", map.DIGITAL_WORKSHOP_DECK),
    actualGLB("archive-v1-batched.glb", "ArchiveObservatory_V1_Origin_At_Deck_Centre", map.ARCHIVE_OBSERVATORY_DECK),
    actualGLB("suspended-lab-v1-batched.glb", map.SUSPENDED_LAB.root, map.SUSPENDED_LAB_DECK,
      ["Lab_shell", "Lab_roof", "Lab_interior", "Lab_decor"]),
    actualGLB("welcome-harbor-v1-batched.glb", map.WELCOME_HARBOR.root, map.WELCOME_HARBOR_DECK,
      ["Harbor_shell", "Harbor_roof", "Harbor_interior", "Harbor_decor"]),
    actualGLB("dance-pavilion-v1-batched.glb", map.DANCE_PAVILION.root, map.DANCE_PAVILION_DECK,
      ["Dance_shell", "Dance_roof", "Dance_interior", "Dance_decor"]),
    actualGLB("contact-lighthouse-v1-batched.glb", map.CONTACT_LIGHTHOUSE.root, map.CONTACT_LIGHTHOUSE_DECK,
      ["Lighthouse_shell", "Lighthouse_roof", "Lighthouse_interior", "Lighthouse_decor"], contactOwner.group.matrixWorld)];
  check(imported.length === 7, "seven real building owners replace seven procedural fallbacks");
  check(foundations.group.visible && [...foundationMeshes].every(mesh => mesh.visible),
    "foundations remain visible independently after seven architecture fallbacks hide");
  const ready = verifyFit(readyRoots, "seven ready GLB owners");
  const sample = [new THREE.Vector3(-1, 2, 3), new THREE.Vector3(5, -4, 1)], origin = new THREE.Vector3(2, 3, 4);
  const options = { direction, aspect: 16 / 9, fov: 42, origin };
  overview.fitIslandOverview(sample, options); check(origin.equals(new THREE.Vector3(2, 3, 4)), "caller origin is immutable");
  for (const invalid of [() => overview.fitIslandOverview([], options), () => overview.fitIslandOverview([new THREE.Vector3(NaN, 0, 0)], options),
    () => overview.fitIslandOverview(sample, { ...options, aspect: 0 }), () => overview.fitIslandOverview(sample, { ...options, fov: 180 }),
    () => overview.fitIslandOverview(sample, { ...options, near: 0 }), () => overview.fitIslandOverview(sample, { ...options, direction: new THREE.Vector3() }),
    () => overview.fitIslandOverview(sample, { ...options, direction: new THREE.Vector3(0, 1, 0) }),
    () => overview.fitIslandOverview(sample, { ...options, safeRect: { xMin: 0, xMax: 0, yMin: -.9, yMax: .9 } }),
    () => overview.islandOverviewSafeRect(0, 844, true)]) { assert.throws(invalid); checks++; }
  const custom = overview.islandOverviewSafeRect(1680, 945, true, { navBottom: 90, introRight: 420, markerHeight: 30, bottomGuard: 50 });
  check(custom.xMin > ready[0].safeRect.xMin && custom.yMax < ready[0].safeRect.yMax, "caller-provided UI rectangles enlarge reserved area");
  const portrait = overview.islandOverviewSafeRect(390, 844, true, { navBottom: 120, introTop: 470.6 });
  check((1 - portrait.yMin) * 844 / 2 <= 470.6 - 12 + 1e-6, "portrait geometry stays above measured intro card");
  const short = overview.islandOverviewSafeRect(640, 390, true, { navBottom: 120, introTop: 170 });
  check(short.yMin < short.yMax, "short viewport preserves finite reader-first fallback rectangle");
  foundations.dispose();
  check([...foundationDisposals.values()].every(count => count === 1) && foundations.group.children.length === 0,
    "overview foundation owner disposes each actual geometry/material exactly once and detaches its meshes");
  foundations.dispose();
  check([...foundationDisposals.values()].every(count => count === 1), "overview foundation cleanup is idempotent");
  console.log(JSON.stringify({ status: "PASS", checks, direction: direction.toArray(), fallback, ready,
    foundations: { meshes: foundationMeshes.size, vertices: foundationVertices, ownedResources: foundationResources.size,
      disposalEvents: [...foundationDisposals.values()].reduce((total, count) => total + count, 0) },
    limits: "CPU projections of actual geometry and shared-map supplemental envelopes. No browser/GPU/FPS, wind-extreme, label raster or visual approval claim." }, null, 2));
} finally {
  contactOwner?.dispose(); imported.forEach(owner => owner.dispose()); foundations.dispose(); architecture.dispose(); bridges.dispose(); terrain.dispose();
}
