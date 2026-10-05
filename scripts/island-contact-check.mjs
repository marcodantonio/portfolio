import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";
import RAPIER from "@dimforge/rapier3d-compat";
import { Matrix4, Quaternion, Vector3 } from "three";

// Execute the unchanged browser controller and inspect its actual Rapier world.
// Capturing the constructor does not change terrain, solids or controller options.
const rawMap = fs.readFileSync(new URL("../lib/island-map.ts", import.meta.url), "utf8");
const transpile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const compile = file => transpile(fs.readFileSync(new URL(file, import.meta.url), "utf8"));
const dataURL = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const mapURL = dataURL(transpile(rawMap)), map = await import(mapURL);
const captureKey = "__islandContactCheckActualWorld";
const rapierURL = dataURL(`import R from ${JSON.stringify(import.meta.resolve("@dimforge/rapier3d-compat"))};
  export default {...R, World: class extends R.World {
    constructor(...args) { super(...args); globalThis[${JSON.stringify(captureKey)}] = this; }
  }};`);
function physicsURLFor(sourceMapURL) {
  const coast = dataURL(compile("../lib/island-coast.ts").replace('"./island-map"', JSON.stringify(sourceMapURL)));
  const foundations = dataURL(compile("../lib/island-foundation-map.ts")
    .replace('"./island-map"', JSON.stringify(sourceMapURL)).replace('"./island-coast"', JSON.stringify(coast)));
  return dataURL(compile("../lib/island-physics.ts")
    .replace('"@dimforge/rapier3d-compat"', JSON.stringify(rapierURL))
    .replace('"./island-map"', JSON.stringify(sourceMapURL)).replace('"./island-foundation-map"', JSON.stringify(foundations)));
}
async function createPhysics(sourceMapURL = mapURL) {
  const module = await import(physicsURLFor(sourceMapURL));
  const physics = await module.createIslandPhysics(), world = globalThis[captureKey];
  assert(world instanceof RAPIER.World, "captured world is the actual browser module's real Rapier world");
  return { physics, world };
}
async function fixture(retainedId = null, includeFloor = true) {
  const source = `export * from ${JSON.stringify(mapURL)};
    import { WORLD_STRUCTURE_HULLS as hulls, WORLD_SUPPORT_DECKS as decks } from ${JSON.stringify(mapURL)};
    export const WORLD_STRUCTURE_HULLS = hulls.filter(h => h.island !== "contact" || h.id === ${JSON.stringify(retainedId)});
    export const WORLD_SUPPORT_DECKS = decks.filter(d => ${includeFloor ? "true" : 'd.island !== "contact"'});`;
  return createPhysics(dataURL(source));
}
let checks = 0;
const check = (condition, message) => { assert(condition, message); checks++; };
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const bytes = array => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
// Measured independently BEFORE Contact integration, not current-state snapshots.
const originalTerrain = {
  main: "46b1147ed2fa1d3ef444529b03dd18e84b91fd20e3bc895558764910de3ccc79",
  projects: "5dfe4e74fd68978c7a2be0ab2ccd359eae536db5d7a29d48be862462569ba015",
  ridge: "025c0335147f4f575d409d661d838ade779ca21f13f58e38a8138702de02e692",
  skills: "fa7dcce27ecc356dc1d3cc8d4d3a82935e42f4583b3ba0c3270dfce55f484fca",
  tesla: "7b29325a2b388396f97db611e043a44a79ec030877ac1a51355bd5c9da819ce2",
  dance: "71e398c6e6d476629035648e0708fc15fcc371227164fce664016abdc8ba284b",
};
const originalProps = "18dfc876eddb0674f1f2160193212bc605c49b1ae985dfdaf1ee439a1f5d600b";
const originalStations = "0c0da487ad243a81b9ca330cbc959974ab8e76706176c58fffcc0591a455a7aa";
const terrainExact = module => module.TERRITORIES.every(t => sha(bytes(module.getTerrainMesh(t).vertices)) === originalTerrain[t.id]);
for (const territory of map.TERRITORIES) {
  const mesh = map.getTerrainMesh(territory);
  check(sha(bytes(mesh.vertices)) === originalTerrain[territory.id], `${territory.id} complete pre-Contact XYZ is exact`);
  check(sha(bytes(mesh.indices)) === "95da1b1ff224794cd1408e3fd7b886b4bd38f2438b91e86fcd95aa85c0ea9ec3", `${territory.id} historical triangle indices are exact`);
}
check(map.WORLD_PROPS.length === 196 && sha(JSON.stringify(map.WORLD_PROPS)) === originalProps, "all196 historical props are exact, including semantic owners");
check(map.WORLD_STATIONS.length === 21 && sha(JSON.stringify(map.WORLD_STATIONS)) === originalStations, "all21 historical stations are exact");
for (const [label, from, to, predicate] of [
  ["Contact deck cannot participate in terrain apron masks", '|| deck.island === "contact"', "", terrainExact],
  ["native Contact collar cannot disappear when its small floor is added", '&& place.id !== "contact"', "", terrainExact],
  ["new Contact solids cannot replace the original two RNG hulls", "|| SEEDED_STRUCTURE_HULLS.some", "|| WORLD_STRUCTURE_HULLS.some", module => sha(JSON.stringify(module.WORLD_PROPS)) === originalProps],
  ["Contact floor cannot consume new random rejection samples", 'deck.island !== "welcome" && deck.island !== "contact" && pointOnSupportDeck', 'deck.island !== "welcome" && pointOnSupportDeck', module => sha(JSON.stringify(module.WORLD_PROPS)) === originalProps],
]) {
  check(rawMap.includes(from), `${label}: negative fixture targets the actual source`);
  const negative = await import(dataURL(transpile(rawMap.replace(from, to))));
  check(!predicate(negative), `${label}: independently frozen guard rejects the regression`);
}

