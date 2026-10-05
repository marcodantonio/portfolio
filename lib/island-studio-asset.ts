import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { HOME_STUDIO_DECK, DIGITAL_WORKSHOP_DECK, ARCHIVE_OBSERVATORY_DECK, SUSPENDED_LAB_DECK, WELCOME_HARBOR_DECK, DANCE_PAVILION_DECK, CONTACT_LIGHTHOUSE_DECK, CONTACT_LIGHTHOUSE, type WorldSupportDeck } from "./island-map";
import { getIslandAssetSelection } from "./island-asset-catalog";

type StudioState = "loading" | "ready" | "fallback" | "disposed";

/** Isolated ownership: no shared/global loader caches or global texture changes. */
export function ownIslandModel(gltf: GLTF) {
  const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  gltf.scenes.forEach(scene => scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  }));
  let disposed = false;
  return { materials, dispose() {
    if (disposed) return; disposed = true;
    const bitmaps = new Set<ImageBitmap>();
    for (const texture of textures) {
      for (const image of Array.isArray(texture.source.data) ? texture.source.data : [texture.source.data]) {
        if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) bitmaps.add(image);
      }
      texture.dispose();
    }
    bitmaps.forEach(bitmap => bitmap.close());
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose());
    gltf.scenes.forEach(scene => { scene.removeFromParent(); scene.clear(); });
  } };
}

export function checkEmbeddedIslandModel(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  if (buffer.byteLength < 28 || buffer.byteLength > 8 * 1048576 || view.getUint32(0, true) !== 0x46546c67
    || view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== buffer.byteLength || view.getUint32(16, true) !== 0x4e4f534a) {
    throw new Error("Edificio GLB non valido");
  }
  const length = view.getUint32(12, true);
  if (length > buffer.byteLength - 28) throw new Error("Edificio GLB incompleto");
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length))) as {
    buffers?: { uri?: string }[]; images?: { uri?: string; bufferView?: number; mimeType?: string }[];
    animations?: unknown[]; skins?: unknown[]; extensionsRequired?: string[];
  };
  if (json.buffers?.length !== 1 || json.buffers[0].uri || !json.images?.length
    || json.images.some(image => image.uri || image.bufferView === undefined || !["image/png", "image/jpeg"].includes(image.mimeType ?? ""))
    || json.animations?.length || json.skins?.length || json.extensionsRequired?.length) {
    throw new Error("Edificio richiede risorse esterne o decoder non supportati");
  }
}

type BuildingSpec = {
  id: "studio-v2" | "workshop" | "archive" | "laboratory" | "harbor" | "dance" | "lighthouse";
  deck: WorldSupportDeck;
  prefix: "Studio" | "Workshop" | "Archive" | "Lab" | "Harbor" | "Dance" | "Lighthouse";
  // Exact exported bounds are recorded after inspecting the settled masters.
  bounds: readonly [number, number, number];
  minimum: readonly [number, number, number];
  // Two bounded, non-shadow-casting interior fills. Preview lights outside the
  // imported subtree never leak into the game; these belong to this owner.
  interiorLights: readonly (readonly [number, number, number])[];
  lightProfile?: { day: number; night: number; distance: number };
  // A compact offset radio-hut deck is not the tower's export pivot.
  // Defaults preserve the six existing deck-centred building owners.
  origin?: { x: number; y: number; z: number };
};

