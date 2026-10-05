import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import {
  AREAS, ARCHITECTURE, BOAT_DOCKS, BRIDGES, BRIDGE_WIDTH, CONTACT_DOCK, TERRITORIES,
  TRAVEL_ROUTES, WALK_PATHS, WATER_LEVEL, WORLD_PROPS, WORLD_STATIONS, WORLD_STRUCTURE_HULLS,
  getBridgeProfile, getIsland, getIslandLandmark, getShoreRadius, getTerrainHeight, supportDeckAt,
} from "./island-map";

type LeafKind = "banana" | "monstera" | "small";
type Instance = { matrix: THREE.Matrix4; color: THREE.Color };
type Placement = { x: number; z: number; radius: number; kind: "border" | "shrub" | "vine" };

function distanceToSegment(x: number, z: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}

/** Full decorative footprint, not just its root, must avoid every approach. */
export function isVegetationPocketClear(x: number, z: number, radius: number): boolean {
  if (supportDeckAt(x, z, -radius - .65)) return false;
  if (WALK_PATHS.some(({ from, to, width }) => distanceToSegment(x, z, from.x, from.z, to.x, to.z) < width / 2 + radius + .45)) return false;
  if (BRIDGES.some(([from, to]) => {
    const { start, end } = getBridgeProfile(from, to);
    return distanceToSegment(x, z, start.x, start.z, end.x, end.z) < BRIDGE_WIDTH / 2 + radius + .7;
  })) return false;
  if (BOAT_DOCKS.some(({ start, end, width }) => distanceToSegment(x, z, start.x, start.z, end.x, end.z) < width / 2 + radius + .8)) return false;
  if (Math.abs(x - CONTACT_DOCK.x) < CONTACT_DOCK.width / 2 + radius + .8
    && Math.abs(z - CONTACT_DOCK.z) < CONTACT_DOCK.length / 2 + radius + .8) return false;
  if (TRAVEL_ROUTES.some(({ departure, arrival }) => Math.hypot(x - departure.x, z - departure.z) < radius + 3.5
    || Math.hypot(x - arrival.x, z - arrival.z) < radius + 3.5)) return false;
  if (WORLD_STATIONS.some((station) => Math.hypot(x - station.x, z - station.z) < radius + station.width / 2 + 1)) return false;
  if (WORLD_STRUCTURE_HULLS.some((hull) => {
    const dx = x - hull.x, dz = z - hull.z, c = Math.cos(hull.yaw), s = Math.sin(hull.yaw);
    return Math.abs(dx * c - dz * s) < hull.width / 2 + radius + .55
      && Math.abs(dx * s + dz * c) < hull.depth / 2 + radius + .55;
  })) return false;
  return AREAS.every((area) => {
    const anchor = getIslandLandmark(area), size = ARCHITECTURE[area.id];
    if (size && Math.abs(x - anchor.x) < size.width / 2 + radius + .7
      && Math.abs(z - anchor.z) < size.depth / 2 + radius + .7) return false;
    // Keep both the scene-facing approach and camera-to-explorer cone clear.
    const entrance = area.entrance;
    if (distanceToSegment(x, z, entrance.x, entrance.z, anchor.x, anchor.z) < radius + 2) return false;
    if (distanceToSegment(x, z, entrance.x, entrance.z, entrance.x + 5, entrance.z + 32) < radius + 2.2) return false;
    return area.id !== "about" || distanceToSegment(x, z, entrance.x, entrance.z, entrance.x - 10, entrance.z + 28) >= radius + 2.2;
  });
}

