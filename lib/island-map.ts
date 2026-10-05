export type IslandId = "welcome" | "about" | "projects" | "skills" | "experience" | "education" | "tesla" | "dance" | "contact";
export type PortfolioIslandId = Exclude<IslandId, "welcome">;
export type TerritoryId = "main" | "projects" | "ridge" | "skills" | "tesla" | "dance";
export type WorldPoint = { x: number; z: number };
export type Island = WorldPoint & { id: IslandId; radius: number; color: string; elevation: number; territory: TerritoryId; entrance: WorldPoint; domain: "it" | "personal" | "tesla" | "dance" };
export type TerrainIsland = WorldPoint & { id: TerritoryId; radius: number; color: string; elevation: number; floating?: boolean; stretchX?: number; stretchZ?: number };
export type WorldProp = { id: string; island: IslandId; kind: "palm" | "rock" | "shrub"; x: number; z: number; scale: number; yaw: number };
export type WorldStation = { id: string; island: PortfolioIslandId; index: number; x: number; z: number; yaw: number; width: number; height: number; depth: number; approachDistance: number };
export type WorldStructureHull = { id: string; island: IslandId; kind: "box" | "cylinder"; role: "wall" | "post" | "desk" | "furniture" | "machine" | "car" | "tower" | "foundation"; x: number; y: number; z: number; width: number; height: number; depth: number; radius?: number; yaw: number };
export type WorldSupportDeck = WorldPoint & { id: string; island: IslandId; territory: TerritoryId; width: number; depth: number; thickness: number; top: number; yaw: number };
export type WorldMesh = { vertices: Float32Array; indices: Uint32Array };
export type BridgeProfile = { start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; length: number; yaw: number; sag: number };
export type WorldConnection = { from: IslandId; to: IslandId; kind: "walk" | "bridge" | "boat" | "cannon" | "parachute" };
export type TravelRoute = { id: string; kind: "boat" | "cannon" | "parachute"; from: IslandId; to: IslandId; departure: WorldPoint; arrival: WorldPoint; duration: number };
export const MAP_SCALE = Math.sqrt(10);
export const WATER_LEVEL = -3.2;
export const TERRAIN_ANGULAR_SEGMENTS = 96;
export const TERRAIN_RADIAL_SEGMENTS = 28;
export const BRIDGE_WIDTH = 4.2;
export const STATION_CENTER_Y = 1.35;
/** Metres above the actual sea, not arbitrary high world-space plateaus.
 * Skills is the one deliberately suspended territory and is not sea-relative.
 */
