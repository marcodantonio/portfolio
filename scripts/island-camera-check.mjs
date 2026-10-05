import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import * as THREE from "three";

// Execute the actual pure composition and actual shared ground module. This
// verifies geometry/framing, not raster visibility, roof occlusion or FPS.
const cache = new Map();
function moduleURL(file) {
  const url = new URL(file, import.meta.url);
  if (cache.has(url.href)) return cache.get(url.href);
  let source = ts.transpileModule(fs.readFileSync(url, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, target) =>
    `from ${JSON.stringify(target.startsWith(".") ? moduleURL(new URL(`${target}.ts`, url).href) : import.meta.resolve(target))}`);
  const encoded = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  cache.set(url.href, encoded); return encoded;
}
const { getIslandWalkingShot, ISLAND_CAMERA_FOV } = await import(moduleURL("../lib/island-camera.ts"));
const map = await import(moduleURL("../lib/island-map.ts"));
const { createIslandArchitecture } = await import(moduleURL("../lib/island-architecture.ts"));
const { createContactLighthouseAsset } = await import(moduleURL("../lib/island-studio-asset.ts"));
let checks = 0;
function check(value, label) { assert(value, label); checks++; }
const viewports = [[1680, 945], [1024, 768], [390, 844]];
const summary = [];
const contactSummary = [];

// POSITION carriers from the actual exported binary, not a hand-picked beacon
// apex, proposed dimensions or a placeholder. This preserves complete glTF
// node transforms and the exact semantic-subtree extraction used at runtime.
function actualContactGLB(runtimeMatrix) {
  const filename = "contact-lighthouse-v1-batched.glb";
  const bytes = fs.readFileSync(new URL(`../public/models/archipelago/${filename}`, import.meta.url));
  check(bytes.length >= 28 && bytes.length <= 8 * 1048576 && bytes.readUInt32LE(0) === 0x46546c67
    && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, `${filename}: real bounded binary glTF2`);
  const jsonLength = bytes.readUInt32LE(12);
  check(bytes.readUInt32LE(16) === 0x4e4f534a && jsonLength <= bytes.length - 28, `${filename}: complete JSON chunk`);
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8")), binStart = 28 + jsonLength;
  check(bytes.readUInt32LE(24 + jsonLength) === 0x004e4942 && json.buffers.length === 1
    && !json.buffers[0].uri && bytes.readUInt32LE(20 + jsonLength) <= bytes.length - binStart, `${filename}: actual embedded BIN`);
  const geometries = new Set(), byAccessor = new Map(), material = new THREE.MeshBasicMaterial();
  let group, disposed = false, meshes = 0, vertices = 0, triangles = 0;
  function dispose() {
    if (disposed) return; disposed = true;
    geometries.forEach(geometry => geometry.dispose()); material.dispose(); group?.clear();
  }
  function geometry(accessorIndex) {
    if (byAccessor.has(accessorIndex)) return byAccessor.get(accessorIndex);
    const accessor = json.accessors[accessorIndex], view = json.bufferViews[accessor.bufferView];
    check(accessor.componentType === 5126 && accessor.type === "VEC3" && !accessor.sparse
      && view.buffer === 0, `${filename}: actual non-sparse Float32 POSITION`);
    const start = binStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = view.byteStride ?? 12;
    check(stride >= 12 && start >= binStart && start + (accessor.count - 1) * stride + 12 <= bytes.length,
      `${filename}: complete actual POSITION buffer`);
    const positions = new Float32Array(accessor.count * 3);
    for (let i = 0; i < accessor.count; i++) for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = bytes.readFloatLE(start + i * stride + axis * 4);
    check(positions.length > 0 && positions.every(Number.isFinite), `${filename}: finite actual POSITION vertices`);
    const result = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometries.add(result); byAccessor.set(accessorIndex, result); return result;
  }
  try {
    const nodes = json.nodes.map(node => {
      const object = new THREE.Group(); object.name = node.name ?? "";
      if (node.matrix) { object.matrix.fromArray(node.matrix); object.matrixAutoUpdate = false; }
      else {
        if (node.translation) object.position.fromArray(node.translation);
        if (node.rotation) object.quaternion.fromArray(node.rotation);
        if (node.scale) object.scale.fromArray(node.scale);
      }
      if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
        check((primitive.mode ?? 4) === 4, `${filename}: real triangle primitive`);
        const shape = geometry(primitive.attributes.POSITION), count = primitive.indices === undefined
          ? shape.attributes.position.count : json.accessors[primitive.indices].count;
        check(count > 0 && count % 3 === 0, `${filename}: complete actual triangles`);
        const mesh = new THREE.Mesh(shape, material);
        mesh.userData.cameraTriangleCount = count / 3; object.add(mesh);
      }
      return object;
    });
    json.nodes.forEach((node, i) => node.children?.forEach(child => nodes[i].add(nodes[child])));
    const scene = new THREE.Group(); json.scenes[json.scene ?? 0].nodes.forEach(index => scene.add(nodes[index]));
    scene.updateMatrixWorld(true);
    const asset = scene.getObjectByName(map.CONTACT_LIGHTHOUSE.root);
    check(!!asset, `${filename}: actual exported Contact semantic root`);
    for (const part of ["shell", "roof", "interior", "decor"]) check(!!asset.getObjectByName(`Lighthouse_${part}`),
      `${filename}: required actual Lighthouse_${part} group`);
    const worldMatrix = asset.matrixWorld.clone();
    asset.removeFromParent(); asset.matrix.copy(worldMatrix); asset.matrixAutoUpdate = false; asset.matrixWorldNeedsUpdate = true;
    group = new THREE.Group(); group.matrix.copy(runtimeMatrix); group.matrixAutoUpdate = false; group.add(asset);
    group.updateMatrixWorld(true);
    group.traverse(object => {
      check(object.matrixWorld.elements.every(Number.isFinite), `${filename}: finite complete hierarchy transform`);
      if (!object.isMesh) return;
      meshes++; vertices += object.geometry.attributes.position.count; triangles += object.userData.cameraTriangleCount;
    });
    check(meshes > 0 && meshes <= 96 && vertices > 0 && triangles > 0 && triangles <= 180000,
      `${filename}: actual geometry stays under unchanged single-building runtime guards`);
    return { group, dispose, stats: { filename, bytes: bytes.length, meshes, vertices, triangles }, resources: new Set([...geometries, material]) };
  } catch (error) { dispose(); throw error; }
}

