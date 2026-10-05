import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { getIslandAssetSelection, getIslandAssetVariant, ISLAND_ASSET_MASTER_PROFILE as MASTER_PROFILE } from "./island-asset-catalog";

type CameraView = "hero" | "front" | "right" | "top";
type AssetStats = { triangles: number; vertices: number; meshes: number; materials: number; textures: number; size: THREE.Vector3 };

/** Every resource belongs to this one load; no global Three cache is enabled. */
function ownGLTF(gltf: GLTF) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  for (const scene of gltf.scenes) scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  let disposed = false;
  return {
    dispose() {
      if (disposed) return; disposed = true;
      const images = new Set<ImageBitmap>();
      for (const texture of textures) {
        const data = texture.source.data;
        for (const image of Array.isArray(data) ? data : [data]) {
          if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) images.add(image);
        }
        texture.dispose();
      }
      images.forEach((image) => image.close());
      geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
      gltf.scenes.forEach((scene) => { scene.removeFromParent(); scene.clear(); });
    },
  };
}

function validateEmbeddedGLB(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2
    || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error("Il file non è un GLB 2.0 valido.");
  }
  const length = view.getUint32(12, true);
  if (length > buffer.byteLength - 20) throw new Error("Il blocco JSON del GLB è incompleto.");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length))) as {
    buffers?: { uri?: string }[]; images?: { uri?: string }[]; extensionsRequired?: string[];
  };
  if ([...(json.buffers ?? []), ...(json.images ?? [])].some((entry) => entry.uri && !entry.uri.startsWith("data:"))) {
    throw new Error("Questa anteprima richiede un GLB con tutte le texture e i buffer incorporati.");
  }
  if (json.extensionsRequired?.some((name) => ["KHR_draco_mesh_compression", "EXT_meshopt_compression", "KHR_texture_basisu"].includes(name))) {
    throw new Error("Questo GLB richiede un decoder non attivato nel laboratorio. Esporta la versione PBR standard.");
  }
}

function inspectModel(scene: THREE.Group): AssetStats {
  let triangles = 0, vertices = 0, meshes = 0;
  const materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!object.matrixWorld.elements.every(Number.isFinite)) throw new Error("Il modello contiene trasformazioni non finite.");
    if (!(object instanceof THREE.Mesh)) return;
    const geometry: THREE.BufferGeometry = object.geometry;
    const position = geometry.getAttribute("position");
    if (!position) throw new Error("Una mesh non contiene vertici.");
    meshes++; vertices += position.count;
    triangles += (geometry.index?.count ?? position.count) / 3;
    for (const attribute of Object.values(geometry.attributes)) {
      for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error("Il modello contiene attributi non finiti.");
    }
    if (geometry.index) for (const index of geometry.index.array) {
      if (index < 0 || index >= position.count) throw new Error("Il modello contiene indici fuori intervallo.");
    }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
    object.castShadow = true; object.receiveShadow = true;
  });
  const size = new THREE.Box3().setFromObject(scene, true).getSize(new THREE.Vector3());
  if (!meshes || ![size.x, size.y, size.z].every(Number.isFinite) || Math.max(size.x, size.y, size.z) <= 0) {
    throw new Error("Il modello non contiene una geometria 3D utilizzabile.");
  }
  return { triangles, vertices, meshes, materials: materials.size, textures: textures.size, size };
}

/** Retain the exact authored subtree, not Blender's preview camera/light scene. */
function extractAssetRoot(gltf: GLTF, name: string) {
  gltf.scene.updateMatrixWorld(true);
  const root = gltf.scene.getObjectByName(name);
  if (!root) throw new Error(`Nodo asset obbligatorio assente: ${name}. Nessun modello alternativo verrà mostrato.`);
  // Keep the full affine world transform, including a transformed export parent.
  const world = root.matrixWorld.clone();
  const auxiliary: THREE.Object3D[] = [];
  root.traverse((object) => { if (object instanceof THREE.Camera || object instanceof THREE.Light) auxiliary.push(object); });
  auxiliary.forEach((object) => object.removeFromParent());
  root.removeFromParent(); root.matrix.copy(world); root.matrixAutoUpdate = false; root.matrixWorldNeedsUpdate = true;
  const group = new THREE.Group(); group.name = `AssetLab__${name}`; group.add(root);
  return group;
}