const building = map.CONTACT_LIGHTHOUSE, deck = map.CONTACT_LIGHTHOUSE_DECK;
const proposal = JSON.parse(fs.readFileSync(new URL(`../${building.sourceContract}`, import.meta.url), "utf8"));
check(building.root === proposal.root && building.island === "contact" && proposal.units === "metres", "Contact source root/units are explicit");
check(Math.abs(building.anchor.y - .26) < 1e-8 && building.anchor.x === 17 && building.anchor.z === 69, "tower root is17/.26/69, not offset floor centre");
check(deck.x === building.anchor.x + proposal.deck.x && deck.z === building.anchor.z + proposal.deck.z
  && deck.width === 6.6 && deck.depth === 4.6 && deck.thickness === .24 && deck.top === building.anchor.y,
"only the hut has a6.6×4.6×.24 structural floor at11.8/.26/71.7");
check(map.WORLD_SUPPORT_DECKS.length === 7 && map.WORLD_SUPPORT_DECKS.includes(deck), "seven structural decks retain six physical territories");
check(!map.ARCHITECTURE.contact && building.hulls.length === 18 && proposal.hulls.length === 18
  && map.WORLD_STRUCTURE_HULLS.filter(h => h.island === "contact").length === 18, "no Contact clearing, duplicate legacy solids or giant floor");
for (const source of proposal.hulls) {
  const hull = building.hulls.find(h => h.id === source.id);
  check(!!hull && map.WORLD_STRUCTURE_HULLS.includes(hull) && hull.kind === source.kind
    && hull.role === (source.role === "landmark" ? "tower" : source.role), `${source.id} has exactly one shared structural solid`);
  check(hull.x === building.anchor.x + source.x && hull.z === building.anchor.z + source.z
    && hull.y === building.anchor.y + source.bottom + source.height / 2 && hull.width === source.width
    && hull.height === source.height && hull.depth === source.depth && hull.radius === source.radius && hull.yaw === source.yaw,
  `${source.id} exact unscaled local-to-world hull parity`);
}
const station = map.WORLD_STATIONS.find(s => s.island === "contact"), approach = map.getStationApproach(station), arrival = map.getArrival("contact");
check(station.x === 12 && station.z === 72.5 && approach.x === 12 && approach.z === 75.6
  && arrival.x === 13 && arrival.z === 79, "existing desk/approach/arrival anchors remain exact");