function actualContactPoints(group, label) {
  const points = [], ranges = [], apex = new THREE.Vector3(0, -Infinity, 0);
  group.updateMatrixWorld(true);
  group.traverse(object => {
    if (!object.isMesh) return;
    const position = object.geometry.attributes.position, point = new THREE.Vector3();
    ranges.push({ name: object.parent.name || object.name, from: points.length, to: points.length + position.count });
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
      check(point.toArray().every(Number.isFinite), `${label}: finite full-affine vertex ${i}`);
      if (point.y > apex.y) apex.copy(point);
      points.push(point.clone());
    }
  });
  check(points.length > 0 && apex.toArray().every(Number.isFinite), `${label}: real complete Contact silhouette`);
  return { points, ranges, apex };
}
for (const area of map.AREAS) for (const [width, height] of viewports) {
  const aspect = width / height, shot = getIslandWalkingShot(area.id, aspect);
  const direction = new THREE.Vector3(...shot.direction), focusOffset = new THREE.Vector3(...shot.focus);
  const before = JSON.stringify(shot), feet = new THREE.Vector3(area.entrance.x,
    map.getGroundHeight(area.entrance.x, area.entrance.z), area.entrance.z);
  const focus = feet.clone().add(focusOffset);
  const camera = new THREE.PerspectiveCamera(ISLAND_CAMERA_FOV, aspect, .1, 1800);
  camera.position.copy(focus).addScaledVector(direction.clone().normalize(),
    shot.halfHeight / Math.tan(THREE.MathUtils.degToRad(ISLAND_CAMERA_FOV / 2)));
  camera.lookAt(focus); camera.updateMatrixWorld(true);
  const pitch = THREE.MathUtils.radToDeg(Math.atan2(direction.y, Math.hypot(direction.x, direction.z)));
  check(pitch > 0 && pitch < ISLAND_CAMERA_FOV / 2 - 1, `${area.id}/${width}: upper ray clears horizontal horizon`);
  const horizon = camera.position.clone().add(new THREE.Vector3(-direction.x, 0, -direction.z).normalize().multiplyScalar(1000)).project(camera);
  check(horizon.y > .55 && horizon.y < .99, `${area.id}/${width}: restrained visible sky band`);
  for (const y of [0, 1.12, 2.239]) {
    const projected = feet.clone().add(new THREE.Vector3(0, y, 0)).project(camera);
    check(projected.toArray().every(Number.isFinite), `${area.id}/${width}: finite explorer projection`);
    check(Math.abs(projected.x) < .7 && projected.y > -.78 && projected.y < .7 && projected.z > -1 && projected.z < 1,
      `${area.id}/${width}: explorer body inside playable frame`);
  }
  const foot = feet.clone().project(camera), head = feet.clone().add(new THREE.Vector3(0, 2.239, 0)).project(camera);
  const heightFraction = (head.y - foot.y) / 2;
  check(heightFraction > .068 && heightFraction < .17, `${area.id}/${width}: human foreground scale`);
  check(camera.position.y > map.WATER_LEVEL + 5, `${area.id}/${width}: eye never under the sea`);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
  const forward = new THREE.Vector3(); camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
  check(Math.abs(right.dot(forward)) < 1e-10, `${area.id}/${width}: orthogonal camera-relative walking`);
  // The new low pitch must not rotate the standard WASD heading, collide with
  // the player or turn a visual framing correction into map/physics mutation.
  const expectedForward = new THREE.Vector3(-shot.direction[0], 0, -shot.direction[2]).normalize();
  check(forward.distanceTo(expectedForward) < 1e-10, `${area.id}/${width}: expected planar direction unchanged by pitch`);
  check(JSON.stringify(shot) === before, `${area.id}/${width}: borrowed shot is not mutated`);
  summary.push({ area: area.id, width, pitch, skyFraction: (1 - horizon.y) / 2, explorerHeightFraction: heightFraction });
}
const old = new THREE.Vector3(5, 16, 32);
check(THREE.MathUtils.radToDeg(Math.atan2(old.y, Math.hypot(old.x, old.z))) > ISLAND_CAMERA_FOV / 2,
  "negative fixture: former direction really excludes the horizon");

