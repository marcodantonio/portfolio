import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { checkEmbeddedIslandModel, ownIslandModel } from "./island-studio-asset";

type FallbackExplorer = {
  group: THREE.Group;
  animate: (time: number, speed: number, jumping: boolean, reduced: boolean) => void;
  setInspectionFade: (progress: number) => void;
  dispose: () => void;
};
const ROOT = "Explorer_V1_Foot_Origin";
const JOINTS = ["Explorer_body", "Explorer_arm_L", "Explorer_arm_R", "Explorer_leg_L", "Explorer_leg_R"] as const;

/** Conservative joint-local contact, independent of the unchanged capsule. */
export function explorerLegGroundLift(bounds: THREE.Box3, angle: number, pivotY: number) {
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  const lowestY = pivotY + Math.min(bounds.min.y * cosine, bounds.max.y * cosine)
    + Math.min(-bounds.min.z * sine, -bounds.max.z * sine);
  return Math.max(0, -lowestY);
}

/** A rigid-joint character, not a flattened static asset or a new physics body. */
export function createIslandExplorer(fallback: FallbackExplorer) {
  const group = new THREE.Group(); group.name = "Playable explorer: foot origin";
  group.add(fallback.group);
  const abort = new AbortController();
  let disposed = false, dirty = false, state = "loading", opacity = 1;
  let owner: ReturnType<typeof ownIslandModel> | undefined;
  let rig: { body: THREE.Object3D; arms: THREE.Object3D[]; legs: THREE.Object3D[]; legBounds: THREE.Box3[] } | undefined;
  const fadeMaterials = new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
  function setState(value: string) { state = value; group.userData.assetState = value; dirty = true; }
  function applyFade() {
    group.visible = opacity > 0;
    for (const [material, initial] of fadeMaterials) {
      const transparent = initial.transparent || opacity < 1;
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      material.opacity = initial.opacity * opacity;
      material.depthWrite = initial.depthWrite && opacity === 1;
    }
  }
  async function load() {
    let pending: ReturnType<typeof ownIslandModel> | undefined;
    try {
      const response = await fetch("/models/archipelago/explorer-v1.glb", { signal: abort.signal });
      if (!response.ok) throw new Error(`Explorer HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      if (disposed) return;
      checkEmbeddedIslandModel(bytes);
      const manager = new THREE.LoadingManager(), imageURLs = new Set<string>();
      let textureFailed = false;
      manager.onError = () => { textureFailed = true; };
      manager.setURLModifier(url => { if (url.startsWith("blob:")) imageURLs.add(url); return url; });
      const loader = new GLTFLoader(manager), textures = new THREE.TextureLoader(manager);
      loader.register(parser => ({ name: "ExplorerEmbeddedImageTexture", loadTexture(index) {
        const source = parser.json.textures[index].source;
        if (!Number.isInteger(source)) throw new Error("Explorer texture source absent");
        return parser.loadTextureImage(index, source, textures);
      } }));
      let gltf: GLTF;
      try { gltf = await loader.parseAsync(bytes, "/models/archipelago/"); }
      finally { imageURLs.forEach(url => URL.revokeObjectURL(url)); imageURLs.clear(); }
      pending = ownIslandModel(gltf);
      if (disposed) { pending.dispose(); return; }
      if (textureFailed) throw new Error("Explorer embedded texture failed");
      gltf.scene.updateMatrixWorld(true);
      const root = gltf.scene.getObjectByName(ROOT);
      if (!root || root.position.length() > .001 || root.scale.distanceTo(new THREE.Vector3(1, 1, 1)) > .001
        || root.quaternion.angleTo(new THREE.Quaternion()) > .001) throw new Error("Explorer foot root transform mismatch");
      if (root.matrixWorld.elements.some((value, index) => Math.abs(value - new THREE.Matrix4().elements[index]) > .001)) {
        throw new Error("Explorer export parent transform mismatch");
      }
      const joints = JOINTS.map(name => root.getObjectByName(name));
      if (joints.some(joint => !joint)) throw new Error("Explorer runtime joints missing");
      const [body, armL, armR, legL, legR] = joints as THREE.Object3D[];
      if (body.parent !== root || legL.parent !== root || legR.parent !== root || armL.parent !== body || armR.parent !== body) {
        throw new Error("Explorer articulated hierarchy mismatch");
      }
      const expected = [[0, 0, 0], [-.44, 1.31, 0], [.44, 1.31, 0], [-.2, .73, 0], [.2, .73, 0]];
      joints.forEach((joint, index) => {
        if (joint!.position.distanceTo(new THREE.Vector3().fromArray(expected[index])) > .005
          || joint!.quaternion.angleTo(new THREE.Quaternion()) > .001
          || joint!.scale.distanceTo(new THREE.Vector3(1, 1, 1)) > .001) throw new Error("Explorer joint pivot/rest mismatch");
      });
      let meshes = 0, triangles = 0;
      root.traverse(object => {
        if (!object.matrixWorld.elements.every(Number.isFinite)) throw new Error("Explorer non-finite transform");
        if (!(object instanceof THREE.Mesh)) return;
        const geometry: THREE.BufferGeometry = object.geometry;
        const position = geometry.getAttribute("position");
        if (!position || !geometry.getAttribute("normal")) throw new Error("Explorer incomplete geometry");
        for (const attribute of Object.values(geometry.attributes)) {
          for (const value of attribute.array) if (!Number.isFinite(value)) throw new Error("Explorer non-finite attribute");
        }
        for (const index of geometry.index?.array ?? []) if (index < 0 || index >= position.count) throw new Error("Explorer index out of bounds");
        meshes++; triangles += (geometry.index?.count ?? position.count) / 3;
        object.castShadow = true; object.receiveShadow = true;
      });
      const box = new THREE.Box3().setFromObject(root, true), size = box.getSize(new THREE.Vector3());
      if (!meshes || meshes > 96 || triangles > 70_000 || Math.abs(box.min.y) > .012
        || Math.abs(size.y - 2.24) > .05 || size.x > 1.7 || size.z > 1.7) throw new Error("Explorer measured foot/scale/profile mismatch");
      // Convert each neutral world bound to its joint-local frame before the
      // root enters the translated live player. No collision hull is changed.
      const legBounds = [legL, legR].map(leg => new THREE.Box3().setFromObject(leg, true).translate(leg.position.clone().negate()));
      root.removeFromParent(); group.add(root); owner = pending; pending = undefined;
      rig = { body, arms: [armL, armR], legs: [legL, legR], legBounds };
      for (const material of owner.materials) fadeMaterials.set(material, {
        opacity: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite,
      });
      fallback.group.visible = false; applyFade();
      group.userData.assetMeshes = meshes; group.userData.assetTriangles = triangles;
      setState("ready");
    } catch (error) {
      pending?.dispose();
      if (!disposed) { group.userData.assetError = error instanceof Error ? error.message : "Explorer unavailable"; setState("fallback"); }
    }
  }
  setState("loading"); void load();
  return {
    group,
    get state() { return state; },
    consumeChange() { const changed = dirty; dirty = false; return changed; },
    setInspectionFade(progress: number) {
      if (!rig) fallback.setInspectionFade(progress);
      const next = 1 - THREE.MathUtils.smoothstep(progress, .25, .75);
      if (opacity !== next) { opacity = next; applyFade(); }
    },
    animate(time: number, speed: number, jumping: boolean, reduced: boolean) {
      if (!rig) { fallback.animate(time, speed, jumping, reduced); return; }
      const activeRig = rig;
      const stride = Math.sin(time * 11) * Math.min(speed, 1) * .68;
      activeRig.legs.forEach((leg, index) => {
        leg.rotation.x = jumping ? (index ? -.4 : .7) : stride * (index ? 1 : -1);
        leg.position.y = .73 + (jumping ? 0 : explorerLegGroundLift(activeRig.legBounds[index], leg.rotation.x, .73));
      });
      activeRig.arms.forEach((arm, index) => { arm.rotation.x = jumping ? -1 : stride * (index ? -1 : 1); });
      activeRig.body.position.y = reduced ? 0 : Math.sin(time * (speed > .1 ? 22 : 2)) * (speed > .1 ? .045 : .018);
    },
    dispose() {
      if (disposed) return; disposed = true; abort.abort();
      owner?.dispose(); owner = undefined; rig = undefined; fadeMaterials.clear();
      fallback.dispose(); group.clear(); setState("disposed");
    },
  };
}