let terrainSamples = 0, terrainMinimum = Infinity, terrainMaximum = -Infinity;
for (let ix = 0; ix <= 66; ix++) for (let iz = 0; iz <= 46; iz++) {
  const x = deck.x - deck.width / 2 + ix * .1, z = deck.z - deck.depth / 2 + iz * .1, height = map.getTerrainHeight(x, z);
  check(height <= deck.top + 1e-8 && map.territoryAt(x, z, 0)?.id === "main", "small hut footprint stays over unchanged real main land");
  terrainMinimum = Math.min(terrainMinimum, height); terrainMaximum = Math.max(terrainMaximum, height); terrainSamples++;
}
check(!map.supportDeckAt(building.anchor.x, building.anchor.z), "tower stands on terrain, not the offset hut floor or a new platform");
// A newly introduced historical RNG padding is not physical geometry. Preserve
// seeded poses, then check their real solid envelopes against this hut/tower.
const contactObstacles = [...building.hulls, {kind: "box", x: deck.x, z: deck.z, width: deck.width, depth: deck.depth}];
function propClearance(prop) {
  // Enclose each complete tapered trunk segment, not just its endpoints: a
  // slanted trunk could otherwise cross a box while both endpoints look clear.
  const probes = prop.kind === "palm" ? map.getPalmTrunkSegments(prop).map(segment =>
    ({x: (segment.a.x + segment.b.x) / 2, z: (segment.a.z + segment.b.z) / 2,
      radius: Math.max(segment.radius, segment.radiusTop)
        + Math.hypot(segment.b.x - segment.a.x, segment.b.z - segment.a.z) / 2}))
    : [{x: prop.x, z: prop.z, radius: prop.kind === "rock" ? Math.hypot(1,.85) * prop.scale : prop.scale}];
  return Math.min(...probes.flatMap(point => contactObstacles.map(hull => distanceToHull(point,hull) - point.radius)));
}
let minimumPropClearance = Infinity;
for (const prop of map.WORLD_PROPS) {
  const gap = propClearance(prop); minimumPropClearance = Math.min(minimumPropClearance,gap);
  check(gap > .1, `${prop.id} existing actual solid envelope clears Contact floor/hard geometry, not arbitrary new RNG padding`);
}
check(propClearance({...map.WORLD_PROPS.find(p=>p.kind==="rock"),x:deck.x,z:deck.z}) < 0,
  "negative prop-envelope fixture rejects a real prop intersection without reseeding");

