import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createIslandParquetMaterial } from "./island-materials";
import { getGroundHeight, getIslandLandmark, getTerrainHeight, HOME_STUDIO_DECK, DIGITAL_WORKSHOP_DECK, ARCHIVE_OBSERVATORY_DECK, SUSPENDED_LAB_DECK, WELCOME_HARBOR, WELCOME_HARBOR_DECK, DANCE_PAVILION_DECK, CONTACT_LIGHTHOUSE, CONTACT_LIGHTHOUSE_DECK, ISLANDS, WORLD_STATIONS, WORLD_STRUCTURE_HULLS, TRAVEL_ROUTES, type Island } from "./island-map";

const UP = new THREE.Vector3(0, 1, 0);

/** Original architectural sets, not image planes or generated portfolio evidence.
 * Text and project claims remain in HTML. Monitor drawings below are abstract UI.
 */
export function createIslandArchitecture({ compact = false }: { compact?: boolean } = {}) {
  const group = new THREE.Group();
  group.name = "Inhabited inventor archipelago — nine architectural places";
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const detailedGroups: THREE.Group[] = [];
  const cloths: { mesh: THREE.Mesh; phase: number }[] = [];
  const mechanisms: { group: THREE.Group; axis: "x" | "y" | "z"; speed: number }[] = [];
  const lanternLights: THREE.PointLight[] = [];
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const temporary = new THREE.Object3D();
  let target = group, origin = new THREE.Vector3();
  let detail = false;
  function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .82, ...extra });
    materials.add(mat); return mat;
  }
  function wood(color: string) {
    const mat = material(color);
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = `varying vec3 vTimberPosition;\n${shader.vertexShader}`
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvTimberPosition = position;");
      shader.fragmentShader = `varying vec3 vTimberPosition;\n${shader.fragmentShader}`
        .replace("#include <color_fragment>", `#include <color_fragment>
          float phase = vTimberPosition.z * 35.0 + sin(vTimberPosition.x * 1.2 + vTimberPosition.y) * 2.0;
          float visibility = 1.0 / (1.0 + fwidth(phase) * 2.0);
          float vein = sin(phase);
          float broadGrain = sin(vTimberPosition.z * 2.8 + sin(vTimberPosition.x * .7) * 3.0);
          diffuseColor.rgb *= .98 + broadGrain * .035 - smoothstep(.76, .98, vein) * .045 * visibility;
        `);
    };
    mat.customProgramCacheKey = () => "archipelago-crafted-timber-v2";
    return mat;
  }
  const p = {
    wood: wood("#ba894e"), honey: wood("#c99b60"), darkWood: wood("#765334"),
    stone: material("#d0c1a2"), cream: material("#f5e7bc"),
    tile: material("#b95332"), tileLight: material("#ce7044"),
    violet: material("#773ecd"), brass: material("#c79b4a", { metalness: .48, roughness: .32 }),
    metal: material("#46505c", { metalness: .4, roughness: .46 }),
    ink: material("#152e3b", { roughness: .54 }),
    glass: material("#254b5b", { metalness: .25, roughness: .18 }),
    cyan: material("#64d9e9", { emissive: "#25a4c5", emissiveIntensity: .35 }),
    glow: material("#fff2be", { emissive: "#ffc360", emissiveIntensity: .75 }),
    leaf: material("#397d45", { side: THREE.DoubleSide, roughness: .7 }),
    leafLight: material("#7aa344", { side: THREE.DoubleSide, roughness: .7 }),
    coral: material("#c94b45"), rope: material("#dbc89b"),
    tire: material("#242b31", { roughness: .96 }),
    car: material("#eee9db", { metalness: .35, roughness: .25 }),
    parquet: createIslandParquetMaterial({ color: "#bd8749" }),
    parquetLight: createIslandParquetMaterial({ color: "#c59050" }),
  };
  materials.add(p.parquet); materials.add(p.parquetLight);

  function add(geometry: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0,
    scale: [number, number, number] = [1, 1, 1], rotation: [number, number, number] = [0, 0, 0]) {
    temporary.position.set(x + origin.x, y + origin.y, z + origin.z);
    temporary.rotation.set(...rotation); temporary.scale.set(...scale); temporary.updateMatrix();
    geometry.applyMatrix4(temporary.matrix);
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (flat !== geometry) geometry.dispose();
    flat.deleteAttribute("uv");
    const bucket = batches.get(mat) ?? [];
    bucket.push(flat); batches.set(mat, bucket);
  }
  function box(mat: THREE.Material, x: number, y: number, z: number, width: number, height: number, depth: number,
    rotation: [number, number, number] = [0, 0, 0], bevel = .055) {
    const radius = Math.min(bevel, width / 4, height / 4, depth / 4);
    // Sub-pixel book bands, keyboard strokes and joinery seams need flat faces,
    // not hundreds of corner vertices. Preserve bevels on visible silhouettes.
    const geometry = radius >= .015 ? new RoundedBoxGeometry(width, height, depth, 1, radius)
      : new THREE.BoxGeometry(width, height, depth);
    add(geometry, mat, x, y, z, [1, 1, 1], rotation);
  }
  function cylinder(mat: THREE.Material, x: number, y: number, z: number, top: number, bottom: number, height: number, sides = 16) {
    add(new THREE.CylinderGeometry(top, bottom, height, sides), mat, x, y, z);
  }
  function beam(mat: THREE.Material, a: [number, number, number], b: [number, number, number], radius: number, sides = 10) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), vector = end.clone().sub(start);
    const geometry = new THREE.CylinderGeometry(radius * .93, radius, vector.length(), sides);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, vector.normalize()));
    const middle = start.add(end).multiplyScalar(.5);
    add(geometry, mat, middle.x, middle.y, middle.z);
  }
  function tube(mat: THREE.Material, points: THREE.Vector3[], radius: number, segments = 18) {
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 6, false), mat);
  }
  function sphere(mat: THREE.Material, x: number, y: number, z: number, sx: number, sy = sx, sz = sx) {
    add(new THREE.SphereGeometry(1, 12, 8), mat, x, y, z, [sx, sy, sz]);
  }
  function flush() {
    for (const [mat, parts] of batches) {
      const geometry = mergeGeometries(parts, false);
      if (geometry) {
        geometries.add(geometry);
        const mesh = new THREE.Mesh(geometry, mat);
        mesh.castShadow = true; mesh.receiveShadow = mat !== p.leaf && mat !== p.leafLight;
        mesh.name = detail ? "Near-distance architectural detail" : "Crafted architectural silhouette";
        target.add(mesh);
      }
      parts.forEach((part) => part.dispose());
    }
    batches.clear();
  }
  function lantern(x: number, y: number, z: number, scale = 1) {
    box(p.darkWood, x, y + .34 * scale, z, .54 * scale, .88 * scale, .54 * scale);
    box(p.glow, x, y + .35 * scale, z + .284 * scale, .37 * scale, .6 * scale, .028);
    box(p.glow, x + .284 * scale, y + .35 * scale, z, .028, .6 * scale, .37 * scale);
    add(new THREE.ConeGeometry(.46 * scale, .24 * scale, 4), p.brass, x, y + .94 * scale, z, [1, 1, 1], [0, Math.PI / 4, 0]);
    add(new THREE.TorusGeometry(.1 * scale, .025 * scale, 6, 10), p.brass, x, y + 1.16 * scale, z);
  }
  function flag(x: number, y: number, z: number, height = 6, width = 1.6) {
    beam(p.honey, [x, y, z], [x, y + height, z], .13);
    beam(p.honey, [x - .12, y + height - .22, z], [x + width + .2, y + height - .22, z], .12);
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(width, 0); shape.lineTo(width, -width * 1.6);
    shape.lineTo(width * .5, -width * 1.3); shape.lineTo(0, -width * 1.6); shape.closePath();
    const geom = new THREE.ShapeGeometry(shape, 8);
    const mesh = new THREE.Mesh(geom, p.violet);
    p.violet.side = THREE.DoubleSide;
    mesh.position.set(origin.x + x + .1, origin.y + y + height - .4, origin.z + z);
    mesh.castShadow = true; target.add(mesh); geometries.add(geom);
    // An authored compass symbol: no generated signage or fake project names.
    add(new THREE.TorusGeometry(width * .25, .024, 5, 24), p.brass, x + width * .55, y + height - width * 1.05, z + .025);
    for (const angle of [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]) {
      add(new THREE.ConeGeometry(width * .065, width * .62, 3), p.brass,
        x + width * .55, y + height - width * 1.05, z + .045, [1, 1, .18], [0, 0, angle]);
    }
    cloths.push({ mesh, phase: x + z });
  }
  function planter(x: number, y: number, z: number, scale = 1) {
    cylinder(p.tile, x, y + .4 * scale, z, .54 * scale, .34 * scale, .8 * scale);
    cylinder(p.darkWood, x, y + .79 * scale, z, .45 * scale, .45 * scale, .055);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4, length = (.85 + (i % 3) * .17) * scale;
      const points = [new THREE.Vector3(x, y + .75 * scale, z),
        new THREE.Vector3(x + Math.cos(a) * .35 * scale, y + 1.55 * scale, z + Math.sin(a) * .35 * scale),
        new THREE.Vector3(x + Math.cos(a) * length, y + 1.2 * scale, z + Math.sin(a) * length)];
      tube(i % 2 ? p.leaf : p.leafLight, points, .11 * scale, 5);
    }
  }
  function vines(x: number, y: number, z: number, length: number, phase: number) {
    const count = compact ? 9 : 16;
    for (let i = 0; i < count; i++) {
      const t = i / count, a = t * 10 + phase;
      const px = x + Math.sin(a) * .32, py = y - length * t, pz = z + Math.cos(a * .8) * .15;
      add(new THREE.SphereGeometry(1, 6, 4), i % 3 ? p.leaf : p.leafLight, px, py, pz,
        [.24, .12, .38], [.2, a, .3]);
    }
  }
  function deck(width: number, depth: number, x = 0, z = 0, parquet = false, supportedFlat = false) {
    // Board tops follow the actual terrain plus a small paint-like offset. They
    // must not be buried below turf, nor introduce a separate floating floor.
    function board(mat: THREE.Material, px: number, pz: number, w: number, d: number) {
      // Long boards need interior vertices: sampling only bevel/corner vertices
      // leaves terrain humps poking through their interpolated top triangles.
      const geometry = new THREE.BoxGeometry(w, .16, d, Math.ceil(w / .5), 1, Math.ceil(d / .5));
      const vertices = geometry.attributes.position;
      const grain = parquet ? new Float32Array(vertices.count * 2) : undefined;
      for (let i = 0; i < vertices.count; i++) {
        if (grain) {
          // Different small offsets, not a noisy tile repeated on each board.
          // X is the long fibre direction regardless of the floor's world Y.
          grain[i * 2] = vertices.getX(i) + px * 1.71 + pz * 3.19;
          grain[i * 2 + 1] = vertices.getZ(i) + px * 2.37 + pz * 1.29;
        }
        if (supportedFlat) vertices.setY(i, vertices.getY(i) - .08);
        else {
          const elevation = getTerrainHeight(origin.x + px + vertices.getX(i), origin.z + pz + vertices.getZ(i));
          vertices.setY(i, vertices.getY(i) + elevation - origin.y - .02);
        }
      }
      if (grain) geometry.setAttribute("parquetGrain", new THREE.BufferAttribute(grain, 2));
      geometry.computeVertexNormals(); add(geometry, mat, px, 0, pz);
    }
    if (supportedFlat) box(p.darkWood, x, -.2, z, width, .08, depth, [0, 0, 0], .008);
    const count = Math.ceil(depth / .7), interval = depth / count;
    for (let i = 0; i < count; i++) {
      const pz = z - depth / 2 + (i + .5) * interval;
      if (!parquet) board(i % 4 ? p.honey : p.wood, x, pz, width, interval - .025);
      else for (let j = 0; j < 5; j++) {
        const w = width / 5;
        board((i + j) % 3 ? p.parquetLight : p.parquet, x - width / 2 + (j + .5) * w, pz, w - .03, interval - .018);
      }
    }
    for (const side of [-1, 1]) box(p.darkWood, x + side * (width / 2 - .3), -.4, z, .45, .55, depth + .3);
    box(p.wood, x, -.35, z + depth / 2, width + .2, .6, .38);
  }
  function canopy(width: number, depth: number, height: number, x = 0, z = 0, tiles = true) {
    const pitch = .31, ridge = height + width * .12;
    for (const side of [-1, 1]) {
      const half = width * .55;
      if (tiles) box(p.tile, x + side * width * .25, ridge - width * .08, z,
        half, .2, depth + .65, [0, 0, -side * pitch]);
      else {
        // Open pergola rafters preserve the inhabitants and work surfaces from
        // the game's elevated camera. A full pale roof hid the entire interior.
        const rafters = Math.ceil(depth / 1.1);
        for (let i = 0; i <= rafters; i++) box(p.honey, x + side * width * .25,
          ridge - width * .08, z - depth / 2 + i / rafters * depth,
          half, .19, .17, [0, 0, -side * pitch]);
        for (let i = 0; i < 3; i++) {
          const px = x + side * width * (.1 + i * .16);
          box(p.darkWood, px, ridge - Math.abs(px - x) * Math.tan(pitch) + .14, z, .14, .14, depth + .7);
        }
      }
      if (tiles) {
        const cols = Math.ceil(depth / .53), rows = Math.ceil(half / .56);
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const distance = (row + .5) / rows * width * .52;
          const px = x + side * distance, py = ridge + .07 - distance * Math.tan(pitch);
          const geom = new THREE.CylinderGeometry(.19, .19, .65, 8, 1, true, 0, Math.PI);
          add(geom, (col + row) % 4 ? p.tile : p.tileLight, px, py, z - depth / 2 + col * depth / cols,
            [1, 1, 1], [Math.PI / 2, 0, -side * pitch]);
        }
      }
    }
    beam(p.darkWood, [x - width / 2, height, z + depth / 2], [x + width / 2, height, z + depth / 2], .21);
    beam(p.honey, [x, ridge + .1, z - depth / 2 - .5], [x, ridge + .1, z + depth / 2 + .5], .17);
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      beam(p.wood, [x + side * (width / 2 - .45), height - 1.5, z + end * (depth / 2 - .4)],
        [x + side * (width / 2 - 1.65), height, z + end * (depth / 2 - .4)], .12);
    }
  }
  function awning(x: number, y: number, z: number, width: number, depth: number) {
    const geom = new THREE.PlaneGeometry(width, depth, 18, 8);
    const positions = geom.attributes.position;
    geom.rotateX(-Math.PI / 2);
    for (let i = 0; i < positions.count; i++) {
      const u = positions.getX(i) / width, v = positions.getZ(i) / depth;
      positions.setY(i, -Math.cos(u * Math.PI) * .33 + v * .25 + Math.sin(u * 16) * .035);
    }
    geom.computeVertexNormals(); p.cream.side = THREE.DoubleSide;
    add(geom, p.cream, x, y, z);
    for (const side of [-1, 1]) beam(p.honey, [x + side * width / 2, 0, z + depth / 2], [x + side * width / 2, y + .3, z + depth / 2], .12);
  }
  function books(x: number, y: number, z: number, count = 10, scale = 1) {
    const colors = [p.violet, p.cream, p.coral, p.glass, p.honey];
    for (let i = 0; i < count; i++) {
      const h = (.46 + (i * 7 % 4) * .075) * scale;
      box(colors[i % colors.length], x + i * .19 * scale, y + h / 2, z, .145 * scale, h, .33 * scale, [0, 0, i % 7 === 0 ? .09 : 0], .012);
      box(p.brass, x + i * .19 * scale, y + h * .75, z + .172 * scale, .14 * scale, .026, .018, [0, 0, 0], .003);
    }
  }
  function desk(x: number, z: number, width = 3.4, depth = 1.35) {
    box(p.honey, x, 1.19, z, width, .2, depth, [0, 0, 0], .045);
    box(p.darkWood, x, 1.08, z + depth / 2 - .09, width - .24, .11, .14);
    for (const side of [-1, 1]) {
      box(p.darkWood, x + side * (width / 2 - .26), .56, z, .2, 1.12, depth - .2);
      box(p.wood, x + side * (width / 2 - .27), .12, z, .36, .12, depth - .15);
      sphere(p.metal, x + side * (width / 2 - .3), 1.075, z + depth / 2 - .005, .035);
    }
    beam(p.wood, [x - width / 2 + .28, .3, z], [x + width / 2 - .28, .3, z], .08);
    box(p.wood, x, .9, z + depth / 2 - .17, width * .55, .22, .25);
    box(p.brass, x, .9, z + depth / 2 - .025, .28, .035, .025, [0, 0, 0], .009);
  }
  function monitor(x: number, y: number, z: number, width = 2.1, kind = 0) {
    const height = width * .61;
    box(p.metal, x, y + .13, z, width * .34, .07, .46);
    box(p.metal, x, y + .4, z, .13, .58, .13);
    box(p.ink, x, y + .55 + height / 2, z, width, height, .17);
    box(p.glass, x, y + .55 + height / 2, z + .093, width - .15, height - .15, .022);
    if (kind % 3 === 0) {
      for (let row = 0; row < 7; row++) {
        const w = width * (.31 + (row * 3 % 5) * .058);
        box(row % 3 ? p.cyan : p.violet, x - width * .37 + w / 2, y + .7 + row * height * .095,
          z + .11, w, .028, .012, [0, 0, 0], .003);
      }
    } else if (kind % 3 === 1) {
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * Math.PI * 2, px = x + Math.sin(a) * width * .29, py = y + .55 + height / 2 + Math.cos(a) * height * .3;
        box(i % 2 ? p.cyan : p.violet, px, py, z + .12, width * .14, height * .13, .015, [0, 0, 0], .03);
        beam(p.cyan, [x, y + .55 + height / 2, z + .113], [px, py, z + .113], .018, 5);
      }
    } else {
      for (let col = 0; col < 5; col++) {
        const h = height * (.2 + col * .085);
        box(p.cyan, x - width * .32 + col * width * .16, y + .68 + h / 2, z + .113, width * .09, h, .014);
      }
    }
    box(p.cream, x, y + .015, z + .45, width * .6, .055, .32, [0, 0, 0], .025);
    for (let row = 0; row < 3; row++) box(p.metal, x, y + .045, z + .34 + row * .08,
      width * .52, .012, .023, [0, 0, 0], .004);
  }
  function notebook(x: number, y: number, z: number) {
    box(p.violet, x, y, z, 1.25, .1, .85, [0, -.1, 0]);
    for (const side of [-1, 1]) box(p.cream, x + side * .3, y + .07, z, .58, .06, .77, [0, -.1, side * -.05]);
    for (let row = 0; row < 5; row++) box(p.wood, x + .26, y + .11, z - .26 + row * .12, .38, .009, .013);
  }
  function stationFurniture(area: Island) {
    const stations = WORLD_STATIONS.filter((station) => station.island === area.id);
    for (const station of stations) {
      const x = station.x - origin.x, z = station.z - origin.z;
      const savedY = origin.y;
      origin.y = area.id === "projects" ? DIGITAL_WORKSHOP_DECK.top
        : area.id === "education" ? ARCHIVE_OBSERVATORY_DECK.top
        : area.id === "skills" ? SUSPENDED_LAB_DECK.top
        : area.id === "dance" ? DANCE_PAVILION_DECK.top
        : area.id === "contact" ? CONTACT_LIGHTHOUSE_DECK.top : getTerrainHeight(station.x, station.z);
      if (area.id === "tesla" && station.index === 0) { origin.y = savedY; continue; }
      desk(x, z, station.width, station.depth);
      if (area.id === "about") {
        notebook(x + .35, 1.34, z + .13);
        monitor(x - .9, 1.3, z - .18, 1.45, 0);
      } else if (area.id === "education") {
        notebook(x, 1.33, z);
        books(x - 1.1, 1.3, z - .3, 3);
      } else if (area.id === "dance") {
        notebook(x, 1.34, z);
        cylinder(p.brass, x + .85, 1.5, z, .1, .16, .4);
      } else if (area.id === "contact") {
        box(p.metal, x, 1.64, z, 1.6, .62, .68);
        box(p.cyan, x - .27, 1.71, z + .354, .52, .17, .03);
        for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(.075, .075, .06, 10), p.brass, x + .24 + i * .17, 1.6, z + .365, [1, 1, 1], [Math.PI / 2, 0, 0]);
        beam(p.metal, [x + .63, 1.94, z - .2], [x + .83, 3.1, z - .2], .035);
      } else if (area.id === "tesla") {
        for (let i = 0; i < 5; i++) box([p.cream, p.violet, p.coral, p.glass, p.brass][i], x - 1 + i * .46, 1.34, z,
          .35, .055, .8, [.13, 0, 0]);
      } else {
        monitor(x, 1.3, z - .18, area.id === "projects" ? 2.8 : 1.9, station.index);
        if (area.id === "projects" && station.index === 1) {
          add(new THREE.TorusGeometry(.42, .085, 8, 20), p.cream, x + 1.5, 1.7, z + .2, [1.2, .65, .8], [.7, 0, 0]);
        }
      }
      origin.y = savedY;
    }
  }

  function sharedStructuralShell(area: Island) {
    for (const hull of WORLD_STRUCTURE_HULLS.filter((item) => item.island === area.id)) {
      const x = hull.x - origin.x, y = hull.y - origin.y, z = hull.z - origin.z;
      if (hull.role === "post") {
        box(p.wood, x, y, z, hull.width, hull.height, hull.depth, [0, hull.yaw, 0], .055);
        for (const h of [.28, hull.height - .35]) {
          const bandY = y - hull.height / 2 + h;
          box(p.darkWood, x, bandY, z, hull.width + .035, .11, hull.depth + .035);
          sphere(p.brass, x, bandY, z + hull.depth / 2 + .025, .037);
        }
      } else if (hull.role === "wall") {
        const masonry = area.id === "tesla" || area.id === "education";
        box(masonry ? p.stone : p.honey, x, y, z,
          hull.width, hull.height, hull.depth, [0, hull.yaw, 0], .035);
        for (let px = -hull.width / 2 + .3; px < hull.width / 2; px += 2.4) {
          box(p.darkWood, x + px, y, z + hull.depth * .55, .12, hull.height, .07);
        }
        for (let py = .3; py < hull.height; py += .52) {
          box(masonry ? p.cream : p.wood, x, y - hull.height / 2 + py, z + hull.depth * .54,
            hull.width - .06, .022, .027, [0, 0, 0], .003);
        }
        box(p.darkWood, x, y - hull.height / 2 + .13, z + hull.depth * .56, hull.width, .22, .08);
        box(p.honey, x, y + hull.height / 2 - .13, z + hull.depth * .56, hull.width, .22, .08);
      } else if (hull.role === "foundation") {
        // Imported Contact failure retains visible toe masonry at its actual
        // shared collision bounds, not invisible boxes beneath a floating hut.
        box(p.stone, x, y, z, hull.width, hull.height, hull.depth, [0, hull.yaw, 0], .008);
      } else if ((area.id === "about" || area.id === "projects" || area.id === "education" || area.id === "skills" || area.id === "dance" || area.id === "contact") && (hull.role === "furniture" || hull.role === "machine")) {
        // The network-error blockout is also visible solid furniture. Never
        // retain invisible imported-model colliders when a GLB cannot load.
        // Workshop desks are already legible, matching-height station furniture.
        if (area.id === "projects" && hull.id.endsWith("-station")) continue;
        const mat = hull.id.includes("pot") ? p.tile : hull.id.includes("chair") ? p.ink : p.honey;
        if (hull.kind === "cylinder") cylinder(mat, x, y, z, hull.radius!, hull.radius!, hull.height, 16);
        else box(mat, x, y, z, hull.width, hull.height, hull.depth);
      }
    }
  }

  function studio(area: Island) {
    // Honest solid fallback while the reference-led GLB loads, or on failure.
    // One flat supported deck, not a board deformed below an offshore corner.
    const count = 24, interval = HOME_STUDIO_DECK.depth / count;
    for (let i = 0; i < count; i++) box(p.honey, 0, -.12,
      -HOME_STUDIO_DECK.depth / 2 + (i + .5) * interval,
      HOME_STUDIO_DECK.width, .24, interval - .014, [0, 0, 0], .018);
    box(p.honey, -2, 1.17, 0, 4.22, .12, 1.34);
    for (const x of [-3.66, -.36]) box(p.wood, x, .55, -.1, .6, 1.1, .88);
    for (const x of [-2.86, -1.28]) {
      box(p.metal, x, 1.43, -.34, .06, .36, .07);
      box(p.metal, x, 1.81, -.3, 1.4, .84, .11);
      box(p.glass, x, 1.82, -.235, 1.29, .73, .014);
    }
    notebook(-2, 1.27, .3);
    // Coarse roof does not introduce extra solid poles beyond the shared hulls.
    box(p.tile, -.97, 4.72, -2.48, 9.74, .12, 3.3, [-.38, 0, 0]);
    lantern(-4.7, 3.3, -3.2, .65);
    void area;
  }
  function workshop(area: Island) {
    // Honest network-error blockout: exact flat deck and shared solid hulls.
    // No duplicate loft, stairs, extra floor or uncoupled decorative posts.
    const count = 40, interval = DIGITAL_WORKSHOP_DECK.depth / count;
    for (let i = 0; i < count; i++) box(p.honey, 0, -.12,
      -DIGITAL_WORKSHOP_DECK.depth / 2 + (i + .5) * interval,
      DIGITAL_WORKSHOP_DECK.width, .24, interval - .014, [0, 0, 0], .018);
    beam(p.honey, [-13.8, 6.4, -10.8], [0, 9.4, -10.8], .22);
    beam(p.honey, [0, 9.4, -10.8], [13.8, 6.6, -10.8], .22);
    lantern(-13.2, 3.8, -3, .8); lantern(13.2, 3.8, -3, .8);
    stationFurniture(area);
  }
  function floatingLab(area: Island) {
    // Same supported floor and visible conservative solids as the GLB. The
    // fallback is intentionally simpler, but never leaves invisible furniture.
    const interval = SUSPENDED_LAB_DECK.depth / 30;
    for (let i = 0; i < 30; i++) box(p.honey, 0, -.12,
      -SUSPENDED_LAB_DECK.depth / 2 + (i + .5) * interval,
      SUSPENDED_LAB_DECK.width, SUSPENDED_LAB_DECK.thickness, interval - .014, [0, 0, 0], .018);
    for (const [x, z] of [[-8, 1], [0, -3], [8, 1]]) {
      cylinder(p.metal, x, -18.66, z, 1.05, .62, 3.33, 24);
      cylinder(p.cyan, x, -20.25, z, .43, .43, .07, 24);
    }
    beam(p.honey, [-9.1, 6.5, -7], [9.1, 7.3, -7], .24);
    lantern(-7.4, 3.2, -3, .8); lantern(7.4, 3.2, -3, .8);
    stationFurniture(area);
  }
  function observatory(area: Island) {
    // Exact flat structural support and the source hulls remain visible when
    // the independently loaded archive GLB is unavailable. No historic poles,
    // shelves or terrain-conforming floor overlap the new collision contract.
    box(p.stone, 0, -ARCHIVE_OBSERVATORY_DECK.thickness / 2, 0,
      ARCHIVE_OBSERVATORY_DECK.width, ARCHIVE_OBSERVATORY_DECK.thickness, ARCHIVE_OBSERVATORY_DECK.depth, [0, 0, 0], .018);
    cylinder(p.stone, 4, 3.6, -2.7, 3.5, 3.7, 7.2, 40);
    cylinder(p.honey, 4, 7.15, -2.7, 3.7, 3.7, .25, 40);
    add(new THREE.SphereGeometry(3.62, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2), p.metal, 4, 7.2, -2.7);
    for (let i = 0; i < 10; i++) {
      const points: THREE.Vector3[] = [], angle = i / 10 * Math.PI * 2;
      for (let j = 0; j <= 10; j++) {
        const phi = j / 10 * Math.PI / 2;
        points.push(new THREE.Vector3(4 + Math.cos(angle) * Math.sin(phi) * 3.64, 7.2 + Math.cos(phi) * 3.64, -2.7 + Math.sin(angle) * Math.sin(phi) * 3.64));
      }
      tube(p.brass, points, .035, 12);
    }
    beam(p.brass, [4.6, 8.8, -.7], [6.1, 11.1, 2], .55, 20);
    sphere(p.ink, 6.12, 11.13, 2.05, .57);
    // Archive wing stays open to the player; no mandatory door or loading room.
    canopy(8.7, 5.8, 4.65, -4.15, -3.25, false);
    lantern(-7.75, 2.9, -.75, .7); lantern(7.8, 2.9, 1.45, .7);
    vines(6.7, 7, -1, 5.5, 2);
    stationFurniture(area);
  }
  function lighthouse(area: Island) {
    const floor = CONTACT_LIGHTHOUSE_DECK;
    box(p.honey, floor.x - origin.x, -.12, floor.z - origin.z,
      floor.width, floor.thickness, floor.depth, [0, 0, 0], .012);
    cylinder(p.stone, 0, -.06, 0, 2.4, 2.4, .12, 32);
    cylinder(p.stone, 0, 6.5, 0, 1.9, 2.4, 13, 32);
    cylinder(p.tile, 0, 4.4, 0, 2.23, 2.31, 1.05, 32);
    cylinder(p.tile, 0, 9.1, 0, 2.05, 2.1, .95, 32);
    cylinder(p.honey, 0, 13.02, 0, 2.65, 2.65, .35, 32);
    cylinder(p.glow, 0, 14.3, 0, 1.45, 1.45, 2.1, 16);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      beam(p.darkWood, [Math.cos(a) * 1.6, 13, Math.sin(a) * 1.6], [Math.cos(a) * 1.6, 15.6, Math.sin(a) * 1.6], .075);
      beam(p.darkWood, [Math.cos(a) * 2.55, 13.2, Math.sin(a) * 2.55], [Math.cos(a) * 2.55, 14.1, Math.sin(a) * 2.55], .045);
    }
    add(new THREE.TorusGeometry(2.55, .055, 6, 32), p.darkWood, 0, 14.1, 0, [1, 1, 1], [Math.PI / 2, 0, 0]);
    add(new THREE.ConeGeometry(2.23, 1.25, 24), p.tile, 0, 16.1, 0);
    sphere(p.brass, 0, 16.92, 0, .18, .4, .18);
    for (let i = 0; i < 3; i++) {
      box(p.darkWood, 0, 3 + i * 3.2, 2.31 - i * .12, .65, 1.14, .12);
      box(p.glow, 0, 3 + i * 3.2, 2.39 - i * .12, .4, .86, .04);
    }
    canopy(floor.width, floor.depth, 3.5, -5.2, 2.7);
    flag(2.5, 0, 2.9, 8.3, 1.5);
    vines(-1.9, 8.5, 1.5, 5.5, 4);
    stationFurniture(area);
  }
  function car(x: number, z: number) {
    // Original sedan study inspired by the supplied pre-refresh silhouette.
    // No claim that its paint or trim documents the owner's actual car.
    // Two continuous lofts give the hood, shoulder and fastback one silhouette.
    // They remain inside the shared 2.5 × 1.85 × 4.73 simplified car hull.
    function loft(curve: THREE.CatmullRomCurve3, rings: number, shape: (point: THREE.Vector3) => [number, number][], mat: THREE.Material) {
      const vertices: number[] = [], indices: number[] = [];
      let ringSize = 0;
      for (let ring = 0; ring <= rings; ring++) {
        const point = curve.getPoint(ring / rings), crossSection = shape(point);
        ringSize = crossSection.length;
        for (const [px, py] of crossSection) vertices.push(px, py, point.z);
        if (ring > 0) for (let edge = 0; edge < ringSize; edge++) {
          const next = (edge + 1) % ringSize, a = (ring - 1) * ringSize + edge, b = (ring - 1) * ringSize + next;
          const c = ring * ringSize + edge, d = ring * ringSize + next;
          indices.push(a, b, c, b, d, c);
        }
      }
      for (const end of [0, rings]) {
        const start = end * ringSize;
        for (let edge = 1; edge < ringSize - 1; edge++) {
          if (end === 0) indices.push(start, start + edge + 1, start + edge);
          else indices.push(start, start + edge, start + edge + 1);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      add(geometry, mat, x, 0, z);
    }
    const body = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.81, .91, -2.30), new THREE.Vector3(1.04, 1.07, -1.98),
      new THREE.Vector3(1.115, 1.08, -1.45), new THREE.Vector3(1.115, 1.10, -.45),
      new THREE.Vector3(1.115, 1.09, .78), new THREE.Vector3(1.05, 1.03, 1.70),
      new THREE.Vector3(.89, .88, 2.27),
    ]);
    loft(body, compact ? 28 : 44, (point) => {
      const halfWidth = Math.min(1.115, point.x), bottom = .43, center = (bottom + point.y) / 2, height = (point.y - bottom) / 2;
      return Array.from({ length: 24 }, (_, edge) => {
        const angle = edge / 24 * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle);
        return [Math.sign(c) * Math.abs(c) ** .6 * halfWidth, center + Math.sign(s) * Math.abs(s) ** .55 * height] as [number, number];
      });
    }, p.car);
    const cabin = new THREE.CatmullRomCurve3([
      new THREE.Vector3(.98, 1.11, -1.48), new THREE.Vector3(.96, 1.47, -1.15),
      new THREE.Vector3(.98, 1.76, -.63), new THREE.Vector3(.99, 1.78, .23),
      new THREE.Vector3(1.005, 1.60, .64), new THREE.Vector3(1.02, 1.105, 1.28),
    ]);
    loft(cabin, compact ? 22 : 36, (point) => {
      const roof = Math.min(1.79, point.y), belt = 1.045, halfWidth = point.x;
      const roofWidth = halfWidth - Math.max(0, roof - belt) * .28;
      return [[-halfWidth, belt], [-halfWidth * .985, belt + .08], [-roofWidth, Math.max(belt, roof - .06)],
        [-roofWidth * .76, roof], [0, roof + .025], [roofWidth * .76, roof],
        [roofWidth, Math.max(belt, roof - .06)], [halfWidth * .985, belt + .08], [halfWidth, belt]].reverse() as [number, number][];
    }, p.glass);
    box(p.ink, x, .48, z, 1.99, .12, 3.75, [0, 0, 0], .055);
    for (const side of [-1, 1]) {
      for (const axle of [-1.47, 1.43]) {
        add(new THREE.CylinderGeometry(.465, .465, .245, 32), p.tire, x + side * 1.09, .48, z + axle, [1, 1, 1], [0, 0, Math.PI / 2]);
        add(new THREE.TorusGeometry(.355, .095, 10, 28), p.tire, x + side * 1.145, .48, z + axle, [1, 1, 1], [0, Math.PI / 2, 0]);
        add(new THREE.CylinderGeometry(.305, .305, .252, 24), p.ink, x + side * 1.10, .48, z + axle, [1, 1, 1], [0, 0, Math.PI / 2]);
        for (let spoke = 0; spoke < 5; spoke++) {
          const angle = spoke / 5 * Math.PI * 2;
          beam(p.metal, [x + side * 1.215, .48, z + axle],
            [x + side * 1.215, .48 + Math.sin(angle) * .28, z + axle + Math.cos(angle) * .28], .025, 7);
        }
        add(new THREE.CylinderGeometry(.083, .083, .026, 16), p.metal, x + side * 1.23, .48, z + axle, [1, 1, 1], [0, 0, Math.PI / 2]);
      }
      tube(p.car, [new THREE.Vector3(x + side * .99, 1.10, z - 1.42),
        new THREE.Vector3(x + side * .86, 1.43, z - 1.15), new THREE.Vector3(x + side * .79, 1.72, z - .61)], .035, 10);
      tube(p.car, [new THREE.Vector3(x + side * 1.01, 1.11, z + 1.25),
        new THREE.Vector3(x + side * .89, 1.51, z + .70), new THREE.Vector3(x + side * .81, 1.72, z + .29)], .031, 10);
      beam(p.ink, [x + side * .99, 1.10, z - .08], [x + side * .78, 1.77, z - .12], .035, 8);
      beam(p.metal, [x + side * 1.018, 1.085, z - 1.34], [x + side * 1.031, 1.085, z + 1.22], .016, 6);
      box(p.glow, x + side * .76, .87, z + 2.175, .48, .075, .08, [0, side * -.17, side * .12], .025);
      box(p.coral, x + side * .72, .96, z - 2.235, .48, .065, .075, [0, side * .12, 0], .024);
      box(p.car, x + side * 1.115, 1.22, z + .73, .23, .13, .27, [0, side * .15, 0], .055);
      for (const door of [-.62, .62]) {
        box(p.metal, x + side * 1.117, 1.025, z + door, .02, .029, .21, [0, 0, 0], .006);
        beam(p.ink, [x + side * 1.113, .58, z + door + .42], [x + side * 1.113, .95, z + door + .42], .008, 5);
      }
    }
    box(p.ink, x, .59, z + 2.27, 1.36, .09, .075, [0, 0, 0], .025);
    box(p.cream, x, .68, z - 2.31, .39, .12, .025, [0, 0, 0], .008);
  }
  function garage(area: Island) {
    deck(19, 12);
    canopy(19, 11.5, 5.8, 0, -.5, false);
    // Solar canopy, compact real automotive workshop rather than a second IT lab.
    for (let i = 0; i < 8; i++) {
      const px = -7.4 + i * 2.1, roofY = 7.5 - Math.abs(px) * .12;
      // A rear solar strip leaves the vehicle and wrap samples visible in play.
      box(p.metal, px, roofY, -3.7, 1.96, .14, 3.7);
      box(p.glass, px, roofY + .075, -3.7, 1.78, .035, 3.5);
      for (let row = 0; row < 5; row++) box(p.metal, px, roofY + .1, -5.2 + row * .75, 1.79, .018, .023);
      for (const col of [-.45, .45]) box(p.metal, px + col, roofY + .1, -3.7, .019, .018, 3.45);
    }
    const carStation = WORLD_STATIONS.find((station) => station.island === "tesla" && station.index === 0);
    const cx = carStation ? carStation.x - origin.x : 0, cz = carStation ? carStation.z - origin.z : .3;
    car(cx, cz);
    for (const side of [-1, 1]) {
      box(p.coral, cx + side * 2.1, 2.3, cz - .4, .48, 4.6, .55);
      box(p.metal, cx + side * 1.6, .3, cz, 1.0, .15, 1.7);
      box(p.coral, side * 7.4, .95, -3.4, 2.6, 1.85, 1.5);
      for (let drawer = 0; drawer < 5; drawer++) box(p.brass, side * 7.4, .35 + drawer * .32, -2.63, 2.3, .035, .08);
    }
    for (let i = 0; i < 4; i++) {
      add(new THREE.CylinderGeometry(.24, .24, 3.1, 16), [p.violet, p.coral, p.glass, p.cream][i], -7.1, 1.1 + i * .63, 2.0,
        [1, 1, 1], [0, 0, Math.PI / 2]);
    }
    flag(8.3, 0, 5, 6.5, 1.4); lantern(8, 3.3, 4.8); lantern(-8, 3.3, 4.8);
    stationFurniture(area);
  }
  function dance(area: Island) {
    deck(DANCE_PAVILION_DECK.width, DANCE_PAVILION_DECK.depth, 0, 0, true, true);
    // The honest failure-state canopy rests on the eight shared post hulls.
    for (const x of [-10.75, 10.75]) box(p.honey, x, 5.35, 0, .30, .28, 16);
    for (const z of [-7.75, 7.75]) box(p.honey, 0, 5.35, z, 22, .28, .30);
    for (let i = 0; i < 7; i++) box(p.honey, 0, 5.43, -6.6 + i * 2.2, 22, .16, .16);
    for (const side of [-1, 1]) {
      // Drapes frame, rather than obstruct, the open dance floor.
      const geometry = new THREE.PlaneGeometry(3.1, 5.0, 18, 12);
      const vertices = geometry.attributes.position;
      for (let i = 0; i < vertices.count; i++) {
        const u = vertices.getX(i), v = vertices.getY(i);
        vertices.setZ(i, Math.sin(u * 7) * .14 + Math.pow((v + 2.5) / 5, 2) * .18);
        vertices.setX(i, u * (.42 + Math.abs(v) * .15));
      }
      geometry.computeVertexNormals();
      add(geometry, p.cream, side * 9.1, 3.0, 5.9, [1, 1, 1], [0, side * -.25, 0]);
      flag(side * 10.5, 0, 6.6, 6.7, 1.25);
      lantern(side * 9.5, .4, 7.6, .9); planter(side * 9.1, 0, 6.8, .9);
      vines(side * 9.8, 6.0, -6.2, 4.8, side);
    }
    for (let i = 0; i < 5; i++) lantern(-6 + i * 3, 4.7, -1, .66);
    // Emissive lantern meshes alone do not light the parquet or drapes.
    // Two real bounded fills match existing suspended lamps, without adding
    // five shadow maps or a permanent evening scene to this secondary area.
    for (const x of [-3, 3]) {
      const light = new THREE.PointLight("#ffd29a", 24, 12, 2);
      light.name = "Dance owned suspended-lantern light";
      light.position.set(origin.x + x, origin.y + 5, origin.z - 1);
      light.castShadow = false; target.add(light); lanternLights.push(light);
    }
    // Intentionally empty: no invented dancing couple or generic motion clip.
    stationFurniture(area);
  }
  function terraces(area: Island) {
    // Two actual experience stations, not five invented career monuments.
    WORLD_STATIONS.filter((station) => station.island === area.id).forEach((station) => {
      const x = station.x - origin.x, z = station.z - origin.z;
      awning(x, 4.1, z - 1.0, 6.5, 4);
      planter(x + 3.1, 0, z + 1.6, .85);
      flag(x - 3.0, 0, z - 1.6, 5.6, 1.2);
    });
    stationFurniture(area);
  }
  function welcome() {
    // The simple failure/loading fallback obeys the same lateral floor and
    // eleven solids as the GLB. No old plaza slab, annex, remote map or jetty.
    const count = 18, interval = WELCOME_HARBOR_DECK.depth / count;
    for (let i = 0; i < count; i++) box(p.honey, 0, -.12,
      -WELCOME_HARBOR_DECK.depth / 2 + (i + .5) * interval,
      WELCOME_HARBOR_DECK.width, .24, interval - .012, [0, 0, 0], .012);
    for (const hull of WELCOME_HARBOR.hulls) {
      const x = hull.x - origin.x, y = hull.y - origin.y, z = hull.z - origin.z;
      const mat = hull.role === "wall" ? p.stone : hull.id.includes("pot") ? p.tile : p.wood;
      if (hull.kind === "cylinder") cylinder(mat, x, y, z, hull.radius!, hull.radius!, hull.height, 20);
      else box(mat, x, y, z, hull.width, hull.height, hull.depth, [0, hull.yaw, 0], .018);
    }
    // The roof/compass/lamps are high soft scenery, not a walkable upper level.
    for (const side of [-1, 1]) box(p.tile, 0, 3.89, side * 1.04,
      6.5, .12, 2.3, [side * .5, 0, 0]);
    beam(p.honey, [-3.2, 4.49, 0], [3.2, 4.49, 0], .11);
    lantern(2.28, 2.05, 1.5, .4);
    box(p.cream, 1.1, 1.211, -.7, 1.12, .018, 1.3, [0, 0, 0], .003);
    for (let i = 0; i < 6; i++) cylinder(p.leafLight, .79 + (i % 2) * .56,
      1.23, -1.1 + Math.floor(i / 2) * .39, .1, .1, .018, 10);
    notebook(-1.6, 1.12, -.4);
    add(new THREE.TorusGeometry(.38, .035, 8, 24), p.brass, -2.85, 5.82, -2.35);
    box(p.violet, -2.22, 5.14, -2.35, 1.16, .72, .026, [0, 0, 0], .003);
  }

  for (const area of ISLANDS) {
    const anchor = getIslandLandmark(area);
    origin = new THREE.Vector3(anchor.x, getTerrainHeight(anchor.x, anchor.z), anchor.z);
    if (area.id === "about") origin.y = HOME_STUDIO_DECK.top;
    if (area.id === "projects") origin.y = DIGITAL_WORKSHOP_DECK.top;
    if (area.id === "education") origin.y = ARCHIVE_OBSERVATORY_DECK.top;
    if (area.id === "skills") origin.y = SUSPENDED_LAB_DECK.top;
    if (area.id === "dance") origin.y = DANCE_PAVILION_DECK.top;
    if (area.id === "contact") origin.set(CONTACT_LIGHTHOUSE.anchor.x, CONTACT_LIGHTHOUSE.anchor.y, CONTACT_LIGHTHOUSE.anchor.z);
    if (area.id === "welcome") origin.set(WELCOME_HARBOR_DECK.x, WELCOME_HARBOR_DECK.top, WELCOME_HARBOR_DECK.z);
    const set = new THREE.Group(); set.name = `Architecture: ${area.id}`;
    set.userData.area = area.id; group.add(set); target = set;
    if (area.id !== "welcome") sharedStructuralShell(area);
    if (area.id === "welcome") welcome();
    else if (area.id === "about") studio(area);
    else if (area.id === "projects") workshop(area);
    else if (area.id === "skills") floatingLab(area);
    else if (area.id === "education") observatory(area);
    else if (area.id === "contact") lighthouse(area);
    else if (area.id === "tesla") garage(area);
    else if (area.id === "dance") dance(area);
    else terraces(area);
    flush();
    // Small decorative details are omitted beyond a distance, while all primary
    // silhouettes and interaction objects remain continuously present.
    const details = new THREE.Group(); details.name = `Optional near detail: ${area.id}`;
    details.userData.anchor = origin.clone(); set.add(details); target = details; detail = true;
    if (area.id !== "welcome" && area.id !== "skills" && area.id !== "experience" && area.id !== "about" && area.id !== "projects" && area.id !== "education" && area.id !== "dance" && area.id !== "contact") {
      books(-2, 0, -3.1, compact ? 3 : 6, 1.1);
      planter(6.5, 0, -3.9, .7);
    }
    flush(); detailedGroups.push(details); detail = false;
  }

  // Special routes are legible physical apparatus, not invisible teleport spots.
  const launch = TRAVEL_ROUTES.find((route) => route.kind === "cannon");
  if (launch) {
    origin = new THREE.Vector3(launch.departure.x + 2.1, getTerrainHeight(launch.departure.x, launch.departure.z), launch.departure.z - .7);
    target = group;
    const rise = getGroundHeight(launch.arrival.x, launch.arrival.z) - origin.y - 1.55;
    const direction = new THREE.Vector3(launch.arrival.x - origin.x, rise, launch.arrival.z - origin.z).normalize();
    cylinder(p.wood, 0, .3, 0, 1.5, 1.6, .6, 16);
    for (const side of [-1, 1]) {
      add(new THREE.CylinderGeometry(.75, .75, .28, 16), p.wood, side * 1.0, .75, .2, [1, 1, 1], [0, 0, Math.PI / 2]);
      add(new THREE.TorusGeometry(.48, .055, 6, 18), p.brass, side * 1.16, .75, .2, [1, 1, 1], [0, Math.PI / 2, 0]);
    }
    const tail = new THREE.Vector3(0, 1.55, 0), nose = tail.clone().addScaledVector(direction, 4.0);
    beam(p.brass, tail.toArray() as [number, number, number], nose.toArray() as [number, number, number], .72, 24);
    for (const fraction of [.2, .77]) {
      const center = tail.clone().lerp(nose, fraction), band = new THREE.CylinderGeometry(.79, .79, .22, 24);
      band.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction)); add(band, p.metal, center.x, center.y, center.z);
    }
    const mouth = new THREE.CylinderGeometry(.67, .67, .035, 24);
    mouth.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, direction));
    add(mouth, p.ink, nose.x, nose.y + .018, nose.z);
    flag(-2.8, 0, -1, 5.9, 1.25); flush();
    origin = new THREE.Vector3(launch.arrival.x, getTerrainHeight(launch.arrival.x, launch.arrival.z), launch.arrival.z);
    // This soft rectangular net belongs to the lab fallback. Successful GLB
    // loading hides it together with the fallback, not the external cannon.
    target = group.getObjectByName("Architecture: skills") as THREE.Group;
    for (let i = 0; i < 15; i++) {
      const x = -1.8 + i * 3.6 / 14;
      beam(p.rope, [x, .068, -1.5], [x, .068, .5], .012, 5);
    }
    for (let i = 0; i < 9; i++) {
      const z = -1.5 + i * 2 / 8;
      beam(p.rope, [-1.8, .068, z], [1.8, .068, z], .012, 5);
    }
    for (const side of [-1, 1]) beam(p.rope, [side * 1.84, .068, -1.55], [side * 1.84, .068, .55], .026, 6);
    flush();
  }
  let disposed = false;
  return {
    group,
    setCarColor(color: string) { if (/^#[0-9a-f]{6}$/i.test(color)) p.car.color.set(color); },
    setNight(night: boolean) {
      p.glow.emissiveIntensity = night ? 1.7 : .75;
      p.cyan.emissiveIntensity = night ? .65 : .35;
      lanternLights.forEach(light => { light.intensity = night ? 40 : 24; });
    },
    setViewPosition(x: number, y: number, z: number) {
      for (const details of detailedGroups) {
        const a = details.userData.anchor as THREE.Vector3;
        details.visible = (x - a.x) ** 2 + (y - a.y) ** 2 + (z - a.z) ** 2 < (compact ? 75 : 115) ** 2;
      }
    },
    update(time: number, reducedMotion: boolean) {
      const t = reducedMotion ? 0 : time;
      for (const { group: mechanism, axis, speed } of mechanisms) mechanism.rotation[axis] = t * speed;
      for (const { mesh, phase } of cloths) mesh.rotation.y = Math.sin(t * .65 + phase) * .035;
    },
    dispose() {
      if (disposed) return; disposed = true;
      for (const parts of batches.values()) parts.forEach((geometry) => geometry.dispose());
      batches.clear(); geometries.forEach((geometry) => geometry.dispose()); materials.forEach((mat) => mat.dispose()); group.clear();
      lanternLights.forEach(light => light.dispose()); lanternLights.length = 0;
    },
  };
}

export type IslandArchitecture = ReturnType<typeof createIslandArchitecture>;