/** A closed, curved blade with an elliptical section, never a two-sided card. */
function curvedBlade({ compact, small = false }: { compact: boolean; small?: boolean }) {
  const rows = small ? (compact ? 8 : 12) : (compact ? 10 : 16);
  const sides = 8, columns = sides + 2, positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const width = small ? .37 : .34, terminalDrop = small ? .14 : .28;
  function surface(t: number, angle: number) {
    const outline = Math.pow(Math.sin(t * Math.PI), small ? .66 : .72);
    const span = outline * width * (small ? 1.12 - t * .30 : 1 + Math.sin(t * Math.PI * 3) * .022);
    const centerY = Math.sin(t * Math.PI) * (small ? .20 : .29) - t * t * terminalDrop;
    const across = Math.cos(angle), twist = Math.sin(t * Math.PI) * (small ? -.035 : .07);
    const z = across * span, y = (1 - across * across) * span * .13 + Math.sin(angle) * outline * .013;
    return new THREE.Vector3(t, centerY + y * Math.cos(twist) - z * Math.sin(twist), y * Math.sin(twist) + z * Math.cos(twist));
  }
  for (let row = 0; row < rows; row++) {
    const t = .015 + row / (rows - 1) * .97;
    for (let side = 0; side < columns; side++) {
      // Separate smooth upper/lower laminae meet at the same real edge points.
      // A thin leaf has a sharp rim, not a smoothed upper-to-underface fold.
      const angleIndex = side <= sides / 2 ? side : side - 1;
      const angle = angleIndex / sides * Math.PI * 2, across = Math.cos(angle);
      // A continuous rounded keel and slight twist replace the old six-sided
      // serrated-looking blade. Broad laminae stay real closed smooth solids.
      const point = surface(t, angle);
      positions.push(point.x, point.y, point.z);
      uvs.push(t, (across + 1) / 2);
    }
    if (row < rows - 1) for (let side = 0; side < sides; side++) {
      const column = side < sides / 2 ? side : side + 1;
      const a = row * columns + column, b = a + 1;
      indices.push(a, a + columns, b, b, a + columns, b + columns);
    }
  }
  const start = positions.length / 3, end = start + 1;
  positions.push(0, 0, 0, 1, -terminalDrop, 0); uvs.push(0, .5, 1, .5);
  for (let side = 0; side < sides; side++) {
    const column = side < sides / 2 ? side : side + 1;
    indices.push(start, column, column + 1);
    const last = (rows - 1) * columns;
    indices.push(end, last + column + 1, last + column);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export { createPalmFrondGeometry, PALM_MAXIMUM_WIND_OFFSET } from "./island-palm-art";

/** Split lobes and real fenestrations, extruded then cupped in three dimensions. */
function monsteraBlade(compact: boolean) {
  const shape = new THREE.Shape(), steps = compact ? 24 : 36;
  const widthAt = (t: number) => {
    let span = Math.pow(Math.sin(Math.PI * t), .62) * .46;
    for (const notch of [.28, .46, .65, .81]) span *= 1 - .59 * Math.exp(-Math.pow((t - notch) / .030, 2));
    return span;
  };
  shape.moveTo(0, 0);
  for (let i = 1; i < steps; i++) shape.lineTo(i / steps, widthAt(i / steps));
  shape.lineTo(1, 0);
  for (let i = steps - 1; i > 0; i--) shape.lineTo(i / steps, -widthAt(i / steps));
  shape.closePath();
  for (const t of [.37, .60]) for (const side of [-1, 1]) {
    const hole = new THREE.Path();
    // Stagger real fenestrations rather than aligning both ellipse extrema
    // with a lobe notch: those almost-collinear ears fold after cupping.
    hole.absellipse(t, side * (t < .5 ? .115 : .16), .021, .039, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .021, bevelEnabled: false, steps: 1, curveSegments: compact ? 2 : 3 });
  const points = geometry.attributes.position, uv = geometry.attributes.uv, normals = geometry.attributes.normal;
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), across = points.getY(i), thickness = points.getZ(i);
    const y = Math.sin(Math.PI * x) * .25 - x * x * .18 + across * across * .085;
    // This is a proper rotation, not a Y/Z reflection (which inverts faces).
    points.setXYZ(i, x, y + thickness - .0105, -across);
    uv.setXY(i, x, across / .92 + .5);
    // Caps use the continuous cup's differential normal. Vertical edge walls
    // keep their own rim normals; a broad cap must not flip a tiny side face.
    const normal = Math.abs(normals.getZ(i)) > .5
      ? new THREE.Vector3(-Math.PI * .25 * Math.cos(Math.PI * x) + x * .36, 1, across * .17).normalize().multiplyScalar(normals.getZ(i))
      : new THREE.Vector3(normals.getX(i), 0, -normals.getY(i)).normalize();
    normals.setXYZ(i, normal.x, normal.y, normal.z);
  }
  // ExtrudeGeometry duplicates cap/edge vertices with hard normals. Weld only
  // after the proper-handed cup deformation, keeping the actual holes closed
  // and removing the visible triangulated facets of the previous leaf.
  const smooth = mergeVertices(geometry, 1e-5); geometry.dispose();
  smooth.computeBoundingSphere();
  return smooth;
}

