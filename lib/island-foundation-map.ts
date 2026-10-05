import {
  ARCHIVE_OBSERVATORY, ARCHIVE_OBSERVATORY_DECK, HOME_STUDIO, HOME_STUDIO_DECK,
  DANCE_PAVILION, DANCE_PAVILION_DECK,
  getTerrainMesh, getTerritory,
  type WorldStructureHull, type WorldSupportDeck,
} from "./island-map";
import { SEA_CLIFF_FOUNDATION_Y } from "./island-coast";

export type FoundationHull = WorldStructureHull & {
  deckId: string;
  finish: "stone" | "timber";
  part: "retaining-wall" | "pier" | "bearing";
  footing: "terrain" | "seabed" | "structure";
};

export const FOUNDATION_DECKS = [HOME_STUDIO_DECK, ARCHIVE_OBSERVATORY_DECK, DANCE_PAVILION_DECK] as const;
const EDGE_INSET = .035;
const WALL_THICKNESS = .64;
const FOOT_EMBED = .24;
type FootprintVertex = { x: number; y: number; z: number };

function worldPoint(deck: WorldSupportDeck, x: number, z: number) {
  const cosine = Math.cos(deck.yaw), sine = Math.sin(deck.yaw);
  return { x: deck.x + x * cosine + z * sine, z: deck.z - x * sine + z * cosine };
}

function clipFootprint(polygon: FootprintVertex[], axis: "x" | "z", limit: number, sign: number) {
  const result: FootprintVertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const aInside = sign * (a[axis] - limit) >= 0, bInside = sign * (b[axis] - limit) >= 0;
    if (aInside) result.push(a);
    if (aInside !== bInside) {
      const t = (limit - a[axis]) / (b[axis] - a[axis]);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
    }
  }
  return result;
}

/** Exact piecewise-linear terrain contact over the ENTIRE rotated footprint.
 * Clip actual Float32 triangles, not an analytical radius or a sparse height
 * grid: a narrow uncovered shore fragment must continue to the seabed. The
 * minimum of an affine triangle occurs at a clipped polygon vertex. Existing
 * decks/bridges are deliberately excluded, so they cannot masquerade as soil.
 */
export function getFoundationFooting(deck: WorldSupportDeck, x: number, z: number, width: number, depth: number) {
  if (![deck.x, deck.z, deck.yaw, x, z, width, depth].every(Number.isFinite) || width <= 0 || depth <= 0)
    throw new Error("Foundation footprint must have finite positive dimensions");
  const { vertices, indices } = getTerrainMesh(getTerritory(deck.territory));
  const cosine = Math.cos(deck.yaw), sine = Math.sin(deck.yaw);
  const minX = x - width / 2, maxX = x + width / 2, minZ = z - depth / 2, maxZ = z + depth / 2;
  let minimum = Infinity, coveredArea = 0;
  for (let i = 0; i < indices.length; i += 3) {
    let polygon: FootprintVertex[] = [];
    for (let j = 0; j < 3; j++) {
      const index = indices[i + j] * 3, dx = vertices[index] - deck.x, dz = vertices[index + 2] - deck.z;
      polygon.push({ x: dx * cosine - dz * sine, y: vertices[index + 1], z: dx * sine + dz * cosine });
    }
    if (Math.max(...polygon.map(p => p.x)) < minX || Math.min(...polygon.map(p => p.x)) > maxX
      || Math.max(...polygon.map(p => p.z)) < minZ || Math.min(...polygon.map(p => p.z)) > maxZ) continue;
    polygon = clipFootprint(polygon, "x", minX, 1);
    polygon = clipFootprint(polygon, "x", maxX, -1);
    polygon = clipFootprint(polygon, "z", minZ, 1);
    polygon = clipFootprint(polygon, "z", maxZ, -1);
    if (polygon.length < 3) continue;
    let twiceArea = 0;
    for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j], b = polygon[(j + 1) % polygon.length];
      twiceArea += a.x * b.z - b.x * a.z;
    }
    const area = Math.abs(twiceArea) / 2;
    if (area <= 1e-12) continue;
    coveredArea += area;
    minimum = Math.min(minimum, ...polygon.map(p => p.y));
  }
  const footprintArea = width * depth;
  // This tolerance absorbs polygon-area floating point roundoff only; it is
  // not a shoreline inset and never grows an unsupported walkable surface.
  const seaFooting = !Number.isFinite(minimum) || footprintArea - coveredArea > Math.max(1e-10, footprintArea * 1e-10);
  return { bottom: seaFooting ? SEA_CLIFF_FOUNDATION_Y : Math.max(SEA_CLIFF_FOUNDATION_Y, minimum - FOOT_EMBED),
    footing: seaFooting ? "seabed" as const : "terrain" as const,
    minimum: Number.isFinite(minimum) ? minimum : undefined, coveredArea, footprintArea };
}

/** Shared, deterministic physical solids below EXISTING structural decks.
 * Narrow retaining walls and individual piers leave the interior open; they
 * are architectural foundations, not a filled rectangular terrain island.
 * Runtime terrain edits are picked up on the next call. */
