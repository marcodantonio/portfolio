import * as THREE from "three";
import { mergeGeometries, mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createIslandTerrainArt } from "./island-terrain-art";
import { createIslandBridges } from "./island-bridges";
import { createIslandOcean } from "./island-ocean";
import { createIslandArchitecture } from "./island-architecture";
import { createIslandFoundations } from "./island-foundations";
import { createHomeStudioAsset, createDigitalWorkshopAsset, createArchiveObservatoryAsset, createSuspendedLaboratoryAsset, createWelcomeHarborAsset, createDancePavilionAsset, createContactLighthouseAsset } from "./island-studio-asset";
import { createIslandRockMaterial } from "./island-materials";
import { createIslandVegetation, createPalmFrondGeometry, PALM_MAXIMUM_WIND_OFFSET } from "./island-vegetation";
import {
  getTerrainHeight, WATER_LEVEL, BOAT_DOCKS, CONTACT_DOCK, getDockPoint,
  getPalmTrunkSegments, getRockHull, ISLANDS, MAP_SCALE, WORLD_BOUNDS, WORLD_PROPS,
  type Island, type WorldProp,
} from "./island-map";

type World = {
  group: THREE.Group;
  getOverviewRoots: () => readonly THREE.Object3D[];
  update: (time: number, reducedMotion: boolean) => void;
  setNight: (night: boolean) => void;
  setCarColor: (color: string) => void;
  setViewPosition: (x: number, y: number, z: number) => void;
  consumeArtChange: () => boolean;
  studioState: () => string;
  workshopState: () => string;
  archiveState: () => string;
  laboratoryState: () => string;
  harborState: () => string;
  danceState: () => string;
  lighthouseState: () => string;
  dispose: () => void;
};

/** A small inward bevel keeps the visible silhouette inside the shared hull. */
function beveledPropRock(compact = false) {
  const hull = new THREE.IcosahedronGeometry(1, 0), positions = hull.attributes.position;
  const planes: { normal: THREE.Vector3; distance: number }[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < positions.count; i += 3) {
    a.fromBufferAttribute(positions, i); b.fromBufferAttribute(positions, i + 1); c.fromBufferAttribute(positions, i + 2);
    const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
    planes.push({ normal, distance: normal.dot(a) });
  }
  hull.dispose();
  const source = new THREE.IcosahedronGeometry(1, compact ? 1 : 2), points = source.attributes.position;
  const direction = new THREE.Vector3();
  for (let i = 0; i < points.count; i++) {
    direction.fromBufferAttribute(points, i).normalize();
    let radius = 1;
    for (const plane of planes) {
      const dot = plane.normal.dot(direction);
      if (dot > .0001) radius = Math.min(radius, plane.distance / dot);
    }
    direction.multiplyScalar(radius * .985);
    points.setXYZ(i, direction.x, direction.y, direction.z);
  }
  source.deleteAttribute("normal"); source.deleteAttribute("uv");
  const rounded = mergeVertices(source, .0001);
  source.dispose(); rounded.computeVertexNormals();
  return rounded;
}

