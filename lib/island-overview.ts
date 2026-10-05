import * as THREE from "three";
import { BOAT_DOCKS, CONTACT_DOCK, getDockPoint, getGroundHeight, getPalmTrunkSegments, getRockHull, getTerrainHeight, ISLANDS, TRAVEL_ROUTES, WATER_LEVEL, WORLD_BOUNDS, WORLD_PROPS } from "./island-map";

export type IslandOverviewSafeRect = { xMin: number; xMax: number; yMin: number; yMax: number };
type FitOptions = {
  direction: THREE.Vector3;
  aspect: number;
  fov: number;
  safeRect?: IslandOverviewSafeRect;
  near?: number;
  origin?: THREE.Vector3;
};
const geometryBoxes = new WeakMap<THREE.BufferGeometry, THREE.Box3>();
const finite = (point: THREE.Vector3) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);

function corners(box: THREE.Box3, target: THREE.Vector3[], transform?: THREE.Matrix4, padding = .6) {
  if (box.isEmpty()) return;
  if (!finite(box.min) || !finite(box.max)) throw new Error("Overview requires finite real geometry bounds");
  // Apply padding AFTER transformation: world-unit guard for cloth/wind and
  // small moving mechanisms, never an enlargement of the collision contract.
  const world = transform ? box.clone().applyMatrix4(transform) : box.clone();
  world.expandByScalar(padding);
  for (const x of [world.min.x, world.max.x]) for (const y of [world.min.y, world.max.y]) for (const z of [world.min.z, world.max.z]) target.push(new THREE.Vector3(x, y, z));
}

/** Caller passes ONLY terrain, bridge, architecture/ready-model (optionally
 * vegetation) roots, NOT the whole world/ocean/sky/merged global scenery bucket.
 * Cache returned samples at init/art changes. Initial missing local geometry
 * boxes are derived once per geometry; later calls use the WeakMap cache. There
 * is no per-frame scan and no per-instance scan: InstancedMesh owners must have
 * computed their real aggregate boundingBox, as the vegetation owner does.
 * Hidden imported fallbacks are skipped; distance-culled optional details stay
 * in the conservative envelope so camera distance cannot shrink its own bounds.
 * Ancestor/world matrices are updated as derived caches, not authored poses.
 */
export function collectIslandOverviewPoints(roots: readonly THREE.Object3D[]): THREE.Vector3[] {
  const points: THREE.Vector3[] = [], visited = new Set<THREE.Object3D>();
  function visit(object: THREE.Object3D) {
    if (visited.has(object)) return;
    visited.add(object);
    if (!object.visible && !object.name.startsWith("Optional near detail:")) return;
    if (object instanceof THREE.Mesh) {
      let box: THREE.Box3;
      if (object instanceof THREE.InstancedMesh) {
        if (!object.boundingBox) throw new Error("Overview needs the owner's precomputed instanced bounds");
        box = object.boundingBox;
      } else {
        const cached = geometryBoxes.get(object.geometry);
        if (cached) box = cached;
        else {
          const position = object.geometry.getAttribute("position");
          if (!position) throw new Error("Overview mesh has no actual positions");
          box = object.geometry.boundingBox?.clone() ?? new THREE.Box3().setFromBufferAttribute(position);
          geometryBoxes.set(object.geometry, box);
        }
      }
      corners(box, points, object.matrixWorld);
    }
    for (const child of object.children) visit(child);
  }
  for (const root of roots) { root.updateWorldMatrix(true, true); visit(root); }
  // Shared procedural palm envelope: true fronds are <=2.97*scale long, with
  // rounded ribs/tilt. These samples are art coverage, not rendered hull meshes.
  for (const prop of WORLD_PROPS) {
    if (prop.kind === "palm") {
      const crown = getPalmTrunkSegments(prop).at(-1)!.b, radius = 3.4 * prop.scale;
      corners(new THREE.Box3(new THREE.Vector3(crown.x - radius, crown.y - radius * .3, crown.z - radius),
        new THREE.Vector3(crown.x + radius, crown.y + radius * .45, crown.z + radius)), points);
    } else if (prop.kind === "rock") {
      // Visible bevelled rocks are inside this shared rotated solid envelope;
      // do not use architecture collision boxes in place of real building art.
      const { center, radii } = getRockHull(prop);
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(center.x, center.y, center.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), prop.yaw), new THREE.Vector3(1, 1, 1));
      corners(new THREE.Box3(new THREE.Vector3(-radii.x, -radii.y, -radii.z), new THREE.Vector3(radii.x, radii.y, radii.z)), points, matrix);
    }
  }
  // World-owner material buckets combine palms/docks: never fit their giant
  // global AABB. Sample the shared ramps and harbour planks independently.
  for (const dock of BOAT_DOCKS) for (let step = 0; step <= 4; step++) {
    const p = getDockPoint(dock, step / 4), yaw = Math.atan2(dock.end.x - dock.start.x, dock.end.z - dock.start.z);
    for (const side of [-1, 1]) for (const y of [WATER_LEVEL - 1, p.y + 1.2]) points.push(new THREE.Vector3(
      p.x + Math.cos(yaw) * side * (dock.width / 2 + .5), y, p.z - Math.sin(yaw) * side * (dock.width / 2 + .5)));
  }
  corners(new THREE.Box3(new THREE.Vector3(CONTACT_DOCK.x - CONTACT_DOCK.width / 2, CONTACT_DOCK.top - .24, CONTACT_DOCK.z - CONTACT_DOCK.length / 2),
    new THREE.Vector3(CONTACT_DOCK.x + CONTACT_DOCK.width / 2, CONTACT_DOCK.top + .5, CONTACT_DOCK.z + CONTACT_DOCK.length / 2)), points);
  for (const island of ISLANDS) {
    points.push(new THREE.Vector3(island.x, getTerrainHeight(island.x, island.z) + 5.5, island.z));
    for (const p of [island.entrance, ...TRAVEL_ROUTES.filter(route => route.from === island.id).map(route => route.departure)])
      corners(new THREE.Box3(new THREE.Vector3(p.x - .5, getGroundHeight(p.x, p.z), p.z - .5),
        new THREE.Vector3(p.x + .5, getGroundHeight(p.x, p.z) + 2.35, p.z + .5)), points, undefined, .5);
  }
  return points;
}