const dt = 1 / 60, clearance = .345;
const settle = physics => { let state; for (let i = 0; i < 90; i++) state = physics.update(0, 0, dt); return state; };
function walkTo(physics, point, steps = 1800, speed = 8) {
  let state = physics.update(0, 0, dt);
  for (let i = 0; i < steps; i++) {
    const dx = point.x - state.x, dz = point.z - state.z, distance = Math.hypot(dx, dz);
    if (distance < .08) { physics.stop(); return settle(physics); }
    const v = Math.min(speed, distance * 5); state = physics.update(dx / distance * v, dz / distance * v, dt);
  }
  return state;
}
const reached = (state, target) => Math.hypot(state.x - target.x, state.z - target.z) < .12;
function distanceToHull(point, hull) {
  const x = point.x - hull.x, z = point.z - hull.z;
  return hull.kind === "cylinder" ? Math.max(0, Math.hypot(x, z) - hull.radius)
    : Math.hypot(Math.max(0, Math.abs(x) - hull.width / 2), Math.max(0, Math.abs(z) - hull.depth / 2));
}
function distanceToSegment(point, a, b) {
  const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((point.x-a.x)*x+(point.z-a.z)*z)/(x*x+z*z)));
  return Math.hypot(point.x-a.x-x*t,point.z-a.z-z*t);
}
const isolatedApproach = hull => {
  for (const [nx, nz] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) for (const runup of [.85, .65, 1.15]) {
    const edge = hull.kind === "cylinder" ? hull.radius : (nx ? hull.width : hull.depth) / 2;
    const start = {x: hull.x + nx * (edge + runup), z: hull.z + nz * (edge + runup)};
    const end = {x: hull.x + nx * (edge + clearance), z: hull.z + nz * (edge + clearance)};
    if ([start, end].every(p => map.isWalkable(p.x, p.z)
      && (hull.role === "tower" || map.supportDeckAt(p.x, p.z, clearance)?.id === deck.id))) return {start, end};
  }
  return undefined;
};
const actual = await createPhysics();
let floorSupports = 0, movementContacts = 0, rayContacts = 0, rayNegatives = 0;
let northernHullGap = Infinity, northernPropGap = Infinity;
try {
  const welcome = map.getArrival("welcome"), bridge = map.getBridgeProfile("welcome","dance");
  const northern = [welcome,{x:15,z:64},{x:23,z:65},{x:bridge.start.x,z:bridge.start.z}];
  const route = map.getConnectionPath("welcome","dance");
  check(JSON.stringify(route.slice(0,4).map(({x,z})=>({x,z}))) === JSON.stringify(northern)
    && JSON.stringify(map.getConnectionPath("dance","welcome")) === JSON.stringify([...route].reverse()),
  "exact approved northern hut approach is shared with real paths and reverses without moving bridge or arrival");
  // Distance to an obstacle is1-Lipschitz.25mm sampling minus half a sample
  // proves a conservative continuous swept-clearance lower bound, not just
  // safe centre points. The full3.5m corridor plus.36m capsule clears solids.
  const pathClearance = 3.5/2+.36;
  for (let i=1;i<northern.length;i++) {
    const a=northern[i-1],b=northern[i],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/.025);
    for(let j=0;j<=steps;j++) {
      const point={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};
      for(const hull of building.hulls) northernHullGap=Math.min(northernHullGap,distanceToHull(point,hull)-length/steps/2);
    }
    for(const prop of map.WORLD_PROPS.filter(p=>p.kind!=="shrub")) {
      const probes=prop.kind==="palm" ? map.getPalmTrunkSegments(prop).map(s=>({x:(s.a.x+s.b.x)/2,z:(s.a.z+s.b.z)/2,
        radius:Math.max(s.radius,s.radiusTop)+Math.hypot(s.b.x-s.a.x,s.b.z-s.a.z)/2}))
        : [{x:prop.x,z:prop.z,radius:Math.hypot(1,.85)*prop.scale}];
      for(const point of probes) northernPropGap=Math.min(northernPropGap,distanceToSegment(point,a,b)-point.radius);
    }
  }
  check(northernHullGap>pathClearance && northernPropGap>pathClearance,
    `continuous northern fullpath+capsule clearance: hull≥${northernHullGap},prop≥${northernPropGap},required=${pathClearance}`);
  for(const offset of [0,-.9,.9]) for(const reverse of [false,true]) {
    const points=northern.map((point,i)=>{
      const before=northern[Math.max(0,i-1)],after=northern[Math.min(northern.length-1,i+1)];
      const x=after.x-before.x,z=after.z-before.z,length=Math.hypot(x,z);
      return {x:point.x-z/length*offset,z:point.z+x/length*offset};
    });
    if(reverse)points.reverse();
    actual.physics.teleport(points[0].x,points[0].z);settle(actual.physics);
    for(const target of points.slice(1)) {
      const state=walkTo(actual.physics,target);
      check(reached(state,target)&&state.grounded&&Math.abs(state.y-map.getGroundHeight(state.x,state.z))<.32*(Math.SQRT2-1)+.035,
        `actual northern corridor centre/±.9m bothways,nojump,offset=${offset},reverse=${reverse}: ${JSON.stringify(state)}`);
    }
  }
  actual.physics.teleport(welcome.x,welcome.z);settle(actual.physics);
  const blocked=walkTo(actual.physics,bridge.start),backWall=building.hulls.find(h=>h.id==="contact-hut-back-wall");
  check(!reached(blocked,bridge.start)&&blocked.grounded&&Math.abs(distanceToHull(blocked,backWall)-clearance)<.015,
    `negative historical mainland chord genuinely meets hut backwall: ${JSON.stringify(blocked)}`);
  // Stand just inside the open front, not inside the desk's inflated footprint.
  const entry = {x: 12, z: 73.6}, centre = {x: 11.8, z: 71.7};
  for (const reverse of [false, true]) {
    const points = reverse ? [entry, approach, arrival] : [arrival, approach, entry];
    actual.physics.teleport(points[0].x, points[0].z); settle(actual.physics);
    for (const target of points.slice(1)) {
      const state = walkTo(actual.physics, target);
      check(reached(state, target) && state.grounded && Math.abs(state.y - map.getGroundHeight(state.x, state.z)) < .075,
        `actual Contact entry/station path bothways without jumping: reverse=${reverse},${JSON.stringify(state)}→${JSON.stringify(target)}`);
    }
  }
  for (let ix = 1; ix < 22; ix++) for (let iz = 1; iz < 15; iz++) {
    const point = {x: deck.x - 3.3 + ix * .3, z: deck.z - 2.3 + iz * .3};
    if (building.hulls.some(h => h.role !== "foundation" && distanceToHull(point, h) < clearance + .02)) continue;
    actual.physics.teleport(point.x, point.z); const state = settle(actual.physics);
    check(reached(state, point) && state.grounded && Math.abs(state.y - deck.top) < .012, "real Contact free-floor capsule support"); floorSupports++;
  }
  check(floorSupports >= 60, "many independent free points prove hut support, not one lucky sample");
  const empty = await fixture();
  try {
    for (const hull of building.hulls) {
      const single = await fixture(hull.id);
      try {
        const ray = new RAPIER.Ray({x: hull.x + hull.width / 2 + .8, y: hull.y, z: hull.z}, {x: -1, y: 0, z: 0});
        const matches = collider => { const p = collider.translation(); return Math.abs(p.x - hull.x) < 1e-5 && Math.abs(p.y - hull.y) < 1e-5 && Math.abs(p.z - hull.z) < 1e-5; };
        const hit = single.world.castRay(ray, hull.width + 2, true, undefined, undefined, undefined, undefined, matches);
        check(hit && Math.abs(hit.timeOfImpact - .8) < 2e-5, `${hull.id} actual-module Rapier contact, including buried toes, matches its real solid`); rayContacts++;
        check(!empty.world.castRay(ray, hull.width + 2, true, undefined, undefined, undefined, undefined, matches), `${hull.id} removed-hull ray negative rejects missing support`); rayNegatives++;
        if (hull.role === "foundation") continue; // Buried support is not a new player floor.
        const way = isolatedApproach(hull);
        check(!!way, `${hull.id} has a supported isolated capsule approach, not a floor-edge stop`);
        single.physics.teleport(way.start.x, way.start.z); const start = settle(single.physics);
        check(reached(start, way.start) && start.grounded && distanceToHull(start, hull) > clearance, `${hull.id} runup is not embedded`);
        const contact = walkTo(single.physics, hull, 180, 5);
        check(contact.grounded && Math.abs(distanceToHull(contact, hull) - clearance) < .015,
          `${hull.id} unchanged capsule meets this isolated hull: ${JSON.stringify(contact)}`); movementContacts++;
        empty.physics.teleport(way.start.x, way.start.z); settle(empty.physics);
        const removed = walkTo(empty.physics, hull);
        check(reached(removed, hull) && removed.grounded, `${hull.id} removed-hull movement negative reaches its former centre`);
      } finally { single.physics.dispose(); }
    }
    empty.physics.teleport(centre.x, centre.z); const supported = settle(empty.physics);
    const noFloor = await fixture(null, false);
    try {
      noFloor.physics.teleport(centre.x, centre.z); const unsupported = settle(noFloor.physics);
      check(Math.abs(supported.y - deck.top) < .012 && supported.y - unsupported.y > .04,
        `removed-floor negative falls onto real unchanged soil, not hidden walking support: ${supported.y}/${unsupported.y}`);
    } finally { noFloor.physics.dispose(); }
  } finally { empty.physics.dispose(); }
} finally { actual.physics.dispose(); delete globalThis[captureKey]; }