/** Original walkable tropical scenery; every solid decoration uses the shared map. */
export function createIslandWorld({ compact = false }: { compact?: boolean } = {}): World {
  const group = new THREE.Group();
  group.name = "Tropical portfolio archipelago";
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const materials = new Set<THREE.Material>();
  const ownedSubscenes: { group: THREE.Group; dispose: () => void }[] = [];
  const temporary = new THREE.Object3D();
  let disposed = false;
  const disposeWorld = () => {
    if (disposed) return;
    disposed = true;
    ownedSubscenes.forEach((scene) => { group.remove(scene.group); scene.dispose(); });
    const geometries = new Set<THREE.BufferGeometry>();
    group.traverse((object) => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    batches.forEach((parts) => parts.forEach((geometry) => geometries.add(geometry)));
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((mat) => mat.dispose());
    batches.clear(); group.clear();
  };
  const own = <T extends { group: THREE.Group; dispose: () => void }>(scene: T): T => {
    ownedSubscenes.push(scene);
    return scene;
  };
  try {
  const palmWind = { value: 0 };
  const palette = {
    sand: material("#fbe0a9"), sandSide: material("#d5aa76"),
    rock: rockMaterial("#afa99c"), rockShade: rockMaterial("#686e74"),
    grass: material("#76b755"), grassLight: material("#bbcf69"),
    grassShade: material("#569557"), path: material("#f7d49b"),
    stone: rockMaterial("#b4aea0"), stoneLight: rockMaterial("#d4cbb0"),
    leaf: palmLeafMaterial("#4f8735"),
    leafLight: palmLeafMaterial("#82ae40"), bark: palmBarkMaterial(),
    shrub: material("#568d35"), wood: material("#b5774e"),
    woodLight: material("#da9f68"), woodDark: material("#795848"),
    rope: material("#e9cb99"), purple: material("#8961de"),
    purpleLight: material("#b793f5"), cream: material("#fff4d8"),
    coral: material("#ed807c"), blue: material("#60bed0"),
    metal: material("#485c71"), dark: material("#26354a"),
    screen: material("#9ce9db", { emissive: "#55bcae", emissiveIntensity: 0.2 }),
    flower: material("#fca0b6"), orange: material("#ffb24f"),
    glow: material("#ffe8b7", { emissive: "#ffb454", emissiveIntensity: 0.5 }),
  };
  const birdFlocks: THREE.Group[] = [];
  const clouds: THREE.Group[] = [];
  const animated: { object: THREE.Object3D; y: number; phase: number }[] = [];
  let seed = 7919;
  let baseElevation = 0;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  }
  function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
    const result = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra });
    materials.add(result);
    return result;
  }
  function rockMaterial(color: string) {
    const result = createIslandRockMaterial({ color });
    materials.add(result);
    return result;
  }
  function palmLeafMaterial(color: string) {
    const result = material(color, { roughness: .61 });
    result.onBeforeCompile = (shader) => {
      shader.uniforms.palmWindTime = palmWind;
      shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
        attribute vec4 palmLeafUV; varying vec4 vPalmLeafUV; uniform float palmWindTime;`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>
          vPalmLeafUV = palmLeafUV;
          float palmPhase = position.x * .23 + position.z * .19;
          // Shared shader time bends only soft fronds, never the trunk/root.
          // The 3.5 cm maximum stays inside the old conservative crown guard.
          float palmRestPhase = palmPhase + palmLeafUV.x * 1.7;
          float palmFlutter = (sin(palmWindTime * 1.05 + palmRestPhase) - sin(palmRestPhase))
            * ${PALM_MAXIMUM_WIND_OFFSET / 2} * palmLeafUV.z * palmLeafUV.z * palmLeafUV.x;
          transformed.y += palmFlutter;
        `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
        varying vec4 vPalmLeafUV;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float palmAcross = abs(vPalmLeafUV.y - .5);
          float palmFilter = 1. - smoothstep(.04, .2, fwidth(vPalmLeafUV.y));
          float palmVein = (1. - smoothstep(.012, .052, palmAcross)) * palmFilter;
          float palmTip = smoothstep(.08, .8, vPalmLeafUV.x);
          float palmRibCoord = vPalmLeafUV.x * 19. - palmAcross * 7.;
          float palmRibFilter = 1. - smoothstep(.2, .7, fwidth(palmRibCoord));
          float palmRibs = cos(palmRibCoord * 6.283) * .018 * palmRibFilter * palmFilter;
          // Deep petioles, fresh mid-blades and darker rolled edges remain soft
          // at a distance; PBR normals, not alternating stripes, describe volume.
          vec3 palmGradient = mix(vec3(.72, .82, .59), vec3(1.08, 1.06, .82), palmTip);
          diffuseColor.rgb *= mix(vec3(.95, .98, .72), palmGradient, vPalmLeafUV.w)
            * (1. - palmAcross * .10 + palmRibs * vPalmLeafUV.w);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.14, 1.07, .77),
            palmVein * .26 * vPalmLeafUV.w);
        `);
    };
    result.customProgramCacheKey = () => "island-pinnate-palm-leaf-v2";
    return result;
  }
  function palmBarkMaterial() {
    const result = material("#a1845e", { roughness: .85 });
    result.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
        attribute vec2 palmBarkUV; varying vec2 vPalmBarkUV;`)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvPalmBarkUV = palmBarkUV;");
      shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>
        varying vec2 vPalmBarkUV;`)
        .replace("#include <color_fragment>", `#include <color_fragment>
          float palmRingCoord = vPalmBarkUV.y * 2.7 + sin(vPalmBarkUV.x * 6.283) * .035;
          float palmRingFilter = 1. - smoothstep(.15, .7, fwidth(palmRingCoord));
          float palmRing = 1. - smoothstep(.025, .075, abs(fract(palmRingCoord) - .47));
          float palmFibreCoord = vPalmBarkUV.x * 38. + sin(vPalmBarkUV.y * 2.1) * .14;
          float palmFibreFilter = 1. - smoothstep(.3, 1., fwidth(palmFibreCoord));
          float palmFibre = sin(palmFibreCoord * 6.283) * .023 * palmFibreFilter;
          diffuseColor.rgb *= .99 + palmFibre - palmRing * .085 * palmRingFilter;
        `);
    };
    result.customProgramCacheKey = () => "island-continuous-palm-bark-v1";
    return result;
  }
  function add(
    geometry: THREE.BufferGeometry, mat: THREE.Material,
    x: number, y: number, z: number,
    scale: [number, number, number] = [1, 1, 1],
    rotation: [number, number, number] = [0, 0, 0],
  ) {
    temporary.position.set(x, y + baseElevation, z);
    temporary.scale.set(...scale);
    temporary.rotation.set(...rotation);
    temporary.updateMatrix();
    geometry.applyMatrix4(temporary.matrix);
    // Dedicated palm buckets all share indexed topology and custom botanical
    // coordinates. Keep those indices instead of uploading each leaflet vertex
    // repeatedly; mixed ordinary scenery keeps its existing flat contract.
    const indexedPalm = mat === palette.leaf || mat === palette.leafLight || mat === palette.bark;
    const flat = geometry.index && !indexedPalm ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    // Ordinary UVs are unused here; preserve owned palmLeafUV/palmBarkUV.
    flat.deleteAttribute("uv");
    const bucket = batches.get(mat) ?? [];
    bucket.push(flat);
    batches.set(mat, bucket);
  }
  function beam(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material, radiusTop = radius, barkOffset = 0) {
    const direction = b.clone().sub(a);
    const geometry = new THREE.CylinderGeometry(radiusTop, radius, direction.length(), 12);
    if (mat === palette.bark) {
      const uv = geometry.attributes.uv, barkUV: number[] = [];
      for (let i = 0; i < uv.count; i++) barkUV.push(uv.getX(i), barkOffset + uv.getY(i) * direction.length());
      geometry.setAttribute("palmBarkUV", new THREE.Float32BufferAttribute(barkUV, 2));
    }
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    geometry.applyQuaternion(rotation);
    const middle = a.clone().add(b).multiplyScalar(0.5);
    add(geometry, mat, middle.x, middle.y, middle.z);
  }
  function blob(mat: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, detail = 0) {
    add(new THREE.SphereGeometry(1, compact ? 8 : 12 + detail * 2, compact ? 6 : 8 + detail), mat,
      x, y, z, [sx, sy, sz], [0, random() * Math.PI, 0]);
  }

  function palm(prop: WorldProp) {
    const segments = getPalmTrunkSegments(prop);
    let barkOffset = 0;
    segments.forEach(({ a, b, radius, radiusTop }) => {
      beam(new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z), radius,
        palette.bark, radiusTop, barkOffset);
      barkOffset += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    });
    const crown = segments[segments.length - 1].b;
    const frondCount = compact ? 9 : 11;
    for (let i = 0; i < frondCount; i++) {
      const yaw = i * 2.399963 + prop.yaw;
      const length = (2.72 + random() * .25) * prop.scale;
      // Young/mature leaves occupy different levels without exceeding the
      // preceding pitch/length envelope used by the overview's crown guard.
      const pitch = i % 4 === 0 ? .16 : -.025 - (i % 3) * .030;
      add(createPalmFrondGeometry(length, (.58 + random() * .09) * prop.scale, compact), i % 3 ? palette.leaf : palette.leafLight,
        crown.x, crown.y, crown.z, [1, 1, 1], [0, yaw, pitch]);
    }
    for (let i = 0; i < 3; i++) {
      blob(palette.woodDark, crown.x + Math.cos(i * 2.1) * 0.23 * prop.scale, crown.y - 0.23 * prop.scale,
        crown.z + Math.sin(i * 2.1) * 0.23 * prop.scale,
        0.23 * prop.scale, 0.26 * prop.scale, 0.23 * prop.scale);
    }
  }
  function dress(island: Island) {
    WORLD_PROPS.filter((prop) => prop.island === island.id).forEach((prop) => {
      if (prop.kind === "palm") {
        palm(prop);
      } else if (prop.kind === "rock") {
        const { center, radii } = getRockHull(prop);
        add(beveledPropRock(compact), palette.stone, center.x, center.y, center.z,
          [radii.x, radii.y, radii.z], [0, prop.yaw, 0]);
      }
    });
  }

  const terrain = own(createIslandTerrainArt({ compact }));
  const bridges = own(createIslandBridges({ compact }));
  const ocean = own(createIslandOcean({ compact }));
  const architecture = own(createIslandArchitecture({ compact }));
  // Architectural footings remain independent of asynchronous GLB replacement:
  // neither a ready asset nor its fallback may leave an unsupported veranda.
  const foundations = own(createIslandFoundations({ compact }));
  const vegetation = own(createIslandVegetation({ compact }));
  const studioFallback = architecture.group.getObjectByName("Architecture: about") as THREE.Group;
  const homeStudio = own(createHomeStudioAsset(studioFallback));
  const workshopFallback = architecture.group.getObjectByName("Architecture: projects") as THREE.Group;
  const digitalWorkshop = own(createDigitalWorkshopAsset(workshopFallback));
  const archiveFallback = architecture.group.getObjectByName("Architecture: education") as THREE.Group;
  const archiveObservatory = own(createArchiveObservatoryAsset(archiveFallback));
  const laboratoryFallback = architecture.group.getObjectByName("Architecture: skills") as THREE.Group;
  const suspendedLaboratory = own(createSuspendedLaboratoryAsset(laboratoryFallback));
  const harborFallback = architecture.group.getObjectByName("Architecture: welcome") as THREE.Group;
  const welcomeHarbor = own(createWelcomeHarborAsset(harborFallback));
  const danceFallback = architecture.group.getObjectByName("Architecture: dance") as THREE.Group;
  const dancePavilion = own(createDancePavilionAsset(danceFallback));
  const contactFallback = architecture.group.getObjectByName("Architecture: contact") as THREE.Group;
  const contactLighthouse = own(createContactLighthouseAsset(contactFallback));
  // Camera fitting borrows only owned physical/architectural subtrees. Never
  // include the ocean, distant sky sprites or the moving decorative sailboat.
  // Instanced botanical buckets span several islands: their global box would
  // overfit empty corners. The overview collector adds local palm/rock guards.
  const overviewRoots = [terrain.group, bridges.group, architecture.group, foundations.group,
    homeStudio.group, digitalWorkshop.group, archiveObservatory.group, suspendedLaboratory.group, welcomeHarbor.group, dancePavilion.group, contactLighthouse.group] as const;
  ocean.setSunDirection(-30, 55, 35);
  group.add(terrain.group, bridges.group, ocean.group, architecture.group, foundations.group, vegetation.group, homeStudio.group, digitalWorkshop.group, archiveObservatory.group, suspendedLaboratory.group, welcomeHarbor.group, dancePavilion.group, contactLighthouse.group);
  ISLANDS.forEach((island) => dress(island));

  // Shared docks retain the exact authored ramps used by physics.
  for (const dock of BOAT_DOCKS) {
    const length = Math.hypot(dock.end.x - dock.start.x, dock.end.z - dock.start.z);
    const count = Math.ceil(length / .55);
    const yaw = Math.atan2(dock.end.x - dock.start.x, dock.end.z - dock.start.z);
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count;
      const { x, y, z } = getDockPoint(dock, t);
      const before = getDockPoint(dock, Math.max(0, t - .002)), after = getDockPoint(dock, Math.min(1, t + .002));
      const pitch = -Math.atan2(after.y - before.y, Math.hypot(after.x - before.x, after.z - before.z));
      const rotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch));
      const geometry = new THREE.BoxGeometry(dock.width, .22, (length / count - .02) / Math.max(.7, Math.cos(pitch)));
      geometry.applyQuaternion(rotation);
      const normalOffset = new THREE.Vector3(0, -.11, 0).applyQuaternion(rotation);
      add(geometry, palette.woodLight, x + normalOffset.x, y + normalOffset.y, z + normalOffset.z);
      if (i % 5 === 0) for (const side of [-1, 1]) {
        const px = x + Math.cos(yaw) * side * dock.width * .5, pz = z - Math.sin(yaw) * side * dock.width * .5;
        add(new THREE.CylinderGeometry(.15, .19, Math.max(1, y - WATER_LEVEL + 1.4), 12), palette.wood, px, (y + WATER_LEVEL) / 2, pz);
      }
    }
  }
  for (let i = 0; i < 14; i++) add(new THREE.BoxGeometry(CONTACT_DOCK.width, .23, CONTACT_DOCK.length / 14 - .018), palette.woodLight,
    CONTACT_DOCK.x, CONTACT_DOCK.top - .115, CONTACT_DOCK.z - CONTACT_DOCK.length / 2 + (i + .5) * CONTACT_DOCK.length / 14);

  // One small sailboat, built independently so only this group needs to bob.
  const boat = new THREE.Group();
  boat.position.set(-12 * MAP_SCALE, WATER_LEVEL + 0.36, 30 * MAP_SCALE);
  boat.rotation.y = 0.5;
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), palette.wood);
  hull.scale.set(1.2, 0.65, 2.6); boat.add(hull);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.13, 18), palette.cream);
  deck.scale.set(1.1, 1, 2.5); boat.add(deck);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 3.8, 8), palette.woodDark);
  mast.position.y = 1.9; boat.add(mast);
  const sailGeometry = new THREE.BufferGeometry();
  sailGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0.12, 3.65, 0, 0.12, 0.6, 0, 1.9, 0.6, 0.12], 3));
  sailGeometry.computeVertexNormals();
  const sailMat = palette.cream.clone(); sailMat.side = THREE.DoubleSide; materials.add(sailMat);
  boat.add(new THREE.Mesh(sailGeometry, sailMat));
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.04), palette.purple);
  stripe.position.set(0.66, 1.22, 0.055); boat.add(stripe);
  group.add(boat); animated.push({ object: boat, y: boat.position.y, phase: 0.6 });

  // Rounded offshore outcrops, rooted below the sea rather than floating discs.
  for (const [baseX, baseZ, r] of [[-40, -18, 3.6], [44, 27, 3.1], [6, -39, 2.9]]) {
    const x = baseX * MAP_SCALE, z = baseZ * MAP_SCALE;
    const outcrop = new THREE.SphereGeometry(1, 32, 24);
    const vertices = outcrop.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const px = vertices.getX(i), py = vertices.getY(i), pz = vertices.getZ(i);
      const swell = 1 + Math.sin(px * 4 + pz * 3) * 0.08 * (1 - py * py);
      vertices.setXYZ(i, px * swell, py, pz * swell);
    }
    outcrop.computeVertexNormals();
    add(outcrop, palette.rock, x, WATER_LEVEL + 0.45, z, [r, 2.9, r * 0.76]);
    blob(palette.shrub, x, 0.18, z, r * 0.5, 0.4, r * 0.4, 2);
    baseElevation = 0.15 - getTerrainHeight(x + 0.3, z);
    palm({ id: `sandbar-${baseX}`, island: "welcome", kind: "palm", x: x + 0.3, z, scale: 0.8, yaw: x });
    baseElevation = 0;
  }

  // Static parts use a single draw per material, instead of one per plank/leaf.
  batches.forEach((geometries, mat) => {
    const merged = mergeGeometries(geometries, false);
    if (merged) {
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      // Closed, single-sided leaflets cast shadows on the terrain. Receiving
      // their own fine shadow map produces a stippled/moire pattern at close range.
      mesh.receiveShadow = mat !== palette.leaf && mat !== palette.leafLight;
      mesh.name = "Batched tropical scenery";
      group.add(mesh);
    }
    geometries.forEach((geometry) => geometry.dispose());
  });
  batches.clear();

  const cloudMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), night: { value: 0 } },
    vertexShader: `varying vec2 cloudUV; varying float cloudVariant;
      #include <common>
      #include <fog_pars_vertex>
      void main() {
        cloudUV = uv;
        cloudVariant = modelMatrix[3].y * .137;
        vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        mvPosition.xy += position.xy;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying vec2 cloudUV; varying float cloudVariant; uniform float night;
      #include <common>
      #include <fog_pars_fragment>
      float cloudHash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7))) * 43758.5453); }
      float cloudNoise(vec2 p) {
        vec2 cell=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(cloudHash(cell),cloudHash(cell+vec2(1.,0.)),f.x),
          mix(cloudHash(cell+vec2(0.,1.)),cloudHash(cell+vec2(1.)),f.x),f.y);
      }
      void main() {
        float variant = cloudVariant;
        vec2 uv = cloudUV;
        vec2 edgeWarp = vec2(cloudNoise(uv*11.0+variant),
          cloudNoise(uv*13.0-variant))-.5;
        uv += edgeWarp*.022;
        float frontDepth = 0.0;
        vec3 frontNormal = vec3(0.,0.,1.);
        // Overlapping soft lobes carry an analytic curved front surface. Their
        // light/dark sides make the cloud read as volume on the same two-triangle
        // billboard, without adding low-poly spheres or image assets.
        for (int i=0;i<8;i++) {
          float fi = float(i);
          float wobble = sin(fi*2.13+variant);
          vec2 center = vec2(.12+fi*.105,
            .42+sin(fi*1.67+variant)*.07+sin(fi*.71-variant)*.035);
          vec2 radius = vec2(.105+(wobble*.5+.5)*.035,
            .17+(sin(fi*2.79-variant)*.5+.5)*.15);
          vec2 local = (uv-center)/radius;
          float depth = sqrt(max(0.0,1.0-dot(local,local)));
          if (depth > frontDepth) {
            frontDepth = depth;
            frontNormal = normalize(vec3(local.x*.66, local.y, depth));
          }
        }
        if (frontDepth < .01) discard;
        float grain = cloudNoise(uv*26.0+variant)*.72+cloudNoise(uv*63.0-variant)*.28;
        float sunlight = max(0.0,dot(frontNormal,normalize(vec3(-.5,.72,.48))));
        float light = clamp(.15+sunlight*.63+frontDepth*.16+(grain-.5)*.07,0.0,1.0);
        vec3 day = mix(vec3(.48,.63,.73),vec3(1.0,.985,.95),light);
        day *= .91+smoothstep(.2,.68,uv.y)*.09;
        vec3 dusk = mix(vec3(.13,.21,.33),vec3(.37,.44,.58),light);
        float alpha = smoothstep(.025,.22,frontDepth)*(.86+grain*.06);
        gl_FragColor=vec4(mix(day,dusk,night),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  materials.add(cloudMaterial);
  // Soft procedurally shaded cloud billboards replace repeated solid spheres.
  // These distant atmospheric sprites never replace playable world geometry.
  const cloudCount = compact ? 5 : 7;
  const skyWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
  for (let i = 0; i < cloudCount; i++) {
    const cloud = new THREE.Group();
    cloud.position.set(WORLD_BOUNDS.minX + (i+.35)/cloudCount*skyWidth + Math.sin(i*2.17)*19,
      58 + Math.sin(i*1.73)*15 + i%2*9,
      WORLD_BOUNDS.minZ - 75 - (Math.cos(i*.91)*.5+.5)*85);
    cloud.userData.baseX = cloud.position.x;
    const width = 54 + i%3*12 + Math.cos(i*1.47)*6;
    const height = width*(.48+Math.sin(i*1.31)*.08);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), cloudMaterial);
    mesh.frustumCulled = false;
    cloud.add(mesh);
    group.add(cloud); clouds.push(cloud);
  }

  for (let i = 0; i < 4; i++) {
    const bird = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), palette.cream);
    body.scale.set(0.8, 0.7, 1.7); bird.add(body);
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 3), palette.cream);
      wing.rotation.z = side * 1.1; wing.position.x = side * 0.27; bird.add(wing);
    }
    bird.userData.phase = i * 1.7;
    group.add(bird); birdFlocks.push(bird);
  }

  return {
    group,
    getOverviewRoots: () => overviewRoots,
    setCarColor: architecture.setCarColor,
    setViewPosition: architecture.setViewPosition,
    consumeArtChange() {
      // Consume each independently: short-circuit OR would leave one dirty.
      const studioChanged = homeStudio.consumeChange(), workshopChanged = digitalWorkshop.consumeChange(), archiveChanged = archiveObservatory.consumeChange(), laboratoryChanged = suspendedLaboratory.consumeChange(), harborChanged = welcomeHarbor.consumeChange(), danceChanged = dancePavilion.consumeChange(), lighthouseChanged = contactLighthouse.consumeChange();
      return studioChanged || workshopChanged || archiveChanged || laboratoryChanged || harborChanged || danceChanged || lighthouseChanged;
    },
    studioState: () => homeStudio.state,
    workshopState: () => digitalWorkshop.state,
    archiveState: () => archiveObservatory.state,
    laboratoryState: () => suspendedLaboratory.state,
    harborState: () => welcomeHarbor.state,
    danceState: () => dancePavilion.state,
    lighthouseState: () => contactLighthouse.state,
    update(time, reducedMotion) {
      const t = reducedMotion ? 0 : time;
      palmWind.value = t;
      ocean.update(time, reducedMotion);
      architecture.update(time, reducedMotion);
      vegetation.update(time, reducedMotion);
      clouds.forEach((cloud, i) => { cloud.position.x = cloud.userData.baseX + Math.sin(t * .012 + i) * 2; });
      animated.forEach(({ object, y, phase }) => {
        object.position.y = y + Math.sin(t * 1.1 + phase) * 0.075;
        object.rotation.z = Math.sin(t * 0.75 + phase) * 0.035;
      });
      birdFlocks.forEach((bird, i) => {
        const phase = bird.userData.phase as number;
        const angle = t * 0.075 + phase;
        bird.position.set((4 + Math.cos(angle) * (16 + i * 3)) * MAP_SCALE,
          16 + Math.sin(t * 0.4 + phase) * 0.25 + i,
          (5 + Math.sin(angle) * (12 + i * 2)) * MAP_SCALE);
        bird.rotation.y = -angle;
        bird.children[1].rotation.z = -1.15 + Math.sin(t * 4 + phase) * 0.18;
        bird.children[2].rotation.z = 1.15 - Math.sin(t * 4 + phase) * 0.18;
      });
    },
    setNight(night) {
      ocean.setNight(night);
      architecture.setNight(night);
      homeStudio.setNight(night);
      digitalWorkshop.setNight(night);
      archiveObservatory.setNight(night);
      suspendedLaboratory.setNight(night);
      welcomeHarbor.setNight(night);
      dancePavilion.setNight(night);
      contactLighthouse.setNight(night);
      cloudMaterial.uniforms.night.value = night ? 1 : 0;
      palette.screen.emissiveIntensity = night ? 0.9 : 0.2;
    },
    dispose: disposeWorld,
  };
  } catch (error) {
    disposeWorld();
    throw error;
  }
}