/** Optional UI measurements are host-relative pixels. Defaults follow the
 * current navbar/desktop welcome card; caller can pass actual DOM rectangles.
 * Portrait intro occupies the bottom: fit the panorama into the band above it
 * when that band is usable. Very short viewports retain reader-first access.
 */
export function islandOverviewSafeRect(width: number, height: number, introVisible: boolean,
  ui: { navBottom?: number; introRight?: number; introTop?: number; markerHeight?: number; bottomGuard?: number } = {}): IslandOverviewSafeRect {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("Overview viewport must be positive and finite");
  const top = Math.min(height * .32, (ui.navBottom ?? (width < 760 ? 72 : 83)) + (ui.markerHeight ?? 32) + 8);
  const bottom = Math.min(height * .2, ui.bottomGuard ?? Math.max(40, Math.min(64, height * .05)));
  const wideIntro = introVisible && width >= 1100, side = Math.max(16, Math.min(48, width * .03));
  const aboveIntro = introVisible && width < 760 && ui.introTop !== undefined
    && Number.isFinite(ui.introTop) && ui.introTop > top + Math.max(140, height * .16);
  return { xMin: wideIntro ? -1 + 2 * ((ui.introRight ?? 380) + 8) / width : -.92,
    xMax: wideIntro ? 1 - 2 * side / width : .92,
    yMin: aboveIntro ? 1 - 2 * (ui.introTop! - 12) / height : -1 + 2 * bottom / height,
    yMax: 1 - 2 * top / height };
}

/** Exact O(samples) perspective safe-rect fit. Project points once onto the
 * fixed camera basis. At D, feasible target-H is [Lh-xMax*tx*D, Uh-xMin*tx*D];
 * the interval width sets minimum D. Same for V. Midpoints centre the visible
 * samples, allowing a virtual focus below sea without moving terrain/player.
 * The caller keeps walking/inspection/transfers and GSAP transitions unchanged.
 */
export function fitIslandOverview(points: readonly THREE.Vector3[], options: FitOptions) {
  const { aspect, fov } = options, near = options.near ?? .1;
  const rect = options.safeRect ?? { xMin: -.9, xMax: .9, yMin: -.9, yMax: .74 };
  if (!points.length || !points.every(finite) || !finite(options.direction) || options.direction.lengthSq() < 1e-12
    || !Number.isFinite(aspect) || aspect <= 0 || !Number.isFinite(fov) || fov <= 0 || fov >= 170 || !Number.isFinite(near) || near <= 0) throw new Error("Overview fit needs finite points, direction, aspect, fov and near");
  if (!Object.values(rect).every(Number.isFinite) || rect.xMin < -1 || rect.xMax > 1 || rect.yMin < -1 || rect.yMax > 1
    || rect.xMin >= rect.xMax || rect.yMin >= rect.yMax) throw new Error("Overview safe rectangle must have a nonzero finite interior inside NDC");
  const origin = options.origin?.clone() ?? new THREE.Vector3((WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2, 14, (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2);
  if (!finite(origin)) throw new Error("Overview origin must be finite");
  const direction = options.direction.clone().normalize();
  const horizontal = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), direction);
  if (horizontal.lengthSq() < 1e-12) throw new Error("Overview direction must not be vertical");
  horizontal.normalize();
  const vertical = new THREE.Vector3().crossVectors(direction, horizontal).normalize();
  const tangent = Math.tan(THREE.MathUtils.degToRad(fov / 2)), tx = tangent * aspect, ty = tangent;
  let lowerH = -Infinity, upperH = Infinity, lowerV = -Infinity, upperV = Infinity, depthMax = -Infinity;
  const delta = new THREE.Vector3();
  for (const point of points) {
    delta.copy(point).sub(origin);
    const h = delta.dot(horizontal), v = delta.dot(vertical), d = delta.dot(direction);
    lowerH = Math.max(lowerH, h + rect.xMax * tx * d); upperH = Math.min(upperH, h + rect.xMin * tx * d);
    lowerV = Math.max(lowerV, v + rect.yMax * ty * d); upperV = Math.min(upperV, v + rect.yMin * ty * d); depthMax = Math.max(depthMax, d);
  }
  const distance = Math.max((lowerH - upperH) / ((rect.xMax - rect.xMin) * tx),
    (lowerV - upperV) / ((rect.yMax - rect.yMin) * ty), depthMax + near + .5);
  const centreH = (lowerH + upperH - (rect.xMax + rect.xMin) * tx * distance) / 2;
  const centreV = (lowerV + upperV - (rect.yMax + rect.yMin) * ty * distance) / 2;
  const focus = origin.addScaledVector(horizontal, centreH).addScaledVector(vertical, centreV);
  if (!finite(focus) || !Number.isFinite(distance) || distance <= 0) throw new Error("Overview fit produced invalid bounds");
  return { focus, distance, halfHeight: distance * tangent };
}
