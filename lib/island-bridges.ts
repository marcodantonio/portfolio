import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BRIDGES, BRIDGE_WIDTH, getBridgePoint, getBridgeProfile, type IslandId } from "./island-map";
import { createIslandTimberMaterial } from "./island-materials";

const UP = new THREE.Vector3(0, 1, 0);
const DECK_THICKNESS = 0.28;
const ROPE_SIDE = BRIDGE_WIDTH / 2 + 0.1;

function timberMaterial(color: string) {
  return createIslandTimberMaterial({ color, roughness: .91 });
}

/** Suspended timber bridges follow the same curved deck profile as Rapier. */
export function createIslandBridges({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group();
  group.name = "Suspended tropical bridges";
  const planks = ["#ac713e", "#bf844b", "#cb9257", "#b97b41"].map(timberMaterial);
  const structure = timberMaterial("#895730");
  const endGrain = timberMaterial("#d2a66b");
  const rope = new THREE.MeshStandardMaterial({ color: "#ead5a4", roughness: 1 });
  const braid = new THREE.MeshStandardMaterial({ color: "#bda579", roughness: 1 });
  const hardware = new THREE.MeshStandardMaterial({ color: "#6e6051", roughness: 0.74, metalness: 0.13 });
  const violet = new THREE.MeshStandardMaterial({ color: "#8253b9", roughness: 0.85 });
  const materials = [...planks, structure, endGrain, rope, braid, hardware, violet];
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const geometries: THREE.BufferGeometry[] = [];
  const temporary = new THREE.Object3D();

  function add(geometry: THREE.BufferGeometry, material: THREE.Material, point: THREE.Vector3, quaternion = new THREE.Quaternion(), grainAlongY = false) {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    const vertices = flat.getAttribute("position");
    const grain = new Float32Array(vertices.count * 2);
    // Constant offsets change only the material domain, not geometry or fibre
    // direction. Otherwise every batched board would repeat the same knot.
    const seed = (salt: number) => {
      const value = Math.sin(point.x * 12.9898 + point.y * 7.17 + point.z * 78.233 + salt) * 43758.5453;
      return value - Math.floor(value);
    };
    const alongOffset = seed(3.1) * 137, acrossOffset = seed(19.7) * 29;
    for (let i = 0; i < vertices.count; i++) {
      grain[i * 2] = (grainAlongY ? vertices.getY(i) : vertices.getX(i)) + alongOffset;
      grain[i * 2 + 1] = (grainAlongY ? Math.atan2(vertices.getZ(i), vertices.getX(i)) * 0.12 : vertices.getZ(i)) + acrossOffset;
    }
    flat.setAttribute("bridgeGrain", new THREE.BufferAttribute(grain, 2));
    // Every batched primitive has one explicit attribute contract; retain the
    // smooth normals from rounded boxes, cylinders, and tubes.
    flat.deleteAttribute("uv");
    temporary.position.copy(point);
    temporary.quaternion.copy(quaternion);
    temporary.scale.setScalar(1);
    temporary.updateMatrix();
    flat.applyMatrix4(temporary.matrix);
    const parts = batches.get(material) ?? [];
    parts.push(flat);
    batches.set(material, parts);
  }

  function roundedBox(material: THREE.Material, point: THREE.Vector3, width: number, height: number, depth: number, quaternion: THREE.Quaternion, radius = 0.04) {
    add(new RoundedBoxGeometry(width, height, depth, 1, radius), material, point, quaternion);
  }

  function tube(points: THREE.Vector3[], radius: number, material: THREE.Material, segments: number, radialSegments = 7) {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, radialSegments, false), material, new THREE.Vector3());
  }

  function bridge(from: IslandId, to: IslandId, bridgeIndex: number) {
    const elegant = from === "dance" || to === "dance";
    const profile = getBridgeProfile(from, to);
    const across = new THREE.Vector3(Math.cos(profile.yaw), 0, -Math.sin(profile.yaw));
    const yaw = new THREE.Quaternion().setFromAxisAngle(UP, profile.yaw);
    const plankCount = Math.max(3, Math.ceil(profile.length / 0.52));
    const intervalCount = Math.max(2, Math.ceil(profile.length / 3.2));
    const plankLength = profile.length / plankCount;
    const point = (t: number, side = 0, height = 0) => {
      const p = getBridgePoint(from, to, Math.max(0, Math.min(1, t)));
      return new THREE.Vector3(p.x + across.x * side, p.y + height, p.z + across.z * side);
    };
    const pitch = (t: number) => {
      const a = getBridgePoint(from, to, Math.max(0, t - 0.001));
      const b = getBridgePoint(from, to, Math.min(1, t + 0.001));
      return Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z));
    };

    // Rounded edges, a small deliberate joint, and four restrained timber
    // tones make individual planks readable without noisy random deformation.
    for (let i = 0; i < plankCount; i++) {
      const t = (i + 0.5) / plankCount;
      const slope = pitch(t);
      const rotation = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slope));
      const center = point(t);
      // Offset along the board normal so the center of its upper face stays
      // on the nominal walkable curve, including ascending/descending ramps.
      center.add(new THREE.Vector3(0, -DECK_THICKNESS / 2, 0).applyQuaternion(rotation));
      const wood = elegant ? planks[i % 4 === 0 ? 1 : 2] : planks[(i * 7 + bridgeIndex * 3 + Math.floor(i / 5)) % planks.length];
      roundedBox(wood, center, BRIDGE_WIDTH, DECK_THICKNESS,
        (plankLength - 0.026) / Math.max(0.8, Math.cos(slope)), rotation, 0.045);

      // Recessed-looking forged pegs at the board edges; they are only a few
      // millimetres proud of the deck and do not introduce traversal obstacles.
      if (i % (compact ? 4 : 2) === 0) for (const side of [-1, 1]) {
        const peg = center.clone().add(new THREE.Vector3(side * (BRIDGE_WIDTH / 2 - 0.22), DECK_THICKNESS / 2 + 0.003, 0).applyQuaternion(rotation));
        add(new THREE.CylinderGeometry(0.028, 0.028, 0.008, 8), hardware, peg, rotation);
      }
    }

    const railSamples = Math.max(24, Math.ceil(profile.length * (compact ? 1.3 : 3)));
    for (const side of [-1, 1]) {
      const upper: THREE.Vector3[] = [], lower: THREE.Vector3[] = [], bearer: THREE.Vector3[] = [];
      for (let i = 0; i <= railSamples; i++) {
        const t = i / railSamples;
        const span = t * intervalCount;
        // Hand ropes sag between their knots as well as following the bridge.
        const localSag = Math.sin((span - Math.floor(span)) * Math.PI) * 0.06;
        upper.push(point(t, side * ROPE_SIDE, 0.95 - localSag));
        lower.push(point(t, side * ROPE_SIDE, 0.45 - localSag * 0.65));
        bearer.push(point(t, side * (BRIDGE_WIDTH / 2 - 0.2), -0.34));
      }
      tube(upper, 0.065, rope, railSamples, compact ? 6 : 8);
      tube(lower, 0.046, rope, railSamples, compact ? 5 : 7);
      tube(bearer, 0.1, braid, railSamples, compact ? 6 : 8);
      if (elegant) {
        // The pavilion approach is an arched crafted balustrade, distinct from
        // the rope suspension bridges but with the same forgiving controls.
        tube(upper.map((p) => p.clone().add(new THREE.Vector3(0, .055, 0))), .07, endGrain, railSamples, 8);
        for (let i = 0; i <= intervalCount * 3; i++) {
          const t = i / (intervalCount * 3);
          add(new THREE.CylinderGeometry(.043, .055, .75, 8), endGrain, point(t, side * ROPE_SIDE, .52));
        }
      }

      // Two subtle twisted strands give the near handrail a braided silhouette.
      for (const phase of compact ? [] : [0, Math.PI]) {
        const strand: THREE.Vector3[] = [];
        for (let i = 0; i <= railSamples * 2; i++) {
          const t = i / (railSamples * 2), span = t * intervalCount;
          const angle = t * profile.length * 11 + phase;
          const p = point(t, side * ROPE_SIDE + Math.cos(angle) * 0.051,
            0.95 - Math.sin((span - Math.floor(span)) * Math.PI) * 0.06 + Math.sin(angle) * 0.051);
          strand.push(p);
        }
        tube(strand, 0.012, braid, railSamples * 2, 5);
      }
    }

    for (let i = 0; i <= intervalCount; i++) {
      const t = i / intervalCount;
      const slope = pitch(t);
      const rotation = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -slope));
      roundedBox(structure, point(t, 0, -0.36), BRIDGE_WIDTH + 0.62, 0.23, 0.26, rotation, 0.05);
      for (const side of [-1, 1]) {
        const post = point(t, side * ROPE_SIDE, 0.575);
        add(new THREE.CylinderGeometry(0.12, 0.13, 1.35, compact ? 8 : 12), structure, post, yaw, true);
        add(new THREE.SphereGeometry(0.145, compact ? 8 : 12, compact ? 6 : 8), endGrain, point(t, side * ROPE_SIDE, 1.27));
        // Rope wraps continue around the post rather than terminating in air.
        for (const h of compact ? [0.95] : [0.895, 0.95, 1.005]) {
          const knot = new THREE.TorusGeometry(0.155, compact ? 0.06 : 0.033, compact ? 5 : 6, compact ? 10 : 14);
          add(knot, rope, point(t, side * ROPE_SIDE, h), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
        }
        if (i === 0 || i === intervalCount) {
          // Violet bindings distinguish the landing from the suspended span.
          add(new THREE.CylinderGeometry(0.134, 0.134, 0.18, 12), violet, point(t, side * ROPE_SIDE, 0.22), yaw);
          const braceA = point(t, side * ROPE_SIDE, 0.68);
          const braceB = point(i === 0 ? Math.min(0.045, 0.8 / profile.length) : Math.max(0.955, 1 - 0.8 / profile.length), side * ROPE_SIDE, -0.24);
          const direction = braceB.clone().sub(braceA);
          const braceRotation = new THREE.Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
          add(new THREE.CylinderGeometry(0.06, 0.06, direction.length(), 9), structure,
            braceA.add(braceB).multiplyScalar(0.5), braceRotation, true);
        }
      }
    }
  }

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    for (const parts of batches.values()) parts.forEach((geometry) => geometry.dispose());
    batches.clear();
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    group.clear();
  };
  try {
    BRIDGES.forEach(([from, to], index) => {
      bridge(from, to, index);
      // Material batching is local to each bridge so a close-up camera can
      // cull the other spans instead of drawing the entire archipelago.
      for (const [material, parts] of batches) {
        const geometry = mergeGeometries(parts);
        if (!geometry) throw new Error("Bridge geometry could not be merged");
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${from}-${to}-timber-and-rope`;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      for (const parts of batches.values()) parts.forEach((geometry) => geometry.dispose());
      batches.clear();
    });
    return { group, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
