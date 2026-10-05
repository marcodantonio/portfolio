import * as THREE from "three";
import { createIslandRockMaterial } from "./island-materials";
import { getSeaCliffRadius, SEA_CLIFF_FOUNDATION_Y } from "./island-coast";
import {
  ARCHITECTURE, CONTACT_DOCK,
  getIslandLandmark, getShoreRadius, getStationApproach, getTerrainMesh,
  ISLANDS, TERRITORIES, TERRAIN_ANGULAR_SEGMENTS, WATER_LEVEL, WORLD_BOUNDS, WORLD_PROPS, WORLD_STATIONS, WORLD_SUPPORT_DECKS, WALK_PATHS, type TerrainIsland,
} from "./island-map";

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

type CliffBuffers = { positions: number[]; normals: number[]; colors: number[] };
const stoneHash = (value: number) => {
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const groundNoise = (x: number, z: number) => {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const hash = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), sx),
    THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), sx), sz);
};

/** Low grounded coasts; only Skills has a tapered suspended underside.
 * Every playable top vertex remains Rapier's exact terrain.
 */
export function createIslandTerrainArt({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group();
  group.name = "Sculpted island terrain";
  const ownedGeometry: THREE.BufferGeometry[] = [];
  const topMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93 });
  const cliffMaterial = createIslandRockMaterial({ vertexColors: true });
  const foliageMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .86 });
  const materials = [topMaterial, cliffMaterial, foliageMaterial];
  const sand = new THREE.Color("#f5dfa9"), grass = new THREE.Color("#6fa43e");
  const moss = new THREE.Color("#a3b94f"), damp = new THREE.Color("#b5a183");
  const cliffLight = new THREE.Color("#cec9bb"), cliffDark = new THREE.Color("#727771");
  const sandstone = new THREE.Color("#b4a78c");
  const leafLight = new THREE.Color("#7ca849"), leafDark = new THREE.Color("#35552c");
  const pathColor = new THREE.Color("#edce97");
  const limestone = new THREE.Color("#e0d2b6"), warmEarth = new THREE.Color("#c5ad82");
  const plantSoil = new THREE.Color("#658d3b"), groundColor = new THREE.Color();
  const color = new THREE.Color();
  // Art-only land use: occupied clearings become pale worn ground, while plants
  // keep irregular green pockets. All anchors/footprints come from the map;
  // neither these masks nor their soft edges are new surfaces or collision.
  const groundPatches = ISLANDS.flatMap((area) => {
    const deck = WORLD_SUPPORT_DECKS.find((entry) => entry.island === area.id);
    const size = deck ?? ARCHITECTURE[area.id], anchor = deck ?? getIslandLandmark(area);
    const warmth = area.id === "projects" || area.id === "tesla" ? .6 : area.id === "welcome" || area.id === "dance" ? .45 : .22;
    return [
      { territory: area.territory, x: anchor.x, z: anchor.z, width: (size?.width ?? Math.min(area.radius * 1.4, 20)) + 2,
        depth: (size?.depth ?? Math.min(area.radius * 1.15, 17)) + 2, yaw: deck?.yaw ?? 0, strength: .95, warmth },
      { territory: area.territory, ...area.entrance, width: THREE.MathUtils.clamp(area.radius * .78, 9, 14),
        depth: 10.5, yaw: 0, strength: .91, warmth: warmth + .12 },
    ];
  });
  const plantedPockets = WORLD_PROPS.filter((prop) => prop.kind !== "rock").map((prop) => ({
    ...prop, territory: ISLANDS.find((area) => area.id === prop.island)!.territory,
    radius: prop.kind === "palm" ? 2.2 + prop.scale * .9 : 1.9 + prop.scale * 1.15,
  }));
  // Paths are part of the ground material, not a second, differently triangulated
  // surface. The filtered world-space field cannot float, clip or z-fight on hills.
  const pathResolution = compact ? 1024 : 2048;
  const pathPixels = new Uint8Array(pathResolution * pathResolution);
  const worldWidth = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
  const worldDepth = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
  const pathTexture = new THREE.DataTexture(pathPixels, pathResolution, pathResolution, THREE.RedFormat);
  pathTexture.minFilter = THREE.LinearMipmapLinearFilter;
  pathTexture.magFilter = THREE.LinearFilter;
  pathTexture.generateMipmaps = true;
  const pathTransform = new THREE.Vector4(1 / worldWidth, 1 / worldDepth,
    -WORLD_BOUNDS.minX / worldWidth, -WORLD_BOUNDS.minZ / worldDepth);
  let disposed = false;
  const disposeTerrain = () => {
    if (disposed) return;
    disposed = true;
    ownedGeometry.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    pathTexture.dispose(); group.clear();
  };
  try {

  function paintPath(ax: number, az: number, bx: number, bz: number, width: number) {
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz);
    const lengthSquared = length * length || 1;
    const sx = length ? -dz / length : 0, sz = length ? dx / length : 0;
    const radius = width / 2, margin = radius + 0.9;
    const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - margin - WORLD_BOUNDS.minX) / worldWidth * pathResolution));
    const x1 = Math.min(pathResolution - 1, Math.ceil((Math.max(ax, bx) + margin - WORLD_BOUNDS.minX) / worldWidth * pathResolution));
    const z0 = Math.max(0, Math.floor((Math.min(az, bz) - margin - WORLD_BOUNDS.minZ) / worldDepth * pathResolution));
    const z1 = Math.min(pathResolution - 1, Math.ceil((Math.max(az, bz) + margin - WORLD_BOUNDS.minZ) / worldDepth * pathResolution));
    for (let row = z0; row <= z1; row++) for (let column = x0; column <= x1; column++) {
      const x = WORLD_BOUNDS.minX + (column + 0.5) / pathResolution * worldWidth;
      const z = WORLD_BOUNDS.minZ + (row + 0.5) / pathResolution * worldDepth;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / lengthSquared, 0, 1);
      const bend = Math.sin(t * Math.PI) * Math.sin(length) * 0.38;
      const distance = Math.hypot(x - ax - t * dx - sx * bend, z - az - t * dz - sz * bend);
      const edge = radius + Math.sin(x * 1.25 + Math.cos(z * 0.9)) * 0.055;
      const coverage = Math.round((1 - smooth(edge - 0.13, edge + 0.34, distance)) * 255);
      const index = row * pathResolution + column;
      pathPixels[index] = Math.max(pathPixels[index], coverage);
    }
  }

  // Land use is authored with the real footprints below. Mineral aprons get
  // irregular, shallow limestone joints; paths remain compacted earth, planted
  // pockets turf and the shoreline wet sand. This is a surface finish, not an
  // extra walking mesh, raised tiles or a change to Rapier's terrain vertices.
  topMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.terrainPathMap = { value: pathTexture };
    shader.uniforms.terrainPathTransform = { value: pathTransform };
    shader.uniforms.terrainPathColor = { value: pathColor };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `
      #include <common>
      attribute vec3 groundSurface;
      varying vec3 vTerrainWorld;
      varying vec3 vGroundSurface;
    `).replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vTerrainWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vGroundSurface = groundSurface;
    `);
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `
      #include <common>
      varying vec3 vTerrainWorld;
      varying vec3 vGroundSurface;
      uniform sampler2D terrainPathMap;
      uniform vec4 terrainPathTransform;
      uniform vec3 terrainPathColor;
      float terrainHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float terrainNoise(vec2 p) {
        vec2 cell = floor(p), blend = fract(p);
        blend = blend * blend * (3.0 - 2.0 * blend);
        return mix(mix(terrainHash(cell), terrainHash(cell + vec2(1., 0.)), blend.x),
          mix(terrainHash(cell + vec2(0., 1.)), terrainHash(cell + vec2(1., 1.)), blend.x), blend.y);
      }
      float terrainFilteredNoise(vec2 p) {
        float footprint = max(length(dFdx(p)), length(dFdy(p)));
        return mix(.5, terrainNoise(p), 1. - smoothstep(.3, 1.2, footprint));
      }
      // A stationary irregular stone field, in metres, rather than a checker
      // texture or uniformly spaced grid. Distances are filtered in screen
      // space so the same apron resolves gently in walking and overview shots.
      vec3 terrainStoneField(vec2 p) {
        vec2 cell = floor(p), local = fract(p);
        float first = 12., second = 12., tint = .5;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 neighbour = vec2(float(i), float(j));
          vec2 id = cell + neighbour;
          vec2 centre = .18 + .64 * vec2(terrainHash(id + vec2(7.1, 31.7)),
            terrainHash(id + vec2(41.3, 9.2)));
          vec2 delta = neighbour + centre - local;
          float distanceSquared = dot(delta, delta);
          if (distanceSquared < first) {
            second = first; first = distanceSquared;
            tint = terrainHash(id + vec2(13.2, 67.4));
          } else { second = min(second, distanceSquared); }
        }
        return vec3(sqrt(max(second, 0.)) - sqrt(max(first, 0.)), tint, first);
      }
    `).replace("#include <color_fragment>", `
      #include <color_fragment>
      float paintCloud = terrainFilteredNoise(vTerrainWorld.xz * .22);
      float paintGrain = terrainFilteredNoise(vTerrainWorld.xz * 2.8);
      float pathCoverage = texture2D(terrainPathMap,
        vTerrainWorld.xz * terrainPathTransform.xy + terrainPathTransform.zw).r;
      diffuseColor.rgb = mix(diffuseColor.rgb, terrainPathColor * (.94 + paintCloud * .12), pathCoverage);
      float turf = smoothstep(.015, .14, diffuseColor.g - diffuseColor.r);
      diffuseColor.rgb *= mix(vec3(.975), mix(vec3(.88, .94, .82), vec3(1.06, 1.055, .98), paintCloud), turf);
      diffuseColor.rgb *= mix(.989 + paintGrain * .022, .974 + paintGrain * .052, pathCoverage);
      vec2 stoneSample = vTerrainWorld.xz * vec2(.91, 1.08)
        + vec2(paintCloud * .08, paintCloud * -.06);
      vec3 groundStone = terrainStoneField(stoneSample);
      float stoneFootprint = max(length(dFdx(stoneSample)), length(dFdy(stoneSample)));
      float stoneFilter = 1. - smoothstep(.20, .78, stoneFootprint);
      float jointAA = max(fwidth(groundStone.x), .005);
      float stoneJoint = 1. - smoothstep(.023 - jointAA, .060 + jointAA, groundStone.x);
      float stoneApron = smoothstep(.56, .9, vGroundSurface.x)
        * (1. - vGroundSurface.y) * (1. - vGroundSurface.z) * (1. - pathCoverage * .88);
      float stoneReliefMask = stoneApron * stoneFilter;
      vec3 stoneVariation = mix(vec3(.91, .925, .95), vec3(1.06, 1.035, .98), groundStone.y);
      stoneVariation *= 1. - stoneJoint * .18;
      diffuseColor.rgb *= mix(vec3(1.), stoneVariation, stoneReliefMask);
      float grassFibre = terrainFilteredNoise(vTerrainWorld.xz * vec2(19., 31.));
      float sandGrain = terrainFilteredNoise(vTerrainWorld.xz * 42. + 17.);
      diffuseColor.rgb *= 1. + (grassFibre - .5) * .10 * turf
        + (sandGrain - .5) * .045 * (1. - turf);
      float sandWet = (1. - smoothstep(${WATER_LEVEL + .45}, ${WATER_LEVEL + 1.35}, vTerrainWorld.y))
        * vGroundSurface.z;
      diffuseColor.rgb *= mix(vec3(1.), vec3(.87, .89, .91), sandWet);
    `).replace("#include <roughnessmap_fragment>", `
      #include <roughnessmap_fragment>
      roughnessFactor = clamp(roughnessFactor * mix(1.025, .96, turf)
        - stoneReliefMask * .065 - sandWet * .095, .78, 1.);
    `).replace("#include <normal_fragment_begin>", `
      #include <normal_fragment_begin>
      // Millimetre-scale mortar/soil relief only. Derivatives are calculated
      // before the determinant guard; grazing or degenerate fragments retain
      // their geometric normal. The slope is bounded, never silhouette relief.
      float groundHeight = -stoneJoint * .008 * stoneReliefMask
        + (grassFibre - .5) * .0018 * turf + (sandGrain - .5) * .0006 * (1. - turf);
      vec2 groundHeightGradient = vec2(dFdx(groundHeight), dFdy(groundHeight));
      vec3 groundQ0 = -dFdx(vViewPosition), groundQ1 = -dFdy(vViewPosition);
      vec3 groundR1 = cross(groundQ1, normal), groundR2 = cross(normal, groundQ0);
      float groundDet = dot(groundQ0, groundR1);
      if (abs(groundDet) > .00000001) {
        vec3 groundSlope = sign(groundDet) * (groundHeightGradient.x * groundR1
          + groundHeightGradient.y * groundR2) / max(abs(groundDet), .00000001);
        groundSlope *= min(1., .12 / max(length(groundSlope), .000001));
        vec3 groundNormal = normal - groundSlope;
        normal = groundNormal * inversesqrt(max(dot(groundNormal, groundNormal), .00000001));
      }
    `);
  };
  topMaterial.customProgramCacheKey = () => "sculpted-terrain-planted-mineral-v5";

  function terrainGeometry() {
    // Register before attribute/normal construction, so a partial allocation
    // failure reaches the same rollback path as a completed terrain mesh.
    const geometry = new THREE.BufferGeometry();
    ownedGeometry.push(geometry);
    return geometry;
  }

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string) {
    const object = new THREE.Mesh(geometry, material);
    object.name = name; object.castShadow = true; object.receiveShadow = true;
    group.add(object);
  }

  function surface(island: TerrainIsland) {
    const { vertices, indices } = getTerrainMesh(island);
    const geometry = terrainGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    const colors: number[] = [], groundSurface: number[] = [];
    const patches = groundPatches.filter((patch) => patch.territory === island.id);
    const plants = plantedPockets.filter((patch) => patch.territory === island.id);
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
      const angle = Math.atan2(z - island.z, x - island.x);
      const radial = Math.hypot(x - island.x, z - island.z) / getShoreRadius(island, angle);
      // The new real terrain slopes down to the sea. Height-driven wet/dry sand
      // joins asymmetric coves, instead of leaving a green collar on a low beach.
      // Colour only: the shared top positions and indices are never sculpted here.
      const pocket = smooth(.25, .82, Math.sin(angle * 2.3 + island.x * .07) * .65 + Math.cos(angle * 3.7) * .35);
      const variation = Math.sin(x * 0.33 + Math.cos(z * 0.24)) * Math.cos(z * 0.29) * 0.018;
      const coveBeach = smooth(THREE.MathUtils.lerp(.965, .76, pocket) + variation, .994, radial);
      const lowCoast = island.floating ? 0
        : (1 - smooth(WATER_LEVEL + .85, WATER_LEVEL + 2.25, y)) * smooth(.55, .78, radial);
      const beach = Math.max(coveBeach, lowCoast);
      color.copy(grass).lerp(moss, 0.3 + Math.sin(x * 0.18 - z * 0.11) * 0.18);
      color.lerp(island.floating ? cliffLight : sand, beach).lerp(damp, smooth(0.965, 1.005, radial) * 0.3);
      const mineralShoulder = smooth(.9, .997, radial) * smooth(.24, .8,
        Math.sin(angle * 4.1 + island.z * .021) * .6 + Math.cos(angle * 7.3 - island.x * .019) * .4)
        * (island.floating ? 1 : smooth(WATER_LEVEL + 1.3, WATER_LEVEL + 3, y));
      color.lerp(cliffLight, mineralShoulder * .52);
      // A few metre-wide bends distort real clearing footprints, not concentric
      // island masks or a high-frequency camouflage pattern. Front aprons join
      // the existing entrances; the independent path texture stays untouched.
      const driftX = (groundNoise(x * .115 + 31, z * .115 - 13) - .5) * 4.6;
      const driftZ = (groundNoise(x * .125 - 53, z * .125 + 29) - .5) * 4.6;
      const cloud = groundNoise(x * .075 + 17, z * .075 - 31);
      let clearing = 0, warmth = 0, weight = 0;
      for (const patch of patches) {
        const dx = x - patch.x + driftX, dz = z - patch.z + driftZ;
        const cosine = Math.cos(patch.yaw), sine = Math.sin(patch.yaw);
        const px = dx * cosine - dz * sine, pz = dx * sine + dz * cosine;
        const distance = Math.hypot(Math.max(0, Math.abs(px) - patch.width / 2), Math.max(0, Math.abs(pz) - patch.depth / 2));
        const coverage = (1 - smooth(.15, 4.8, distance)) * patch.strength;
        clearing = Math.max(clearing, coverage); warmth += coverage * patch.warmth; weight += coverage;
      }
      let planted = 0;
      for (const plant of plants) {
        const distance = Math.hypot(x - plant.x + driftX * .22, z - plant.z + driftZ * .22);
        planted = Math.max(planted, 1 - smooth(plant.radius * .22, plant.radius, distance));
      }
      // Broad re-growth and planted borders preserve lush green islands between
      // mineral plazas. Coastal sand coves retain their original asymmetry.
      clearing *= (1 - planted * .88) * (1 - smooth(.63, .86, cloud) * .2) * (1 - beach * .96);
      groundSurface.push(THREE.MathUtils.clamp(clearing, 0, 1), THREE.MathUtils.clamp(planted, 0, 1), beach);
      groundColor.copy(limestone).lerp(warmEarth, .12 + cloud * .18 + (weight ? warmth / weight : 0) * .28);
      color.lerp(groundColor, clearing).lerp(plantSoil, planted * (1 - beach) * .25);
      const heightTint = island.floating ? Math.min(y, 6) * .017 : Math.min(Math.max(y - WATER_LEVEL, 0), 6) * .008;
      color.multiplyScalar(.94 + Math.sin(x * 1.8 + z * 1.2) * .015 + heightTint);
      colors.push(color.r, color.g, color.b);
    }
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("groundSurface", new THREE.Float32BufferAttribute(groundSurface, 3));
    geometry.computeVertexNormals();
    mesh(geometry, topMaterial, `Continuous terrain: ${island.id}`);
  }

  function triangle(buffer: CliffBuffers, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3,
    tint: THREE.Color, na?: THREE.Vector3, nb?: THREE.Vector3, nc?: THREE.Vector3) {
    const normal = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    // Tiny triangles can collapse after Float32 conversion. Omit them, never
    // produce NaN normals or a zero-area fragment in the portable geometry.
    if (normal.lengthSq() < 1e-10) return;
    normal.normalize();
    const an = na ?? normal, bn = nb ?? normal, cn = nc ?? normal;
    const reverse = normal.dot(an.clone().add(bn).add(cn)) < 0;
    if (reverse) normal.negate();
    const vertices = reverse ? [[a, an], [c, cn], [b, bn]] as const : [[a, an], [b, bn], [c, cn]] as const;
    for (const [point, n] of vertices) {
      buffer.positions.push(point.x, point.y, point.z);
      buffer.normals.push(n.x, n.y, n.z);
      buffer.colors.push(tint.r, tint.g, tint.b);
    }
  }

  function finishBuffer(buffer: CliffBuffers, material: THREE.Material, name: string) {
    if (!buffer.positions.length) return;
    const geometry = terrainGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(buffer.positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(buffer.normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(buffer.colors, 3));
    mesh(geometry, material, name);
  }

  function coastline(island: TerrainIsland, islandIndex: number) {
    const rock: CliffBuffers = { positions: [], normals: [], colors: [] };
    const greenery: CliffBuffers = { positions: [], normals: [], colors: [] };
    const terrain = getTerrainMesh(island), segments = TERRAIN_ANGULAR_SEGMENTS;
    const edgeStart = terrain.vertices.length / 3 - segments;
    const phase = islandIndex * 1.731;
    // Low normal islands continue below the waves. Their playable beaches are
    // in the shared terrain, while this short sandy toe closes the sea contact.
    // Skills alone keeps its impossible hanging shape.
    const foundationY = island.floating ? island.elevation - 17.5 : SEA_CLIFF_FOUNDATION_Y;
    const rows = [0, .025, .07, .14, .24, .36, .49, .63, .76, .88, 1];
    const rimPoints = Array.from({ length: segments }, (_, i) => rim(i / segments));
    const circumference = rimPoints.reduce((sum, point, i) => sum + Math.hypot(point.x - rimPoints[(i + 1) % segments].x,
      point.z - rimPoints[(i + 1) % segments].z), 0);
    // Unequal, leaning masses at unrelated heights. These shape the continuous
    // cortex itself: neither a ring of pasted-on rocks nor repeated columns.
    const masses = Array.from({ length: Math.max(12, Math.round(circumference / 8.7)) }, (_, i) => {
      const seed = phase * 79 + i * 13.43;
      return { u: (i + .15 + stoneHash(seed + 2) * .7) / Math.max(12, Math.round(circumference / 8.7)),
        width: (3.6 + stoneHash(seed + 8) * 4.8) / circumference,
        depth: .14 + stoneHash(seed + 13) * .69, span: .14 + stoneHash(seed + 19) * .27,
        relief: 1.65 + stoneHash(seed + 31) * 3.4, lean: (stoneHash(seed + 37) - .5) * .048 };
    });

    function rim(u: number) {
      const wrapped = ((u % 1) + 1) % 1 * segments, sector = Math.floor(wrapped), fraction = wrapped - sector;
      const a = (edgeStart + sector) * 3, b = (edgeStart + (sector + 1) % segments) * 3;
      return new THREE.Vector3(THREE.MathUtils.lerp(terrain.vertices[a], terrain.vertices[b], fraction),
        THREE.MathUtils.lerp(terrain.vertices[a + 1], terrain.vertices[b + 1], fraction),
        THREE.MathUtils.lerp(terrain.vertices[a + 2], terrain.vertices[b + 2], fraction));
    }

    function depth(u: number, row: number) {
      if (!island.floating) {
        // A real ring at sea level locks the wall/ocean contact to the shared
        // radius formula. Interpolating across a coarse row above and below it
        // otherwise lets the sculpted foot drift away from the foam contour.
        const edge = rim(u), atSea = (edge.y - WATER_LEVEL) / (edge.y - foundationY);
        const aboveSea = [0, .04, .12, .25, .44, .64, .82, 1];
        if (row < aboveSea.length) return atSea * aboveSea[row];
        return atSea + (1 - atSea) * [ .2, .55, 1 ][row - aboveSea.length];
      }
      const t = rows[row];
      if (t === 0 || t === 1) return t;
      // Each fracture meets its neighbours at a different height. Rows remain
      // monotone, but neither seams nor facet centres trace concentric shelves.
      return t + (row === 1 ? .003 : row === 2 ? .006 : .012) * (Math.sin(u * Math.PI * 6 + phase + row * .79) * .61
        + Math.sin(u * Math.PI * 14 - phase + row * 1.93) * .39);
    }

    function coastPoint(u: number, t: number, inset = 0) {
      const edge = rim(u);
      if (t === 0) return edge; // Float32-identical, including the 96 shared corners.
      const angle = Math.atan2(edge.z - island.z, edge.x - island.x);
      const shore = Math.hypot(edge.x - island.x, edge.z - island.z);
      const wave = Math.sin(angle * 3 + phase + t * 2.7) * .64 + Math.sin(angle * 7 - phase - t * 4.1) * .36;
      const y = THREE.MathUtils.lerp(edge.y, foundationY, t);
      if (!island.floating) {
        // The low sandy toe widens gently into submerged bedrock. It follows
        // the exact top rim, never an unrelated ring of hanging boulders.
        const radius = getSeaCliffRadius(shore, angle, phase, t, y) - inset;
        return new THREE.Vector3(island.x + Math.cos(angle) * radius, y, island.z + Math.sin(angle) * radius);
      }
      let massRelief = 0;
      for (const mass of masses) {
        const distance = Math.abs(((u - mass.u - mass.lean * (t - mass.depth) + 1.5) % 1) - .5) / mass.width;
        const vertical = (t - mass.depth) / mass.span;
        massRelief += mass.relief * Math.exp(-distance * distance * 1.6 - vertical * vertical * 1.4);
      }
      const clearance = smooth(0, .055, t);
      const erosion = clearance * (1.1 + (wave + 1) * .48);
      // Angled joints cut through several masses, with a different lean in
      // every fold. Their width is in metres, not a tiled facet normal trick.
      const foldPhase = angle * 11 + phase + t * (3.4 + Math.sin(angle * 2 + phase) * 2.1);
      const fold = Math.exp(-Math.pow(Math.sin(foldPhase) / .2, 2)) * (1 + Math.sin(angle * 4 - t * 7) * .35);
      const fracturedMass = clearance * (massRelief + Math.sin(t * Math.PI) * wave * .9 - fold * 1.35);
      const talus = smooth(.58, .94, t) * (1.35 + Math.sin(angle * 5.3 + phase) * .9);
      const radius = island.floating
        ? Math.max(.28, shore * Math.pow(1 - t, .71) + fracturedMass * .85 - inset)
        : shore - erosion + fracturedMass + talus - inset;
      const shear = Math.sin(t * Math.PI) * Math.sin(angle * 4 + phase + t * 3.7) * .032;
      // Linear descent preserves the clearance under the exact rim. Relief is
      // lateral, never an uncollidable boulder projecting onto the playable top.
      return new THREE.Vector3(island.x + Math.cos(angle + shear) * radius, y,
        island.z + Math.sin(angle + shear) * radius);
    }

    const cortexSegments = segments * (compact ? 1 : 2);
    const coreRows = Array.from({ length: rows.length }, (_, row) =>
      Array.from({ length: cortexSegments }, (_, i) => coastPoint(i / cortexSegments, depth(i / cortexSegments, row), row ? island.floating ? .68 : .12 : 0)));
    function groundedTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
      const start = rock.positions.length;
      triangle(rock, a, b, c, color);
      // Per-vertex colour crosses the waterline smoothly. A grey, row-tinted
      // rock skirt on a 40 cm rim would still read as a raised miniature disc.
      for (let i = start; i < rock.positions.length; i += 3) {
        const x = rock.positions[i], y = rock.positions[i + 1], z = rock.positions[i + 2];
        const cloud = groundNoise(x * .12 + 17, z * .12 - 31);
        const sandCoverage = smooth(WATER_LEVEL - 1.8, WATER_LEVEL + .05, y);
        color.copy(sandstone).lerp(cliffDark, .15 + cloud * .1)
          .lerp(sand, sandCoverage).multiplyScalar(.94 + cloud * .06);
        rock.colors[i] = color.r; rock.colors[i + 1] = color.g; rock.colors[i + 2] = color.b;
      }
    }
    for (let row = 0; row < coreRows.length - 1; row++) for (let i = 0; i < cortexSegments; i++) {
      const next = (i + 1) % cortexSegments, a = coreRows[row][i], b = coreRows[row][next];
      const c = coreRows[row + 1][i], d = coreRows[row + 1][next];
      color.copy(cliffDark).lerp(sandstone, row === 0 ? .57 : .12);
      if (row === 0) color.lerp(island.floating ? moss : sand, .21);
      if (island.floating) { triangle(rock, a, b, c, color); triangle(rock, b, d, c, color); }
      else { groundedTriangle(a, b, c); groundedTriangle(b, d, c); }
    }
    const bottomCentre = new THREE.Vector3(island.x, foundationY, island.z);
    for (let i = 0; i < cortexSegments; i++) triangle(rock, coreRows.at(-1)![(i + 1) % cortexSegments], coreRows.at(-1)![i], bottomCentre, cliffDark);

    type SectionPoint = { x: number; y: number };
    const rockHeight = rimPoints.reduce((sum, point) => sum + point.y, 0) / segments - bottomCentre.y;
    // Long decorative plates must not bridge over the concave waterline
    // profile. The wave band is the unbroken cortex itself, with wetness/joints
    // shaded per fragment; no individual hanging boulder ends in the sea.
    const lowestRim = Math.min(...rimPoints.map((point) => point.y));
    const fractureDepth = island.floating ? rockHeight
      : Math.max(0, rockHeight * (lowestRim - (WATER_LEVEL + 1.2)) / (lowestRim - foundationY));
    const upperDepth = rockHeight * .035, area = circumference * Math.max(0, fractureDepth - upperDepth);
    // There is no dry cliff to dress below a beach-height rim. In particular,
    // do not feed negative strip height into Voronoi placement or its spacing.
    const targetCells = area > 0 ? Math.max(28, Math.ceil(area / (compact ? 39 : 32))) : 0;
    const minimumSpacing = targetCells ? Math.sqrt(area / targetCells) * .56 : 0;
    const sites: (SectionPoint & { weight: number })[] = [];
    for (let attempt = 0; sites.length < targetCells && attempt < targetCells * 90; attempt++) {
      const seed = phase * 419 + attempt * 7.73;
      const site = { x: stoneHash(seed + 8) * circumference,
        y: upperDepth + stoneHash(seed + 17) * (fractureDepth - upperDepth), weight: stoneHash(seed + 38) * minimumSpacing ** 2 * .38 };
      if (sites.some((other) => {
        const dx = Math.abs(site.x - other.x);
        return Math.hypot(Math.min(dx, circumference - dx), (site.y - other.y) * .87) < minimumSpacing;
      })) continue;
      sites.push(site);
    }

    function clipPolygon(polygon: SectionPoint[], nx: number, ny: number, offset: number) {
      const clipped: SectionPoint[] = [];
      for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i], b = polygon[(i + 1) % polygon.length];
        const da = nx * a.x + ny * a.y - offset, db = nx * b.x + ny * b.y - offset;
        if (da <= 0) clipped.push(a);
        if ((da <= 0) !== (db <= 0)) {
          const t = da / (da - db);
          clipped.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      return clipped;
    }

    let facets = 0;
    for (const [cell, site] of sites.entries()) {
      // Periodic weighted Voronoi in physical coast/depth metres. No tiers or
      // preselected rows: five/seven-sided fractures can span very different
      // heights, meet obliquely and cross the former masonry-like ring joints.
      let polygon: SectionPoint[] = [{ x: site.x - circumference / 2, y: upperDepth },
        { x: site.x + circumference / 2, y: upperDepth }, { x: site.x + circumference / 2, y: fractureDepth },
        { x: site.x - circumference / 2, y: fractureDepth }];
      // Grounded land reads as long fractured bedrock faces, not a mosaic of
      // equally rounded rocks. The laboratory's existing cortex is unchanged.
      const jointSkew = island.floating ? .13 : .025, jointHeight = island.floating ? .83 : .16;
      const metric = (p: SectionPoint) => p.x * p.x + 2 * jointSkew * p.x * p.y + jointHeight * p.y * p.y;
      for (const other of sites) {
        if (other === site) continue;
        const x = other.x + Math.round((site.x - other.x) / circumference) * circumference;
        const candidate = { x, y: other.y }, dx = x - site.x, dy = other.y - site.y;
        polygon = clipPolygon(polygon, dx + jointSkew * dy, jointSkew * dx + jointHeight * dy,
          (metric(candidate) - metric(site) + site.weight - other.weight) / 2);
        if (polygon.length < 3) break;
      }
      // Suppress tiny numerical edges before constructing real chamfers.
      polygon = polygon.filter((point, i) => Math.hypot(point.x - polygon[(i + 1) % polygon.length].x,
        point.y - polygon[(i + 1) % polygon.length].y) > .055);
      if (polygon.length < 3) continue;
      const seed = phase * 19 + cell * 7.13;
      const centroid = polygon.reduce((p, corner) => ({ x: p.x + corner.x / polygon.length, y: p.y + corner.y / polygon.length }), { x: 0, y: 0 });
      const cornerSections = polygon.map((p) => {
        const length = Math.hypot(p.x - centroid.x, p.y - centroid.y);
        // A physical 5–10 cm fracture gap, not a broad black mortar channel.
        const gap = island.floating ? .05 + stoneHash(seed + 4) * .04 : .018 + stoneHash(seed + 4) * .018;
        const inset = Math.min(.12, gap / length);
        return { x: p.x + (centroid.x - p.x) * inset, y: p.y + (centroid.y - p.y) * inset };
      });
      const corners = cornerSections.map((p) => coastPoint(p.x / circumference, p.y / rockHeight));
      const centre = corners.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / corners.length);
      const outward = new THREE.Vector3(centre.x - island.x, 0, centre.z - island.z).normalize();
      const boundarySections: SectionPoint[] = [];
      for (let i = 0; i < corners.length; i++) {
        const cut = .065 + stoneHash(seed + i * 4.31) * .085;
        const p = cornerSections[i];
        for (const neighbour of [cornerSections[(i + corners.length - 1) % corners.length], cornerSections[(i + 1) % corners.length]]) {
          boundarySections.push({ x: THREE.MathUtils.lerp(p.x, neighbour.x, cut), y: THREE.MathUtils.lerp(p.y, neighbour.y, cut) });
        }
      }
      const boundary = boundarySections.map((p) => coastPoint(p.x / circumference, p.y / rockHeight));
      const prominence = island.floating ? .72 + stoneHash(seed + 51) * 1.45 : .045 + stoneHash(seed + 51) * .12;
      const bevel = island.floating ? .13 + stoneHash(seed + 42) * .13 : .022 + stoneHash(seed + 42) * .025;
      function sculptedRing(fraction: number, relief: number) {
        return boundarySections.map((point) => {
          const x = THREE.MathUtils.lerp(point.x, centroid.x, fraction), y = THREE.MathUtils.lerp(point.y, centroid.y, fraction);
          const p = coastPoint(x / circumference, y / rockHeight);
          const direction = new THREE.Vector3(p.x - island.x, 0, p.z - island.z).normalize();
          // Curvature follows the eroded cortex. No projection onto one huge
          // front plane; the shoulder and belly have genuinely different depth.
          return p.addScaledVector(direction, relief);
        });
      }
      const inner = sculptedRing(bevel, prominence * .5), belly = sculptedRing(.57, prominence);
      const faceCentre = coastPoint(centroid.x / circumference, centroid.y / rockHeight).addScaledVector(outward, prominence * 1.06);
      const backs = boundary.map((point) => point.clone().addScaledVector(outward, -1.4));
      const backCentre = centre.clone().addScaledVector(outward, -1.4);
      const tint = cliffLight.clone().lerp(sandstone, stoneHash(seed + 72) * .23).lerp(cliffDark, stoneHash(seed + 63) * .105);
      // Wetness belongs to the material's per-fragment world height, not the
      // centre of a tall slab that may cross both dry cliff and submerged rock.
      const bevelTint = tint.clone().multiplyScalar(.93), sideTint = tint.clone().multiplyScalar(.79);
      const frontVertices = [...boundary, ...inner, ...belly, faceCentre], count = boundary.length;
      const frontFaces: { ids: [number, number, number]; tint: THREE.Color; normal: THREE.Vector3 }[] = [];
      const frontNormals = frontVertices.map(() => new THREE.Vector3());
      function frontFace(a: number, b: number, c: number, faceTint: THREE.Color) {
        const n = new THREE.Vector3().subVectors(frontVertices[b], frontVertices[a])
          .cross(new THREE.Vector3().subVectors(frontVertices[c], frontVertices[a]));
        if (n.lengthSq() < 1e-10) return;
        if (n.dot(outward) < 0) { [b, c] = [c, b]; n.negate(); }
        for (const id of [a, b, c]) frontNormals[id].add(n);
        frontFaces.push({ ids: [a, b, c], tint: faceTint, normal: n.normalize() });
      }
      for (let i = 0; i < boundary.length; i++) {
        const next = (i + 1) % boundary.length;
        frontFace(i, next, count + i, bevelTint); frontFace(next, count + next, count + i, bevelTint);
        frontFace(count + i, count + next, count * 2 + i, tint);
        frontFace(count + next, count * 2 + next, count * 2 + i, tint);
        frontFace(count * 2 + i, count * 2 + next, count * 3, tint);
        triangle(rock, boundary[i], backs[i], backs[next], sideTint);
        triangle(rock, boundary[i], backs[next], boundary[next], sideTint);
        triangle(rock, backs[next], backs[i], backCentre, cliffDark);
      }
      frontNormals.forEach((n) => n.normalize());
      for (const face of frontFaces) {
        const normals = face.ids.map((id) => frontNormals[id].dot(face.normal) > .12 ? frontNormals[id] : face.normal);
        triangle(rock, frontVertices[face.ids[0]], frontVertices[face.ids[1]], frontVertices[face.ids[2]], face.tint,
          normals[0], normals[1], normals[2]);
      }
      facets++;
    }

    function vineSegment(a: THREE.Vector3, b: THREE.Vector3, tint: THREE.Color) {
      const tangent = b.clone().sub(a).normalize(), axis = new THREE.Vector3(0, 1, 0);
      if (Math.abs(tangent.y) > .95) axis.set(1, 0, 0);
      const across = tangent.clone().cross(axis).normalize(), perpendicular = tangent.clone().cross(across).normalize();
      for (let i = 0; i < 5; i++) {
        const n0 = across.clone().multiplyScalar(Math.cos(i / 5 * Math.PI * 2)).addScaledVector(perpendicular, Math.sin(i / 5 * Math.PI * 2));
        const n1 = across.clone().multiplyScalar(Math.cos((i + 1) / 5 * Math.PI * 2)).addScaledVector(perpendicular, Math.sin((i + 1) / 5 * Math.PI * 2));
        const a0 = a.clone().addScaledVector(n0, .027), a1 = a.clone().addScaledVector(n1, .027);
        const b0 = b.clone().addScaledVector(n0, .024), b1 = b.clone().addScaledVector(n1, .024);
        triangle(greenery, a0, b0, a1, tint, n0, n0, n1); triangle(greenery, a1, b0, b1, tint, n1, n0, n1);
      }
    }

    function leaf(base: THREE.Vector3, outward: THREE.Vector3, tangent: THREE.Vector3, seed: number) {
      const length = .48 + stoneHash(seed) * .37, width = length * (.32 + stoneHash(seed + 3) * .17);
      const tip = base.clone().addScaledVector(tangent, length * (stoneHash(seed + 4) - .5) * 1.4)
        .addScaledVector(outward, .18).add(new THREE.Vector3(0, -length, 0));
      const mid = base.clone().lerp(tip, .46), fold = mid.clone().addScaledVector(outward, .085);
      const boundary = [base, mid.clone().addScaledVector(tangent, width), tip, mid.clone().addScaledVector(tangent, -width)];
      const backs = boundary.map((point) => point.clone().addScaledVector(outward, -.028)), back = fold.clone().addScaledVector(outward, -.035);
      const tint = leafDark.clone().lerp(leafLight, .3 + stoneHash(seed + 2) * .56);
      for (let i = 0; i < 4; i++) {
        const next = (i + 1) % 4;
        // Boundary order gives the front radial normal and a thin closed lamina.
        triangle(greenery, boundary[i], boundary[next], fold, tint);
        triangle(greenery, backs[next], backs[i], back, tint.clone().multiplyScalar(.8));
        triangle(greenery, boundary[i], backs[i], backs[next], tint);
        triangle(greenery, boundary[i], backs[next], boundary[next], tint);
      }
    }

    // Local trailing plants at selected fracture shoulders. No continuous green
    // collar, no floating foliage fallback, no decorative collider on the rim.
    // Normal shoreline is now a beach, too short for hanging vines without
    // submerging leaves. Existing grounded botanical pockets stay on the top.
    const patches = island.floating ? compact ? 3 : island.radius > 23 ? 10 : 6 : 0;
    for (let patch = 0; patch < patches; patch++) {
      const seed = phase * 71 + patch * 17.3, u = stoneHash(seed + 8);
      const angle = u * Math.PI * 2, outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const tangent = new THREE.Vector3(-outward.z, 0, outward.x);
      const stems = compact ? 1 : 2;
      for (let stem = 0; stem < stems; stem++) {
        const count = compact ? 6 : 8 + Math.floor(stoneHash(seed + stem) * 6);
        let previous: THREE.Vector3 | undefined;
        for (let step = 0; step < count; step++) {
          const t = .047 + step * .023 + stem * .008;
          const point = coastPoint(u + Math.sin(step * .83 + seed) * .0017 + stem * .008, t)
            .addScaledVector(outward, .9);
          if (previous) vineSegment(previous, point, leafDark);
          leaf(point, outward, tangent, seed + stem * 37 + step * 2.73);
          previous = point;
        }
      }
    }
    finishBuffer(rock, cliffMaterial, `Fractured coastal mass: ${island.id}`);
    finishBuffer(greenery, foliageMaterial, `Local trailing cliff vegetation: ${island.id}`);
    // Diagnostic metadata is deterministic geometry accounting, not FPS proof.
    group.userData[`${island.id}Cliff`] = { facets, shorelineVertices: segments, decorativeOnly: true,
      foundationY, grounded: !island.floating, beachToe: !island.floating, dryFractureHeight: Math.max(0, fractureDepth - upperDepth) };
  }

  TERRITORIES.forEach((territory, index) => {
    surface(territory); coastline(territory, index);
  });
  ISLANDS.forEach((island) => {
    paintPath(island.entrance.x, island.entrance.z, island.entrance.x, island.entrance.z, 5.5);
    WORLD_STATIONS.filter((station) => station.island === island.id).forEach((station) => {
      const approach = getStationApproach(station);
      paintPath(approach.x, approach.z, station.x, station.z, 3.2);
    });
    if (island.id === "welcome") paintPath(island.entrance.x, island.entrance.z, CONTACT_DOCK.x, CONTACT_DOCK.z - CONTACT_DOCK.length / 2, 3.5);
  });
  WALK_PATHS.forEach(({ from, to, width }) => paintPath(from.x, from.z, to.x, to.z, width));
  pathTexture.needsUpdate = true;
  return {
    group,
    dispose: disposeTerrain,
  };
  } catch (error) {
    disposeTerrain();
    throw error;
  }
}
