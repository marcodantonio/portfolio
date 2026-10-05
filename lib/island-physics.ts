import RAPIER from "@dimforge/rapier3d-compat";
import { getFoundationHulls } from "./island-foundation-map";
import { BOAT_DOCKS, BRIDGES, BRIDGE_WIDTH, CONTACT_DOCK, getDockMesh, getGroundHeight, getBridgeMesh, getBridgePoint, getBridgeProfile, getPalmTrunkSegments, getRockHull, getTerrainHeight, getTerrainMesh, TERRITORIES, isDockWalkable, isWalkable, SPAWN, WATER_LEVEL, WORLD_PROPS, WORLD_STRUCTURE_HULLS, WORLD_SUPPORT_DECKS } from "./island-map";

export type IslandPhysicsState = { x: number; y: number; z: number; grounded: boolean };
export type IslandPhysics = {
  /** Desired horizontal world velocity in units/second; dt is seconds. */
  update: (dx: number, dz: number, dt: number) => IslandPhysicsState;
  jump: () => void;
  /** Pause/blur must stop momentum and queued jumps as well as held input. */
  stop: () => void;
  teleport: (x: number, z: number) => void;
  dispose: () => void;
};

const STEP = 1 / 60;
const MAX_STEPS = 6;
const GRAVITY = 22;
const JUMP_SPEED = 7.5;
const RADIUS = 0.32;
const HALF_HEIGHT = 0.7;
const OFFSET = 0.025;
const STANDING_Y = HALF_HEIGHT + RADIUS + OFFSET;
const ACCELERATION = 38;
const BRAKING = 64;
const JUMP_BUFFER = 0.12;
const onLand = (x: number, z: number) => isWalkable(x, z) || isDockWalkable(x, z);
const groundHeight = getGroundHeight;
let initialization: Promise<void> | undefined;