let hardVertices = 0, maximumExcess = 0;
if (!process.argv.includes("--map-only")) {
  const glb = fs.readFileSync(new URL("../public/models/archipelago/contact-lighthouse-v1.glb", import.meta.url));
  check(glb.readUInt32LE(0) === 0x46546c67 && glb.readUInt32LE(4) === 2 && glb.readUInt32LE(8) === glb.length, "actual Contact master has a valid GLB2 header");
  const jsonEnd = 20 + glb.readUInt32LE(12), doc = JSON.parse(glb.subarray(20, jsonEnd).toString("utf8"));
  check(glb.readUInt32LE(16) === 0x4e4f534a && glb.readUInt32LE(jsonEnd + 4) === 0x004e4942, "actual Contact GLB has embedded JSON/binary chunks");
  const bin = glb.subarray(jsonEnd + 8), view = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const roots = doc.nodes.filter(n => n.name === building.root);
  check(roots.length === 1, "actual Contact GLB has exactly one declared tower-origin root");
  assert.deepEqual(JSON.parse(roots[0].extras.proposed_solid_contract_json), proposal, "actual Contact master preserves the PROPOSED contract verbatim"); checks++;
  const sourceHulls = new Map(proposal.hulls.map(h => [h.id, h]));
  sourceHulls.set(deck.id, {...proposal.deck, kind: "box"});
  const hardPoints = new Map(), point = new Vector3();
  const localMatrix = node => node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
    new Vector3().fromArray(node.translation ?? [0,0,0]), new Quaternion().fromArray(node.rotation ?? [0,0,0,1]), new Vector3().fromArray(node.scale ?? [1,1,1]));
  const walk = (index, parent, active = false, ancestry = new Set()) => {
    check(!ancestry.has(index), "actual Contact hierarchy is acyclic");
    const node = doc.nodes[index], matrix = parent.clone().multiply(localMatrix(node));
    if (node.name === building.root) {
      check(matrix.elements.every((v,i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-8), "actual Contact root stays identity and unscaled"); active = true;
    }
    if (active && (node.extras?.shared_hull_id || node.extras?.shared_deck_id)) {
      const id = node.extras.shared_hull_id ?? node.extras.shared_deck_id;
      check(!node.extras.shared_deck_id || node.extras.shared_deck_id === deck.id, "actual Contact floor tag names only the declared small offset deck");
      check(sourceHulls.has(id) && node.mesh !== undefined, `${node.name} hard geometry names a declared Contact hull`);
      const points = hardPoints.get(id) ?? []; hardPoints.set(id, points);
      for (const primitive of doc.meshes[node.mesh].primitives) {
        const accessor = doc.accessors[primitive.attributes.POSITION], bufferView = doc.bufferViews[accessor.bufferView];
        check(accessor.type === "VEC3" && accessor.componentType === 5126 && !accessor.sparse
          && bufferView.buffer === 0 && !doc.buffers[0].uri, "actual hard POSITION is embedded nonsparse Float32");
        const stride = bufferView.byteStride ?? 12, start = (bufferView.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
        check(start + (accessor.count - 1) * stride + 12 <= bin.length, "actual hard POSITION range stays inside GLB binary");
        for (let i = 0; i < accessor.count; i++) {
          point.set(view.getFloat32(start+i*stride,true), view.getFloat32(start+i*stride+4,true), view.getFloat32(start+i*stride+8,true)).applyMatrix4(matrix);
          check(point.toArray().every(Number.isFinite), "actual affine hard POSITION is finite"); points.push(point.toArray());
        }
      }
    }
    const next = new Set(ancestry).add(index);
    for (const child of node.children ?? []) walk(child, matrix, active, next);
  };
  for (const root of doc.scenes[doc.scene ?? 0].nodes) walk(root, new Matrix4());
  const excess = (p,h) => Math.max(0, h.bottom-p[1], p[1]-h.bottom-h.height,
    h.kind === "cylinder" ? Math.hypot(p[0]-h.x,p[2]-h.z)-h.radius : Math.max(Math.abs(p[0]-h.x)-h.width/2,Math.abs(p[2]-h.z)-h.depth/2));
  check(hardPoints.size === 19, "actual Contact binary contains all18 hard hulls plus the one small hut floor");
  for (const [id,hull] of sourceHulls) {
    const points = hardPoints.get(id); check(points?.length > 0, `${id} has actual transformed POSITION evidence`);
    for (const p of points) { const e = excess(p,hull); maximumExcess=Math.max(maximumExcess,e); hardVertices++; check(e <= 2e-6, `${id} actual hard vertex fits source hull within2µm`); }
  }
  const floor = hardPoints.get(deck.id), bounds=[0,1,2].map(axis => [Math.min(...floor.map(p=>p[axis])),Math.max(...floor.map(p=>p[axis]))]);
  check(bounds.every(([lo,hi],axis) => Math.abs(lo-[-8.5,-.24,.4][axis])<=2e-6 && Math.abs(hi-[-1.9,0,5][axis])<=2e-6), "actual hut floor bounds are precisely offset6.6×4.6×.24, not a tower-wide plane");
  const hull=proposal.hulls[0], corrupt=[...hardPoints.get(hull.id)[0]]; corrupt[0]+=20;
  check(excess(corrupt,hull)>2e-6, "negative affine hard-position fixture rejects a displaced solid");
}
console.log(`Contact: ${terrainSamples} exact-terrain hut footprint samples ${terrainMinimum.toFixed(6)}..${terrainMaximum.toFixed(6)}; ${floorSupports} free actual-module capsule supports; approach/entry bothways without jumping; ${movementContacts} exposed isolated capsule contacts+removed-hull movement negatives; ${rayContacts} real-module Rapier ray contacts including4 buried toes+${rayNegatives} removed-hull ray negatives; removed-floor/terrain-apron/native-collar/RNG negatives; preserved conservative prop envelopes gap≥${minimumPropClearance.toFixed(6)}m. Northern(15,64)/(23,65) route centre/±.9m bothways clears full3.5m path+capsule: hull≥${northernHullGap.toFixed(6)},prop≥${northernPropGap.toFixed(6)}m; blocked historical chord negative. All6 XYZ/196props/21stations exact.`);
console.log(process.argv.includes("--map-only") ? "MAP-ONLY: actual GLB audit deliberately not run; no asset/binary readiness approval." : `Actual Contact master: ${hardVertices} affine hard POSITION vertices inside18 hulls+offsetfloor, maximum excess=${maximumExcess}m.`);
console.log(`PASS: ${checks} Contact checks; real geometry/physics, not raster fidelity, loading, FPS or device acceptance.`);
