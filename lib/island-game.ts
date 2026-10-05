import * as THREE from "three";
import { gsap } from "gsap";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createIslandWorld } from "@/lib/island-world";
import { createIslandPhysics } from "@/lib/island-physics";
import { createIslandAudio } from "@/lib/island-audio";
import { createIslandHotspots } from "@/lib/island-hotspots";
import { createTransitProps } from "@/lib/island-transit";
import { createIslandAtmosphere } from "@/lib/island-atmosphere";
import { createIslandBackdrop } from "@/lib/island-backdrop";
import { createIslandExplorer } from "@/lib/island-explorer";
import { getIslandWalkingShot, ISLAND_CAMERA_FOV, ISLAND_WALKING_SHOTS } from "@/lib/island-camera";
import { collectIslandOverviewPoints, fitIslandOverview, islandOverviewSafeRect } from "@/lib/island-overview";
import type { ExhibitCopy } from "@/lib/island-exhibit-copy";
import { getArrival, getBoatRoutePoint, getGroundHeight, getIsland, getTerrainHeight, islandAt, SPAWN, TRAVEL_ROUTES, WATER_LEVEL, WORLD_BOUNDS, WORLD_STATIONS, type IslandId, type PortfolioIslandId } from "@/lib/island-map";

const DAY_HEMISPHERE_INTENSITY = 0.48;
const DAY_FILL_INTENSITY = 0.32;

type Callbacks = {
  label: string;
  exhibits: ExhibitCopy;
  markers: HTMLElement[];
  onIsland: (id: IslandId | null) => void;
  onPosition: (x: number, z: number) => void;
  onStation: (id: string | null, inspecting: boolean) => void;
  onOpenObject: (island: PortfolioIslandId, index: number) => void;
  onTravel: (routeId: string | null, running: boolean) => void;
  onMap: () => void;
  onError: () => void;
};

function createExplorerFallback() {
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const material = (color: string) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    materials.push(m); return m;
  };
  const violet = material("#8560ef"), skin = material("#efb487"), dark = material("#303247");
  const hair = material("#493735"), white = material("#fff5e2"), orange = material("#ffb447");
  const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    geometries.push(geo);
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  const box = (w: number, h: number, d: number, r = 0.09) => new RoundedBoxGeometry(w, h, d, 2, r);
  const body = new THREE.Group(); group.add(body);
  add(body, box(0.7, 0.72, 0.48), violet, 0, 1.02, 0);
  add(body, box(0.53, 0.57, 0.29), orange, 0, 1.04, -0.34);
  add(body, box(0.68, 0.7, 0.62, 0.18), skin, 0, 1.75, 0.015);
  add(body, box(0.72, 0.31, 0.65), hair, 0, 2.05, -0.04);
  add(body, box(0.79, 0.18, 0.73), violet, 0, 2.15, -0.01);
  add(body, box(0.67, 0.065, 0.42, 0.02), violet, 0, 2.08, 0.42);
  add(body, box(0.07, 0.12, 0.025, 0.015), dark, -0.16, 1.8, 0.331);
  add(body, box(0.07, 0.12, 0.025, 0.015), dark, 0.16, 1.8, 0.331);
  add(body, box(0.15, 0.09, 0.12, 0.03), skin, 0, 1.67, 0.36);
  add(body, box(0.18, 0.035, 0.025, 0.008), white, 0, 1.54, 0.334);
  const arms: THREE.Group[] = [], legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.44, 1.31, 0); body.add(arm); arms.push(arm);
    add(arm, box(0.24, 0.33, 0.3), violet, 0, -0.12, 0);
    add(arm, box(0.19, 0.38, 0.23), skin, 0, -0.38, 0);
    const leg = new THREE.Group(); leg.position.set(side * 0.2, 0.73, 0); group.add(leg); legs.push(leg);
    add(leg, box(0.27, 0.52, 0.29), dark, 0, -0.22, 0);
    add(leg, box(0.33, 0.2, 0.49), white, 0, -0.6, 0.09);
  }
  let previousOpacity = 1;
  return {
    group,
    setInspectionFade(progress: number) {
      const opacity = 1 - THREE.MathUtils.smoothstep(progress, 0.25, 0.75);
      if (opacity === previousOpacity) return;
      previousOpacity = opacity;
      group.visible = opacity > 0;
      for (const material of materials) {
        const transparent = opacity < 1;
        if (material.transparent !== transparent) {
          material.transparent = transparent;
          material.needsUpdate = true;
        }
        material.opacity = opacity;
        material.depthWrite = !transparent;
      }
    },
    animate(time: number, speed: number, jumping: boolean, reduced: boolean) {
      const stride = Math.sin(time * 11) * Math.min(speed, 1) * 0.68;
      legs.forEach((leg, i) => { leg.rotation.x = jumping ? (i ? -0.4 : 0.7) : stride * (i ? 1 : -1); });
      arms.forEach((arm, i) => { arm.rotation.x = jumping ? -1 : stride * (i ? -1 : 1); });
      body.position.y = reduced ? 0 : Math.sin(time * (speed > 0.1 ? 22 : 2)) * (speed > 0.1 ? 0.045 : 0.018);
    },
    dispose() { geometries.forEach((g) => g.dispose()); materials.forEach((m) => m.dispose()); },
  };
}

