import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";
import { Matrix4, Quaternion, Vector3 } from "three";

// Execute the actual browser modules with their real Rapier WASM controller.
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compile = (file) => transpile(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const dataURL = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const mapURL = dataURL(compile("../lib/island-map.ts"));
// New foundations are real solids in the browser module. Compile their pure
// dependencies against the SAME map, including filtered negative fixtures;
// never stub them out to preserve historical physics passing claims.
const foundationURLFor = (sourceMapURL) => {
  const coastURL = dataURL(compile("../lib/island-coast.ts").replace('"./island-map"', JSON.stringify(sourceMapURL)));
  return dataURL(compile("../lib/island-foundation-map.ts")
    .replace('"./island-map"', JSON.stringify(sourceMapURL)).replace('"./island-coast"', JSON.stringify(coastURL)));
};
const { getIslandWalkingShot, ISLAND_CAMERA_FOV, ISLAND_WALKING_SHOTS } = await import(dataURL(compile("../lib/island-camera.ts")));
const { AREAS, TERRITORIES, BRIDGES, CONNECTIONS, TRAVEL_ROUTES, BOAT_DOCKS, CONTACT_DOCK, WORLD_PROPS, WORLD_STATIONS, WORLD_STRUCTURE_HULLS, HOME_STUDIO, HOME_STUDIO_DECK, DIGITAL_WORKSHOP_DECK, WORKSHOP, ARCHIVE_OBSERVATORY, ARCHIVE_OBSERVATORY_DECK, SUSPENDED_LAB, SUSPENDED_LAB_DECK, WELCOME_HARBOR, WELCOME_HARBOR_DECK, DANCE_PAVILION, DANCE_PAVILION_DECK, CONTACT_LIGHTHOUSE_DECK, WORLD_SUPPORT_DECKS, WALK_PATHS, ARCHITECTURE,
  getArrival, getBoatRoutePoint, getBridgePoint, getBridgeProfile, getConnectionPath, getDockPoint, getGroundHeight, getIsland, getShoreRadius, getStationApproach, getTerrainHeight, getTerrainMesh,
  isWalkable, islandAt, supportDeckAt, territoryAt, SPAWN, WATER_LEVEL, LAND_CLEARANCE, TERRAIN_ANGULAR_SEGMENTS } = await import(mapURL);
const physicsSource = compile("../lib/island-physics.ts")
  .replace('"@dimforge/rapier3d-compat"', JSON.stringify(import.meta.resolve("@dimforge/rapier3d-compat")));
const physicsURLFor = (sourceMapURL) => dataURL(physicsSource
  .replace('"./island-map"', JSON.stringify(sourceMapURL))
  .replace('"./island-foundation-map"', JSON.stringify(foundationURLFor(sourceMapURL))));
const physicsURL = physicsURLFor(mapURL);
const { getFoundationHulls } = await import(foundationURLFor(mapURL));
const foundationHulls = getFoundationHulls();
const { createIslandPhysics } = await import(physicsURL);
const physics = await createIslandPhysics(), dt = 1 / 60;
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks++; };
// Asset source contracts record their original authoring-world placement. The
// portable geometry and hulls remain local and unscaled; the shared map alone
// owns the user-requested sea-relative relocation. Never rewrite provenance to
// make a changed runtime anchor look like an unchanged exported world height.
const checkRelocatedAnchor = (building, source, originalY) => {
  check(source.anchor.y === originalY, `${building.island} immutable authoring-world height remains ${originalY}`);
  check(source.anchor.island === building.island && source.anchor.x === building.anchor.x
    && source.anchor.z === building.anchor.z && source.anchor.yaw === building.deck.yaw,
  `${building.island} relocation preserves source XZ/yaw, not asset scaling or geometry`);
  const expectedY = WATER_LEVEL + LAND_CLEARANCE[building.island] + .06;
  check(Math.abs(building.anchor.y - expectedY) < 1e-8 && building.deck.top === building.anchor.y,
    `${building.island} runtime anchor has explicit shared sea-relative placement ${expectedY}`);
  return building.anchor.y - source.anchor.y;
};
const settle = (targetPhysics = physics) => { let state; for (let i = 0; i < 90; i++) state = targetPhysics.update(0, 0, dt); return state; };
const walkTo = (x, z, steps = 2500, speed = 12, targetPhysics = physics) => {
  let state = targetPhysics.update(0, 0, dt);
  for (let i = 0; i < steps; i++) {
    const dx = x - state.x, dz = z - state.z, distance = Math.hypot(dx, dz);
    if (distance < 0.08) { targetPhysics.stop(); return settle(targetPhysics); }
    const velocity = Math.min(speed, distance * 5);
    state = targetPhysics.update(dx / distance * velocity, dz / distance * velocity, dt);
  }
  return state;
};
const reached = (state, target) => Math.hypot(state.x - target.x, state.z - target.z) < 0.12;
// Capsule radius + Rapier controller offset, not the scenery's visual bounds.
const capsuleClearance = 0.345;
// On an inclined plane the rounded capsule sole is above the centerline's
// height sample. The unchanged 0.32m radius /45° climb limit permit this exact
// geometric difference; it is not unsupported hovering or a larger step limit.
const slopeFootClearance = .32 * (Math.SQRT2 - 1) + .025 + .01;
const distanceToHull = (point, hull) => {
  const dx = point.x - hull.x, dz = point.z - hull.z;
  if (hull.kind === "cylinder") return Math.max(0, Math.hypot(dx, dz) - hull.radius);
  const x = dx * Math.cos(hull.yaw) - dz * Math.sin(hull.yaw), z = dx * Math.sin(hull.yaw) + dz * Math.cos(hull.yaw);
  return Math.hypot(Math.max(0, Math.abs(x) - hull.width / 2), Math.max(0, Math.abs(z) - hull.depth / 2));
};
const overlapsHull = (point, hull, padding = capsuleClearance) => distanceToHull(point, hull) < padding;
const buildingCollisionApproach = (hull, hulls = WORLD_STRUCTURE_HULLS, preferredDirections, supportedEntry = () => true) => {
  // Choose a genuinely clear, supported entry; do not let another object prove
  // this object's collision by accidentally blocking the same approach first.
  const diagonal = Math.SQRT1_2, directions = preferredDirections ?? [[0, 1], [0, -1], [1, 0], [-1, 0]];
  if (hull.kind === "box" && Math.abs(hull.width - hull.depth) < 1e-8)
    directions.push([diagonal, diagonal], [-diagonal, diagonal], [diagonal, -diagonal], [-diagonal, -diagonal]);
  for (const [nx, nz] of directions) {
    const edge = hull.kind === "cylinder" ? hull.radius : (nx && nz ? hull.width / Math.SQRT2 : (nx ? hull.width : hull.depth) / 2);
    for (const runup of [0.85, 0.65, 1.15]) {
      const start = { x: hull.x + nx * (edge + runup), z: hull.z + nz * (edge + runup) };
      const contact = { x: hull.x + nx * (edge + capsuleClearance), z: hull.z + nz * (edge + capsuleClearance) };
      const clear = Array.from({ length: 17 }, (_, index) => ({
        x: start.x + (contact.x - start.x) * index / 16, z: start.z + (contact.z - start.z) * index / 16,
      })).every((point) => isWalkable(point.x, point.z) && supportedEntry(point)
        && !hulls.some((other) => other.id !== hull.id && overlapsHull(point, other))
        && !foundationHulls.some((foundation) => foundation.y + foundation.height / 2 > getGroundHeight(point.x, point.z) + .01
          && overlapsHull(point, foundation)));
      if (clear) return { start, contact, nx, nz, edge };
    }
  }
  return undefined;
};
const createBuildingFixture = async (island, retainedHull, includeDeck = true) => {
  const retainedId = JSON.stringify(retainedHull?.id ?? null);
  const fixtureMapURL = dataURL(`export * from ${JSON.stringify(mapURL)};
    import { WORLD_STRUCTURE_HULLS as hulls, HOME_STUDIO, WORKSHOP, ARCHIVE_OBSERVATORY, SUSPENDED_LAB, WELCOME_HARBOR, DANCE_PAVILION } from ${JSON.stringify(mapURL)};
    const buildingIds = new Set(({about: HOME_STUDIO, projects: WORKSHOP, education: ARCHIVE_OBSERVATORY, skills: SUSPENDED_LAB, welcome: WELCOME_HARBOR, dance: DANCE_PAVILION})[${JSON.stringify(island)}].hulls.map((hull) => hull.id));
    ${includeDeck ? "" : `import { WORLD_SUPPORT_DECKS as decks } from ${JSON.stringify(mapURL)};`}
    export const WORLD_STRUCTURE_HULLS = hulls.filter((hull) => !buildingIds.has(hull.id) || hull.id === ${retainedId});
    ${includeDeck ? "" : `export const WORLD_SUPPORT_DECKS = decks.filter((deck) => deck.island !== ${JSON.stringify(island)});`}`);
  const module = await import(physicsURLFor(fixtureMapURL));
  return module.createIslandPhysics();
};
const coast = (territory) => {
  const vertices = getTerrainMesh(territory).vertices, first = vertices.length / 3 - TERRAIN_ANGULAR_SEGMENTS;
  return Array.from({ length: TERRAIN_ANGULAR_SEGMENTS }, (_, sector) => ({ x: vertices[(first + sector) * 3], z: vertices[(first + sector) * 3 + 2] }));
};
const projected = (point, a, b) => {
  const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz)));
  return { x: a.x + dx * t, z: a.z + dz * t };
};
const inside = (point, polygon) => {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a.z > point.z) !== (b.z > point.z) && point.x < (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x) result = !result;
  }
  return result;
};
const cross = (a, b, c) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
const boundaryGap = (a, b) => {
  let distance = Infinity, start, end, overlap = inside(a[0], b) || inside(b[0], a);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) {
    const p = a[i], q = a[(i + 1) % a.length], r = b[j], s = b[(j + 1) % b.length];
    overlap ||= cross(p, q, r) * cross(p, q, s) < 0 && cross(r, s, p) * cross(r, s, q) < 0;
    const candidates = [[p, projected(p, r, s)], [projected(r, p, q), r]];
    for (const [from, to] of candidates) {
      const gap = Math.hypot(to.x - from.x, to.z - from.z);
      if (gap < distance) { distance = gap; start = from; end = to; }
    }
  }
  return { distance, start, end, overlap };
};
// Reconstruct the former height-only expressions, then certify them against
// independently frozen full XYZ/profile hashes below before deriving planar
// baselines. This cannot bless changed XZ geography simply by hashing the
// currently edited module; the historical XYZ hashes must first agree.
const currentMapSource = fs.readFileSync(new URL("../lib/island-map.ts", import.meta.url), "utf8");
const historicalElevations = { welcome: 12, about: 14, projects: 18, experience: 18, education: 19, tesla: 9, dance: 10, contact: 13 };
const historicalMapSource = currentMapSource
  .replace('export const WALK_PATHS = walkPaths(getConnectionPath);', 'export const WALK_PATHS = walkPaths(getSeedConnectionPath);')
  .replace(/\/\/ NATURAL_APPROACH_START[\s\S]*?\/\/ NATURAL_APPROACH_END/g, "")
  .replace(/\/\/ NATURAL_HARBOR_SHOULDER_START[\s\S]*?\/\/ NATURAL_HARBOR_SHOULDER_END/g, "")
  .replace('smooth(island.floating ? .65 : .5, 1, edge)', 'smooth(.65, 1, edge)')
  .replace(/landElevation\("(welcome|about|projects|experience|education|tesla|dance|contact)"\)/g,
    (_, id) => String(historicalElevations[id]))
  .replace('const shore = island.floating ? island.elevation - 1.7 : WATER_LEVEL + .55 + Math.sin(angle * 3 + phase) * .12 + Math.sin(angle * 7 - phase) * .05;',
    'const shore = island.floating ? island.elevation - 1.7 : island.elevation * 0.78 + Math.sin(angle * 3 + phase) * 0.35;')
  .replace('(island.floating ? 2.2 : .8)', '2.2').replace('(island.floating ? .35 : .16)', '.35')
  .replace('const coastBlend = island.floating ? 1 : 1 - smooth(area.id === "about" ? .75 : .55, 1, edge);',
    'const coastBlend = area.id === "projects" ? 1 - smooth(0.9, 1, edge) : 1;')
  .replace('height += (area.elevation - height) * (1 - smooth(2.4, 9, Math.hypot(x - area.entrance.x, z - area.entrance.z))) * coastBlend;',
    'height += (area.elevation - height) * (1 - smooth(2.4, 9, Math.hypot(x - area.entrance.x, z - area.entrance.z)));')
  .replace('const sag = to === "dance" || from === "dance" ? -.7 : Math.max(0, Math.min(.65, length * .02, Math.min(start.y, end.y) - WATER_LEVEL - .7));',
    'const sag = to === "dance" || from === "dance" ? -1.1 : Math.min(1.8, length * 0.045);');
const historicalMap = await import(dataURL(transpile(historicalMapSource)));
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const arrayBytes = value => Buffer.from(value.buffer, value.byteOffset, value.byteLength);
const planarVertices = vertices => new Float32Array(Array.from(vertices).filter((_, index) => index % 3 !== 1));
const planarBridge = profile => ({ start: {x: profile.start.x, z: profile.start.z}, end: {x: profile.end.x, z: profile.end.z}, length: profile.length, yaw: profile.yaw });
const planarDock = dock => ({...dock, start: {x: dock.start.x, z: dock.start.z}, end: {x: dock.end.x, z: dock.end.z}});
const planarPath = path => ({...path, from: {x: path.from.x, z: path.from.z}, to: {x: path.to.x, z: path.to.z}});
const planarArea = area => Object.fromEntries(Object.entries(area).filter(([key]) => key !== "elevation"));
const expectedLandClearance = { welcome: 2.8, about: 4.4, projects: 4.8, experience: 5.5, education: 6.3, tesla: 2.7, dance: 2.6, contact: 3.4 };
const immutableAuthoringHashes = {
  projects: "2de584b009cb20293b364e6f8f56bafbad2884b377c2c576dd12304fe0fee56f",
  education: "20ac22ce5c9eb3bb2f68024685d599f9921667e9f1a525bfdb9183210c9674c2",
  skills: "022fb79304d0bba114cd51143230840b274ac9b7f1710f06e73946614be69b44",
  welcome: "fe2f8a5105af0df705845af86c1199f0b82c3f2f3eff2d42fed76ca72e28e7d6",
};
const naturalElevations = module => module.WATER_LEVEL === -3.2
  && module.AREAS.every(area => area.id === "skills" ? area.elevation === 38
    : Math.abs(area.elevation - module.WATER_LEVEL - expectedLandClearance[area.id]) < 1e-8)
  && module.TERRITORIES.filter(territory => !territory.floating).every(territory => {
    const vertices = module.getTerrainMesh(territory).vertices;
    for (let index = 1; index < vertices.length; index += 3)
      if (!Number.isFinite(vertices[index]) || vertices[index] > module.WATER_LEVEL + 7) return false;
    const rim = vertices.slice(-module.TERRAIN_ANGULAR_SEGMENTS * 3);
    for (let index = 1; index < rim.length; index += 3)
      if (rim[index] < module.WATER_LEVEL + .38 - 1e-5 || rim[index] > module.WATER_LEVEL + .72 + 1e-5) return false;
    return true;
  });