// Actual owned pavilion geometry/materials/lights, not a metadata label or a
// new GLB. No map/physics/network mutation is used to make these checks pass.
const architecture = createIslandArchitecture();
let importedContact;
try {
  architecture.group.updateMatrixWorld(true);
  const dance = architecture.group.getObjectByName("Architecture: dance");
  const materials = new Set(), geometries = new Set(), lights = [];
  dance.traverse(object => {
    if (object.isPointLight) lights.push(object);
    if (!object.isMesh) return;
    geometries.add(object.geometry);
    (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material));
  });
  const floor = [...materials].filter(material => material.isMeshPhysicalMaterial && material.clearcoat > 0);
  function verifyFloor() {
    assert.equal(floor.length, 2, "dedicated parquet materials, not all architecture made glossy");
    for (const material of floor) {
      assert(material.metalness === 0 && material.roughness >= .24 && material.roughness <= .44, "finished dielectric floor response");
      assert(material.clearcoat > 0 && material.clearcoat <= .5, "restrained real clearcoat");
    }
    assert([...geometries].some(geometry => geometry.attributes.parquetGrain), "real per-plank grain attribute");
  }
  verifyFloor(); checks++;
  for (const geometry of geometries) if (geometry.attributes.parquetGrain) {
    const grain = geometry.attributes.parquetGrain;
    check(grain.itemSize === 2 && grain.count === geometry.attributes.position.count && grain.array.every(Number.isFinite), "finite grain coordinates for every floor vertex");
  }
  for (const material of floor) {
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.physical.vertexShader, fragmentShader: THREE.ShaderLib.physical.fragmentShader };
    material.onBeforeCompile(shader);
    check(shader.vertexShader.includes("vParquetGrain = parquetGrain"), "physical shader receives actual plank grain");
    check(shader.fragmentShader.includes("roughnessFactor=clamp") && shader.fragmentShader.includes("parquetDet"), "grain affects filtered roughness and bounded micro-normal");
  }
  const savedRoughness = floor[0].roughness; floor[0].roughness = .82;
  assert.throws(verifyFloor, /finished dielectric/); checks++; floor[0].roughness = savedRoughness;
  check(lights.length === 2 && lights.every(light => light.name === "Dance owned suspended-lantern light" && light.distance === 12 && !light.castShadow), "two bounded owned real lantern fills, no extra shadow maps");
  architecture.setNight(false); check(lights.every(light => light.intensity === 24), "daylight lamp intensity");
  architecture.setNight(true); check(lights.every(light => light.intensity === 40), "night lamp intensity");
  // Include every real Contact vertex, not a hand-picked beacon apex. These
  // geometric checks still cannot certify raster occlusion or measured DOM
  // safe areas: the browser must review actual navbar/map/title rectangles.
  const contact = architecture.group.getObjectByName("Architecture: contact");
  check(!!contact, "Contact actual procedural fallback exists");
  check(typeof createContactLighthouseAsset === "function", "Contact actual independent asset factory is mounted in the shared loader");
  const originalFetch = globalThis.fetch; let owner, requests = [];
  try {
    globalThis.fetch = async url => { requests.push(String(url)); return new Response(null, { status: 404 }); };
    owner = createContactLighthouseAsset(contact);
  } finally { globalThis.fetch = originalFetch; }
  try {
    await new Promise(resolve => setImmediate(resolve));
    check(requests.length === 1 && requests[0] === "/models/archipelago/contact-lighthouse-v1-batched.glb"
      && owner.state === "fallback" && contact.visible, "Contact real owner independently retains its solid fallback under CPU-only 404");
    owner.group.updateMatrixWorld(true);
    check(owner.group.position.equals(new THREE.Vector3(map.CONTACT_LIGHTHOUSE.anchor.x, map.CONTACT_LIGHTHOUSE.anchor.y,
      map.CONTACT_LIGHTHOUSE.anchor.z)), "Contact runtime origin matches tower anchor, not offset radio-hut deck centre");
    check(owner.group.position.x !== map.CONTACT_LIGHTHOUSE_DECK.x && owner.group.position.z !== map.CONTACT_LIGHTHOUSE_DECK.z,
      "Contact actual owner retains independent tower/hut pivots");
    importedContact = actualContactGLB(owner.group.matrixWorld);
  } finally { owner?.dispose(); }
  const contactPhases = [{ name: "fallback", ...actualContactPoints(contact, "Contact fallback") },
    { name: "actual-GLB", ...actualContactPoints(importedContact.group, "Contact actual GLB") }];
  const place = map.getIsland("contact");
  for (const { name, points: contactPoints, ranges, apex } of contactPhases) for (const [width, height] of viewports) {
    const shot = getIslandWalkingShot(place.id, width / height);
    const focus = new THREE.Vector3(place.entrance.x, map.getGroundHeight(place.entrance.x, place.entrance.z), place.entrance.z).add(new THREE.Vector3(...shot.focus));
    const camera = new THREE.PerspectiveCamera(ISLAND_CAMERA_FOV, width / height, .1, 1800);
    camera.position.copy(focus).addScaledVector(new THREE.Vector3(...shot.direction).normalize(), shot.halfHeight / Math.tan(THREE.MathUtils.degToRad(ISLAND_CAMERA_FOV / 2)));
    camera.lookAt(focus); camera.updateMatrixWorld(true);
    const projected = apex.clone().project(camera);
    check(Math.abs(projected.x) < .85 && projected.y < .825 && projected.y > -.8, `contact/${name}/${width}: actual highest beacon vertex inside unchanged geometric lens margin, not responsive HUD acceptance`);
    const silhouette = contactPoints.map(point => point.clone().project(camera));
    check(silhouette.every(point => point.toArray().every(Number.isFinite) && Math.abs(point.x) < .95
      && point.y > -.78 && point.y < .825 && point.z > -1 && point.z < 1),
      `contact/${name}/${width}: every actual building/decor vertex stays inside the unchanged complete geometric lens margin`);
    if (width === 390) {
      // Conservative CSS-sized snapshots for this exact viewport, not runtime
      // DOM measurements. They catch the known arrival composition regression;
      // the root's built-browser check is authoritative for real HUD overlap.
      const panels = [{ left: 16, right: 226, top: 124, bottom: 220 },
        { left: width - 121, right: width - 16, top: 124, bottom: 250 }];
      const hudViolations = [];
      silhouette.forEach((point, index) => {
        const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
        if (y <= 124 || panels.some(panel => x > panel.left && x < panel.right && y > panel.top && y < panel.bottom))
          hudViolations.push({ object: ranges.find(range => index >= range.from && index < range.to)?.name,
            vertex: index, world: contactPoints[index].toArray(), ndc: point.toArray(), css: [x, y] });
      });
      if (hudViolations.length) console.error(JSON.stringify({ phase: name, viewport: [width, height],
        nominalHUDViolations: hudViolations.length, firstViolations: hudViolations.slice(0, 6) }));
      check(hudViolations.length === 0,
        `contact/${name}/390: complete projected vertex set clears unchanged nominal header/location/minimap rectangles; actual DOM/raster acceptance remains separate`);
    }
    const oldFocus = new THREE.Vector3(place.entrance.x, map.getGroundHeight(place.entrance.x, place.entrance.z), place.entrance.z)
      .add(new THREE.Vector3(0, 7.5, -5));
    const oldCamera = new THREE.PerspectiveCamera(ISLAND_CAMERA_FOV, width / height, .1, 1800);
    oldCamera.position.copy(oldFocus).addScaledVector(new THREE.Vector3(5, 9, 32).normalize(), 12.5 / Math.tan(THREE.MathUtils.degToRad(ISLAND_CAMERA_FOV / 2)));
    oldCamera.lookAt(oldFocus); oldCamera.updateMatrixWorld(true);
    const oldApex = apex.clone().project(oldCamera);
    let underframedClips;
    if (name === "fallback") {
      // The historical negative was calibrated for the taller fallback. The
      // native tower's lower apex may legitimately fit that previous shot.
      check(Math.abs(oldApex.x) >= .85 || oldApex.y >= .825 || oldApex.y <= -.8,
        `contact/${name}/${width}: negative previous shot fails the unchanged highest-beacon lens guard on the current actual ground`);
    } else {
      // Deliberately halve the lens coverage without changing the actual
      // binary POSITION buffers, full world hierarchy or camera position.
      const underframedCamera = camera.clone(); underframedCamera.zoom = 2;
      underframedCamera.updateProjectionMatrix(); underframedCamera.updateMatrixWorld(true);
      const underframed = contactPoints.map(point => point.clone().project(underframedCamera));
      underframedClips = underframed.filter(point => !point.toArray().every(Number.isFinite) || Math.abs(point.x) >= .95
        || point.y <= -.78 || point.y >= .825 || point.z <= -1 || point.z >= 1).length;
      check(underframedCamera.position.equals(camera.position) && underframedClips > 0,
        `contact/${name}/${width}: explicit half-coverage negative clips real vertices against unchanged full-silhouette guards with camera/model positions intact`);
    }
    const minNDC = [Infinity, Infinity, Infinity], maxNDC = [-Infinity, -Infinity, -Infinity];
    for (const point of silhouette) for (let axis = 0; axis < 3; axis++) {
      minNDC[axis] = Math.min(minNDC[axis], point.getComponent(axis)); maxNDC[axis] = Math.max(maxNDC[axis], point.getComponent(axis));
    }
    contactSummary.push({ phase: name, width, height, vertices: contactPoints.length, apex: apex.toArray(),
      apexNDC: projected.toArray(), minNDC, maxNDC, previousShotApexNDC: oldApex.toArray(), underframedClips });
  }
  const contactDisposals = new Map([...importedContact.resources].map(resource => [resource, 0]));
  contactDisposals.forEach((_count, resource) => resource.addEventListener("dispose", () => contactDisposals.set(resource, contactDisposals.get(resource) + 1)));
  importedContact.dispose(); check([...contactDisposals.values()].every(count => count === 1), "actual Contact CPU carrier disposes each owned resource once");
  importedContact.dispose(); check([...contactDisposals.values()].every(count => count === 1), "actual Contact CPU carrier cleanup idempotent");
  const resources = new Set([...materials, ...geometries, ...lights]);
  let released = 0; resources.forEach(resource => resource.addEventListener("dispose", () => released++));
  architecture.dispose(); check(released === resources.size, "each inspected pavilion resource disposed once");
  architecture.dispose(); check(released === resources.size, "pavilion resource disposal idempotent");
} finally { importedContact?.dispose(); architecture.dispose(); }
console.log(JSON.stringify({ status: "PASS", checks, scope: "actual camera/ground, complete Contact GLB hierarchy and fallback projections, owned parquet/lights; raster occlusion, shader compilation and performance require browser review", summary,
  contact: { binary: importedContact.stats, projections: contactSummary } }, null, 2));