/** Standalone review only: never imports the game, map, physics or live world. */
export function mountIslandAssetLab(root: HTMLElement) {
  const viewport = root.querySelector<HTMLElement>("[data-viewport]")!;
  const status = root.querySelector<HTMLElement>("[data-status]")!;
  const empty = root.querySelector<HTMLElement>("[data-empty]")!;
  const loadButton = root.querySelector<HTMLButtonElement>("[data-load]")!;
  const cameraButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-camera]")];
  const seaToggle = root.querySelector<HTMLInputElement>("[data-sea-datum]");
  // Resolve a closed local catalog, never a query string or arbitrary URL.
  const selected = getIslandAssetSelection(root.dataset.asset, root.dataset.variant);
  root.dataset.state = selected ? "idle" : "unsupported"; empty.hidden = false; loadButton.disabled = !selected;
  loadButton.textContent = "Carica il GLB locale";
  status.textContent = selected ? "Disponibilità non ancora verificata. Il caricamento controllerà il file locale."
    : !getIslandAssetVariant(root.dataset.variant) ? "Variante non supportata. Scegli Master o Aggregato."
      : "Asset richiesto non disponibile. Seleziona uno degli asset nel catalogo del laboratorio.";
  for (const metric of root.querySelectorAll<HTMLElement>("[data-stat]")) metric.textContent = metric.dataset.stat === "budget" ? "Non verificato" : "—";
  for (const key of ["triangles", "vertices", "meshes", "budget", "camera"]) delete root.dataset[key];
  cameraButtons.forEach((button) => { button.disabled = true; });
  if (seaToggle) seaToggle.disabled = true;
  const number = new Intl.NumberFormat("it-IT");
  let disposed = false, loading = false, frame = 0;
  let renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined, observer: ResizeObserver | undefined;
  let assetOwner: ReturnType<typeof ownGLTF> | undefined, asset: THREE.Group | undefined;
  const abort = new AbortController();
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#e3ebef");
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .01, 1000);
  const center = new THREE.Vector3(), bounds = new THREE.Box3();
  const reviewBounds = new THREE.Box3(), reviewCenter = new THREE.Vector3();
  // Keep the Y=0 datum clear of Float32 coplanar-discard stripes. The 1 mm
  // render-only tolerance never moves the sea plane or any asset vertices.
  const seaClip = new THREE.Plane(new THREE.Vector3(0, 1, 0), .001);
  let activeView: CameraView = "hero", halfHeight = 1;
  const hemisphere = new THREE.HemisphereLight("#f0f6ff", "#997952", 1.35); scene.add(hemisphere);
  const sun = new THREE.DirectionalLight("#fff1d4", 2.6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = .02; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight("#cddcf2", .8); scene.add(fill);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: "#dce3e5", roughness: .92 });
  const floorGeometry = new THREE.PlaneGeometry(1, 1), floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.visible = false; scene.add(floor);

  // A diagnostic datum only: never changes the exported mesh, its statistics,
  // or the game ocean. Axis views always expose the complete immersed source.
  function updateReviewDatum() {
    const showSea = Boolean(selected) && root.dataset.asset === "projects-terrain-v2" && Boolean(seaToggle?.checked) && activeView === "hero";
    reviewBounds.copy(bounds);
    if (showSea) reviewBounds.min.y = Math.max(0, reviewBounds.min.y);
    reviewBounds.getCenter(reviewCenter);
    const radius = Math.max(bounds.getSize(new THREE.Vector3()).length() * .5, 1);
    floor.position.set(center.x, showSea ? 0 : bounds.min.y - radius * .002, center.z);
    floorMaterial.color.set(showSea ? "#167d89" : "#dce3e5");
    floorMaterial.roughness = showSea ? .65 : .92;
    if (renderer) {
      renderer.clippingPlanes = showSea ? [seaClip] : [];
      renderer.shadowMap.needsUpdate = true;
    }
    root.dataset.seaDatum = showSea ? "visible" : "hidden";
  }

  function setStatus(state: string, message: string) {
    if (disposed) return;
    root.dataset.state = state; status.textContent = message;
    viewport.setAttribute("aria-busy", String(state === "loading"));
  }
  function render() {
    frame = 0;
    if (!disposed && renderer && asset && !document.hidden) renderer.render(scene, camera);
  }
  function requestRender() { if (!disposed && !frame) frame = requestAnimationFrame(render); }
  function resize() {
    if (!renderer) return;
    const width = Math.max(1, viewport.clientWidth), height = Math.max(1, viewport.clientHeight), aspect = width / height;
    renderer.setSize(width, height, false);
    if (asset) {
      camera.updateMatrixWorld(true);
      let maxX = 0, maxY = 0;
      for (const x of [reviewBounds.min.x, reviewBounds.max.x]) for (const y of [reviewBounds.min.y, reviewBounds.max.y]) for (const z of [reviewBounds.min.z, reviewBounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y));
      }
      halfHeight = Math.max(maxY, maxX / aspect, .1) * 1.18;
    }
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix(); requestRender();
  }
  function setCamera(view: CameraView) {
    if (!asset || !controls) return;
    activeView = view;
    updateReviewDatum();
    const directions: Record<CameraView, THREE.Vector3> = {
      hero: new THREE.Vector3(1.25, .95, 1.65), front: new THREE.Vector3(0, 0, 1),
      right: new THREE.Vector3(1, 0, 0), top: new THREE.Vector3(0, 1, 0),
    };
    const size = bounds.getSize(new THREE.Vector3()), radius = size.length() * .5;
    camera.up.set(0, view === "top" ? 0 : 1, view === "top" ? -1 : 0);
    camera.position.copy(reviewCenter).add(directions[view].normalize().multiplyScalar(Math.max(1, radius) * 3));
    camera.lookAt(reviewCenter); camera.updateMatrixWorld(true);
    const cameraInverse = camera.matrixWorldInverse;
    let maxX = 0, maxY = 0;
    for (const x of [reviewBounds.min.x, reviewBounds.max.x]) for (const y of [reviewBounds.min.y, reviewBounds.max.y]) for (const z of [reviewBounds.min.z, reviewBounds.max.z]) {
      const point = new THREE.Vector3(x, y, z).applyMatrix4(cameraInverse);
      maxX = Math.max(maxX, Math.abs(point.x)); maxY = Math.max(maxY, Math.abs(point.y));
    }
    const aspect = Math.max(1, viewport.clientWidth) / Math.max(1, viewport.clientHeight);
    halfHeight = Math.max(maxY, maxX / aspect, .1) * 1.18;
    camera.near = .01; camera.far = Math.max(10, radius * 10); camera.zoom = 1;
    controls.target.copy(reviewCenter); controls.update(); resize();
    cameraButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.camera === view)));
    root.dataset.camera = view;
  }
  function ensureRenderer() {
    if (renderer) return;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
      renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      renderer.domElement.setAttribute("aria-label", `Anteprima tridimensionale: ${selected?.label ?? "asset"}`);
      renderer.domElement.tabIndex = 0;
      viewport.appendChild(renderer.domElement);
      renderer.domElement.addEventListener("webglcontextlost", onContextLost);
      controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = false;
      controls.enablePan = false;
      controls.addEventListener("change", requestRender);
      observer = new ResizeObserver(resize); observer.observe(viewport); resize();
    } catch (error) {
      controls?.dispose(); observer?.disconnect(); renderer?.dispose(); renderer?.domElement.remove(); renderer = undefined;
      throw error;
    }
  }
  async function load() {
    if (disposed || loading || !selected) return;
    const restoreLoadFocus = document.activeElement === loadButton;
    loading = true; loadButton.disabled = true; setStatus("loading", "Verifica e caricamento del GLB locale…");
    let pendingOwner: ReturnType<typeof ownGLTF> | undefined;
    try {
      const response = await fetch(selected.url, { signal: abort.signal, cache: "no-store" });
      if (response.status === 404) { setStatus("missing", `Modello non disponibile: ${selected.file} non è ancora presente.`); return; }
      if (!response.ok) throw new Error(`Caricamento non riuscito: HTTP ${response.status}.`);
      const buffer = await response.arrayBuffer();
      if (disposed) return;
      validateEmbeddedGLB(buffer);
      const manager = new THREE.LoadingManager();
      let failedTexture = false;
      manager.onError = () => { failedTexture = true; };
      const imageURLs = new Set<string>();
      manager.setURLModifier(url => { if (url.startsWith("blob:")) imageURLs.add(url); return url; });
      const loader = new GLTFLoader(manager);
      let gltf: GLTF;
      try { gltf = await loader.parseAsync(buffer, `${location.origin}/models/archipelago/`); }
      finally { imageURLs.forEach(url => URL.revokeObjectURL(url)); imageURLs.clear(); }
      pendingOwner = ownGLTF(gltf);
      if (disposed) { pendingOwner.dispose(); return; }
      // GLTFLoader can resolve after a texture failure with a null map. Do not
      // present an accidentally untextured white model as a valid review.
      if (failedTexture) throw new Error("Una o più texture del GLB non sono state caricate. L’anteprima incompleta non verrà mostrata.");
      const model = extractAssetRoot(gltf, selected.root);
      const stats = inspectModel(model);
      ensureRenderer(); assetOwner?.dispose(); asset?.removeFromParent(); asset = model; assetOwner = pendingOwner; pendingOwner = undefined;
      scene.add(asset); bounds.setFromObject(asset, true); bounds.getCenter(center);
      const radius = Math.max(stats.size.length() * .5, 1);
      floor.position.set(center.x, bounds.min.y - radius * .002, center.z); floor.scale.setScalar(radius * 4); floor.visible = true;
      sun.position.copy(center).add(new THREE.Vector3(-radius * 2, radius * 3, radius * 2)); sun.target.position.copy(center);
      fill.position.copy(center).add(new THREE.Vector3(radius * 2, radius, -radius));
      Object.assign(sun.shadow.camera, { left: -radius * 2, right: radius * 2, top: radius * 2, bottom: -radius * 2, near: .01, far: radius * 10 });
      sun.shadow.camera.updateProjectionMatrix(); renderer!.shadowMap.needsUpdate = true;
      empty.hidden = true; cameraButtons.forEach((button) => { button.disabled = false; }); setCamera(activeView);
      if (seaToggle) seaToggle.disabled = false;
      const stat = (name: string, value: string) => { root.querySelector<HTMLElement>(`[data-stat="${name}"]`)!.textContent = value; };
      stat("bytes", `${(buffer.byteLength / 1048576).toFixed(2)} MiB`); stat("triangles", number.format(stats.triangles)); stat("vertices", number.format(stats.vertices));
      stat("resources", `${stats.meshes} / ${stats.materials} / ${stats.textures}`);
      stat("bounds", [stats.size.x, stats.size.y, stats.size.z].map((value) => value.toFixed(2)).join(" × "));
      const within = buffer.byteLength <= MASTER_PROFILE.bytes && stats.triangles <= selected.triangles && stats.materials <= MASTER_PROFILE.materials && stats.textures <= MASTER_PROFILE.textures;
      stat("budget", within ? "Sotto il profilo orientativo; runtime da verificare" : "Oltre il profilo orientativo; master da revisionare");
      root.dataset.triangles = String(stats.triangles); root.dataset.vertices = String(stats.vertices);
      root.dataset.meshes = String(stats.meshes); root.dataset.budget = within ? "study-below" : "study-over";
      setStatus("ready", "GLB caricato. Geometria verificata; confronto visivo ancora da valutare.");
    } catch (error) {
      pendingOwner?.dispose();
      if (!disposed) setStatus("error", error instanceof Error ? error.message : "Impossibile aprire il modello. La tavola rimane disponibile.");
    } finally {
      loading = false;
      if (!disposed) {
        loadButton.disabled = false; loadButton.textContent = asset ? "Ricarica il GLB" : "Controlla il GLB locale"; viewport.setAttribute("aria-busy", "false");
        // Disabling the keyboard trigger drops focus to body. Restore only if
        // the user has not focused another control while the asset was loading.
        if (restoreLoadFocus && document.activeElement === document.body) loadButton.focus({ preventScroll: true });
      }
    }
  }
  function onCamera(event: Event) {
    const view = (event.currentTarget as HTMLButtonElement).dataset.camera;
    if (view === "hero" || view === "front" || view === "right" || view === "top") setCamera(view);
  }
  function onVisibility() { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else requestRender(); }
  function onSeaDatum() { setCamera(activeView); }
  function onContextLost(event: Event) {
    event.preventDefault(); setStatus("error", "Contesto WebGL perso. Ricarica questa pagina per riaprire l’anteprima.");
    dispose();
  }
  function onPageHide(event: PageTransitionEvent) {
    dispose();
    if (event.persisted) window.addEventListener("pageshow", onPageShow, { once: true });
  }
  function onPageShow(event: PageTransitionEvent) {
    if (event.persisted && root.isConnected) mountIslandAssetLab(root);
  }
  function dispose() {
    if (disposed) return; disposed = true; abort.abort(); cancelAnimationFrame(frame);
    observer?.disconnect(); controls?.removeEventListener("change", requestRender); controls?.dispose();
    renderer?.domElement.removeEventListener("webglcontextlost", onContextLost);
    assetOwner?.dispose(); asset?.removeFromParent(); asset?.clear(); asset = undefined; assetOwner = undefined;
    floorGeometry.dispose(); floorMaterial.dispose(); sun.shadow.dispose();
    renderer?.dispose(); renderer?.domElement.remove(); scene.clear();
    empty.hidden = false; cameraButtons.forEach((button) => { button.disabled = true; }); loadButton.disabled = true;
    if (seaToggle) { seaToggle.disabled = true; seaToggle.removeEventListener("change", onSeaDatum); }
    loadButton.removeEventListener("click", load); cameraButtons.forEach((button) => button.removeEventListener("click", onCamera));
    window.removeEventListener("pagehide", onPageHide); document.removeEventListener("astro:before-swap", dispose); document.removeEventListener("visibilitychange", onVisibility);
  }
  loadButton.addEventListener("click", load); cameraButtons.forEach((button) => button.addEventListener("click", onCamera));
  seaToggle?.addEventListener("change", onSeaDatum);
  window.addEventListener("pagehide", onPageHide); document.addEventListener("astro:before-swap", dispose); document.addEventListener("visibilitychange", onVisibility);
  return { dispose };
}
