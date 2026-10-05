import { getTerrainMesh, TERRAIN_ANGULAR_SEGMENTS, TERRITORIES, WATER_LEVEL, type TerrainIsland } from "./island-map";

/** Art-only beach toe/bedrock contact. Never used as a walking or collision surface. */
export const SEA_CLIFF_FOUNDATION_Y = WATER_LEVEL - 10;
const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function getSeaCliffRadius(shore: number, angle: number, phase: number, depth: number, y: number) {
  const clearance = smooth(0, .055, depth);
  const wave = Math.sin(angle * 3 + phase + depth * 2.7) * .64 + Math.sin(angle * 7 - phase - depth * 4.1) * .36;
  const ribs = Math.sin(angle * 13 + phase) * .3 + Math.sin(angle * 23 - phase) * .15;
  const joint = Math.exp(-Math.pow(Math.sin(angle * 17 + phase + depth * .42) / .17, 2)) * .28;
  // Low coasts have a quiet sandy toe, not metre-sized protruding cliff ribs.
  // Rock fracture gains depth only on the dry upper faces; the same formula
  // also supplies the ocean's exact sea contact, rather than a second outline.
  const dryRock = smooth(WATER_LEVEL + .8, WATER_LEVEL + 3, y);
  const shoreFoot = (1 - smooth(WATER_LEVEL - 3, WATER_LEVEL + 5, y)) * (1.55 + Math.sin(angle * 5 + phase) * .18);
  const submergedFoot = (1 - smooth(WATER_LEVEL - 8, WATER_LEVEL - 1, y)) * 1.5;
  return shore + clearance * ((ribs + wave * .18 - joint) * (.24 + dryRock * .76) + shoreFoot + submergedFoot);
}

/** Sea contact derived from the exact shared Float32 rim and the wall profile.
 * The ocean samples this once at construction instead of using the upper turf
 * outline, which would hide its foam inside the wider submerged rock foot.
 */
export function getSeaCliffWaterRadius(island: TerrainIsland, angle: number) {
  const { vertices } = getTerrainMesh(island), segments = TERRAIN_ANGULAR_SEGMENTS;
  const u = ((angle / (Math.PI * 2)) % 1 + 1) % 1 * segments;
  const sector = Math.floor(u), fraction = u - sector, start = vertices.length / 3 - segments;
  const a = (start + sector) * 3, b = (start + (sector + 1) % segments) * 3;
  const x = vertices[a] + (vertices[b] - vertices[a]) * fraction - island.x;
  const z = vertices[a + 2] + (vertices[b + 2] - vertices[a + 2]) * fraction - island.z;
  const height = vertices[a + 1] + (vertices[b + 1] - vertices[a + 1]) * fraction;
  const depth = (height - WATER_LEVEL) / (height - SEA_CLIFF_FOUNDATION_Y);
  const phase = TERRITORIES.findIndex((entry) => entry.id === island.id) * 1.731;
  return getSeaCliffRadius(Math.hypot(x, z), Math.atan2(z, x), phase, depth, WATER_LEVEL);
}