// Measure actual shared triangle gradients, weighting percentiles and steep
// coverage by horizontal land area, not by the polar mesh's uneven face count.
// This is geometric evidence; it is not reference-art acceptance or FPS.
const terrainSlopeStats = (module) => Object.fromEntries(module.TERRITORIES.filter(territory => !territory.floating).map(territory => {
  const { vertices: v, indices } = module.getTerrainMesh(territory), faces = [];
  let area = 0, steepArea = 0, maximum = 0;
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index] * 3, b = indices[index + 1] * 3, c = indices[index + 2] * 3;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2];
    const vx = v[c] - v[a], vy = v[c + 1] - v[a + 1], vz = v[c + 2] - v[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const weight = Math.abs(ny) / 2, angle = Math.atan2(Math.hypot(nx, nz), Math.abs(ny)) * 180 / Math.PI;
    faces.push({ angle, weight }); area += weight; maximum = Math.max(maximum, angle);
    if (angle > 45) steepArea += weight;
  }
  faces.sort((a, b) => a.angle - b.angle);
  let accumulated = 0, p95 = 0;
  for (const face of faces) { accumulated += face.weight; p95 = face.angle; if (accumulated >= area * .95) break; }
  return [territory.id, { maxDegrees: maximum, p95Degrees: p95, areaAbove45Percent: steepArea / area * 100 }];
}));
const softenedCoast = stats => Object.entries(stats).every(([id, value]) => id === "ridge"
  ? value.maxDegrees < 65 && value.p95Degrees < 40 && value.areaAbove45Percent < 2
  : value.maxDegrees < 45 && value.areaAbove45Percent === 0);