export const LAND_CLEARANCE = { welcome: 2.8, about: 4.4, projects: 4.8, experience: 5.5, education: 6.3, tesla: 2.7, dance: 2.6, contact: 3.4 } as const;
const landElevation = (id: keyof typeof LAND_CLEARANCE) => WATER_LEVEL + LAND_CLEARANCE[id];
/** Six physical surfaces; the nine semantic places are deliberately not nine islands. */
export const TERRITORIES: readonly TerrainIsland[] = [
  { id: "main", x: 0, z: 62, radius: 29, color: "#e4ca8d", elevation: landElevation("welcome") },
  { id: "projects", x: -16, z: -35, radius: 27, color: "#c0a1ff", elevation: landElevation("projects") },
  { id: "ridge", x: 93, z: -6, radius: 30, color: "#c9bea1", elevation: landElevation("experience"), stretchX: 0.72, stretchZ: 1.65 },
  { id: "skills", x: -9, z: -130, radius: 18, color: "#83dbea", elevation: 38, floating: true },
  { id: "tesla", x: -128, z: 47, radius: 17, color: "#d9bba0", elevation: landElevation("tesla") },
  { id: "dance", x: 82, z: 103, radius: 16, color: "#dbad9c", elevation: landElevation("dance") },
];
/** Local offsets keep buildings, entrances and transport attached to their land. */
function onTerritory(id: TerritoryId, x: number, z: number): WorldPoint {
  const territory = getTerritory(id); return { x: territory.x + x, z: territory.z + z };
}
function areaOn(territory: TerritoryId, area: Omit<Island, "territory">): Island {
  return { ...area, ...onTerritory(territory, area.x, area.z), territory, entrance: onTerritory(territory, area.entrance.x, area.entrance.z) };
}
export const AREAS: readonly Island[] = [
  areaOn("main", { id: "welcome", x: 0, z: -7, radius: 15, color: "#ffca62", elevation: landElevation("welcome"), entrance: { x: 0, z: 3 }, domain: "it" }),
  areaOn("main", { id: "about", x: -15, z: -17, radius: 11, color: "#ffa888", elevation: landElevation("about"), entrance: { x: -15, z: -8 }, domain: "personal" }),
  areaOn("projects", { id: "projects", x: 0, z: 0, radius: 26, color: "#c0a1ff", elevation: landElevation("projects"), entrance: { x: 0, z: 15 }, domain: "it" }),
  areaOn("skills", { id: "skills", x: 0, z: 0, radius: 17, color: "#83dbea", elevation: 38, entrance: { x: 0, z: 12 }, domain: "it" }),
  areaOn("ridge", { id: "experience", x: 3, z: -24, radius: 19, color: "#ffc078", elevation: landElevation("experience"), entrance: { x: -1, z: -13 }, domain: "it" }),
  areaOn("ridge", { id: "education", x: -3, z: 27, radius: 18, color: "#8bd7f4", elevation: landElevation("education"), entrance: { x: -5, z: 34 }, domain: "it" }),
  areaOn("tesla", { id: "tesla", x: 0, z: 0, radius: 16, color: "#9db8e4", elevation: landElevation("tesla"), entrance: { x: 5, z: 9 }, domain: "tesla" }),
  areaOn("dance", { id: "dance", x: 0, z: 0, radius: 15, color: "#e3a7c9", elevation: landElevation("dance"), entrance: { x: 0, z: 11 }, domain: "dance" }),
  areaOn("main", { id: "contact", x: 17, z: 10, radius: 11, color: "#ffce82", elevation: landElevation("contact"), entrance: { x: 13, z: 17 }, domain: "personal" }),
];
/** Compatibility name for labels/areas, never a terrain-rendering list. */
export const ISLANDS = AREAS;
export const BRIDGES: readonly (readonly [IslandId, IslandId])[] = [["welcome", "projects"], ["projects", "experience"], ["education", "welcome"], ["welcome", "dance"]];
export const CONNECTIONS: readonly WorldConnection[] = [
  ...BRIDGES.map(([from, to]) => ({ from, to, kind: "bridge" as const })),
  { from: "welcome", to: "about", kind: "walk" }, { from: "welcome", to: "contact", kind: "walk" }, { from: "experience", to: "education", kind: "walk" },
  { from: "welcome", to: "tesla", kind: "boat" }, { from: "tesla", to: "welcome", kind: "boat" },
  { from: "projects", to: "skills", kind: "cannon" }, { from: "skills", to: "projects", kind: "parachute" },
];
const BOARDING_RAMPS: readonly { id: string; area: IslandId; start: WorldPoint; end: WorldPoint }[] = [
  { id: "harbor", area: "welcome", start: onTerritory("main", -27, 1), end: onTerritory("main", -47, 1) },
  { id: "tesla", area: "tesla", start: onTerritory("tesla", 14, 6), end: onTerritory("tesla", 29, 6) },
];
const boardingPoint = ({ start, end }: typeof BOARDING_RAMPS[number]): WorldPoint => ({ x: start.x + (end.x - start.x) * 0.94, z: start.z + (end.z - start.z) * 0.94 });
const harborBoarding = boardingPoint(BOARDING_RAMPS[0]), garageBoarding = boardingPoint(BOARDING_RAMPS[1]);
export const TRAVEL_ROUTES: readonly TravelRoute[] = [
  { id: "harbor-tesla", kind: "boat", from: "welcome", to: "tesla", departure: harborBoarding, arrival: garageBoarding, duration: 5 },
  { id: "tesla-harbor", kind: "boat", from: "tesla", to: "welcome", departure: garageBoarding, arrival: harborBoarding, duration: 5 },
  { id: "workshop-launch", kind: "cannon", from: "projects", to: "skills", departure: onTerritory("projects", 18, 14), arrival: { ...getIsland("skills").entrance }, duration: 3.4 },
  { id: "laboratory-glide", kind: "parachute", from: "skills", to: "projects", departure: onTerritory("skills", 9, 10), arrival: onTerritory("projects", 15, 14), duration: 4.2 },
];
/** Actual horizontal boat trajectory, shared with rendering and sea-clearance QA. */
export function getBoatRoutePoint(route: TravelRoute, fraction: number): WorldPoint {
  const t = Math.max(0, Math.min(1, fraction)), eased = t * t * (3 - 2 * t);
  return { x: route.departure.x + (route.arrival.x - route.departure.x) * eased,
    z: route.departure.z + (route.arrival.z - route.departure.z) * eased + Math.sin(Math.PI * t) * 13 };
}
export const SPAWN = { ...AREAS[0].entrance };
export function getIsland(id: IslandId): Island { return AREAS.find((area) => area.id === id)!; }
export function getArrival(id: IslandId): WorldPoint { return { ...getIsland(id).entrance }; }
export function getTerritory(id: TerritoryId): TerrainIsland { return TERRITORIES.find((territory) => territory.id === id)!; }
function physical(island: TerrainIsland | Island): TerrainIsland { return "territory" in island ? getTerritory(island.territory) : island; }
export function getIslandLandmark(island: Island): WorldPoint { return { x: island.x, z: island.z - 3 }; }
/** The unscaled house master uses Blender XY → world XZ (X,-Y), Z → world Y. */
export const HOME_STUDIO_DECK: WorldSupportDeck = {
  id: "about-home-studio-deck", island: "about", territory: "main", ...getIslandLandmark(getIsland("about")),
  width: 12, depth: 8, thickness: 0.24, top: getIsland("about").elevation + 0.06, yaw: 0,
};
/** Digital workshop's unscaled deck; its source contract uses local glTF XZ. */
export const DIGITAL_WORKSHOP_DECK: WorldSupportDeck = {
  id: "workshop-deck", island: "projects", territory: "projects", ...getIslandLandmark(getIsland("projects")),
  width: 30, depth: 24, thickness: 0.24, top: getIsland("projects").elevation + 0.06, yaw: 0,
};
/** Archive platea is structural support on the existing ridge, not new land. */
export const ARCHIVE_OBSERVATORY_DECK: WorldSupportDeck = {
  id: "archive-deck", island: "education", territory: "ridge", ...getIslandLandmark(getIsland("education")),
  width: 18, depth: 14, thickness: 0.24, top: getIsland("education").elevation + 0.06, yaw: 0,
};
/** Open mechanical deck over existing floating land; arrival remains terrain. */
export const SUSPENDED_LAB_DECK: WorldSupportDeck = {
  id: "lab-deck", island: "skills", territory: "skills", ...getIslandLandmark(getIsland("skills")),
  width: 20, depth: 16, thickness: 0.24, top: getIsland("skills").elevation + 0.06, yaw: 0,
};
/** Lateral harbor kiosk; the existing spawn plaza and both docks stay terrain-owned. */
export const WELCOME_HARBOR_DECK: WorldSupportDeck = {
  id: "welcome-harbor-deck", island: "welcome", territory: "main", x: -13, z: 70,
  width: 6.2, depth: 4.2, thickness: 0.24, top: getIsland("welcome").elevation + 0.06, yaw: 0,
};
/** Unscaled pavilion floor replaces the native stage, not the coastal terrain. */
export const DANCE_PAVILION_DECK: WorldSupportDeck = {
  id: "dance-pavilion-deck", island: "dance", territory: "dance", ...getIslandLandmark(getIsland("dance")),
  width: 22, depth: 16, thickness: 0.24, top: getIsland("dance").elevation + 0.06, yaw: 0,
};
/** Only the small radio hut has a floor; the tower root is a separate anchor. */
export const CONTACT_LIGHTHOUSE_DECK: WorldSupportDeck = {
  id: "contact-radio-hut-deck", island: "contact", territory: "main",
  x: getIslandLandmark(getIsland("contact")).x - 5.2, z: getIslandLandmark(getIsland("contact")).z + 2.7,
  width: 6.6, depth: 4.6, thickness: 0.24, top: getIsland("contact").elevation + 0.06, yaw: 0,
};
/** Structure over shared land/coast, deliberately not a seventh terrain island. */
export const WORLD_SUPPORT_DECKS: readonly WorldSupportDeck[] = [HOME_STUDIO_DECK, DIGITAL_WORKSHOP_DECK, ARCHIVE_OBSERVATORY_DECK, SUSPENDED_LAB_DECK, WELCOME_HARBOR_DECK, DANCE_PAVILION_DECK, CONTACT_LIGHTHOUSE_DECK];
/** Mirrored from harbor-contract-v1.json; +X opens toward the existing plaza. */
export const WELCOME_HARBOR = (() => {
  const deck = WELCOME_HARBOR_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number) =>
    hulls.push({ id, island: "welcome", kind: "box", role, x: anchor.x + x, y: anchor.y + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  for (const [side, x] of [["back", -2.55], ["front", 2.55]] as const)
    for (const [end, z] of [["north", -1.5], ["south", 1.5]] as const)
      box(`harbor-post-${side}-${end}`, "post", x, z, .34, 3.65, .34);
  box("harbor-back-wall", "wall", -2.65, 0, .16, 2.65, 3.3);
  box("harbor-counter", "desk", -1.6, 0, .9, 1.1, 2.15);
  box("harbor-map-desk", "desk", 1.1, -.7, 1.2, 1.2, 1.4);
  box("harbor-crate", "furniture", -.15, -1.3, .65, .65, .65);
  for (const [id, role, x, z, radius, height, bottom] of [
    ["harbor-compass-mast", "machine", -2.85, -2.35, .105, 5.82, -.12],
    ["harbor-barrel", "furniture", -.2, 1.2, .4, 1, 0],
    ["harbor-pot", "furniture", -1.9, 1.65, .35, .8, 0],
  ] as const) hulls.push({ id, island: "welcome", kind: "cylinder", role, x: anchor.x + x,
    y: anchor.y + bottom + height / 2, z: anchor.z + z, width: radius * 2, depth: radius * 2, height, radius, yaw: 0 });
  return { island: "welcome" as const, root: "WelcomeHarbor_V1_Origin_At_Deck_Centre", sourceContract: "assets/archipelago/harbor-contract-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
export const HOME_STUDIO = (() => {
  const deck = HOME_STUDIO_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z };
  const hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, blenderY: number, width: number, height: number, depth: number) =>
    hulls.push({ id: `about-${id}`, island: "about", kind: "box", role, x: anchor.x + x, y: anchor.y + height / 2,
      z: anchor.z - blenderY, width, height, depth, yaw: 0 });
  for (const [row, blenderY, height] of [["front", 0.9, 4.2], ["rear", 3.6, 5.26]] as const)
    [-5.45, -0.97, 3.5].forEach((x, index) => box(`house-post-${row}-${index}`, "post", x, blenderY, 0.34, height, 0.34));
  for (const [index, [x, blenderY, height]] of [[3.55, 2.6, 4.6], [5.64, 2.05, 4.15], [5.64, -1.25, 3.55], [3.55, 0.38, 4.09]].entries())
    box(`awning-post-${index}`, "post", x, blenderY, 0.25, height, 0.25);
  box("back-wall", "wall", -0.98, 3.65, 9.3, 4.7, 0.17);
  box("desk-0", "desk", -2, 0, 4.22, 1.23, 1.34);
  box("bookshelf", "furniture", -3.89, 3.26, 1.9, 3.7, 0.72);
  box("office-chair", "furniture", -3.55, -1.28, 1.08, 1.54, 1.03);
  box("reading-chair", "furniture", 4.65, 0.47, 1.3, 1.5, 1.2);
  box("side-table", "furniture", 5.15, -0.63, 0.83, 0.785, 0.63);
  // Pot positions are already local glTF XZ; collide only the pot, not foliage.
  for (const [index, [x, z, scale]] of [[-5.1, 2.89, 0.95], [5.18, -2.85, 0.96], [-5.19, -2.78, 0.73], [5.45, 2.72, 0.75], [1.9, -3.03, 0.7]].entries()) {
    const radius = 0.41 * scale, height = 0.66 * scale;
    hulls.push({ id: `about-pot-${index}`, island: "about", kind: "cylinder", role: "furniture", x: anchor.x + x,
      y: anchor.y + height / 2, z: anchor.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
  }
  return { island: "about" as const, anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
function pointOnSupportDeck(deck: WorldSupportDeck, x: number, z: number, inset: number) {
  const dx = x - deck.x, dz = z - deck.z, cosine = Math.cos(deck.yaw), sine = Math.sin(deck.yaw);
  return Math.abs(dx * cosine - dz * sine) <= deck.width / 2 - inset
    && Math.abs(dx * sine + dz * cosine) <= deck.depth / 2 - inset;
}
export function supportDeckAt(x: number, z: number, inset = 0): WorldSupportDeck | undefined {
  return WORLD_SUPPORT_DECKS.find((deck) => pointOnSupportDeck(deck, x, z, inset));
}
/** Elliptical, asymmetric silhouettes retain a single continuous top mesh. */
export function getShoreRadius(value: TerrainIsland | Island, angle: number): number {
  const island = physical(value), phase = TERRITORIES.findIndex((entry) => entry.id === island.id) * 0.79;
  const ellipse = 1 / Math.hypot(Math.cos(angle) / (island.stretchX ?? 1), Math.sin(angle) / (island.stretchZ ?? 1));
  return island.radius * ellipse * (1.07 + 0.075 * Math.sin(angle * 3 + phase) + 0.045 * Math.cos(angle * 5 - phase * 0.6) + 0.03 * Math.sin(angle * 2 - phase));
}
export const WORLD_BOUNDS = {
  minX: Math.min(...TERRITORIES.map((a) => a.x - a.radius * (a.stretchX ?? 1) * 1.23)) - 5,
  maxX: Math.max(...TERRITORIES.map((a) => a.x + a.radius * (a.stretchX ?? 1) * 1.23)) + 5,
  minZ: Math.min(...TERRITORIES.map((a) => a.z - a.radius * (a.stretchZ ?? 1) * 1.23)) - 5,
  maxZ: Math.max(...TERRITORIES.map((a) => a.z + a.radius * (a.stretchZ ?? 1) * 1.23)) + 5,
};
export function territoryAt(x: number, z: number, inset = 0.45): TerrainIsland | undefined {
  return TERRITORIES.find((a) => Math.hypot(x - a.x, z - a.z) <= getShoreRadius(a, Math.atan2(z - a.z, x - a.x)) - inset);
}
export function islandAt(x: number, z: number): Island | undefined {
  const deck = supportDeckAt(x, z); if (deck) return getIsland(deck.island);
  const territory = territoryAt(x, z);
  if (!territory) {
    const dock = BOAT_DOCKS.find((entry) => dockFraction(entry, x, z) !== undefined);
    return dock ? getIsland(dock.area) : undefined;
  }
  const areas = AREAS.filter((area) => area.territory === territory.id);
  return areas.reduce((closest, area) => Math.hypot(x - area.x, z - area.z) / area.radius < Math.hypot(x - closest.x, z - closest.z) / closest.radius ? area : closest);
}
function distanceToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
export function isWalkable(x: number, z: number): boolean {
  if (supportDeckAt(x, z, 0.34)) return true;
  if (territoryAt(x, z)) return true;
  if (BOAT_DOCKS.some((dock) => dockFraction(dock, x, z) !== undefined)) return true;
  return BRIDGES.some(([a, b]) => { const { start, end } = getBridgeProfile(a, b); return distanceToSegment(x, z, start.x, start.z, end.x, end.z) < BRIDGE_WIDTH / 2 - 0.3; });
}
const stationOffsets: Record<PortfolioIslandId, readonly (readonly [number, number])[]> = {
  about: [[-2, -3]], projects: [[-9, -1], [-5, -7], [2, -7], [9, -5], [10, 3]],
  skills: [[-7, -2], [-6, -9], [6, -9], [7, -2], [0, 3]], experience: [[-5, -3], [5, 5]],
  education: [[-5, 0], [0, 0], [5, 0]], tesla: [[0, -1], [-6, -3]], dance: [[-7, 2], [7, 2]], contact: [[-5, 0.5]],
};
/** Low exhibit objects replace tall text boards. */
export const WORLD_STATIONS: readonly WorldStation[] = AREAS.flatMap((area) => area.id === "welcome" ? [] : stationOffsets[area.id].map(([dx, dz], index) => ({
  id: `${area.id}-${index}`, island: area.id as PortfolioIslandId, index, x: area.x + dx, z: area.z + dz, yaw: 0,
  width: area.id === "about" ? 4.22 : area.id === "tesla" && index === 0 ? 2.5 : area.id === "projects" ? 4.4 : 3,
  height: area.id === "about" ? 1.23 : 1.3, depth: area.id === "about" ? 1.34 : 1.35, approachDistance: area.id === "tesla" && index === 0 ? 5 : 3.1,
})));
export function getStationApproach(station: WorldStation): WorldPoint { return { x: station.x + Math.sin(station.yaw) * station.approachDistance, z: station.z + Math.cos(station.yaw) * station.approachDistance }; }
/** Mirrored from the evaluated Blender proposal; only hard geometry is solid. */
export const DANCE_PAVILION = (() => {
  const deck = DANCE_PAVILION_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number) =>
    hulls.push({ id, island: "dance", kind: "box", role, x: anchor.x + x, y: anchor.y + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  const cylinder = (id: string, x: number, z: number, radius: number, height: number) =>
    hulls.push({ id, island: "dance", kind: "cylinder", role: "furniture", x: anchor.x + x, y: anchor.y + height / 2,
      z: anchor.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
  for (const [side, x] of [["west", -10.75], ["east", 10.75]] as const)
    [-7.75, -2.6, 2.6, 7.75].forEach((z, index) => box(`post_${side}_${index}`, "post", x, z, .5, 5.3, .5));
  for (const [side, x] of [["west", -5.35], ["east", 5.35]] as const)
    box(`rear_bench_${side}`, "furniture", x, -6.48, 3.7, 1.4, 1.35);
  for (const [side, x] of [["west", -9.1], ["east", 9.1]] as const)
    box(`side_bench_${side}`, "furniture", x, -.5, 1.35, 1.4, 3.7);
  [[-2.6, -6.36], [2.6, -6.36], [-9.08, -3.5], [9.08, -3.5]].forEach(([x, z], index) =>
    cylinder(`side_table_${index}`, x, z, .44, .75));
  [[-9.6, -6.5], [9.6, -6.5], [-8.3, -4.65], [8.3, -4.65], [-9.65, 2.8], [9.65, 2.8], [-9.6, 6.45], [9.6, 6.45]]
    .forEach(([x, z], index) => cylinder(`terracotta_planter_${index}`, x, z, .445, .84));
  box("dance_athlete_consultation", "desk", -7, 5, 3, 1.3, 1.35);
  box("dance_teacher_consultation", "desk", 7, 5, 3, 1.3, 1.35);
  for (const side of [-1, 1]) box(`rear_herb_trough_${side}`, "furniture", side * 5.3, -7.42, 8.15, .38, .54);
  return { island: "dance" as const, root: "DancePavilion_V1_Origin_At_Deck_Centre", sourceContract: "assets/archipelago/dance-contract-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
/** Contact's local proposal is mirrored once; no tower-wide walking slab. */
export const CONTACT_LIGHTHOUSE = (() => {
  const deck = CONTACT_LIGHTHOUSE_DECK, anchor = { ...getIslandLandmark(getIsland("contact")), y: deck.top }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number, bottom = 0) =>
    hulls.push({ id, island: "contact", kind: "box", role, x: anchor.x + x, y: anchor.y + bottom + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  hulls.push({ id: "contact-lighthouse-tower", island: "contact", kind: "cylinder", role: "tower", x: anchor.x,
    y: anchor.y - .12 + 13.12 / 2, z: anchor.z, width: 4.8, height: 13.12, depth: 4.8, radius: 2.4, yaw: 0 });
  for (const [id, x, z] of [["back-west", -8.15, .65], ["front-west", -8.15, 4.75], ["front-east", -2.25, 4.75]] as const)
    box(`contact-hut-post-${id}`, "post", x, z, .4, 3.5, .4);
  box("contact-hut-back-wall", "wall", -5.2, .64, 6.12, 3.06, .22);
  box("contact-hut-west-wall", "wall", -8.26, 2.1, .2, 2.95, 2.78);
  box("contact-hut-east-wall", "wall", -2.15, 2.1, .2, 2.5, 2.64);
  box("contact-radio-desk", "desk", -5, 3.5, 3, 1.3, 1.35);
  box("contact-rear-console", "furniture", -5.2, 1.05, 3.8, .9, .78);
  box("contact-bookcase-west", "furniture", -7.65, 1.14, .7, 2.45, .72);
  box("contact-bookcase-east", "furniture", -2.8, 1.35, .65, 2.3, .9);
  for (const [id, x, z, radius, height] of [["west-front", -8.1, 3.95, .28, .64], ["west-rear", -8.1, 1.05, .24, .58], ["east-front", -2.18, 3.88, .24, .58]] as const)
    hulls.push({ id: `contact-pot-${id}`, island: "contact", kind: "cylinder", role: "furniture", x: anchor.x + x,
      y: anchor.y + height / 2, z: anchor.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
  box("contact-hut-footing-west", "foundation", -8.375, 2.7, .25, .26, 4.6, -.5);
  box("contact-hut-footing-east", "foundation", -2.025, 2.7, .25, .26, 4.6, -.5);
  box("contact-hut-footing-back", "foundation", -5.2, .525, 6.1, .26, .25, -.5);
  box("contact-hut-footing-front", "foundation", -5.2, 4.875, 6.1, .26, .25, -.5);
  return { island: "contact" as const, root: "ContactLighthouse_V1_Origin_At_Tower_Base", sourceContract: "assets/archipelago/contact-proposed-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
/** Mirrored from assets/archipelago/workshop-contract-v1.json; QA checks parity. */
export const WORKSHOP = (() => {
  const deck = DIGITAL_WORKSHOP_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number, bottom = 0) =>
    hulls.push({ id, island: "projects", kind: "box", role, x: anchor.x + x, y: anchor.y + bottom + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  for (const [index, [x, height]] of [[-13.8, 6.4], [-6.9, 8.1], [0, 9.4], [6.9, 8.2], [13.8, 6.6]].entries())
    box(`workshop-post-back-${index}`, "post", x, -10.8, 0.54, height, 0.54);
  for (const [side, x, middleHeight, frontHeight] of [["left", -13.8, 6.2, 5.2], ["right", 13.8, 6.3, 5.4]] as const) {
    box(`workshop-post-${side}-middle`, "post", x, -3, 0.54, middleHeight, 0.54);
    box(`workshop-post-${side}-front`, "post", x, 9.8, 0.54, frontHeight, 0.54);
  }
  for (const [side, x] of [["left", -7.5], ["right", 7.5]] as const)
    box(`workshop-wall-back-${side}`, "wall", x, -11.2, 10, 3.3, 0.2, 0.08);
  for (const station of WORLD_STATIONS.filter((entry) => entry.island === "projects"))
    box(`${station.id}-station`, "furniture", station.x - anchor.x, station.z - anchor.z, station.width, station.height, station.depth);
  for (const [side, x] of [["left", -9], ["right", 9]] as const)
    box(`workshop-library-${side}`, "furniture", x, -10.1, 3.8, 3.3, 0.72, 0.08);
  for (const [index, [x, z]] of [[-10.5, 3.4], [-6.5, -2.6], [3.5, -2.6], [10.5, -0.6], [11.5, 7.4]].entries())
    box(`workshop-stool-${index}`, "furniture", x, z, 0.84, 0.95, 0.84);
  for (const [end, z] of [["back", -9], ["front", 8]] as const) for (const [side, x] of [["left", -13], ["right", 13]] as const)
    hulls.push({ id: `workshop-pot-${end}-${side}`, island: "projects", kind: "cylinder", role: "furniture", x: anchor.x + x,
      y: anchor.y + 0.4, z: anchor.z + z, width: 0.9, height: 0.8, depth: 0.9, radius: 0.45, yaw: 0 });
  return { island: "projects" as const, root: "DigitalWorkshop_V1_Origin_At_Deck_Centre", sourceContract: "assets/archipelago/workshop-contract-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
export const ARCHIVE_OBSERVATORY = (() => {
  const deck = ARCHIVE_OBSERVATORY_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number, bottom = 0) =>
    hulls.push({ id, island: "education", kind: "box", role, x: anchor.x + x, y: anchor.y + bottom + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  hulls.push({ id: "archive-observatory", island: "education", kind: "cylinder", role: "tower", x: anchor.x + 4,
    y: anchor.y + 3.6, z: anchor.z - 2.7, width: 7.4, height: 7.2, depth: 7.4, radius: 3.7, yaw: 0 });
  for (const [row, z, height] of [["back", -5.75, 5], ["front", -0.75, 4.1]] as const)
    [-8.1, -4.15, -0.2].forEach((x, index) => box(`archive-post-${row}-${index}`, "post", x, z, 0.4, height, 0.4));
  box("archive-back-wall", "wall", -4.15, -6.15, 8.3, 4.8, 0.35);
  for (const [side, x] of [["left", -6.3], ["right", -2.08]] as const)
    box(`archive-bookcase-${side}`, "furniture", x, -5.57, 3.6, 3.85, 0.8, 0.08);
  for (const station of WORLD_STATIONS.filter((entry) => entry.island === "education"))
    box(`${station.id}-station`, "desk", station.x - anchor.x, station.z - anchor.z, station.width, station.height, station.depth);
  for (const [index, x] of [-6.2, -1.2, 6.2].entries()) box(`archive-stool-${index}`, "furniture", x, 4.3, 0.68, 0.85, 0.68);
  for (const [name, x, z, radius, height] of [
    ["front-left", -8.1, 5.4, 0.45, 0.8], ["front-right", 8.1, 5.4, 0.45, 0.8], ["back-right", 8.1, -5.5, 0.45, 0.8],
    ["library-side", -8.15, -3.2, 0.45, 0.8], ["tower-front", 2.35, 0.95, 0.34, 0.61],
  ] as const) hulls.push({ id: `archive-pot-${name}`, island: "education", kind: "cylinder", role: "furniture", x: anchor.x + x,
    y: anchor.y + height / 2, z: anchor.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
  box("archive-awning-right-post", "post", 8.15, 1.45, 0.28, 4, 0.28);
  return { island: "education" as const, root: "ArchiveObservatory_V1_Origin_At_Deck_Centre", sourceContract: "assets/archipelago/archive-contract-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
/** Lab's source contract mirrors authored supports, not its whole visual box. */
export const SUSPENDED_LAB = (() => {
  const deck = SUSPENDED_LAB_DECK, anchor = { x: deck.x, y: deck.top, z: deck.z }, hulls: WorldStructureHull[] = [];
  const box = (id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number) =>
    hulls.push({ id, island: "skills", kind: "box", role, x: anchor.x + x, y: anchor.y + height / 2,
      z: anchor.z + z, width, height, depth, yaw: 0 });
  for (const [name, x, z, height] of [
    ["back-left", -9.1, -7, 6.8], ["back-mid-left", -4.5, -7, 7.7], ["back-mid-right", 4.5, -7, 7.2], ["back-right", 9.1, -7, 7.8],
    ["left-middle", -9.1, -2, 5.2], ["right-middle", 9.1, -2, 5.4], ["left-front", -9.1, 6.7, 4.4], ["right-front", 9.1, 6.7, 4.4],
  ] as const) box(`lab-post-${name}`, "post", x, z, .46, height, .46);
  for (const station of WORLD_STATIONS.filter(entry => entry.island === "skills"))
    box(`${station.id}-station`, "desk", station.x - anchor.x, station.z - anchor.z, station.width, 1.3, station.depth);
  for (const [id, role, x, z, radius, height] of [
    ["skills-machine", "machine", 0, -2.9, 3.2, 3.2], ["lab-rear-technical-mast", "machine", -3.65, -6.55, .85, 7],
    ["lab-pot-front-left", "furniture", -9, 5.2, .45, .8], ["lab-pot-back-left", "furniture", -9, -5.5, .45, .8],
    ["lab-pot-middle-right", "furniture", 9, -4.5, .45, .8],
  ] as const) hulls.push({ id, island: "skills", kind: "cylinder", role, x: anchor.x + x, y: anchor.y + height / 2,
    z: anchor.z + z, width: radius * 2, height, depth: radius * 2, radius, yaw: 0 });
  for (const [index, [x, z]] of [[-8.15, 2.4], [-7.15, -4.6], [7.15, -4.6], [8.2, 2.4]].entries())
    box(`lab-stool-${index}`, "furniture", x, z, .68, .86, .68);
  return { island: "skills" as const, root: "SuspendedLab_V1_Origin_At_Deck_Centre", sourceContract: "assets/archipelago/laboratory-contract-v1.json",
    anchor, deck, hulls: hulls as readonly WorldStructureHull[] };
})();
export const ARCHITECTURE: Partial<Record<IslandId, { width: number; depth: number; height: number }>> = {
  about: { width: 14, depth: 10, height: 4.3 }, projects: { width: 30, depth: 24, height: 6.4 }, skills: { width: 20, depth: 13, height: 5.3 },
  education: { width: 18, depth: 14, height: 5.2 }, tesla: { width: 19, depth: 12, height: 5.8 }, dance: { width: 22, depth: 16, height: 5.3 },
};
const smooth = (a: number, b: number, value: number) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
/** Planar shore landings only: no terrain queries, so height sampling cannot recurse. */
function bridgeLandings(from: IslandId, to: IslandId) {
  const a = getIsland(from), b = getIsland(to), dx = b.x - a.x, dz = b.z - a.z, distance = Math.hypot(dx, dz), ux = dx / distance, uz = dz / distance;
  const exit = (area: Island, direction: number) => {
    const terrain = getTerritory(area.territory); let lo = 0, hi = terrain.radius * Math.max(terrain.stretchX ?? 1, terrain.stretchZ ?? 1) * 3;
    for (let i = 0; i < 32; i++) { const t = (lo + hi) / 2, x = area.x + ux * t * direction, z = area.z + uz * t * direction;
      if (Math.hypot(x - terrain.x, z - terrain.z) < getShoreRadius(terrain, Math.atan2(z - terrain.z, x - terrain.x)) - 2.1) lo = t; else hi = t; }
    return { x: area.x + ux * lo * direction, y: 0, z: area.z + uz * lo * direction };
  };
  return { start: exit(a, 1), end: exit(b, -1), yaw: Math.atan2(ux, uz) };
}
const landingApproaches = BRIDGES.flatMap(([from, to]) => {
  const { start, end } = bridgeLandings(from, to);
  return [{ area: getIsland(from), shore: start }, { area: getIsland(to), shore: end }];
});
function terrainSample(island: TerrainIsland, x: number, z: number): number {
  const dx = x - island.x, dz = z - island.z, angle = Math.atan2(dz, dx), edge = Math.hypot(dx, dz) / getShoreRadius(island, angle);
  const phase = TERRITORIES.findIndex((a) => a.id === island.id) * 0.79;
  const shore = island.floating ? island.elevation - 1.7 : WATER_LEVEL + .55 + Math.sin(angle * 3 + phase) * .12 + Math.sin(angle * 7 - phase) * .05;
  // Begin the normal land's descent sooner instead of keeping a flat crown
  // until its last few metres. Skills retains the original suspended profile.
  let height = shore + (island.elevation - shore) * (1 - smooth(island.floating ? .65 : .5, 1, edge));
  height += ((island.floating ? 2.2 : .8) * Math.exp(-((dx / island.radius + 0.1) ** 2 / 0.2 + (dz / island.radius + 0.48) ** 2 / 0.25)) + Math.sin(dx * 0.15 + phase) * Math.cos(dz * 0.12) * (island.floating ? .35 : .16)) * (1 - smooth(0.65, 0.98, edge));
  // NATURAL_HARBOR_SHOULDER_START
  // The small lateral kiosk already stands on terrain, not a new clearing.
  // Keep the former gentle crown immediately below it while feathering back
  // into the earlier coastal descent. This preserves its shallow floor step
  // without a raised rectangular pad, a new support, or a shifted shoreline.
  if (island.id === "main") {
    const kioskDistance = Math.hypot(x - WELCOME_HARBOR_DECK.x, z - WELCOME_HARBOR_DECK.z);
    height += (island.elevation - shore) * (smooth(.5, 1, edge) - smooth(.65, 1, edge))
      * (1 - smooth(4, 9, kioskDistance));
  }
  // NATURAL_HARBOR_SHOULDER_END
  for (const area of AREAS.filter((a) => a.territory === island.id)) {
    const architecture = ARCHITECTURE[area.id], anchor = getIslandLandmark(area);
    const innerX = architecture ? architecture.width / 2 + 0.9 : area.id === "contact" ? 6.5 : 5;
    const innerZ = architecture ? architecture.depth / 2 + 1.1 : area.id === "contact" ? 5 : 6;
    const distance = Math.hypot(Math.max(0, Math.abs(x - anchor.x) - innerX), Math.max(0, Math.abs(z - anchor.z) - innerZ));
    // Feather the archive's larger floor into the shared ridge corridor.
    // The outer coast is lowered separately by coastBlend below.
    let clearing = 1 - smooth(0, 5, distance);
    if (area.id === "education") {
      const previousDistance = Math.hypot(Math.max(0, Math.abs(x - anchor.x) - (15 / 2 + 0.9)),
        Math.max(0, Math.abs(z - anchor.z) - (11 / 2 + 1.1)));
      const previousClearing = 1 - smooth(0, 5, previousDistance);
      clearing = previousClearing + (clearing - previousClearing) * (1 - smooth(0.8, 0.88, edge));
    }
    // Inhabited clearings must not lift the whole shoreline into vertical walls.
    // Keep the inner floor; blend its shoulders into a real low sandy coast.
    // The studio's front door keeps its existing terrain apron. Elsewhere the
    // clearing feather begins farther inland, so the coast is a broad shoulder
    // rather than a narrow bank around a level platform. The exact rim is zero.
    const coastBlend = island.floating ? 1 : 1 - smooth(area.id === "about" ? .75 : .55, 1, edge);
    height += (area.elevation - height) * clearing * coastBlend;
    height += (area.elevation - height) * (1 - smooth(2.4, 9, Math.hypot(x - area.entrance.x, z - area.entrance.z))) * coastBlend;
  }
  // NATURAL_APPROACH_START: real shared walking ramps, not decorative overlays.
  // Narrow ridge shoulders otherwise exceed the unchanged 45-degree controller
  // limit. Ease each actual bridge approach into its arrival without lifting
  // the coastline, moving a route, or adding an invisible support surface.
  if (!island.floating) for (const { area, shore } of landingApproaches) {
    if (area.territory !== island.id) continue;
    const vx = area.entrance.x - shore.x, vz = area.entrance.z - shore.z, lengthSquared = vx * vx + vz * vz;
    const t = Math.max(0, Math.min(1, ((x - shore.x) * vx + (z - shore.z) * vz) / lengthSquared));
    const distance = Math.hypot(x - shore.x - vx * t, z - shore.z - vz * t);
    let mask = (1 - smooth(BRIDGE_WIDTH / 2 + .8, BRIDGE_WIDTH / 2 + (island.id === "ridge" ? 3.3 : 6.5), distance)) * (1 - smooth(.95, 1, edge));
    // Keep each structural floor's existing flat apron. A crossing coastal
    // approach must not dig a metre-deep trench against a six-centimetre step.
    for (const deck of WORLD_SUPPORT_DECKS) {
      // Dance and the small Contact hut retain their original native aprons.
      // Their new support decks must not reshape any shared terrain vertex.
      if (deck.territory !== island.id || deck.island === "dance" || deck.island === "contact") continue;
      const deckDistance = Math.hypot(Math.max(0, Math.abs(x - deck.x) - deck.width / 2), Math.max(0, Math.abs(z - deck.z) - deck.depth / 2));
      // The ridge bridge passes outside the archive's south-west corner.
      // Its narrower apron must not restore a steep original shoulder across
      // that approach. Workshop crossings need the broader flat floor collar.
      mask *= deck.island === "education" ? smooth(.4, 1.5, deckDistance) : smooth(1.2, 8, deckDistance);
    }
    for (const place of AREAS) {
      if (place.territory !== island.id || WORLD_SUPPORT_DECKS.some(deck => deck.island === place.id && place.id !== "dance" && place.id !== "contact")) continue;
      const size = ARCHITECTURE[place.id];
      if (!size && place.id !== "contact") continue;
      const anchor = getIslandLandmark(place);
      const nativeDistance = Math.hypot(Math.max(0, Math.abs(x - anchor.x) - (size ? size.width / 2 : 6.5)),
        Math.max(0, Math.abs(z - anchor.z) - (size ? size.depth / 2 : 5)));
      // Procedural buildings/tower/desks also stand on actual flat ground;
      // a lowered path cannot tunnel beneath a still-solid lighthouse.
      mask *= smooth(.6, 4.5, nativeDistance);
    }
    const ramp = WATER_LEVEL + 1.25 + (area.elevation - WATER_LEVEL - 1.25) * smooth(0, 1, t);
    height += (ramp - height) * mask;
  }
  // NATURAL_RIDGE_TERRACE_START: the existing last walking segment, not a new path.
  if (island.id === "ridge") {
    const from = onTerritory("ridge", -13, 35), to = getArrival("education");
    const vx = to.x - from.x, vz = to.z - from.z;
    const along = ((x - from.x) * vx + (z - from.z) * vz) / (vx * vx + vz * vz);
    const t = Math.max(0, Math.min(1, along));
    const distance = distanceToSegment(x, z, from.x, from.z, to.x, to.z);
    const deck = ARCHIVE_OBSERVATORY_DECK;
    const deckDistance = Math.hypot(Math.max(0, Math.abs(x - deck.x) - deck.width / 2),
      Math.max(0, Math.abs(z - deck.z) - deck.depth / 2));
    // Ease the shoreward corridor into the archive entrance without changing
    // its XZ itinerary, touching the sea rim, or digging beneath the deck apron.
    // This also removes the triangle-sized transverse kink that a capsule
    // otherwise meets after broadening the surrounding coastal shoulders.
    const mask = (1 - smooth(2.1, 6.5, distance)) * (1 - smooth(.95, 1, edge))
      * smooth(.6, 2, deckDistance) * smooth(-.4, 0, along);
    const terrace = WATER_LEVEL + 2.8 + (getIsland("education").elevation - WATER_LEVEL - 2.8) * smooth(0, 1, t);
    height += (terrace - height) * mask;
  }
  // NATURAL_RIDGE_TERRACE_END
  // NATURAL_APPROACH_END
  return height;
}
const terrainMeshes = new Map<TerritoryId, WorldMesh>();
export function getTerrainMesh(value: TerrainIsland | Island): WorldMesh {
  const island = physical(value), cached = terrainMeshes.get(island.id); if (cached) return cached;
  const vertices: number[] = [island.x, terrainSample(island, island.x, island.z), island.z], indices: number[] = [];
  const sectors = TERRAIN_ANGULAR_SEGMENTS, rings = TERRAIN_RADIAL_SEGMENTS;
  for (let ring = 1; ring <= rings; ring++) for (let sector = 0; sector < sectors; sector++) {
    const angle = sector / sectors * Math.PI * 2, radius = getShoreRadius(island, angle) * ring / rings;
    const x = island.x + Math.cos(angle) * radius, z = island.z + Math.sin(angle) * radius; vertices.push(x, terrainSample(island, x, z), z);
    const next = (sector + 1) % sectors;
    if (ring === 1) indices.push(0, 1 + next, 1 + sector);
    else { const a = 1 + (ring - 2) * sectors + sector, b = 1 + (ring - 2) * sectors + next, c = 1 + (ring - 1) * sectors + sector, d = 1 + (ring - 1) * sectors + next; indices.push(a, b, c, b, d, c); }
  }
  const mesh = { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) }; terrainMeshes.set(island.id, mesh); return mesh;
}
function triangleHeight(mesh: WorldMesh, a: number, b: number, c: number, x: number, z: number) {
  const v = mesh.vertices, ax = v[a * 3], az = v[a * 3 + 2], bx = v[b * 3], bz = v[b * 3 + 2], cx = v[c * 3], cz = v[c * 3 + 2];
  const denominator = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / denominator, w = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / denominator;
  if (u < -0.00001 || w < -0.00001 || u + w > 1.00001) return undefined;
  return u * v[a * 3 + 1] + w * v[b * 3 + 1] + (1 - u - w) * v[c * 3 + 1];
}
export function getTerrainHeight(x: number, z: number): number {
  const island = territoryAt(x, z, -0.025); if (!island) return WATER_LEVEL - 2;
  const sectors = TERRAIN_ANGULAR_SEGMENTS, rings = TERRAIN_RADIAL_SEGMENTS, angle = (Math.atan2(z - island.z, x - island.x) + Math.PI * 2) % (Math.PI * 2);
  const sector = Math.floor(angle / (Math.PI * 2) * sectors) % sectors, next = (sector + 1) % sectors;
  const ring = Math.floor(Math.hypot(x - island.x, z - island.z) / getShoreRadius(island, angle) * rings), mesh = getTerrainMesh(island);
  for (let row = Math.max(0, ring - 1); row <= Math.min(rings - 1, ring + 1); row++) {
    if (row === 0) { const height = triangleHeight(mesh, 0, 1 + next, 1 + sector, x, z); if (height !== undefined) return height; }
    else { const a = 1 + (row - 1) * sectors + sector, b = 1 + (row - 1) * sectors + next, c = 1 + row * sectors + sector, d = 1 + row * sectors + next;
      const height = triangleHeight(mesh, a, b, c, x, z) ?? triangleHeight(mesh, b, d, c, x, z); if (height !== undefined) return height; }
  }
  return terrainSample(island, x, z);
}
/** Absolute world-space hulls; art renders these same walls, posts, desks and machinery. */
export const WORLD_STRUCTURE_HULLS: readonly WorldStructureHull[] = (() => {
  const hulls: WorldStructureHull[] = [];
  const box = (area: Island, id: string, role: WorldStructureHull["role"], x: number, z: number, width: number, height: number, depth: number) => {
    // Coastal pavilion posts reach the real ground; retain the roof height
    // instead of leaving a short post hanging above a sloping beach.
    const bottom = role === "post" ? Math.min(area.elevation, getTerrainHeight(x, z)) : area.elevation;
    const solidHeight = height + area.elevation - bottom;
    hulls.push({ id: `${area.id}-${id}`, island: area.id, kind: "box", role, x, y: bottom + solidHeight / 2, z, width, height: solidHeight, depth, yaw: 0 });
  };
  for (const area of AREAS) {
    if (area.id === "welcome") { hulls.push(...WELCOME_HARBOR.hulls); continue; }
    if (area.id === "about") { hulls.push(...HOME_STUDIO.hulls); continue; }
    if (area.id === "education") { hulls.push(...ARCHIVE_OBSERVATORY.hulls); continue; }
    if (area.id === "skills") { hulls.push(...SUSPENDED_LAB.hulls); continue; }
    if (area.id === "dance") { hulls.push(...DANCE_PAVILION.hulls); continue; }
    if (area.id === "contact") { hulls.push(...CONTACT_LIGHTHOUSE.hulls); continue; }
    if (area.id === "projects") {
      hulls.push(...WORKSHOP.hulls);
      // The guided cannon remains outside the imported workshop aggregate.
      const launch = TRAVEL_ROUTES.find((route) => route.kind === "cannon")!.departure;
      hulls.push({ id: "projects-cannon", island: area.id, kind: "cylinder", role: "machine", x: launch.x + 2.1,
        y: getTerrainHeight(launch.x, launch.z) + 1.6, z: launch.z - 0.7, width: 3.2, height: 3.2, depth: 3.2, radius: 1.6, yaw: 0 });
      continue;
    }
    const architecture = ARCHITECTURE[area.id], anchor = getIslandLandmark(area);
    if (architecture) {
      const { width, depth, height } = architecture;
      for (const side of [-1, 1]) for (const end of [-1, 1]) box(area, `post-${side}-${end}`, "post", anchor.x + side * (width / 2 - 0.25), anchor.z + end * (depth / 2 - 0.25), 0.5, height, 0.5);
      box(area, "back-wall", "wall", anchor.x, anchor.z - depth / 2, width, height, 0.45);
    }
    for (const station of WORLD_STATIONS.filter((s) => s.island === area.id)) {
      if (area.id === "tesla" && station.index === 0) box(area, "car", "car", station.x, station.z, 2.5, 1.85, 4.73);
      else box(area, `desk-${station.index}`, "desk", station.x, station.z, station.width, 1.3, station.depth);
    }
  }
  return hulls;
})();
const bridgeProfiles = new Map<string, BridgeProfile>();
export function getBridgeProfile(from: IslandId, to: IslandId): BridgeProfile {
  const key = `${from}-${to}`, cached = bridgeProfiles.get(key); if (cached) return cached;
  const { start, end, yaw } = bridgeLandings(from, to);
  // Embed the first plank slightly into the shore. A raised thin triangle edge
  // makes a capsule lose grounded state before Rapier can perform its autostep.
  const landingHeight = (point: WorldPoint) => getTerrainHeight(point.x, point.z) - 0.06;
  start.y = landingHeight(start); end.y = landingHeight(end);
  const length = Math.hypot(end.x - start.x, end.z - start.z);
  // A low coast needs a low span, never the old 1.8m sag dipping into the sea.
  const sag = to === "dance" || from === "dance" ? -.7 : Math.max(0, Math.min(.65, length * .02, Math.min(start.y, end.y) - WATER_LEVEL - .7));
  const profile = { start, end, length, yaw, sag }; bridgeProfiles.set(key, profile); return profile;
}
export function getBridgePoint(from: IslandId, to: IslandId, fraction: number) {
  const { start, end, sag, length } = getBridgeProfile(from, to), t = Math.max(0, Math.min(1, fraction)), landing = Math.min(0.23, 5 / length);
  const hanging = smooth(landing * 0.6, landing * 1.6, t) * smooth(landing * 0.6, landing * 1.6, 1 - t);
  return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t - sag * 4 * t * (1 - t) * hanging, z: start.z + (end.z - start.z) * t };
}
export function getBridgeMesh(from: IslandId, to: IslandId): WorldMesh {
  const { yaw } = getBridgeProfile(from, to), vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 64; i++) { const p = getBridgePoint(from, to, i / 64);
    for (const side of [-1, 1]) vertices.push(p.x + Math.cos(yaw) * side * BRIDGE_WIDTH / 2, p.y, p.z - Math.sin(yaw) * side * BRIDGE_WIDTH / 2);
    if (i < 64) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
/** Retained API for the harbor jetty. */
const harborJetty = onTerritory("main", 0, 27);
export const CONTACT_DOCK = { ...harborJetty, width: 5, length: 7.5, top: getTerrainHeight(harborJetty.x, harborJetty.z) + 0.05 } as const;
export function isDockWalkable(x: number, z: number): boolean { return Math.abs(x - CONTACT_DOCK.x) < CONTACT_DOCK.width / 2 - 0.36 && Math.abs(z - CONTACT_DOCK.z) < CONTACT_DOCK.length / 2 - 0.36; }
export type BoatDock = { id: string; area: IslandId; start: { x: number; y: number; z: number }; end: { x: number; y: number; z: number }; width: number };
export const BOAT_DOCKS: readonly BoatDock[] = BOARDING_RAMPS.map((dock) => ({
  ...dock, start: { ...dock.start, y: getTerrainHeight(dock.start.x, dock.start.z) + 0.1 }, end: { ...dock.end, y: WATER_LEVEL + 1.3 }, width: 3.6,
}));
export function getDockPoint(dock: BoatDock, fraction: number) {
  const t = Math.max(0, Math.min(1, fraction)), slope = Math.max(0, (t - 0.32) / 0.68);
  return { x: dock.start.x + (dock.end.x - dock.start.x) * t, y: dock.start.y + (dock.end.y - dock.start.y) * slope, z: dock.start.z + (dock.end.z - dock.start.z) * t };
}
function dockFraction(dock: BoatDock, x: number, z: number) {
  const dx = dock.end.x - dock.start.x, dz = dock.end.z - dock.start.z;
  const t = ((x - dock.start.x) * dx + (z - dock.start.z) * dz) / (dx * dx + dz * dz);
  if (t < 0 || t > 1 || distanceToSegment(x, z, dock.start.x, dock.start.z, dock.end.x, dock.end.z) > dock.width / 2 - 0.36) return undefined;
  return t;
}
export function getDockMesh(dock: BoatDock): WorldMesh {
  const angle = Math.atan2(dock.end.x - dock.start.x, dock.end.z - dock.start.z), vertices: number[] = [], indices: number[] = [];
  for (let i = 0; i <= 50; i++) { const p = getDockPoint(dock, i / 50);
    for (const side of [-1, 1]) vertices.push(p.x + Math.cos(angle) * side * dock.width / 2, p.y, p.z - Math.sin(angle) * side * dock.width / 2);
    if (i < 50) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); } }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}
/** Shared walkable support, including timber above the ocean. */
export function getGroundHeight(x: number, z: number): number {
  let height = getTerrainHeight(x, z);
  const support = supportDeckAt(x, z); if (support) height = Math.max(height, support.top);
  if (isDockWalkable(x, z)) height = Math.max(height, CONTACT_DOCK.top);
  for (const dock of BOAT_DOCKS) { const t = dockFraction(dock, x, z); if (t !== undefined) height = Math.max(height, getDockPoint(dock, t).y); }
  for (const [from, to] of BRIDGES) { const { start, end, length } = getBridgeProfile(from, to);
    const t = ((x - start.x) * (end.x - start.x) + (z - start.z) * (end.z - start.z)) / (length * length);
    if (t >= 0 && t <= 1 && distanceToSegment(x, z, start.x, start.z, end.x, end.z) < BRIDGE_WIDTH / 2) height = Math.max(height, getBridgePoint(from, to, t).y); }
  return height;
}
/** Historical exclusion geometry ONLY: changing a walk must not reseed props. */
function getSeedConnectionPath(from: IslandId, to: IslandId): WorldPoint[] {
  if (from === "education" && to === "experience") return getSeedConnectionPath(to, from).reverse();
  if (from === "experience" && to === "education") return [getArrival(from), onTerritory("ridge", -13, 13), onTerritory("ridge", -13, 35), getArrival(to)];
  if (BRIDGES.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) {
    const { start, end } = getBridgeProfile(from, to); return [getArrival(from), start, end, getArrival(to)];
  }
  return [getArrival(from), getArrival(to)];
}
/** Actual ground approach around the pavilion, not through its west posts.
 * These points add no support and move neither bridge landing nor arrival.
 */
const DANCE_PEDESTRIAN_APPROACH: readonly WorldPoint[] = [{x: 69.8, z: 104}, {x: 70.2, z: 109.5}, {x: 77, z: 110.5}];
/** The radio hut blocks the old tower-slide chord. This real-ground northern
 * access clears the full3.5m path plus capsule, without moving either shore.
 */
const LIGHTHOUSE_DANCE_APPROACH: readonly WorldPoint[] = [{x: 15, z: 64}, {x: 23, z: 65}];
/** Authored pedestrian itinerary; also avoids the archive's rear wall. */
export function getConnectionPath(from: IslandId, to: IslandId): WorldPoint[] {
  const path = getSeedConnectionPath(from, to);
  if (to === "dance" && from === "welcome") return [path[0], ...LIGHTHOUSE_DANCE_APPROACH, ...path.slice(1, -1), ...DANCE_PEDESTRIAN_APPROACH, path[path.length - 1]];
  if (from === "dance" && to === "welcome") return [path[0], ...[...DANCE_PEDESTRIAN_APPROACH].reverse(), ...path.slice(1, -1), ...[...LIGHTHOUSE_DANCE_APPROACH].reverse(), path[path.length - 1]];
  return path;
}
function walkPaths(connectionPath: (from: IslandId, to: IslandId) => WorldPoint[]): readonly { from: WorldPoint; to: WorldPoint; width: number }[] { return [
  ...CONNECTIONS.filter((c) => c.kind === "walk" || c.kind === "bridge").flatMap((c) => {
    const points = connectionPath(c.from, c.to);
    return points.slice(1).map((to, index) => ({ from: points[index], to, width: c.from === "welcome" && c.to === "projects" ? 5.5 : 3.5 }));
  }),
  ...WORLD_STATIONS.map((station) => ({ from: getArrival(station.island), to: getStationApproach(station), width: 2.6 })),
  ...TRAVEL_ROUTES.map((route) => ({ from: getArrival(route.from), to: route.departure, width: 3 })),
  ...BOAT_DOCKS.map((dock) => ({ from: getArrival(dock.area), to: dock.start, width: 3.6 })),
]; }
/** Materials and vegetation must follow the real traversable access. */
export const WALK_PATHS = walkPaths(getConnectionPath);
/** Original rejection samples only; never used for art or player navigation. */
const SEEDED_PLACEMENT_PATHS = walkPaths(getSeedConnectionPath);
/** Only RNG uses the original two Contact solids. New hut walls/posts must not
 * consume different rejection samples or relocate existing palms and rocks.
 * Gameplay and rendering always use CONTACT_LIGHTHOUSE/WORLD_STRUCTURE_HULLS.
 */
const SEEDED_STRUCTURE_HULLS: readonly WorldStructureHull[] = (() => {
  const area = getIsland("contact"), anchor = getIslandLandmark(area), station = WORLD_STATIONS.find(entry => entry.island === "contact")!;
  return [...WORLD_STRUCTURE_HULLS.filter(hull => hull.island !== "contact"),
    { id: "contact-tower", island: "contact", kind: "cylinder", role: "tower", x: anchor.x, y: area.elevation + 6.5,
      z: anchor.z, width: 4.8, height: 13, depth: 4.8, radius: 2.4, yaw: 0 },
    { id: "contact-desk-0", island: "contact", kind: "box", role: "desk", x: station.x, y: area.elevation + 1.3 / 2,
      z: station.z, width: station.width, height: 1.3, depth: station.depth, yaw: 0 }];
})();
function clearOfRoutes(x: number, z: number, clearance: number) {
  return SEEDED_PLACEMENT_PATHS.every(({ from, to, width }) => distanceToSegment(x, z, from.x, from.z, to.x, to.z) > width / 2 + clearance)
    && BRIDGES.every(([a, b]) => { const from = getIsland(a), to = getIsland(b); return distanceToSegment(x, z, from.x, from.z, to.x, to.z) > BRIDGE_WIDTH / 2 + clearance; });
}
export const WORLD_PROPS: readonly WorldProp[] = TERRITORIES.flatMap((terrain, terrainIndex) => {
  const props: WorldProp[] = []; let seed = 7919 + terrainIndex * 104729;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
  for (const [kind, count] of [["palm", terrain.floating ? 4 : 16], ["rock", terrain.floating ? 5 : 12], ["shrub", terrain.floating ? 6 : 20]] as const) {
    for (let attempt = 0, placed = 0; attempt < 2400 && placed < count; attempt++) {
      const angle = random() * Math.PI * 2, radius = getShoreRadius(terrain, angle) * (0.56 + random() * 0.33);
      const x = terrain.x + Math.cos(angle) * radius, z = terrain.z + Math.sin(angle) * radius;
      const scale = kind === "palm" ? 1.05 + random() * 0.7 : 0.75 + random() * 0.7, footprint = kind === "palm" ? 1.5 * scale : scale;
      if (!clearOfRoutes(x, z, footprint + 0.5)
        // Adding this compact lateral kiosk must not consume random samples and
        // relocate the existing world. Its nearest preserved palm trunk is more
        // than 2m beyond the roof; real navigation/physics still include its deck.
        || WORLD_SUPPORT_DECKS.some((deck) => deck.island !== "welcome" && deck.island !== "contact" && pointOnSupportDeck(deck, x, z, -footprint - 1.4))
        || AREAS.some((area) => { const size = ARCHITECTURE[area.id], anchor = getIslandLandmark(area); return size && Math.abs(x - anchor.x) < size.width / 2 + footprint + 1.4 && Math.abs(z - anchor.z) < size.depth / 2 + footprint + 1.4; })
        || WORLD_STATIONS.some((station) => Math.hypot(x - station.x, z - station.z) < footprint + 3.2)
        // The imported Dance floor has the identical 22×16 clearing. Its long
        // rear troughs use conservative axis-aligned solids, not circular RNG
        // exclusions; preserve the seeded world instead of expanding that
        // original clearing. All 28 authored solids still collide in Rapier.
        || SEEDED_STRUCTURE_HULLS.some((hull) => hull.island !== "welcome" && hull.island !== "dance" && Math.hypot(x - hull.x, z - hull.z) < footprint + Math.max(hull.width, hull.depth) / 2 + 0.5)
        || props.some((other) => Math.hypot(x - other.x, z - other.z) < footprint + other.scale * (other.kind === "palm" ? 1.5 : 1) + 0.4)) continue;
      props.push({ id: `${terrain.id}-${kind}-${placed}`, island: islandAt(x, z)!.id, kind, x, z, scale, yaw: random() * Math.PI * 2 }); placed++;
    }
  }
  // Prune only tall crowns in the arrival-to-camera sightline. Filtering after
  // generation preserves the seeded rock/shrub positions and edge decoration.
  return props.filter((prop) => prop.kind !== "palm" || AREAS.every(({ entrance }) =>
    distanceToSegment(prop.x, prop.z, entrance.x, entrance.z, entrance.x + 5, entrance.z + 32) >= 3.8 * prop.scale));
});
export function getPalmTrunkSegments(prop: WorldProp) {
  const ground = getTerrainHeight(prop.x, prop.z), point = (t: number) => ({ x: prop.x + Math.cos(prop.yaw) * 0.8 * prop.scale * t * t, y: ground + 5 * prop.scale * t, z: prop.z + Math.sin(prop.yaw) * 0.8 * prop.scale * t * t });
  return Array.from({ length: 7 }, (_, i) => ({ a: point(i / 7), b: point((i + 1) / 7), radius: (0.3 - i / 7 * 0.14) * prop.scale, radiusTop: (0.3 - (i + 1) / 7 * 0.14) * prop.scale }));
}
export function getRockHull(prop: WorldProp) {
  const golden = (1 + Math.sqrt(5)) / 2, source = [-1, golden, 0, 1, golden, 0, -1, -golden, 0, 1, -golden, 0, 0, -1, golden, 0, 1, golden, 0, -1, -golden, 0, 1, -golden, golden, 0, -1, golden, 0, 1, -golden, 0, -1, -golden, 0, 1];
  const radii = { x: prop.scale, y: 0.7 * prop.scale, z: 0.85 * prop.scale }, vertices = new Float32Array(source.length), norm = Math.hypot(1, golden);
  for (let i = 0; i < source.length; i += 3) { const x = source[i] / norm * radii.x, z = source[i + 2] / norm * radii.z;
    vertices[i] = x * Math.cos(prop.yaw) + z * Math.sin(prop.yaw); vertices[i + 1] = source[i + 1] / norm * radii.y; vertices[i + 2] = -x * Math.sin(prop.yaw) + z * Math.cos(prop.yaw); }
  return { center: { x: prop.x, y: getTerrainHeight(prop.x, prop.z) + 0.55 * prop.scale, z: prop.z }, radii, vertices };
}
