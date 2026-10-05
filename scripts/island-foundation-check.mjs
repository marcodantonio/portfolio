import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import * as THREE from "three";

// Actual source modules and real Float32 geometry, no substituted terrain,
// network, WebGL or visual-fidelity/performance claim.
const modules = new Map();
function moduleURL(file) {
  const absolute = new URL(file, import.meta.url);
  if (modules.has(absolute.href)) return modules.get(absolute.href);
  let source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  source = source.replace(/from\s+(["'])([^"']+)\1/g, (_match, _quote, specifier) =>
    `from ${JSON.stringify(specifier.startsWith(".") ? moduleURL(new URL(`${specifier}.ts`, absolute).href) : import.meta.resolve(specifier))}`);
  const url = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  modules.set(absolute.href, url); return url;
}
const map = await import(moduleURL("../lib/island-map.ts"));
const { getFoundationHulls, getFoundationFooting, FOUNDATION_DECKS } = await import(moduleURL("../lib/island-foundation-map.ts"));
const { createIslandFoundations } = await import(moduleURL("../lib/island-foundations.ts"));
const { SEA_CLIFF_FOUNDATION_Y } = await import(moduleURL("../lib/island-coast.ts"));
let checks = 0;
const check = (condition, label) => { assert(condition, label); checks++; };
const epsilon = 2e-5; // Float32 world coordinates, not a contact-gap allowance.
const signature = () => createHash("sha256").update(JSON.stringify({ decks: map.WORLD_SUPPORT_DECKS,
  hulls: map.WORLD_STRUCTURE_HULLS, props: map.WORLD_PROPS, stations: map.WORLD_STATIONS }))
  .update(Buffer.concat(map.TERRITORIES.flatMap(territory => {
    const mesh = map.getTerrainMesh(territory); return [Buffer.from(mesh.vertices.buffer), Buffer.from(mesh.indices.buffer)];
  }))).digest("hex");
const originalSignature = signature();
const sha = value => createHash("sha256").update(value).digest("hex");
// These six XYZ hashes were measured BEFORE Dance integration, after the
// independently verified softer-coast revision. They are not hashes of the
// current module accepted as new snapshots. Indices/props/stations also have
// older immutable guards from the actual-module physics gate.
const preDanceTerrain = {
  main: "46b1147ed2fa1d3ef444529b03dd18e84b91fd20e3bc895558764910de3ccc79",
  projects: "5dfe4e74fd68978c7a2be0ab2ccd359eae536db5d7a29d48be862462569ba015",
  ridge: "025c0335147f4f575d409d661d838ade779ca21f13f58e38a8138702de02e692",
  skills: "fa7dcce27ecc356dc1d3cc8d4d3a82935e42f4583b3ba0c3270dfce55f484fca",
  tesla: "7b29325a2b388396f97db611e043a44a79ec030877ac1a51355bd5c9da819ce2",
  dance: "71e398c6e6d476629035648e0708fc15fcc371227164fce664016abdc8ba284b",
};
for (const territory of map.TERRITORIES) {
  const { vertices, indices } = map.getTerrainMesh(territory);
  check(sha(Buffer.from(vertices.buffer, vertices.byteOffset, vertices.byteLength)) === preDanceTerrain[territory.id], `${territory.id}: complete pre-Dance XYZ buffer remains exact`);
  check(sha(Buffer.from(indices.buffer, indices.byteOffset, indices.byteLength)) === "95da1b1ff224794cd1408e3fd7b886b4bd38f2438b91e86fcd95aa85c0ea9ec3", `${territory.id}: complete historical triangle topology remains exact`);
}
check(map.WORLD_PROPS.length === 196 && sha(JSON.stringify(map.WORLD_PROPS)) === "18dfc876eddb0674f1f2160193212bc605c49b1ae985dfdaf1ee439a1f5d600b", "all 196 historical prop identities/poses remain exact");
check(map.WORLD_STATIONS.length === 21 && sha(JSON.stringify(map.WORLD_STATIONS)) === "0c0da487ad243a81b9ca330cbc959974ab8e76706176c58fffcc0591a455a7aa", "all 21 historical station anchors remain exact");
// Reconstruct the old five building contracts independently: immutable
// original authoring JSON plus the original Studio dimensions. Do NOT freeze
// the present WORLD_SUPPORT_DECKS/WORLD_STRUCTURE_HULLS arrays to bless a change.
const legacyDeckSpecs = [
  ["about-home-studio-deck", "about", "main", -15, 42, 12, 8, 4.4],
  ["workshop-deck", "projects", "projects", -16, -38, 30, 24, 4.8],
  ["archive-deck", "education", "ridge", 90, 18, 18, 14, 6.3],
  ["lab-deck", "skills", "skills", -9, -133, 20, 16, undefined],
  ["welcome-harbor-deck", "welcome", "main", -13, 70, 6.2, 4.2, 2.8],
];
check(map.WATER_LEVEL === -3.2, "unchanged sea level, not an artificial waterline lift");
const expectedLegacyDecks = legacyDeckSpecs.map(([id, island, territory, x, z, width, depth, clearance]) =>
  ({ id, island, territory, x, z, width, depth, thickness: .24, top: (clearance === undefined ? 38 : -3.2 + clearance) + .06, yaw: 0 }));
const legacyIslands = new Set(expectedLegacyDecks.map(deck => deck.island));
const expectedLegacyHulls = [];
const studioDeck = expectedLegacyDecks[0];
function studioBox(id, role, x, blenderY, width, height, depth) {
  expectedLegacyHulls.push({ id: `about-${id}`, island: "about", kind: "box", role,
    x: studioDeck.x + x, y: studioDeck.top + height / 2, z: studioDeck.z - blenderY, width, height, depth, yaw: 0 });
}
for (const [row, blenderY, height] of [["front", .9, 4.2], ["rear", 3.6, 5.26]])
  [-5.45, -.97, 3.5].forEach((x, i) => studioBox(`house-post-${row}-${i}`, "post", x, blenderY, .34, height, .34));
for (const [i, [x, blenderY, height]] of [[3.55, 2.6, 4.6], [5.64, 2.05, 4.15], [5.64, -1.25, 3.55], [3.55, .38, 4.09]].entries())
  studioBox(`awning-post-${i}`, "post", x, blenderY, .25, height, .25);
for (const [id, role, x, blenderY, width, height, depth] of [
  ["back-wall", "wall", -.98, 3.65, 9.3, 4.7, .17], ["desk-0", "desk", -2, 0, 4.22, 1.23, 1.34],
  ["bookshelf", "furniture", -3.89, 3.26, 1.9, 3.7, .72], ["office-chair", "furniture", -3.55, -1.28, 1.08, 1.54, 1.03],
  ["reading-chair", "furniture", 4.65, .47, 1.3, 1.5, 1.2], ["side-table", "furniture", 5.15, -.63, .83, .785, .63],
]) studioBox(id, role, x, blenderY, width, height, depth);
for (const [i, [x, z, scale]] of [[-5.1, 2.89, .95], [5.18, -2.85, .96], [-5.19, -2.78, .73], [5.45, 2.72, .75], [1.9, -3.03, .7]].entries()) {
  const radius = .41 * scale, height = .66 * scale;
  expectedLegacyHulls.push({ id: `about-pot-${i}`, island: "about", kind: "cylinder", role: "furniture", x: studioDeck.x + x,
    y: studioDeck.top + height / 2, z: studioDeck.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
}
check(sha(fs.readFileSync(new URL("../assets/archipelago/blender/build_studio_v1.py", import.meta.url))) === "43421ce9ee06146cb053656292c4d772652336a46097d7b373083993eadc4d68", "original Studio authoring source remains exact against manifest-v2 SHA");
for (const [island, file, expectedHash] of [
  ["projects", "workshop-contract-v1.json", "2de584b009cb20293b364e6f8f56bafbad2884b377c2c576dd12304fe0fee56f"],
  ["education", "archive-contract-v1.json", "20ac22ce5c9eb3bb2f68024685d599f9921667e9f1a525bfdb9183210c9674c2"],
  ["skills", "laboratory-contract-v1.json", "022fb79304d0bba114cd51143230840b274ac9b7f1710f06e73946614be69b44"],
  ["welcome", "harbor-contract-v1.json", "fe2f8a5105af0df705845af86c1199f0b82c3f2f3eff2d42fed76ca72e28e7d6"],
]) {
  const bytes = fs.readFileSync(new URL(`../assets/archipelago/${file}`, import.meta.url)), source = JSON.parse(bytes.toString("utf8"));
  check(sha(bytes) === expectedHash, `${island}: immutable original authoring-contract bytes, not current snapshot`);
  const deck = expectedLegacyDecks.find(candidate => candidate.island === island);
  check(source.anchor.x === deck.x && source.anchor.z === deck.z && source.deck.id === deck.id
    && source.deck.width === deck.width && source.deck.depth === deck.depth && source.deck.height === deck.thickness, `${island}: independent deck anchor/extent parity`);
  for (const hull of source.hulls) expectedLegacyHulls.push({ id: hull.id, island, kind: hull.kind, role: hull.role,
    x: deck.x + hull.x, y: deck.top + hull.bottom + hull.height / 2, z: deck.z + hull.z,
    width: hull.width, height: hull.height, depth: hull.depth, radius: hull.radius, yaw: hull.yaw });
}
expectedLegacyHulls.push({ id: "projects-cannon", island: "projects", kind: "cylinder", role: "machine", x: 2 + 2.1,
  y: map.getTerrainHeight(2, -21) + 1.6, z: -21 - .7, width: 3.2, height: 3.2, depth: 3.2, radius: 1.6, yaw: 0 });
const normalized = (items, fields) => items.map(item => Object.fromEntries(fields.map(field => [field, item[field]])))
  .sort((a, b) => a.id.localeCompare(b.id));
const deckFields = ["id", "island", "territory", "x", "z", "width", "depth", "thickness", "top", "yaw"];
const hullFields = ["id", "island", "kind", "role", "x", "y", "z", "width", "height", "depth", "radius", "yaw"];
const expectedLegacyDeckHash = sha(JSON.stringify(normalized(expectedLegacyDecks, deckFields)));
const expectedLegacyHullHash = sha(JSON.stringify(normalized(expectedLegacyHulls, hullFields)));
function verifyLegacy(decks, hulls) {
  assert(sha(JSON.stringify(normalized(decks.filter(deck => legacyIslands.has(deck.island)), deckFields))) === expectedLegacyDeckHash,
    "five existing decks retain exact independent authoring dimensions/poses");
  assert(sha(JSON.stringify(normalized(hulls.filter(hull => legacyIslands.has(hull.island)), hullFields))) === expectedLegacyHullHash,
    "five existing building hulls retain exact independently reconstructed source geometry");
  checks += 2;
}
verifyLegacy(map.WORLD_SUPPORT_DECKS, map.WORLD_STRUCTURE_HULLS);
const changedOldDecks = map.WORLD_SUPPORT_DECKS.map(deck => ({ ...deck })); changedOldDecks.find(deck => deck.island === "about").width += .01;
assert.throws(() => verifyLegacy(changedOldDecks, map.WORLD_STRUCTURE_HULLS), /existing decks/); checks++;
const changedOldHulls = map.WORLD_STRUCTURE_HULLS.map(hull => ({ ...hull })); changedOldHulls.find(hull => hull.island === "about").x += .01;
assert.throws(() => verifyLegacy(map.WORLD_SUPPORT_DECKS, changedOldHulls), /existing building hulls/); checks++;
function local(deck, point) {
  const dx = point.x - deck.x, dz = point.z - deck.z, c = Math.cos(deck.yaw), s = Math.sin(deck.yaw);
  return { x: dx * c - dz * s, y: point.y, z: dx * s + dz * c };
}
const terrainData = new Map();
function terrainFor(deck) {
  const key = `${deck.territory}/${deck.x}/${deck.z}/${deck.yaw}`;
  if (terrainData.has(key)) return terrainData.get(key);
  const mesh = map.getTerrainMesh(map.getTerritory(deck.territory));
  const points = Array.from({ length: mesh.vertices.length / 3 }, (_, i) => local(deck,
    { x: mesh.vertices[i * 3], y: mesh.vertices[i * 3 + 1], z: mesh.vertices[i * 3 + 2] }));
  const triangles = Array.from({ length: mesh.indices.length / 3 }, (_, i) =>
    [points[mesh.indices[i * 3]], points[mesh.indices[i * 3 + 1]], points[mesh.indices[i * 3 + 2]]]);
  const rim = points.slice(-map.TERRAIN_ANGULAR_SEGMENTS);
  const result = { triangles, rim }; terrainData.set(key, result); return result;
}
function barycentric(point, triangle) {
  const [a, b, c] = triangle, denominator = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
  const u = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denominator;
  const v = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denominator;
  return u >= -1e-8 && v >= -1e-8 && u + v <= 1 + 1e-8 ? u * a.y + v * b.y + (1 - u - v) * c.y : undefined;
}
function segmentIntersection(a, b, c, d) {
  const dx = b.x - a.x, dz = b.z - a.z, ex = d.x - c.x, ez = d.z - c.z;
  const denominator = dx * ez - dz * ex;
  if (Math.abs(denominator) < 1e-12) return undefined;
  const t = ((c.x - a.x) * ez - (c.z - a.z) * ex) / denominator;
  const u = ((c.x - a.x) * dz - (c.z - a.z) * dx) / denominator;
  return t >= -1e-8 && t <= 1 + 1e-8 && u >= -1e-8 && u <= 1 + 1e-8
    ? { x: a.x + dx * t, z: a.z + dz * t } : undefined;
}
function inPerimeter(point, rim) {
  let inside = false;
  for (let i = 0, j = rim.length - 1; i < rim.length; j = i++) {
    const a = rim[j], b = rim[i], dx = b.x - a.x, dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
    if (Math.hypot(point.x - a.x - t * dx, point.z - a.z - t * dz) < 1e-7) return true;
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}
function segmentCrossesInterior(a, b, rect) {
  // Slab interval, independently of the production polygon clipper. A concave
  // perimeter can cut through a rectangle even with all four corners inside.
  let near = 0, far = 1;
  for (const axis of ["x", "z"]) {
    const start = a[axis], delta = b[axis] - start, minimum = rect[`min${axis.toUpperCase()}`] + 1e-7,
      maximum = rect[`max${axis.toUpperCase()}`] - 1e-7;
    if (Math.abs(delta) < 1e-12) { if (start <= minimum || start >= maximum) return false; }
    else { const t0 = (minimum - start) / delta, t1 = (maximum - start) / delta;
      near = Math.max(near, Math.min(t0, t1)); far = Math.min(far, Math.max(t0, t1)); }
    if (near >= far) return false;
  }
  return far > 0 && near < 1;
}
function independentFooting(deck, x, z, width, depth) {
  const { triangles, rim } = terrainFor(deck), rect = { minX: x - width / 2, maxX: x + width / 2,
    minZ: z - depth / 2, maxZ: z + depth / 2 };
  const corners = [[rect.minX, rect.minZ], [rect.maxX, rect.minZ], [rect.maxX, rect.maxZ], [rect.minX, rect.maxZ]]
    .map(([px, pz]) => ({ x: px, z: pz }));
  const insideRect = point => point.x >= rect.minX - 1e-8 && point.x <= rect.maxX + 1e-8
    && point.z >= rect.minZ - 1e-8 && point.z <= rect.maxZ + 1e-8;
  let minimum = Infinity;
  for (const triangle of triangles) {
    if (triangle.every(p => p.x < rect.minX) || triangle.every(p => p.x > rect.maxX)
      || triangle.every(p => p.z < rect.minZ) || triangle.every(p => p.z > rect.maxZ)) continue;
    const candidates = [...corners, ...triangle.filter(insideRect)];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
      const point = segmentIntersection(triangle[i], triangle[(i + 1) % 3], corners[j], corners[(j + 1) % 4]);
      if (point) candidates.push(point);
    }
    for (const point of candidates) {
      const y = barycentric(point, triangle);
      if (y !== undefined && insideRect(point)) minimum = Math.min(minimum, y);
    }
  }
  const seabed = corners.some(point => !inPerimeter(point, rim))
    || rim.some((point, i) => segmentCrossesInterior(point, rim[(i + 1) % rim.length], rect));
  return { minimum, seabed, bottom: seabed ? map.WATER_LEVEL - 10 : Math.max(map.WATER_LEVEL - 10, minimum - .24) };
}
function verifyHullContact(hulls) {
  const ids = new Set();
  for (const hull of hulls) {
    const deck = FOUNDATION_DECKS.find(candidate => candidate.id === hull.deckId);
    assert(deck, `${hull.id}: uses an existing supported deck`);
    assert(!ids.has(hull.id), `${hull.id}: unique`); ids.add(hull.id);
    assert(hull.kind === "box" && [hull.x, hull.y, hull.z, hull.width, hull.height, hull.depth, hull.yaw].every(Number.isFinite)
      && Math.min(hull.width, hull.height, hull.depth) > 0, `${hull.id}: finite real box`);
    assert(Math.min(hull.width, hull.depth) <= .72 + 1e-8, `${hull.id}: narrow support, never a filled terrain island`);
    const p = local(deck, hull), top = hull.y + hull.height / 2, bottom = hull.y - hull.height / 2;
    assert(Math.abs(hull.yaw - deck.yaw) < 1e-10 && Math.abs(p.x) + hull.width / 2 <= deck.width / 2 + 1e-8
      && Math.abs(p.z) + hull.depth / 2 <= deck.depth / 2 + 1e-8, `${hull.id}: footprint stays inside its existing floor`);
    assert(top <= deck.top - deck.thickness + 1e-8, `${hull.id}: no raised floor or solid through the existing deck`);
    if (hull.footing !== "structure") {
      const expected = independentFooting(deck, p.x, p.z, hull.width, hull.depth);
      assert(Math.abs(bottom - expected.bottom) < 1e-7, `${hull.id}: exact terrain/seabed contact`);
      assert(hull.footing === (expected.seabed ? "seabed" : "terrain"), `${hull.id}: actual perimeter, not analytic radius`);
      if (!expected.seabed) assert(bottom <= expected.minimum - .24 + 1e-7, `${hull.id}: entire footprint embeds 24cm into actual triangles`);
      assert(bottom >= SEA_CLIFF_FOUNDATION_Y - 1e-8, `${hull.id}: no unnecessary foundation below the coast base`);
    }
    checks += 8;
  }
}
function verifyPostSeats(hulls) {
  for (const building of [map.HOME_STUDIO, map.ARCHIVE_OBSERVATORY, map.DANCE_PAVILION]) for (const post of building.hulls.filter(hull => hull.role === "post")) {
    const deck = building.deck, p = local(deck, post), { triangles } = terrainFor(deck);
    const soil = triangles.map(triangle => barycentric(p, triangle)).filter(y => y !== undefined);
    const ground = soil.length ? Math.max(...soil) : map.WATER_LEVEL - 10;
    const seat = deck.top - deck.thickness - (deck.island === "about" ? .20 : deck.island === "dance" ? .22 : .14);
    if (ground < seat) assert(hulls.some(hull => hull.deckId === deck.id && hull.part === "pier"
      && Math.abs(hull.x - post.x) < 1e-8 && Math.abs(hull.z - post.z) < 1e-8
      && hull.width >= post.width && hull.depth >= post.depth), `${post.id}: exposed post has its own ground-seated pier`);
    if (deck.island === "about") assert(hulls.some(hull => hull.deckId === deck.id && hull.part === "bearing"
      && Math.abs(hull.x - post.x) < 1e-8 && Math.abs(hull.z - post.z) < 1e-8
      && Math.abs(hull.y + hull.height / 2 - (deck.top - deck.thickness)) < 1e-8), `${post.id}: timber shoe reaches the deck underside`);
    if (deck.island === "dance") {
      const pier = hulls.find(hull => hull.deckId === deck.id && hull.part === "pier"
        && Math.abs(hull.x - post.x) < 1e-8 && Math.abs(hull.z - post.z) < 1e-8
        && hull.width === post.width && hull.depth === post.depth);
      assert(pier && Math.abs(pier.y + pier.height / 2 - (deck.top - deck.thickness)) < 1e-8,
        `${post.id}: individual exact-footprint timber pile seats the deck underside`);
      const bearer = hulls.find(hull => hull.deckId === deck.id && hull.part === "bearing"
        && Math.abs(hull.z - post.z) < 1e-8 && Math.abs(hull.x - post.x) + post.width / 2 <= hull.width / 2 + 1e-8
        && Math.abs(hull.y + hull.height / 2 - (deck.top - deck.thickness)) < 1e-8);
      assert(bearer, `${post.id}: open timber cross-bearer seats the existing post row`);
      assert(Math.min(pier.y + pier.height / 2, bearer.y + bearer.height / 2)
        > Math.max(pier.y - pier.height / 2, bearer.y - bearer.height / 2), `${post.id}: real pile and bearer overlap, not floating gaps`);
      checks += 2;
    }
    checks += 2;
  }
}
const hulls = getFoundationHulls();
verifyHullContact(hulls); verifyPostSeats(hulls);
check(JSON.stringify(hulls) === JSON.stringify(getFoundationHulls()), "repeat construction is deterministic and terrain-owned");
check(FOUNDATION_DECKS.length === 3 && FOUNDATION_DECKS.every(deck => ["about", "education", "dance"].includes(deck.island)), "only three existing exposed structural floors, no extra island");
check(hulls.filter(hull => hull.island !== "dance").length === 59, "all 59 original Studio/Archive supports retained, not replaced by Dance supports");
const danceSupports = hulls.filter(hull => hull.island === "dance");
check(danceSupports.filter(hull => hull.part === "pier").length === 8 && danceSupports.filter(hull => hull.part === "bearing").length === 4
  && danceSupports.every(hull => hull.finish === "timber" && hull.part !== "retaining-wall"), "Dance has only eight narrow timber piles and four open cross-bearers, never a filled plinth");
check(hulls.some(hull => hull.footing === "seabed"), "real off-shore deck fragment needs full seabed contact");
check(hulls.some(hull => hull.footing === "terrain"), "grounded land supports use real soil, not uniform deep piers");
for (const deck of FOUNDATION_DECKS) {
  for (const yaw of [deck.yaw, .37]) for (const [x, z, width, depth] of [[0, 0, 1.1, .64], [-deck.width / 2 + .35, -deck.depth / 2 + .35, .64, .64]]) {
    const rotated = { ...deck, yaw }, expected = independentFooting(rotated, x, z, width, depth);
    const actual = getFoundationFooting(rotated, x, z, width, depth);
    check(Math.abs(actual.bottom - expected.bottom) < 1e-7 && actual.footing === (expected.seabed ? "seabed" : "terrain"), "actual clipping handles rotated footprints and shoreline corners");
    if (actual.minimum !== undefined) check(Math.abs(actual.minimum - expected.minimum) < 1e-7, "exact affine terrain minimum agrees with independent edge-intersection audit");
  }
}
assert.throws(() => getFoundationFooting(FOUNDATION_DECKS[0], 0, 0, -1, .64), /positive dimensions/); checks++;
assert.throws(() => getFoundationFooting(FOUNDATION_DECKS[0], NaN, 0, 1, .64), /positive dimensions/); checks++;
// A real 4mm shore strip that the old analytical radius plus 25mm allowance
// calls soil, although it lies outside every physical Float32 top triangle.
// This deliberately tiny diagnostic is never added to the runtime footprint.
let analyticalFalseSoil;
const main = map.getTerritory("main"), mainMesh = map.getTerrainMesh(main), rimStart = mainMesh.vertices.length / 3 - map.TERRAIN_ANGULAR_SEGMENTS;
for (let i = 0; i < map.TERRAIN_ANGULAR_SEGMENTS && !analyticalFalseSoil; i++) {
  const a = (rimStart + i) * 3, b = (rimStart + (i + 1) % map.TERRAIN_ANGULAR_SEGMENTS) * 3;
  const middleX = (mainMesh.vertices[a] + mainMesh.vertices[b]) / 2, middleZ = (mainMesh.vertices[a + 2] + mainMesh.vertices[b + 2]) / 2;
  const length = Math.hypot(middleX - main.x, middleZ - main.z);
  const deck = { ...map.HOME_STUDIO_DECK, x: middleX + (middleX - main.x) / length * .006,
    z: middleZ + (middleZ - main.z) / length * .006 };
  const analyticGrid = Array.from({ length: 25 }, (_, j) => map.territoryAt(deck.x + (j % 5 / 4 - .5) * .004,
    deck.z + (Math.floor(j / 5) / 4 - .5) * .004, -.025)?.id === "main").every(Boolean);
  const exact = getFoundationFooting(deck, 0, 0, .004, .004);
  if (analyticGrid && exact.coveredArea === 0 && exact.footing === "seabed") analyticalFalseSoil = { x: deck.x, z: deck.z };
}
check(analyticalFalseSoil, "negative fixture: all 25 old analytical samples accept non-existent soil while exact physical triangles require the seabed");
const lifted = hulls.map(hull => ({ ...hull }));
const foot = lifted.find(hull => hull.footing === "terrain"); foot.y += .2;
assert.throws(() => verifyHullContact(lifted), /exact terrain\/seabed contact|raised floor/); checks++;
const falseSea = hulls.map(hull => ({ ...hull })); falseSea.find(hull => hull.footing === "seabed").footing = "terrain";
assert.throws(() => verifyHullContact(falseSea), /actual perimeter/); checks++;
const filled = hulls.map(hull => ({ ...hull })); filled[0].width = 12; filled[0].depth = 8;
assert.throws(() => verifyHullContact(filled), /narrow support/); checks++;
const noVerandaSeat = hulls.filter(hull => !hull.id.includes("bearing-about-awning-post-1"));
assert.throws(() => verifyPostSeats(noVerandaSeat), /timber shoe/); checks++;
for (const support of danceSupports) {
  assert.throws(() => verifyPostSeats(hulls.filter(hull => hull !== support)), /ground-seated pier|individual exact-footprint|cross-bearer/);
  checks++;
}
const shortDancePile = hulls.map(hull => ({ ...hull }));
const uphillPile = shortDancePile.find(hull => hull.id === "foundation-dance-pier-post_west_2");
uphillPile.y -= .01; uphillPile.height -= .02; // bottom unchanged; top alone loses 2cm contact.
assert.throws(() => verifyPostSeats(shortDancePile), /individual exact-footprint/); checks++;

// Read ACTUAL exported structural parts, preserving the complete parent
// affine transform. Source Python dimensions/metadata alone cannot prove seating.
function actualStructuralParts(file, rootName, select, deck) {
  const bytes = fs.readFileSync(new URL(`../public/models/archipelago/${file}`, import.meta.url));
  check(bytes.readUInt32LE(0) === 0x46546c67 && bytes.readUInt32LE(4) === 2 && bytes.readUInt32LE(8) === bytes.length, "real structural master GLB header");
  const binHeader = 20 + bytes.readUInt32LE(12), document = JSON.parse(bytes.subarray(20, binHeader).toString("utf8"));
  check(bytes.readUInt32LE(16) === 0x4e4f534a && bytes.readUInt32LE(binHeader + 4) === 0x004e4942, "actual embedded structural JSON/BIN chunks");
  const bin = bytes.subarray(binHeader + 8), binary = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const worldMatrix = new THREE.Matrix4().makeRotationY(deck.yaw);
  worldMatrix.setPosition(deck.x, deck.top, deck.z);
  const parts = [], point = new THREE.Vector3();
  const matrixFor = node => node.matrix ? new THREE.Matrix4().fromArray(node.matrix) : new THREE.Matrix4().compose(
    new THREE.Vector3().fromArray(node.translation ?? [0, 0, 0]), new THREE.Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new THREE.Vector3().fromArray(node.scale ?? [1, 1, 1]));
  function visit(index, parent, active) {
    const node = document.nodes[index], matrix = parent.clone().multiply(matrixFor(node));
    active ||= node.name === rootName;
    if (active && select(node)) {
      const bounds = new THREE.Box3(), transformed = worldMatrix.clone().multiply(matrix);
      let vertices = 0;
      for (const primitive of document.meshes[node.mesh].primitives) {
        const accessor = document.accessors[primitive.attributes.POSITION], view = document.bufferViews[accessor.bufferView];
        check(accessor.type === "VEC3" && accessor.componentType === 5126 && !accessor.sparse && view.buffer === 0, "portable real structural POSITION accessor");
        const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0), stride = view.byteStride ?? 12;
        check(start + (accessor.count - 1) * stride + 12 <= (view.byteOffset ?? 0) + view.byteLength, "structural accessor is inside the actual embedded buffer");
        for (let i = 0; i < accessor.count; i++) {
          point.set(binary.getFloat32(start + i * stride, true), binary.getFloat32(start + i * stride + 4, true), binary.getFloat32(start + i * stride + 8, true)).applyMatrix4(transformed);
          check(point.toArray().every(Number.isFinite), "finite actual transformed structural vertex"); bounds.expandByPoint(point); vertices++;
        }
      }
      parts.push({ name: node.name, bounds, vertices, hullId: node.extras?.shared_hull_id });
    }
    for (const child of node.children ?? []) visit(child, matrix, active);
  }
  for (const index of document.scenes[document.scene ?? 0].nodes) visit(index, new THREE.Matrix4(), false);
  return parts;
}
const joists = actualStructuralParts("studio-v2.glb", "HomeStudio_V2_Origin_At_Deck_Centre",
  node => node.name.startsWith("Studio_Deck_Underside_Joist_"), map.HOME_STUDIO_DECK);
check(joists.length === 3, "three actual exported underside joists, no metadata-only substitute");
function verifyJoistSeats(checkedJoists, checkedHulls) {
  const bearers = checkedHulls.filter(hull => hull.deckId === map.HOME_STUDIO_DECK.id && hull.id.includes("cross-bearing"));
  assert(bearers.length === 2, "two veranda cross-bearers");
  for (const joist of checkedJoists) for (const bearer of bearers) {
    const box = new THREE.Box3(new THREE.Vector3(bearer.x - bearer.width / 2, bearer.y - bearer.height / 2, bearer.z - bearer.depth / 2),
      new THREE.Vector3(bearer.x + bearer.width / 2, bearer.y + bearer.height / 2, bearer.z + bearer.depth / 2));
    assert(box.intersectsBox(joist.bounds), `${joist.name}: actual GLB timber intersects its real cross-bearing`);
    const overlap = Math.min(box.max.y, joist.bounds.max.y) - Math.max(box.min.y, joist.bounds.min.y);
    assert(overlap > .17 && overlap < .20, `${joist.name}: measured 18cm structural overlap, not a hanging beam`);
    checks += 2;
  }
}
verifyJoistSeats(joists, hulls);
const floatingJoists = joists.map(joist => ({ ...joist, bounds: joist.bounds.clone().translate(new THREE.Vector3(0, 1, 0)) }));
assert.throws(() => verifyJoistSeats(floatingJoists, hulls), /actual GLB timber intersects/); checks++;

const danceParts = actualStructuralParts("dance-pavilion-v1.glb", map.DANCE_PAVILION.root,
  node => node.name === "DancePavilion_Deck_Structure"
    || /^DancePavilion_Post_(East|West)_[0-3]_Worked_Block_0\.12$/.test(node.name), map.DANCE_PAVILION_DECK);
const dancePlate = danceParts.find(part => part.name === "DancePavilion_Deck_Structure");
const dancePostFeet = danceParts.filter(part => part !== dancePlate);
check(dancePlate && dancePostFeet.length === 8 && new Set(dancePostFeet.map(part => part.hullId)).size === 8,
  "actual Dance master contains its structural plate and eight distinct post feet");
function verifyDanceAssetSeats(plate, postFeet, checkedHulls) {
  const deck = map.DANCE_PAVILION_DECK, underside = deck.top - deck.thickness;
  assert(Math.abs(plate.bounds.min.y - underside) < epsilon, "actual Dance GLB structural plate contacts the existing deck underside");
  assert(Math.abs(plate.bounds.min.x - (deck.x - deck.width / 2)) < epsilon
    && Math.abs(plate.bounds.max.x - (deck.x + deck.width / 2)) < epsilon
    && Math.abs(plate.bounds.min.z - (deck.z - deck.depth / 2)) < epsilon
    && Math.abs(plate.bounds.max.z - (deck.z + deck.depth / 2)) < epsilon, "actual Dance plate fits the shared footprint, not an unrelated image");
  for (const postFoot of postFeet) {
    const post = map.DANCE_PAVILION.hulls.find(hull => hull.id === postFoot.hullId);
    assert(post && Math.abs(postFoot.bounds.min.y - deck.top) < epsilon,
      `${postFoot.name}: actual exported post foot seats on the existing deck top`);
    const pier = checkedHulls.find(hull => hull.id === `foundation-dance-pier-${post.id}`);
    assert(pier && Math.abs(pier.y + pier.height / 2 - plate.bounds.min.y) < epsilon,
      `${postFoot.name}: real timber pile contacts the actual GLB plate underside`);
    const center = postFoot.bounds.getCenter(new THREE.Vector3());
    assert(Math.abs(center.x - pier.x) < epsilon && Math.abs(center.z - pier.z) < epsilon
      && postFoot.bounds.max.x - postFoot.bounds.min.x <= pier.width + epsilon
      && postFoot.bounds.max.z - postFoot.bounds.min.z <= pier.depth + epsilon,
    `${postFoot.name}: full actual foot sits over its exact physical pile`);
    checks += 3;
  }
  checks += 2;
}
verifyDanceAssetSeats(dancePlate, dancePostFeet, hulls);
const raisedDancePlate = { ...dancePlate, bounds: dancePlate.bounds.clone().translate(new THREE.Vector3(0, .02, 0)) };
assert.throws(() => verifyDanceAssetSeats(raisedDancePlate, dancePostFeet, hulls), /actual Dance GLB structural plate contacts/); checks++;
const raisedDanceFeet = dancePostFeet.map((foot, i) => i ? foot : { ...foot, bounds: foot.bounds.clone().translate(new THREE.Vector3(0, .02, 0)) });
assert.throws(() => verifyDanceAssetSeats(dancePlate, raisedDanceFeet, hulls), /exported post foot seats/); checks++;

const reports = [];
for (const compact of [false, true]) {
  const art = createIslandFoundations({ compact });
  try {
    art.group.updateMatrixWorld(true);
    const resources = new Set(), finishCounts = { stone: 0, timber: 0 };
    let vertices = 0, triangles = 0;
    check(art.group.children.length === 2, "exactly two material batches, no duplicated or missing supports");
    for (const mesh of art.group.children) {
      check(mesh.isMesh && !mesh.isInstancedMesh && mesh.castShadow && mesh.receiveShadow, "real owned static shadow-casting support batch");
      const geometry = mesh.geometry, material = mesh.material, positions = geometry.attributes.position;
      resources.add(geometry); resources.add(material);
      const finish = geometry.attributes.timberGrain ? "timber" : "stone", expectedHulls = hulls.filter(hull => hull.finish === finish);
      finishCounts[finish] += expectedHulls.length;
      check(positions.count === expectedHulls.length * 24 && geometry.index.count === expectedHulls.length * 36, "12 actual triangles and six closed faces per exact shared cuboid");
      vertices += positions.count; triangles += geometry.index.count / 3;
      check(geometry.boundingBox && !geometry.boundingBox.isEmpty() && Number.isFinite(geometry.boundingSphere?.radius), "finite actual bounds");
      for (const [name, attribute] of Object.entries(geometry.attributes)) check(attribute.count === positions.count && attribute.array.every(Number.isFinite), `finite matching ${name} attribute`);
      const point = new THREE.Vector3(), normal = new THREE.Vector3(), cross = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let h = 0; h < expectedHulls.length; h++) {
        const hull = expectedHulls[h], rotation = new THREE.Matrix4().makeRotationY(hull.yaw), expectedCorners = [];
        for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) expectedCorners.push(new THREE.Vector3(x * hull.width / 2, y * hull.height / 2, z * hull.depth / 2)
          .applyMatrix4(rotation).add(new THREE.Vector3(hull.x, hull.y, hull.z)));
        for (let i = h * 24; i < (h + 1) * 24; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
          check(expectedCorners.some(corner => corner.distanceTo(point) < epsilon), `${hull.id}: actual rendered vertex matches collision-box corner`);
          normal.fromBufferAttribute(geometry.attributes.normal, i);
          check(Math.abs(normal.length() - 1) < 1e-6, `${hull.id}: unit normal`);
        }
        let surfaceArea = 0;
        for (let i = h * 36; i < (h + 1) * 36; i += 3) {
          const ia = geometry.index.getX(i), ib = geometry.index.getX(i + 1), ic = geometry.index.getX(i + 2);
          check([ia, ib, ic].every(index => index >= h * 24 && index < (h + 1) * 24), "batch indices do not bridge neighbouring foundation cuboids");
          a.fromBufferAttribute(positions, ia); b.fromBufferAttribute(positions, ib); c.fromBufferAttribute(positions, ic);
          cross.subVectors(b, a).cross(c.clone().sub(a));
          check(cross.length() > 1e-7 && cross.dot(normal.fromBufferAttribute(geometry.attributes.normal, ia)) > 0, "non-degenerate actual outward-facing triangle");
          surfaceArea += cross.length() / 2;
        }
        check(Math.abs(surfaceArea - 2 * (hull.width * hull.height + hull.width * hull.depth + hull.height * hull.depth)) < .001, "all six real faces close the exact world-space solid");
      }
      const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader };
      material.onBeforeCompile(shader, undefined);
      check(!shader.vertexShader.includes("undefined") && !shader.fragmentShader.includes("undefined"), "finite constructed shader hooks, not WebGL compilation");
      if (finish === "timber") check(geometry.attributes.timberGrain?.itemSize === 2 && shader.vertexShader.includes("vTimberGrain = timberGrain"), "real authored bearing grain drives its material");
      else check(shader.fragmentShader.includes("foundationJointUV") && shader.fragmentShader.includes("foundationResolved") && shader.uniforms.uMineralWaterLevel.value === map.WATER_LEVEL, "filtered masonry and exact sea-relative wetness hook");
    }
    const counts = new Map([...resources].map(resource => [resource, 0]));
    for (const resource of resources) resource.addEventListener("dispose", () => counts.set(resource, counts.get(resource) + 1));
    art.dispose(); check([...counts.values()].every(count => count === 1) && art.group.children.length === 0, "normal disposal releases each owned material/geometry exactly once");
    art.dispose(); check([...counts.values()].every(count => count === 1), "idempotent disposal");
    reports.push({ compact, hulls: hulls.length, finishCounts, meshes: 2, vertices, triangles });
  } finally { art.dispose(); }
}