/** Static buildings, each with independent loading/resource ownership. */
function createBuildingAsset(fallback: THREE.Group, spec: BuildingSpec) {
  const group = new THREE.Group(); group.name = `Imported reference-led asset: ${spec.id}`;
  group.position.set(spec.origin?.x ?? spec.deck.x, spec.origin?.y ?? spec.deck.top, spec.origin?.z ?? spec.deck.z); group.rotation.y = spec.deck.yaw;
  const selected = getIslandAssetSelection(spec.id, "batched")!;
  const abort = new AbortController();
  let owner: ReturnType<typeof ownIslandModel> | undefined, model: THREE.Object3D | undefined;
  let state: StudioState = "loading", disposed = false, dirty = false, night = false;
  const lamps: { material: THREE.MeshStandardMaterial; intensity: number }[] = [];
  const interiorLights: THREE.PointLight[] = [];
  const setState = (value: StudioState) => { state = value; group.userData.assetState = value; dirty = true; };
  setState("loading");
  function setNight(value: boolean) {
    night = value;
    for (const lamp of lamps) lamp.material.emissiveIntensity = lamp.intensity * (night ? 1.7 : 1);
    interiorLights.forEach(light => { light.intensity = night ? (spec.lightProfile?.night ?? 11) : (spec.lightProfile?.day ?? 7); });
  }
  async function load() {
    let pending: ReturnType<typeof ownIslandModel> | undefined;
    try {
      const response = await fetch(selected.url, { signal: abort.signal });
      if (!response.ok) throw new Error(`Edificio HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (disposed) return;
      checkEmbeddedIslandModel(bytes);
      const manager = new THREE.LoadingManager(); let textureFailed = false;
      manager.onError = () => { textureFailed = true; };
      const imageURLs = new Set<string>();
      manager.setURLModifier(url => { if (url.startsWith("blob:")) imageURLs.add(url); return url; });
      const loader = new GLTFLoader(manager);
      // Embedded PNGs use an HTML image, whose blob URL is already covered by
      // img-src. Do not widen connect-src or disable global createImageBitmap.
      const textureLoader = new THREE.TextureLoader(manager);
      loader.register(parser => ({ name: "PortfolioEmbeddedImageTexture",
        loadTexture(index) {
          const source = parser.json.textures[index].source;
          if (!Number.isInteger(source)) throw new Error("Edificio texture source assente");
          return parser.loadTextureImage(index, source, textureLoader);
        },
      }));
      let gltf: GLTF;
      try { gltf = await loader.parseAsync(bytes, "/models/archipelago/"); }
      finally {
        // GLTFLoader revokes successful image URLs, but not failed decodes.
        // Revoke only this owner's URLs, including failures and late results.
        imageURLs.forEach(url => URL.revokeObjectURL(url)); imageURLs.clear();
      }
      pending = ownIslandModel(gltf);
      if (disposed) { pending.dispose(); return; }
      if (textureFailed) throw new Error("Edificio texture non disponibile");
      gltf.scene.updateMatrixWorld(true);
      const asset = gltf.scene.getObjectByName(selected.root);
      if (!asset) throw new Error("Edificio root non disponibile");
      const worldMatrix = asset.matrixWorld.clone();
      let triangles = 0, meshes = 0;
      asset.traverse(object => {
        if (!object.matrixWorld.elements.every(Number.isFinite)) throw new Error("Edificio transform non finito");
        if (!(object instanceof THREE.Mesh)) return;
        const geometry: THREE.BufferGeometry = object.geometry;
        const position = geometry.getAttribute("position");
        if (!position) throw new Error("Edificio mesh senza vertici");
        for (const attribute of Object.values(geometry.attributes)) {
          for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error("Edificio attributo non finito");
        }
        for (const index of geometry.index?.array ?? []) if (index >= position.count || index < 0) throw new Error("Edificio indice non valido");
        triangles += (geometry.index?.count ?? position.count) / 3; meshes++;
        object.castShadow = true; object.receiveShadow = true;
      });
      if (!meshes || meshes > 96 || triangles > selected.triangles) throw new Error("Edificio supera il profilo di montaggio singolo");
      for (const part of ["shell", "roof", "interior", "decor"]) {
        if (!asset.getObjectByName(`${spec.prefix}_${part}`)) throw new Error("Edificio senza gruppi semantici obbligatori");
      }
      const box = new THREE.Box3().setFromObject(asset, true), size = box.getSize(new THREE.Vector3());
      if (size.toArray().some((value, index) => Math.abs(value - spec.bounds[index]) > .1)) throw new Error("Edificio scala non corrispondente al contratto fisico");
      if (box.min.toArray().some((value, index) => Math.abs(value - spec.minimum[index]) > .05)) throw new Error("Edificio pivot non corrispondente al contratto fisico");
      asset.removeFromParent(); asset.matrix.copy(worldMatrix); asset.matrixAutoUpdate = false; asset.matrixWorldNeedsUpdate = true;
      for (const material of pending.materials) if (material instanceof THREE.MeshStandardMaterial && material.emissiveIntensity > 0 && material.emissive.getHex() !== 0) {
        lamps.push({ material, intensity: material.emissiveIntensity });
      }
      model = asset; owner = pending; pending = undefined; group.add(model);
      for (const [x, y, z] of spec.interiorLights) {
        const light = new THREE.PointLight("#ffd394", spec.lightProfile?.day ?? 7, spec.lightProfile?.distance ?? 9, 2);
        light.name = `${spec.prefix} owned interior lantern fill`;
        light.position.set(x, y, z); light.castShadow = false;
        interiorLights.push(light); group.add(light);
      }
      setNight(night); fallback.visible = false;
      group.userData.assetMeshes = meshes; group.userData.assetTriangles = triangles;
      setState("ready");
    } catch (error) {
      pending?.dispose();
      if (!disposed) { group.userData.assetError = error instanceof Error ? error.message : "Edificio non disponibile"; setState("fallback"); }
    }
  }
  void load();
  return {
    group, setNight,
    get state() { return state; },
    consumeChange() { const value = dirty; dirty = false; return value; },
    dispose() {
      if (disposed) return; disposed = true; abort.abort();
      owner?.dispose(); owner = undefined; model?.removeFromParent(); model?.clear(); model = undefined;
      lamps.length = 0; group.clear(); fallback.visible = true; setState("disposed");
      interiorLights.forEach(light => light.dispose()); interiorLights.length = 0;
    },
  };
}

export function createHomeStudioAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "studio-v2", deck: HOME_STUDIO_DECK, prefix: "Studio", bounds: [12.1, 6.1439, 8.2097], minimum: [-6.05, -.58, -4.1597], interiorLights: [[-2.6, 2.8, -1.8], [2.3, 2.5, -1.3]] });
}

export function createDigitalWorkshopAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "workshop", deck: DIGITAL_WORKSHOP_DECK, prefix: "Workshop", bounds: [30, 9.9, 24], minimum: [-15, -.5, -12], interiorLights: [[-8.3, 4, -6], [5.4, 4, -6]] });
}

export function createArchiveObservatoryAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "archive", deck: ARCHIVE_OBSERVATORY_DECK, prefix: "Archive", bounds: [18.1634, 12.4166, 14.055], minimum: [-9.0884, -.7032, -7], interiorLights: [[-6.3, 3.1, -3.8], [-2.1, 3.1, -3.8]] });
}

export function createSuspendedLaboratoryAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "laboratory", deck: SUSPENDED_LAB_DECK, prefix: "Lab", bounds: [24.8755, 29.8203, 23.55], minimum: [-12.4377, -20.33, -8], interiorLights: [[-7.4, 3.2, -3], [7.4, 3.2, -3]] });
}

export function createWelcomeHarborAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "harbor", deck: WELCOME_HARBOR_DECK, prefix: "Harbor", bounds: [6.364, 6.06, 4.685], minimum: [-3.13, -.36, -2.486], interiorLights: [[-1.7, 2.6, -1], [-1.7, 2.6, 1]] });
}

export function createDancePavilionAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "dance", deck: DANCE_PAVILION_DECK, prefix: "Dance",
    bounds: [22.7696, 6.4834, 16.4629], minimum: [-11.3636, -.24, -8.2590],
    interiorLights: [[-3, 4, -1], [3, 4, -1]], lightProfile: { day: 24, night: 40, distance: 12 } });
}

export function createContactLighthouseAsset(fallback: THREE.Group) {
  return createBuildingAsset(fallback, { id: "lighthouse", deck: CONTACT_LIGHTHOUSE_DECK, prefix: "Lighthouse",
    origin: CONTACT_LIGHTHOUSE.anchor, bounds: [11.7405, 17.73, 8.174], minimum: [-8.8925, -.5, -2.848],
    interiorLights: [[-7.44, 2.90, 1.24], [-3.30, 2.86, 1.28]] });
}