/** Original botanical art; soft foliage adds no solid hull or interaction gate. */
export function createIslandVegetation({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group(); group.name = "Layered tropical botanical borders";
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
  const instances = new Set<THREE.InstancedMesh>();
  const pendingStems: THREE.BufferGeometry[] = [];
  const wind = { value: 0 }, placements: Placement[] = [];
  let disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    instances.forEach((mesh) => mesh.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    pendingStems.forEach((geometry) => geometry.dispose()); pendingStems.length = 0;
    instances.clear(); geometries.clear(); materials.clear();
    group.clear();
  }
  const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T) => { geometries.add(geometry); return geometry; };
  const ownMaterial = <T extends THREE.Material>(material: T) => { materials.add(material); return material; };
  try {
    const leafMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .62, metalness: 0 }));
    leafMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.foliageTime = wind;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 foliageUV; uniform float foliageTime;");
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `#include <begin_vertex>
        foliageUV = uv;
        #ifdef USE_INSTANCING
          float phase = instanceMatrix[3].x*.71 + instanceMatrix[3].z*.43;
          float restPhase = phase+uv.x*2.4;
          transformed.z += (sin(foliageTime*1.1+restPhase)-sin(restPhase))*.011*uv.x*uv.x;
        #endif`);
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec2 foliageUV;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `#include <color_fragment>
        float across = abs(foliageUV.y-.5);
        float ribAA = max(fwidth(across),.002);
        float rib = 1.0-smoothstep(.009-ribAA,.024+ribAA,across);
        float veinPhase = foliageUV.x*38.0-across*17.0;
        float veinAA = max(fwidth(veinPhase),.03);
        float veins = smoothstep(.82-veinAA,.98+veinAA,cos(veinPhase));
        float youngTip = smoothstep(.42,1.0,foliageUV.x);
        diffuseColor.rgb *= .85+youngTip*.10+rib*.08+veins*.032-across*.065;`);
    };
    leafMaterial.customProgramCacheKey = () => "island-botanical-closed-blades-v1";
    const stemMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#426c29", roughness: .85 }));
    const petalMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: .55 }));
    const pollenMaterial = ownMaterial(new THREE.MeshStandardMaterial({ color: "#ffc04e", roughness: .64 }));
    const blades = {
      banana: ownGeometry(curvedBlade({ compact })),
      monstera: ownGeometry(monsteraBlade(compact)),
      small: ownGeometry(curvedBlade({ compact, small: true })),
    };
    const bladeReach = {} as Record<LeafKind, number>;
    for (const kind of Object.keys(blades) as LeafKind[]) {
      const points = blades[kind].getAttribute("position"); let reach = 0;
      for (let i = 0; i < points.count; i++) reach = Math.max(reach, Math.hypot(points.getX(i), points.getY(i), points.getZ(i)));
      // Include the full owned wind envelope, not only the undeformed tip.
      bladeReach[kind] = reach + .022;
    }
    const petal = ownGeometry(new THREE.SphereGeometry(1, compact ? 6 : 8, compact ? 4 : 5));
    const pollen = ownGeometry(new THREE.SphereGeometry(1, 6, 4));
    const temporary = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
    let seed = 938431;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    const greens = ["#294f34", "#3d6d38", "#638b3f", "#8aac4b", "#46754c"].map((color) => new THREE.Color(color));
    const corals = ["#e4525f", "#ee766b", "#f39979"].map((color) => new THREE.Color(color));
    function instance(list: Instance[], position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, color: THREE.Color) {
      temporary.position.copy(position); temporary.rotation.copy(rotation); temporary.scale.copy(scale); temporary.updateMatrix();
      list.push({ matrix: temporary.matrix.clone(), color });
    }
    function stem(points: THREE.Vector3[], radius: number) {
      const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(4, points.length * 2), radius, compact ? 4 : 5, false);
      geometry.deleteAttribute("uv"); pendingStems.push(geometry);
    }
    function putInstances(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, list: Instance[]) {
      if (!list.length) return;
      const mesh = new THREE.InstancedMesh(geometry, material, list.length); mesh.name = name;
      instances.add(mesh);
      list.forEach(({ matrix, color }, i) => { mesh.setMatrixAt(i, matrix); mesh.setColorAt(i, color); });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = true; mesh.receiveShadow = material === leafMaterial;
      mesh.computeBoundingBox(); mesh.computeBoundingSphere(); group.add(mesh);
    }
    for (const territory of TERRITORIES) {
      const leaves: Record<LeafKind, Instance[]> = { banana: [], monstera: [], small: [] };
      const flowers: Instance[] = [], centers: Instance[] = [];
      const territoryPockets: Placement[] = [];
      function leaf(kind: LeafKind, point: THREE.Vector3, yaw: number, pitch: number, length: number, shade: number, pocket?: Placement) {
        // Triangle inequality is deliberately conservative across every pitch,
        // yaw and shader wind phase. All layered shoots remain inside the same
        // clear full-pocket disc even when their roots are no longer concentric.
        const available = pocket ? pocket.radius - Math.hypot(point.x - pocket.x, point.z - pocket.z) - .05 : Infinity;
        const size = Math.min(length, available / bladeReach[kind]);
        if (size <= .12) return;
        instance(leaves[kind], point, new THREE.Euler(0, yaw, pitch, "YXZ"), new THREE.Vector3(size, size, size), greens[shade % greens.length]);
      }
      function flower(point: THREE.Vector3, size: number, yaw: number) {
        const facing = new THREE.Quaternion().setFromAxisAngle(up, yaw);
        for (let i = 0; i < 5; i++) {
          const angle = i / 5 * Math.PI * 2;
          const offset = new THREE.Vector3(Math.cos(angle) * size * .34, Math.sin(angle) * size * .34, 0).applyQuaternion(facing);
          instance(flowers, point.clone().add(offset), new THREE.Euler(0, yaw, angle),
            new THREE.Vector3(size * .42, size * .30, size * .11), corals[Math.floor(random() * corals.length)]);
        }
        instance(centers, point.clone().add(new THREE.Vector3(0, 0, size * .11).applyQuaternion(facing)),
          new THREE.Euler(0, yaw, -.25), new THREE.Vector3(size * .10, size * .10, size * .22), new THREE.Color("#ffcd62"));
      }
      function cluster(x: number, z: number, radius: number, kind: Placement["kind"]) {
        if (!isVegetationPocketClear(x, z, radius)) return false;
        if (territoryPockets.some((other) => Math.hypot(x - other.x, z - other.z) < (radius + other.radius) * .62)) return false;
        const placement = { x, z, radius, kind }; territoryPockets.push(placement); placements.push(placement);
        const banana = random() > .54, count = compact ? 7 : 10, tallCount = compact ? 4 : 6;
        const yawOffset = Math.atan2(territory.z - z, x - territory.x) + (random() - .5) * .65;
        const outward = new THREE.Vector3(Math.cos(yawOffset), 0, -Math.sin(yawOffset));
        const tangent = new THREE.Vector3(-outward.z, 0, outward.x);
        function soilRoot(along: number, across: number) {
          const point = new THREE.Vector3(x, 0, z).addScaledVector(tangent, along * radius).addScaledVector(outward, across * radius);
          point.y = getTerrainHeight(point.x, point.z) + .035; return point;
        }
        // A small grove has several real soil-rooted plants: an arched upper
        // fan, overlapping broad middle leaves and a low forward fringe. The
        // instance count is unchanged; composition replaces the radial star.
        for (let i = 0; i < count; i++) {
          const tall = i < tallCount, index = tall ? i : i - tallCount;
          const root = soilRoot(tall ? (index % 3 - 1) * .17 : (index % 2 ? -.34 : .34), tall ? -.10 : .12);
          const height = tall ? (banana ? .48 + radius * .25 : .20 + radius * .16) + index % 3 * .17 : .22 + index % 2 * .18;
          const yaw = yawOffset + (tall ? (index / (tallCount - 1) - .5) * Math.PI * 1.7 : (index % 2 ? -1 : 1) * .88 + index * .22);
          const start = root.clone().add(new THREE.Vector3(Math.cos(yaw) * .075, height, -Math.sin(yaw) * .075));
          const leafKind: LeafKind = tall && banana ? "banana" : "monstera";
          const pitch = tall ? .32 + index % 3 * .18 : .18 + index % 2 * .16;
          const length = radius * (tall ? .58 : .65) * (.84 + random() * .18);
          leaf(leafKind, start, yaw, pitch, length, tall ? 2 + index % 2 : index % 2 ? 0 : 4, placement);
          stem([root, root.clone().add(new THREE.Vector3(0, height * .55, 0)), start], tall ? .032 : .025);
        }
        for (let i = 0; i < (compact ? 3 : 5); i++) {
          const ratio = i / (compact ? 2 : 4), root = soilRoot((ratio - .5) * .98, .30 + Math.sin(ratio * Math.PI) * .07);
          const yaw = yawOffset + (ratio - .5) * 1.65, start = root.clone().add(new THREE.Vector3(0, .14, 0));
          leaf("small", start, yaw, .30, radius * .43, i % 2 ? 1 : 4, placement);
          stem([root, start], .018);
          if (i % 2 === 0) flower(start.clone().add(new THREE.Vector3(0, .34 + random() * .18, 0)), .48 + random() * .17, yaw);
        }
        return true;
      }
      // Existing soft shrub pockets stay anchored to their authored map points.
      WORLD_PROPS.filter((prop) => prop.kind === "shrub" && getIsland(prop.island).territory === territory.id)
        .forEach((prop) => cluster(prop.x, prop.z, 1.9 + prop.scale * .55, "shrub"));
      // Adjacent coastal patches read as uneven planted borders, not isolated
      // rosettes scattered uniformly around every island. Candidate budget is
      // unchanged; full approach/structure/camera clearance still decides each.
      const candidates = compact ? 52 : 76;
      let patchAngle = 0, patchWidth = 0, patchDensity = 0;
      for (let i = 0; i < candidates; i++) {
        if (i % 6 === 0) {
          patchAngle = Math.floor(i / 6) * 2.399963 + random() * .42;
          patchWidth = .38 + random() * .16;
          patchDensity = .62 + Math.sin(patchAngle * 2.4 + territory.x * .025) * .20;
        }
        const angle = patchAngle + (i % 6 / 5 - .5) * patchWidth + random() * .035;
        const radial = getShoreRadius(territory, angle) * (.79 + random() * .11);
        const x = territory.x + Math.cos(angle) * radial, z = territory.z + Math.sin(angle) * radial;
        const radius = 2.25 + random() * 1.15;
        if (random() < patchDensity) cluster(x, z, radius, "border");
      }
      // Trailing stems are joined curves, with alternating broad leaves; their
      // roots and conservative horizontal footprint still obey approach guards.
      const vineCount = compact ? 14 : 20;
      for (let i = 0; i < vineCount; i++) {
        const angle = i / vineCount * Math.PI * 2 + Math.sin(i * 1.7) * .06;
        const shore = getShoreRadius(territory, angle), radius = shore * .985;
        const x = territory.x + Math.cos(angle) * radius, z = territory.z + Math.sin(angle) * radius;
        if (!isVegetationPocketClear(x, z, 1.6)) continue;
        const rootY = getTerrainHeight(territory.x + Math.cos(angle) * shore * .975, territory.z + Math.sin(angle) * shore * .975);
        const length = Math.min(territory.floating ? 8 : rootY - WATER_LEVEL - 1.4, 3.5 + random() * 4.2);
        if (length < 1.2) continue;
        const path: THREE.Vector3[] = [], leafCount = compact ? 7 : 10;
        for (let j = 0; j <= leafCount; j++) {
          const t = j / leafCount, out = .2 + Math.sin(t * Math.PI) * .25;
          path.push(new THREE.Vector3(x + Math.cos(angle) * out + Math.sin(t * 7) * .13,
            rootY + .12 - length * t, z + Math.sin(angle) * out + Math.cos(t * 8) * .13));
          if (j < leafCount) {
            const yaw = -angle + (j % 2 ? .95 : -.95), size = .55 + random() * .3;
            leaf(j % 4 === 0 ? "monstera" : "small", path[j], yaw, -.35, size, j + i);
            if (j === 2 && i % 5 === 0) flower(path[j].clone().add(new THREE.Vector3(0, .1, 0)), .42, -angle);
          }
        }
        stem(path, .025);
        placements.push({ x, z, radius: 1.6, kind: "vine" });
      }
      for (const kind of Object.keys(leaves) as LeafKind[]) putInstances(`${territory.id}: curved ${kind} foliage`, blades[kind], leafMaterial, leaves[kind]);
      putInstances(`${territory.id}: hibiscus corollas`, petal, petalMaterial, flowers);
      putInstances(`${territory.id}: hibiscus stamens`, pollen, pollenMaterial, centers);
      if (pendingStems.length) {
        const merged = mergeGeometries(pendingStems, false);
        if (!merged) throw new Error("Botanical stems could not be batched");
        ownGeometry(merged);
        pendingStems.forEach((geometry) => geometry.dispose()); pendingStems.length = 0;
        const mesh = new THREE.Mesh(merged, stemMaterial); mesh.name = `${territory.id}: joined botanical stems`;
        mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
      }
    }
    group.userData.placements = placements;
    group.userData.botanicalStyle = "Closed smooth upper fans, broad middle foliage and soil-rooted low coastal fringes; prototype art";
    group.userData.colliderPolicy = "Decorative soft foliage only; authored solid trunks and rocks remain in island-map";
    return { group, update(time: number, reducedMotion: boolean) { wind.value = reducedMotion ? 0 : time; }, dispose };
  } catch (error) {
    dispose(); throw error;
  }
}