// Inject a real late-construction failure after every source cuboid and both
// materials have been allocated, then verify rollback of all allocations.
const allocation = { geometries: new Set(), materials: new Set(), released: new Map() };
const oldAttribute = THREE.BufferGeometry.prototype.setAttribute, oldGeometryDispose = THREE.BufferGeometry.prototype.dispose,
  oldMaterialValues = THREE.Material.prototype.setValues, oldMaterialDispose = THREE.Material.prototype.dispose,
  oldSphere = THREE.BufferGeometry.prototype.computeBoundingSphere;
try {
  THREE.BufferGeometry.prototype.setAttribute = function (...args) { allocation.geometries.add(this); return oldAttribute.apply(this, args); };
  THREE.Material.prototype.setValues = function (...args) { allocation.materials.add(this); return oldMaterialValues.apply(this, args); };
  THREE.BufferGeometry.prototype.dispose = function () { allocation.released.set(this, (allocation.released.get(this) ?? 0) + 1); return oldGeometryDispose.call(this); };
  THREE.Material.prototype.dispose = function () { allocation.released.set(this, (allocation.released.get(this) ?? 0) + 1); return oldMaterialDispose.call(this); };
  THREE.BufferGeometry.prototype.computeBoundingSphere = function () { throw new Error("foundation injected bounding-sphere failure"); };
  assert.throws(() => createIslandFoundations(), /injected bounding-sphere failure/); checks++;
} finally {
  THREE.BufferGeometry.prototype.setAttribute = oldAttribute; THREE.BufferGeometry.prototype.dispose = oldGeometryDispose;
  THREE.Material.prototype.setValues = oldMaterialValues; THREE.Material.prototype.dispose = oldMaterialDispose;
  THREE.BufferGeometry.prototype.computeBoundingSphere = oldSphere;
}
check(allocation.geometries.size === hulls.length + 1 && allocation.materials.size === 2, "failure occurred after every actual box and first aggregate allocation");
check([...allocation.geometries, ...allocation.materials].every(resource => allocation.released.get(resource) === 1), "partial-construction rollback releases every actual allocation exactly once");
check(signature() === originalSignature, "all terrain vertices/indices, decks, existing hulls/props/stations remain unchanged");
const contactErrors = hulls.filter(hull => hull.footing !== "structure").map(hull => {
  const deck = FOUNDATION_DECKS.find(candidate => candidate.id === hull.deckId), p = local(deck, hull);
  const expected = independentFooting(deck, p.x, p.z, hull.width, hull.depth);
  return Math.abs(hull.y - hull.height / 2 - expected.bottom);
});
console.log(JSON.stringify({ status: "PASS", checks, scope: "exact physical support contact, real Three geometry and ownership; not shader compilation, visual acceptance or FPS",
  contacts: { terrain: hulls.filter(hull => hull.footing === "terrain").length, seabed: hulls.filter(hull => hull.footing === "seabed").length,
    structure: hulls.filter(hull => hull.footing === "structure").length, maximumFootingError: Math.max(...contactErrors), terrainEmbed: .24,
    seabedHeight: SEA_CLIFF_FOUNDATION_Y }, legacyContracts: { deckHash: expectedLegacyDeckHash, hullHash: expectedLegacyHullHash,
      provenance: "independently reconstructed immutable original contracts, not a recorded current-array snapshot" },
    danceSupports: { piers: 8, crossBearers: 4, material: "timber", newWalkingSurface: false,
      actualPlateUnderside: dancePlate.bounds.min.y, maximumActualPlateContactGap: Math.max(...danceSupports
        .filter(hull => hull.part === "pier").map(hull => Math.abs(hull.y + hull.height / 2 - dancePlate.bounds.min.y))) },
    actualStudioJoists: joists.map(joist => ({ name: joist.name, vertices: joist.vertices,
      min: joist.bounds.min.toArray(), max: joist.bounds.max.toArray() })), reports }, null, 2));