/** A single game loop. No window keyboard interception and no scroll-based scene. */
export async function createIslandGame(host: HTMLDivElement, callbacks: Callbacks) {
  const physics = await createIslandPhysics();
  const audio = createIslandAudio();
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" }); }
  catch (error) { physics.dispose(); audio.dispose(); throw error; }
  const compact = matchMedia("(pointer: coarse)").matches || host.clientWidth < 760;
  renderer.setPixelRatio(Math.min(devicePixelRatio, compact ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Keep the terracotta/violet/foliage pigments, rather than bleaching bright
  // daylight into the grey ACES shoulder. This is the Blender delivery curve.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-label", callbacks.label);
  canvas.setAttribute("aria-describedby", "island-controls");
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#71beed");
  const fog = new THREE.Fog("#b8dfe8", 420, 1250);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(ISLAND_CAMERA_FOV, 1, 0.1, 1800);
  const ambient = new THREE.HemisphereLight("#c5e7ff", "#89603a", DAY_HEMISPHERE_INTENSITY); scene.add(ambient);
  const sun = new THREE.DirectionalLight("#ffedcd", 2.65);
  sun.position.set(-30, 55, 35); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 140 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035; scene.add(sun, sun.target);
  sun.shadow.radius = 2.5;
  const fill = new THREE.DirectionalLight("#b7ddff", DAY_FILL_INTENSITY); fill.position.set(35, 18, -35); scene.add(fill);

  let world: ReturnType<typeof createIslandWorld>;
  let atmosphere: ReturnType<typeof createIslandAtmosphere> | undefined;
  let backdrop: ReturnType<typeof createIslandBackdrop> | undefined;
  try {
    atmosphere = createIslandAtmosphere(renderer, compact);
    scene.add(atmosphere.sky);
    scene.environment = atmosphere.setNight(false);
    scene.environmentIntensity = .38;
    backdrop = createIslandBackdrop({ compact }); scene.add(backdrop.group);
    world = createIslandWorld({ compact });
  } catch (error) {
    backdrop?.dispose(); atmosphere?.dispose(); physics.dispose(); audio.dispose(); sun.shadow.dispose(); renderer.dispose(); canvas.remove(); throw error;
  }
  scene.add(world.group);
  let exhibits: ReturnType<typeof createIslandHotspots> | undefined;
  let pendingExplorer: ReturnType<typeof createIslandExplorer> | undefined;
  let transitProps: ReturnType<typeof createTransitProps>;
  try {
    exhibits = createIslandHotspots();
    pendingExplorer = createIslandExplorer(createExplorerFallback());
    transitProps = createTransitProps();
  } catch (error) {
    pendingExplorer?.dispose(); exhibits?.dispose(); world.dispose(); backdrop.dispose(); atmosphere.dispose(); physics.dispose(); audio.dispose();
    sun.shadow.dispose(); renderer.dispose(); canvas.remove(); throw error;
  }
  // Capture the initialized instance so callbacks retain a non-optional owner.
  const exhibition = exhibits;
  const explorer = pendingExplorer;
  scene.add(exhibition.group, explorer.group);
  scene.add(transitProps.boat, transitProps.parachute);
  explorer.group.position.set(SPAWN.x, getGroundHeight(SPAWN.x, SPAWN.z), SPAWN.z);
  const position = explorer.group.position.clone();
  const focus = new THREE.Vector3(-20, 5, -5);
  const overviewFocus = focus.clone();
  // Foreground explorer, inhabited middle ground and a visible horizon. The
  // projected composition is checked independently in island-camera-check.
  const viewOffset = new THREE.Vector3(...ISLAND_WALKING_SHOTS.default.direction);
  const walkingOffset = viewOffset.clone();
  const desiredWalkingOffset = viewOffset.clone();
  const overviewOffset = new THREE.Vector3(30, 80, 130);
  const cameraOffset = viewOffset.clone();
  const inspectOffset = viewOffset.clone();
  const inspectTarget = new THREE.Vector3();
  const target = new THREE.Vector3();
  const shadowFocus = new THREE.Vector3(Infinity, Infinity, Infinity);
  const shadowExplorer = new THREE.Vector3(Infinity, Infinity, Infinity);
  const lightFocus = new THREE.Vector3();
  const overviewLightFocus = new THREE.Vector3((WORLD_BOUNDS.minX + WORLD_BOUNDS.maxX) / 2, 14,
    (WORLD_BOUNDS.minZ + WORLD_BOUNDS.maxZ) / 2);
  const sunOffset = new THREE.Vector3(-30, 55, 35);
  const localSunDistance = sunOffset.length();
  const sunDirection = sunOffset.clone().normalize();
  const overviewShadowExtent = Math.hypot((WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX) / 2,
    (WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ) / 2) + 20;
  let lightingDirty = true;
  const input = new Set<string>();
  const touch = { x: 0, y: 0 };
  const transition = { play: 0, inspect: 0 };
  let started = false, paused = false, disposed = false, reduced = false, lost = false;
  let frame = 0, lastTime = 0, elapsed = 0, reportTime = 0, strideTime = 0;
  let grounded = true;
  const discoveries = new Set<IslandId>();
  let activeIsland: IslandId | null = "welcome";
  let nearbyStation: typeof WORLD_STATIONS[number] | undefined;
  let inspectedStation: typeof WORLD_STATIONS[number] | undefined;
  let inspectionOccludesExplorer = false;
  let stationId: string | null = null;
  type Route = typeof TRAVEL_ROUTES[number];
  let nearbyRoute: Route | undefined;
  let routeId: string | null = null;
  let transit: { route: Route; elapsed: number; start: THREE.Vector3; end: THREE.Vector3 } | undefined;
  let aspect = 1;
  let overviewHeight = 120;
  let overviewDistance = 300;
  // Bounds are gathered only on construction/asset changes, never per frame.
  let overviewPoints = collectIslandOverviewPoints(world.getOverviewRoots());
  let viewportWidth = 1, viewportHeight = 1;
  const project = new THREE.Vector3(), right = new THREE.Vector3(), forward = new THREE.Vector3(), movement = new THREE.Vector3();

  const resize = () => {
    const { width, height, left, top } = host.getBoundingClientRect();
    if (!width || !height) return;
    aspect = width / height;
    viewportWidth = width; viewportHeight = height;
    renderer.setSize(width, height, false);
    // Balance projected scenery within the available HUD rectangle. Raising the
    // camera without recentering would zoom out; changing FOV alone cannot fit it.
    const headerRect = host.parentElement?.querySelector<HTMLElement>(".island-header")?.getBoundingClientRect();
    const introRect = !started ? host.parentElement?.querySelector<HTMLElement>(".island-welcome")?.getBoundingClientRect() : undefined;
    const fitted = fitIslandOverview(overviewPoints, { direction: overviewOffset,
      aspect, fov: camera.fov, near: camera.near,
      safeRect: islandOverviewSafeRect(width, height, !started, {
        navBottom: headerRect ? headerRect.bottom - top : undefined,
        introRight: introRect ? introRect.right - left : undefined,
        introTop: introRect ? introRect.top - top : undefined,
      }) });
    overviewFocus.copy(fitted.focus); overviewHeight = fitted.halfHeight; overviewDistance = fitted.distance;
    if (!started) focus.copy(overviewFocus);
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const jump = () => { if (started && !paused && !inspectedStation && !transit) { physics.jump(); if (grounded) audio.jump(); } };
  const clearInput = () => { input.clear(); touch.x = touch.y = 0; physics.stop(); };
  const leaveStation = (restoreFocus = true) => {
    if (!inspectedStation) return;
    inspectedStation = undefined; clearInput();
    gsap.to(transition, { inspect: 0, duration: reduced ? 0 : 0.8, ease: "power3.inOut", overwrite: "auto" });
    callbacks.onStation(nearbyStation?.id ?? null, false);
    if (restoreFocus) focusCanvas();
  };
  const inspect = (station = nearbyStation) => {
    if (!station || paused || !started || lost || transit) return;
    inspectedStation = station; clearInput();
    // Very close approaches put the explorer between camera and text. Fade only
    // that foreground obstruction; keep its physical position untouched.
    inspectionOccludesExplorer = Math.hypot(position.x - station.x, position.z - station.z) < 4.25;
    inspectTarget.set(station.x, getGroundHeight(station.x, station.z) + 1.5, station.z);
    // A close, raised camera clears the explorer and foliage. Its lowest mobile
    // rays stay above ground, avoiding an accidental cutaway of the island.
    inspectOffset.set(Math.sin(station.yaw) * 12 + 6, 10, Math.cos(station.yaw) * 12);
    exhibition.setActive(station.id);
    callbacks.onStation(station.id, true);
    gsap.to(transition, { inspect: 1, duration: reduced ? 0 : 1.1, ease: "power3.inOut", overwrite: "auto" });
    callbacks.onOpenObject(station.island, station.index);
  };
  const finishTransit = () => {
    if (!transit) return;
    const destination = transit.route.to;
    const arrival = transit.route.arrival;
    transit = undefined;
    transitProps.boat.visible = transitProps.parachute.visible = false;
    physics.teleport(arrival.x, arrival.z);
    position.set(arrival.x, getGroundHeight(arrival.x, arrival.z), arrival.z);
    activeIsland = destination; clearInput(); grounded = true;
    callbacks.onIsland(destination); callbacks.onTravel(null, false);
    routeId = null;
    if (!paused) focusCanvas();
  };
  const beginTransit = (id?: string) => {
    const route = id ? TRAVEL_ROUTES.find((item) => item.id === id) : nearbyRoute;
    if (!route || !started || paused || lost || transit) return;
    // A world transport is offered only at its actual departure, never remotely.
    if (Math.hypot(position.x - route.departure.x, position.z - route.departure.z) > 10) return;
    leaveStation(false); clearInput();
    transit = { route, elapsed: 0,
      start: new THREE.Vector3(route.departure.x, getGroundHeight(route.departure.x, route.departure.z), route.departure.z),
      end: new THREE.Vector3(route.arrival.x, getGroundHeight(route.arrival.x, route.arrival.z), route.arrival.z) };
    callbacks.onStation(null, false); callbacks.onTravel(route.id, true);
    if (reduced) finishTransit();
    else focusCanvas();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!started || paused || event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.code;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "ShiftLeft", "ShiftRight", "KeyE", "Enter", "KeyM", "Escape"].includes(key)) event.preventDefault();
    if (transit) {
      if (!event.repeat && ["Escape", "Enter", "KeyE"].includes(key)) finishTransit();
      return;
    }
    if (inspectedStation) {
      if (!event.repeat && ["KeyE", "Escape", "Enter"].includes(key)) leaveStation();
      if (!event.repeat && key === "KeyM") { leaveStation(); callbacks.onMap(); }
      return;
    }
    input.add(key);
    if (!event.repeat) {
      if (key === "Space") jump();
      if (key === "KeyE" || key === "Enter") { if (nearbyRoute) beginTransit(); else inspect(); }
      if (key === "KeyM" || key === "Escape") { clearInput(); callbacks.onMap(); }
    }
  };
  const onKeyUp = (event: KeyboardEvent) => { input.delete(event.code); };
  const focusCanvas = () => canvas.focus({ preventScroll: true });
  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("blur", clearInput);
  canvas.addEventListener("pointerdown", focusCanvas);
  window.addEventListener("blur", clearInput);

  const render = (now: number) => {
    if (disposed || lost || document.hidden) return;
    frame = requestAnimationFrame(render);
    // Rapier consumes up to six fixed 60 Hz steps, including on slower devices.
    const delta = Math.min(lastTime ? (now - lastTime) / 1000 : 0, 0.1); lastTime = now;
    elapsed += delta * (paused ? 0.2 : 1);
    let speed = 0;
    if (transit && !paused) {
      transit.elapsed += delta;
      const t = Math.min(1, transit.elapsed / transit.route.duration);
      const eased = t * t * (3 - 2 * t);
      position.lerpVectors(transit.start, transit.end, eased);
      if (transit.route.kind === "cannon") position.y += Math.sin(Math.PI * t) * 28;
      if (transit.route.kind === "parachute") position.y += Math.sin(Math.PI * t) * 8;
      if (transit.route.kind === "boat") {
        // Smooth ramps at the dock ends, a sea-level passage across the bay.
        const departure = THREE.MathUtils.smoothstep(t, 0, 0.16);
        const arrival = THREE.MathUtils.smoothstep(t, 0.84, 1);
        position.y = THREE.MathUtils.lerp(transit.start.y, WATER_LEVEL + 0.55, departure);
        position.y = THREE.MathUtils.lerp(position.y, transit.end.y, arrival);
        const point = getBoatRoutePoint(transit.route, t);
        position.x = point.x; position.z = point.z;
      }
      if (transit.route.kind === "boat") {
        const velocity = 6 * t * (1 - t);
        explorer.group.rotation.y = Math.atan2((transit.end.x - transit.start.x) * velocity, (transit.end.z - transit.start.z) * velocity + Math.PI * 13 * Math.cos(Math.PI * t));
      } else explorer.group.rotation.y = Math.atan2(transit.end.x - transit.start.x, transit.end.z - transit.start.z);
      transitProps.boat.visible = transit.route.kind === "boat";
      transitProps.parachute.visible = transit.route.kind === "parachute";
      transitProps.boat.position.copy(position); transitProps.boat.rotation.y = explorer.group.rotation.y;
      transitProps.parachute.position.copy(position);
      grounded = transit.route.kind === "boat";
      if (t === 1) finishTransit();
    }
    if (started && !paused && !inspectedStation && !transit) {
      const x = Number(input.has("KeyD") || input.has("ArrowRight")) - Number(input.has("KeyA") || input.has("ArrowLeft")) + touch.x;
      const y = Number(input.has("KeyW") || input.has("ArrowUp")) - Number(input.has("KeyS") || input.has("ArrowDown")) + touch.y;
      right.set(1, 0, 0).applyQuaternion(camera.quaternion); right.y = 0; right.normalize();
      camera.getWorldDirection(forward); forward.y = 0; forward.normalize();
      movement.copy(right).multiplyScalar(x).addScaledVector(forward, y);
      if (movement.lengthSq() > 1) movement.normalize();
      const velocity = input.has("ShiftLeft") || input.has("ShiftRight") ? 12 : 7.5;
      const state = physics.update(movement.x * velocity, movement.z * velocity, delta);
      const moved = Math.hypot(position.x - state.x, position.z - state.z);
      speed = delta > 0 ? Math.min(1.5, moved / delta / 7.5) : 0;
      position.set(state.x, state.y, state.z); grounded = state.grounded;
      if (moved > 0.002 && grounded) audio.step();
      if (speed > 0.01) {
        const heading = Math.atan2(movement.x, movement.z);
        const difference = Math.atan2(Math.sin(heading - explorer.group.rotation.y), Math.cos(heading - explorer.group.rotation.y));
        explorer.group.rotation.y += difference * (1 - Math.exp(-16 * delta));
      }
      const next = islandAt(position.x, position.z)?.id ?? null;
      if (next !== activeIsland) {
        activeIsland = next; callbacks.onIsland(next);
        if (next && next !== "welcome" && !discoveries.has(next)) { discoveries.add(next); audio.discover(); }
      }
    }
    if (started && !inspectedStation && !transit) {
      let closest = 5.5;
      nearbyStation = undefined;
      for (const station of WORLD_STATIONS) {
        const dx = position.x - station.x, dz = position.z - station.z;
        const distance = Math.hypot(dx, dz);
        // Only offer inspection from the readable side of a nearby exhibit.
        if (distance < closest && Math.abs(position.y - getGroundHeight(station.x, station.z)) < 3) {
          closest = distance; nearbyStation = station;
        }
      }
      nearbyRoute = TRAVEL_ROUTES.find((route) => Math.hypot(position.x - route.departure.x, position.z - route.departure.z) < 7);
      if ((nearbyRoute?.id ?? null) !== routeId) {
        routeId = nearbyRoute?.id ?? null; callbacks.onTravel(routeId, false);
      }
      if ((nearbyStation?.id ?? null) !== stationId) {
        stationId = nearbyStation?.id ?? null;
        exhibition.setActive(stationId); callbacks.onStation(stationId, false);
      }
    }
    explorer.group.position.copy(position);
    explorer.setInspectionFade(inspectionOccludesExplorer ? transition.inspect : 0);
    strideTime += delta * (input.has("ShiftLeft") || input.has("ShiftRight") ? 1.45 : 1);
    explorer.animate(strideTime, paused ? 0 : speed, !grounded, reduced);
    const walkingShot = getIslandWalkingShot(activeIsland, aspect);
    target.copy(started ? position : overviewFocus);
    if (started && !transit) {
      target.x += walkingShot.focus[0]; target.y += walkingShot.focus[1]; target.z += walkingShot.focus[2];
    }
    if (transition.inspect > 0) target.lerp(inspectTarget, transition.inspect);
    if (transition.inspect > 0 && aspect > 1) {
      right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      target.addScaledVector(right, 4.5 * transition.inspect);
    }
    focus.lerp(target, reduced ? 1 : 1 - Math.exp(-4.5 * delta));
    const transitPhase = transit ? transit.elapsed / transit.route.duration : 0;
    const transitZoom = transit ? THREE.MathUtils.smoothstep(transitPhase, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(transitPhase, 0.8, 1)) : 0;
    // The compact studio is viewed from its open veranda, not through the port
    // roof in the foreground. Interpolate direction (also used by movement),
    // never snap the camera or move the physical explorer to compose a shot.
    desiredWalkingOffset.copy(viewOffset);
    if (!transit) desiredWalkingOffset.set(walkingShot.direction[0], walkingShot.direction[1], walkingShot.direction[2]);
    walkingOffset.lerp(desiredWalkingOffset, reduced ? 1 : 1 - Math.exp(-2.8 * delta));
    const walkHeight = THREE.MathUtils.lerp(walkingShot.halfHeight, 21, transitZoom);
    const inspectHeight = Math.max(8, 7 / aspect);
    const halfHeight = THREE.MathUtils.lerp(THREE.MathUtils.lerp(overviewHeight, walkHeight, transition.play), inspectHeight, transition.inspect);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    cameraOffset.copy(overviewOffset).lerp(walkingOffset, transition.play).lerp(inspectOffset, transition.inspect);
    // Perspective gives the cliffs and bridges actual depth, while keeping the
    // same readable framing target across viewport sizes and inspection modes.
    cameraOffset.setLength(halfHeight / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.position.copy(focus).add(cameraOffset); camera.lookAt(focus);
    camera.updateMatrixWorld();
    // Infinite-looking sky: the finite dome follows the eye, not map origin.
    // Its local directions still match the cached environment and sea horizon.
    atmosphere.sky.position.copy(camera.position);
    // A portrait overview needs a longer fit distance. Do not fog away the
    // entire archipelago merely because the viewport is narrow; walking keeps
    // its existing fixed atmospheric distances and the same cached environment.
    fog.near = THREE.MathUtils.lerp(Math.max(420, overviewDistance), 420, transition.play);
    fog.far = THREE.MathUtils.lerp(Math.max(1250, overviewDistance * 2), 1250, transition.play);
    // Overview pan is a virtual focus, sometimes under the sea. Light the real
    // archipelago instead; keep the existing tighter actor atlas while walking.
    lightFocus.copy(overviewLightFocus).lerp(focus, transition.play);
    sun.position.copy(lightFocus).addScaledVector(sunDirection,
      THREE.MathUtils.lerp(300, localSunDistance, transition.play));
    sun.target.position.copy(lightFocus);
    const shadowExtent = THREE.MathUtils.lerp(overviewShadowExtent, 32, transition.play);
    const shadowFar = THREE.MathUtils.lerp(600, 140, transition.play);
    if (Math.abs(sun.shadow.camera.right - shadowExtent) > .001 || Math.abs(sun.shadow.camera.far - shadowFar) > .001) {
      Object.assign(sun.shadow.camera, { left: -shadowExtent, right: shadowExtent,
        top: shadowExtent, bottom: -shadowExtent, far: shadowFar });
      sun.shadow.camera.updateProjectionMatrix(); lightingDirty = true;
    }
    if (world.consumeArtChange()) {
      lightingDirty = true;
      if (!started) {
        overviewPoints = collectIslandOverviewPoints(world.getOverviewRoots());
        resize();
      }
    }
    if (explorer.consumeChange()) lightingDirty = true;
    if (lightingDirty || shadowFocus.distanceToSquared(lightFocus) > .01 || shadowExplorer.distanceToSquared(position) > .0025) {
      renderer.shadowMap.needsUpdate = true;
      shadowFocus.copy(lightFocus); shadowExplorer.copy(position); lightingDirty = false;
    }
    world.update(elapsed, reduced);
    world.setViewPosition?.(camera.position.x, camera.position.y, camera.position.z);
    renderer.render(scene, camera);
    if (now - reportTime > 70) {
      reportTime = now;
      callbacks.onPosition(position.x, position.z);
      // Non-visible diagnostics for local audit; the product HUD stays concise.
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.studioAsset = world.studioState();
      canvas.dataset.workshopAsset = world.workshopState();
      canvas.dataset.archiveAsset = world.archiveState();
      canvas.dataset.laboratoryAsset = world.laboratoryState();
      canvas.dataset.harborAsset = world.harborState();
      canvas.dataset.danceAsset = world.danceState();
      canvas.dataset.lighthouseAsset = world.lighthouseState();
      canvas.dataset.explorerAsset = explorer.state;
    }
    callbacks.markers.forEach((marker) => {
        const island = getIsland(marker.dataset.island as IslandId);
        project.set(island.x, getTerrainHeight(island.x, island.z) + 4.5, island.z).project(camera);
        // Main has three semantic places on one physical island. In a narrow
        // introductory panorama label that island once, instead of stacking
        // About/Contact over Welcome. All three remain in reader/map/gameplay.
        const compactMainLabel = !started && viewportWidth < 760 && (island.id === "about" || island.id === "contact");
        const visible = !compactMainLabel && !inspectedStation && !transit && !(started && activeIsland === island.id) && project.z < 1 && Math.abs(project.x) < 1.1 && Math.abs(project.y) < 0.9;
        marker.style.visibility = visible ? "visible" : "hidden";
        marker.style.transform = `translate(-50%, -100%) translate(${(project.x * 0.5 + 0.5) * viewportWidth}px, ${(-project.y * 0.5 + 0.5) * viewportHeight}px)`;
      });
  };
  const onVisibility = () => {
    clearInput(); cancelAnimationFrame(frame); lastTime = 0;
    audio.setPaused(document.hidden || paused);
    if (!document.hidden && !lost && !disposed) frame = requestAnimationFrame(render);
  };
  const onContextLost = (event: Event) => {
    event.preventDefault(); lost = true; paused = true;
    cancelAnimationFrame(frame); clearInput(); audio.setPaused(true);
    canvas.tabIndex = -1; canvas.setAttribute("aria-disabled", "true");
    callbacks.onError();
  };
  const onContextRestored = () => { /* Reading mode remains available; reload recreates the world safely. */ };
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  frame = requestAnimationFrame(render);

  return {
    canvas,
    inspect,
    leaveStation,
    setExhibits(_copy: ExhibitCopy) { /* Object labels live in the localized HTML HUD. */ },
    beginTransit,
    skipTransit: finishTransit,
    setCarColor(color: string) { if (/^#[0-9a-f]{6}$/i.test(color)) world.setCarColor?.(color); },
    nextStation(direction: number) {
      if (!inspectedStation || paused) return;
      const siblings = WORLD_STATIONS.filter((station) => station.island === inspectedStation!.island);
      const index = siblings.findIndex((station) => station.id === inspectedStation!.id);
      const station = siblings[(index + direction + siblings.length) % siblings.length];
      nearbyStation = station; inspect(station);
    },
    start() {
      if (lost) return;
      started = true; audio.setPaused(paused || document.hidden);
      gsap.to(transition, { play: 1, duration: reduced ? 0 : 1.65, ease: "power2.inOut", overwrite: "auto" });
      callbacks.onIsland(activeIsland); focusCanvas();
    },
    setPaused(value: boolean) {
      if (lost || paused === value) return;
      paused = value; clearInput(); audio.setPaused(value || document.hidden);
    },
    setReduced(value: boolean) {
      reduced = value;
      if (value) { gsap.killTweensOf(transition); transition.play = started ? 1 : 0; transition.inspect = inspectedStation ? 1 : 0; finishTransit(); }
    },
    setSound(value: boolean) { audio.setEnabled(value); },
    focus: focusCanvas,
    setTouch(x: number, y: number) { if (!started || paused || transit || inspectedStation) { touch.x = touch.y = 0; return; } touch.x = x; touch.y = y; },
    jump,
    travelTo(id: IslandId) {
      finishTransit(); leaveStation(false);
      const arrival = getArrival(id);
      position.set(arrival.x, getGroundHeight(arrival.x, arrival.z), arrival.z); physics.teleport(position.x, position.z);
      explorer.group.rotation.y = Math.PI;
      activeIsland = id; clearInput(); callbacks.onIsland(id); focusCanvas();
    },
    setNight(night: boolean) {
      scene.background = new THREE.Color(night ? "#163e58" : "#71beed");
      (scene.fog as THREE.Fog).color.set(night ? "#163e58" : "#b8dfe8");
      scene.environment = atmosphere.setNight(night);
      scene.environmentIntensity = night ? .2 : .38;
      ambient.intensity = night ? 0.55 : DAY_HEMISPHERE_INTENSITY; ambient.color.set(night ? "#aab9ef" : "#c5e7ff");
      sun.intensity = night ? 1.1 : 2.65; sun.color.set(night ? "#b3bcff" : "#ffedcd");
      fill.intensity = night ? 0.65 : DAY_FILL_INTENSITY; fill.color.set(night ? "#c3bcff" : "#b7ddff");
      lightingDirty = true;
      world.setNight(night);
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); gsap.killTweensOf(transition);
      canvas.removeEventListener("keydown", onKeyDown); canvas.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("blur", clearInput); canvas.removeEventListener("pointerdown", focusCanvas);
      window.removeEventListener("blur", clearInput); document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost); canvas.removeEventListener("webglcontextrestored", onContextRestored);
      scene.environment = null;
      world.dispose(); backdrop.dispose(); atmosphere.dispose(); exhibition.dispose(); transitProps.dispose(); explorer.dispose(); physics.dispose(); audio.dispose(); sun.shadow.dispose(); renderer.dispose(); canvas.remove();
    },
  };
}

export type IslandGame = Awaited<ReturnType<typeof createIslandGame>>;