/** The compat package embeds WASM; repeated/StrictMode mounts share initialization. */
async function initializeRapier() {
  initialization ??= RAPIER.init().catch((error: unknown) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
}

/**
 * Rapier owns contact resolution and vertical motion. Shared map geometry adds
 * forgiving shoreline safety, so reading a portfolio never requires swimming.
 * Returned y is the explorer's foot/root height, not the capsule's center.
 */
export async function createIslandPhysics(): Promise<IslandPhysics> {
  await initializeRapier();
  const world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  world.timestep = STEP;

  try {
    for (const island of TERRITORIES) {
      const { vertices, indices } = getTerrainMesh(island);
      world.createCollider(
        RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES)
          .setFriction(0.8),
      );
    }
    for (const deck of WORLD_SUPPORT_DECKS) {
      world.createCollider(RAPIER.ColliderDesc.cuboid(deck.width / 2, deck.thickness / 2, deck.depth / 2)
        .setTranslation(deck.x, deck.top - deck.thickness / 2, deck.z)
        .setRotation({ x: 0, y: Math.sin(deck.yaw / 2), z: 0, w: Math.cos(deck.yaw / 2) }).setFriction(0.8));
    }
    for (const dock of BOAT_DOCKS) {
      const { vertices, indices } = getDockMesh(dock);
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.8));
    }
    for (const [from, to] of BRIDGES) {
      const { vertices, indices } = getBridgeMesh(from, to);
      world.createCollider(RAPIER.ColliderDesc.trimesh(vertices, indices, RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(0.8));
      const { yaw, length } = getBridgeProfile(from, to);
      for (const side of [-1, 1]) {
        const offset = side * (BRIDGE_WIDTH / 2 + 0.1), railVertices: number[] = [], railIndices: number[] = [];
        for (let i = 0; i <= 64; i++) {
          const p = getBridgePoint(from, to, i / 64), x = p.x + Math.cos(yaw) * offset, z = p.z - Math.sin(yaw) * offset;
          railVertices.push(x, p.y - 0.05, z, x, p.y + 1.05, z);
          if (i < 64) { const k = i * 2; railIndices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        }
        world.createCollider(RAPIER.ColliderDesc.trimesh(new Float32Array(railVertices), new Uint32Array(railIndices), RAPIER.TriMeshFlags.FIX_INTERNAL_EDGES_TWO_SIDED));
        const intervals = Math.max(2, Math.ceil(length / 3.2));
        for (let i = 0; i <= intervals; i++) {
          const p = getBridgePoint(from, to, i / intervals);
          world.createCollider(RAPIER.ColliderDesc.cylinder(0.675, 0.12)
            .setTranslation(p.x + Math.cos(yaw) * offset, p.y + 0.575, p.z - Math.sin(yaw) * offset));
        }
      }
    }

    world.createCollider(
      RAPIER.ColliderDesc.cuboid(CONTACT_DOCK.width / 2, 0.09, CONTACT_DOCK.length / 2)
        .setTranslation(CONTACT_DOCK.x, CONTACT_DOCK.top - 0.09, CONTACT_DOCK.z),
    );

    for (const prop of WORLD_PROPS) {
      if (prop.kind === "palm") {
        for (const { a, b, radius, radiusTop } of getPalmTrunkSegments(prop)) {
          const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          const length = Math.hypot(dx, dy, dz);
          const rotationLength = Math.hypot(dz / length, -dx / length, 1 + dy / length);
          const vertices: number[] = [];
          // A tapered seven-sided convex trunk follows the same art beam.
          for (const [y, r] of [[-length / 2, radius], [length / 2, radiusTop]]) {
            for (let side = 0; side < 7; side++) {
              const angle = side / 7 * Math.PI * 2;
              vertices.push(Math.sin(angle) * r, y, Math.cos(angle) * r);
            }
          }
          const hull = RAPIER.ColliderDesc.convexHull(new Float32Array(vertices));
          if (hull) world.createCollider(hull
            .setTranslation((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2)
            .setRotation({ x: dz / length / rotationLength, y: 0, z: -dx / length / rotationLength, w: (1 + dy / length) / rotationLength }));
        }
      } else if (prop.kind === "rock") {
        const { center, vertices } = getRockHull(prop);
        const hull = RAPIER.ColliderDesc.convexHull(vertices);
        if (hull) world.createCollider(hull.setTranslation(center.x, center.y, center.z));
      }
    }
    for (const hull of WORLD_STRUCTURE_HULLS) {
      const descriptor = hull.kind === "cylinder"
        ? RAPIER.ColliderDesc.cylinder(hull.height / 2, hull.radius!)
        : RAPIER.ColliderDesc.cuboid(hull.width / 2, hull.height / 2, hull.depth / 2);
      world.createCollider(descriptor.setTranslation(hull.x, hull.y, hull.z)
        .setRotation({ x: 0, y: Math.sin(hull.yaw / 2), z: 0, w: Math.cos(hull.yaw / 2) }));
    }
    // These solids stop below existing deck undersides. They are architectural
    // supports, never invisible replacement terrain or another walking floor.
    for (const hull of getFoundationHulls()) {
      world.createCollider(RAPIER.ColliderDesc.cuboid(hull.width / 2, hull.height / 2, hull.depth / 2)
        .setTranslation(hull.x, hull.y, hull.z)
        .setRotation({ x: 0, y: Math.sin(hull.yaw / 2), z: 0, w: Math.cos(hull.yaw / 2) }));
    }

    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(SPAWN.x, STANDING_Y + getTerrainHeight(SPAWN.x, SPAWN.z), SPAWN.z)
        .setCanSleep(false),
    );
    const collider = world.createCollider(RAPIER.ColliderDesc.capsule(HALF_HEIGHT, RADIUS), body);
    const controller = world.createCharacterController(OFFSET);
    controller.setSlideEnabled(true);
    controller.enableAutostep(0.28, 0.2, false);
    controller.enableSnapToGround(0.4);
    controller.setMaxSlopeClimbAngle(Math.PI / 4);
    controller.setMinSlopeSlideAngle(Math.PI / 3);
    controller.setApplyImpulsesToDynamicBodies(false);

    let accumulator = 0, verticalVelocity = 0, grounded = true, disposed = false;
    let velocityX = 0, velocityZ = 0, jumpBuffer = 0;
    let lastSafe = { ...SPAWN };
    let state: IslandPhysicsState = { x: SPAWN.x, y: getTerrainHeight(SPAWN.x, SPAWN.z), z: SPAWN.z, grounded: true };
    // Register the newly created geometry in Rapier's broad phase before queries.
    world.step();

    const readState = () => {
      const position = body.translation();
      state = { x: position.x, y: position.y - STANDING_Y, z: position.z, grounded };
      return state;
    };

    const teleport = (x: number, z: number) => {
      if (disposed) return;
      const valid = Number.isFinite(x) && Number.isFinite(z) && onLand(x, z);
      const safeX = valid ? x : lastSafe.x, safeZ = valid ? z : lastSafe.z;
      const groundY = groundHeight(safeX, safeZ);
      const translation = { x: safeX, y: STANDING_Y + groundY, z: safeZ };
      if (valid) lastSafe = { x, z };
      body.setTranslation(translation, true);
      body.setNextKinematicTranslation(translation);
      world.propagateModifiedBodyPositionsToColliders();
      accumulator = 0; verticalVelocity = 0; grounded = true;
      velocityX = 0; velocityZ = 0; jumpBuffer = 0;
      world.step();
      readState();
    };

    return {
      update(dx, dz, dt) {
        if (disposed) return state;
        let vx = Number.isFinite(dx) ? dx : 0, vz = Number.isFinite(dz) ? dz : 0;
        const speed = Math.hypot(vx, vz);
        if (speed > 18) { vx *= 18 / speed; vz *= 18 / speed; }
        const delta = Number.isFinite(dt) ? Math.max(0, Math.min(STEP * MAX_STEPS, dt)) : 0;
        accumulator = Math.min(accumulator + delta, STEP * MAX_STEPS);
        while (accumulator + 1e-9 >= STEP) {
          accumulator = Math.max(0, accumulator - STEP);
          const current = body.translation();
          const differenceX = vx - velocityX, differenceZ = vz - velocityZ;
          const difference = Math.hypot(differenceX, differenceZ);
          const acceleration = (Math.hypot(vx, vz) < 0.01 ? BRAKING : ACCELERATION) * (grounded ? 1 : 0.6);
          const blend = difference > 0 ? Math.min(1, acceleration * STEP / difference) : 0;
          velocityX += differenceX * blend; velocityZ += differenceZ * blend;
          let sx = velocityX * STEP, sz = velocityZ * STEP;
          if (!onLand(current.x + sx, current.z + sz)) {
            // Retain tangential movement along shores instead of sticking abruptly.
            sx = onLand(current.x + sx, current.z) ? sx : 0;
            sz = onLand(current.x + sx, current.z + sz) ? sz : 0;
          }
          if (jumpBuffer > 0 && grounded) {
            verticalVelocity = JUMP_SPEED; grounded = false; jumpBuffer = 0;
          }
          jumpBuffer = Math.max(0, jumpBuffer - STEP);
          verticalVelocity = Math.max(-24, verticalVelocity - GRAVITY * STEP);
          controller.computeColliderMovement(collider, { x: sx, y: verticalVelocity * STEP, z: sz });
          const movement = controller.computedMovement();
          grounded = verticalVelocity <= 0 && controller.computedGrounded();
          if (grounded) verticalVelocity = 0;
          const next = {
            x: current.x + movement.x,
            y: current.y + movement.y,
            z: current.z + movement.z,
          };
          // A contact-induced slide can slightly alter the desired horizontal path.
          if (!onLand(next.x, next.z)) { next.x = current.x; next.z = current.z; }
          body.setNextKinematicTranslation(next);
          world.step();
          // At an embedded timber/terrain seam Rapier can report no contact for
          // one frame while the capsule is visibly supported. Keep jump input
          // reliable there, without snapping a genuinely airborne capsule.
          const footGap = body.translation().y - STANDING_Y - groundHeight(next.x, next.z);
          if (verticalVelocity <= 0 && footGap > -0.1 && footGap < 0.075) { grounded = true; verticalVelocity = 0; }
          if (grounded && onLand(next.x, next.z)) lastSafe = { x: next.x, z: next.z };
          if (!Number.isFinite(next.y) || next.y < WATER_LEVEL - 1) {
            teleport(lastSafe.x, lastSafe.z);
            break;
          }
        }
        return readState();
      },
      jump() {
        if (!disposed) jumpBuffer = JUMP_BUFFER;
      },
      stop() { velocityX = 0; velocityZ = 0; jumpBuffer = 0; },
      teleport,
      dispose() {
        if (disposed) return;
        disposed = true;
        world.free();
      },
    };
  } catch (error) {
    world.free();
    throw error;
  }
}