export function getFoundationHulls(): readonly FoundationHull[] {
  const result: FoundationHull[] = [];
  for (const deck of FOUNDATION_DECKS) {
    const underside = deck.top - deck.thickness, bearingHeight = deck.island === "about" ? .20 : deck.island === "dance" ? .22 : .14;
    const width = deck.width - EDGE_INSET * 2, depth = deck.depth - EDGE_INSET * 2;
    const bodyTop = underside - bearingHeight;
    const finish = deck.island === "about" ? "timber" as const : "stone" as const;
    function box(id: string, part: FoundationHull["part"], localX: number, localZ: number,
      boxWidth: number, boxDepth: number, bottom: number, top: number,
      boxFinish: FoundationHull["finish"], footing: FoundationHull["footing"]) {
      if (top - bottom <= .015) return;
      const p = worldPoint(deck, localX, localZ);
      result.push({ id: `foundation-${deck.island}-${id}`, island: deck.island, deckId: deck.id,
        kind: "box", role: part === "pier" ? "post" : "wall", part, finish: boxFinish, footing,
        x: p.x, y: (bottom + top) / 2, z: p.z, width: boxWidth, depth: boxDepth,
        height: top - bottom, yaw: deck.yaw });
    }
    if (deck.island === "dance") {
      // An open coastal timber pavilion stands on individual piles and four
      // cross-bearers, never another continuous island/plinth. Its existing
      // eight posts meet the floor perimeter, so the piles use those EXACT
      // footprints rather than a larger decorative or invisible shoe.
      const rows = new Set<number>();
      for (const post of DANCE_PAVILION.hulls.filter(hull => hull.role === "post")) {
        const dx = post.x - deck.x, dz = post.z - deck.z;
        const x = dx * Math.cos(deck.yaw) - dz * Math.sin(deck.yaw), z = dx * Math.sin(deck.yaw) + dz * Math.cos(deck.yaw);
        const { bottom, footing } = getFoundationFooting(deck, x, z, post.width, post.depth);
        // Each pile seats the post directly at the existing floor underside.
        // It intersects the cross-bearer instead of stopping below it: on the
        // uphill edge soil already rises above the bearer bottom, so truncating
        // piles there would discard three actual 24cm-embedded footing shoes.
        box(`pier-${post.id}`, "pier", x, z, post.width, post.depth, bottom, underside, "timber", footing);
        rows.add(z);
      }
      for (const z of rows) box(`cross-bearing-${z}`, "bearing", 0, z, deck.width, .32,
        bodyTop, underside, "timber", "structure");
      continue;
    }
    function retainingRow(id: string, acrossX: boolean, fixed: number, span: number) {
      const cells = Math.ceil(span / 1.15), step = span / cells;
      for (let cell = 0; cell < cells; cell++) {
        const moving = -span / 2 + (cell + .5) * step;
        const x = acrossX ? moving : fixed, z = acrossX ? fixed : moving;
        const w = acrossX ? step : WALL_THICKNESS, d = acrossX ? WALL_THICKNESS : step;
        const { bottom, footing } = getFoundationFooting(deck, x, z, w, d);
        // Only the lower exposed shoulder needs masonry. A nearly buried floor
        // keeps its original soil instead of receiving a uniform new plinth.
        if (bodyTop - bottom > FOOT_EMBED) box(`${id}-${cell}`, "retaining-wall", x, z, w, d, bottom, bodyTop, "stone", footing);
      }
    }
    const sideX = (width - WALL_THICKNESS) / 2, sideZ = (depth - WALL_THICKNESS) / 2;
    for (const [id, sign] of [["north", -1], ["south", 1]] as const) {
      box(`${id}-bearing`, "bearing", 0, sideZ * sign, width, WALL_THICKNESS,
        bodyTop, underside, finish, "structure");
      retainingRow(id, true, sideZ * sign, width);
    }
    for (const [id, sign] of [["west", -1], ["east", 1]] as const) {
      box(`${id}-bearing`, "bearing", sideX * sign, 0, WALL_THICKNESS, depth,
        bodyTop, underside, finish, "structure");
      retainingRow(id, false, sideX * sign, depth);
    }
    const posts = (deck.island === "about" ? HOME_STUDIO : ARCHIVE_OBSERVATORY).hulls.filter((hull) => hull.role === "post");
    for (const post of posts) {
      const dx = post.x - deck.x, dz = post.z - deck.z;
      const x = dx * Math.cos(deck.yaw) - dz * Math.sin(deck.yaw), z = dx * Math.sin(deck.yaw) + dz * Math.cos(deck.yaw);
      // Keep the two veranda edge posts seated instead of skipping them when
      // a standard 72cm shoe extends 35mm beyond the existing deck footprint.
      // Narrow only the shoe, never relocate/resize the actual post or deck.
      const footWidth = Math.min(.72, width - Math.abs(x) * 2), footDepth = Math.min(.72, depth - Math.abs(z) * 2);
      if (footWidth < post.width || footDepth < post.depth) throw new Error(`Foundation shoe cannot contain ${post.id}`);
      const { bottom, footing } = getFoundationFooting(deck, x, z, footWidth, footDepth);
      if (bodyTop - bottom > FOOT_EMBED) box(`pier-${post.id}`, "pier", x, z, footWidth, footDepth, bottom, bodyTop, "stone", footing);
      if (deck.island === "about") box(`bearing-${post.id}`, "bearing", x, z, footWidth, footDepth, bodyTop, underside, "timber", "structure");
    }
    // Cross-bearers sit below the veranda; existing joists seat into them.
    // The archive instead uses its existing stone substrate and low coping.
    if (deck.island === "about") for (const [id, z] of [["rear", -3.6], ["front", -.9]] as const) {
      box(`${id}-cross-bearing`, "bearing", 0, z, width, .30,
        bodyTop, underside, "timber", "structure");
    }
  }
  return result;
}