const slopes = terrainSlopeStats(await import(mapURL));
try {
  check(AREAS.length === 9 && AREAS.filter((a) => a.id !== "welcome").length === 8, "nine places / eight optional visits");
  check(TERRITORIES.length === 6, "six physical surfaces, not nine interchangeable islands");
  check(getIsland("welcome").territory === getIsland("about").territory && getIsland("about").territory === getIsland("contact").territory, "harbor, studio and lighthouse share land");
  check(getIsland("experience").territory === getIsland("education").territory, "experience and education share one continuous ridge");
  check(WORLD_STATIONS.length === 21, "all 21 physical object interactions");
  check(BRIDGES.length === 4 && !BRIDGES.flat().includes("tesla") && !BRIDGES.flat().includes("skills"), "boat and launch have no accidental footbridge");
  check(TRAVEL_ROUTES.length === 4, "boat both ways, cannon and parachute routes");
  for (const building of [WORKSHOP, ARCHIVE_OBSERVATORY, SUSPENDED_LAB, WELCOME_HARBOR])
    check(sha(fs.readFileSync(new URL(`../${building.sourceContract}`, import.meta.url))) === immutableAuthoringHashes[building.island],
      `${building.island} authoring JSON bytes remain immutable; runtime relocation never rewrites export provenance`);
  check(JSON.stringify(LAND_CLEARANCE) === JSON.stringify(expectedLandClearance) && naturalElevations(await import(mapURL)),
    "five normal territories have actual sea-relative low land and .38–.72m rims; only Skills stays suspended");
  const liftedLandSource = currentMapSource.replace('const landElevation = (id: keyof typeof LAND_CLEARANCE) => WATER_LEVEL + LAND_CLEARANCE[id];',
    'const landElevation = (id: keyof typeof LAND_CLEARANCE) => WATER_LEVEL + LAND_CLEARANCE[id] + 20;');
  check(liftedLandSource !== currentMapSource && !naturalElevations(await import(dataURL(transpile(liftedLandSource)))),
    "negative raised-land fixture is rejected even if its coastal walls still extend into the sea");
  const raisedRimSource = currentMapSource.replace('const coastBlend = island.floating ? 1 : 1 - smooth(area.id === "about" ? .75 : .55, 1, edge);', 'const coastBlend = 1;');
  check(raisedRimSource !== currentMapSource && !naturalElevations(await import(dataURL(transpile(raisedRimSource)))),
    "negative raised-coastal-clearing fixture cannot preserve the low shoreline contract");
  check(softenedCoast(slopes), `actual shared low coasts remove steep ordinary shoulders; Ridge remains locally terraced: ${JSON.stringify(slopes)}`);
  const narrowShoulderSource = currentMapSource
    .replace('smooth(island.floating ? .65 : .5, 1, edge)', 'smooth(.65, 1, edge)')
    .replace('smooth(area.id === "about" ? .75 : .55, 1, edge)', 'smooth(.86, 1, edge)');
  const narrowShoulderSlopes = terrainSlopeStats(await import(dataURL(transpile(narrowShoulderSource))));
  check(narrowShoulderSource !== currentMapSource && !softenedCoast(narrowShoulderSlopes),
    `negative narrow-shoulder fixture detects raised disc-like terrain gradients: ${JSON.stringify(narrowShoulderSlopes)}`);
  const nativePosts = WORLD_STRUCTURE_HULLS.filter(hull => hull.island === "tesla" && hull.role === "post");
  check(nativePosts.length === 4, "all four remaining native garage posts keep their original XZ support identity; Dance owns its imported eight posts");
  for (const hull of nativePosts) {
    const area = getIsland(hull.island), architecture = ARCHITECTURE[hull.island];
    check(Math.abs(hull.y - hull.height / 2 - Math.min(area.elevation, getTerrainHeight(hull.x, hull.z))) < 1e-8,
      `${hull.id} extends continuously to actual coastal terrain, not a hovering nominal floor`);
    check(Math.abs(hull.y + hull.height / 2 - area.elevation - architecture.height) < 1e-8 && hull.height >= architecture.height,
      `${hull.id} grounded extension preserves roof/top height rather than lowering the building`);
  }

  const studioDeck = HOME_STUDIO_DECK, studioEntry = getArrival("about");
  check(WORLD_SUPPORT_DECKS.length === 7 && WORLD_SUPPORT_DECKS.includes(studioDeck) && WORLD_SUPPORT_DECKS.includes(DIGITAL_WORKSHOP_DECK)
    && WORLD_SUPPORT_DECKS.includes(ARCHIVE_OBSERVATORY_DECK) && WORLD_SUPPORT_DECKS.includes(SUSPENDED_LAB_DECK)
    && WORLD_SUPPORT_DECKS.includes(WELCOME_HARBOR_DECK) && WORLD_SUPPORT_DECKS.includes(DANCE_PAVILION_DECK)
    && WORLD_SUPPORT_DECKS.includes(CONTACT_LIGHTHOUSE_DECK), "seven structural decks, not additional islands");
  check(studioDeck.width === 12 && studioDeck.depth === 8 && studioDeck.thickness === 0.24, "unscaled master deck dimensions");
  check(Math.abs(studioDeck.top - getIsland("about").elevation - 0.06) < 1e-8 && HOME_STUDIO.anchor.y === studioDeck.top, "studio root/deck top share the 6 cm terrain clearance");
  check(HOME_STUDIO.hulls.length === 21 && HOME_STUDIO.hulls.filter((h) => h.role === "post").length === 10
    && HOME_STUDIO.hulls.filter((h) => h.kind === "cylinder").length === 5, "master's ten posts, wall, desk, four furnishings and five pots replace old structure");
  check(WORLD_STRUCTURE_HULLS.filter((h) => h.island === "about").length === HOME_STUDIO.hulls.length
    && HOME_STUDIO.hulls.every((h) => WORLD_STRUCTURE_HULLS.includes(h)), "no duplicate historical studio colliders");
  for (const hull of HOME_STUDIO.hulls) check(Math.abs(hull.y - hull.height / 2 - studioDeck.top) < 1e-8, `${hull.id} base matches exported deck top`);
  for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
    const point = { x: studioDeck.x + xSign * (studioDeck.width / 2 - capsuleClearance), z: studioDeck.z + zSign * (studioDeck.depth / 2 - capsuleClearance) };
    check(supportDeckAt(point.x, point.z, 0.34)?.id === studioDeck.id && isWalkable(point.x, point.z)
      && islandAt(point.x, point.z)?.id === "about" && getGroundHeight(point.x, point.z) === studioDeck.top, "all capsule-inset deck corners have shared support/semantic ownership");
  }
  let studioOffCoast = 0, studioFreeSupport = 0;
  for (let xIndex = 0; xIndex <= 12; xIndex++) for (let zIndex = 0; zIndex <= 8; zIndex++) {
    const point = { x: studioDeck.x + (xIndex / 12 - 0.5) * (studioDeck.width - capsuleClearance * 2),
      z: studioDeck.z + (zIndex / 8 - 0.5) * (studioDeck.depth - capsuleClearance * 2) };
    check(isWalkable(point.x, point.z) && islandAt(point.x, point.z)?.id === "about" && getGroundHeight(point.x, point.z) === studioDeck.top,
      `studio support grid ${xIndex}/${zIndex} matches master top`);
    if (getTerrainHeight(point.x, point.z) < WATER_LEVEL) studioOffCoast++;
    if (WORLD_STRUCTURE_HULLS.some((hull) => overlapsHull(point, hull, capsuleClearance + 0.02))) continue;
    physics.teleport(point.x, point.z); const supported = settle();
    check(reached(supported, point) && supported.grounded && Math.abs(supported.y - studioDeck.top) < 0.01,
      `real Rapier supports unobstructed deck grid ${xIndex}/${zIndex}: ${JSON.stringify(supported)}`);
    studioFreeSupport++;
  }
  check(studioOffCoast > 0 && studioFreeSupport > 40, `grid checks include the overhanging corner and free supported deck: ${studioOffCoast} off-coast/${studioFreeSupport} free points`);
  // The actual overhanging capsule-inset corner is occupied by the rear-left
  // house post. Isolate support in a fixture of the unchanged Rapier module,
  // omitting only About furniture/post hulls rather than inventing free land.
  const supportPhysics = await createBuildingFixture("about");
  try {
    for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
      const point = { x: studioDeck.x + xSign * (studioDeck.width / 2 - capsuleClearance), z: studioDeck.z + zSign * (studioDeck.depth / 2 - capsuleClearance) };
      supportPhysics.teleport(point.x, point.z); let supported;
      for (let step = 0; step < 90; step++) supported = supportPhysics.update(0, 0, dt);
      check(reached(supported, point) && supported.grounded && Math.abs(supported.y - studioDeck.top) < 0.01,
        `actual-module isolated deck fixture supports inset corner ${xSign}/${zSign}: ${JSON.stringify(supported)}`);
    }
  } finally { supportPhysics.dispose(); }
  const unsupportedPhysics = await createBuildingFixture("about", undefined, false);
  try {
    const overhang = { x: studioDeck.x - studioDeck.width / 2 + capsuleClearance, z: studioDeck.z - studioDeck.depth / 2 + capsuleClearance };
    check(getTerrainHeight(overhang.x, overhang.z) < WATER_LEVEL, "negative control is genuinely outside the terrain mesh");
    unsupportedPhysics.teleport(overhang.x, overhang.z); const withoutDeck = settle(unsupportedPhysics);
    // The capsule can still partly touch the neighboring coast triangle; that
    // is not deck support. Its foot must no longer match the exported top.
    check(Math.abs(withoutDeck.y - studioDeck.top) > 0.04,
      `negative control cannot maintain deck-top height without its collider: ${JSON.stringify(withoutDeck)}`);
  } finally { unsupportedPhysics.dispose(); }
  check(WORLD_PROPS.every((prop) => {
    const deck = supportDeckAt(prop.x, prop.z, -(prop.kind === "palm" ? 1.5 : 1) * prop.scale - 1.4);
    return !deck || deck.island === "welcome" || deck.island === "contact";
  }), "old master decks retain historical prop clearance; Welcome/Contact preserve seeds and get separate real-envelope checks");
  const studioStation = WORLD_STATIONS.find((station) => station.island === "about"), studioApproach = getStationApproach(studioStation);
  const studioEdge = { x: studioApproach.x, z: studioDeck.z + studioDeck.depth / 2 }, beforeStudio = { x: studioEdge.x, z: studioEdge.z + 0.7 };
  check(getGroundHeight(beforeStudio.x, beforeStudio.z) < studioDeck.top && getGroundHeight(studioApproach.x, studioApproach.z) === studioDeck.top, "terrain-to-deck approach genuinely crosses the 6 cm step");
  physics.teleport(studioEntry.x, studioEntry.z);
  check(reached(walkTo(beforeStudio.x, beforeStudio.z), beforeStudio), "studio entry reaches the open front edge without jumping");
  const ontoStudio = walkTo(studioApproach.x, studioApproach.z);
  check(reached(ontoStudio, studioApproach) && ontoStudio.grounded && Math.abs(ontoStudio.y - studioDeck.top) < 0.01,
    `terrain-to-deck autostep reaches notebook approach: ${JSON.stringify(ontoStudio)}`);
  check(reached(walkTo(studioEntry.x, studioEntry.z), studioEntry), "notebook approach returns to mainland entrance without jumping");
  let studioIsolatedCollisions = 0;
  for (const hull of HOME_STUDIO.hulls) {
    let approach = buildingCollisionApproach(hull), collisionPhysics = physics;
    if (!approach) {
      // A rear post tucked into wall/books/pots has no independent exposed
      // capsule-sized approach. Test its collider in isolation, not by claiming
      // the adjacent furniture's hit was contact with this particular post.
      approach = buildingCollisionApproach(hull, [hull]);
      collisionPhysics = await createBuildingFixture("about", hull); studioIsolatedCollisions++;
    }
    try {
      check(!!approach, `${hull.id} has a supported collision-test approach`);
      collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
      check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} collision entry is not embedded`);
      // The shortened pot sits next to a terrain/deck seam. At larger discrete
      // increments Rapier's autostep contact settles inside the ideal inflated
      // 2D outline without crossing the solid. Measure its precise slow contact
      // rather than weakening the existing geometric tolerance.
      const contactSpeed = hull.kind === "cylinder" && hull.height < .6 ? 1 : 5;
      const collision = walkTo(hull.x, hull.z, 180, contactSpeed, collisionPhysics);
      const separation = (collision.x - hull.x) * approach.nx + (collision.z - hull.z) * approach.nz;
      check(Math.abs(separation - approach.edge - capsuleClearance) < 0.04
        && Math.hypot(collision.x - approach.contact.x, collision.z - approach.contact.z) < 0.07 && collision.grounded,
        `${hull.id} actual first contact matches this collider: ${JSON.stringify(collision)} expected=${JSON.stringify(approach.contact)}`);
      if (contactSpeed === 1) {
        collisionPhysics.teleport(approach.start.x, approach.start.z); settle(collisionPhysics);
        const fastContact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
        check(distanceToHull(fastContact, hull) > .25 && fastContact.grounded, `${hull.id} brisk discrete contact still cannot penetrate its solid`);
        const withoutPot = await createBuildingFixture("about");
        try {
          withoutPot.teleport(approach.start.x, approach.start.z); settle(withoutPot);
          check(reached(walkTo(hull.x, hull.z, 180, 5, withoutPot), hull), `${hull.id} removed-hull negative reaches the formerly solid centre`);
        } finally { withoutPot.dispose(); }
      }
    } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
  }

  const workshopContract = JSON.parse(fs.readFileSync(new URL(`../${WORKSHOP.sourceContract}`, import.meta.url), "utf8"));
  const workshopDeck = DIGITAL_WORKSHOP_DECK, workshopEntry = getArrival("projects");
  check(workshopContract.schema === "archipelago-static-building-contract-v1" && workshopContract.units === "metres"
    && workshopContract.root === WORKSHOP.root, "workshop authoring contract/root/units are the actual source JSON");
  const workshopRelocation = checkRelocatedAnchor(WORKSHOP, workshopContract, 18.06);
  check(workshopDeck.id === workshopContract.deck.id && workshopDeck.width === workshopContract.deck.width
    && workshopDeck.depth === workshopContract.deck.depth && workshopDeck.thickness === workshopContract.deck.height
    && workshopDeck.top === WORKSHOP.anchor.y + workshopContract.deck.walkingTop, "unscaled workshop support dimensions match authoring JSON");
  check(WORKSHOP.hulls.length === 27 && WORKSHOP.hulls.length === workshopContract.hulls.length
    && WORLD_STRUCTURE_HULLS.filter((h) => h.island === "projects").length === WORKSHOP.hulls.length + 1,
    "27 workshop hulls replace old structure without duplicating the external cannon");
  for (const sourceHull of workshopContract.hulls) {
    const hull = WORKSHOP.hulls.find((h) => h.id === sourceHull.id);
    check(!!hull && WORLD_STRUCTURE_HULLS.includes(hull) && hull.island === "projects"
      && hull.kind === sourceHull.kind && hull.role === sourceHull.role, `${sourceHull.id} has the source contract's identity/role/kind`);
    const expected = { x: WORKSHOP.anchor.x + sourceHull.x, z: WORKSHOP.anchor.z + sourceHull.z,
      y: WORKSHOP.anchor.y + sourceHull.bottom + sourceHull.height / 2,
      width: sourceHull.width, depth: sourceHull.depth, height: sourceHull.height, yaw: sourceHull.yaw };
    if (sourceHull.kind === "cylinder") expected.radius = sourceHull.radius;
    check(Object.entries(expected).every(([key, value]) => Math.abs(hull[key] - value) < 1e-8), `${sourceHull.id} transform/extent match source JSON exactly`);
  }
  const externalCannon = WORLD_STRUCTURE_HULLS.find((h) => h.id === "projects-cannon"), cannonRoute = TRAVEL_ROUTES.find((r) => r.kind === "cannon");
  check(!!externalCannon && !WORKSHOP.hulls.includes(externalCannon) && !supportDeckAt(cannonRoute.departure.x, cannonRoute.departure.z),
    "existing cannon and departure remain outside imported workshop support/hulls");
  for (const sourceStation of workshopContract.stations) {
    const station = WORLD_STATIONS.find((s) => s.id === sourceStation.id), approach = getStationApproach(station);
    check(station.x === WORKSHOP.anchor.x + sourceStation.x && station.z === WORKSHOP.anchor.z + sourceStation.z
      && station.width === sourceStation.width && station.depth === sourceStation.depth && station.height === sourceStation.height
      && Math.abs(approach.x - WORKSHOP.anchor.x - sourceStation.approach.x) < 1e-8
      && Math.abs(approach.z - WORKSHOP.anchor.z - sourceStation.approach.z) < 1e-8, `${sourceStation.id} hotspot and approach are unchanged/source-aligned`);
    for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
      const point = { x: approach.x + xSign * workshopContract.navigation.approachHalfWidth,
        z: approach.z + zSign * workshopContract.navigation.approachHalfDepth };
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some((h) => overlapsHull(point, h)), `${sourceStation.id} approach rectangle has capsule clearance`);
    }
    physics.teleport(workshopEntry.x, workshopEntry.z); const arrived = walkTo(approach.x, approach.z);
    check(reached(arrived, approach) && arrived.grounded && Math.abs(arrived.y - workshopDeck.top) < 0.01,
      `${sourceStation.id} real Rapier entry reaches deck/approach without jumping: ${JSON.stringify(arrived)}`);
    check(reached(walkTo(workshopEntry.x, workshopEntry.z), workshopEntry), `${sourceStation.id} returns to mainland/bridges without jumping`);
  }
  check(WORKSHOP.anchor.x + workshopContract.navigation.entry.x === workshopEntry.x
    && WORKSHOP.anchor.z + workshopContract.navigation.entry.z === workshopEntry.z, "existing Projects arrival is unchanged in JSON");
  // Execute the actual camera helper and certify its engine wiring through the
  // TypeScript AST, not a regex coupled to an obsolete hardcoded Vector3.
  const gameAST = ts.createSourceFile("island-game.ts", fs.readFileSync(new URL("../lib/island-game.ts", import.meta.url), "utf8"), ts.ScriptTarget.ES2022, true);
  const gameNodes = [];
  const visitGameNode = node => { gameNodes.push(node); ts.forEachChild(node, visitGameNode); };
  visitGameNode(gameAST);
  const nodeText = node => node?.getText(gameAST).replace(/\s+/g, "") ?? "";
  const initializer = name => gameNodes.find(node => ts.isVariableDeclaration(node) && nodeText(node.name) === name)?.initializer;
  const gameCalls = gameNodes.filter(ts.isCallExpression);
  const cameraImport = gameNodes.find(node => ts.isImportDeclaration(node) && node.moduleSpecifier.text === "@/lib/island-camera");
  const importedCameraNames = cameraImport?.importClause?.namedBindings?.elements?.map(element => element.name.text) ?? [];
  check(["getIslandWalkingShot", "ISLAND_CAMERA_FOV", "ISLAND_WALKING_SHOTS"].every(name => importedCameraNames.includes(name)),
    "engine imports the actual camera helper, lens and default direction contract");
  check(nodeText(initializer("viewOffset")) === "newTHREE.Vector3(...ISLAND_WALKING_SHOTS.default.direction)"
    && nodeText(initializer("walkingShot")) === "getIslandWalkingShot(activeIsland,aspect)",
    "engine selects its per-area/aspect shot and initial direction from the imported contract");
  check(gameCalls.some(call => nodeText(call) === "desiredWalkingOffset.set(walkingShot.direction[0],walkingShot.direction[1],walkingShot.direction[2])"),
    "engine applies the helper direction to the actual walking camera");
  const engineCamera = initializer("camera");
  check(!!engineCamera && ts.isNewExpression(engineCamera) && nodeText(engineCamera.expression) === "THREE.PerspectiveCamera"
    && nodeText(engineCamera.arguments?.[0]) === "ISLAND_CAMERA_FOV", "engine lens is the actual imported FOV");
  for (const [index, axis] of ["x", "y", "z"].entries())
    check(gameNodes.some(node => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusEqualsToken
      && nodeText(node.left) === `target.${axis}` && nodeText(node.right) === `walkingShot.focus[${index}]`),
    `engine applies actual helper focus ${axis} to the explorer's walking target`);
  check(nodeText(initializer("walkHeight")) === "THREE.MathUtils.lerp(walkingShot.halfHeight,21,transitZoom)"
    && gameCalls.some(call => nodeText(call) === "cameraOffset.setLength(halfHeight/Math.tan(THREE.MathUtils.degToRad(camera.fov/2)))")
    && gameCalls.some(call => nodeText(call) === "camera.position.copy(focus).add(cameraOffset)"),
    "engine derives the eye from helper half-height, lens and focus, without changing physical support");
  const projectsShot = getIslandWalkingShot("projects", 1680 / 945);
  check(projectsShot.direction.every(Number.isFinite) && Math.hypot(...projectsShot.direction) > 0
    && projectsShot.direction.every((component, index) => component === ISLAND_WALKING_SHOTS.default.direction[index]),
    "Projects arrival uses the actual finite default walking direction");
  const arrivalCamera = { x: workshopEntry.x + projectsShot.direction[0], z: workshopEntry.z + projectsShot.direction[2] };
  check(WORLD_PROPS.filter((prop) => prop.kind === "palm").every((prop) => {
    const closest = projected(prop, workshopEntry, arrivalCamera);
    return Math.hypot(prop.x - closest.x, prop.z - closest.z) >= 3.8 * prop.scale;
  }), "tall palm crowns preserve the established Projects direction corridor with unchanged 3.8×scale clearance");
  // Settled walking only: no transit/inspection/easing is active. Calculate the
  // real eye, including focus displacement and perspective normalization, in
  // addition to retaining the stricter historical direction-only corridor.
  const projectsArrivalEyes = [];
  for (const [label, aspect] of [["desktop", 1680 / 945], ["portrait", 390 / 844]]) {
    const shot = getIslandWalkingShot("projects", aspect);
    const directionLength = Math.hypot(...shot.direction), distance = shot.halfHeight / Math.tan(ISLAND_CAMERA_FOV * Math.PI / 360);
    const eye = { x: workshopEntry.x + shot.focus[0] + shot.direction[0] / directionLength * distance,
      y: getGroundHeight(workshopEntry.x, workshopEntry.z) + shot.focus[1] + shot.direction[1] / directionLength * distance,
      z: workshopEntry.z + shot.focus[2] + shot.direction[2] / directionLength * distance };
    check(Object.values(eye).every(Number.isFinite) && Number.isFinite(distance) && distance > 0,
      `${label} settled Projects eye uses actual focus/FOV/half-height and unchanged supported arrival`);
    check(WORLD_PROPS.filter(prop => prop.kind === "palm").every(prop => {
      const closest = projected(prop, workshopEntry, eye);
      return Math.hypot(prop.x - closest.x, prop.z - closest.z) >= 3.8 * prop.scale;
    }), `${label} actual Projects arrival-to-eye corridor retains the unchanged 3.8×scale palm clearance`);
    projectsArrivalEyes.push({ label, aspect, eye, focus: shot.focus, direction: shot.direction, halfHeight: shot.halfHeight, fov: ISLAND_CAMERA_FOV });
  }
  for (const name of ["southEntryClear", "westExitClear", "eastExitClear", "southEastClear"]) {
    const bounds = workshopContract.navigation[name];
    for (let xi = 0; xi <= 4; xi++) for (let zi = 0; zi <= 4; zi++) {
      const point = { x: WORKSHOP.anchor.x + bounds.xMin + (bounds.xMax - bounds.xMin) * xi / 4,
        z: WORKSHOP.anchor.z + bounds.zMin + (bounds.zMax - bounds.zMin) * zi / 4 };
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some((h) => overlapsHull(point, h)), `${name} ${xi}/${zi} retains actual capsule clearance`);
    }
  }
  let workshopTerrainMaximum = -Infinity, workshopTerrainSamples = 0, workshopFreeSupport = 0;
  for (let xi = 0; xi <= 60; xi++) for (let zi = 0; zi <= 48; zi++) {
    const x = workshopDeck.x + xi / 60 * workshopDeck.width - workshopDeck.width / 2,
      z = workshopDeck.z + zi / 48 * workshopDeck.depth - workshopDeck.depth / 2, terrainHeight = getTerrainHeight(x, z);
    workshopTerrainMaximum = Math.max(workshopTerrainMaximum, terrainHeight); workshopTerrainSamples++;
    check(terrainHeight <= workshopDeck.top && getGroundHeight(x, z) === workshopDeck.top && islandAt(x, z)?.id === "projects",
      `workshop coverage ${xi}/${zi} stays below relocated structural top ${workshopDeck.top}: ${terrainHeight}`);
  }
  for (let xi = 0; xi <= 10; xi++) for (let zi = 0; zi <= 8; zi++) {
    const point = { x: workshopDeck.x + (xi / 10 - 0.5) * (workshopDeck.width - capsuleClearance * 2),
      z: workshopDeck.z + (zi / 8 - 0.5) * (workshopDeck.depth - capsuleClearance * 2) };
    if (WORLD_STRUCTURE_HULLS.some((hull) => overlapsHull(point, hull, capsuleClearance + 0.02))) continue;
    physics.teleport(point.x, point.z); const supported = settle();
    check(reached(supported, point) && supported.grounded && Math.abs(supported.y - workshopDeck.top) < 0.01,
      `actual Rapier workshop deck support ${xi}/${zi}: ${JSON.stringify(supported)}`);
    workshopFreeSupport++;
  }
  check(workshopFreeSupport > 40, `workshop free support is physically checked across the deck: ${workshopFreeSupport} points`);
  const noWorkshopDeck = await createBuildingFixture("projects", undefined, false);
  try {
    const point = { x: workshopDeck.x, z: workshopDeck.z + 8 };
    noWorkshopDeck.teleport(point.x, point.z); const withoutDeck = settle(noWorkshopDeck);
    check(Math.abs(withoutDeck.y - workshopDeck.top) > 0.04,
      `workshop negative control requires the physical deck to maintain its top: ${JSON.stringify(withoutDeck)}`);
  } finally { noWorkshopDeck.dispose(); }
  let workshopIsolatedCollisions = 0;
  for (const hull of WORKSHOP.hulls) {
    let approach = buildingCollisionApproach(hull), collisionPhysics = physics;
    if (!approach) {
      approach = buildingCollisionApproach(hull, [hull]); collisionPhysics = await createBuildingFixture("projects", hull);
      workshopIsolatedCollisions++;
    }
    try {
      check(!!approach, `${hull.id} has a supported independent collision-test approach`);
      collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
      check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} begins outside occupied geometry`);
      const contact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
      // Square-post corner approaches can slide to a face after first contact.
      // Measure the actual target surface, never count a nearby wall's stop.
      check(Math.abs(distanceToHull(contact, hull) - capsuleClearance) < 0.015 && contact.grounded
        && (approach.nx && approach.nz || Math.hypot(contact.x - approach.contact.x, contact.z - approach.contact.z) < 0.07),
        `${hull.id} real Rapier contact matches intended hull: ${JSON.stringify(contact)} expected=${JSON.stringify(approach.contact)}`);
    } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
  }
  const archiveContract = JSON.parse(fs.readFileSync(new URL(`../${ARCHIVE_OBSERVATORY.sourceContract}`, import.meta.url), "utf8"));
  const archiveDeck = ARCHIVE_OBSERVATORY_DECK, archiveEntry = getArrival("education"), archiveAnchor = ARCHIVE_OBSERVATORY.anchor;
  check(archiveContract.schema === "archipelago-static-building-contract-v1" && archiveContract.units === "metres"
    && archiveContract.root === ARCHIVE_OBSERVATORY.root, "archive root/schema/metres match the actual source JSON");
  const archiveRelocation = checkRelocatedAnchor(ARCHIVE_OBSERVATORY, archiveContract, 19.06);
  check(archiveDeck.id === archiveContract.deck.id && archiveDeck.width === archiveContract.deck.width
    && archiveDeck.depth === archiveContract.deck.depth && archiveDeck.thickness === archiveContract.deck.height
    && archiveDeck.top === archiveAnchor.y + archiveContract.deck.walkingTop
    && Math.abs(archiveDeck.top - getIsland("education").elevation - .06) < 1e-8, "archive 18×14×.24 support and six-centimetre step match source");
  check(ARCHIVE_OBSERVATORY.hulls.length === 22 && archiveContract.hulls.length === 22
    && WORLD_STRUCTURE_HULLS.filter(h => h.island === "education").length === 22, "archive source replaces all historical hulls without duplicates");
  for (const sourceHull of archiveContract.hulls) {
    const hull = ARCHIVE_OBSERVATORY.hulls.find(h => h.id === sourceHull.id);
    check(!!hull && WORLD_STRUCTURE_HULLS.includes(hull) && hull.island === "education"
      && hull.kind === sourceHull.kind && hull.role === sourceHull.role, `${sourceHull.id} identity/kind/role match source`);
    const expected = { x: archiveAnchor.x + sourceHull.x, z: archiveAnchor.z + sourceHull.z,
      y: archiveAnchor.y + sourceHull.bottom + sourceHull.height / 2, width: sourceHull.width, height: sourceHull.height,
      depth: sourceHull.depth, yaw: sourceHull.yaw };
    if (sourceHull.kind === "cylinder") expected.radius = sourceHull.radius;
    check(Object.entries(expected).every(([key, value]) => Math.abs(hull[key] - value) < 1e-8), `${sourceHull.id} exact source transform/extents`);
  }
  check(archiveAnchor.x + archiveContract.navigation.entry.x === archiveEntry.x
    && archiveAnchor.z + archiveContract.navigation.entry.z === archiveEntry.z, "Education arrival stays unchanged");
  for (const sourceStation of archiveContract.stations) {
    const station = WORLD_STATIONS.find(s => s.id === sourceStation.id), approach = getStationApproach(station);
    check(station.x === archiveAnchor.x + sourceStation.x && station.z === archiveAnchor.z + sourceStation.z
      && station.width === sourceStation.width && station.height === sourceStation.height && station.depth === sourceStation.depth
      && Math.abs(approach.x - archiveAnchor.x - sourceStation.approach.x) < 1e-8
      && Math.abs(approach.z - archiveAnchor.z - sourceStation.approach.z) < 1e-8, `${sourceStation.id} retains source-aligned hotspot and approach`);
    for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
      const point = {x: approach.x + xSign * archiveContract.navigation.approachHalfWidth, z: approach.z + zSign * archiveContract.navigation.approachHalfDepth};
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(h => overlapsHull(point, h)), `${sourceStation.id} whole approach has capsule clearance`);
    }
    physics.teleport(archiveEntry.x, archiveEntry.z); const arrival = walkTo(approach.x, approach.z);
    check(reached(arrival, approach) && arrival.grounded && Math.abs(arrival.y - archiveDeck.top) < .01,
      `${sourceStation.id} real terrain-to-deck approach without jumping: ${JSON.stringify(arrival)}`);
    check(reached(walkTo(archiveEntry.x, archiveEntry.z), archiveEntry), `${sourceStation.id} returns across deck step without jumping`);
  }
  for (const name of ["frontEntryClear", "frontCrossingClear", "westRidgeClear"]) {
    const bounds = archiveContract.navigation[name];
    for (let xi = 0; xi <= 6; xi++) for (let zi = 0; zi <= 12; zi++) {
      const point = {x: archiveAnchor.x + bounds.xMin + (bounds.xMax - bounds.xMin) * xi / 6,
        z: archiveAnchor.z + bounds.zMin + (bounds.zMax - bounds.zMin) * zi / 12};
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(h => overlapsHull(point, h)), `${name} ${xi}/${zi} remains genuinely clear`);
    }
  }
  let archiveTerrainMaximum = -Infinity, archiveTerrainSamples = 0, archiveFreeSupport = 0, archiveIsolatedCollisions = 0;
  for (let xi = 0; xi <= 36; xi++) for (let zi = 0; zi <= 28; zi++) {
    const x = archiveDeck.x + xi / 36 * archiveDeck.width - archiveDeck.width / 2,
      z = archiveDeck.z + zi / 28 * archiveDeck.depth - archiveDeck.depth / 2, height = getTerrainHeight(x, z);
    archiveTerrainMaximum = Math.max(archiveTerrainMaximum, height); archiveTerrainSamples++;
    check(height <= archiveDeck.top && getGroundHeight(x, z) === archiveDeck.top && islandAt(x, z)?.id === "education",
      `archive coverage ${xi}/${zi}: terrain ${height} stays below relocated structural top ${archiveDeck.top}`);
  }
  for (let xi = 0; xi <= 12; xi++) for (let zi = 0; zi <= 10; zi++) {
    const point = { x: archiveDeck.x + (xi / 12 - .5) * (archiveDeck.width - capsuleClearance * 2),
      z: archiveDeck.z + (zi / 10 - .5) * (archiveDeck.depth - capsuleClearance * 2) };
    if (WORLD_STRUCTURE_HULLS.some(h => overlapsHull(point, h, capsuleClearance + .02))) continue;
    physics.teleport(point.x, point.z); const support = settle();
    check(reached(support, point) && support.grounded && Math.abs(support.y - archiveDeck.top) < .01, `real Rapier archive deck ${xi}/${zi}: ${JSON.stringify(support)}`);
    archiveFreeSupport++;
  }
  check(archiveFreeSupport > 45, `archive support spans actual unobstructed deck: ${archiveFreeSupport} points`);
  const noArchiveDeck = await createBuildingFixture("education", undefined, false);
  try {
    const point = {x: archiveAnchor.x, z: archiveAnchor.z + 6}; noArchiveDeck.teleport(point.x, point.z);
    const support = settle(noArchiveDeck);
    check(Math.abs(support.y - archiveDeck.top) > .04, `archive negative control requires its physical deck: ${JSON.stringify(support)}`);
  } finally { noArchiveDeck.dispose(); }
  for (const hull of ARCHIVE_OBSERVATORY.hulls) {
    let approach = buildingCollisionApproach(hull), collisionPhysics = physics;
    if (!approach) {
      approach = buildingCollisionApproach(hull, [hull]); collisionPhysics = await createBuildingFixture("education", hull); archiveIsolatedCollisions++;
    }
    try {
      check(!!approach, `${hull.id} has a supported independent test approach`);
      collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
      check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} test starts outside solids`);
      const contact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
      check(Math.abs(distanceToHull(contact, hull) - capsuleClearance) < .015 && contact.grounded,
        `${hull.id} real Rapier contact matches this target: ${JSON.stringify(contact)}`);
    } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
  }
  const labContract = JSON.parse(fs.readFileSync(new URL(`../${SUSPENDED_LAB.sourceContract}`, import.meta.url), "utf8"));
  const labDeck = SUSPENDED_LAB_DECK, labAnchor = SUSPENDED_LAB.anchor, labEntry = getArrival("skills");
  check(labContract.schema === "archipelago-static-building-contract-v1" && labContract.units === "metres"
    && labContract.root === SUSPENDED_LAB.root && labContract.asset === "suspended-lab-v1", "laboratory actual source schema/root/metres");
  check(labAnchor.x === labContract.anchor.x && labAnchor.y === labContract.anchor.y && labAnchor.z === labContract.anchor.z
    && SUSPENDED_LAB.island === labContract.anchor.island && labDeck.yaw === labContract.anchor.yaw,
    "laboratory map/world anchor exactly matches the authoring JSON");
  check(labDeck.id === labContract.deck.id && labDeck.x === labAnchor.x + labContract.deck.x
    && labDeck.z === labAnchor.z + labContract.deck.z && labDeck.width === labContract.deck.width
    && labDeck.depth === labContract.deck.depth && labDeck.thickness === labContract.deck.height
    && labDeck.top === labAnchor.y + labContract.deck.walkingTop && labContract.deck.bottom + labContract.deck.height === labContract.deck.walkingTop
    && labDeck.width === 20 && labDeck.depth === 16 && Math.abs(labDeck.top - 38.06) < 1e-8,
    "laboratory unscaled 20×16×.24 deck and 38.06 m top match source JSON");
  check(labContract.navigation.noUpperWalkingFloors === true && labContract.collisionPolicy.noUpperWalkingFloors === true
    && TERRITORIES.find(territory => territory.id === "skills").floating === true,
    "laboratory remains the existing floating territory, not an upper walkable floor or seventh land");
  check(SUSPENDED_LAB.hulls.length === 22 && labContract.hulls.length === 22
    && WORLD_STRUCTURE_HULLS.filter(hull => hull.island === "skills").length === 22,
    "22 laboratory hulls replace, rather than duplicate, all historical Skills colliders");
  for (const sourceHull of labContract.hulls) {
    const hull = SUSPENDED_LAB.hulls.find(candidate => candidate.id === sourceHull.id);
    check(!!hull && WORLD_STRUCTURE_HULLS.includes(hull) && hull.island === "skills"
      && hull.kind === sourceHull.kind && hull.role === sourceHull.role, `${sourceHull.id} real identity/kind/role follows source`);
    const expected = { x: labAnchor.x + sourceHull.x, z: labAnchor.z + sourceHull.z,
      y: labAnchor.y + sourceHull.bottom + sourceHull.height / 2, width: sourceHull.width, height: sourceHull.height,
      depth: sourceHull.depth, yaw: sourceHull.yaw };
    if (sourceHull.kind === "cylinder") expected.radius = sourceHull.radius;
    check(Object.entries(expected).every(([key, value]) => Math.abs(hull[key] - value) < 1e-8), `${sourceHull.id} transform/extents match actual JSON`);
  }
  check(labContract.stations.length === 5 && WORLD_STATIONS.filter(station => station.island === "skills").length === 5,
    "laboratory preserves the five existing capability modules");
  let labDeckApproaches = 0, labTerrainApproaches = 0;
  for (const [index, sourceStation] of labContract.stations.entries()) {
    const station = WORLD_STATIONS.find(candidate => candidate.id === sourceStation.id), approach = getStationApproach(station);
    check(station.index === index && station.island === "skills" && station.x === labAnchor.x + sourceStation.x
      && station.z === labAnchor.z + sourceStation.z && station.width === sourceStation.width
      && station.depth === sourceStation.depth && station.height === sourceStation.height
      && Math.abs(approach.x - labAnchor.x - sourceStation.approach.x) < 1e-8
      && Math.abs(approach.z - labAnchor.z - sourceStation.approach.z) < 1e-8,
      `${sourceStation.id} existing index/desk/hotspot/approach stays source-aligned`);
    for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
      const point = { x: approach.x + xSign * labContract.navigation.approachHalfWidth,
        z: approach.z + zSign * labContract.navigation.approachHalfDepth };
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull)),
        `${sourceStation.id} entire approach has supported capsule clearance`);
    }
    const onDeck = supportDeckAt(approach.x, approach.z)?.id === labDeck.id;
    if (onDeck) labDeckApproaches++; else labTerrainApproaches++;
    check(onDeck ? getGroundHeight(approach.x, approach.z) === labDeck.top
      : territoryAt(approach.x, approach.z)?.id === "skills" && getGroundHeight(approach.x, approach.z) === getTerrainHeight(approach.x, approach.z),
      `${sourceStation.id} support comes from the actual deck or unchanged front terrain`);
    physics.teleport(labEntry.x, labEntry.z); const arrival = walkTo(approach.x, approach.z);
    check(reached(arrival, approach) && arrival.grounded && Math.abs(arrival.y - getGroundHeight(approach.x, approach.z)) < .01,
      `${sourceStation.id} real entry→approach crosses support without jumping: ${JSON.stringify(arrival)}`);
    check(reached(walkTo(labEntry.x, labEntry.z), labEntry), `${sourceStation.id} approach→entry returns without jumping`);
  }
  check(labDeckApproaches === 4 && labTerrainApproaches === 1, "four laboratory approaches use its deck; front Cybersecurity approach retains real terrain support");
  check(labAnchor.x + labContract.navigation.entry.x === labEntry.x && labAnchor.z + labContract.navigation.entry.z === labEntry.z,
    "laboratory cannon/fast-travel arrival remains unchanged");
  const labCannon = TRAVEL_ROUTES.find(route => route.id === "workshop-launch"), labGlide = TRAVEL_ROUTES.find(route => route.id === "laboratory-glide");
  check(labCannon.to === "skills" && labCannon.arrival.x === labEntry.x && labCannon.arrival.z === labEntry.z
    && labGlide.from === "skills" && labGlide.departure.x === labAnchor.x + labContract.navigation.glideDeparture.x
    && labGlide.departure.z === labAnchor.z + labContract.navigation.glideDeparture.z,
    "cannon arrival and guided-return departure share actual contract anchors");
  for (const [label, point] of [["arrival", labEntry], ["glide departure", labGlide.departure]]) {
    check(!supportDeckAt(point.x, point.z) && territoryAt(point.x, point.z)?.id === "skills"
      && !WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull)), `${label} stays clear and supported by existing terrain`);
    physics.teleport(point.x, point.z); const support = settle();
    check(reached(support, point) && support.grounded && Math.abs(support.y - getTerrainHeight(point.x, point.z)) < .01,
      `${label} real Rapier support remains available before/after imported model loading`);
  }
  physics.teleport(labEntry.x, labEntry.z);
  check(reached(walkTo(labGlide.departure.x, labGlide.departure.z), labGlide.departure)
    && reached(walkTo(labEntry.x, labEntry.z), labEntry), "landing↔parachute departure stays walkable both ways without jumping");
  for (const name of ["frontEntryClear", "frontCrossingClear"]) {
    const bounds = labContract.navigation[name];
    for (let xi = 0; xi <= 12; xi++) for (let zi = 0; zi <= 12; zi++) {
      const point = { x: labAnchor.x + bounds.xMin + (bounds.xMax - bounds.xMin) * xi / 12,
        z: labAnchor.z + bounds.zMin + (bounds.zMax - bounds.zMin) * zi / 12 };
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull)),
        `${name} ${xi}/${zi} preserves real capsule clearance, not a decorative front rail`);
    }
  }
  let labTerrainMaximum = -Infinity, labTerrainSamples = 0, labFreeSupport = 0, labIsolatedCollisions = 0;
  for (let xi = 0; xi <= 40; xi++) for (let zi = 0; zi <= 32; zi++) {
    const x = labDeck.x + (xi / 40 - .5) * labDeck.width, z = labDeck.z + (zi / 32 - .5) * labDeck.depth;
    const height = getTerrainHeight(x, z); labTerrainMaximum = Math.max(labTerrainMaximum, height); labTerrainSamples++;
    check(height <= labDeck.top && getGroundHeight(x, z) === labDeck.top && islandAt(x, z)?.id === "skills",
      `laboratory coverage ${xi}/${zi}: exact existing terrain ${height} stays below support ${labDeck.top}`);
  }
  for (let xi = 0; xi <= 12; xi++) for (let zi = 0; zi <= 10; zi++) {
    const point = { x: labDeck.x + (xi / 12 - .5) * (labDeck.width - capsuleClearance * 2),
      z: labDeck.z + (zi / 10 - .5) * (labDeck.depth - capsuleClearance * 2) };
    if (WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull, capsuleClearance + .02))) continue;
    physics.teleport(point.x, point.z); const support = settle();
    check(reached(support, point) && support.grounded && Math.abs(support.y - labDeck.top) < .01,
      `real Rapier laboratory deck support ${xi}/${zi}: ${JSON.stringify(support)}`);
    labFreeSupport++;
  }
  check(labFreeSupport > 45, `laboratory support tested across actual free deck: ${labFreeSupport} points`);
  const noLabDeck = await createBuildingFixture("skills", undefined, false);
  try {
    const point = { x: labDeck.x, z: labDeck.z }; noLabDeck.teleport(point.x, point.z); const support = settle(noLabDeck);
    check(Math.abs(support.y - labDeck.top) > .04 && Math.abs(support.y - getTerrainHeight(point.x, point.z)) < .01,
      `negative laboratory fixture needs its real deck collider to maintain its top: ${JSON.stringify(support)}`);
  } finally { noLabDeck.dispose(); }
  const noLabHulls = await createBuildingFixture("skills");
  try {
    for (const hull of SUSPENDED_LAB.hulls) {
      let approach = buildingCollisionApproach(hull), collisionPhysics = physics;
      if (!approach) {
        approach = buildingCollisionApproach(hull, [hull]); collisionPhysics = await createBuildingFixture("skills", hull); labIsolatedCollisions++;
      }
      try {
        check(!!approach, `${hull.id} has a supported independent collision-test approach`);
        collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
        check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} starts outside solids`);
        const contact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
        check(Math.abs(distanceToHull(contact, hull) - capsuleClearance) < .015 && contact.grounded,
          `${hull.id} real Rapier contact matches this collider, not an adjacent prop: ${JSON.stringify(contact)}`);
        // Same actual module/deck/terrain, but no laboratory hulls. A blocked
        // positive fixture must become traversable, proving this test is not
        // merely accepting a visual boundary or an unrelated collider's stop.
        noLabHulls.teleport(approach.start.x, approach.start.z); const absent = walkTo(hull.x, hull.z, 180, 5, noLabHulls);
        check(reached(absent, hull) && absent.grounded, `${hull.id} negative hull fixture reaches the formerly solid centre: ${JSON.stringify(absent)}`);
      } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
    }
  } finally { noLabHulls.dispose(); }

  const harborContract = JSON.parse(fs.readFileSync(new URL(`../${WELCOME_HARBOR.sourceContract}`, import.meta.url), "utf8"));
  const harborDeck = WELCOME_HARBOR_DECK, harborAnchor = WELCOME_HARBOR.anchor;
  const harborHash = value => crypto.createHash("sha256").update(value).digest("hex");
  const harborJSONHash = value => harborHash(JSON.stringify(value));
  check(harborContract.schema === "archipelago-static-building-contract-v1" && harborContract.units === "metres"
    && harborContract.root === WELCOME_HARBOR.root, "harbor source JSON/root/units match the actual map owner");
  const harborRelocation = checkRelocatedAnchor(WELCOME_HARBOR, harborContract, 12.06);
  check(harborDeck.id === harborContract.deck.id && harborDeck.width === harborContract.deck.width && harborDeck.depth === harborContract.deck.depth
    && harborDeck.thickness === harborContract.deck.height && harborDeck.top === harborAnchor.y + harborContract.deck.walkingTop
    && harborDeck.x === -13 && harborDeck.z === 70 && Math.abs(harborDeck.top - getIsland("welcome").elevation - .06) < 1e-8,
    "harbor 6.2×4.2×.24 shared support retains authoring dimensions at its relocated height");
  check(!ARCHITECTURE.welcome && harborContract.mapProposal.architectureClearing === null, "harbor cannot mutate terrain through an architecture clearing");
  check(WELCOME_HARBOR.hulls.length === 11 && harborContract.hulls.length === 11
    && WORLD_STRUCTURE_HULLS.filter(h => h.island === "welcome").length === 11, "eleven harbor solids, no duplicated historic booth/map furniture");
  for (const sourceHull of harborContract.hulls) {
    const hull = WELCOME_HARBOR.hulls.find(h => h.id === sourceHull.id);
    check(!!hull && WORLD_STRUCTURE_HULLS.includes(hull) && hull.island === "welcome" && hull.kind === sourceHull.kind && hull.role === sourceHull.role
      && hull.x === harborAnchor.x + sourceHull.x && hull.z === harborAnchor.z + sourceHull.z
      && hull.y === harborAnchor.y + sourceHull.bottom + sourceHull.height / 2 && hull.width === sourceHull.width && hull.depth === sourceHull.depth
      && hull.height === sourceHull.height && hull.radius === sourceHull.radius && hull.yaw === sourceHull.yaw, `${sourceHull.id} exact authoring/map solid parity`);
    if (sourceHull.id === "harbor-compass-mast") {
      check(sourceHull.z + sourceHull.radius < -harborContract.visualEnvelope.roofSurfaceHalfDepth && sourceHull.bottom === -.12 && sourceHull.height === 5.82
        && territoryAt(hull.x, hull.z)?.id === "main" && !supportDeckAt(hull.x, hull.z)
        && Math.abs(hull.y - hull.height / 2 - getTerrainHeight(hull.x, hull.z)) < .03,
        "harbor mast clears the high roof and grounds its lowered base on existing main terrain, not an invented deck");
    } else check(Math.abs(sourceHull.x) + sourceHull.width / 2 <= harborDeck.width / 2
      && Math.abs(sourceHull.z) + sourceHull.depth / 2 <= harborDeck.depth / 2, `${sourceHull.id} ground footprint stays on its real structural floor`);
  }
  const preHarborPropsHash = "18dfc876eddb0674f1f2160193212bc605c49b1ae985dfdaf1ee439a1f5d600b";
  check(WORLD_PROPS.length === 196 && harborJSONHash(WORLD_PROPS) === preHarborPropsHash,
    "all 196 actual props retain pre-harbor ids, positions, scales, yaws and semantic owners exactly");
  check(harborJSONHash(historicalMap.CONTACT_DOCK) === "a58601a8e6802ace2fc2197c281ac33deb69bd00cebd72999b5652a5287c3e6a"
    && harborJSONHash(historicalMap.BOAT_DOCKS) === "bb6ecf09bcb3fb890077e3e66693cdc0c23e2cc6677b22cd71e1c327c817a110"
    && harborJSONHash(historicalMap.WALK_PATHS) === "14553a8ef3aab7fa5c566e555958a0940086819d67e0e177fac9e18c0527470b",
    "reconstructed historical jetty/ramps/walking corridors match independent pre-harbor source hashes");
  const { top: oldJettyTop, ...oldJettyPlanar } = historicalMap.CONTACT_DOCK;
  const { top: newJettyTop, ...newJettyPlanar } = CONTACT_DOCK;
  const approvedDanceWaypoints = [{x: 69.8, z: 104}, {x: 70.2, z: 109.5}, {x: 77, z: 110.5}];
  const approvedLighthouseWaypoints = [{x: 15, z: 64}, {x: 23, z: 65}];
  const historicalWalkPlanar = historicalMap.WALK_PATHS.map(planarPath), historicalDanceShore = historicalMap.getBridgeProfile("welcome", "dance").end;
  const historicalDanceArrival = historicalMap.getArrival("dance");
  const oldDancePathIndex = historicalWalkPlanar.findIndex(path => path.from.x === historicalDanceShore.x && path.from.z === historicalDanceShore.z
    && path.to.x === historicalDanceArrival.x && path.to.z === historicalDanceArrival.z);
  check(oldDancePathIndex >= 0, "independently certified historical paths contain exactly the original Dance-shore chord");
  const approvedDanceApproach = [{x: historicalDanceShore.x, z: historicalDanceShore.z}, ...approvedDanceWaypoints, historicalDanceArrival];
  const historicalWelcomeArrival = historicalMap.getArrival("welcome"), historicalWelcomeShore = historicalMap.getBridgeProfile("welcome", "dance").start;
  const oldLighthousePathIndex = historicalWalkPlanar.findIndex(path => path.from.x === historicalWelcomeArrival.x && path.from.z === historicalWelcomeArrival.z
    && path.to.x === historicalWelcomeShore.x && path.to.z === historicalWelcomeShore.z);
  check(oldLighthousePathIndex >= 0 && oldLighthousePathIndex !== oldDancePathIndex,
    "independently certified historical paths retain the original mainland tower-slide chord");
  const approvedLighthouseApproach = [historicalWelcomeArrival, ...approvedLighthouseWaypoints, {x: historicalWelcomeShore.x, z: historicalWelcomeShore.z}];
  const expectedWalkPlanar = historicalWalkPlanar.flatMap((path, index) => {
    const approved = index === oldDancePathIndex ? approvedDanceApproach : index === oldLighthousePathIndex ? approvedLighthouseApproach : undefined;
    return approved ? approved.slice(1).map((to, i) => ({from: approved[i], to, width: 3.5})) : [path];
  });
  check(harborJSONHash(oldJettyPlanar) === harborJSONHash(newJettyPlanar)
    && harborJSONHash(historicalMap.BOAT_DOCKS.map(planarDock)) === harborJSONHash(BOAT_DOCKS.map(planarDock))
    && harborJSONHash(expectedWalkPlanar) === harborJSONHash(WALK_PATHS.map(planarPath))
    && oldJettyTop > newJettyTop, "jetty/ramp/all other walking XZ and dimensions remain frozen; only approved mainland/coastal Dance accesses and lowered support Y differ");
  const roof = harborContract.visualEnvelope;
  const harborPalmRoofGap = Math.min(...WORLD_PROPS.filter(prop => prop.kind === "palm").map(prop =>
    Math.hypot(Math.max(0, Math.abs(prop.x - harborDeck.x) - roof.roofWidth / 2),
      Math.max(0, Math.abs(prop.z - harborDeck.z) - roof.roofDepth / 2))));
  check(harborPalmRoofGap > 2 && !WORLD_PROPS.some(prop => supportDeckAt(prop.x, prop.z)?.island === "welcome"),
    `preserved palm bases remain ${harborPalmRoofGap.toFixed(4)}m beyond the soft roof; no prop base lies on the new floor`);
  const harborSource = fs.readFileSync(new URL("../lib/island-map.ts", import.meta.url), "utf8");
  const reseededHarborSource = harborSource
    .replace('deck.island !== "welcome" && pointOnSupportDeck(deck, x, z, -footprint - 1.4)', 'pointOnSupportDeck(deck, x, z, -footprint - 1.4)')
    .replace('hull.island !== "welcome" && hull.island !== "dance" && Math.hypot(x - hull.x, z - hull.z)', 'hull.island !== "dance" && Math.hypot(x - hull.x, z - hull.z)');
  check(reseededHarborSource !== harborSource, "negative seeded-placement mutation is active");
  const reseededHarbor = await import(dataURL(transpile(reseededHarborSource)));
  check(harborJSONHash(reseededHarbor.WORLD_PROPS) !== preHarborPropsHash,
    "negative fixture proves adding harbor to RNG rejection would change the frozen world props");
  const clearedHarborSource = harborSource.replace('export const ARCHITECTURE: Partial<Record<IslandId, { width: number; depth: number; height: number }>> = {',
    'export const ARCHITECTURE: Partial<Record<IslandId, { width: number; depth: number; height: number }>> = { welcome: { width: 6.2, depth: 4.2, height: 3.65 },');
  check(clearedHarborSource !== harborSource, "negative Welcome terrain-clearing mutation is active");
  const clearedHarbor = await import(dataURL(transpile(clearedHarborSource))), mainTop = getTerrainMesh(TERRITORIES[0]).vertices;
  check(harborHash(Buffer.from(clearedHarbor.getTerrainMesh(clearedHarbor.TERRITORIES[0]).vertices.buffer)) !== harborHash(Buffer.from(mainTop.buffer)),
    "negative fixture proves a Welcome architecture clearing would mutate the protected real top buffer");
  const harborSpawn = getArrival("welcome");
  check(harborSpawn.x === harborAnchor.x + harborContract.navigation.entry.x && harborSpawn.z === harborAnchor.z + harborContract.navigation.entry.z
    && SPAWN.x === 0 && SPAWN.z === 65 && Math.abs(getGroundHeight(SPAWN.x, SPAWN.z) - getIsland("welcome").elevation) < 1e-5 && !supportDeckAt(SPAWN.x, SPAWN.z),
    "original Welcome spawn retains XZ and terrain ownership at the explicit low-land height, outside the kiosk");
  let harborTerrainMinimum = Infinity, harborTerrainMaximum = -Infinity, harborTerrainSamples = 0;
  for (let xi = 0; xi <= 62; xi++) for (let zi = 0; zi <= 42; zi++) {
    const x = harborDeck.x - harborDeck.width / 2 + xi / 10, z = harborDeck.z - harborDeck.depth / 2 + zi / 10;
    const height = getTerrainHeight(x, z); harborTerrainMinimum = Math.min(harborTerrainMinimum, height);
    harborTerrainMaximum = Math.max(harborTerrainMaximum, height); harborTerrainSamples++;
    check(height <= harborDeck.top && harborDeck.top - height < .15 && territoryAt(x, z)?.id === "main",
      `harbor ${xi}/${zi}: original terrain remains below floor with a walkable step, no raised/flattened land`);
  }
  const lane = harborContract.navigation.entryLaneClear;
  for (let xi = 0; xi <= 12; xi++) for (let zi = 0; zi <= 4; zi++) {
    const point = { x: harborAnchor.x + lane.xMin + (lane.xMax - lane.xMin) * xi / 12,
      z: harborAnchor.z + lane.zMin + (lane.zMax - lane.zMin) * zi / 4 };
    check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull, .45)),
      `harbor +X entry lane ${xi}/${zi} retains conservative .45m capsule clearance`);
  }
  const atHarbor = point => ({ x: harborAnchor.x + point.x, z: harborAnchor.z + point.z });
  const harborOutside = atHarbor(harborContract.navigation.outsideEntry), harborInside = atHarbor(harborContract.navigation.insideEntry);
  const harborMapApproach = atHarbor(harborContract.navigation.mapApproach), harborMapOutside = { x: harborOutside.x, z: harborMapApproach.z };
  physics.teleport(SPAWN.x, SPAWN.z); settle();
  for (const [label, point] of [["outside", harborOutside], ["inside", harborInside], ["outside-return", harborOutside],
    ["map-outside", harborMapOutside], ["map-approach", harborMapApproach], ["map-return", harborMapOutside], ["spawn-return", SPAWN]]) {
    const state = walkTo(point.x, point.z);
    check(reached(state, point) && state.grounded && Math.abs(state.y - getGroundHeight(point.x, point.z)) < .01,
      `harbor ${label} is actually walkable both ways without jumping: ${JSON.stringify(state)}`);
  }
  let harborFreeSupport = 0;
  for (let xi = 0; xi <= 16; xi++) for (let zi = 0; zi <= 10; zi++) {
    const point = { x: harborDeck.x - harborDeck.width / 2 + .4 + (harborDeck.width - .8) * xi / 16,
      z: harborDeck.z - harborDeck.depth / 2 + .4 + (harborDeck.depth - .8) * zi / 10 };
    if (WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull, capsuleClearance + .02))) continue;
    physics.teleport(point.x, point.z); const support = settle();
    check(reached(support, point) && support.grounded && Math.abs(support.y - harborDeck.top) < .01,
      `actual Rapier harbor flat-floor support ${xi}/${zi}: ${JSON.stringify(support)}`); harborFreeSupport++;
  }
  check(harborFreeSupport >= 25, `harbor free floor physically sampled: ${harborFreeSupport} clear points`);
  const noHarborDeck = await createBuildingFixture("welcome", undefined, false);
  try {
    noHarborDeck.teleport(harborInside.x, harborInside.z); const support = settle(noHarborDeck);
    check(Math.abs(support.y - harborDeck.top) > .04 && Math.abs(support.y - getTerrainHeight(harborInside.x, harborInside.z)) < .01,
      `negative harbor fixture requires its floor collider, not terrain alone: ${JSON.stringify(support)}`);
  } finally { noHarborDeck.dispose(); }
  let harborIsolatedCollisions = 0;
  const noHarborHulls = await createBuildingFixture("welcome");
  try {
    for (const hull of WELCOME_HARBOR.hulls) {
      // The mast stands beside the floor on original terrain. Approach along
      // that supported terrain strip from +X, not across the floor's raised
      // edge, so a floor stop cannot masquerade as contact with this thin pole.
      const directions = hull.id === "harbor-compass-mast" ? [[1, 0]] : undefined;
      let approach = buildingCollisionApproach(hull, WORLD_STRUCTURE_HULLS, directions), collisionPhysics = physics;
      if (!approach) {
        approach = buildingCollisionApproach(hull, [hull], directions); collisionPhysics = await createBuildingFixture("welcome", hull); harborIsolatedCollisions++;
      }
      try {
        check(!!approach, `${hull.id} has a supported independent collision-test approach`);
        collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
        check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} starts outside solids`);
        const contact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
        check(Math.abs(distanceToHull(contact, hull) - capsuleClearance) < .015 && contact.grounded,
          `${hull.id} actual Rapier contact matches the source solid: ${JSON.stringify(contact)}`);
        noHarborHulls.teleport(approach.start.x, approach.start.z); const absent = walkTo(hull.x, hull.z, 180, 5, noHarborHulls);
        check(reached(absent, hull) && absent.grounded, `${hull.id} removed-hull negative fixture reaches its formerly solid centre: ${JSON.stringify(absent)}`);
      } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
    }
  } finally { noHarborHulls.dispose(); }

  const danceContract = JSON.parse(fs.readFileSync(new URL(`../${DANCE_PAVILION.sourceContract}`, import.meta.url), "utf8"));
  const danceDeck = DANCE_PAVILION_DECK, danceAnchor = DANCE_PAVILION.anchor, danceNavigation = danceContract.runtimeApproval.navigation;
  check(danceContract.schema === "archipelago-static-building-contract-v1" && danceContract.root === DANCE_PAVILION.root
    && danceContract.units === "metres", "Dance source proposal/root/units are explicit, not inferred from old pavilion");
  check(danceDeck.id === danceContract.deck.id && danceDeck.width === 22 && danceDeck.depth === 16 && danceDeck.thickness === .24
    && danceDeck.top === danceAnchor.y && Math.abs(danceDeck.top - getIsland("dance").elevation - .06) < 1e-8
    && JSON.stringify(danceContract.runtimeApproval.anchor) === JSON.stringify({island: "dance", territory: "dance", ...danceAnchor, yaw: 0}),
    "Dance unscaled 22×16 floor shares the sea-relative map anchor and six-centimetre clearance");
  check(DANCE_PAVILION.hulls.length === 28 && danceContract.hulls.length === 28
    && WORLD_STRUCTURE_HULLS.filter(h => h.island === "dance").length === 28
    && !WORLD_STRUCTURE_HULLS.some(h => /^dance-(post|desk)-/.test(h.id)), "28 authored solids replace all six legacy Dance colliders without duplicates");
  for (const sourceHull of danceContract.hulls) {
    const hull = DANCE_PAVILION.hulls.find(h => h.id === sourceHull.id);
    check(!!hull && WORLD_STRUCTURE_HULLS.includes(hull) && hull.kind === sourceHull.kind && hull.role === sourceHull.role,
      `${sourceHull.id} identity/kind/role match the Dance source proposal`);
    const expected = { x: danceAnchor.x + sourceHull.x, z: danceAnchor.z + sourceHull.z,
      y: danceAnchor.y + sourceHull.bottom + sourceHull.height / 2, width: sourceHull.width, height: sourceHull.height,
      depth: sourceHull.depth, yaw: sourceHull.yaw };
    if (sourceHull.kind === "cylinder") expected.radius = sourceHull.radius;
    check(Object.entries(expected).every(([key, value]) => Math.abs(hull[key] - value) < 1e-8), `${sourceHull.id} exact unscaled source transform/extents`);
    check(Math.abs(sourceHull.x) + sourceHull.width / 2 <= danceDeck.width / 2
      && Math.abs(sourceHull.z) + sourceHull.depth / 2 <= danceDeck.depth / 2, `${sourceHull.id} hard footprint stays on the actual floor`);
  }

  // Inspect transformed POSITION vertices of the real editable GLB, not just
  // accessor min/max, concept art, source dimensions or an approval string.
  const danceBytes = fs.readFileSync(new URL("../public/models/archipelago/dance-pavilion-v1.glb", import.meta.url));
  check(danceBytes.readUInt32LE(0) === 0x46546c67 && danceBytes.readUInt32LE(4) === 2
    && danceBytes.readUInt32LE(8) === danceBytes.length, "actual Dance GLB header is valid");
  const danceJSONEnd = 20 + danceBytes.readUInt32LE(12), danceDoc = JSON.parse(danceBytes.subarray(20, danceJSONEnd).toString("utf8"));
  check(danceBytes.readUInt32LE(16) === 0x4e4f534a && danceBytes.readUInt32LE(danceJSONEnd + 4) === 0x004e4942,
    "actual Dance GLB contains its JSON and embedded binary chunks");
  const danceBin = danceBytes.subarray(danceJSONEnd + 8), danceView = new DataView(danceBin.buffer, danceBin.byteOffset, danceBin.byteLength);
  const danceRoots = danceDoc.nodes.filter(node => node.name === DANCE_PAVILION.root);
  check(danceRoots.length === 1, "actual Dance GLB has exactly one declared foot-origin root");
  const exportedProposal = JSON.parse(danceRoots[0].extras.proposed_solid_contract_json);
  assert.deepEqual(exportedProposal, Object.fromEntries(Object.keys(exportedProposal).map(key => [key, danceContract[key]])),
    "actual GLB's original PROPOSED contract is preserved verbatim structurally; runtime approval is separate"); checks++;
  const danceSourceHulls = new Map(danceContract.hulls.map(hull => [hull.id, hull]));
  danceSourceHulls.set(danceDeck.id, {id: danceDeck.id, kind: "box", x: 0, z: 0, width: 22, depth: 16, bottom: -.24, height: .24});
  const danceHardPoints = new Map(), dancePoint = new Vector3();
  const localMatrix = node => node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0, 0, 0]), new Quaternion().fromArray(node.rotation ?? [0, 0, 0, 1]),
    new Vector3().fromArray(node.scale ?? [1, 1, 1]));
  const danceWalk = (index, parent, active = false, ancestors = new Set()) => {
    check(!ancestors.has(index), "actual Dance node hierarchy is acyclic");
    const node = danceDoc.nodes[index], matrix = parent.clone().multiply(localMatrix(node));
    if (node.name === DANCE_PAVILION.root) {
      check(matrix.elements.every((value, i) => Math.abs(value - (i % 5 === 0 ? 1 : 0)) < 1e-8), "actual Dance root retains identity local/world placement");
      active = true;
    }
    if (active && node.extras?.shared_hull_id) {
      const id = node.extras.shared_hull_id;
      check(danceSourceHulls.has(id) && node.mesh !== undefined, `${node.name} maps its hard mesh to a declared Dance solid`);
      const points = danceHardPoints.get(id) ?? []; danceHardPoints.set(id, points);
      for (const primitive of danceDoc.meshes[node.mesh].primitives) {
        const accessor = danceDoc.accessors[primitive.attributes.POSITION], bufferView = danceDoc.bufferViews[accessor.bufferView];
        check(accessor.componentType === 5126 && accessor.type === "VEC3" && !accessor.sparse
          && bufferView.buffer === 0 && !danceDoc.buffers[0].uri, `${node.name} hard POSITION is finite-decodable embedded Float32 VEC3`);
        const stride = bufferView.byteStride ?? 12, start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        check(start + (accessor.count - 1) * stride + 12 <= danceBin.length, `${node.name} hard POSITION range stays inside actual binary`);
        for (let i = 0; i < accessor.count; i++) {
          dancePoint.set(danceView.getFloat32(start + i * stride, true), danceView.getFloat32(start + i * stride + 4, true),
            danceView.getFloat32(start + i * stride + 8, true)).applyMatrix4(matrix);
          check(dancePoint.toArray().every(Number.isFinite), `${node.name} affine hard POSITION ${i} is finite`); points.push(dancePoint.toArray());
        }
      }
    }
    const next = new Set(ancestors).add(index);
    for (const child of node.children ?? []) danceWalk(child, matrix, active, next);
  };
  for (const root of danceDoc.scenes[danceDoc.scene ?? 0].nodes) danceWalk(root, new Matrix4());
  const hardExcess = (point, hull) => Math.max(0, hull.bottom - point[1], point[1] - hull.bottom - hull.height,
    hull.kind === "cylinder" ? Math.hypot(point[0] - hull.x, point[2] - hull.z) - hull.radius
      : Math.max(Math.abs(point[0] - hull.x) - hull.width / 2, Math.abs(point[2] - hull.z) - hull.depth / 2));
  let danceHardVertices = 0, danceHardMaximumExcess = 0;
  check(danceHardPoints.size === 29, "actual Dance binary contains hard geometry for all 28 hulls and the structural floor");
  for (const [id, hull] of danceSourceHulls) {
    const points = danceHardPoints.get(id); check(points?.length > 0, `${id} has actual exported hard POSITION evidence`);
    for (const point of points) {
      const excess = hardExcess(point, hull); danceHardMaximumExcess = Math.max(danceHardMaximumExcess, excess); danceHardVertices++;
      check(excess <= 2e-6, `${id} actual affine vertex fits its conservative solid within 2µm: excess=${excess}`);
    }
  }
  const danceFloorPoints = danceHardPoints.get(danceDeck.id), danceFloorBounds = [0, 1, 2].map(axis =>
    [Math.min(...danceFloorPoints.map(point => point[axis])), Math.max(...danceFloorPoints.map(point => point[axis]))]);
  check(danceFloorBounds.every(([minimum, maximum], axis) => Math.abs(minimum - [-11, -.24, -8][axis]) <= 2e-6
    && Math.abs(maximum - [11, 0, 8][axis]) <= 2e-6), "actual hard Dance floor is exactly local [-11,-.24,-8]..[11,0,8]");
  const hardNegative = [...danceHardPoints.entries()].find(([id]) => id !== danceDeck.id), negativePoint = [...hardNegative[1][0]];
  negativePoint[0] += 25;
  check(hardExcess(negativePoint, danceSourceHulls.get(hardNegative[0])) > 2e-6,
    "negative affine-position fixture is rejected by the actual hard-solid enclosure test");

  const preDanceTopHashes = {
    main: "46b1147ed2fa1d3ef444529b03dd18e84b91fd20e3bc895558764910de3ccc79",
    projects: "5dfe4e74fd68978c7a2be0ab2ccd359eae536db5d7a29d48be862462569ba015",
    ridge: "025c0335147f4f575d409d661d838ade779ca21f13f58e38a8138702de02e692",
    skills: "fa7dcce27ecc356dc1d3cc8d4d3a82935e42f4583b3ba0c3270dfce55f484fca",
    tesla: "7b29325a2b388396f97db611e043a44a79ec030877ac1a51355bd5c9da819ce2",
    dance: "71e398c6e6d476629035648e0708fc15fcc371227164fce664016abdc8ba284b",
  };
  for (const territory of TERRITORIES) check(sha(arrayBytes(getTerrainMesh(territory).vertices)) === preDanceTopHashes[territory.id],
    `${territory.id} entire actual terrain XYZ remains byte-identical to measured pre-Dance integration snapshot`);
  const reseededDanceSource = currentMapSource.replace('hull.island !== "welcome" && hull.island !== "dance" && Math.hypot(x - hull.x, z - hull.z)',
    'hull.island !== "welcome" && Math.hypot(x - hull.x, z - hull.z)');
  check(reseededDanceSource !== currentMapSource && sha(JSON.stringify((await import(dataURL(transpile(reseededDanceSource)))).WORLD_PROPS)) !== preHarborPropsHash,
    "negative Dance circular-hull RNG fixture proves why the original clearing must retain all 196 props");
  const changedSeedPathsSource = currentMapSource.replace('const SEEDED_PLACEMENT_PATHS = walkPaths(getSeedConnectionPath);',
    'const SEEDED_PLACEMENT_PATHS = walkPaths(getConnectionPath);');
  check(changedSeedPathsSource !== currentMapSource
    && sha(JSON.stringify((await import(dataURL(transpile(changedSeedPathsSource)))).WORLD_PROPS)) !== preHarborPropsHash,
    "negative fixture proves coupling the new pedestrian approach to seeded rejection would move the frozen 196 props");
  let danceTerrainMinimum = Infinity, danceTerrainMaximum = -Infinity, danceTerrainSamples = 0, danceFreeSupport = 0, danceIsolatedCollisions = 0;
  for (let xi = 0; xi <= 44; xi++) for (let zi = 0; zi <= 32; zi++) {
    const x = danceDeck.x - danceDeck.width / 2 + xi / 44 * danceDeck.width,
      z = danceDeck.z - danceDeck.depth / 2 + zi / 32 * danceDeck.depth, height = getTerrainHeight(x, z);
    danceTerrainMinimum = Math.min(danceTerrainMinimum, height); danceTerrainMaximum = Math.max(danceTerrainMaximum, height); danceTerrainSamples++;
    check(height <= danceDeck.top && getGroundHeight(x, z) === danceDeck.top && territoryAt(x, z, 0)?.id === "dance"
      && islandAt(x, z)?.id === "dance", `Dance floor ${xi}/${zi} fits existing coastal land with real shared support`);
  }
  const atDance = point => ({x: danceAnchor.x + point.x, z: danceAnchor.z + point.z});
  const danceEntry = getArrival("dance"), danceOutside = atDance(danceNavigation.outsideEntry), danceInside = atDance(danceNavigation.insideEntry);
  check(reached(danceEntry, atDance(danceNavigation.entry)) && !supportDeckAt(danceEntry.x, danceEntry.z)
    && !supportDeckAt(danceOutside.x, danceOutside.z), "original Dance arrival and approach remain terrain-owned, not a fabricated route floor");
  const danceBridgeShore = getBridgeProfile("welcome", "dance").end;
  const danceBridgePath = getConnectionPath("welcome", "dance"), danceAccess = [danceBridgeShore, ...approvedDanceWaypoints, danceEntry];
  check(JSON.stringify(danceBridgePath.slice(4)) === JSON.stringify(danceAccess)
    && JSON.stringify(danceBridgePath.slice(0, 4).map(({x,z})=>({x,z}))) === JSON.stringify(approvedLighthouseApproach)
    && JSON.stringify(getConnectionPath("dance", "welcome")) === JSON.stringify([...danceBridgePath].reverse()),
    "actual Dance route consumes exactly the approved local waypoints and reverses the same itinerary");
  for (const point of approvedDanceWaypoints) check(territoryAt(point.x, point.z)?.id === "dance" && !supportDeckAt(point.x, point.z),
    "Dance detour stands on original coastal terrain, never a route-only support floor");
  physics.teleport(danceEntry.x, danceEntry.z);
  const oldDanceChord = walkTo(danceBridgeShore.x, danceBridgeShore.z);
  const blockingDancePost = DANCE_PAVILION.hulls.find(hull => hull.id === "post_west_2");
  check(!reached(oldDanceChord, danceBridgeShore) && oldDanceChord.grounded
    && Math.abs(distanceToHull(oldDanceChord, blockingDancePost) - capsuleClearance) < .015,
    `negative original straight chord really collides with the new west post: ${JSON.stringify(oldDanceChord)}`);
  for (const reverse of [false, true]) {
    const path = reverse ? [...danceAccess].reverse() : danceAccess; physics.teleport(path[0].x, path[0].z);
    for (const target of path.slice(1)) {
      const state = walkTo(target.x, target.z);
      check(reached(state, target) && state.grounded && Math.abs(state.y - getGroundHeight(state.x, state.z)) < slopeFootClearance,
        `approved Dance terrain approach reverse=${reverse} is genuinely walkable: ${JSON.stringify(state)}`);
    }
  }
  for (const [label, point] of [["arrival", danceEntry], ["outside", danceOutside], ["inside", danceInside], ["centre", danceAnchor],
    ["inside-return", danceInside], ["outside-return", danceOutside], ["arrival-return", danceEntry]]) {
    if (label === "arrival") physics.teleport(point.x, point.z);
    const state = walkTo(point.x, point.z);
    check(reached(state, point) && state.grounded && Math.abs(state.y - getGroundHeight(state.x, state.z)) < slopeFootClearance,
      `Dance ${label} is walkable without jumping across the actual floor step: ${JSON.stringify(state)}`);
  }
  for (const sourceStation of danceNavigation.stations) {
    const station = WORLD_STATIONS.find(entry => entry.id === sourceStation.id), approach = getStationApproach(station), sourceApproach = atDance(sourceStation.approach);
    check(station.x === danceAnchor.x + sourceStation.x && station.z === danceAnchor.z + sourceStation.z
      && station.width === sourceStation.width && station.height === sourceStation.height && station.depth === sourceStation.depth
      && reached(approach, sourceApproach), `${sourceStation.id} retains its unchanged physical hotspot and approach`);
    for (const xs of [-1, 1]) for (const zs of [-1, 1]) {
      const point = {x: approach.x + xs * danceNavigation.approachHalfWidth, z: approach.z + zs * danceNavigation.approachHalfDepth};
      check(isWalkable(point.x, point.z) && !WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull)), `${sourceStation.id} whole approach retains capsule clearance`);
    }
    for (const [origin, destination] of [[danceEntry, approach], [approach, danceInside], [danceInside, approach], [approach, danceEntry]]) {
      physics.teleport(origin.x, origin.z); const state = walkTo(destination.x, destination.z);
      check(reached(state, destination) && state.grounded && Math.abs(state.y - getGroundHeight(state.x, state.z)) < slopeFootClearance,
        `${sourceStation.id} actual terrain/floor approach both ways without jumping: ${JSON.stringify(state)}`);
    }
  }
  for (let xi = 0; xi <= 20; xi++) for (let zi = 0; zi <= 14; zi++) {
    const point = {x: danceDeck.x + (xi / 20 - .5) * (danceDeck.width - capsuleClearance * 2),
      z: danceDeck.z + (zi / 14 - .5) * (danceDeck.depth - capsuleClearance * 2)};
    if (WORLD_STRUCTURE_HULLS.some(hull => overlapsHull(point, hull, capsuleClearance + .02))) continue;
    physics.teleport(point.x, point.z); const support = settle();
    check(reached(support, point) && support.grounded && Math.abs(support.y - danceDeck.top) < .01,
      `actual Rapier Dance floor ${xi}/${zi}: ${JSON.stringify(support)}`); danceFreeSupport++;
  }
  check(danceFreeSupport > 160, `Dance's unobstructed real floor is physically sampled at ${danceFreeSupport} clear points`);
  const noDanceDeck = await createBuildingFixture("dance", undefined, false);
  try {
    noDanceDeck.teleport(danceAnchor.x, danceAnchor.z); const absent = settle(noDanceDeck);
    check(Math.abs(absent.y - danceDeck.top) > .04 && Math.abs(absent.y - getTerrainHeight(absent.x, absent.z)) < slopeFootClearance,
      `negative Dance fixture cannot substitute terrain or underfloor piers for its actual floor collider: ${JSON.stringify(absent)}`);
  } finally { noDanceDeck.dispose(); }
  const noDanceHulls = await createBuildingFixture("dance");
  try {
    for (const hull of DANCE_PAVILION.hulls) {
      // Never let the floor edge masquerade as one of the narrow corner posts.
      // Positive and removed-hull controls share an entirely deck-supported
      // capsule run-up/contact, including occluded solids isolated below.
      const supportedEntry = point => supportDeckAt(point.x, point.z, capsuleClearance)?.id === danceDeck.id;
      let approach = buildingCollisionApproach(hull, WORLD_STRUCTURE_HULLS, undefined, supportedEntry), collisionPhysics = physics;
      if (!approach) {
        approach = buildingCollisionApproach(hull, [hull], undefined, supportedEntry);
        collisionPhysics = await createBuildingFixture("dance", hull); danceIsolatedCollisions++;
      }
      try {
        check(!!approach, `${hull.id} has an independent supported Dance collision approach`);
        collisionPhysics.teleport(approach.start.x, approach.start.z); const start = settle(collisionPhysics);
        check(reached(start, approach.start) && start.grounded && !overlapsHull(start, hull), `${hull.id} starts genuinely outside hard geometry`);
        const contact = walkTo(hull.x, hull.z, 180, 5, collisionPhysics);
        check(Math.abs(distanceToHull(contact, hull) - capsuleClearance) < .015 && contact.grounded,
          `${hull.id} real Rapier contact matches only this authored solid: ${JSON.stringify(contact)}`);
        noDanceHulls.teleport(approach.start.x, approach.start.z); const absent = walkTo(hull.x, hull.z, 180, 5, noDanceHulls);
        check(reached(absent, hull) && absent.grounded, `${hull.id} removed-hull negative reaches its formerly solid centre: ${JSON.stringify(absent)}`);
      } finally { if (collisionPhysics !== physics) collisionPhysics.dispose(); }
    }
  } finally { noDanceHulls.dispose(); }

  // Independent pre-laboratory full XYZ snapshots certify the reconstructed
  // historical height expressions. Their planar/index components remain hard
  // invariants; normal Y now follows the explicit natural-coast contract.
  const preLabGeometry = {
    main: ["cb3d4eea725a8a3c337468094e15994f5a7fb1ee4f9f8f96707ed57489640491", "761698436903a68e8fa0b4bb2c8e31dbae205c1bf4c31bb775e2002c43070f78"],
    projects: ["5a7f927c845fc6ba0182dbb6a85143f5f69051d6fdceffb22b6b8f9abf076d7d", "ecdf3c9ef6aed35f4e810799bb0bda534386d4abe876edb5c483eda367a0b263"],
    ridge: ["102d4f2feeb8ea33b2f5a4d72feeec4bade640e83b0274704736d729e05a3371", "492a5d7d930b4ac90d761f647b80829fdaa3fbf5a01aa20653a2f33f3cf4dd60"],
    skills: ["fa7dcce27ecc356dc1d3cc8d4d3a82935e42f4583b3ba0c3270dfce55f484fca", "bd16eaaa7bab6130005989b4d6de176b28eb3252bd084710a21db1d91ed4c4f0"],
    tesla: ["73844c89fa855704c71e7d1b23484c46619068a57fe1ce9d90dbba550fcdf1ca", "a523c19fb401bbfd9be5cb1c71aeb079b43fae2e7516640f1377ca3ce933f140"],
    dance: ["1ca6831bf9f1561b7a73cdc2579f711a91ecc756115acaca73dfbd6e98c86f7b", "a262392a5cafb73e724e109fef5c430c21bd4f13c774de9c871197869a64c379"],
  };
  for (const territory of TERRITORIES) {
    const mesh = getTerrainMesh(territory), original = historicalMap.getTerrainMesh(historicalMap.TERRITORIES.find(t => t.id === territory.id));
    check(sha(arrayBytes(original.vertices)) === preLabGeometry[territory.id][0], `${territory.id} reconstructed historical full XYZ passes independent pre-laboratory hash`);
    check(sha(arrayBytes(planarVertices(mesh.vertices))) === sha(arrayBytes(planarVertices(original.vertices))),
      `${territory.id} entire current planar XZ buffer remains independently certified exact`);
    check(sha(arrayBytes(mesh.indices)) === "95da1b1ff224794cd1408e3fd7b886b4bd38f2438b91e86fcd95aa85c0ea9ec3", `${territory.id} top INDEX buffer is pre-laboratory exact`);
    check(sha(arrayBytes(original.vertices.slice(-TERRAIN_ANGULAR_SEGMENTS * 3))) === preLabGeometry[territory.id][1], `${territory.id} historical 96 coastal XYZ pass independent hash`);
    check(sha(arrayBytes(planarVertices(mesh.vertices.slice(-TERRAIN_ANGULAR_SEGMENTS * 3))))
      === sha(arrayBytes(planarVertices(original.vertices.slice(-TERRAIN_ANGULAR_SEGMENTS * 3)))), `${territory.id} current 96 coastal XZ remain independently certified exact`);
    check(territory.floating ? sha(arrayBytes(mesh.vertices)) === preLabGeometry[territory.id][0]
      : sha(arrayBytes(mesh.vertices)) !== preLabGeometry[territory.id][0], `${territory.id} ${territory.floating ? "full suspended XYZ remains unchanged" : "normal Y is genuinely reshaped, not a cosmetic wall-only fix"}`);
  }
  const preLabBridges = {
    "welcome/projects": "50e9189424d5a7def1c945278c0247cee50b1a1d2bd4e2fdd998894f5c0948d2",
    "projects/experience": "6bee596520dc5fe4846e7a82a289f2b863eae7f530ae2fb7fa571be7cc53d502",
    "education/welcome": "e6aa633ae8429edd44f2bcb0e26419a4b23dd63035120a57908f31cb3419fa22",
    "welcome/dance": "7e9ad228849a4111ade34b3cb30cae30e1cbde88bbae15ca12fb58aaa8789766",
  };
  for (const [from, to] of BRIDGES) {
    const previous = historicalMap.getBridgeProfile(from, to), current = getBridgeProfile(from, to);
    check(sha(JSON.stringify(previous)) === preLabBridges[`${from}/${to}`], `${from}/${to} reconstructed historical bridge profile passes independent hash`);
    check(sha(JSON.stringify(planarBridge(current))) === sha(JSON.stringify(planarBridge(previous))),
      `${from}/${to} current bridge retains historical XZ/length/yaw exactly while its support height evolves`);
  }
  for (const [label, value, expected] of [
    ["historical AREAS", historicalMap.AREAS, "97f6908b52af8c28a5745558a4d8e0c8350dc81308659e2f964209d777ffc3d1"],
    ["21 station anchors", WORLD_STATIONS, "0c0da487ad243a81b9ca330cbc959974ab8e76706176c58fffcc0591a455a7aa"],
    ["transfer endpoints", TRAVEL_ROUTES, "40bc1c95ef13d11e4014c917b61b7370e56c368ae3406644686414775cc672bb"],
    ["navigation topology", CONNECTIONS, "50c7bb91fc5086bd4b5a11edc02ef3dc944e2144dc33c6f54095f3aa5c988af5"],
  ]) check(sha(JSON.stringify(value)) === expected, `${label} remain exact against pre-laboratory source snapshot`);
  check(sha(JSON.stringify(AREAS.map(planarArea)))
    === sha(JSON.stringify(historicalMap.AREAS.map(planarArea))),
    "all nine area IDs, domains, radii, XZ and entrance coordinates remain independently frozen");
  // Compare actual triangulations with the pre-workshop clearing, not merely
  // self-consistent constants. Only the Projects interior may be reshaped.
  const previousClearingSource = currentMapSource
    .replace("projects: { width: 30, depth: 24, height: 6.4 }", "projects: { width: 26, depth: 18, height: 6.4 }")
    .replace('const coastBlend = area.id === "projects" ? 1 - smooth(0.9, 1, edge) : 1;', "const coastBlend = 1;");
  check(previousClearingSource !== currentMapSource, "pre-workshop clearing comparison is active");
  const previousClearing = await import(dataURL(transpile(previousClearingSource)));
  check(JSON.stringify(previousClearing.AREAS) === JSON.stringify(AREAS) && JSON.stringify(previousClearing.TERRITORIES) === JSON.stringify(TERRITORIES),
    "all nine areas/arrivals and six territory descriptors are unchanged");
  for (const territory of TERRITORIES) {
    const before = previousClearing.getTerrainMesh(territory).vertices, after = getTerrainMesh(territory).vertices;
    check(before.length === after.length && before.every((value, index) => index % 3 === 1 || value === after[index]), `${territory.id} retains all planar terrain coordinates`);
    check(before.slice(-TERRAIN_ANGULAR_SEGMENTS * 3).every((value, index) => value === after[after.length - TERRAIN_ANGULAR_SEGMENTS * 3 + index]),
      `${territory.id} actual 96-vertex coastline XYZ is unchanged`);
    if (territory.id !== "projects") check(before.every((value, index) => value === after[index]), `${territory.id} entire terrain mesh is untouched`);
  }
  for (const [from, to] of BRIDGES) check(JSON.stringify(previousClearing.getBridgeProfile(from, to)) === JSON.stringify(getBridgeProfile(from, to)),
    `${from}/${to} existing bridge landings/height/yaw/sag are unchanged`);
  const previousArchiveSource = currentMapSource.replace("education: { width: 18, depth: 14, height: 5.2 }", "education: { width: 15, depth: 11, height: 5.2 }");
  check(previousArchiveSource !== currentMapSource, "pre-archive 15×11 terrain comparison is active");
  const previousArchive = await import(dataURL(transpile(previousArchiveSource)));
  check(JSON.stringify(previousArchive.AREAS) === JSON.stringify(AREAS) && JSON.stringify(previousArchive.TERRITORIES) === JSON.stringify(TERRITORIES)
    && JSON.stringify(previousArchive.WORLD_STATIONS) === JSON.stringify(WORLD_STATIONS), "archive integration leaves all arrivals, territory descriptors and 21 stations unchanged");
  for (const territory of TERRITORIES) {
    const before = previousArchive.getTerrainMesh(territory).vertices, after = getTerrainMesh(territory).vertices;
    check(before.every((value, index) => index % 3 === 1 || value === after[index]), `${territory.id} planar terrain remains exact after archive clearing`);
    check(before.slice(-TERRAIN_ANGULAR_SEGMENTS * 3).every((value, index) => value === after[after.length - TERRAIN_ANGULAR_SEGMENTS * 3 + index]),
      `${territory.id} exact coastal XYZ survives archive clearing`);
    if (territory.id !== "ridge") check(before.every((value, index) => value === after[index]), `${territory.id} whole terrain remains untouched by archive clearing`);
  }
  for (const [from, to] of BRIDGES) check(JSON.stringify(previousArchive.getBridgeProfile(from, to)) === JSON.stringify(getBridgeProfile(from, to)),
    `${from}/${to} shared bridge profile survives archive clearing exactly`);

  let smallestChannel = Infinity;
  for (let i = 0; i < TERRITORIES.length; i++) for (let j = i + 1; j < TERRITORIES.length; j++) {
    const a = TERRITORIES[i], b = TERRITORIES[j], gap = boundaryGap(coast(a), coast(b));
    check(!gap.overlap, `${a.id}/${b.id} actual coastline polygons do not overlap`);
    check(gap.distance >= 30, `${a.id}/${b.id} leaves a real sea channel, measured gap=${gap.distance.toFixed(2)}`);
    smallestChannel = Math.min(smallestChannel, gap.distance);
    // Neighboring coasts need open water, not a third surface hidden between them.
    if (gap.distance < 70) for (let step = 1; step < 10; step++) {
      const t = step / 10, x = gap.start.x + (gap.end.x - gap.start.x) * t, z = gap.start.z + (gap.end.z - gap.start.z) * t;
      check(!territoryAt(x, z, 0) && getTerrainHeight(x, z) < WATER_LEVEL, `${a.id}/${b.id} open channel sample ${step}/10`);
    }
  }

  for (const territory of TERRITORIES) {
    const mesh = getTerrainMesh(territory), radii = [];
    for (let i = 0; i < 96; i++) radii.push(getShoreRadius(territory, i / 96 * Math.PI * 2));
    check(mesh.vertices.length / 3 === 2689, `${territory.id} shared triangulated surface`);
    check(Math.max(...radii) - Math.min(...radii) > 2, `${territory.id} non-circular silhouette`);
    for (let i = 0; i < mesh.indices.length; i += 3) {
      const [a, b, c] = mesh.indices.slice(i, i + 3), v = mesh.vertices;
      assert((v[b * 3 + 2] - v[a * 3 + 2]) * (v[c * 3] - v[a * 3]) - (v[b * 3] - v[a * 3]) * (v[c * 3 + 2] - v[a * 3 + 2]) > 0, `${territory.id} top normals`);
    }
    checks++;
    for (let i = 0; i < mesh.vertices.length / 3; i += 141) check(Math.abs(getTerrainHeight(mesh.vertices[i * 3], mesh.vertices[i * 3 + 2]) - mesh.vertices[i * 3 + 1]) < 0.003, `${territory.id} height equals mesh vertex ${i}`);
  }
  for (const area of AREAS) {
    const entry = getArrival(area.id); check(isWalkable(entry.x, entry.z), `${area.id} entrance is supported`);
    physics.teleport(entry.x, entry.z); const state = settle();
    check(reached(state, entry) && state.grounded && Math.abs(state.y - getGroundHeight(entry.x, entry.z)) < 0.08, `${area.id} arrival capsule grounded: ${JSON.stringify(state)}`);
    check(islandAt(entry.x, entry.z)?.id === area.id, `${area.id} entry resolves semantic area`);
  }
  for (const connection of CONNECTIONS.filter((c) => c.kind === "walk" || c.kind === "bridge")) for (const reverse of [false, true]) {
    const path = getConnectionPath(connection.from, connection.to); if (reverse) path.reverse();
    physics.teleport(path[0].x, path[0].z);
    for (const waypoint of path.slice(1)) {
      const state = walkTo(waypoint.x, waypoint.z);
      check(reached(state, waypoint) && state.grounded && Math.abs(state.y - getGroundHeight(state.x, state.z)) < slopeFootClearance,
        `${connection.from} → ${connection.to}, reverse=${reverse}, supported waypoint=${JSON.stringify(waypoint)}, state=${JSON.stringify(state)}`);
    }
  }
  for (const station of WORLD_STATIONS) {
    const entry = getArrival(station.island), target = getStationApproach(station);
    physics.teleport(entry.x, entry.z); const state = walkTo(target.x, target.z);
    check(isWalkable(target.x, target.z) && reached(state, target), `hotspot ${station.id} safe walking approach: ${JSON.stringify(state)} target=${JSON.stringify(target)}`);
    physics.teleport(target.x, target.z);
    const collision = walkTo(station.x, station.z, 180, 5);
    check(Math.hypot(collision.x - station.x, collision.z - station.z) > 0.9, `solid object ${station.id}, not an invisible old board`);
  }
  for (const dock of BOAT_DOCKS) for (const reverse of [false, true]) {
    const start = getDockPoint(dock, reverse ? 0.94 : 0), end = getDockPoint(dock, reverse ? 0 : 0.94);
    physics.teleport(start.x, start.z); const state = walkTo(end.x, end.z);
    check(reached(state, end) && state.grounded, `boarding ramp ${dock.id} reverse=${reverse}: ${JSON.stringify(state)} target=${JSON.stringify(end)}`);
  }
  for (const route of TRAVEL_ROUTES) for (const [label, point] of [["departure", route.departure], ["arrival", route.arrival]]) {
    physics.teleport(point.x, point.z); const state = settle();
    check(isWalkable(point.x, point.z) && reached(state, point) && state.grounded, `${route.id} ${label} supported after transition`);
  }
  for (const route of TRAVEL_ROUTES) {
    const entry = getArrival(route.from), dock = route.kind === "boat" ? BOAT_DOCKS.find((d) => d.area === route.from) : undefined;
    physics.teleport(entry.x, entry.z);
    if (dock) check(reached(walkTo(dock.start.x, dock.start.z), dock.start), `${route.id} reachable dock entry`);
    check(reached(walkTo(route.departure.x, route.departure.z), route.departure), `${route.id} reachable departure without jumping`);
  }
  // A real camera-right approach can hit the side of the Tesla ramp. Verify
  // recovery from that collision, not only an ideal centered plank itinerary.
  const garageDock = BOAT_DOCKS.find((dock) => dock.area === "tesla"), garageEntry = getArrival("tesla");
  physics.teleport(garageEntry.x, garageEntry.z);
  const directionLength = Math.hypot(32, 5); let angled;
  for (let step = 0; step < 96; step++) angled = physics.update(32 / directionLength * 12, -5 / directionLength * 12, dt);
  physics.stop();
  check(angled.grounded && isWalkable(angled.x, angled.z), "angled Tesla ramp approach retains supported land");
  const recenter = { x: garageDock.start.x - 2, z: garageDock.start.z + 1 };
  check(reached(walkTo(recenter.x, recenter.z), recenter), "can retreat and recenter after Tesla ramp side collision without jumping");
  check(reached(walkTo(garageDock.start.x, garageDock.start.z), garageDock.start), "recovered Tesla approach reaches the actual ramp landing");
  const garageBoarding = TRAVEL_ROUTES.find((route) => route.id === "tesla-harbor").departure;
  check(reached(walkTo(garageBoarding.x, garageBoarding.z), garageBoarding), "recovered Tesla approach reaches boarding without jumping");
  for (const [from, to] of BRIDGES) {
    const span = getBridgeProfile(from, to);
    check(span.length > 34, `${from}/${to} bridge crosses visible sea, length=${span.length.toFixed(2)}`);
    let previous;
    for (let index = 0; index <= 128; index++) {
      const point = getBridgePoint(from, to, index / 128);
      check(Number.isFinite(point.y) && point.y >= WATER_LEVEL + .65,
        `${from}/${to} lowered bridge deck remains safely above the real sea at ${index}/128`);
      if (previous) check(Math.abs(point.y - previous.y) / Math.hypot(point.x - previous.x, point.z - previous.z) < .4,
        `${from}/${to} lowered span has a walkable slope at ${index}/128`);
      previous = point;
    }
  }
  for (const boat of TRAVEL_ROUTES.filter((r) => r.kind === "boat")) for (let step = 1; step < 100; step++) {
    const { x, z } = getBoatRoutePoint(boat, step / 100);
    check(getTerrainHeight(x, z) < WATER_LEVEL, `${boat.id} actual curved route has open water ${step}/100`);
  }
  for (const prop of WORLD_PROPS.filter((p) => p.kind !== "shrub")) {
    const area = getIsland(prop.island), distance = Math.hypot(area.x - prop.x, area.z - prop.z), nx = (area.x - prop.x) / distance, nz = (area.z - prop.z) / distance;
    const start = { x: prop.x + nx * 3, z: prop.z + nz * 3 };
    if (!isWalkable(start.x, start.z)) continue;
    physics.teleport(start.x, start.z); const state = walkTo(prop.x, prop.z, 160, 6), remaining = Math.hypot(state.x - prop.x, state.z - prop.z);
    check(prop.kind === "palm" ? remaining > 0.34 : remaining > 0.3 || state.y - getTerrainHeight(state.x, state.z) > 0.3, `solid ${prop.id}: ${remaining}`);
  }
  // Imported Contact uses the dedicated actual-module gate below: a generic
  // front-to-centre walk can meet its desk/floor first and misidentify a wall.
  // Its eighteen solids, including buried toes, have isolated contact/removal
  // evidence instead; no shared collider or historical guard is suppressed.
  for (const hull of WORLD_STRUCTURE_HULLS.filter((h) => h.island !== "welcome" && h.island !== "about" && h.island !== "projects" && h.island !== "education" && h.island !== "contact" && (h.role === "wall" || h.role === "tower"))) {
    physics.teleport(hull.x, hull.z + hull.depth / 2 + 3); const state = walkTo(hull.x, hull.z, 160, 6);
    check(Math.hypot(state.x - hull.x, state.z - hull.z) >= hull.depth / 2 + 0.25, `solid architectural ${hull.id}`);
  }
  physics.teleport(SPAWN.x, SPAWN.z); physics.jump(); let peak = 0;
  for (let i = 0; i < 90; i++) peak = Math.max(peak, physics.update(0, 0, dt).y - getGroundHeight(SPAWN.x, SPAWN.z));
  check(peak > 1 && peak < 1.5 && settle().grounded, `physical jump and landing, peak=${peak}`);
  physics.teleport(SPAWN.x, SPAWN.z); physics.jump(); physics.stop(); check(physics.update(0, 0, dt).grounded, "pause clears queued jump");
  const moving = physics.update(12, 0, dt); physics.stop(); check(Math.abs(physics.update(0, 0, dt).x - moving.x) < 0.0001, "pause clears inertia");
  const safe = getArrival("skills"); physics.teleport(safe.x, safe.z); settle(); physics.teleport(NaN, Infinity);
  const recovered = physics.update(Infinity, NaN, NaN); check(Number.isFinite(recovered.x + recovered.y + recovered.z) && reached(recovered, safe), "invalid position returns to last safe point, not harbor");
  physics.teleport(SPAWN.x, SPAWN.z); let shore;
  for (let i = 0; i < 1500; i++) shore = physics.update(12, 12, dt);
  check(isWalkable(shore.x, shore.z), "shoreline guard retains safe position");
  physics.dispose(); physics.dispose(); check(Number.isFinite(physics.update(1, 1, 1).x), "idempotent disposal");
  // Default requires the actual exported GLB and its affine hard POSITION
  // parity. --map-only explicitly defers binary evidence during authoring;
  // the Contact script announces that limit and is never silently skipped.
  await import("./island-contact-check.mjs");
  console.log(`Projects settled walking camera eyes: ${JSON.stringify(projectsArrivalEyes)}; unchanged palm corridor clearance 3.8×scale. Numerical final-pose checks, not live eased-transition or pixel-occlusion acceptance.`);
  console.log(`Natural elevations: WATER_LEVEL=${WATER_LEVEL}; normal area clearances=${JSON.stringify(LAND_CLEARANCE)}; actual normal rims .38–.72m above sea; max normal terrain ≤7m above sea; elevated-land/raised-rim negative fixtures rejected. Immutable authoring-local hull/dimension parity retained; runtime relocations workshop=${workshopRelocation.toFixed(2)}m, archive=${archiveRelocation.toFixed(2)}m, harbor=${harborRelocation.toFixed(2)}m; historical full XYZ/profile hashes certify unchanged current planar/index geometry, arrivals and transfer topology; only the local Dance coastal access and northern Contact-hut pedestrian detour differ explicitly.`);
  console.log(`Measured actual triangle slopes (horizontal-area-weighted): ${JSON.stringify(slopes)}; strict narrow-shoulder negative control rejected. Ridge retains a small steep residual; the intended route walks are independently checked with the unchanged controller, not an invisible walking floor.`);
  console.log(`Laboratory: unchanged source JSON/world anchor/full XYZ parity; 20×16 deck; ${labTerrainSamples} original-terrain samples max=${labTerrainMaximum.toFixed(6)}≤${labDeck.top}; ${labFreeSupport} real Rapier free-deck supports; 22 positive hull contacts (${labIsolatedCollisions} isolated fixtures) and 22 removed-hull negative controls; removed-deck negative control; five approaches both ways (${labDeckApproaches} deck/${labTerrainApproaches} terrain); cannon landing↔glide departure clear.`);
  console.log(`Harbor: source-local JSON parity; lateral 6.2×4.2 deck at (${harborAnchor.x},${harborDeck.top.toFixed(2)},${harborAnchor.z}); ${harborTerrainSamples} relocated-terrain samples range=${harborTerrainMinimum.toFixed(6)}..${harborTerrainMaximum.toFixed(6)}; ${harborFreeSupport} actual Rapier free-floor supports; 11 positive hull contacts (${harborIsolatedCollisions} isolated fixtures) and 11 removed-hull negatives; removed-floor, RNG-rejection and terrain-clearing negative controls; +X entry/map approach both ways; all 196 props exactly frozen, both docks and all non-Dance walking corridors retain certified XZ/dimensions; nearest palm base ${harborPalmRoofGap.toFixed(4)}m beyond the soft roof.`);
  console.log(`Dance: actual GLB original PROPOSED contract parity; ${danceHardVertices} affine hard POSITION vertices in 28 hulls + floor (max excess=${danceHardMaximumExcess}m); exact 22×16×.24 floor at (${danceAnchor.x},${danceDeck.top},${danceAnchor.z}); ${danceTerrainSamples} unchanged terrain samples ${danceTerrainMinimum.toFixed(6)}..${danceTerrainMaximum.toFixed(6)}; ${danceFreeSupport} actual Rapier free-floor supports; entry/centre/two station approaches both ways; old straight chord collision negative and approved three-waypoint terrain approach both ways; 28 positive contacts (${danceIsolatedCollisions} isolated fixtures), 28 removed-hull negatives, removed-floor and separate historical-seed/RNG negatives; all six pre-Dance terrain XYZ buffers and 196 props exact. Binary geometry/map/physics evidence, not loading/device or final art acceptance.`);
  console.log(`PASS: ${checks} checks; 9 places / 6 terrain meshes / 8 visit destinations; home studio 12×8 deck, ${studioOffCoast} occupied off-coast grid point, ${studioFreeSupport} real Rapier free-deck checks + 4 isolated fixture corners, 21 hull contacts (${studioIsolatedCollisions} occluded hull fixtures); workshop local JSON parity, ${workshopTerrainSamples} terrain samples max=${workshopTerrainMaximum.toFixed(6)}≤${workshopDeck.top}, ${workshopFreeSupport} free support points, 27 hull contacts (${workshopIsolatedCollisions} occluded hull fixtures), 5 approaches both ways; archive local JSON parity, ${archiveTerrainSamples} terrain samples max=${archiveTerrainMaximum.toFixed(6)}≤${archiveDeck.top}, ${archiveFreeSupport} free support points, 22 hull contacts (${archiveIsolatedCollisions} occluded hull fixtures), 3 approaches both ways and west ridge clearance; 15 actual coastline pairs, smallest sea channel ${smallestChannel.toFixed(2)}; 4 bridges both ways and 516 sea-clearance/512 slope samples; shared-land walks; 21 hotspot approaches and collisions; 2 boarding ramps both ways; 4 travel endpoints; both curved boat routes sampled; ${WORLD_PROPS.filter(p => p.kind !== "shrub").length} solid props; architecture, jump, pause, last-safe recovery, lifecycle.`);
} finally { physics.dispose(); }
